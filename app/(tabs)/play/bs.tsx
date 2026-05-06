import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { InGameChat } from '@/components/in-game-chat';
import { HowToPlayButton } from '@/components/how-to-play-button';
import { ThemedText } from '@/components/themed-text';
import { WinnerModal } from '@/components/winner-modal';
import type { RewardBreakdown } from '@/lib/game-rewards';
import { useCosmetics } from '@/contexts/cosmetics-context';
import {
  afterPlayAnimation,
  aiChoosePlay,
  aiShouldCallBs,
  cardsMatchClaim,
  createInitialState,
  enterBsFlip,
  finishBsFlip,
  playCards,
  rankLabel,
  skipBs,
  type BsDifficulty,
  type BsGameState,
  type BsPhase,
  type BsPlayer,
  type LastPlay,
  type PlayingCard,
  type Rank,
  type Suit,
} from '@/lib/bs';

/** Returns the human-readable rank noun, correctly singular/plural based on `count`.
 *  e.g. (1, 'A') → "Ace", (2, 'A') → "Aces", (1, '5') → "5", (2, '5') → "5s".
 *  Used in the pile claim line and the Recent Claims chips so the UI reads naturally
 *  ("You claimed 2 Aces") instead of card-shorthand ("You played 2 As"). */
function rankPluralWord(count: number, rank: Rank): string {
  const label = rankLabel(rank);
  const singular =
    label === 'A' ? 'Ace'
    : label === 'K' ? 'King'
    : label === 'Q' ? 'Queen'
    : label === 'J' ? 'Jack'
    : label;
  if (count <= 1) return singular;
  if (label === 'A') return 'Aces';
  if (label === 'K') return 'Kings';
  if (label === 'Q') return 'Queens';
  if (label === 'J') return 'Jacks';
  return `${label}s`;
}

/** Recent-claims chip: "You" for human seat. */
function formatHistoryChipLine(players: BsGameState['players'], lp: LastPlay): string {
  const name = lp.playerId === 0 ? 'You' : (players[lp.playerId]?.name ?? 'Player');
  const rw = rankPluralWord(lp.cards.length, lp.claimedRank);
  return `${name} claimed ${lp.cards.length} ${rw}`;
}

function playerInitials(p: BsPlayer): string {
  return p.name.slice(0, 2).toUpperCase();
}

const FLIP_STAGGER_MS = 520;
const FLIP_ONE_MS = 920;

/** Poker-table theme: dark felt, purple accent, high contrast type. */
const BG_DARK = '#0d0d0d';
const FELT_BG = '#0f1a0f';
const ACCENT_PURPLE = '#7C3AED';
const ACCENT_PINK = '#FF6FD8';
const DANGER_RED = '#ef4444';
const SUCCESS_GREEN = '#22c55e';
const ACCENT_RED = '#DC2626';
const SURFACE_1 = '#1a1a1a';
const SURFACE_2 = '#2a2a2a';
const CHIP_UNSELECTED = '#1e1e1e';
const CARD_BG = '#1a1a2e';
const CARD_WHITE = '#fafafa';
const BANNER_BG = '#111827';
const TIMER_YELLOW = '#FDE047';
const SUIT_RED = '#EF4444';
const SUIT_BLACK = '#0d0d0d';
const HAND_SUIT_RED = '#dc2626';
const HAND_SUIT_BLACK = '#111111';
const TURN_LIMIT_SEC = 10;
/** Vertical space above the device safe area that the absolute-positioned tab bar occupies
 *  (CustomTabBar ≈ 70px of visible chrome + its own safe-area paddingBottom). Reserving this
 *  keeps the hand + controls from sliding under the tab bar. */
const TAB_BAR_RESERVE = 84;

function suitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts':
      return '♥';
    case 'diamonds':
      return '♦';
    case 'clubs':
      return '♣';
    case 'spades':
      return '♠';
  }
}

/** Display suit for the claimed-reference card when no real card exists — cycles by rank; fallback ♠. */
function defaultSuitForClaimedRank(rank: Rank): Suit {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  if (rank < 1 || rank > 13) return 'spades';
  return suits[(rank - 1) % 4]!;
}

function CardFace({
  card,
  w,
  h,
  small,
  variant = 'default',
}: {
  card: PlayingCard;
  w: number;
  h: number;
  small?: boolean;
  variant?: 'default' | 'hand';
}) {
  const isHand = variant === 'hand';
  const col =
    card.suit === 'hearts' || card.suit === 'diamonds'
      ? isHand
        ? HAND_SUIT_RED
        : SUIT_RED
      : isHand
        ? HAND_SUIT_BLACK
        : SUIT_BLACK;
  const label = rankLabel(card.rank);
  const suit = suitSymbol(card.suit);
  return (
    <View style={[styles.cardFace, isHand && styles.cardFaceHand, { width: w, height: h }]}>
      <View style={[styles.cardCornerTL, small && styles.cardCornerTLSm]}>
        <Text
          style={[
            styles.cardCornerRank,
            small && (isHand ? styles.cardCornerRankHand : styles.cardCornerRankSm),
            { color: col },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.cardCornerSuit,
            small && (isHand ? styles.cardCornerSuitHand : styles.cardCornerSuitSm),
            { color: col },
          ]}
        >
          {suit}
        </Text>
      </View>
      <Text style={[styles.cardCenterSuit, { color: col }, small && (isHand ? styles.cardCenterSuitHand : styles.cardCenterSuitSm)]}>
        {suit}
      </Text>
      <View style={[styles.cardCornerBR, small && styles.cardCornerBRSm]}>
        <Text
          style={[
            styles.cardCornerRank,
            small && (isHand ? styles.cardCornerRankHand : styles.cardCornerRankSm),
            { color: col },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.cardCornerSuit,
            small && (isHand ? styles.cardCornerSuitHand : styles.cardCornerSuitSm),
            { color: col },
          ]}
        >
          {suit}
        </Text>
      </View>
    </View>
  );
}

function CardBack({ w, h, small }: { w: number; h: number; small?: boolean }) {
  return (
    <View style={[styles.cardBackOuter, { width: w, height: h }]}>
      <Text style={[styles.bsBackText, small && styles.bsBackTextSm]}>BS</Text>
    </View>
  );
}

