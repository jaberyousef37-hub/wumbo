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
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HowToPlayButton } from '@/components/how-to-play-button';
import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
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
  runAiTurn,
  topCard,
  UNO_NAMES,
  type UnoCard,
  type UnoDifficulty,
  type UnoGameState,
  type UnoSeat,
  type UnoSuit,
} from '@/lib/uno';

const FELT = '#0f4d35';
const FELT_RIM = '#063822';

const SUIT_HEX: Record<UnoSuit, string> = {
  red: '#E53935',
  blue: '#1E88E5',
  green: '#2ECC71',
  yellow: '#FFD54F',
};

const CARD_BACK = '#0d3d28';

function cardLabel(card: UnoCard): string {
  switch (card.type) {
    case 'number':
      return String(card.value ?? '');
    case 'skip':
      return '⊘';
    case 'reverse':
      return '⇄';
    case 'draw2':
      return '+2';
    case 'wild':
      return 'W';
    case 'wild_draw4':
      return '+4';
    default:
      return '?';
  }
}

function discardGlowColor(card: UnoCard | undefined, activeColor: UnoSuit): string {
  if (!card) return SUIT_HEX[activeColor];
  if (card.type === 'wild' || card.type === 'wild_draw4') {
    return SUIT_HEX[activeColor];
  }
  if (card.color) return SUIT_HEX[card.color];
  return SUIT_HEX[activeColor];
}

function CardFace({
  card,
  w,
  h,
  small,
}: {
  card: UnoCard;
  w: number;
  h: number;
  small?: boolean;
}) {
  const isWild = card.type === 'wild' || card.type === 'wild_draw4';
  const bg = isWild ? '#111' : card.color ? SUIT_HEX[card.color] : '#333';
  const ovalBg = isWild ? '#222' : '#fff';

  return (
    <View style={[styles.cardFace, { width: w, height: h, backgroundColor: bg }]}>
      {isWild && (
        <View style={styles.wildStripeRow}>
          {(['red', 'yellow', 'green', 'blue'] as const).map((c) => (
            <View key={c} style={[styles.wildStripe, { backgroundColor: SUIT_HEX[c] }]} />
          ))}
        </View>
      )}
      <View style={[styles.cardOval, { backgroundColor: ovalBg }, small && styles.cardOvalSm]}>
        <Text style={[styles.cardValue, small && styles.cardValueSm, isWild && styles.cardValueWild]}>
          {cardLabel(card)}
        </Text>
      </View>
    </View>
  );
}

function CardBackFace({ w, h, small }: { w: number; h: number; small?: boolean }) {
  return (
    <View style={[styles.cardFace, styles.cardBackOuter, { width: w, height: h }]}>
      <View style={[StyleSheet.absoluteFill, styles.cardBackInner]} />
      <Text style={[styles.unoBackText, small && styles.unoBackTextSm]}>UNO</Text>
    </View>
  );
}

