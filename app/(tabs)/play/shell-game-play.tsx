import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
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

import { ConfettiView } from '@/components/confetti-view';
import { InGameChat } from '@/components/in-game-chat';
import { useCosmetics } from '@/contexts/cosmetics-context';
import { HowToPlayButton } from '@/components/how-to-play-button';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { playClick } from '@/lib/sounds';
import { supabase } from '@/lib/supabase';

const BG_DEEP = '#0d2818';
const FELT_PAD = 'rgba(13, 40, 24, 0.92)';
const GOLD = '#C9A227';
const GOLD_DARK = '#8B6914';
const GOLD_HIGHLIGHT = '#E8C547';
const ACCENT = GOLD;
const HIGH_SCORE_KEY = 'shell_game_high_v1';

const SHUFFLE_COUNT = 6;
const WATCH_MS = 1800;

/** Per swap, ramp from 600ms → 200ms (Hard pacing). */
function swapMsForStep(step: number, totalSteps: number): number {
  if (totalSteps <= 1) return 600;
  const t = step / (totalSteps - 1);
  return Math.round(600 - (600 - 200) * t);
}

const CUP_SIZE = 154;
const CUP_SPACING = 20;
const CUP_BODY_W = 94;
const CUP_BODY_H = 122;
const RIM_W = 120;
const RIM_H = 22;
const BASE_W = 66;
const BASE_H = 13;
const BALL_SZ = 34;

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

function ShinyBall({ style }: { style?: object }) {
  return (
    <View style={[styles.ballWrap, style]}>
      <LinearGradient
        colors={['#EF4444', '#B91C1C', '#7F1D1D']}
        style={styles.ballCircle}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 0.95 }}
      />
      <View style={styles.ballHighlight} />
    </View>
  );
}

function GoldenCup({
  children,
  style,
}: {
  children?: ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.cupColumn, style]}>
      <LinearGradient
        colors={[GOLD_HIGHLIGHT, GOLD, GOLD_DARK]}
        style={styles.cupRim}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />
      <View style={styles.cupBodyShell}>
        <LinearGradient
          colors={[GOLD_HIGHLIGHT, GOLD, GOLD_DARK, '#5C450E']}
          style={styles.cupBody}
          start={{ x: 0.08, y: 0 }}
          end={{ x: 0.95, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.15)']}
          style={styles.cupBodySheen}
          start={{ x: 0.35, y: 0 }}
          end={{ x: 0.65, y: 1 }}
        />
        <View style={styles.cupHighlightStreak} />
      </View>
      <LinearGradient
        colors={[GOLD_DARK, '#4A3508', '#2A1F05']}
        style={styles.cupBase}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={styles.cupInnerSlot}>{children}</View>
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
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BG_DEEP }]} />
      <LinearGradient
        colors={['rgba(26,64,48,0.55)', 'rgba(13,40,24,0.15)', 'rgba(26,64,48,0.45)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.42)', 'transparent', 'rgba(0,0,0,0.42)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)']}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0.5, y: 1 }}
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
  cupWatchRotate: SharedValue<number>[];
  cupWinLift: SharedValue<number>[];
  cupWinRotate: SharedValue<number>[];
  wobbleX: SharedValue<number>[];
  guessScale: SharedValue<number>;
  shufflePulseScale: SharedValue<number>;
  pickGlow: SharedValue<number>;
  children: ReactNode;
  /** Rendered outside the glow wrapper (e.g. floating +points). */
  overlay?: ReactNode;
};

