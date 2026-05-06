import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Dimensions, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/design-system';
import { ConfettiView } from '@/components/confetti-view';
import { InGameChat } from '@/components/in-game-chat';
import { useCosmetics } from '@/contexts/cosmetics-context';
import { HowToPlayButton } from '@/components/how-to-play-button';
import { ThemedText } from '@/components/themed-text';
import { colors as dsColors } from '@/constants/design-system/theme';
import { Typography } from '@/constants/typography';
import { playClick } from '@/lib/sounds';
import { supabase } from '@/lib/supabase';

/** Animated lid translate (MEMORIZE + result lifts) — only the lid moves; bodies share one baseline. */
const ShellCupWatchLidLiftStyleContext = createContext<unknown>(null);

const BG_DEEP = '#0a1620';
/** Shell game card (felt pad) fill + border */
const SHELL_CARD_GRADIENT_TOP = '#1a0a2e';
const SHELL_CARD_GRADIENT_BOTTOM = '#0d0d0d';
const SHELL_CARD_BORDER = 'rgba(124, 58, 237, 0.4)';
const GOLD = '#D4AF37';
const GOLD_MID = '#B8860B';
const GOLD_DARK = '#7a5c0c';
const GOLD_HIGHLIGHT = '#FFF4C4';
const GOLD_RIM = '#F0E68C';
const ACCENT = GOLD;
const HIGH_SCORE_KEY = 'shell_game_high_v1';

const SHUFFLE_COUNT = 8;
/** Cup lift spring ~this long before ball hold. */
const LIFT_MS = 480;
/** Phase 1: ball clearly visible under lifted cup. */
const BALL_HOLD_MS = 1500;
/** Brief lower before shuffle starts. */
const CUP_LOWER_MS = 220;

/** Each round shuffles faster (caps at ~2.2×). */
function shuffleSpeedFactor(roundIndex: number): number {
  return Math.min(1 + (Math.max(1, roundIndex) - 1) * 0.14, 2.2);
}

/** Per swap, ramp from max→min ms; scaled by round (faster each round). */
function swapMsForStep(step: number, totalSteps: number, roundIndex: number): number {
  if (totalSteps <= 1) return Math.round(420 / shuffleSpeedFactor(roundIndex));
  const t = step / (totalSteps - 1);
  const maxMs = 560;
  const minMs = 160;
  const base = Math.round(maxMs - (maxMs - minMs) * t);
  return Math.max(95, Math.round(base / shuffleSpeedFactor(roundIndex)));
}

/** Shell cup layout — lid + body (−4 overlap) + base (stacked, no gaps). */
const CUP_LID_W = 100;
const CUP_LID_H = 18;
const CUP_BODY_W = 85;
const CUP_BODY_H = 80;
const CUP_BASE_W = 95;
const CUP_BASE_H = 10;
/** Body pulls up 4px under lid so parts meet with no visible gap. */
const CUP_BODY_OVERLAP = 4;
/** Lid + body (minus overlap) + base — actual layout height used to vertically center the cup group. */
const CUP_TOTAL_H = CUP_LID_H + (CUP_BODY_H - CUP_BODY_OVERLAP) + CUP_BASE_H;
/** Widest part — stride / hit targets. */
const CUP_W = CUP_LID_W;
const CUP_SIZE = CUP_LID_W;
const CUP_SPACING = 18;
const BALL_SZ = 32;
const GLASS_PURPLE = '#7C3AED';
const GLASS_PINK = '#FF6FD8';
/** Slightly darker lid gradient endpoints. */
const LID_PURPLE = 'rgba(88, 42, 168, 0.95)';
const LID_PINK = 'rgba(188, 65, 158, 0.95)';

/** Horizontal inset for the cup row (each side). */
const ROW_H_PAD = 16;

function computeCupRowMetrics(trackWidth: number) {
  const inner = Math.max(0, trackWidth - ROW_H_PAD * 2);
  if (inner <= 0) {
    return {
      inner: 0,
      cupW: CUP_W,
      gap: CUP_SPACING,
      stride: CUP_W + CUP_SPACING,
      edgeGap: CUP_SPACING,
    };
  }
  /** Space-evenly lays 3 cups with 4 equal gaps (outer + between). Shrink the cup
   *  proportionally when the track is too narrow so the 3rd cup is never clipped. */
  const minGap = 8;
  const widthForCups = inner - 4 * minGap;
  const cupW =
    widthForCups >= 3 * CUP_W ? CUP_W : Math.max(56, Math.floor(widthForCups / 3));
  const gap = Math.max(minGap, (inner - 3 * cupW) / 4);
  const stride = cupW + gap;
  if (!Number.isFinite(stride) || stride <= 0) {
    return {
      inner,
      cupW: CUP_W,
      gap: CUP_SPACING,
      stride: CUP_W + CUP_SPACING,
      edgeGap: CUP_SPACING,
    };
  }
  return { inner, cupW, gap, stride, edgeGap: gap };
}

type GamePhase = 'hiding' | 'watching' | 'shuffling' | 'guessing' | 'result';

type ShellGameState = {
  ball_position: number | null;
  shuffle_sequence: [number, number][];
  game_phase: GamePhase;
  winner: 'host' | 'guesser' | null;
  guesser_choice: number | null;
};

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function generateShuffleSequence(): [number, number][] {
  const seq: [number, number][] = [];
  for (let i = 0; i < SHUFFLE_COUNT; i++) {
    const slots = shuffleArray([0, 1, 2]);
    seq.push([slots[0], slots[1]]);
  }
  return seq;
}

/** Streak before this correct guess → multiplier */
function streakMultiplier(streakBefore: number): number {
  if (streakBefore <= 0) return 1;
  if (streakBefore === 1) return 1.5;
  if (streakBefore === 2) return 2;
  if (streakBefore === 3) return 2.5;
  return 3;
}

function pointsForCorrect(streakBefore: number): number {
  return Math.round(100 * streakMultiplier(streakBefore));
}

function GlowingBall({ style, pulse }: { style?: object; pulse?: boolean }) {
  return (
    <View style={[styles.ballGlowOuter, style]}>
      <View style={styles.ballWhiteCircle}>
        <LinearGradient
          colors={['rgba(124, 58, 237, 0.45)', 'rgba(255, 111, 216, 0.2)']}
          style={styles.ballPurpleInnerGlow}
          start={{ x: 0.3, y: 0.3 }}
          end={{ x: 0.9, y: 0.9 }}
        />
      </View>
      {pulse ? <View style={styles.ballPulse} pointerEvents="none" /> : null}
    </View>
  );
}

