import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HowToPlayButton } from '@/components/how-to-play-button';
import { ThemedText } from '@/components/themed-text';
import { WinnerModal } from '@/components/winner-modal';
import {
  afterPlayAnimation,
  aiChoosePlay,
  aiShouldCallBs,
  createInitialState,
  enterBsFlip,
  finishBsFlip,
  playCards,
  rankLabel,
  skipBs,
  type BsDifficulty,
  type BsGameState,
  type PlayingCard,
  type Rank,
  type Suit,
} from '@/lib/bs';

const FELT = ['#0d5c2e', '#0a4a26', '#07361c'] as const;
const FELT_RIM = '#042812';
const CARD_BACK = '#1a3d6e';

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
    <View style={[styles.cardFace, styles.cardBackOuter, { width: w, height: h }]}>
      <LinearGradient
        colors={['#2a4a8a', CARD_BACK, '#0f2847']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
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
  const rot = useSharedValue(0);

  const cardKey = cards.map((c) => c.id).join('|');
  useEffect(() => {
    rot.value = 0;
    rot.value = withTiming(180, { duration: 1200 });
  }, [cardKey, claimedRank, rot]);

  const frontStyle = useAnimatedStyle(() => {
    const v = rot.value;
    const show = v < 90;
    return {
      transform: [{ perspective: 800 }, { rotateY: `${v}deg` }],
      opacity: show ? 1 : 0,
      position: 'absolute',
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const v = rot.value;
    const show = v >= 90;
    return {
      transform: [{ perspective: 800 }, { rotateY: `${v - 180}deg` }],
      opacity: show ? 1 : 0,
      position: 'absolute',
    };
  });

  return (
    <View style={{ width, height: height + 8 }}>
      <Text style={styles.flipHint}>Reveal</Text>
      <View style={[styles.flipRow, { minHeight: height }]}>
        {cards.map((c) => (
          <View key={c.id} style={{ width, height, marginHorizontal: 3 }}>
            <Animated.View style={frontStyle}>
              <View style={[styles.cardFace, styles.claimFace, { width, height }]}>
                <Text style={styles.claimFaceText}>{rankLabel(claimedRank)}</Text>
                <Text style={styles.claimFaceSub}>claimed</Text>
              </View>
            </Animated.View>
            <Animated.View style={backStyle}>
              <CardFace card={c} w={width} h={height} small />
            </Animated.View>
          </View>
        ))}
      </View>
    </View>
  );
}

function FlyCard({
  active,
  onDone,
  fromBottom,
}: {
  active: boolean;
  onDone: () => void;
  fromBottom: boolean;
}) {
  const y = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      y.value = 0;
      op.value = 1;
      return;
    }
    y.value = fromBottom ? 120 : -120;
    op.value = 1;
    y.value = withTiming(0, { duration: 520 }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [active, fromBottom, onDone, op, y]);

  const st = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
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
  const [playerCount, setPlayerCount] = useState(2);
  const [difficulty, setDifficulty] = useState<BsDifficulty>('medium');
  const [started, setStarted] = useState(false);
  const [game, setGame] = useState<BsGameState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [playQty, setPlayQty] = useState(1);
  const [fly, setFly] = useState(false);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const scoredRef = useRef(false);
  const playSigRef = useRef(0);
  const flyDoneRef = useRef<() => void>(() => {});

  const startGame = useCallback(() => {
    setStarted(true);
    setGame(createInitialState(playerCount, 0, difficulty));
    setSelected(new Set());
    setPlayQty(1);
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
    if (game.turnIndex === 0) return;
    const t = setTimeout(() => {
      setGame((g) => {
        if (g == null || g.phase !== 'play_select' || g.turnIndex === 0) return g;
        const ids = aiChoosePlay(g, g.turnIndex);
        if (ids.length === 0) return g;
        const res = playCards(g, ids);
        if (!res.ok) return g;
        return res.state;
      });
    }, 700 + Math.random() * 500);
    return () => clearTimeout(t);
  }, [game?.phase, game?.turnIndex, game?.players[game?.turnIndex ?? 0]?.hand.length]);

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
    if (!game || game.phase !== 'bs_flip') return;
    const t = setTimeout(() => {
      setGame((g) => {
        if (!g || g.phase !== 'bs_flip') return g;
        return finishBsFlip(g);
      });
    }, 1600);
    return () => clearTimeout(t);
  }, [game?.phase, game?.bsCallerIndex, game?.lastPlay?.playerId]);

  useEffect(() => {
    if (!game || game.phase !== 'game_over' || game.winnerIndex == null) return;
    if (!scoredRef.current) {
      scoredRef.current = true;
      if (game.winnerIndex === 0) setWins((w) => w + 1);
      else setLosses((l) => l + 1);
    }
  }, [game?.phase, game?.winnerIndex]);

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
  const lastClaim =
    game?.lastPlay != null
      ? `${game.lastPlay.cards.length}× ${rankLabel(game.lastPlay.claimedRank)}`
      : '—';

  const onFlyDone = useCallback(() => {
    flyDoneRef.current();
  }, []);

  if (!started || !game) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={[...FELT]} style={StyleSheet.absoluteFill} />
        <View style={styles.setupHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#e8ffe8" />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.setupTitle}>
            BS — Bullshit
          </ThemedText>
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
          <Pressable style={styles.startBtn} onPress={startGame}>
            <Text style={styles.startBtnText}>Deal</Text>
          </Pressable>
          <Text style={styles.rulesHint}>
            Claim matches the rank in order (A→K). Call BS if you doubt the last play. Wrong caller
            takes the pile.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const turnPlayer = game.players[game.turnIndex];
  const showFlip = game.phase === 'bs_flip' && game.lastPlay && game.bsCallerIndex != null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[...FELT]} style={StyleSheet.absoluteFill} />
      <View style={styles.rim} />

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color="#e8ffe8" />
        </Pressable>
        <View style={styles.turnPill}>
          <Text style={styles.turnPillText}>
            {game.phase === 'game_over'
              ? 'Game over'
              : turnPlayer.isHuman
                ? 'Your turn'
                : `${turnPlayer.name}'s turn`}
          </Text>
        </View>
        <HowToPlayButton gameId="bs" tint="#e8ffe8" />
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
            fromBottom={game.lastPlay?.playerId === 0}
          />
          {showFlip && game.lastPlay ? (
            <FlipReveal
              cards={game.lastPlay.cards}
              claimedRank={game.lastPlay.claimedRank}
              width={52}
              height={76}
            />
          ) : (
            <View style={styles.pileStack}>
              <View style={styles.pileBadge}>
                <Text style={styles.pileBadgeBig}>{centerPile}</Text>
                <Text style={styles.pileBadgeSub}>cards in pile</Text>
              </View>
              <Text style={styles.claimLine}>Last claim: {lastClaim}</Text>
              {centerPile > 0 && <CardBack w={64} h={92} />}
            </View>
          )}
        </View>

        <Pressable
          style={[
            styles.bsBtn,
            (game.phase !== 'bs_window' || !game.lastPlay || game.lastPlay.playerId === 0) &&
              styles.bsBtnDisabled,
          ]}
          disabled={game.phase !== 'bs_window' || !game.lastPlay || game.lastPlay.playerId === 0}
          onPress={handleBs}
        >
          <Text style={styles.bsBtnText}>BS!</Text>
        </Pressable>
      </View>

      {game.phase === 'play_select' && game.turnIndex === 0 && (
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
      )}

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
        subtitle="First to empty their hand wins."
        onPlayAgain={() => {
          scoredRef.current = false;
          setGame(createInitialState(playerCount, 0, difficulty));
          setSelected(new Set());
          setFly(false);
        }}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  turnPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  turnPillText: { color: '#f4fff4', fontWeight: '800', fontSize: 14 },
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
  countBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12, textAlign: 'center' },
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
  claimLine: { color: '#dcfce7', fontSize: 16, fontWeight: '800' },
  bsBtn: {
    alignSelf: 'center',
    marginBottom: 12,
    backgroundColor: '#b91c1c',
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  bsBtnDisabled: { opacity: 0.38 },
  bsBtnText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
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
  cardBackOuter: { borderColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center' },
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
  startBtn: {
    marginTop: 28,
    alignSelf: 'center',
    backgroundColor: '#facc15',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
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