function CupMotionWrapper({
  cupId,
  cupX,
  cupShuffleY,
  cupWatchLift,
  cupWatchRotate,
  cupWinLift,
  cupWinRotate,
  wobbleX,
  guessScale,
  shufflePulseScale,
  pickGlow,
  children,
  overlay,
}: CupMotionProps) {
  const motionStyle = useAnimatedStyle(() => {
    const tx = cupX[cupId].value + wobbleX[cupId].value;
    const ty =
      cupShuffleY[cupId].value + cupWatchLift[cupId].value + cupWinLift[cupId].value;
    const deg = cupWatchRotate[cupId].value + cupWinRotate[cupId].value;
    const sc = guessScale.value * shufflePulseScale.value;
    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { rotate: `${deg}deg` },
        { scale: sc },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.22 + pickGlow.value * 0.45,
    shadowRadius: 6 + pickGlow.value * 14,
    elevation: 4 + Math.round(pickGlow.value * 8),
  }));

  return (
    <Reanimated.View style={[styles.cupOuter, motionStyle]}>
      <Reanimated.View style={[styles.cupGlowWrap, glowStyle]}>{children}</Reanimated.View>
      {overlay}
    </Reanimated.View>
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
        withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [active, pulse]);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.88 + (pulse.value - 1) * 0.35,
  }));
  if (!active) return null;
  return <Reanimated.Text style={[styles.phaseTitlePulse, aStyle]}>{children}</Reanimated.Text>;
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

  const totalWidth = CUP_SIZE * 3 + CUP_SPACING * 2;
  const [trackLayoutW, setTrackLayoutW] = useState(
    () => Math.max(0, Dimensions.get('window').width - 32)
  );
  const layoutRef = useRef({ baseX: 0 });
  layoutRef.current.baseX = Math.max(0, (trackLayoutW - totalWidth) / 2);

  const [state, setState] = useState<ShellGameState>({
    ball_position: null,
    shuffle_sequence: [],
    game_phase: 'hiding',
    winner: null,
    guesser_choice: null,
  });
  const [shuffling, setShuffling] = useState(false);
  const [canGuess, setCanGuess] = useState(false);
  const [localBallPick, setLocalBallPick] = useState<number | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const highScoreRef = useRef(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [flyPoints, setFlyPoints] = useState<{ pts: number; key: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newHighScore, setNewHighScore] = useState(false);
  const [streakLostVisible, setStreakLostVisible] = useState(false);

  const cupX0 = useSharedValue(0);
  const cupX1 = useSharedValue(0);
  const cupX2 = useSharedValue(0);
  const cupShuffleY0 = useSharedValue(0);
  const cupShuffleY1 = useSharedValue(0);
  const cupShuffleY2 = useSharedValue(0);
  const cupWatchLift0 = useSharedValue(0);
  const cupWatchLift1 = useSharedValue(0);
  const cupWatchLift2 = useSharedValue(0);
  const cupWatchRotate0 = useSharedValue(0);
  const cupWatchRotate1 = useSharedValue(0);
  const cupWatchRotate2 = useSharedValue(0);
  const cupWinLift0 = useSharedValue(0);
  const cupWinLift1 = useSharedValue(0);
  const cupWinLift2 = useSharedValue(0);
  const cupWinRotate0 = useSharedValue(0);
  const cupWinRotate1 = useSharedValue(0);
  const cupWinRotate2 = useSharedValue(0);
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

  const cupWatchRotateRef = useRef<SharedValue<number>[] | null>(null);
  if (cupWatchRotateRef.current === null) {
    cupWatchRotateRef.current = [cupWatchRotate0, cupWatchRotate1, cupWatchRotate2];
  }
  const cupWatchRotate = cupWatchRotateRef.current;

  const cupWinLiftRef = useRef<SharedValue<number>[] | null>(null);
  if (cupWinLiftRef.current === null) {
    cupWinLiftRef.current = [cupWinLift0, cupWinLift1, cupWinLift2];
  }
  const cupWinLift = cupWinLiftRef.current;

  const cupWinRotateRef = useRef<SharedValue<number>[] | null>(null);
  if (cupWinRotateRef.current === null) {
    cupWinRotateRef.current = [cupWinRotate0, cupWinRotate1, cupWinRotate2];
  }
  const cupWinRotate = cupWinRotateRef.current;

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

  const getCupX = useCallback(
    (slot: number) => layoutRef.current.baseX + slot * (CUP_SIZE + CUP_SPACING),
    []
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
      } catch {
        /* ignore */
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
  const guesserChoice = state.guesser_choice ?? -1;
  const won = state.winner === 'guesser';
  const isGuessingPhase = state.game_phase === 'guessing';

  useEffect(() => {
    for (let c = 0; c < 3; c++) {
      cancelAnimation(cupWatchLift[c]);
      cancelAnimation(cupWatchRotate[c]);
      cupWatchLift[c].value = 0;
      cupWatchRotate[c].value = 0;
    }

    if (!showBallWatch || state.ball_position === null) return;

    const i = state.ball_position;
    cupWatchLift[i].value = withRepeat(
      withSequence(
        withTiming(-72, { duration: 1100, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );
    cupWatchRotate[i].value = withRepeat(
      withSequence(
        withTiming(-11, { duration: 1100, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(cupWatchLift[i]);
      cancelAnimation(cupWatchRotate[i]);
      cupWatchLift[i].value = 0;
      cupWatchRotate[i].value = 0;
    };
  }, [showBallWatch, state.ball_position, cupWatchLift, cupWatchRotate]);

  useEffect(() => {
    cancelAnimation(guessScale);
    guessScale.value = 1;
    if (shuffling || !canGuess || state.game_phase !== 'guessing') return;

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
  }, [shuffling, canGuess, state.game_phase, guessScale]);

  useEffect(() => {
    cancelAnimation(pickGlow);
    pickGlow.value = 0;
    if (shuffling || !canGuess || state.game_phase !== 'guessing') return;

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
  }, [shuffling, canGuess, state.game_phase, pickGlow]);

  const onShuffleAnimationsDone = useCallback(() => {
    setShuffling(false);
    setCanGuess(true);
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
    (seq: [number, number][]) => {
      shuffleSeqRef.current = seq;
      setShuffling(true);
      setCanGuess(false);
      playClick();

      const getX = (slot: number) =>
        layoutRef.current.baseX + slot * (CUP_SIZE + CUP_SPACING);

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
              withSpring(-16, { damping: 12, stiffness: 260 }),
              withSpring(0, { damping: 14, stiffness: 200 }, (finished) => {
                if (finished) runOnJS(finishShuffleBumps)();
              })
            );
          }
          return;
        }

        const [a, b] = seqLocal[step];
        const newOrder: [number, number, number] = [...order];
        [newOrder[a], newOrder[b]] = [newOrder[b], newOrder[a]];

        const swapMs = swapMsForStep(step, seqLocal.length);

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
              easing: Easing.bezier(0.33, 0, 0.2, 1),
            },
            (finished) => {
              if (finished) runOnJS(onParallelDone)();
            }
          );
          cupShuffleY[cupId].value = withSequence(
            withTiming(-18, {
              duration: Math.round(swapMs * 0.38),
              easing: Easing.out(Easing.cubic),
            }),
            withTiming(0, {
              duration: Math.round(swapMs * 0.62),
              easing: Easing.inOut(Easing.cubic),
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
      !shuffling
    ) {
      runShuffleFromSequence(state.shuffle_sequence);
    }
  }, [state.game_phase, state.shuffle_sequence, state.ball_position, runShuffleFromSequence, shuffling]);

  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchLocalOnlyRef = useRef(false);
  useEffect(() => {
    if (state.game_phase === 'shuffling' || state.game_phase === 'guessing') {
      watchLocalOnlyRef.current = false;
    }
  }, [state.game_phase]);

  useEffect(() => {
    if (!amHost || isLocal || state.game_phase !== 'watching' || !gameId || gameId === 'local') {
      return;
    }
    if (watchLocalOnlyRef.current) return;
    const t = setTimeout(async () => {
      const seq = generateShuffleSequence();
      await supabase
        .from('shell_games')
        .update({ game_phase: 'shuffling', shuffle_sequence: seq })
        .eq('id', gameId);
    }, WATCH_MS);
    watchTimerRef.current = t;
    return () => {
      clearTimeout(t);
      watchTimerRef.current = null;
    };
  }, [amHost, isLocal, state.game_phase, gameId]);

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
        if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
        watchTimerRef.current = setTimeout(() => {
          watchTimerRef.current = null;
          const seq = generateShuffleSequence();
          setState((s) => ({
            ...s,
            game_phase: 'shuffling',
            shuffle_sequence: seq,
          }));
          runShuffleFromSequence(seq);
        }, WATCH_MS);
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
        if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
        watchTimerRef.current = setTimeout(() => {
          watchTimerRef.current = null;
          const seq = generateShuffleSequence();
          setState((s) => ({
            ...s,
            game_phase: 'shuffling',
            shuffle_sequence: seq,
          }));
          runShuffleFromSequence(seq);
        }, WATCH_MS);
      }
    },
    [amHost, state.game_phase, shuffling, isLocal, gameId, runShuffleFromSequence]
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
        setTimeout(() => setShowConfetti(false), 2400);
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
      cupWinRotate[0].value = 0;
      cupWinRotate[1].value = 0;
      cupWinRotate[2].value = 0;
      const bi = ballUnder;
      cupWinLift[bi].value = withSequence(
        withSpring(-92, { damping: 10, stiffness: 260 }),
        withSpring(-36, { damping: 11, stiffness: 220 }),
        withDelay(260, withSpring(0, { damping: 14, stiffness: 150 })),
      );
      cupWinRotate[bi].value = withSequence(
        withSpring(-12, { damping: 11, stiffness: 240 }),
        withDelay(320, withSpring(0, { damping: 15, stiffness: 150 })),
      );
    },
    [greenFlash, winTextScale, flyPointsY, flyPointsOp, cupWinLift, cupWinRotate, ballUnder],
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
      cupWinRotate[ballUnder].value = 0;
      cupWinLift[ballUnder].value = withSpring(-76, { damping: 12, stiffness: 180 });
      cupWinRotate[ballUnder].value = withSpring(-10, { damping: 12, stiffness: 180 });
    },
    [redFlash, screenShake, loseTextShake, wobbleX, streakLostOp, cupWinLift, cupWinRotate, ballUnder],
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
    const key = `${state.winner}-${state.guesser_choice}`;
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
  ]);

  const handleGuesserPickCup = useCallback(
    async (cupId: number) => {
      const canActAsGuesser = !amHost || isLocal;
      if (!canActAsGuesser || state.game_phase !== 'guessing' || !canGuess || shuffling) return;

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
      canGuess,
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
    setCanGuess(false);
    setShuffling(false);
    cancelAnimation(shufflePulseScale);
    shufflePulseScale.value = 1;
    for (let i = 0; i < 3; i++) {
      const target = layoutRef.current.baseX + i * (CUP_SIZE + CUP_SPACING);
      cupX[i].value = withTiming(target, { duration: 520, easing: Easing.out(Easing.cubic) });
    }
    wobbleX[0].value = 0;
    wobbleX[1].value = 0;
    wobbleX[2].value = 0;
    cupWinLift[0].value = 0;
    cupWinLift[1].value = 0;
    cupWinLift[2].value = 0;
    cupWinRotate[0].value = 0;
    cupWinRotate[1].value = 0;
    cupWinRotate[2].value = 0;
  }, [isLocal, cupX, wobbleX, cupWinLift, cupWinRotate, crownBounce, shufflePulseScale]);

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
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.topBarMid}>
            {newHighScore && (
              <Reanimated.Text style={[styles.crownBanner, crownBannerStyle]}>
                👑 New high score!
              </Reanimated.Text>
            )}
            <View style={styles.scoreRow}>
              <MaterialIcons name="monetization-on" size={22} color={GOLD} />
              <Text style={styles.scoreLabel}>Score: </Text>
              <Text style={styles.scoreValue}>{score}</Text>
              <Text style={styles.scoreBestMuted}> · Best </Text>
              <Text style={styles.scoreValue}>{highScore}</Text>
            </View>
            <Text style={styles.roundLine}>
              Round {round}
              <Text style={styles.streakInline}>
                {' '}
                · Streak: {streak} 🔥
              </Text>
            </Text>
          </View>
          <View style={styles.topBarRight}>
            <InGameChat selfName={shellChatSelf} opponentName={shellChatOpponent} opponentIsAi={false} />
            <HowToPlayButton gameId="shell" tint={GOLD} />
          </View>
        </View>

        <View style={styles.feltPad}>
          <View style={styles.container}>
            {state.game_phase === 'hiding' && amHost && (
              <ThemedText style={styles.phaseHint} darkColor="rgba(255,255,255,0.88)">
                Tap a cup to hide the ball
              </ThemedText>
            )}
            {state.game_phase === 'hiding' && !amHost && (
              <ThemedText style={styles.phaseHint} darkColor="rgba(255,255,255,0.72)">
                Waiting for host…
              </ThemedText>
            )}
            <WatchPulseTitle active={showBallWatch || shuffling}>Watch closely…</WatchPulseTitle>
            {isGuessingPhase && canGuess && !shuffling && (
              <View style={styles.pickRow}>
                <MaterialIcons name="arrow-back" size={26} color={GOLD} />
                <Text style={styles.pickTitle}>Pick a cup!</Text>
                <MaterialIcons name="arrow-forward" size={26} color={GOLD} />
              </View>
            )}

            <View
              style={styles.cupsContainer}
              onLayout={(e) => setTrackLayoutW(e.nativeEvent.layout.width)}
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
                    cupWatchRotate={cupWatchRotate}
                    cupWinLift={cupWinLift}
                    cupWinRotate={cupWinRotate}
                    wobbleX={wobbleX}
                    guessScale={guessScale}
                    shufflePulseScale={shufflePulseScale}
                    pickGlow={pickGlow}
                    overlay={
                      flyPoints && isCorrectCup && won ? (
                        <Reanimated.View style={[styles.flyPts, flyPtsStyle]} pointerEvents="none">
                          <Text style={styles.flyPtsText}>+{flyPoints.pts}</Text>
                        </Reanimated.View>
                      ) : null
                    }
                  >
                    <View style={styles.cupTableShadow} />
                    <Pressable
                      onPress={() => handleCupPress(cupId)}
                      style={({ pressed }) => [
                        styles.cupHit,
                        pressed &&
                          ((amHost && state.game_phase === 'hiding') ||
                            ((!amHost || isLocal) && isGuessingPhase && canGuess)) &&
                          styles.cupPressed,
                      ]}
                      disabled={
                        !(
                          (amHost && state.game_phase === 'hiding') ||
                          ((!amHost || isLocal) &&
                            state.game_phase === 'guessing' &&
                            canGuess &&
                            !shuffling)
                        )
                      }
                    >
                      <GoldenCup>
                        {showWatchBall && (
                          <View style={styles.ballInCup}>
                            <ShinyBall />
                          </View>
                        )}
                        {showResult && isCorrectCup && (
                          <View style={styles.ballInCup}>
                            <ShinyBall />
                          </View>
                        )}
                        {showResult && isWrongGuess && (
                          <View style={styles.emptyX}>
                            <Text style={styles.emptyXText}>✕</Text>
                          </View>
                        )}
                      </GoldenCup>
                    </Pressable>
                  </CupMotionWrapper>
                );
              })}
            </View>

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
                <Text style={styles.streakLostText}>Streak Lost! 💔</Text>
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ rotate: '45deg' }],
  },
  screenInner: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  topBarMid: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  crownBanner: {
    color: GOLD_HIGHLIGHT,
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    fontWeight: '700',
  },
  scoreValue: { color: '#fff', fontSize: 16, fontWeight: '900' },
  scoreBestMuted: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: '600' },
  roundLine: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  streakInline: { color: GOLD_HIGHLIGHT, fontWeight: '800' },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 4, marginTop: 2 },
  feltPad: {
    flex: 1,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 20,
    backgroundColor: FELT_PAD,
    borderWidth: 1.5,
    borderColor: 'rgba(201,162,39,0.22)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  phaseHint: { fontSize: Typography.body, marginBottom: 8, textAlign: 'center' },
  phaseTitlePulse: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
    color: '#fff',
    letterSpacing: 0.3,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  pickTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.2,
  },
  cupsContainer: {
    width: '100%',
    minHeight: CUP_BODY_H + RIM_H + BASE_H + 72,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cupOuter: {
    position: 'absolute',
    left: 0,
    bottom: 10,
    width: CUP_SIZE,
    alignItems: 'center',
  },
  cupGlowWrap: {
    alignItems: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 12,
    shadowOpacity: 0.35,
  },
  cupTableShadow: {
    position: 'absolute',
    bottom: -6,
    width: CUP_SIZE * 0.88,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    opacity: 0.55,
  },
  cupHit: {
    width: CUP_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  cupPressed: { opacity: 0.9 },
  cupColumn: {
    width: CUP_SIZE,
    alignItems: 'center',
  },
  cupRim: {
    width: RIM_W,
    height: RIM_H,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: -2,
    zIndex: 3,
    shadowColor: GOLD_HIGHLIGHT,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  cupBodyShell: {
    position: 'relative',
    width: CUP_BODY_W,
    height: CUP_BODY_H,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 8,
  },
  cupBody: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  cupBodySheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  cupHighlightStreak: {
    position: 'absolute',
    left: '18%',
    top: '8%',
    width: '22%',
    height: '72%',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.38)',
    opacity: 0.55,
    transform: [{ skewY: '-8deg' }],
  },
  cupBase: {
    width: BASE_W,
    height: BASE_H,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -1,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  cupInnerSlot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    top: RIM_H + 8,
    bottom: BASE_H + 4,
  },
  ballInCup: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballWrap: {
    width: BALL_SZ,
    height: BALL_SZ,
    borderRadius: BALL_SZ / 2,
    overflow: 'hidden',
    shadowColor: '#7F1D1D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  ballCircle: {
    width: BALL_SZ,
    height: BALL_SZ,
    borderRadius: BALL_SZ / 2,
  },
  ballHighlight: {
    position: 'absolute',
    top: 5,
    left: 7,
    width: 11,
    height: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    opacity: 0.95,
    transform: [{ rotate: '-28deg' }],
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
  resultWrap: { alignItems: 'center', marginTop: 20 },
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
  roomCodeWrap: { position: 'absolute', bottom: 14 },
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