function PremiumCup({
  children,
  style,
  ballAboveCupBody,
}: {
  children?: ReactNode;
  style?: object;
  ballAboveCupBody?: boolean;
}) {
  const watchLidLiftStyle = useContext(ShellCupWatchLidLiftStyleContext);
  const bodyFill = ['rgba(124, 58, 237, 0.9)', 'rgba(255, 111, 216, 0.9)'] as const;
  return (
    <View style={[styles.cupColumn, style]}>
      <View style={styles.shellCupStack}>
        <Reanimated.View style={[styles.shellLid, watchLidLiftStyle as object]}>
          <LinearGradient
            colors={[LID_PURPLE, LID_PINK]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.shellLidShine} pointerEvents="none" />
        </Reanimated.View>
        <View style={styles.shellBody}>
          <LinearGradient
            colors={bodyFill}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.shellBodyShine} pointerEvents="none" />
          <View
            style={[styles.shellInnerSlot, ballAboveCupBody ? styles.cupInnerSlotAboveBody : null]}
            collapsable={false}
          >
            {children}
          </View>
        </View>
        <LinearGradient
          colors={[GLASS_PURPLE, GLASS_PINK]}
          style={styles.shellBase}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
    </View>
  );
}

function FeltTextureOverlay() {
  const { width, height } = Dimensions.get('window');
  const lines = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    const step = 12;
    let k = 0;
    for (let x = -height; x < width + height * 1.5; x += step) {
      nodes.push(
        <View
          key={k}
          style={[
            styles.feltLine,
            {
              left: x,
              top: -height,
              height: height * 2.8,
            },
          ]}
        />
      );
      k += 1;
    }
    return nodes;
  }, [width, height]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {lines}
    </View>
  );
}

function GameBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#0f0a18', BG_DEEP, '#050810']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(212,175,55,0.08)', 'transparent', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.45)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <FeltTextureOverlay />
    </View>
  );
}

type CupMotionProps = {
  cupId: 0 | 1 | 2;
  cupX: SharedValue<number>[];
  cupShuffleY: SharedValue<number>[];
  cupWatchLift: SharedValue<number>[];
  cupWinLift: SharedValue<number>[];
  wobbleX: SharedValue<number>[];
  guessScale: SharedValue<number>;
  shufflePulseScale: SharedValue<number>;
  pickGlow: SharedValue<number>;
  /** Row layout width for this shell (matches track metrics). */
  cupOuterWidth: number;
  /** `containerHeight * 0.5 - cupHeight / 2` for vertical centering in the game area. */
  cupTopPx: number;
  children: ReactNode;
  /** Rendered outside the glow wrapper (e.g. floating +points). */
  overlay?: ReactNode;
};

function CupMotionWrapper({
  cupId,
  cupX,
  cupShuffleY,
  cupWatchLift,
  cupWinLift,
  wobbleX,
  guessScale,
  shufflePulseScale,
  pickGlow,
  cupOuterWidth,
  cupTopPx,
  children,
  overlay,
}: CupMotionProps) {
  const cupScale = cupOuterWidth / CUP_SIZE;

  const watchLidLiftStyle = useAnimatedStyle(() => {
    /** MEMORIZE lift capped at -40px; result lifts use `cupWinLift` only. */
    const watchClamped = Math.max(cupWatchLift[cupId].value, -40);
    return {
      transform: [{ translateY: watchClamped + cupWinLift[cupId].value }],
    };
  });

  const motionStyle = useAnimatedStyle(() => {
    const tx = cupX[cupId].value + wobbleX[cupId].value;
    const ty = cupShuffleY[cupId].value;
    const sc = guessScale.value * shufflePulseScale.value;
    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: sc },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.32 + pickGlow.value * 0.42,
    shadowRadius: 10 + pickGlow.value * 16,
    elevation: 6 + Math.round(pickGlow.value * 10),
  }));

  return (
    <ShellCupWatchLidLiftStyleContext.Provider value={watchLidLiftStyle}>
      <Reanimated.View
        style={[
          styles.cupOuter,
          {
            width: cupOuterWidth,
            top: cupTopPx,
          },
          motionStyle,
        ]}
      >
        <Reanimated.View style={[styles.cupGlowWrap, glowStyle]}>
          <View
            style={[styles.cupTableShadowWrap, { width: cupOuterWidth * 0.95 }]}
            pointerEvents="none"
          >
            <View style={styles.cupTableShadow} />
          </View>
          <View
            style={[
              styles.cupArtScaleWrap,
              { width: CUP_SIZE, transform: [{ scale: cupScale }] },
            ]}
          >
            {children}
          </View>
        </Reanimated.View>
        {overlay}
      </Reanimated.View>
    </ShellCupWatchLidLiftStyleContext.Provider>
  );
}

function WatchPulseTitle({ active, children }: { active: boolean; children: string }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(pulse);
    pulse.value = 1;
    if (!active) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [active, pulse]);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.82 + (pulse.value - 1) * 2.5,
  }));
  if (!active) return null;
  return <Reanimated.Text style={[styles.phaseTitlePulse, aStyle]}>{children}</Reanimated.Text>;
}

