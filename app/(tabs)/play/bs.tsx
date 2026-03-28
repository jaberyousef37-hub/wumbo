import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
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

function rankPluralWord(count: number, rank: Rank): string {
  const label = rankLabel(rank);
  if (count <= 1) return label;
  if (label === 'A') return 'Aces';
  if (label === 'K') return 'Kings';
  if (label === 'Q') return 'Queens';
  if (label === 'J') return 'Jacks';
  return `${label}s`;
}

function formatLastPlayLine(players: BsGameState['players'], lp: LastPlay): string {
  const name = players[lp.playerId]?.name ?? 'Player';
  const rw = rankPluralWord(lp.cards.length, lp.claimedRank);
  return `${name} played ${lp.cards.length} ${rw}`;
}

function formatClaimLine(players: BsGameState['players'], lp: LastPlay): string {
  const name = players[lp.playerId]?.name ?? 'Player';
  const rw = rankPluralWord(lp.cards.length, lp.claimedRank);
  return `${name} claimed ${lp.cards.length} ${rw}`;
}

function playerInitials(p: BsPlayer): string {
  return p.name.slice(0, 2).toUpperCase();
}

const FLIP_STAGGER_MS = 520;
const FLIP_ONE_MS = 920;

const FELT = ['#0d5c2e', '#0a4a26', '#07361c'] as const;
const FELT_RIM = '#042812';
const TURN_LIMIT_SEC = 10;

function suitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#E53935' : '#1a1a1a';
}

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

function CardFace({
  card,
  w,
  h,
  small,
}: {
  card: PlayingCard;
  w: number;
  h: number;
  small?: boolean;
}) {
  const col = suitColor(card.suit);
  return (
    <View style={[styles.cardFace, { width: w, height: h }]}>
      <Text style={[styles.cardCorner, small && styles.cardCornerSm, { color: col }]}>
        {rankLabel(card.rank)}
        {'\n'}
        {suitSymbol(card.suit)}
      </Text>
      <Text style={[styles.cardCenterSuit, { color: col }, small && styles.cardCenterSuitSm]}>
        {suitSymbol(card.suit)}
      </Text>
    </View>
  );
}

function CardBack({ w, h, small }: { w: number; h: number; small?: boolean }) {
  return (
    <View style={[styles.cardFace, styles.cardBackOuter, styles.cardBackFill, { width: w, height: h }]}>
      <Text style={[styles.bsBackText, small && styles.bsBackTextSm]}>BS</Text>
    </View>
  );
}

