import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInLeft,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/design-system';
import { InGameChat } from '@/components/in-game-chat';
import { HowToPlayButton } from '@/components/how-to-play-button';
import { useCosmetics } from '@/contexts/cosmetics-context';
import { AppColors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { GameResultsSummary } from '@/components/game-results-summary';
import type { RewardBreakdown } from '@/lib/game-rewards';
import { recordRecentGame } from '@/lib/recent-games';
import { playSwoosh } from '@/lib/sounds';
import {
  acknowledgePlayerUno,
  completePendingWild,
  createInitialGame,
  getPlayableCards,
  isCardPlayable,
  playCard,
  playerDrawOne,
  playerPass,
  runAiTurn,
  topCard,
  UNO_NAMES,
  type UnoCard,
  type UnoDifficulty,
  type UnoGameState,
  type UnoSeat,
  type UnoSuit,
} from '@/lib/uno';

const SCREEN_BG = '#0d0d0d';
const BOARD_CARD_BG = '#111111';
const PANEL_BG = '#1a1a1a';
const CARD_BACK_BG = '#1a1a2e';
const ACCENT_PURPLE = '#7C3AED';
const ACCENT_PINK = '#FF6FD8';
const ACCENT_YELLOW = '#FFE066';
const TEXT_DIM = 'rgba(255,255,255,0.55)';
const TAB_BAR_RESERVE = 84;

const SUIT_HEX: Record<UnoSuit, string> = {
  red: '#E53935',
  blue: '#1E88E5',
  green: '#2ECC71',
  yellow: '#FFE066',
};

const CONFETTI_COLORS = [
  SUIT_HEX.red,
  SUIT_HEX.blue,
  SUIT_HEX.green,
  SUIT_HEX.yellow,
  ACCENT_PINK,
  ACCENT_PURPLE,
  '#fff',
];

// ─── Confetti ───────────────────────────────────────────────────────────────

function ConfettiParticle({ index, total }: { index: number; total: number }) {
  const ty = useSharedValue(0);
  const tx = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  const vals = useRef({
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length] ?? '#fff',
    startX: (index / total) * 380 - 190,
    delay: Math.floor(Math.random() * 500),
    drift: (Math.random() - 0.5) * 280,
    dur: 1600 + Math.floor(Math.random() * 600),
    isCircle: index % 3 === 0,
    w: 8 + Math.floor(Math.random() * 8),
    h: 6 + Math.floor(Math.random() * 10),
  });

  useEffect(() => {
    const { delay, drift, dur } = vals.current;
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: dur - 300 }),
        withTiming(0, { duration: 300 }),
      ),
    );
    ty.value = withDelay(delay, withTiming(720, { duration: dur, easing: Easing.in(Easing.quad) }));
    tx.value = withDelay(delay, withTiming(drift, { duration: dur, easing: Easing.out(Easing.quad) }));
    rotate.value = withDelay(delay, withRepeat(withTiming(360, { duration: 550 }), Math.ceil(dur / 550)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const { color, startX, isCircle, w, h } = vals.current;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: '25%',
          left: '50%',
          marginLeft: startX,
          width: w,
          height: isCircle ? w : h,
          backgroundColor: color,
          borderRadius: isCircle ? w / 2 : 2,
        },
        style,
      ]}
    />
  );
}

function Confetti({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const count = 36;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <ConfettiParticle key={i} index={i} total={count} />
      ))}
    </View>
  );
}

// ─── Card helpers ────────────────────────────────────────────────────────────

function cardLabel(card: UnoCard): string {
  switch (card.type) {
    case 'number': return String(card.value ?? '');
    case 'skip': return '⊘';
    case 'reverse': return '⇄';
    case 'draw2': return '+2';
    case 'wild': return 'W';
    case 'wild_draw4': return '+4';
    default: return '?';
  }
}

function discardGlowColor(card: UnoCard | undefined, activeColor: UnoSuit): string {
  if (!card) return SUIT_HEX[activeColor];
  if (card.type === 'wild' || card.type === 'wild_draw4') return SUIT_HEX[activeColor];
  if (card.color) return SUIT_HEX[card.color];
  return SUIT_HEX[activeColor];
}