function ShellStatsBar({
  score,
  highScore,
  round,
  streak,
  newHighScore,
  crownBannerStyle,
}: {
  score: number;
  highScore: number;
  round: number;
  streak: number;
  newHighScore: boolean;
  crownBannerStyle: object;
}) {
  return (
    <View style={styles.statsBarWrap}>
      {newHighScore ? (
        <Reanimated.Text style={[styles.statsRecordLabel, crownBannerStyle]}>New record</Reanimated.Text>
      ) : null}
      <View style={styles.statsPill}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Score</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Round</Text>
          <Text style={styles.statValue}>{round}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Best</Text>
          <Text style={styles.statValueMuted}>{highScore}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={styles.statValueAccent}>{streak}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ShellGamePlayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rewardGameEnd } = useCosmetics();
  const { gameId, roomCode, isHost, myName } = useLocalSearchParams<{
    gameId?: string;
    roomCode?: string;
    isHost?: string;
    myName?: string;
  }>();

  const [trackLayoutW, setTrackLayoutW] = useState(
    () => Math.max(0, Dimensions.get('window').width - 32)
  );
  const [cupsAreaHeight, setCupsAreaHeight] = useState(0);
  const cupRowMetrics = useMemo(() => computeCupRowMetrics(trackLayoutW), [trackLayoutW]);
  const cupTopPx = useMemo(() => {
    if (cupsAreaHeight <= 0) return 0;
    /** Scale matches `cupArtScaleWrap` — layout height ignores transform, so center using scaled shell height. */
    const cupScale = cupRowMetrics.cupW / CUP_SIZE;
    const totalCupHeightPx = CUP_TOTAL_H * cupScale;
    return cupsAreaHeight / 2 - totalCupHeightPx / 2;
  }, [cupsAreaHeight, cupRowMetrics.cupW]);
  const layoutRef = useRef({
    stride: CUP_SIZE + CUP_SPACING,
    cupW: CUP_SIZE,
    edgeGap: CUP_SPACING,
  });
  layoutRef.current.stride = cupRowMetrics.stride;
  layoutRef.current.cupW = cupRowMetrics.cupW;
  layoutRef.current.edgeGap = cupRowMetrics.edgeGap;

  const [state, setState] = useState<ShellGameState>({
    ball_position: null,
    shuffle_sequence: [],
    game_phase: 'hiding',
    winner: null,
    guesser_choice: null,
  });
  const [shuffling, setShuffling] = useState(false);
  const [localBallPick, setLocalBallPick] = useState<number | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const highScoreRef = useRef(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [flyPoints, setFlyPoints] = useState<{ pts: number; key: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  /** Confetti auto-hide timer; cleared on unmount so it can't fire `setShowConfetti` on a dead screen. */
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = null;
      }
    };
  }, []);
  const [newHighScore, setNewHighScore] = useState(false);
  const [streakLostVisible, setStreakLostVisible] = useState(false);

  /** Seed with first-frame metrics so the 3 cups aren't stacked at x=0 before onLayout fires. */
  const initialMetrics = useRef(cupRowMetrics).current;
  const cupX0 = useSharedValue(initialMetrics.edgeGap + 0 * initialMetrics.stride);
  const cupX1 = useSharedValue(initialMetrics.edgeGap + 1 * initialMetrics.stride);
  const cupX2 = useSharedValue(initialMetrics.edgeGap + 2 * initialMetrics.stride);
  const cupShuffleY0 = useSharedValue(0);
  const cupShuffleY1 = useSharedValue(0);
  const cupShuffleY2 = useSharedValue(0);
  const cupWatchLift0 = useSharedValue(0);
  const cupWatchLift1 = useSharedValue(0);
  const cupWatchLift2 = useSharedValue(0);
  const cupWinLift0 = useSharedValue(0);
  const cupWinLift1 = useSharedValue(0);
  const cupWinLift2 = useSharedValue(0);
  const wobbleX0 = useSharedValue(0);
  const wobbleX1 = useSharedValue(0);
  const wobbleX2 = useSharedValue(0);

  const cupXRef = useRef<SharedValue<number>[] | null>(null);
  if (cupXRef.current === null) {
    cupXRef.current = [cupX0, cupX1, cupX2];
  }
  const cupX = cupXRef.current;

  const cupShuffleYRef = useRef<SharedValue<number>[] | null>(null);
  if (cupShuffleYRef.current === null) {
    cupShuffleYRef.current = [cupShuffleY0, cupShuffleY1, cupShuffleY2];
  }
  const cupShuffleY = cupShuffleYRef.current;

  const cupWatchLiftRef = useRef<SharedValue<number>[] | null>(null);
  if (cupWatchLiftRef.current === null) {
    cupWatchLiftRef.current = [cupWatchLift0, cupWatchLift1, cupWatchLift2];
  }
  const cupWatchLift = cupWatchLiftRef.current;

  const cupWinLiftRef = useRef<SharedValue<number>[] | null>(null);
  if (cupWinLiftRef.current === null) {
    cupWinLiftRef.current = [cupWinLift0, cupWinLift1, cupWinLift2];
  }
  const cupWinLift = cupWinLiftRef.current;

  const wobbleXRef = useRef<SharedValue<number>[] | null>(null);
  if (wobbleXRef.current === null) {
    wobbleXRef.current = [wobbleX0, wobbleX1, wobbleX2];
  }
  const wobbleX = wobbleXRef.current;

  const guessScale = useSharedValue(1);
  const shufflePulseScale = useSharedValue(1);
  const pickGlow = useSharedValue(0);

  const greenFlash = useSharedValue(0);
  const redFlash = useSharedValue(0);
  const screenShake = useSharedValue(0);
  const flyPointsY = useSharedValue(0);
  const flyPointsOp = useSharedValue(0);
  const winTextScale = useSharedValue(1);
  const loseTextShake = useSharedValue(0);
  const streakLostOp = useSharedValue(0);
  const crownBounce = useSharedValue(0);

  const shuffleSeqRef = useRef<[number, number][]>([]);
  const bumpCountRef = useRef(0);

  const amHost = isHost === '1';
  const isLocal = gameId === 'local';
  const shellChatSelf = myName?.trim() ? myName.trim() : 'You';
  const shellChatOpponent = amHost ? 'Guesser' : 'Host';

  const streakBeforeGuessRef = useRef(0);
  const roundRef = useRef(round);
  roundRef.current = round;

  const getCupX = useCallback(
    (slot: number) => layoutRef.current.edgeGap + slot * layoutRef.current.stride,
    [],
  );

  const syncCupXToLayout = useCallback(() => {
    for (let i = 0; i < 3; i++) {
      cupX[i].value = getCupX(i);
    }
  }, [getCupX, cupX]);

  const prevTrackW = useRef(-1);
  useEffect(() => {
    if (trackLayoutW <= 0 || shuffling) return;
    if (prevTrackW.current === trackLayoutW) return;
    prevTrackW.current = trackLayoutW;
    cupShuffleY[0].value = 0;
    cupShuffleY[1].value = 0;
    cupShuffleY[2].value = 0;
    cupWatchLift[0].value = 0;
    cupWatchLift[1].value = 0;
    cupWatchLift[2].value = 0;
    syncCupXToLayout();
  }, [trackLayoutW, shuffling, syncCupXToLayout, cupShuffleY, cupWatchLift]);

  useEffect(() => {
    void (async () => {
      try {
        const v = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        if (v != null) {
          const n = parseInt(v, 10) || 0;
          highScoreRef.current = n;
          setHighScore(n);
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[ShellGame] Failed to load high score from storage', e);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!gameId || gameId === 'local') {
      return;
    }

    const loadGame = async () => {
      const { data, error } = await supabase
        .from('shell_games')
        .select('ball_position, shuffle_sequence, game_phase, winner, guesser_choice')
        .eq('id', gameId)
        .single();

      if (!error && data) {
        const seq = (data.shuffle_sequence as [number, number][] | null) ?? [];
        setState({
          ball_position: data.ball_position as number | null,
          shuffle_sequence: seq,
          game_phase: (data.game_phase as GamePhase) ?? 'hiding',
          winner: data.winner as 'host' | 'guesser' | null,
          guesser_choice: data.guesser_choice as number | null,
        });
      }
    };

    loadGame();

    const channel = supabase
      .channel(`shell-game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shell_games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const r = payload.new as {
            ball_position: number | null;
            shuffle_sequence: [number, number][];
            game_phase: GamePhase;
            winner: 'host' | 'guesser' | null;
            guesser_choice: number | null;
          };
          if (r) {
            const seq = (r.shuffle_sequence ?? []) as [number, number][];
            setState({
              ball_position: r.ball_position ?? null,
              shuffle_sequence: seq,
              game_phase: (r.game_phase ?? 'hiding') as GamePhase,
              winner: r.winner ?? null,
              guesser_choice: r.guesser_choice ?? null,
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId]);

  const showBallWatch =
    state.game_phase === 'watching' && state.ball_position !== null && !shuffling;
  const ballUnder = state.ball_position ?? localBallPick ?? 0;
  const showResult = state.game_phase === 'result';

  /** Debug: ball visibility flags (see console in dev). */
  const showBall = showBallWatch;
  const ballVisible =
    (showBallWatch && state.ball_position !== null) ||
    (showResult && state.ball_position !== null);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[ShellGame ball]', {
      currentCupIndex: state.ball_position,
      showBall,
      ballVisible,
    });
  }, [state.ball_position, showBall, ballVisible, showResult]);
  const guesserChoice = state.guesser_choice ?? -1;
  const won = state.winner === 'guesser';
  const isGuessingPhase = state.game_phase === 'guessing';
  /** True when the guesser may interact: guessing phase and shuffle motion finished (`shuffling` false). */
  const guessInteractionReady = isGuessingPhase && !shuffling;

  /** Phase 1: one clean lift; ball stays visible for BALL_HOLD_MS (host timer handles lower → shuffle). */
  useEffect(() => {
    if (!showBallWatch || state.ball_position === null) {
      for (let c = 0; c < 3; c++) {
        cancelAnimation(cupWatchLift[c]);
        cupWatchLift[c].value = 0;
      }
      return;
    }

    const i = state.ball_position;
    for (let c = 0; c < 3; c++) {
      if (c !== i) {
        cancelAnimation(cupWatchLift[c]);
        cupWatchLift[c].value = 0;
      }
    }

    cancelAnimation(cupWatchLift[i]);
    cupWatchLift[i].value = withSpring(-40, { damping: 14, stiffness: 200 });

    return () => {
      cancelAnimation(cupWatchLift[i]);
    };
  }, [showBallWatch, state.ball_position, cupWatchLift]);

  useEffect(() => {
    cancelAnimation(guessScale);
    guessScale.value = 1;
    if (shuffling || state.game_phase !== 'guessing') return;

    guessScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(guessScale);
      guessScale.value = 1;
    };
  }, [shuffling, state.game_phase, guessScale]);

  useEffect(() => {
    cancelAnimation(pickGlow);
    pickGlow.value = 0;
    if (shuffling || state.game_phase !== 'guessing') return;

    pickGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 780, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.28, { duration: 780, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(pickGlow);
      pickGlow.value = 0;
    };
  }, [shuffling, state.game_phase, pickGlow]);

  const onShuffleAnimationsDone = useCallback(() => {
    setShuffling(false);
    cupShuffleY[0].value = 0;
    cupShuffleY[1].value = 0;
    cupShuffleY[2].value = 0;
    cancelAnimation(shufflePulseScale);
    shufflePulseScale.value = 1;
    shufflePulseScale.value = withSequence(
      withTiming(1.07, { duration: 280, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.05, { duration: 260, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 280 })
    );
  }, [cupShuffleY, shufflePulseScale]);

  const finishShuffleBumps = useCallback(() => {
    bumpCountRef.current += 1;
    if (bumpCountRef.current >= 3) {
      bumpCountRef.current = 0;
      onShuffleAnimationsDone();
    }
  }, [onShuffleAnimationsDone]);

  const runShuffleFromSequence = useCallback(
    (seq: [number, number][], roundIndex: number) => {
      shuffleSeqRef.current = seq;
      setShuffling(true);
      playClick();

      const getX = (slot: number) =>
        layoutRef.current.edgeGap + slot * layoutRef.current.stride;

      for (let i = 0; i < 3; i++) {
        cupShuffleY[i].value = 0;
        cupX[i].value = getX(i);
      }

      const advance = (step: number, order: [number, number, number]) => {
        const seqLocal = shuffleSeqRef.current;
        if (step >= seqLocal.length) {
          bumpCountRef.current = 0;
          for (let cupId = 0; cupId < 3; cupId++) {
            cupShuffleY[cupId].value = withSequence(
              withSpring(-14, { damping: 14, stiffness: 280 }),
              withSpring(0, { damping: 16, stiffness: 220 }, (finished) => {
                if (finished) runOnJS(finishShuffleBumps)();
              })
            );
          }
          return;
        }

        const [a, b] = seqLocal[step];
        const newOrder: [number, number, number] = [...order];
        [newOrder[a], newOrder[b]] = [newOrder[b], newOrder[a]];

        const swapMs = swapMsForStep(step, seqLocal.length, roundIndex);

        let parallelDone = 0;
        const onParallelDone = () => {
          parallelDone += 1;
          if (parallelDone >= 3) {
            parallelDone = 0;
            advance(step + 1, newOrder);
          }
        };

        for (let cupId = 0; cupId < 3; cupId++) {
          const targetX = getX(newOrder.indexOf(cupId));
          cupX[cupId].value = withTiming(
            targetX,
            {
              duration: swapMs,
              easing: Easing.bezier(0.4, 0, 0.2, 1),
            },
            (finished) => {
              if (finished) runOnJS(onParallelDone)();
            }
          );
          cupShuffleY[cupId].value = withSequence(
            withTiming(-26, {
              duration: Math.round(swapMs * 0.4),
              easing: Easing.out(Easing.cubic),
            }),
            withTiming(2, {
              duration: Math.round(swapMs * 0.22),
              easing: Easing.inOut(Easing.quad),
            }),
            withTiming(0, {
              duration: Math.round(swapMs * 0.38),
              easing: Easing.out(Easing.cubic),
            })
          );
        }
      };

      advance(0, [0, 1, 2]);
    },
    [cupX, cupShuffleY, finishShuffleBumps]
  );

  useEffect(() => {
    if (
      state.game_phase === 'shuffling' &&
      state.shuffle_sequence.length > 0 &&
      state.ball_position !== null &&
      !shuffling &&
      // Guard: don't re-trigger if this sequence was already started (shuffleSeqRef is set
      // to the same reference inside runShuffleFromSequence, so equality means already running).
      shuffleSeqRef.current !== state.shuffle_sequence
    ) {
      runShuffleFromSequence(state.shuffle_sequence, round);
    }
  }, [state.game_phase, state.shuffle_sequence, state.ball_position, runShuffleFromSequence, shuffling, round]);

  const watchLocalOnlyRef = useRef(false);
  useEffect(() => {
    if (state.game_phase === 'shuffling' || state.game_phase === 'guessing') {
      watchLocalOnlyRef.current = false;
    }
  }, [state.game_phase]);

  /**
   * After lift + ball hold: lower cup, then phase 2 (shuffle).
   * Local / offline-fallback: setState + run shuffle. Online host: Supabase only (all clients react).
   */
  useEffect(() => {
    if (!amHost || state.game_phase !== 'watching' || state.ball_position === null) return;
    if (!isLocal && (!gameId || gameId === 'local')) return;

    let cancelled = false;
    let lowerDoneTimer: ReturnType<typeof setTimeout> | null = null;
    const cupIdx = state.ball_position;

    const startShuffle = () => {
      if (cancelled) return;
      const seq = generateShuffleSequence();
      const r = roundRef.current;
      const useLocalDrive = isLocal || watchLocalOnlyRef.current;
      if (useLocalDrive) {
        setState((s) => ({
          ...s,
          game_phase: 'shuffling',
          shuffle_sequence: seq,
        }));
        runShuffleFromSequence(seq, r);
      } else {
        void supabase
          .from('shell_games')
          .update({ game_phase: 'shuffling', shuffle_sequence: seq })
          .eq('id', gameId as string);
      }
    };

    const afterHold = LIFT_MS + BALL_HOLD_MS;
    const holdTimer = setTimeout(() => {
      if (cancelled) return;
      cancelAnimation(cupWatchLift[cupIdx]);
      cupWatchLift[cupIdx].value = withTiming(0, {
        duration: CUP_LOWER_MS,
        easing: Easing.out(Easing.cubic),
      });
      lowerDoneTimer = setTimeout(startShuffle, CUP_LOWER_MS);
    }, afterHold);

    return () => {
      cancelled = true;
      clearTimeout(holdTimer);
      if (lowerDoneTimer) clearTimeout(lowerDoneTimer);
    };
  }, [
    amHost,
    isLocal,
    gameId,
    state.game_phase,
    state.ball_position,
    runShuffleFromSequence,
    cupWatchLift,
  ]);

  const handleHostPickCup = useCallback(
    async (cupId: number) => {
      if (!amHost || state.game_phase !== 'hiding' || shuffling) return;

      if (isLocal) {
        setLocalBallPick(cupId);
        setState({
          ball_position: cupId,
          shuffle_sequence: [],
          game_phase: 'watching',
          winner: null,
          guesser_choice: null,
        });
        return;
      }

      playClick();

      const { error } = await supabase
        .from('shell_games')
        .update({
          ball_position: cupId,
          shuffle_sequence: [],
          game_phase: 'watching',
        })
        .eq('id', gameId);

      if (error) {
        watchLocalOnlyRef.current = true;
        setLocalBallPick(cupId);
        setState({
          ball_position: cupId,
          shuffle_sequence: [],
          game_phase: 'watching',
          winner: null,
          guesser_choice: null,
        });
      }
    },
    [amHost, state.game_phase, shuffling, isLocal, gameId]
  );

  useEffect(() => {
    if (
      isLocal &&
      !shuffling &&
      state.game_phase === 'shuffling' &&
      state.shuffle_sequence.length > 0
    ) {
      setState((s) => ({ ...s, game_phase: 'guessing' }));
    }
  }, [isLocal, shuffling, state.game_phase, state.shuffle_sequence.length]);

  const handleShuffleComplete = useCallback(async () => {
    if (!amHost || isLocal || state.game_phase !== 'shuffling') return;
    await supabase.from('shell_games').update({ game_phase: 'guessing' }).eq('id', gameId);
  }, [amHost, isLocal, state.game_phase, gameId]);

  useEffect(() => {
    if (
      !shuffling &&
      state.game_phase === 'shuffling' &&
      state.shuffle_sequence.length > 0 &&
      amHost &&
      !isLocal
    ) {
      handleShuffleComplete();
    }
  }, [
    shuffling,
    state.game_phase,
    state.shuffle_sequence.length,
    amHost,
    isLocal,
    handleShuffleComplete,
  ]);

  const playWinEffects = useCallback(
    (pts: number, spectator?: boolean) => {
      cancelAnimation(greenFlash);
      greenFlash.value = 0;
      greenFlash.value = withSequence(
        withTiming(spectator ? 0.3 : 0.58, { duration: 90 }),
        withTiming(0, { duration: 480 }),
      );

      if (!spectator) {
        setShowConfetti(true);
        if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = setTimeout(() => {
          confettiTimerRef.current = null;
          setShowConfetti(false);
        }, 2400);
      }

      cancelAnimation(winTextScale);
      winTextScale.value = 0.4;
      winTextScale.value = withSpring(1, { damping: 12, stiffness: 200 });

      if (!spectator && pts > 0) {
        setFlyPoints({ pts, key: Date.now() });
        cancelAnimation(flyPointsY);
        cancelAnimation(flyPointsOp);
        flyPointsY.value = 0;
        flyPointsOp.value = 1;
        flyPointsY.value = withTiming(-88, { duration: 900, easing: Easing.out(Easing.cubic) });
        flyPointsOp.value = withSequence(
          withDelay(
            400,
            withTiming(0, { duration: 500 }, (finished) => {
              if (finished) runOnJS(setFlyPoints)(null);
            }),
          ),
        );
      }

      cupWinLift[0].value = 0;
      cupWinLift[1].value = 0;
      cupWinLift[2].value = 0;
      const bi = ballUnder;
      cupWinLift[bi].value = withSequence(
        withSpring(-92, { damping: 10, stiffness: 260 }),
        withSpring(-36, { damping: 11, stiffness: 220 }),
        withDelay(260, withSpring(0, { damping: 14, stiffness: 150 })),
      );
    },
    [greenFlash, winTextScale, flyPointsY, flyPointsOp, cupWinLift, ballUnder],
  );

  const playLoseEffects = useCallback(
    (pickedCup: number, hadStreak: number, spectator?: boolean) => {
      cancelAnimation(redFlash);
      redFlash.value = withSequence(
        withTiming(spectator ? 0.36 : 0.58, { duration: 100 }),
        withTiming(0, { duration: 560 }),
      );

      if (!spectator) {
        cancelAnimation(screenShake);
        screenShake.value = withSequence(
          withTiming(14, { duration: 40 }),
          withTiming(-12, { duration: 40 }),
          withTiming(10, { duration: 40 }),
          withTiming(-6, { duration: 40 }),
          withTiming(0, { duration: 40 }),
        );

        cancelAnimation(loseTextShake);
        loseTextShake.value = withSequence(
          withTiming(8, { duration: 60 }),
          withTiming(-8, { duration: 60 }),
          withTiming(4, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        );
      }

      wobbleX[0].value = 0;
      wobbleX[1].value = 0;
      wobbleX[2].value = 0;
      if (!spectator) {
        const w = wobbleX[pickedCup];
        w.value = withSequence(
          withTiming(14, { duration: 45 }),
          withTiming(-14, { duration: 45 }),
          withTiming(12, { duration: 45 }),
          withTiming(-10, { duration: 45 }),
          withTiming(0, { duration: 45 }),
        );
      }

      if (!spectator && hadStreak >= 2) {
        setStreakLostVisible(true);
        cancelAnimation(streakLostOp);
        streakLostOp.value = withSequence(
          withTiming(1, { duration: 220 }),
          withDelay(
            1600,
            withTiming(0, { duration: 400 }, (finished) => {
              if (finished) runOnJS(setStreakLostVisible)(false);
            }),
          ),
        );
      }

      cupWinLift[ballUnder].value = 0;
      cupWinLift[ballUnder].value = withSpring(-76, { damping: 12, stiffness: 180 });
    },
    [redFlash, screenShake, loseTextShake, wobbleX, streakLostOp, cupWinLift, ballUnder],
  );

  const greenFlashStyle = useAnimatedStyle(() => ({ opacity: greenFlash.value }));
  const redFlashStyle = useAnimatedStyle(() => ({ opacity: redFlash.value }));
  const screenShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: screenShake.value }],
  }));
  const flyPtsStyle = useAnimatedStyle(() => ({
    opacity: flyPointsOp.value,
    transform: [{ translateY: flyPointsY.value }],
  }));
  const winTextAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: winTextScale.value }],
  }));
  const loseTextAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: loseTextShake.value }],
  }));
  const streakLostAnimStyle = useAnimatedStyle(() => ({ opacity: streakLostOp.value }));
  const crownBannerStyle = useAnimatedStyle(() => ({
    opacity: crownBounce.value,
    transform: [{ scale: interpolate(crownBounce.value, [0, 1], [0.5, 1]) }],
  }));

  const resultFxRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.game_phase !== 'result') {
      resultFxRef.current = null;
      winTextScale.value = 1;
      return;
    }
    cancelAnimation(guessScale);
    guessScale.value = 1;
    const key = `${state.winner}-${state.guesser_choice}-${round}`;
    if (resultFxRef.current === key) return;
    resultFxRef.current = key;

    const iAmGuesser = isLocal || !amHost;
    const coinOutcome: 'win' | 'loss' = (iAmGuesser ? won : !won) ? 'win' : 'loss';
    void rewardGameEnd(coinOutcome);

    const guesserSide = isLocal || !amHost;
    if (won) {
      const sb = streakBeforeGuessRef.current;
      const pts = pointsForCorrect(sb);
      if (guesserSide) {
        setStreak((s) => s + 1);
        setScore((prev) => {
          const next = prev + pts;
          if (next > highScoreRef.current) {
            highScoreRef.current = next;
            setNewHighScore(true);
            cancelAnimation(crownBounce);
            crownBounce.value = 0;
            crownBounce.value = withSpring(1, { damping: 10, stiffness: 120 });
            void AsyncStorage.setItem(HIGH_SCORE_KEY, String(next));
            setHighScore(next);
          }
          return next;
        });
      }
      playWinEffects(guesserSide ? pts : 0, !guesserSide);
    } else {
      const had = streakBeforeGuessRef.current;
      if (guesserSide) {
        setStreak(0);
      }
      const pick = guesserChoice >= 0 ? guesserChoice : 0;
      playLoseEffects(pick, guesserSide ? had : 0, !guesserSide);
    }
  }, [
    state.game_phase,
    state.winner,
    state.guesser_choice,
    won,
    guesserChoice,
    isLocal,
    amHost,
    playWinEffects,
    playLoseEffects,
    winTextScale,
    crownBounce,
    guessScale,
    rewardGameEnd,
    round,
  ]);

  const handleGuesserPickCup = useCallback(
    async (cupId: number) => {
      const canActAsGuesser = !amHost || isLocal;
      if (!canActAsGuesser || state.game_phase !== 'guessing' || shuffling) return;

      const ballPos = state.ball_position ?? localBallPick;
      if (ballPos === null) return;

      streakBeforeGuessRef.current = streak;

      const roundWon = cupId === ballPos;
      const winner = roundWon ? 'guesser' : 'host';

      if (roundWon) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      playClick();

      if (isLocal) {
        setState((s) => ({
          ...s,
          game_phase: 'result',
          winner,
          guesser_choice: cupId,
        }));
        return;
      }

      const { error } = await supabase
        .from('shell_games')
        .update({ game_phase: 'result', winner, guesser_choice: cupId })
        .eq('id', gameId);

      if (error) {
        setState((s) => ({
          ...s,
          game_phase: 'result',
          winner,
          guesser_choice: cupId,
        }));
      }
    },
    [
      amHost,
      state.game_phase,
      state.ball_position,
      shuffling,
      localBallPick,
      isLocal,
      gameId,
      streak,
    ]
  );

  const handleNextRound = useCallback(() => {
    if (!isLocal) return;
    setNewHighScore(false);
    crownBounce.value = 0;
    resultFxRef.current = null;
    setLocalBallPick(null);
    setRound((r) => r + 1);
    setState({
      ball_position: null,
      shuffle_sequence: [],
      game_phase: 'hiding',
      winner: null,
      guesser_choice: null,
    });
    setShuffling(false);
    cancelAnimation(shufflePulseScale);
    shufflePulseScale.value = 1;
    for (let i = 0; i < 3; i++) {
      const target = layoutRef.current.edgeGap + i * layoutRef.current.stride;
      cupX[i].value = withTiming(target, { duration: 520, easing: Easing.out(Easing.cubic) });
    }
    wobbleX[0].value = 0;
    wobbleX[1].value = 0;
    wobbleX[2].value = 0;
    cupWinLift[0].value = 0;
    cupWinLift[1].value = 0;
    cupWinLift[2].value = 0;
  }, [isLocal, cupX, wobbleX, cupWinLift, crownBounce, shufflePulseScale]);

  const handleCupPress = useCallback(
    (cupId: number) => {
      if (amHost && state.game_phase === 'hiding') {
        handleHostPickCup(cupId);
      } else if ((!amHost || isLocal) && state.game_phase === 'guessing') {
        handleGuesserPickCup(cupId);
      }
    },
    [amHost, isLocal, state.game_phase, handleHostPickCup, handleGuesserPickCup]
  );

  const handleBack = () => router.back();

  if (!gameId || !roomCode || !myName) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: BG_DEEP }]} edges={['bottom', 'left', 'right']}>
        <GameBackground />
        <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
          <ThemedText style={styles.errorText} darkColor="#fff">
            Invalid game session.
          </ThemedText>
          <Pressable onPress={handleBack}>
            <ThemedText style={[styles.linkText, { color: ACCENT }]}>Go back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <GameBackground />

      <Reanimated.View style={[styles.screenInner, screenShakeStyle, { paddingTop: insets.top }]}>
        <HeaderBar
          title="Shell Game"
          onBack={handleBack}
          right={
            <>
              <InGameChat selfName={shellChatSelf} opponentName={shellChatOpponent} opponentIsAi={false} />
              <HowToPlayButton gameId="shell" tint={GOLD} />
            </>
          }
        />
        <View style={styles.statsBarRow}>
          <ShellStatsBar
            score={score}
            highScore={highScore}
            round={round}
            streak={streak}
            newHighScore={newHighScore}
            crownBannerStyle={crownBannerStyle}
          />
        </View>

        <View style={styles.feltPad}>
          <View style={styles.feltPadBgClip} pointerEvents="none">
            <LinearGradient
              colors={[SHELL_CARD_GRADIENT_TOP, SHELL_CARD_GRADIENT_BOTTOM]}
              locations={[0, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.feltVignette} />
            <LinearGradient
              colors={['rgba(255,255,255,0.07)', 'transparent', 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.55 }}
              style={styles.feltTopSheen}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.22)']}
              start={{ x: 0.5, y: 0.35 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.feltInnerShadow}
            />
          </View>
          <View style={styles.container}>
            {state.game_phase === 'hiding' && amHost && (
              <ThemedText style={styles.phaseHint} darkColor="rgba(255,255,255,0.82)">
                Hide the ball
              </ThemedText>
            )}
            {state.game_phase === 'hiding' && !amHost && (
              <ThemedText style={styles.phaseHint} darkColor="rgba(255,255,255,0.58)">
                Waiting
              </ThemedText>
            )}
            {showBallWatch ? (
              <WatchPulseTitle active>Memorize</WatchPulseTitle>
            ) : shuffling ? (
              <WatchPulseTitle active>Shuffling</WatchPulseTitle>
            ) : null}
            {guessInteractionReady && (
              <View style={styles.pickRow}>
                <MaterialIcons name="touch-app" size={18} color={GOLD_MID} />
                <Text style={styles.pickTitle}>Your pick</Text>
              </View>
            )}

            <View style={styles.cupsTrackGrow}>
            <View
              style={styles.cupsContainer}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setTrackLayoutW(width);
                setCupsAreaHeight(height);
              }}
            >
              {[0, 1, 2].map((cupId) => {
                const isCorrectCup = cupId === ballUnder;
                const isWrongGuess = cupId === guesserChoice && !won;
                const showWatchBall = showBallWatch && isCorrectCup;

                return (
                  <CupMotionWrapper
                    key={cupId}
                    cupId={cupId as 0 | 1 | 2}
                    cupX={cupX}
                    cupShuffleY={cupShuffleY}
                    cupWatchLift={cupWatchLift}
                    cupWinLift={cupWinLift}
                    wobbleX={wobbleX}
                    guessScale={guessScale}
                    shufflePulseScale={shufflePulseScale}
                    pickGlow={pickGlow}
                    cupOuterWidth={cupRowMetrics.cupW}
                    cupTopPx={cupTopPx}
                    overlay={
                      flyPoints && isCorrectCup && won ? (
                        <Reanimated.View style={[styles.flyPts, flyPtsStyle]} pointerEvents="none">
                          <Text style={styles.flyPtsText}>+{flyPoints.pts}</Text>
                        </Reanimated.View>
                      ) : null
                    }
                  >
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => handleCupPress(cupId)}
                      style={styles.cupHit}
                      disabled={
                        !(
                          (amHost && state.game_phase === 'hiding') ||
                          ((!amHost || isLocal) && guessInteractionReady)
                        )
                      }
                    >
                      <PremiumCup
                        ballAboveCupBody={
                          (showBallWatch && isCorrectCup) ||
                          (showResult && (isCorrectCup || isWrongGuess))
                        }
                      >
                        {showWatchBall && (
                          <View style={styles.ballInCup}>
                            <GlowingBall pulse />
                          </View>
                        )}
                        {showResult && isCorrectCup && (
                          <View style={styles.ballInCup}>
                            <GlowingBall />
                          </View>
                        )}
                        {showResult && isWrongGuess && (
                          <View style={styles.emptyX}>
                            <Text style={styles.emptyXText}>✕</Text>
                          </View>
                        )}
                      </PremiumCup>
                    </TouchableOpacity>
                  </CupMotionWrapper>
                );
              })}
            </View>
            </View>

            {isGuessingPhase && !shuffling && !showResult ? (
              <Text style={styles.cupsHint} accessibilityRole="text">
                Tap the shell with the ball
              </Text>
            ) : null}

            {showResult && (
              <View style={styles.resultWrap}>
                {won ? (
                  <Reanimated.Text style={[styles.resultText, styles.resultWin, winTextAnimStyle]}>
                    Correct! 🎉
                  </Reanimated.Text>
                ) : (
                  <Reanimated.Text style={[styles.resultText, styles.resultLose, loseTextAnimStyle]}>
                    Wrong! 😢
                  </Reanimated.Text>
                )}
                <ThemedText style={styles.revealText} darkColor="rgba(255,255,255,0.92)">
                  The ball was under cup {ballUnder + 1}
                </ThemedText>
                {isLocal && (
                  <Pressable onPress={handleNextRound} style={styles.nextRoundBtn}>
                    <Text style={styles.nextRoundText}>Next round</Text>
                  </Pressable>
                )}
              </View>
            )}

            {streakLostVisible && (
              <Reanimated.View style={[styles.streakLostBanner, streakLostAnimStyle]}>
                <Text style={styles.streakLostText}>Streak broken</Text>
              </Reanimated.View>
            )}

            <View style={styles.roomCodeWrap}>
              <Text style={styles.roomCode}>{roomCode}</Text>
            </View>
          </View>
        </View>
      </Reanimated.View>

      <Reanimated.View style={[styles.flash, styles.greenFlash, greenFlashStyle]} pointerEvents="none" />
      <Reanimated.View style={[styles.flash, styles.redFlash, redFlashStyle]} pointerEvents="none" />

      <ConfettiView visible={showConfetti} onComplete={() => {}} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG_DEEP },
  feltLine: {
    position: 'absolute',
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    transform: [{ rotate: '45deg' }],
  },
  screenInner: { flex: 1, flexDirection: 'column', minHeight: 0 },
  statsBarRow: {
    paddingHorizontal: 10,
    paddingBottom: 6,
    alignItems: 'center',
    flexShrink: 0,
  },
  statsBarWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  statsRecordLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD_HIGHLIGHT,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 340,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212,175,55,0.22)',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  statValueMuted: {
    fontSize: 17,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
    fontVariant: ['tabular-nums'],
  },
  statValueAccent: {
    fontSize: 17,
    fontWeight: '800',
    color: GOLD_HIGHLIGHT,
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 2,
  },
  feltPad: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    marginHorizontal: 8,
    /** SafeAreaView already applies bottom inset; keep a tiny rim so the border is fully visible. */
    marginBottom: 4,
    borderRadius: 22,
    backgroundColor: SHELL_CARD_GRADIENT_TOP,
    borderWidth: 3,
    borderColor: SHELL_CARD_BORDER,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 14,
  },
  feltPadBgClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 19,
    overflow: 'hidden',
  },
  feltVignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 10,
    borderColor: 'rgba(0,0,0,0.28)',
    borderRadius: 18,
  },
  feltTopSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '32%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  feltInnerShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  container: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 1,
  },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  phaseHint: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  phaseTitlePulse: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  pickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.3,
  },
  cupsTrackGrow: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cupsContainer: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: '100%',
    position: 'relative',
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'visible',
    paddingHorizontal: ROW_H_PAD,
  },
  cupsHint: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '500',
    color: dsColors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    letterSpacing: 0.2,
  },
  cupOuter: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
  },
  cupArtScaleWrap: {
    alignItems: 'center',
    overflow: 'visible',
  },
  cupGlowWrap: {
    alignItems: 'center',
    shadowColor: GLASS_PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.45,
    elevation: 12,
  },
  cupTableShadowWrap: {
    position: 'absolute',
    bottom: -8,
    width: CUP_SIZE * 0.95,
    height: 28,
    alignSelf: 'center',
  },
  cupTableShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.72)',
    opacity: 0.72,
  },
  cupHit: {
    width: CUP_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  cupColumn: {
    width: CUP_LID_W,
    alignItems: 'center',
    position: 'relative',
  },
  shellCupStack: {
    width: CUP_LID_W,
    alignItems: 'center',
    shadowColor: GLASS_PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  shellLid: {
    width: CUP_LID_W,
    height: CUP_LID_H,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 3,
  },
  shellLidShine: {
    position: 'absolute',
    top: 2,
    left: 4,
    width: '32%',
    height: '55%',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  shellBody: {
    width: CUP_BODY_W,
    height: CUP_BODY_H,
    marginTop: -CUP_BODY_OVERLAP,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 2,
  },
  shellBodyShine: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: '28%',
    height: '35%',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  shellInnerSlot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    top: 12,
    bottom: 14,
    left: 4,
    right: 4,
    zIndex: 0,
  },
  shellBase: {
    width: CUP_BASE_W,
    height: CUP_BASE_H,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 1,
  },
  cupInnerSlotAboveBody: {
    zIndex: 3,
    elevation: 18,
  },
  ballInCup: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballGlowOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BALL_SZ + 24,
    height: BALL_SZ + 24,
  },
  ballWhiteCircle: {
    width: BALL_SZ,
    height: BALL_SZ,
    borderRadius: BALL_SZ / 2,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: GLASS_PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  ballPurpleInnerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BALL_SZ / 2,
  },
  ballPulse: {
    position: 'absolute',
    width: BALL_SZ + 14,
    height: BALL_SZ + 14,
    borderRadius: (BALL_SZ + 14) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    backgroundColor: 'transparent',
  },
  emptyX: {
    marginTop: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  emptyXText: { fontSize: 20, color: 'rgba(255,255,255,0.5)', fontWeight: '800' },
  flyPts: {
    position: 'absolute',
    top: -6,
    alignSelf: 'center',
  },
  flyPtsText: {
    color: GOLD_HIGHLIGHT,
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  resultWrap: { alignItems: 'center', marginTop: 10 },
  resultText: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  resultWin: { color: '#4ADE80' },
  resultLose: { color: '#F87171' },
  revealText: { fontSize: Typography.body, marginTop: 8, textAlign: 'center' },
  nextRoundBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(201,162,39,0.18)',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(201,162,39,0.55)',
  },
  nextRoundText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  streakLostBanner: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(127,29,29,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
  },
  streakLostText: { color: '#FECACA', fontWeight: '900', fontSize: 16 },
  roomCodeWrap: {
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 4,
    flexShrink: 0,
  },
  roomCode: {
    fontSize: Typography.section,
    fontWeight: '800',
    letterSpacing: 5,
    color: GOLD,
    opacity: 0.92,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  greenFlash: {
    backgroundColor: '#22C55E',
  },
  redFlash: {
    backgroundColor: '#EF4444',
  },
  errorText: {},
  linkText: { fontSize: Typography.body, fontWeight: '600' },
});