function FlipRevealCard({
  card,
  width,
  height,
  index,
}: {
  card: PlayingCard;
  width: number;
  height: number;
  index: number;
}) {
  const rot = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(rot);
    rot.value = 0;
    rot.value = withDelay(
      index * FLIP_STAGGER_MS,
      withTiming(180, { duration: FLIP_ONE_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [card.id, index, rot]);

  const frontStyle = useAnimatedStyle(() => {
    const v = rot.value;
    const show = v < 90;
    return {
      transform: [{ perspective: 900 }, { rotateY: `${v}deg` }],
      opacity: show ? 1 : 0,
      position: 'absolute',
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const v = rot.value;
    const show = v >= 90;
    return {
      transform: [{ perspective: 900 }, { rotateY: `${v - 180}deg` }],
      opacity: show ? 1 : 0,
      position: 'absolute',
    };
  });

  return (
    <View style={{ width, height }}>
      {/* Front of the flip: the face-down "BS" card back. It rotates AWAY as the
          flip progresses, revealing the real CardFace (rank + suit) on the back.
          Using CardBack here (instead of a "claimed" pseudo-card) means the reveal
          always shows the player's actual card, which is the whole point of BS. */}
      <Animated.View style={frontStyle}>
        <CardBack w={width} h={height} />
      </Animated.View>
      <Animated.View style={backStyle}>
        <CardFace card={card} w={width} h={height} small />
      </Animated.View>
    </View>
  );
}

/** A purple-bordered reference card rendered alongside the revealed cards so the
 *  player can visually compare what was CLAIMED against what was actually played.
 *  Center shows a large suit (default suit for that rank). Corners show rank only. */
function ClaimedRefCard({
  rank,
  width,
  height,
  compact,
}: {
  rank: Rank;
  width: number;
  height: number;
  compact?: boolean;
}) {
  const label = rankLabel(rank);
  const suit = defaultSuitForClaimedRank(rank);
  const suitChar = suitSymbol(suit);
  const suitCol = suit === 'hearts' || suit === 'diamonds' ? SUIT_RED : SUIT_BLACK;
  return (
    <View style={[styles.claimedRefCard, compact && styles.claimedRefCardCompact, { width, height }]}>
      <View style={[styles.cardCornerTL, styles.cardCornerTLSm]}>
        <Text style={[styles.cardCornerRank, styles.cardCornerRankSm, { color: SUIT_BLACK }]}>
          {label}
        </Text>
        <Text style={[styles.cardCornerSuit, styles.cardCornerSuitSm, { color: suitCol }]}>
          {suitChar}
        </Text>
      </View>
      <Text style={[styles.claimedRefCenterSuit, compact && styles.claimedRefCenterSuitCompact, { color: suitCol }]}>
        {suitChar}
      </Text>
      <View style={[styles.cardCornerBR, styles.cardCornerBRSm]}>
        <Text style={[styles.cardCornerRank, styles.cardCornerRankSm, { color: SUIT_BLACK }]}>
          {label}
        </Text>
        <Text style={[styles.cardCornerSuit, styles.cardCornerSuitSm, { color: suitCol }]}>
          {suitChar}
        </Text>
      </View>
    </View>
  );
}

function FlipReveal({
  cards,
  claimedRank,
  width,
  height,
  compact,
}: {
  cards: PlayingCard[];
  claimedRank: Rank;
  width: number;
  height: number;
  compact?: boolean;
}) {
  const revealFade = useSharedValue(0);
  const cardsKey = cards.map((c) => c.id).join(',');

  useEffect(() => {
    revealFade.value = 0;
    revealFade.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
  }, [claimedRank, cardsKey]);

  const revealFadeStyle = useAnimatedStyle(() => ({
    opacity: revealFade.value,
    transform: [{ translateY: (1 - revealFade.value) * 20 }],
  }));

  const honestPlay = cardsMatchClaim(cards, claimedRank);
  const revealTitle = honestPlay ? '😅 Honest! You take the pile.' : '🎉 Caught bluffing!';
  const revealTitleColor = honestPlay ? DANGER_RED : SUCCESS_GREEN;

  // Reference card + actual revealed cards. Once there are more than 3 actual cards
  // the total row width exceeds even a wide phone, so wrap the row in a horizontal
  // ScrollView; otherwise keep it a centered static row for a calmer layout.
  const scrollable = cards.length > 3;

  const slotLabClaimed = compact ? styles.flipSlotLabelCompact : styles.flipSlotLabel;
  const slotLabActual = compact ? styles.flipSlotLabelActualCompact : styles.flipSlotLabelActual;
  const cardBorder = compact ? styles.flipActualCardBorderCompact : styles.flipActualCardBorder;

  const slots = (
    <>
      <View style={styles.flipSlot}>
        <ClaimedRefCard rank={claimedRank} width={width} height={height} compact={compact} />
        <Text style={slotLabClaimed}>CLAIMED</Text>
      </View>
      {cards.map((c, i) => (
        <View key={c.id} style={styles.flipSlot}>
          <View style={cardBorder}>
            <FlipRevealCard card={c} width={width} height={height} index={i} />
          </View>
          <Text style={slotLabActual}>ACTUAL</Text>
        </View>
      ))}
    </>
  );

  return (
    <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      <Text
        style={[
          compact ? styles.flipRevealTitleCompact : styles.flipRevealTitle,
          compact ? null : styles.flipRevealTitleLarge,
          { color: revealTitleColor },
        ]}
        numberOfLines={compact ? 2 : 4}
      >
        {revealTitle}
      </Text>
      <Animated.View style={[revealFadeStyle, { alignSelf: 'stretch', alignItems: 'center' }]}>
        {scrollable ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.flipRowScroll}
          >
            {slots}
          </ScrollView>
        ) : (
          <View style={styles.flipRow}>{slots}</View>
        )}
      </Animated.View>
    </View>
  );
}

/** Inline animated ellipsis for the AI-turn banner (presentation only). */
function AiThinkingDots() {
  const [dotCount, setDotCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDotCount((n) => (n + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);
  return <Text style={styles.aiWaitHeaderDots}>{'.'.repeat(dotCount)}</Text>;
}

function HandCardSpring({ active, children }: { active: boolean; children: React.ReactNode }) {
  const lift = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    lift.value = withSpring(active ? -4 : 0, { damping: 16, stiffness: 260 });
    scale.value = withSpring(active ? 1.02 : 1, { damping: 16, stiffness: 260 });
  }, [active, lift, scale]);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

function AvatarPulseRing({ active }: { active: boolean }) {
  const pulse = useSharedValue(1);
  const op = useSharedValue(0.6);
  useEffect(() => {
    cancelAnimation(pulse);
    cancelAnimation(op);
    if (!active) {
      pulse.value = 1;
      op.value = 0.6;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 750, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    op.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.6, { duration: 750, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(op);
    };
  }, [active, pulse, op]);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: op.value,
  }));
  if (!active) return null;
  return <Animated.View pointerEvents="none" style={[styles.avatarPulseRing, ringStyle]} />;
}