function OpponentSeat({
  player,
  isTurn,
  totalPlayers,
  seatIndex,
}: {
  player: BsGameState['players'][0];
  isTurn: boolean;
  totalPlayers: number;
  seatIndex: number;
}) {
  const n = player.hand.length;
  const w = 44;
  const h = 64;
  const spread = Math.min(5, 40 / Math.max(n, 1));
  const overlap = n <= 1 ? 0 : -16;

  let boxStyle: ViewStyle = styles.seatTop;
  if (totalPlayers === 2 && seatIndex === 1) boxStyle = styles.seatTopCenter;
  if (totalPlayers === 3) {
    if (seatIndex === 1) boxStyle = styles.seatTopLeft;
    if (seatIndex === 2) boxStyle = styles.seatTopRight;
  }
  if (totalPlayers === 4) {
    if (seatIndex === 1) boxStyle = styles.seatMidLeft;
    if (seatIndex === 2) boxStyle = styles.seatTopCenter;
    if (seatIndex === 3) boxStyle = styles.seatMidRight;
  }

  return (
    <View style={[styles.seat, boxStyle]}>
      <View style={[styles.namePill, isTurn && styles.namePillActive]}>
        <Text style={styles.namePillText} numberOfLines={1}>
          {player.name}
        </Text>
      </View>
      <View style={styles.countBadge}>
        <Text style={styles.countBadgeText}>{n}</Text>
      </View>
      <View style={styles.opponentArc}>
        {Array.from({ length: Math.min(n, 12) }).map((_, i) => {
          const rot = (i - (Math.min(n, 12) - 1) / 2) * spread;
          return (
            <View
              key={`${player.id}-c-${i}`}
              style={[
                styles.oppCardSlot,
                { marginLeft: i === 0 ? 0 : overlap, transform: [{ rotate: `${rot}deg` }] },
              ]}
            >
              <CardBack w={w} h={h} small />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FlipRevealCard({
  card,
  claimedRank,
  width,
  height,
  index,
}: {
  card: PlayingCard;
  claimedRank: Rank;
  width: number;
  height: number;
  index: number;
}) {
  const rot = useSharedValue(0);
  const cardKey = `${card.id}|${claimedRank}`;

  useEffect(() => {
    cancelAnimation(rot);
    rot.value = 0;
    rot.value = withDelay(
      index * FLIP_STAGGER_MS,
      withTiming(180, { duration: FLIP_ONE_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [cardKey, index, rot]);

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
    <View style={{ width, height, marginHorizontal: 4 }}>
      <Animated.View style={frontStyle}>
        <View style={[styles.cardFace, styles.claimFace, { width, height }]}>
          <Text style={styles.claimFaceText}>{rankLabel(claimedRank)}</Text>
          <Text style={styles.claimFaceSub}>claimed</Text>
        </View>
      </Animated.View>
      <Animated.View style={backStyle}>
        <CardFace card={card} w={width} h={height} small />
      </Animated.View>
    </View>
  );
}

function FlipReveal({
  cards,
  claimedRank,
  width,
  height,
}: {
  cards: PlayingCard[];
  claimedRank: Rank;
  width: number;
  height: number;
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.flipHint}>Calling BS — revealing</Text>
      <View style={[styles.flipRow, { minHeight: height }]}>
        {cards.map((c, i) => (
          <FlipRevealCard
            key={c.id}
            card={c}
            claimedRank={claimedRank}
            width={width}
            height={height}
            index={i}
          />
        ))}
      </View>
    </View>
  );
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
      <CardBack w={56} h={80} />
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
  const scoredRef = useRef(false);
  const playSigRef = useRef(0);
  const flyDoneRef = useRef<() => void>(() => {});
  const playHistPhaseRef = useRef<BsPhase | null>(null);
  const lastHistSigRef = useRef('');
  const forcedPlayKeyRef = useRef('');

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
    }
  }, [game?.phase, game?.lastPlay]);

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
        setTimeout(() => setBsFlash(null), 560);
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
  const bsBtnHint = canCallBs
    ? 'Challenge last play'
    : yourTurnPlaySelect
      ? 'Your turn — play cards first'
      : game?.phase === 'play_select'
        ? 'Only after an opponent plays'
        : game?.phase === 'anim_play'
          ? 'Resolving play…'
          : game?.phase === 'bs_flip'
            ? 'Reveal in progress…'
            : 'Wait for the next play';

  const phaseBump = useSharedValue(1);
  const prevPhaseRef = useRef<BsPhase>('play_select');
  useEffect(() => {
    if (!game) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = game.phase;
    if (prev === 'bs_flip' && game.phase === 'play_select') {
      phaseBump.value = withSequence(withTiming(1.08, { duration: 100 }), withTiming(1, { duration: 240 }));
    }
  }, [game, phaseBump]);

  const turnPillAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: phaseBump.value }],
  }));

  const glowPulse = useSharedValue(1);
  useEffect(() => {
    if (!game || game.phase === 'game_over') {
      cancelAnimation(glowPulse);
      glowPulse.value = 1;
      return;
    }
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 750, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(glowPulse);
  }, [game, game?.phase, game?.turnIndex, glowPulse]);

  const glowDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowPulse.value }],
    opacity: 0.82 + (glowPulse.value - 1) * 1.2,
  }));

  const panelSlide = useSharedValue(160);
  useEffect(() => {
    panelSlide.value = withSpring(yourTurnPlaySelect ? 0 : 168, { damping: 18, stiffness: 220 });
  }, [yourTurnPlaySelect, panelSlide]);

  const humanPanelAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panelSlide.value }],
    opacity: 1 - Math.min(1, panelSlide.value / 130),
  }));

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
        <LinearGradient colors={[...FELT]} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={styles.setupHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#e8ffe8" />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.setupTitle}>
            BS — Bullshit
          </ThemedText>
          <InGameChat selfName="You" opponentName="Table" opponentIsAi />
          <HowToPlayButton gameId="bs" tint="#e8ffe8" />
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
            <LinearGradient colors={['#FDE047', '#EAB308']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.startBtnGrad}>
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
      <LinearGradient colors={[...FELT]} style={StyleSheet.absoluteFill} />
      <View style={styles.rim} />

      {bsFlash ? (
        <View
          pointerEvents="none"
          style={[styles.bsFlashOverlay, bsFlash === 'green' ? styles.bsFlashGreen : styles.bsFlashRed]}
        />
      ) : null}

      <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color="#e8ffe8" />
        </Pressable>
        <Animated.View style={[styles.turnHeroInner, styles.turnHeroTopBar, turnPillAnimStyle]}>
          <View style={styles.turnHeroTitleRow}>
            <Text style={styles.turnHeroName} numberOfLines={1}>
              {game.phase === 'game_over' ? 'Game over' : turnPlayer.name}
            </Text>
            {game.phase !== 'game_over' ? (
              <Animated.View style={[styles.turnLiveDot, styles.turnLiveDotGlow, glowDotStyle]} />
            ) : null}
          </View>
          <View style={styles.turnHeroTagRow}>
            {turnTag ? (
              <View style={styles.turnTagPill}>
                <Text style={styles.turnTagPillText}>{turnTag}</Text>
              </View>
            ) : null}
            {game.phase === 'play_select' ? (
              <Text style={styles.turnHeroSubInline}>Claim {rankLabel(game.requiredRank)}</Text>
            ) : null}
          </View>
        </Animated.View>
        <View style={styles.topBarRight}>
          {showTurnTimer ? (
            <View style={[styles.timerBadge, turnSecondsLeft <= 3 && styles.timerBadgeUrgent]}>
              <Text style={styles.timerBadgeText}>{turnSecondsLeft}s</Text>
            </View>
          ) : null}
          <InGameChat selfName="You" opponentName="Table" opponentIsAi />
          <HowToPlayButton gameId="bs" tint="#e8ffe8" />
        </View>
      </View>

      <View style={styles.orderAvatarsRow}>
        {game.players.map((p, i) => (
          <View key={p.id} style={styles.orderAvatarCell}>
            <View style={[styles.orderAvatarRing, game.turnIndex === i && styles.orderAvatarRingOn]}>
              <Avatar initials={playerInitials(p)} size="small" />
            </View>
            <View style={styles.orderCountBadge}>
              <Text style={styles.orderCountBadgeText}>{p.hand.length}</Text>
            </View>
            <Text style={styles.orderAvatarName} numberOfLines={1}>
              {p.name}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.table}>
        {game.players.slice(1).map((p) => (
          <OpponentSeat
            key={p.id}
            player={p}
            isTurn={game.turnIndex === p.id}
            totalPlayers={game.players.length}
            seatIndex={p.id}
          />
        ))}

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
              width={54}
              height={78}
            />
          ) : game.lastPlay != null && game.phase !== 'game_over' ? (
            <View style={styles.claimCenter}>
              <CardBack w={72} h={104} />
              <Text style={styles.claimCenterText} numberOfLines={2}>
                {formatClaimLine(game.players, game.lastPlay)}
              </Text>
            </View>
          ) : (
            <View style={styles.pileStack}>
              <View style={styles.pileBadge}>
                <Text style={styles.pileBadgeBig}>{centerPile}</Text>
                <Text style={styles.pileBadgeSub}>cards in pile</Text>
              </View>
              {centerPile > 0 && <CardBack w={64} h={92} />}
            </View>
          )}
        </View>

        {playHistory.length > 0 && (
          <View style={styles.historyBox}>
            <Text style={styles.historyTitle}>Recent claims</Text>
            <View style={styles.historyPillsRow}>
              {[...playHistory].reverse().map((lp, i) => (
                <View
                  key={`${lp.playerId}-${lp.cards.map((c) => c.id).join('-')}-${i}`}
                  style={styles.historyPill}
                >
                  <Text style={styles.historyPillText} numberOfLines={1}>
                    {formatLastPlayLine(game.players, lp)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Pressable
          style={[styles.bsBtn, !canCallBs && styles.bsBtnMuted]}
          disabled={!canCallBs}
          onPress={handleBs}
        >
          <Text style={styles.bsBtnText}>Call BS! 🚨</Text>
          <Text style={styles.bsBtnHint}>{bsBtnHint}</Text>
        </Pressable>
      </View>

      {game.phase === 'play_select' && (
        <Animated.View style={[styles.humanPanelOuter, humanPanelAnimStyle]}>
          {game.turnIndex === 0 ? (
            <View style={styles.humanPanel}>
              <Text style={styles.panelLabel}>
                Play {playQty} card{playQty > 1 ? 's' : ''} as {rankLabel(game.requiredRank)}
              </Text>
              <View style={styles.qtyRow}>
                <Text style={styles.qtyHint}>How many</Text>
                {[1, 2, 3, 4].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => {
                      setPlayQty(n);
                      setSelected(new Set());
                    }}
                    style={[styles.qtyChip, playQty === n && styles.qtyChipOn, n > maxPick && styles.qtyChipOff]}
                    disabled={n > maxPick}
                  >
                    <Text style={[styles.qtyChipText, playQty === n && styles.qtyChipTextOn]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={[
                  styles.playBtn,
                  selected.size !== playQty && styles.playBtnDisabled,
                ]}
                disabled={selected.size !== playQty}
                onPress={handleHumanPlay}
              >
                <Text style={styles.playBtnText}>Play to pile</Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      )}

      <View style={styles.handMeta}>
        <Text style={styles.handMetaText}>
          Your hand · {human?.hand.length ?? 0} cards
        </Text>
      </View>

      <View style={styles.handRow}>
        {human?.hand.map((c, index) => {
          const on = selected.has(c.id);
          const w = 58;
          const h = 84;
          const total = human.hand.length;
          const mid = (total - 1) / 2;
          const rot = (index - mid) * 3;
          const overlap = index === 0 ? 0 : -26;
          return (
            <Pressable
              key={c.id}
              onPress={() => toggleCard(c.id)}
              disabled={game.phase !== 'play_select' || game.turnIndex !== 0}
              style={({ pressed }) => [
                styles.handCardWrap,
                {
                  marginLeft: overlap,
                  transform: [
                    { rotate: `${rot}deg` },
                    { translateY: pressed || on ? -10 : 0 },
                  ],
                },
              ]}
            >
              <View style={[styles.handRing, on && styles.handRingOn]}>
                <CardFace card={c} w={w} h={h} small />
              </View>
            </Pressable>
          );
        })}
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
  safe: { flex: 1, backgroundColor: FELT[0] },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 10,
    borderColor: FELT_RIM,
    pointerEvents: 'none',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingBottom: 6,
    gap: 6,
  },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  turnHeroTopBar: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 4,
  },
  turnHeroInner: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.4)',
  },
  turnHeroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  turnHeroTagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  turnTagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(168,85,247,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.65)',
  },
  turnTagPillText: { color: '#F5F3FF', fontWeight: '900', fontSize: 11, letterSpacing: 0.8 },
  turnHeroSubInline: { color: 'rgba(220,252,231,0.95)', fontWeight: '700', fontSize: 12 },
  turnLiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
  },
  turnLiveDotGlow: {
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
    elevation: 6,
  },
  turnHeroName: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: -0.3, flex: 1 },
  turnHeroSub: { color: 'rgba(220,252,231,0.9)', fontWeight: '700', fontSize: 13, marginTop: 4 },
  bsFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    opacity: 0.42,
  },
  bsFlashGreen: { backgroundColor: '#22C55E' },
  bsFlashRed: { backgroundColor: '#EF4444' },
  timerBadge: {
    minWidth: 52,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(250,204,21,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.55)',
    alignItems: 'center',
  },
  timerBadgeUrgent: { backgroundColor: 'rgba(220,38,38,0.35)', borderColor: '#FCA5A5' },
  timerBadgeText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  orderAvatarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 10,
    flexWrap: 'wrap',
  },
  orderAvatarCell: { alignItems: 'center', width: 76 },
  orderAvatarRing: {
    borderRadius: 999,
    padding: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  orderAvatarRingOn: {
    borderColor: '#a855f7',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 8,
    elevation: 4,
  },
  orderCountBadge: {
    marginTop: 4,
    backgroundColor: '#15803d',
    borderRadius: 999,
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: '#fff',
  },
  orderCountBadgeText: { color: '#fff', fontWeight: '900', fontSize: 13, textAlign: 'center' },
  orderAvatarName: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 72,
  },
  claimCenter: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 8 },
  claimCenterText: {
    color: '#F0FDF4',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 24,
  },
  historyBox: {
    alignSelf: 'stretch',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  historyTitle: { color: 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: 10, letterSpacing: 0.8 },
  historyPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  historyPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    maxWidth: '100%',
  },
  historyPillText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700' },
  table: { flex: 1, paddingHorizontal: 6 },
  seat: { position: 'absolute', alignItems: 'center', zIndex: 2 },
  seatTop: { top: 4, alignSelf: 'center' },
  seatTopCenter: { top: 4, left: 0, right: 0, alignItems: 'center' },
  seatTopLeft: { top: 8, left: 4 },
  seatTopRight: { top: 8, right: 4 },
  seatMidLeft: { left: 4, top: '32%' },
  seatMidRight: { right: 4, top: '32%' },
  namePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    maxWidth: 120,
    marginBottom: 4,
  },
  namePillActive: { backgroundColor: 'rgba(250, 204, 21, 0.35)', borderWidth: 1, borderColor: '#facc15' },
  namePillText: { color: '#ecfdf5', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#15803d',
    borderRadius: 999,
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  countBadgeText: { color: '#fff', fontWeight: '900', fontSize: 13, textAlign: 'center' },
  opponentArc: { flexDirection: 'row', alignItems: 'flex-end' },
  oppCardSlot: {},
  centerZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  pileStack: { alignItems: 'center', gap: 8 },
  pileBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pileBadgeBig: { color: '#fff', fontSize: 36, fontWeight: '900' },
  pileBadgeSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  handMeta: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    alignItems: 'center',
  },
  handMetaText: { color: '#dcfce7', fontWeight: '800', fontSize: 13 },
  bsBtn: {
    alignSelf: 'stretch',
    marginHorizontal: 8,
    marginBottom: 10,
    backgroundColor: '#b91c1c',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: '#fecaca',
    alignItems: 'center',
    gap: 6,
    minHeight: 72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  bsBtnMuted: { opacity: 0.5, borderColor: 'rgba(254,202,202,0.45)' },
  bsBtnText: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  bsBtnHint: { color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '700' },
  humanPanelOuter: {
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  humanPanel: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    alignItems: 'center',
  },
  panelLabel: { color: '#ecfccb', fontWeight: '800', fontSize: 15 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  qtyHint: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginRight: 4 },
  qtyChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  qtyChipOn: { backgroundColor: '#15803d', borderColor: '#bbf7d0' },
  qtyChipOff: { opacity: 0.35 },
  qtyChipText: { color: '#fff', fontWeight: '800' },
  qtyChipTextOn: { color: '#fff' },
  playBtn: {
    backgroundColor: '#facc15',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  playBtnDisabled: { opacity: 0.4 },
  playBtnText: { color: '#422006', fontWeight: '900', fontSize: 16 },
  handRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: 14,
    minHeight: 120,
    paddingHorizontal: 8,
  },
  handCardWrap: { zIndex: 1 },
  handRing: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  handRingOn: { borderColor: '#facc15', shadowColor: '#facc15', shadowOpacity: 0.6, shadowRadius: 8 },
  cardFace: {
    borderRadius: 10,
    backgroundColor: '#fffef8',
    borderWidth: 2,
    borderColor: '#d4d4d4',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCorner: {
    position: 'absolute',
    top: 6,
    left: 6,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  cardCornerSm: { fontSize: 11, top: 4, left: 4 },
  cardCenterSuit: { fontSize: 36, fontWeight: '900' },
  cardCenterSuitSm: { fontSize: 28 },
  cardBackOuter: { borderColor: '#3f3f46', justifyContent: 'center', alignItems: 'center' },
  cardBackFill: { backgroundColor: '#2a2a2a' },
  bsBackText: { color: 'rgba(255,255,255,0.92)', fontWeight: '900', fontSize: 22, letterSpacing: 2 },
  bsBackTextSm: { fontSize: 16 },
  flyWrap: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  flipHint: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  claimFace: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimFaceText: { fontSize: 28, fontWeight: '900', color: '#92400e' },
  claimFaceSub: { fontSize: 11, fontWeight: '700', color: '#b45309', marginTop: 2 },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  setupTitle: { color: '#ecfdf5', fontSize: 18, fontWeight: '800' },
  setupBody: { flex: 1, padding: 20, justifyContent: 'center' },
  setupLabel: { color: 'rgba(255,255,255,0.9)', fontWeight: '800', marginBottom: 10 },
  rowGap: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipOn: { backgroundColor: '#15803d', borderColor: '#86efac' },
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
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  startBtnText: { color: '#422006', fontWeight: '900', fontSize: 17 },
  rulesHint: {
    marginTop: 24,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