// ─── CardFace ────────────────────────────────────────────────────────────────

function CardFace({
  card, w, h, small, hideCorner,
}: {
  card: UnoCard; w: number; h: number; small?: boolean; hideCorner?: boolean;
}) {
  const isWild = card.type === 'wild' || card.type === 'wild_draw4';
  const bg = isWild ? '#0a0a0a' : card.color ? SUIT_HEX[card.color] : '#333';
  const label = cardLabel(card);
  const centerFontSize = Math.round(h * 0.34);
  const showCorner = !small && !hideCorner;

  return (
    <View style={[styles.cardFace, { width: w, height: h, backgroundColor: bg }]}>
      {isWild && (
        <View style={styles.wildQuadrants} pointerEvents="none">
          <View style={styles.wildQuadRow}>
            <View style={[styles.wildQuad, { backgroundColor: SUIT_HEX.red }]} />
            <View style={[styles.wildQuad, { backgroundColor: SUIT_HEX.yellow }]} />
          </View>
          <View style={styles.wildQuadRow}>
            <View style={[styles.wildQuad, { backgroundColor: SUIT_HEX.blue }]} />
            <View style={[styles.wildQuad, { backgroundColor: SUIT_HEX.green }]} />
          </View>
          <View style={styles.wildCenterDotWrap} pointerEvents="none">
            <View
              style={[styles.wildCenterDot, { width: Math.max(24, w * 0.55), height: Math.max(24, w * 0.55) }]}
            />
          </View>
        </View>
      )}
      {showCorner && (
        <Text style={[styles.cardCornerLabel, { fontSize: small ? 10 : 14 }]} numberOfLines={1}>
          {label}
        </Text>
      )}
      <Text
        style={[styles.cardValue, { fontSize: centerFontSize }, isWild && styles.cardValueWild]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── CardBackFace ─────────────────────────────────────────────────────────────

function CardBackFace({
  w, h, small, label = 'UNO',
}: {
  w: number; h: number; small?: boolean; label?: string;
}) {
  return (
    <View
      style={[
        styles.cardFace,
        styles.cardBackOuter,
        { width: w, height: h, backgroundColor: CARD_BACK_BG, borderColor: ACCENT_PURPLE },
      ]}
    >
      <Text style={[styles.unoBackText, small && styles.unoBackTextSm, { color: ACCENT_PURPLE }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── OpponentZone ─────────────────────────────────────────────────────────────

function OpponentZone({
  name, count, isTurn, align,
}: {
  name: string; count: number; isTurn: boolean; align: 'center' | 'flex-start';
}) {
  const n = count;
  const spread = Math.min(5, 42 / Math.max(n, 1));
  const overlap = n <= 1 ? 0 : -14;
  const hasUno = count === 1;

  return (
    <View style={[styles.oppZone, align === 'flex-start' ? styles.oppLeft : styles.oppTop, !isTurn && styles.oppZoneInactive]}>
      <View style={[styles.oppNamePill, isTurn && styles.oppNamePillOn]}>
        <Text style={styles.oppNameText} numberOfLines={1}>{name}</Text>
        <View style={[styles.oppCountBadge, isTurn && styles.oppCountBadgeOn]}>
          <Text style={styles.oppCountText}>{count}</Text>
        </View>
        {hasUno && (
          <View style={styles.oppUnoBadge}>
            <Text style={styles.oppUnoText}>UNO!</Text>
          </View>
        )}
      </View>
      <View
        style={[
          styles.opponentArc,
          align === 'center' && { justifyContent: 'center' },
          isTurn && styles.opponentArcOnTurn,
        ]}
      >
        {Array.from({ length: Math.min(n, 14) }).map((_, i) => {
          const rot = (i - (Math.min(n, 14) - 1) / 2) * spread;
          return (
            <View
              key={`${name}-${i}`}
              style={[styles.oppCardSlot, { marginLeft: i === 0 ? 0 : overlap, transform: [{ rotate: `${rot}deg` }] }]}
            >
              <CardBackFace w={36} h={50} small label="UN" />
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── HandCard ─────────────────────────────────────────────────────────────────

function HandCard({
  card, playable, dimmed, disabled, onPress, index,
}: {
  card: UnoCard;
  playable: boolean;
  dimmed: boolean;
  disabled: boolean;
  onPress: () => void;
  index: number;
  total: number;
}) {
  const w = 68;
  const h = 95;
  const overlap = index === 0 ? 0 : -10;

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => {
        const selected = pressed && playable;
        const baseOpacity = dimmed ? 0.45 : 1;
        const translateY = selected ? -18 : playable ? -8 : 0;
        const scale = selected ? 1.12 : 1;
        return (
          <Animated.View
            entering={FadeIn.duration(220)}
            style={[
              styles.handCardWrap,
              { marginLeft: overlap, opacity: baseOpacity, transform: [{ translateY }, { scale }] },
            ]}
          >
            <View style={[playable && styles.playableGlow, selected && styles.selectedRing]}>
              <CardFace card={card} w={w} h={h} />
            </View>
          </Animated.View>
        );
      }}
    </Pressable>
  );
}

// ─── UnoPop ──────────────────────────────────────────────────────────────────

function UnoPop({ visible }: { visible: boolean }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withTiming(1.35, { duration: 180, easing: Easing.out(Easing.back(2)) }),
        withTiming(1.0, { duration: 120, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.0, { duration: 900 }),
        withTiming(0, { duration: 200 }),
      );
    } else {
      scale.value = withTiming(0, { duration: 150 });
    }
  }, [visible, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value > 0.05 ? 1 : 0,
  }));

  return (
    <Animated.View style={[styles.unoPop, style]}>
      <Text style={styles.unoPopText}>UNO!</Text>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function UnoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [difficulty, setDifficulty] = useState<UnoDifficulty>('medium');
  const [numPlayers, setNumPlayers] = useState<2 | 3>(3);
  const [game, setGame] = useState<UnoGameState>(() => createInitialGame('medium', 3));
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [discardAnim, setDiscardAnim] = useState<'up' | 'down'>('down');
  const [unoPop, setUnoPop] = useState(false);
  const [oppDots, setOppDots] = useState(1);
  const [endRewards, setEndRewards] = useState<RewardBreakdown | null>(null);
  const scoredRef = useRef(false);
  const recordedRecentRef = useRef(false);
  const prevTopId = useRef<string | undefined>(undefined);
  const prevTurn = useRef<UnoSeat>(game.currentTurn);
  const skipFirstDiscardAnim = useRef(true);
  const prevPlayerCount = useRef(game.hands[0].length);
  const drawPulse = useSharedValue(1);
  const turnPulse = useSharedValue(1);
  const { rewardGameEnd } = useCosmetics();

  const isYourTurn = game.currentTurn === 0 && game.wildPicker !== 0 && game.winner == null;

  // Turn pulse animation
  useEffect(() => {
    if (isYourTurn) {
      turnPulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 600, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      turnPulse.value = withTiming(1, { duration: 200 });
    }
  }, [isYourTurn, turnPulse]);

  const turnPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: turnPulse.value }],
  }));

  // AI thinking dots
  useEffect(() => {
    if (isYourTurn || game.winner != null) return;
    const t = setInterval(() => setOppDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(t);
  }, [isYourTurn, game.winner]);

  const top = useMemo(() => topCard(game), [game]);

  const playable = useMemo(() => {
    if (!top || game.winner || game.wildPicker != null || game.currentTurn !== 0) return [];
    return getPlayableCards(game.hands[0], top, game.activeColor, game.drawStack);
  }, [game, top]);

  const approxDeckLeft = useMemo(
    () => game.deck.length + Math.max(0, game.discard.length - 1),
    [game.deck.length, game.discard.length],
  );

  // Discard pile pulse
  const discardPulse = useSharedValue(1);
  const topId = top?.id ?? '';

  useEffect(() => {
    discardPulse.value = withSequence(
      withTiming(1.06, { duration: 140 }),
      withTiming(1, { duration: 220 }),
    );
  }, [topId, discardPulse]);

  const discardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: discardPulse.value }],
  }));

  // Discard animation direction
  useEffect(() => {
    if (!topId) return;
    if (skipFirstDiscardAnim.current) {
      skipFirstDiscardAnim.current = false;
      prevTopId.current = topId;
      prevTurn.current = game.currentTurn;
      return;
    }
    if (prevTopId.current !== topId) {
      const lastTurn = prevTurn.current;
      setDiscardAnim(lastTurn === 0 ? 'up' : 'down');
      prevTopId.current = topId;
    }
    prevTurn.current = game.currentTurn;
  }, [topId, game.currentTurn]);

  // Hand draw pulse + UNO pop
  useEffect(() => {
    const last = prevPlayerCount.current;
    const now = game.hands[0].length;
    if (now > last && game.currentTurn === 0) {
      drawPulse.value = withSequence(
        withTiming(1.08, { duration: 100 }),
        withTiming(1, { duration: 200 }),
      );
    }
    prevPlayerCount.current = now;
    if (now === 1 && !game.winner) {
      setUnoPop(true);
      const t = setTimeout(() => setUnoPop(false), 1600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [game.hands[0].length, game.currentTurn, game.winner, drawPulse]);

  const handPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: drawPulse.value }],
  }));

  // AI turns
  useEffect(() => {
    const aiSeat = game.currentTurn === 1 || (game.numPlayers === 3 && game.currentTurn === 2);
    if (game.winner != null || !aiSeat || game.wildPicker === 0) return;
    const t = setTimeout(() => {
      setGame((g) => runAiTurn(g));
    }, 820);
    return () => clearTimeout(t);
  }, [
    game.currentTurn,
    game.winner,
    game.wildPicker,
    game.discard.length,
    game.hands[0].length,
    game.hands[1].length,
    game.hands[2].length,
    game.deck.length,
    game.activeColor,
    game.drawStack,
    game.aiDifficulty,
    game.numPlayers,
  ]);

  // Score tracking
  useEffect(() => {
    if (game.winner != null) {
      if (!scoredRef.current) {
        scoredRef.current = true;
        if (game.winner === 0) setWins((w) => w + 1);
        else setLosses((l) => l + 1);
      }
      if (!recordedRecentRef.current) {
        recordedRecentRef.current = true;
        const outcome = game.winner === 0 ? 'win' : 'loss';
        void rewardGameEnd(outcome).then(setEndRewards);
        void recordRecentGame({
          gameName: 'UNO',
          result: game.winner === 0 ? 'win' : 'loss',
          score: game.winner === 0 ? '1st place' : `${UNO_NAMES[game.winner]} won`,
        });
      }
    } else {
      scoredRef.current = false;
      recordedRecentRef.current = false;
      setEndRewards(null);
    }
  }, [game.winner, rewardGameEnd]);

  const setDifficultyAndGame = useCallback((d: UnoDifficulty) => {
    setDifficulty(d);
    setGame((g) => ({ ...g, aiDifficulty: d }));
  }, []);

  const setNumPlayersAndReset = useCallback(
    (n: 2 | 3) => {
      setNumPlayers(n);
      scoredRef.current = false;
      recordedRecentRef.current = false;
      skipFirstDiscardAnim.current = true;
      setGame(createInitialGame(difficulty, n));
    },
    [difficulty],
  );

  const handlePlay = useCallback(
    (card: UnoCard) => {
      if (game.wildPicker != null || game.currentTurn !== 0 || game.winner != null) return;
      const t = topCard(game);
      if (!t) return;
      if (!isCardPlayable(card, game.hands[0], t, game.activeColor, game.drawStack)) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playSwoosh();
      setGame((g) => playCard(g, card.id, 0) ?? g);
    },
    [game],
  );

  const handleDraw = useCallback(() => {
    if (game.wildPicker != null || game.currentTurn !== 0 || game.winner != null) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGame((g) => playerDrawOne(g) ?? g);
  }, [game.wildPicker, game.currentTurn, game.winner]);

  const handlePass = useCallback(() => {
    if (game.winner != null || game.currentTurn !== 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGame((g) => playerPass(g) ?? g);
  }, [game.winner, game.currentTurn]);

  const handleUno = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGame((g) => acknowledgePlayerUno(g) ?? g);
  }, []);

  const pickWildColor = useCallback((c: UnoSuit) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGame((g) => completePendingWild(g, c) ?? g);
  }, []);

  const playAgain = useCallback(() => {
    scoredRef.current = false;
    recordedRecentRef.current = false;
    setEndRewards(null);
    skipFirstDiscardAnim.current = true;
    setGame(createInitialGame(difficulty, numPlayers));
  }, [difficulty, numPlayers]);

  const glow = discardGlowColor(top, game.activeColor);
  const pendingWd4 = top?.type === 'wild_draw4';

  // Draw button: disabled if player already has playable cards and hasn't drawn yet
  // (playerHasDrawn blocks further draws after drawing this turn)
  const canDraw =
    !game.playerHasDrawn &&
    game.currentTurn === 0 &&
    game.winner == null &&
    game.wildPicker == null &&
    (game.drawStack > 0 || playable.length === 0);

  const showPassBtn =
    game.playerHasDrawn &&
    game.currentTurn === 0 &&
    game.winner == null &&
    game.wildPicker == null;

  const showDrawBtn =
    !game.playerHasDrawn &&
    game.currentTurn === 0 &&
    game.winner == null &&
    game.wildPicker == null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: SCREEN_BG }]} edges={['bottom', 'left', 'right']}>
      <View style={[styles.screenInner, { paddingTop: insets.top }]}>
        <HeaderBar
          title="UNO"
          onBack={() => router.back()}
          right={
            <>
              <InGameChat selfName="You" opponentName="Opponents" opponentIsAi />
              <HowToPlayButton gameId="uno" tint="#FFFFFF" />
            </>
          }
        />

        {/* Difficulty picker */}
        <View style={styles.diffRow}>
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <Pressable
              key={d}
              onPress={() => setDifficultyAndGame(d)}
              style={[styles.diffChip, difficulty === d && styles.diffChipOn]}
            >
              <Text style={[styles.diffChipText, difficulty === d && styles.diffChipTextOn]}>
                {d[0]!.toUpperCase() + d.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Players picker */}
        <View style={styles.playersRow}>
          <Text style={styles.playersRowLabel}>Players</Text>
          {([2, 3] as const).map((n) => (
            <Pressable
              key={n}
              onPress={() => setNumPlayersAndReset(n)}
              style={[styles.diffChip, numPlayers === n && styles.diffChipOn]}
            >
              <Text style={[styles.diffChipText, numPlayers === n && styles.diffChipTextOn]}>
                {n === 2 ? '2 (1 AI)' : '3 (2 AI)'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Active color indicator */}
        <View style={[styles.activeColorBanner, { borderColor: SUIT_HEX[game.activeColor] }]}>
          <View
            style={[
              styles.activeColorOrb,
              { backgroundColor: SUIT_HEX[game.activeColor], shadowColor: SUIT_HEX[game.activeColor] },
            ]}
          />
          <View style={styles.colorNameWrap}>
            <Text style={[styles.colorNameText, { color: SUIT_HEX[game.activeColor] }]}>
              {game.activeColor.toUpperCase()}
            </Text>
            <View style={styles.colorMiniRow}>
              {(['red', 'blue', 'green', 'yellow'] as const).map((c) => (
                <View
                  key={c}
                  style={[
                    styles.colorDotSmall,
                    { backgroundColor: SUIT_HEX[c] },
                    game.activeColor === c && styles.colorDotSmallOn,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Draw stack banner */}
        {game.drawStack > 0 && (
          <View style={styles.stackBanner}>
            <Text style={styles.stackBannerText}>
              +2 chain: {game.drawStack} cards — play another +2 or take them
            </Text>
          </View>
        )}

        {/* Turn indicator */}
        <View style={styles.turnRow}>
          {isYourTurn ? (
            <Animated.View style={turnPulseStyle}>
              <LinearGradient
                colors={[ACCENT_PURPLE, ACCENT_PINK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.turnPill}
              >
                <Text style={styles.turnPillTextYours}>
                  {game.playerHasDrawn ? 'Play or Pass 🃏' : 'Your Turn ✨'}
                </Text>
              </LinearGradient>
            </Animated.View>
          ) : (
            <View style={[styles.turnPill, styles.turnPillIdle]}>
              <Text style={styles.turnPillTextIdle}>
                {game.wildPicker === 0
                  ? pendingWd4
                    ? 'Pick color · next draws 4'
                    : 'Pick a color'
                  : `${UNO_NAMES[game.currentTurn]}'s turn${'.'.repeat(oppDots)}`}
              </Text>
            </View>
          )}
        </View>

        {/* Board */}
        <View style={styles.boardCard}>
          <View style={styles.table}>
            {game.numPlayers === 3 ? (
              <OpponentZone
                name={UNO_NAMES[2]}
                count={game.hands[2].length}
                isTurn={game.currentTurn === 2}
                align="center"
              />
            ) : (
              <View style={styles.oppSpacer} />
            )}

            <View style={styles.midRow}>
              <OpponentZone
                name={UNO_NAMES[1]}
                count={game.hands[1].length}
                isTurn={game.currentTurn === 1}
                align="flex-start"
              />
              <View style={styles.centerPiles}>
                {/* Draw pile */}
                <View style={styles.pileCol}>
                  <CardBackFace w={72} h={100} />
                  <View style={styles.deckCount}>
                    <Text style={styles.deckCountText}>{approxDeckLeft}</Text>
                  </View>
                  <Text style={styles.pileLabel}>Draw</Text>
                  <Text style={styles.pileSubLabel}>~{approxDeckLeft} left</Text>
                </View>
                {/* Discard pile */}
                <View style={styles.pileCol}>
                  <Animated.View
                    style={[
                      styles.discardGlow,
                      { shadowColor: glow, shadowOpacity: 0.75, shadowRadius: 22, shadowOffset: { width: 0, height: 0 }, elevation: 18 },
                      discardAnimatedStyle,
                    ]}
                  >
                    {top ? (
                      <Animated.View
                        key={top.id}
                        entering={
                          discardAnim === 'up'
                            ? SlideInUp.duration(400).easing(Easing.out(Easing.cubic))
                            : SlideInLeft.duration(400).easing(Easing.out(Easing.cubic))
                        }
                      >
                        <CardFace card={top} w={80} h={110} hideCorner />
                      </Animated.View>
                    ) : null}
                  </Animated.View>
                  <Text style={styles.pileLabel}>Discard</Text>
                </View>
              </View>
              <View style={styles.midSpacer} />
            </View>
          </View>
        </View>

        {/* Player controls */}
        <View style={styles.playerControls}>
          <View style={styles.playerInfoRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeLabel}>{UNO_NAMES[0]}</Text>
              <Text style={styles.countBadgeText}>{game.hands[0].length} cards</Text>
            </View>
          </View>

          <UnoPop visible={unoPop} />

          {game.hands[0].length === 1 && game.winner == null && game.wildPicker !== 0 && !game.playerUnoAcknowledged && (
            <Pressable onPress={handleUno} style={styles.unoBtn}>
              <Text style={styles.unoBtnText}>UNO!</Text>
            </Pressable>
          )}

          <View style={styles.actionBtnRow}>
            {showDrawBtn && (
              <Pressable
                onPress={handleDraw}
                style={[styles.drawBtn, !canDraw && styles.drawBtnDisabled]}
                disabled={!canDraw}
              >
                <MaterialIcons name="style" size={20} color={ACCENT_PURPLE} />
                <Text style={styles.drawBtnText}>
                  {game.drawStack > 0 ? `Take +${game.drawStack}` : 'Draw'}
                </Text>
              </Pressable>
            )}
            {showPassBtn && (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                <Pressable onPress={handlePass} style={styles.passBtn}>
                  <Text style={styles.passBtnText}>Pass</Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Player hand */}
        <Animated.View style={[styles.handSection, handPulseStyle]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.handScrollOuter}
            contentContainerStyle={styles.handScroll}
          >
            {game.hands[0].map((card, index) => {
              const isPlay = playable.some((c) => c.id === card.id);
              const hasAnyPlay = playable.length > 0;
              const dimmed = hasAnyPlay && !isPlay;
              const disabled =
                game.currentTurn !== 0 ||
                game.winner != null ||
                game.wildPicker != null ||
                !isPlay;
              return (
                <HandCard
                  key={card.id}
                  card={card}
                  playable={isPlay}
                  dimmed={dimmed}
                  disabled={disabled}
                  onPress={() => handlePlay(card)}
                  index={index}
                  total={game.hands[0].length}
                />
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>

      {/* Wild color picker — slides up from bottom */}
      <Modal visible={game.wildPicker === 0} transparent animationType="none">
        <View style={styles.modalBackdrop}>
          <Animated.View
            entering={SlideInDown.duration(350).easing(Easing.out(Easing.cubic))}
            style={styles.modalCard}
          >
            <Text style={styles.modalTitle}>
              {pendingWd4 ? 'Choose color — next player draws 4' : 'Choose color'}
            </Text>
            <View style={styles.colorGrid}>
              {(['red', 'blue', 'green', 'yellow'] as const).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => pickWildColor(c)}
                  style={[styles.colorChoice, { backgroundColor: SUIT_HEX[c] }]}
                >
                  <Text style={styles.colorChoiceLabel}>{c.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Win/Loss overlay */}
      {game.winner != null && (
        <View style={styles.endOverlay}>
          <Confetti visible={game.winner === 0} />
          <View style={styles.endCard}>
            <Text style={styles.endEmoji}>{game.winner === 0 ? '🎉' : '🃏'}</Text>
            <Text style={styles.endTitle}>
              {game.winner === 0 ? 'You win!' : `${UNO_NAMES[game.winner]} wins`}
            </Text>
            <Text style={styles.endSub}>
              Session · You {wins} — Losses {losses}
            </Text>
            {endRewards != null && endRewards.xpAdded + endRewards.coinsAdded > 0 ? (
              <GameResultsSummary rewards={endRewards} compact />
            ) : null}
            <Pressable onPress={playAgain} style={styles.playAgain}>
              <LinearGradient
                colors={[AppColors.accent, AppColors.yellow]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.playAgainGrad}
              >
                <Text style={styles.playAgainText}>Play Again</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.backPlay}>
              <Text style={styles.backPlayText}>Back to Play</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screenInner: { flex: 1, backgroundColor: SCREEN_BG, paddingBottom: TAB_BAR_RESERVE },
  boardCard: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: Spacing.md,
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: BOARD_CARD_BG,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  playerControls: {
    flexShrink: 0,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  handSection: { flexShrink: 0, alignSelf: 'stretch' },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: Spacing.md,
  },
  diffChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  diffChipOn: { borderColor: ACCENT_PURPLE, backgroundColor: 'rgba(124, 58, 237, 0.22)' },
  diffChipText: { color: TEXT_DIM, fontWeight: '700', fontSize: 12 },
  diffChipTextOn: { color: '#fff' },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: Spacing.md,
  },
  playersRowLabel: { color: TEXT_DIM, fontWeight: '700', fontSize: 12, marginRight: 4 },
  activeColorBanner: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: PANEL_BG,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activeColorOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },
  colorNameWrap: { alignItems: 'flex-start', gap: 6 },
  colorNameText: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  colorMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDotSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.55,
  },
  colorDotSmallOn: { borderColor: '#fff', opacity: 1, transform: [{ scale: 1.25 }] },
  oppSpacer: { height: 8 },
  stackBanner: {
    marginHorizontal: Spacing.md,
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 102, 0.35)',
  },
  stackBannerText: { color: ACCENT_YELLOW, fontWeight: '800', fontSize: 13, textAlign: 'center' },
  turnRow: { alignItems: 'center', marginTop: 10, marginBottom: 6 },
  turnPill: {
    paddingHorizontal: 26,
    paddingVertical: 11,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  turnPillIdle: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  turnPillTextYours: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },
  turnPillTextIdle: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 15 },
  table: {
    flex: 1,
    minHeight: 0,
    borderRadius: 14,
    backgroundColor: 'transparent',
    paddingTop: 6,
    overflow: 'hidden',
  },
  oppZone: { paddingHorizontal: 8 },
  oppZoneInactive: { opacity: 0.6 },
  oppTop: { alignItems: 'center', minHeight: 82 },
  oppLeft: { alignItems: 'flex-start', minWidth: 100 },
  oppNamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PANEL_BG,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  oppNamePillOn: {
    borderWidth: 1.5,
    borderColor: ACCENT_PURPLE,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    shadowColor: ACCENT_PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  oppNameText: { color: '#fff', fontWeight: '800', fontSize: 13, maxWidth: 72 },
  oppCountBadge: {
    backgroundColor: ACCENT_PURPLE,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oppCountBadgeOn: { backgroundColor: ACCENT_PINK },
  oppCountText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  oppUnoBadge: {
    backgroundColor: ACCENT_YELLOW,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  oppUnoText: { color: '#0d0d0d', fontSize: 10, fontWeight: '900' },
  opponentArc: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  opponentArcOnTurn: {
    shadowColor: ACCENT_PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
    elevation: 10,
  },
  oppCardSlot: {},
  midRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  midSpacer: { width: 72 },
  centerPiles: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 24,
  },
  pileCol: { alignItems: 'center', gap: 4 },
  pileLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' },
  pileSubLabel: { color: TEXT_DIM, fontSize: 10, fontWeight: '600' },
  deckCount: {
    position: 'absolute',
    top: 6,
    right: -6,
    backgroundColor: ACCENT_PURPLE,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BOARD_CARD_BG,
  },
  deckCountText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  discardGlow: { borderRadius: 14 },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PANEL_BG,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  countBadgeLabel: { color: TEXT_DIM, fontWeight: '800', fontSize: 12 },
  countBadgeText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  turnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2ECC71',
  },
  handScrollOuter: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 108,
    height: 108,
    marginBottom: 4,
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  handScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 12,
    paddingRight: 80,
    paddingTop: 4,
    paddingBottom: 4,
  },
  handCardWrap: { alignItems: 'center' },
  /** Glowing border for playable cards */
  playableGlow: {
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 14,
  },
  selectedRing: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: ACCENT_PINK,
    shadowColor: ACCENT_PINK,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 14,
  },
  unoPop: {
    marginBottom: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 12,
  },
  unoPopText: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  cardFace: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardBackOuter: { borderWidth: 2 },
  unoBackText: { fontSize: 18, fontWeight: '900', letterSpacing: 1, color: ACCENT_PURPLE },
  unoBackTextSm: { fontSize: 11, letterSpacing: 0.5 },
  wildQuadrants: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  wildQuadRow: { flex: 1, flexDirection: 'row' },
  wildQuad: { flex: 1, opacity: 0.9 },
  wildCenterDotWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wildCenterDot: { borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.7)' },
  cardValue: {
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  cardValueWild: { color: '#fff' },
  cardCornerLabel: {
    position: 'absolute',
    top: 6,
    left: 8,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  unoBtn: {
    backgroundColor: ACCENT_YELLOW,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 8,
    shadowColor: ACCENT_YELLOW,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  unoBtnText: { fontWeight: '900', fontSize: 16, color: '#0d0d0d' },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  drawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: ACCENT_PURPLE,
  },
  drawBtnDisabled: { opacity: 0.35 },
  drawBtnText: { fontWeight: '800', fontSize: 15, color: ACCENT_PURPLE, letterSpacing: 0.4 },
  passBtn: {
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  passBtnText: { fontWeight: '800', fontSize: 15, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  modalCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 28,
    width: '92%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 24 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  colorChoice: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChoiceLabel: { color: '#fff', fontWeight: '900', fontSize: 11, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  endOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  endCard: {
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  endEmoji: { fontSize: 56, marginBottom: 12 },
  endTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  endSub: { color: 'rgba(255,255,255,0.7)', marginBottom: 24, fontSize: 15 },
  playAgain: { borderRadius: 16, overflow: 'hidden', width: '100%' },
  playAgainGrad: { paddingVertical: 16, alignItems: 'center' },
  playAgainText: { fontWeight: '900', fontSize: 17, color: '#0d0d0d' },
  backPlay: { marginTop: 16, padding: 8 },
  backPlayText: { color: AppColors.yellow, fontWeight: '700', fontSize: 16 },
});