function FlyCard({
  active,
  onDone,
  fromPlayerId,
  playerCount,
}: {
  active: boolean;
  onDone: () => void;
  fromPlayerId: number;
  playerCount: number;
}) {
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const op = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      y.value = 0;
      x.value = 0;
      op.value = 1;
      return;
    }
    let startY = 0;
    let startX = 0;
    if (playerCount <= 2) {
      startY = fromPlayerId === 0 ? 130 : -130;
    } else if (fromPlayerId === 0) {
      startY = 130;
    } else if (fromPlayerId === 1) {
      startX = -130;
      startY = -40;
    } else {
      startX = 130;
      startY = -40;
    }
    y.value = startY;
    x.value = startX;
    op.value = 1;
    x.value = withTiming(0, { duration: 540 });
    y.value = withTiming(0, { duration: 540 }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [active, fromPlayerId, playerCount, onDone, op, x, y]);

  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
    opacity: op.value,
  }));

  if (!active) return null;

  return (
    <Animated.View style={[styles.flyWrap, st]} pointerEvents="none">
      <CardBack w={36} h={48} small />
    </Animated.View>
  );
}

export default function BsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rewardGameEnd } = useCosmetics();
  const [playerCount, setPlayerCount] = useState(2);
  const [difficulty, setDifficulty] = useState<BsDifficulty>('medium');
  const [started, setStarted] = useState(false);
  const [game, setGame] = useState<BsGameState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [playQty, setPlayQty] = useState(1);
  const [fly, setFly] = useState(false);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [endRewards, setEndRewards] = useState<RewardBreakdown | null>(null);
  const [playHistory, setPlayHistory] = useState<LastPlay[]>([]);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState(TURN_LIMIT_SEC);
  const [bsFlash, setBsFlash] = useState<'green' | 'red' | null>(null);
  const [aiToast, setAiToast] = useState<string | null>(null);
  const aiToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoredRef = useRef(false);
  const playSigRef = useRef(0);
  const flyDoneRef = useRef<() => void>(() => {});
  const playHistPhaseRef = useRef<BsPhase | null>(null);
  const lastHistSigRef = useRef('');
  const forcedPlayKeyRef = useRef('');
  /** Tracks the short reveal-flash timeout so it never fires after unmount. */
  const bsFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startGame = useCallback(() => {
    setStarted(true);
    setGame(createInitialState(playerCount, 0, difficulty));
    setSelected(new Set());
    setPlayQty(1);
    setPlayHistory([]);
    setBsFlash(null);
    forcedPlayKeyRef.current = '';
    lastHistSigRef.current = '';
    scoredRef.current = false;
  }, [playerCount, difficulty]);

  const human = game?.players[0];
  const maxPick = useMemo(() => Math.min(4, human?.hand.length ?? 4), [human?.hand.length]);

  useEffect(() => {
    if (playQty > maxPick) setPlayQty(Math.max(1, maxPick));
  }, [maxPick, playQty]);

  // Unmount safety: ensure the reveal-flash timer never fires after the screen is gone.
  useEffect(() => {
    return () => {
      if (bsFlashTimerRef.current) {
        clearTimeout(bsFlashTimerRef.current);
        bsFlashTimerRef.current = null;
      }
      if (aiToastTimerRef.current) {
        clearTimeout(aiToastTimerRef.current);
        aiToastTimerRef.current = null;
      }
    };
  }, []);

  const toggleCard = useCallback(
    (id: string) => {
      if (!game || game.phase !== 'play_select' || game.turnIndex !== 0) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else if (next.size < playQty) next.add(id);
        return next;
      });
    },
    [game, playQty],
  );

  const runFlyThenBs = useCallback((g: BsGameState) => {
    playSigRef.current += 1;
    const sig = playSigRef.current;
    flyDoneRef.current = () => {
      setFly(false);
      setGame((cur) => {
        if (!cur || cur.phase !== 'anim_play') return cur;
        if (playSigRef.current !== sig) return cur;
        return afterPlayAnimation(cur);
      });
    };
    setFly(true);
  }, []);

  useEffect(() => {
    if (!game || game.phase !== 'play_select') return;
    forcedPlayKeyRef.current = '';
    setTurnSecondsLeft(TURN_LIMIT_SEC);
    const id = setInterval(() => {
      setTurnSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [game?.phase, game?.turnIndex, game?.pile.length, game?.requiredRank]);

  useEffect(() => {
    if (!game || game.phase !== 'play_select' || turnSecondsLeft > 0) return;
    const k = `${game.turnIndex}|${game.pile.length}|${game.requiredRank}`;
    if (forcedPlayKeyRef.current === k) return;
    forcedPlayKeyRef.current = k;
    setGame((g) => {
      if (!g || g.phase !== 'play_select') return g;
      const seat = g.turnIndex;
      const ids = aiChoosePlay(g, seat);
      if (ids.length === 0) return g;
      const res = playCards(g, ids);
      return res.ok ? res.state : g;
    });
  }, [turnSecondsLeft, game?.phase, game?.turnIndex, game?.pile.length, game?.requiredRank]);

  useEffect(() => {
    if (!game) return;
    const prev = playHistPhaseRef.current;
    playHistPhaseRef.current = game.phase;
    if (prev === 'play_select' && game.phase === 'anim_play' && game.lastPlay) {
      const lp = game.lastPlay;
      const sig = `${lp.playerId}|${lp.cards.map((c) => c.id).join(',')}`;
      if (lastHistSigRef.current === sig) return;
      lastHistSigRef.current = sig;
      setPlayHistory((h) =>
        [...h, { playerId: lp.playerId, claimedRank: lp.claimedRank, cards: [...lp.cards] }].slice(-5),
      );
      // Top-of-screen ephemeral toast for AI plays so the player sees the claim
      // even if they missed the fly-card animation.
      if (lp.playerId !== 0) {
        const aiName = game.players[lp.playerId]?.name ?? 'AI';
        const rw = rankPluralWord(lp.cards.length, lp.claimedRank);
        setAiToast(`${aiName} claimed ${lp.cards.length} ${rw}`);
        if (aiToastTimerRef.current) clearTimeout(aiToastTimerRef.current);
        aiToastTimerRef.current = setTimeout(() => {
          aiToastTimerRef.current = null;
          setAiToast(null);
        }, 2000);
      }
    }
  }, [game?.phase, game?.lastPlay, game?.players]);

  useEffect(() => {
    if (!game || game.phase !== 'anim_play') return;
    runFlyThenBs(game);
  }, [game?.phase, game?.lastPlay?.playerId, game?.lastPlay?.cards.length, runFlyThenBs]);

  useEffect(() => {
    if (!game || game.phase !== 'bs_window' || !game.lastPlay) return;
    const actor = game.lastPlay.playerId;
    const others = game.players.map((_, i) => i).filter((i) => i !== actor);
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    shuffled.forEach((pid, idx) => {
      const delay = 280 + idx * 420 + Math.random() * 380;
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setGame((g) => {
            if (!g || g.phase !== 'bs_window' || !g.lastPlay || g.lastPlay.playerId !== actor) return g;
            if (aiShouldCallBs(g, pid)) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              return enterBsFlip(g, pid);
            }
            return g;
          });
        }, delay),
      );
    });
    const skipT = setTimeout(() => {
      setGame((g) => {
        if (!g || g.phase !== 'bs_window') return g;
        return skipBs(g);
      });
    }, 2600);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearTimeout(skipT);
    };
  }, [game?.phase, game?.lastPlay?.playerId, game?.pile.length]);

  useEffect(() => {
    if (!game || game.phase !== 'bs_flip' || !game.lastPlay) return;
    const n = game.lastPlay.cards.length;
    const flipTotalMs = Math.max(1900, (n - 1) * FLIP_STAGGER_MS + FLIP_ONE_MS + 400);
    const t = setTimeout(() => {
      setGame((g) => {
        if (!g || g.phase !== 'bs_flip' || !g.lastPlay || g.bsCallerIndex == null) return g;
        const honest = cardsMatchClaim(g.lastPlay.cards, g.lastPlay.claimedRank);
        setBsFlash(honest ? 'red' : 'green');
        if (bsFlashTimerRef.current) clearTimeout(bsFlashTimerRef.current);
        bsFlashTimerRef.current = setTimeout(() => {
          bsFlashTimerRef.current = null;
          setBsFlash(null);
        }, 560);
        return finishBsFlip(g);
      });
    }, flipTotalMs);
    return () => clearTimeout(t);
  }, [game?.phase, game?.bsCallerIndex, game?.lastPlay?.playerId, game?.lastPlay?.cards.length]);

  useEffect(() => {
    if (!game || game.phase !== 'game_over' || game.winnerIndex == null) {
      if (!game || game.phase !== 'game_over') setEndRewards(null);
      return;
    }
    if (!scoredRef.current) {
      scoredRef.current = true;
      if (game.winnerIndex === 0) {
        setWins((w) => w + 1);
        void rewardGameEnd('win').then(setEndRewards);
      } else {
        setLosses((l) => l + 1);
        void rewardGameEnd('loss').then(setEndRewards);
      }
    }
  }, [game?.phase, game?.winnerIndex, game, rewardGameEnd]);

  const handleHumanPlay = useCallback(() => {
    if (!game || game.phase !== 'play_select' || game.turnIndex !== 0) return;
    if (selected.size !== playQty) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = playCards(game, [...selected]);
    if (!res.ok) return;
    setSelected(new Set());
    setGame(res.state);
  }, [game, playQty, selected]);

  const handleBs = useCallback(() => {
    if (!game || game.phase !== 'bs_window' || !game.lastPlay) return;
    if (game.lastPlay.playerId === 0) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setGame((g) => (g ? enterBsFlip(g, 0) : g));
  }, [game]);

  const winnerName =
    game?.winnerIndex != null ? (game.winnerIndex === 0 ? 'You' : game.players[game.winnerIndex].name) : '';

  const centerPile = game?.pile.length ?? 0;

  const canCallBs =
    !!game &&
    game.phase === 'bs_window' &&
    game.lastPlay != null &&
    game.lastPlay.playerId !== 0;

  const yourTurnPlaySelect = !!game && game.phase === 'play_select' && game.turnIndex === 0;
  const showTurnTimer = !!game && game.phase === 'play_select';

  const instructionUi = useMemo((): {
    text: string;
    stripe: string;
    border: string;
    textColor: string;
    stripeW: number;
    pulse: boolean;
  } | null => {
    if (!game || game.phase === 'game_over') return null;
    if (game.phase === 'bs_flip') {
      return {
        text: 'Revealing... caught them or not? 😅',
        stripe: '#F97316',
        border: '#F97316',
        textColor: '#fff',
        stripeW: 4,
        pulse: false,
      };
    }
    if (game.phase === 'bs_window' && canCallBs) {
      return {
        text: '🚨 Think AI is lying? CALL BS now!',
        stripe: DANGER_RED,
        border: DANGER_RED,
        textColor: DANGER_RED,
        stripeW: 4,
        pulse: true,
      };
    }
    if (game.phase === 'bs_window') {
      return {
        text: 'Opponents deciding — did they buy it?',
        stripe: '#6b7280',
        border: '#6b7280',
        textColor: '#fff',
        stripeW: 4,
        pulse: false,
      };
    }
    if (game.phase === 'anim_play') {
      return {
        text: 'Watch closely — is AI bluffing? 👀',
        stripe: '#6b7280',
        border: '#6b7280',
        textColor: '#fff',
        stripeW: 4,
        pulse: false,
      };
    }
    if (game.phase === 'play_select' && game.turnIndex === 0) {
      return {
        text: `Play 1–4 cards claiming they are ${rankLabel(game.requiredRank)} 🃏`,
        stripe: ACCENT_PURPLE,
        border: ACCENT_PURPLE,
        textColor: '#fff',
        stripeW: 4,
        pulse: false,
      };
    }
    if (game.phase === 'play_select') {
      return {
        text: 'Watch closely — is AI bluffing? 👀',
        stripe: '#6b7280',
        border: '#6b7280',
        textColor: '#fff',
        stripeW: 4,
        pulse: false,
      };
    }
    return null;
  }, [game, canCallBs]);

  const bsBtnTitle = useMemo(() => {
    if (!game) return '🚨 CALL BS!';
    if (canCallBs) return '🚨 CALL BS!';
    if (game.phase === 'bs_flip') return 'Revealing...';
    if (yourTurnPlaySelect) return 'Play cards first';
    if (game.phase === 'anim_play') return 'Resolving play...';
    if (game.phase === 'game_over') return 'Game over';
    return 'Waiting...';
  }, [game, canCallBs, yourTurnPlaySelect]);

  /** Pulses an outline ring around the Call-BS button when it's actually callable.
   *  Oscillates 0→1→0 continuously; mapped to opacity + scale in `bsPulseStyle`. */
  const bsPulse = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(bsPulse);
    if (canCallBs) {
      bsPulse.value = 0;
      bsPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 650, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      bsPulse.value = 0;
    }
    return () => cancelAnimation(bsPulse);
  }, [canCallBs, bsPulse]);

  const bsPulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + bsPulse.value * 0.55,
    transform: [{ scale: 1 + bsPulse.value * 0.03 }],
  }));

  const bsGlowRadius = useSharedValue(4);
  useEffect(() => {
    cancelAnimation(bsGlowRadius);
    if (!canCallBs) {
      bsGlowRadius.value = 4;
      return;
    }
    bsGlowRadius.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(bsGlowRadius);
  }, [canCallBs, bsGlowRadius]);

  const bsBtnGlowStyle = useAnimatedStyle(() => ({
    shadowRadius: bsGlowRadius.value,
    shadowOpacity: 0.6,
    shadowColor: DANGER_RED,
    shadowOffset: { width: 0, height: 0 },
  }));

  const instructionOp = useSharedValue(1);
  const lastInstrRef = useRef<string | null>(null);
  useEffect(() => {
    if (!game) return;
    const t = instructionUi?.text ?? '';
    if (lastInstrRef.current === null) {
      lastInstrRef.current = t;
      instructionOp.value = 1;
      return;
    }
    if (lastInstrRef.current === t) return;
    lastInstrRef.current = t;
    instructionOp.value = 0;
    instructionOp.value = withTiming(1, { duration: 300 });
  }, [game, instructionUi?.text, instructionOp]);

  const instructionBannerAnimStyle = useAnimatedStyle(() => ({
    opacity: instructionOp.value,
  }));

  const iBannerPulse = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(iBannerPulse);
    if (!instructionUi?.pulse) {
      iBannerPulse.value = 1;
      return;
    }
    iBannerPulse.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(iBannerPulse);
  }, [instructionUi?.pulse, iBannerPulse]);

  const instructionPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iBannerPulse.value }],
  }));

  const lastSelectedId = useMemo(() => {
    if (selected.size === 0) return null as string | null;
    const arr = [...selected];
    return arr[arr.length - 1] ?? null;
  }, [selected]);

  const winnerStatsSubtitle = useMemo(() => {
    if (!game || game.phase !== 'game_over') return 'First to empty their hand wins.';
    return `${wins} wins · ${losses} losses this session\n${game.revealedMemory.length} cards revealed`;
  }, [game, wins, losses]);

  const onFlyDone = useCallback(() => {
    flyDoneRef.current();
  }, []);

  if (!started || !game) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={styles.setupHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.setupTitle}>
            BS — Bullshit
          </ThemedText>
          <InGameChat selfName="You" opponentName="Table" opponentIsAi />
          <HowToPlayButton gameId="bs" tint="#fff" />
        </View>
        <View style={styles.setupBody}>
          <Text style={styles.setupLabel}>Players (you + AI)</Text>
          <View style={styles.rowGap}>
            {[2, 3, 4].map((n) => (
              <Pressable
                key={n}
                onPress={() => setPlayerCount(n)}
                style={[styles.chip, playerCount === n && styles.chipOn]}
              >
                <Text style={[styles.chipText, playerCount === n && styles.chipTextOn]}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.setupLabel, { marginTop: 20 }]}>Difficulty</Text>
          <View style={styles.rowGap}>
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => setDifficulty(d)}
                style={[styles.chip, difficulty === d && styles.chipOn]}
              >
                <Text style={[styles.chipText, difficulty === d && styles.chipTextOn]}>
                  {d[0].toUpperCase() + d.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.startBtnWrap} onPress={startGame}>
            <LinearGradient
              colors={[ACCENT_PURPLE, ACCENT_PINK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startBtnGrad}
            >
              <Text style={styles.startBtnText}>Deal</Text>
            </LinearGradient>
          </Pressable>
          <Text style={styles.rulesHint}>
            Claim matches the rank in order (A→K). Call BS if you doubt the last play. Wrong caller
            takes the pile.
          </Text>
        </View>
        </View>
      </SafeAreaView>
    );
  }

  const turnPlayer = game.players[game.turnIndex];
  const showFlip = game.phase === 'bs_flip' && game.lastPlay && game.bsCallerIndex != null;

  const turnTag =
    game.phase === 'game_over'
      ? ''
      : game.phase === 'play_select'
        ? game.turnIndex === 0
          ? 'YOUR TURN'
          : 'AI TURN'
        : game.phase === 'bs_window'
          ? 'CALL BS?'
          : game.phase === 'bs_flip'
            ? 'REVEAL'
            : game.phase === 'anim_play'
              ? 'PLAYING'
              : '';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {bsFlash ? (
        <View
          pointerEvents="none"
          style={[styles.bsFlashOverlay, bsFlash === 'green' ? styles.bsFlashGreen : styles.bsFlashRed]}
        />
      ) : null}

      {aiToast ? (
        <View
          pointerEvents="none"
          style={[styles.aiToast, { top: insets.top + 8 }]}
        >
          <Text style={styles.aiToastText} numberOfLines={1}>
            {aiToast}
          </Text>
        </View>
      ) : null}

      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.headerStatusRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.statusBarCenter}>
            {game.phase === 'play_select' && game.turnIndex === 0 ? (
              <View style={styles.statusYourTurnCol}>
                <View style={styles.statusRowLine}>
                  <View style={styles.greenDot} />
                  <Text style={styles.statusYourTurnLabel}>YOUR TURN</Text>
                </View>
                <View style={styles.claimRankPill}>
                  <Text style={styles.claimRankPillText}>Claim: {rankLabel(game.requiredRank)}</Text>
                </View>
              </View>
            ) : game.phase === 'play_select' && game.turnIndex !== 0 ? (
              <View style={styles.aiWaitHeaderRow}>
                <Text style={styles.aiWaitHeaderText}>⏳ Waiting for {turnPlayer.name}...</Text>
                <AiThinkingDots />
              </View>
            ) : game.phase !== 'game_over' ? (
              <View style={styles.statusFallbackCol}>
                <Text style={styles.statusNameText} numberOfLines={1}>
                  {turnPlayer.name}
                </Text>
                {turnTag ? <Text style={styles.statusPhaseSmall}>{turnTag}</Text> : null}
              </View>
            ) : null}
          </View>
          <View style={styles.headerRightCluster}>
            {showTurnTimer ? (
              <Text
                style={[
                  styles.timerYellow,
                  turnSecondsLeft <= 3 && styles.timerYellowUrgent,
                ]}
              >
                ⏱ {turnSecondsLeft}s
              </Text>
            ) : null}
            <InGameChat selfName="You" opponentName="Table" opponentIsAi />
            <HowToPlayButton gameId="bs" tint="#fff" />
          </View>
        </View>

        {instructionUi ? (
          <Animated.View style={[instructionPulseStyle, styles.instructionPulseWrap]}>
            <Animated.View style={instructionBannerAnimStyle}>
              <View style={[styles.instructionBannerV2, { borderColor: instructionUi.border }]}>
                <View
                  style={[
                    styles.instructionStripe,
                    { width: instructionUi.stripeW, backgroundColor: instructionUi.stripe },
                  ]}
                />
                <Text
                  style={[styles.instructionBannerTextV2, { color: instructionUi.textColor }]}
                  numberOfLines={3}
                >
                  {instructionUi.text}
                </Text>
              </View>
            </Animated.View>
          </Animated.View>
        ) : null}

        <View style={styles.orderAvatarsRow}>
          {game.players.map((p, i) => {
            const active = game.turnIndex === i;
            return (
              <View key={p.id} style={[styles.orderAvatarCell, !active && styles.orderAvatarCellDim]}>
                <View style={styles.avatarRingWrap}>
                  <AvatarPulseRing active={active} />
                  <View style={styles.orderAvatarInner}>
                    <Avatar initials={playerInitials(p)} size="mini" />
                  </View>
                </View>
                <View style={styles.orderCountBadgeV2}>
                  <Text style={styles.orderCountBadgeTextV2}>{p.hand.length}</Text>
                </View>
                <Text style={styles.orderAvatarNameV2} numberOfLines={1}>
                  {p.name}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.winReminderV2}>First to empty hand wins 🏆</Text>

        <View style={styles.table}>
          <View style={styles.feltTable}>
            {game.phase !== 'game_over' ? (
              <Text style={styles.feltRoundRank} numberOfLines={1}>
                Round rank: {rankLabel(game.requiredRank)}
                {centerPile > 0 ? ` · ${centerPile} in pile` : ''}
              </Text>
            ) : null}
            <View style={styles.centerZone}>
              <FlyCard
                active={fly}
                onDone={onFlyDone}
                fromPlayerId={game.lastPlay?.playerId ?? 0}
                playerCount={game.players.length}
              />
              {showFlip && game.lastPlay ? (
                <FlipReveal
                  cards={game.lastPlay.cards}
                  claimedRank={game.lastPlay.claimedRank}
                  width={34}
                  height={46}
                  compact
                />
              ) : (
                <View style={styles.pileStack}>
                  {centerPile > 0 ? (
                    <View
                      style={[
                        styles.pileCardStackVertical,
                        { height: 46 + (Math.min(centerPile, 5) - 1) * 2 },
                      ]}
                    >
                      {Array.from({ length: Math.min(centerPile, 5) }).map((_, i) => {
                        const rot = ((i * 5 + 1) % 9) - 4;
                        return (
                          <View
                            key={`pile-${i}`}
                            style={[
                              styles.pileCardLayer,
                              {
                                top: i * 2,
                                zIndex: i,
                                transform: [{ rotate: `${rot}deg` }],
                              },
                            ]}
                          >
                            <CardBack w={34} h={46} />
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.pileEmptyV2}>
                      <Text style={styles.pileEmptyTextV2}>Empty pile — play first!</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {playHistory.length > 0 ? (
          <View style={styles.historyBox}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyPillsRow}
            >
              {[...playHistory].reverse().map((lp, i) => (
                <View
                  key={`${lp.playerId}-${lp.cards.map((c) => c.id).join('-')}-${i}`}
                  style={[
                    styles.historyPillV2,
                    i === 0 && styles.historyPillRecent,
                  ]}
                >
                  <Text
                    style={[
                      styles.historyPillTextV2,
                      lp.playerId === 0 ? styles.historyTextYou : styles.historyTextAi,
                    ]}
                    numberOfLines={1}
                  >
                    {formatHistoryChipLine(game.players, lp)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.controls}>
          {canCallBs ? (
            <Animated.View style={[styles.bsBtnGlowOuter, bsBtnGlowStyle]}>
              <Pressable style={[styles.bsBtn, styles.bsBtnActive]} disabled={false} onPress={handleBs}>
                <Animated.View pointerEvents="none" style={[styles.bsBtnPulseRing, bsPulseStyle]} />
                <Text style={styles.bsBtnTextActive}>{bsBtnTitle}</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <Pressable
              style={[styles.bsBtn, styles.bsBtnMutedV2]}
              disabled={!canCallBs}
              onPress={handleBs}
            >
              <Text style={styles.bsBtnTextMutedV2}>{bsBtnTitle}</Text>
            </Pressable>
          )}

          {game.phase === 'play_select' && game.turnIndex === 0 ? (
            <View style={styles.humanPanelOuter}>
              <View style={styles.humanPanel}>
                <View style={styles.qtyRowOuter}>
                  <View style={styles.qtyRow}>
                  <Text style={styles.qtyHint}>How many</Text>
                  {[1, 2, 3, 4].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => {
                        setPlayQty(n);
                        setSelected(new Set());
                      }}
                      style={[
                        styles.qtyChipV2,
                        playQty === n && styles.qtyChipV2On,
                        n > maxPick && styles.qtyChipOff,
                      ]}
                      disabled={n > maxPick}
                    >
                      <Text
                        style={[
                          styles.qtyChipTextV2,
                          playQty === n && styles.qtyChipTextV2On,
                        ]}
                      >
                        {n}
                      </Text>
                    </Pressable>
                  ))}
                  </View>
                </View>
                <Pressable
                  style={styles.playBtnWrap}
                  disabled={selected.size !== playQty}
                  onPress={handleHumanPlay}
                >
                  {selected.size > 0 ? (
                    <LinearGradient
                      colors={[ACCENT_PURPLE, ACCENT_PINK]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.playBtnGradV2}
                    >
                      <Text style={styles.playBtnTextV2}>Play to Pile ▶</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.playBtnInactiveV2}>
                      <Text style={styles.playBtnInactiveTextV2}>Select a card first</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.handDock}>
          <View style={styles.handMeta}>
            <Text style={styles.handMetaTextV2}>
              Your hand · {human?.hand.length ?? 0} cards
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.handScrollOuter}
            contentContainerStyle={styles.handRow}
          >
            {human?.hand.map((c, index) => {
              const on = selected.has(c.id);
              const total = human.hand.length;
              const mid = (total - 1) / 2;
              const rot = (index - mid) * 3;
              const handLocked = game.phase !== 'play_select' || game.turnIndex !== 0;
              const showCountBadge = on && lastSelectedId === c.id && selected.size > 1;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggleCard(c.id)}
                  disabled={handLocked}
                  style={[styles.handCardPressable, { marginLeft: index === 0 ? 0 : -10, zIndex: index }]}
                >
                  <HandCardSpring active={on}>
                    <View style={[styles.handCardWrap, handLocked && styles.handCardLocked]}>
                      <View
                        style={[
                          styles.handCardBody,
                          on && styles.handCardBodyOnV2,
                          { transform: [{ rotate: `${rot}deg` }] },
                        ]}
                      >
                        <CardFace card={c} w={58} h={80} small variant="hand" />
                        {showCountBadge ? (
                          <View style={styles.multiSelectBadge} pointerEvents="none">
                            <Text style={styles.multiSelectBadgeText}>{selected.size}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </HandCardSpring>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

      <WinnerModal
        visible={game.phase === 'game_over'}
        winnerName={winnerName}
        score={{ wins, losses }}
        subtitle={winnerStatsSubtitle}
        rewards={endRewards}
        onPlayAgain={() => {
          scoredRef.current = false;
          setEndRewards(null);
          setBsFlash(null);
          setGame(createInitialState(playerCount, 0, difficulty));
          setSelected(new Set());
          setFly(false);
          setPlayHistory([]);
          forcedPlayKeyRef.current = '';
          lastHistSigRef.current = '';
        }}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG_DARK },
  /** Main column: fixed-height sections; `paddingBottom` clears tab bar + small inset. */
  screen: { flex: 1, paddingBottom: TAB_BAR_RESERVE + 6, backgroundColor: BG_DARK },
  /** Fixed controls strip between the pile area and the hand. Never scrolls, never flexes. */
  controls: { flexShrink: 0, gap: 6 },

  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 60,
    maxHeight: 60,
    marginBottom: 6,
    gap: 8,
  },
  statusBarCenter: { flex: 1, minWidth: 0, justifyContent: 'center' },
  statusYourTurnCol: { gap: 6 },
  statusRowLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: SUCCESS_GREEN },
  statusYourTurnLabel: { color: '#fff', fontSize: 15, fontWeight: '800' },
  claimRankPill: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT_PURPLE,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  claimRankPillText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  aiWaitHeaderRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  aiWaitHeaderText: { color: '#9ca3af', fontSize: 14, fontStyle: 'italic', fontWeight: '600' },
  aiWaitHeaderDots: { color: '#9ca3af', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  statusFallbackCol: { gap: 2 },
  statusNameText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  statusPhaseSmall: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '700' },
  headerRightCluster: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerYellow: { color: TIMER_YELLOW, fontWeight: '900', fontSize: 15 },
  timerYellowUrgent: { color: '#FCA5A5' },
  instructionPulseWrap: { alignSelf: 'stretch', marginBottom: 6 },
  instructionBannerV2: {
    marginHorizontal: 12,
    height: 36,
    maxHeight: 36,
    backgroundColor: BANNER_BG,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  instructionBannerTextV2: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    lineHeight: 14,
  },

  // BS reveal flash overlay — semantic (green = caught lying, red = honest claim)
  bsFlashOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, opacity: 0.42 },
  bsFlashGreen: { backgroundColor: SUCCESS_GREEN },
  bsFlashRed: { backgroundColor: DANGER_RED },

  // Top-of-screen ephemeral toast for AI plays.
  aiToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 60,
    backgroundColor: 'rgba(124,58,237,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  aiToastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  instructionStripe: {
    alignSelf: 'stretch',
  },

  winReminderV2: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 2,
  },

  orderAvatarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    height: 80,
    maxHeight: 80,
    marginBottom: 6,
    paddingVertical: 0,
    gap: 28,
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  orderAvatarCell: { alignItems: 'center', width: 76 },
  orderAvatarCellDim: { opacity: 0.5 },
  avatarRingWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPulseRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: ACCENT_PURPLE,
  },
  orderAvatarInner: { borderRadius: 999, overflow: 'hidden' },
  orderCountBadgeV2: {
    marginTop: 2,
    backgroundColor: SURFACE_1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  orderCountBadgeTextV2: { color: '#fff', fontSize: 10, fontWeight: '800' },
  orderAvatarNameV2: {
    marginTop: 2,
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 76,
  },

  table: { marginTop: 4, marginBottom: 6, minHeight: 0 },
  feltTable: {
    height: 100,
    maxHeight: 100,
    backgroundColor: FELT_BG,
    borderRadius: 16,
    marginHorizontal: 8,
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.28)',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    overflow: 'hidden',
  },
  feltRoundRank: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
    width: '100%',
  },
  centerZone: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pileStack: { alignItems: 'center', gap: 2 },
  pileCardStackVertical: {
    width: 42,
    position: 'relative',
    alignSelf: 'center',
  },
  pileCardLayer: {
    position: 'absolute',
    left: 2,
  },
  pileEmptyV2: {
    width: 52,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: SURFACE_1,
  },
  pileEmptyTextV2: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 4,
  },

  // ─── Recent claims (horizontal chip scroller) ─────────────────────────────
  historyBox: {
    alignSelf: 'stretch',
    marginHorizontal: 12,
    marginBottom: 6,
    maxHeight: 36,
  },
  historyPillsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingRight: 40, alignItems: 'center' },
  historyPillV2: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: SURFACE_1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxWidth: 220,
  },
  historyPillRecent: {
    borderColor: 'rgba(124,58,237,0.65)',
    backgroundColor: 'rgba(124,58,237,0.12)',
  },
  historyPillTextV2: { fontSize: 10, fontWeight: '700' },
  historyTextYou: { color: ACCENT_PURPLE },
  historyTextAi: { color: 'rgba(255,255,255,0.5)' },

  bsBtn: {
    alignSelf: 'stretch',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bsBtnGlowOuter: {
    alignSelf: 'stretch',
    marginHorizontal: 12,
    marginBottom: 0,
    borderRadius: 12,
  },
  bsBtnActive: {
    backgroundColor: DANGER_RED,
    height: 44,
    maxHeight: 44,
    paddingVertical: 0,
    paddingHorizontal: 16,
  },
  bsBtnMutedV2: {
    alignSelf: 'stretch',
    marginHorizontal: 12,
    marginBottom: 0,
    backgroundColor: SURFACE_1,
    height: 44,
    maxHeight: 44,
    paddingVertical: 0,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bsBtnPulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#FCA5A5',
  },
  bsBtnTextActive: { color: '#fff', fontSize: 15, fontWeight: '800' },
  bsBtnTextMutedV2: { color: '#6b7280', fontSize: 14, fontWeight: '800' },

  humanPanelOuter: { overflow: 'hidden', paddingHorizontal: 8, marginBottom: 0 },
  humanPanel: {
    paddingHorizontal: 8,
    paddingBottom: 0,
    gap: 6,
    alignItems: 'center',
  },
  qtyRowOuter: {
    height: 36,
    maxHeight: 36,
    marginVertical: 4,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
    justifyContent: 'center',
  },
  qtyHint: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginRight: 2, fontSize: 11 },
  qtyChipV2: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: CHIP_UNSELECTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyChipV2On: {
    backgroundColor: ACCENT_PURPLE,
    transform: [{ scale: 1.1 }],
  },
  qtyChipOff: { opacity: 0.3 },
  qtyChipTextV2: { color: '#fff', fontWeight: '800', fontSize: 13 },
  qtyChipTextV2On: { color: '#fff' },
  playBtnWrap: {
    alignSelf: 'stretch',
    borderRadius: 12,
    overflow: 'hidden',
  },
  playBtnGradV2: {
    height: 44,
    maxHeight: 44,
    paddingVertical: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnInactiveV2: {
    backgroundColor: SURFACE_2,
    height: 44,
    maxHeight: 44,
    paddingVertical: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnInactiveTextV2: { color: '#9ca3af', fontWeight: '800', fontSize: 14 },
  playBtnTextV2: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },

  handDock: { marginTop: 'auto', alignSelf: 'stretch' },
  handMeta: { paddingHorizontal: 12, paddingBottom: 2, paddingTop: 0, alignItems: 'center' },
  handMetaTextV2: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    fontSize: 10,
    textAlign: 'center',
  },

  handScrollOuter: {
    flexGrow: 0,
    flexShrink: 0,
    height: 90,
    maxHeight: 90,
    marginBottom: 0,
    overflow: 'hidden',
  },
  handRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingRight: 48,
    paddingTop: 2,
    paddingBottom: 2,
  },
  handCardPressable: { zIndex: 1 },
  handCardWrap: { zIndex: 1 },
  handCardLocked: { opacity: 0.35 },
  handCardBody: {
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  handCardBodyOnV2: {
    borderColor: ACCENT_PURPLE,
    shadowColor: ACCENT_PURPLE,
    shadowOpacity: 0.85,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  multiSelectBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  multiSelectBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },

  cardFace: {
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFaceHand: {
    backgroundColor: CARD_WHITE,
  },
  cardCornerTL: { position: 'absolute', top: 4, left: 5, alignItems: 'center' },
  cardCornerTLSm: { top: 4, left: 5 },
  cardCornerBR: {
    position: 'absolute',
    bottom: 4,
    right: 5,
    alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  cardCornerBRSm: { bottom: 4, right: 5 },
  cardCornerRank: { fontSize: 13, fontWeight: '900', lineHeight: 15 },
  /** Hand/reveal card rank label — 15px per spec. */
  cardCornerRankSm: { fontSize: 15, lineHeight: 17 },
  cardCornerSuit: { fontSize: 12, fontWeight: '900', lineHeight: 13 },
  cardCornerSuitSm: { fontSize: 13, lineHeight: 14 },
  cardCenterSuit: { fontSize: 32, fontWeight: '900' },
  /** Hand/reveal card center suit glyph — sized for 68×92 hand cards. */
  cardCenterSuitSm: { fontSize: 30 },
  cardCornerRankHand: { fontSize: 13, lineHeight: 15, fontWeight: '900' },
  cardCornerSuitHand: { fontSize: 13, lineHeight: 14, fontWeight: '900' },
  cardCenterSuitHand: { fontSize: 32, fontWeight: '900' },
  /** Pile/back card — dark navy fill with a purple 1px border and bold "BS" text. */
  cardBackOuter: {
    borderRadius: 10,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: ACCENT_PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** "BS" label on the face-down pile/fly/flip-front card — 12px per spec. */
  bsBackText: {
    color: ACCENT_PURPLE,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 2,
  },
  bsBackTextSm: { fontSize: 12 },

  // ─── Fly/flip animation elements ──────────────────────────────────────────
  flyWrap: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Static centered row used when there are ≤3 revealed cards (fits on any phone). */
  flipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  /** Horizontal-ScrollView content style for ≥4 revealed cards. Same visual rhythm
   *  as `flipRow` but left-aligned so the ScrollView can pan the row into view. */
  flipRowScroll: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
  },
  /** Per-card column: the card itself on top, a small caption ("claimed" or
   *  "actual") underneath, consistent horizontal margin so neighbouring cards
   *  don't touch. */
  flipSlot: {
    alignItems: 'center',
    marginHorizontal: 5,
  },
  flipSlotLabel: {
    marginTop: 6,
    color: ACCENT_PURPLE,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  flipActualCardBorder: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    padding: 2,
  },
  flipSlotLabelActual: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  /** Reference card body for the purple-bordered "claimed" card. Same white face
   *  as a regular CardFace, but a 3px ACCENT_PURPLE border + large centered suit. */
  claimedRefCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: ACCENT_PURPLE,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimedRefCenterSuit: {
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
  },
  claimedRefCardCompact: {
    borderRadius: 6,
    borderWidth: 2,
    padding: 1,
  },
  claimedRefCenterSuitCompact: {
    fontSize: 13,
  },
  flipRevealTitle: {
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  flipRevealTitleLarge: { fontSize: 20, fontWeight: '800' },
  flipRevealTitleCompact: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
    paddingHorizontal: 4,
    lineHeight: 12,
  },
  flipSlotLabelCompact: {
    marginTop: 2,
    color: ACCENT_PURPLE,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  flipSlotLabelActualCompact: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  flipActualCardBorderCompact: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fff',
    padding: 1,
  },
  // ─── Setup / pre-game screen ──────────────────────────────────────────────
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  setupTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  setupBody: { flex: 1, padding: 20, justifyContent: 'center' },
  setupLabel: { color: 'rgba(255,255,255,0.9)', fontWeight: '800', marginBottom: 10 },
  rowGap: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: SURFACE_1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chipOn: { backgroundColor: ACCENT_PURPLE, borderColor: ACCENT_PURPLE },
  chipText: { color: '#fff', fontWeight: '800' },
  chipTextOn: { color: '#fff' },
  startBtnWrap: {
    marginTop: 28,
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
  },
  startBtnGrad: {
    paddingVertical: 14,
    paddingHorizontal: 44,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontWeight: '900', fontSize: 17, letterSpacing: 0.3 },
  rulesHint: {
    marginTop: 24,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