function OpponentZone({
  name,
  count,
  isTurn,
  align,
}: {
  name: string;
  count: number;
  isTurn: boolean;
  align: 'center' | 'flex-start';
}) {
  const n = count;
  const spread = Math.min(5.5, 48 / Math.max(n, 1));
  const overlap = n <= 1 ? 0 : -16;
  return (
    <View style={[styles.oppZone, align === 'flex-start' ? styles.oppLeft : styles.oppTop]}>
      <View style={[styles.oppNamePill, isTurn && styles.oppNamePillOn]}>
        <Text style={styles.oppNameText} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.oppCountBadge}>
          <Text style={styles.oppCountText}>{count}</Text>
        </View>
      </View>
      <View style={[styles.opponentArc, align === 'center' && { justifyContent: 'center' }]}>
        {Array.from({ length: Math.min(n, 14) }).map((_, i) => {
          const rot = (i - (Math.min(n, 14) - 1) / 2) * spread;
          return (
            <View
              key={`${name}-${i}`}
              style={[
                styles.oppCardSlot,
                { marginLeft: i === 0 ? 0 : overlap, transform: [{ rotate: `${rot}deg` }] },
              ]}
            >
              <CardBackFace w={44} h={64} small />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function HandCard({
  card,
  playable,
  dimmed,
  disabled,
  onPress,
  index,
  total,
}: {
  card: UnoCard;
  playable: boolean;
  dimmed: boolean;
  disabled: boolean;
  onPress: () => void;
  index: number;
  total: number;
}) {
  const w = 60;
  const h = 88;
  const mid = (total - 1) / 2;
  const rot = (index - mid) * 3.5;
  const overlap = index === 0 ? 0 : -20;

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <Animated.View
          entering={FadeIn.duration(220)}
          style={[
            styles.handCardWrap,
            {
              marginLeft: overlap,
              opacity: dimmed ? 0.5 : 1,
              transform: [
                { rotate: `${rot}deg` },
                { translateY: pressed && playable ? -12 : playable ? -3 : 0 },
              ],
            },
          ]}
        >
          <View
            style={[
              playable && styles.playableRing,
              { shadowColor: playable ? AppColors.yellow : 'transparent' },
            ]}
          >
            <CardFace card={card} w={w} h={h} />
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

export default function UnoScreen() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<UnoDifficulty>('medium');
  const [game, setGame] = useState<UnoGameState>(() => createInitialGame('medium'));
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [turnBanner, setTurnBanner] = useState<string | null>(null);
  const [discardAnim, setDiscardAnim] = useState<'up' | 'down'>('down');
  const [unoPop, setUnoPop] = useState(false);
  const scoredRef = useRef(false);
  const recordedRecentRef = useRef(false);
  const prevTopId = useRef<string | undefined>(undefined);
  const prevTurn = useRef<UnoSeat>(game.currentTurn);
  const skipFirstDiscardAnim = useRef(true);
  const prevPlayerCount = useRef(game.hands[0].length);
  const drawPulse = useSharedValue(1);

  const top = useMemo(() => topCard(game), [game]);
  const playable = useMemo(() => {
    if (!top || game.winner || game.wildPicker != null || game.currentTurn !== 0) return [];
    return getPlayableCards(game.hands[0], top, game.activeColor, game.drawStack);
  }, [game, top]);

  const approxDeckLeft = useMemo(
    () => game.deck.length + Math.max(0, game.discard.length - 1),
    [game.deck.length, game.discard.length],
  );

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
      const nowTurn = game.currentTurn;
      let from: UnoSeat = 0;
      if (lastTurn !== nowTurn) {
        from = lastTurn;
      } else {
        from = nowTurn;
      }
      setDiscardAnim(from === 0 ? 'up' : 'down');
      prevTopId.current = topId;
    }
    prevTurn.current = game.currentTurn;
  }, [topId, game.currentTurn, top]);

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

  useEffect(() => {
    if (game.winner != null || game.wildPicker === 0) {
      setTurnBanner(null);
      return;
    }
    const label = UNO_NAMES[game.currentTurn];
    setTurnBanner(`${label}'s turn`);
    const t = setTimeout(() => setTurnBanner(null), 900);
    return () => clearTimeout(t);
  }, [game.currentTurn, game.winner, game.wildPicker]);

  useEffect(() => {
    if (game.winner != null || (game.currentTurn !== 1 && game.currentTurn !== 2) || game.wildPicker === 0) {
      return;
    }
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
  ]);

  useEffect(() => {
    if (game.winner != null) {
      if (!scoredRef.current) {
        scoredRef.current = true;
        if (game.winner === 0) setWins((w) => w + 1);
        else setLosses((l) => l + 1);
      }
      if (!recordedRecentRef.current) {
        recordedRecentRef.current = true;
        void recordRecentGame({
          gameName: 'UNO',
          result: game.winner === 0 ? 'win' : 'loss',
          score: game.winner === 0 ? '1st place' : `${UNO_NAMES[game.winner]} won`,
        });
      }
    } else {
      scoredRef.current = false;
      recordedRecentRef.current = false;
    }
  }, [game.winner]);

  const setDifficultyAndGame = useCallback((d: UnoDifficulty) => {
    setDifficulty(d);
    setGame((g) => ({ ...g, aiDifficulty: d }));
  }, []);

  const handlePlay = useCallback(
    (card: UnoCard) => {
      if (game.wildPicker != null || game.currentTurn !== 0 || game.winner != null) return;
      const t = topCard(game);
      if (!t) return;
      if (!isCardPlayable(card, game.hands[0], t, game.activeColor, game.drawStack)) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playSwoosh();
      setGame((g) => {
        const next = playCard(g, card.id, 0);
        return next ?? g;
      });
    },
    [game],
  );

  const handleDraw = useCallback(() => {
    if (game.wildPicker != null || game.currentTurn !== 0 || game.winner != null) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGame((g) => {
      const next = playerDrawOne(g);
      return next ?? g;
    });
  }, [game.wildPicker, game.currentTurn, game.winner, game]);

  const handleUno = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGame((g) => acknowledgePlayerUno(g) ?? g);
  }, []);

  const pickWildColor = useCallback((c: UnoSuit) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGame((g) => {
      const next = completePendingWild(g, c);
      return next ?? g;
    });
  }, []);

  const playAgain = useCallback(() => {
    scoredRef.current = false;
    recordedRecentRef.current = false;
    skipFirstDiscardAnim.current = true;
    setGame(createInitialGame(difficulty));
  }, [difficulty]);

  const glow = discardGlowColor(top, game.activeColor);
  const pendingWd4 = top?.type === 'wild_draw4';
  const drawDisabled = game.drawStack === 0 && playable.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.felt}>
        <LinearGradient
          colors={[AppColors.tint, AppColors.accent, AppColors.yellow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle} darkColor="#fff">
            UNO
          </ThemedText>
          <HowToPlayButton gameId="uno" tint="#fff" />
        </LinearGradient>

        <View style={styles.diffRow}>
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <Pressable
              key={d}
              onPress={() => setDifficultyAndGame(d)}
              style={[styles.diffChip, difficulty === d && styles.diffChipOn]}
            >
              <Text style={[styles.diffChipText, difficulty === d && styles.diffChipTextOn]}>
                {d[0].toUpperCase() + d.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.colorRow}>
          <Text style={styles.colorRowLabel}>Color</Text>
          {(['red', 'blue', 'green', 'yellow'] as const).map((c) => (
            <View
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: SUIT_HEX[c] },
                game.activeColor === c && styles.colorDotActive,
              ]}
            />
          ))}
        </View>

        {game.drawStack > 0 && (
          <View style={styles.stackBanner}>
            <Text style={styles.stackBannerText}>
              +2 chain: {game.drawStack} cards — play another +2 or take them
            </Text>
          </View>
        )}

        <View style={styles.turnRow}>
          <View
            style={[
              styles.turnPill,
              { backgroundColor: game.currentTurn === 0 ? '#22C55E' : 'rgba(255,255,255,0.2)' },
            ]}
          >
            <Text style={styles.turnPillText}>
              {game.wildPicker === 0
                ? pendingWd4
                  ? 'Pick color · next draws 4'
                  : 'Pick a color'
                : `${UNO_NAMES[game.currentTurn]}'s turn`}
            </Text>
          </View>
        </View>

        {turnBanner && game.winner == null && (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(200)} style={styles.turnFlash}>
            <Text style={styles.turnFlashText}>{turnBanner}</Text>
          </Animated.View>
        )}

        <View style={styles.table}>
          <OpponentZone
            name={UNO_NAMES[2]}
            count={game.hands[2].length}
            isTurn={game.currentTurn === 2}
            align="center"
          />

          <View style={styles.midRow}>
            <OpponentZone
              name={UNO_NAMES[1]}
              count={game.hands[1].length}
              isTurn={game.currentTurn === 1}
              align="flex-start"
            />
            <View style={styles.centerPiles}>
              <View style={styles.pileCol}>
                <CardBackFace w={52} h={76} />
                <View style={styles.deckCount}>
                  <Text style={styles.deckCountText}>{approxDeckLeft}</Text>
                </View>
                <Text style={styles.pileLabel}>Draw (~left)</Text>
              </View>
              <View style={styles.pileCol}>
                <Animated.View
                  style={[
                    styles.discardGlow,
                    {
                      shadowColor: glow,
                      shadowOpacity: 0.85,
                      shadowRadius: 22,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 18,
                    },
                    discardAnimatedStyle,
                  ]}
                >
                  {top ? (
                    <Animated.View
                      key={top.id}
                      entering={
                        discardAnim === 'up'
                          ? SlideInUp.duration(320).springify().damping(16).stiffness(200)
                          : SlideInDown.duration(320).springify().damping(16).stiffness(200)
                      }
                    >
                      <CardFace card={top} w={80} h={114} />
                    </Animated.View>
                  ) : null}
                </Animated.View>
                <Text style={styles.pileLabel}>Discard</Text>
              </View>
            </View>
            <View style={styles.midSpacer} />
          </View>

          <Animated.View style={[styles.playerBlock, handPulseStyle]}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeLabel}>{UNO_NAMES[0]}</Text>
              <Text style={styles.countBadgeText}>{game.hands[0].length}</Text>
            </View>

            {unoPop && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.unoPop}>
                <Text style={styles.unoPopText}>UNO!</Text>
              </Animated.View>
            )}

            {game.hands[0].length === 1 && game.winner == null && game.wildPicker !== 0 && (
              <Pressable onPress={handleUno} style={styles.unoBtn}>
                <Text style={styles.unoBtnText}>UNO!</Text>
              </Pressable>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.handScroll}
            >
              {game.hands[0].map((card, index) => {
                const isPlay = playable.some((c) => c.id === card.id);
                const hasAnyPlay = playable.length > 0;
                const dimmed = hasAnyPlay && !isPlay;
                const mustBlock =
                  game.currentTurn !== 0 ||
                  game.winner != null ||
                  game.wildPicker != null ||
                  (isPlay === false && hasAnyPlay);
                const disabled = mustBlock || !isPlay;
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

            {game.currentTurn === 0 && game.winner == null && game.wildPicker == null && (
              <Pressable
                onPress={handleDraw}
                style={[styles.drawBtn, drawDisabled && styles.drawBtnDisabled]}
                disabled={drawDisabled}
              >
                <MaterialIcons
                  name="style"
                  size={22}
                  color={drawDisabled ? 'rgba(255,255,255,0.35)' : '#0d0d0d'}
                />
                <Text style={[styles.drawBtnText, drawDisabled && styles.drawBtnTextDisabled]}>
                  {game.drawStack > 0 ? `Take +${game.drawStack}` : 'Draw'}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      </View>

      <Modal visible={game.wildPicker === 0} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pendingWd4 ? 'Choose color — next player draws 4' : 'Choose color'}
            </Text>
            <View style={styles.colorGrid}>
              {(['red', 'blue', 'green', 'yellow'] as const).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => pickWildColor(c)}
                  style={[styles.colorChoice, { backgroundColor: SUIT_HEX[c] }]}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {game.winner != null && (
        <View style={styles.endOverlay}>
          <View style={styles.endCard}>
            <Text style={styles.endEmoji}>{game.winner === 0 ? '🎉' : '🃏'}</Text>
            <Text style={styles.endTitle}>
              {game.winner === 0 ? 'You win!' : `${UNO_NAMES[game.winner]} wins`}
            </Text>
            <Text style={styles.endSub}>
              Session · You {wins} — Losses {losses}
            </Text>
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
  safe: { flex: 1, backgroundColor: FELT },
  felt: { flex: 1, backgroundColor: FELT },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20 },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: Spacing.md,
  },
  diffChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  diffChipOn: {
    borderColor: AppColors.yellow,
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
  },
  diffChipText: { color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: 12 },
  diffChipTextOn: { color: '#fff' },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  colorRowLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 13 },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: '#fff',
    transform: [{ scale: 1.15 }],
  },
  stackBanner: {
    marginHorizontal: Spacing.md,
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  stackBannerText: { color: '#FDE68A', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  turnRow: { alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xs },
  turnPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  turnPillText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  turnFlash: {
    alignSelf: 'center',
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  turnFlashText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  table: {
    flex: 1,
    marginHorizontal: 10,
    marginBottom: 12,
    backgroundColor: FELT_RIM,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
    paddingTop: 10,
    overflow: 'hidden',
  },
  oppZone: { paddingHorizontal: 8 },
  oppTop: { alignItems: 'center', minHeight: 88 },
  oppLeft: { alignItems: 'flex-start', minWidth: 100 },
  oppNamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 4,
  },
  oppNamePillOn: { borderWidth: 1, borderColor: '#facc15' },
  oppNameText: { color: '#fff', fontWeight: '800', fontSize: 13, maxWidth: 72 },
  oppCountBadge: {
    backgroundColor: AppColors.tint,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oppCountText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  opponentArc: { flexDirection: 'row', alignItems: 'flex-end' },
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
    gap: 28,
  },
  pileCol: { alignItems: 'center', gap: 6 },
  pileLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700' },
  deckCount: {
    position: 'absolute',
    bottom: 22,
    right: -6,
    backgroundColor: AppColors.tint,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckCountText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  discardGlow: { borderRadius: 14 },
  playerBlock: { alignItems: 'center', paddingBottom: 12, minHeight: 168 },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  countBadgeLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: 12 },
  countBadgeText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  handScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 108,
  },
  handCardWrap: { alignItems: 'center' },
  playableRing: {
    borderRadius: 14,
    borderWidth: 3,
    borderColor: AppColors.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 14,
    elevation: 12,
  },
  unoPop: {
    marginBottom: 6,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: AppColors.yellow,
  },
  unoPopText: { fontSize: 24, fontWeight: '900', color: '#0d0d0d' },
  cardFace: {
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardBackOuter: {
    backgroundColor: CARD_BACK,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cardBackInner: {
    backgroundColor: '#0a3020',
    margin: 4,
    borderRadius: 8,
  },
  unoBackText: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  unoBackTextSm: { fontSize: 12 },
  wildStripeRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    flexDirection: 'row',
  },
  wildStripe: { flex: 1 },
  cardOval: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    minWidth: 36,
    alignItems: 'center',
  },
  cardOvalSm: { paddingHorizontal: 6, paddingVertical: 3, minWidth: 26, borderRadius: 12 },
  cardValue: { fontSize: 20, fontWeight: '900', color: '#111' },
  cardValueSm: { fontSize: 14 },
  cardValueWild: { color: '#111' },
  unoBtn: {
    backgroundColor: AppColors.yellow,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 6,
  },
  unoBtnText: { fontWeight: '900', fontSize: 15, color: '#0d0d0d' },
  drawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppColors.yellow,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 4,
  },
  drawBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.12)' },
  drawBtnText: { fontWeight: '800', fontSize: 15, color: '#0d0d0d' },
  drawBtnTextDisabled: { color: 'rgba(255,255,255,0.4)' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  colorChoice: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
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
