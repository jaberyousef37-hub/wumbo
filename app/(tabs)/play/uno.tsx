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
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
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
  type UnoCard,
  type UnoGameState,
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
    return '#F5F5F5';
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

function HandCard({
  card,
  playable,
  disabled,
  onPress,
  index,
  total,
}: {
  card: UnoCard;
  playable: boolean;
  disabled: boolean;
  onPress: () => void;
  index: number;
  total: number;
}) {
  const w = 64;
  const h = 92;
  const mid = (total - 1) / 2;
  const rot = (index - mid) * 4;
  const overlap = index === 0 ? 0 : -22;

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <Animated.View
          entering={FadeIn.duration(220)}
          style={[
            styles.handCardWrap,
            {
              marginLeft: overlap,
              transform: [
                { rotate: `${rot}deg` },
                { translateY: pressed && playable ? -14 : playable ? -4 : 0 },
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
  const [game, setGame] = useState<UnoGameState>(() => createInitialGame());
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const scoredRef = useRef(false);

  const top = useMemo(() => topCard(game), [game]);
  const playable = useMemo(() => {
    if (!top || game.winner || game.wildPicker || game.currentTurn !== 'player') return [];
    return getPlayableCards(game.playerHand, top, game.activeColor);
  }, [game, top]);

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
    if (game.winner || game.currentTurn !== 'ai' || game.wildPicker === 'player') return;
    const t = setTimeout(() => {
      setGame((g) => runAiTurn(g));
    }, 720);
    return () => clearTimeout(t);
  }, [
    game.currentTurn,
    game.winner,
    game.wildPicker,
    game.discard.length,
    game.aiHand.length,
    game.playerHand.length,
    game.deck.length,
    game.activeColor,
  ]);

  useEffect(() => {
    if (game.winner) {
      if (!scoredRef.current) {
        scoredRef.current = true;
        if (game.winner === 'player') setWins((w) => w + 1);
        else setLosses((l) => l + 1);
      }
    } else {
      scoredRef.current = false;
    }
  }, [game.winner]);

  const handlePlay = useCallback(
    (card: UnoCard) => {
      if (game.wildPicker || game.currentTurn !== 'player' || game.winner) return;
      const t = topCard(game);
      if (!t) return;
      if (!isCardPlayable(card, game.playerHand, t, game.activeColor)) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playSwoosh();
      setGame((g) => {
        const next = playCard(g, card.id, 'player');
        return next ?? g;
      });
    },
    [game],
  );

  const handleDraw = useCallback(() => {
    if (game.wildPicker || game.currentTurn !== 'player' || game.winner) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGame((g) => {
      const next = playerDrawOne(g);
      return next ?? g;
    });
  }, [game.wildPicker, game.currentTurn, game.winner]);

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
    setGame(createInitialGame());
  }, []);

  const glow = discardGlowColor(top, game.activeColor);

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
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.turnRow}>
          <View
            style={[
              styles.turnPill,
              { backgroundColor: game.currentTurn === 'player' ? '#22C55E' : 'rgba(255,255,255,0.2)' },
            ]}
          >
            <Text style={styles.turnPillText}>
              {game.wildPicker === 'player'
                ? 'Pick a color'
                : game.currentTurn === 'player'
                  ? 'Your turn'
                  : "Opponent's turn"}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          {/* Opponent */}
          <View style={styles.opponentBlock}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{game.aiHand.length}</Text>
            </View>
            <View style={styles.opponentArc}>
              {game.aiHand.map((_, i) => {
                const n = game.aiHand.length;
                const spread = Math.min(5.5, 48 / Math.max(n, 1));
                const rot = (i - (n - 1) / 2) * spread;
                const overlap = n <= 1 ? 0 : -18;
                return (
                  <View
                    key={`ai-${i}`}
                    style={[
                      styles.opponentCardSlot,
                      { marginLeft: i === 0 ? 0 : overlap, transform: [{ rotate: `${rot}deg` }] },
                    ]}
                  >
                    <CardBackFace w={48} h={68} small />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Center piles */}
          <View style={styles.centerRow}>
            <View style={styles.pileCol}>
              <CardBackFace w={56} h={80} />
              <View style={styles.deckCount}>
                <Text style={styles.deckCountText}>{game.deck.length}</Text>
              </View>
              <Text style={styles.pileLabel}>Draw</Text>
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
                    entering={SlideInDown.duration(280).springify().damping(16).stiffness(200)}
                  >
                    <CardFace card={top} w={88} h={124} />
                  </Animated.View>
                ) : null}
              </Animated.View>
              <Text style={styles.pileLabel}>Discard</Text>
            </View>
          </View>

          {/* Player */}
          <View style={styles.playerBlock}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{game.playerHand.length}</Text>
            </View>

            {game.playerHand.length === 1 &&
              game.currentTurn === 'player' &&
              !game.wildPicker &&
              !game.winner && (
                <Pressable onPress={handleUno} style={styles.unoBtn}>
                  <Text style={styles.unoBtnText}>UNO!</Text>
                </Pressable>
              )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.handScroll}
            >
              {game.playerHand.map((card, index) => {
                const isPlay = playable.some((c) => c.id === card.id);
                const mustBlock =
                  game.currentTurn !== 'player' ||
                  !!game.winner ||
                  !!game.wildPicker ||
                  (isPlay === false && game.playerHand.some((c) => playable.some((p) => p.id === c.id)));
                const disabled = mustBlock || !isPlay;
                return (
                  <HandCard
                    key={card.id}
                    card={card}
                    playable={isPlay}
                    disabled={disabled}
                    onPress={() => handlePlay(card)}
                    index={index}
                    total={game.playerHand.length}
                  />
                );
              })}
            </ScrollView>

            {game.currentTurn === 'player' && !game.winner && !game.wildPicker && (
              <Pressable
                onPress={handleDraw}
                style={[
                  styles.drawBtn,
                  playable.length > 0 && styles.drawBtnDisabled,
                ]}
                disabled={playable.length > 0}
              >
                <MaterialIcons
                  name="style"
                  size={22}
                  color={playable.length > 0 ? 'rgba(255,255,255,0.35)' : '#0d0d0d'}
                />
                <Text
                  style={[
                    styles.drawBtnText,
                    playable.length > 0 && styles.drawBtnTextDisabled,
                  ]}
                >
                  Draw
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <Modal visible={game.wildPicker === 'player'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose color</Text>
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

      {game.winner && (
        <View style={styles.endOverlay}>
          <View style={styles.endCard}>
            <Text style={styles.endEmoji}>{game.winner === 'player' ? '🎉' : '🃏'}</Text>
            <Text style={styles.endTitle}>{game.winner === 'player' ? 'You win!' : 'You lose'}</Text>
            <Text style={styles.endSub}>
              Session · You {wins} — AI {losses}
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
    paddingHorizontal: 12,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20 },
  turnRow: { alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  turnPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  turnPillText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  table: {
    flex: 1,
    marginHorizontal: 10,
    marginBottom: 12,
    backgroundColor: FELT_RIM,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
    paddingTop: 12,
    overflow: 'hidden',
  },
  opponentBlock: { alignItems: 'center', minHeight: 110 },
  opponentArc: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  opponentCardSlot: { alignItems: 'center' },
  centerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 36,
    paddingVertical: 20,
    flex: 1,
  },
  pileCol: { alignItems: 'center', gap: 8 },
  pileLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
  deckCount: {
    position: 'absolute',
    bottom: 28,
    right: -6,
    backgroundColor: AppColors.tint,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckCountText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  discardGlow: {
    borderRadius: 16,
  },
  playerBlock: { alignItems: 'center', paddingBottom: 16, minHeight: 200 },
  countBadge: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  countBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  handScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 120,
  },
  handCardWrap: { alignItems: 'center' },
  playableRing: {
    borderRadius: 16,
    borderWidth: 3,
    borderColor: AppColors.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 40,
    alignItems: 'center',
  },
  cardOvalSm: { paddingHorizontal: 8, paddingVertical: 4, minWidth: 28, borderRadius: 14 },
  cardValue: { fontSize: 22, fontWeight: '900', color: '#111' },
  cardValueSm: { fontSize: 15 },
  cardValueWild: { color: '#111' },
  unoBtn: {
    backgroundColor: AppColors.yellow,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  unoBtnText: { fontWeight: '900', fontSize: 16, color: '#0d0d0d' },
  drawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AppColors.yellow,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  drawBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.12)' },
  drawBtnText: { fontWeight: '800', fontSize: 16, color: '#0d0d0d' },
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
    fontSize: 20,
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
  endTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 8 },
  endSub: { color: 'rgba(255,255,255,0.7)', marginBottom: 24, fontSize: 15 },
  playAgain: { borderRadius: 16, overflow: 'hidden', width: '100%' },
  playAgainGrad: { paddingVertical: 16, alignItems: 'center' },
  playAgainText: { fontWeight: '900', fontSize: 17, color: '#0d0d0d' },
  backPlay: { marginTop: 16, padding: 8 },
  backPlayText: { color: AppColors.yellow, fontWeight: '700', fontSize: 16 },
});
