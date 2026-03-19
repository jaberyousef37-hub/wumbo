import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { WinnerModal } from '@/components/winner-modal';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { playSwoosh } from '@/lib/sounds';

const CARD_COLORS = {
  red: '#E53E3E',
  blue: '#3182CE',
  green: '#38A169',
  yellow: '#D69E2E',
} as const;

type Color = keyof typeof CARD_COLORS;
type Value = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2';

type Card = { id: string; color: Color; value: Value };

function buildDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;
  const colors: Color[] = ['red', 'blue', 'green', 'yellow'];
  const numbers: Value[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const actions: Value[] = ['skip', 'reverse', 'draw2'];

  for (const c of colors) {
    deck.push({ id: `c-${id++}`, color: c, value: '0' });
    for (const n of numbers.slice(1)) {
      deck.push({ id: `c-${id++}`, color: c, value: n });
      deck.push({ id: `c-${id++}`, color: c, value: n });
    }
    for (const a of actions) {
      deck.push({ id: `c-${id++}`, color: c, value: a });
      deck.push({ id: `c-${id++}`, color: c, value: a });
    }
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function canPlay(card: Card, top: Card): boolean {
  return card.color === top.color || card.value === top.value;
}

function getValidPlays(hand: Card[], top: Card): Card[] {
  return hand.filter((c) => canPlay(c, top));
}

function formatValue(v: Value): string {
  if (v === 'skip') return 'Skip';
  if (v === 'reverse') return 'Rev';
  if (v === 'draw2') return '+2';
  return v;
}

const CARD_SIZES = {
  small: { w: 68, h: 96 },
  normal: { w: 84, h: 118 },
  large: { w: 108, h: 152 },
} as const;

function CardView({
  card,
  size = 'normal',
  onPress,
  disabled,
  isPlayable,
}: {
  card: Card;
  size?: 'normal' | 'small' | 'large';
  onPress?: () => void;
  disabled?: boolean;
  isPlayable?: boolean;
}) {
  const bg = CARD_COLORS[card.color];
  const { w, h } = CARD_SIZES[size];
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const content = (
    <View
      style={[
        styles.card,
        { width: w, height: h, backgroundColor: bg },
        isPlayable && { ...styles.cardPlayableGlow, shadowColor: bg },
      ]}
    >
      <View style={[styles.cardOval, isSmall && styles.cardOvalSmall, isLarge && styles.cardOvalLarge]}>
        <Text
          style={[
            styles.cardValue,
            isSmall && styles.cardValueSmall,
            isLarge && styles.cardValueLarge,
          ]}
        >
          {formatValue(card.value)}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.cardPress,
          disabled && styles.cardDisabled,
          pressed && !disabled && styles.cardPressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.cardPress}>{content}</View>;
}

function CardBack({ size = 'small' }: { size?: 'small' | 'large' }) {
  const { w, h } = size === 'large' ? CARD_SIZES.normal : CARD_SIZES.small;
  return (
    <View style={[styles.cardBack, { width: w, height: h }]}>
      <LinearGradient
        colors={['#1e3a5f', '#0d1b2a', '#1b263b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.cardBackRadius]}
      />
      <View style={styles.cardBackPattern}>
        {[-2, -1, 0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.cardBackStripe,
              { transform: [{ rotate: '-45deg' }, { translateX: i * 18 }] },
            ]}
          />
        ))}
      </View>
      <View style={styles.cardBackDiamond} />
      <View style={styles.cardBackCenter}>
        <Text style={styles.cardBackText} numberOfLines={1}>
          UNO
        </Text>
      </View>
    </View>
  );
}

export default function UnoScreen() {
  const router = useRouter();
  const [deck, setDeck] = useState<Card[]>(() => shuffle(buildDeck()));
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [aiHand, setAiHand] = useState<Card[]>([]);
  const [discard, setDiscard] = useState<Card[]>([]);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [pendingDraw, setPendingDraw] = useState(0);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [unoPressed, setUnoPressed] = useState(false);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topCard = discard[discard.length - 1];
  const validPlays = topCard ? getValidPlays(playerHand, topCard) : [];

  const drawCards = useCallback((count: number, forPlayer: boolean) => {
    setDeck((d) => {
      const drawn = d.slice(-count);
      const rest = d.slice(0, -count);
      if (forPlayer) {
        setPlayerHand((h) => [...h, ...drawn]);
      } else {
        setAiHand((h) => [...h, ...drawn]);
      }
      return rest;
    });
  }, []);

  const playCard = useCallback(
    (card: Card, fromPlayer: boolean, handSizeBeforePlay: number) => {
      if (fromPlayer) {
        setPlayerHand((h) => h.filter((c) => c.id !== card.id));
        setUnoPressed(false);
        if (handSizeBeforePlay === 1 && !unoPressed) drawCards(2, true);
      } else {
        setAiHand((h) => h.filter((c) => c.id !== card.id));
      }
      setDiscard((d) => [...d, card]);

      if ((fromPlayer && handSizeBeforePlay <= 1) || (!fromPlayer && handSizeBeforePlay <= 1)) {
        if (fromPlayer) {
          setWinner('player');
          setWins((w) => w + 1);
        } else {
          setWinner('ai');
          setLosses((l) => l + 1);
        }
        return;
      }

      if (card.value === 'skip' || card.value === 'reverse') {
        setPlayerTurn(fromPlayer);
        return;
      }
      if (card.value === 'draw2') {
        setPendingDraw((p) => p + 2);
        setPlayerTurn(fromPlayer);
        return;
      }
      setPlayerTurn(!fromPlayer);
    },
    [unoPressed, drawCards]
  );

  useEffect(() => {
    if (deck.length > 0 && playerHand.length === 0 && aiHand.length === 0 && discard.length === 0) {
      const shuffled = shuffle([...deck]);
      let top = shuffled[0];
      let rest = shuffled.slice(1);
      while (['skip', 'reverse', 'draw2'].includes(top.value)) {
        rest = shuffle([...rest, top]);
        top = rest[0];
        rest = rest.slice(1);
      }
      const remaining = shuffle(rest);
      const pHand = remaining.slice(0, 7);
      const aHand = remaining.slice(7, 14);
      const newDeck = remaining.slice(14);
      setPlayerHand(pHand);
      setAiHand(aHand);
      setDeck(newDeck);
      setDiscard([top]);
      setPlayerTurn(true);
      setWinner(null);
      setPendingDraw(0);
      setUnoPressed(false);
    }
  }, [deck.length, playerHand.length, aiHand.length, discard.length]);

  useEffect(() => {
    if (winner || playerTurn || !topCard) return;
    if (pendingDraw > 0) {
      drawCards(pendingDraw, false);
      setPendingDraw(0);
      setPlayerTurn(true);
      return;
    }
    aiTimeoutRef.current = setTimeout(() => {
      const valid = getValidPlays(aiHand, topCard);
      if (valid.length > 0) {
        const play = valid[Math.floor(Math.random() * valid.length)];
        playCard(play, false, aiHand.length);
      } else {
        if (deck.length > 0) {
          setDeck((d) => {
            const drawn = d[d.length - 1];
            setAiHand((h) => [...h, drawn]);
            return d.slice(0, -1);
          });
          setPlayerTurn(true);
        }
      }
    }, 800);
    return () => {
      if (aiTimeoutRef.current != null) clearTimeout(aiTimeoutRef.current);
    };
  }, [playerTurn, winner, pendingDraw, aiHand, topCard, deck, playCard, drawCards]);

  const handlePlay = useCallback(
    (card: Card) => {
      if (!playerTurn || winner || !topCard || !canPlay(card, topCard)) return;
      if ((playerHand.length === 1 || playerHand.length === 2) && !unoPressed) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playSwoosh();
      playCard(card, true, playerHand.length);
    },
    [playerTurn, winner, topCard, playerHand.length, unoPressed, playCard]
  );

  const handleDraw = useCallback(() => {
    if (!playerTurn || winner || validPlays.length > 0) return;
    if (deck.length > 0) {
      setDeck((d) => {
        const drawn = d[d.length - 1];
        setPlayerHand((h) => [...h, drawn]);
        return d.slice(0, -1);
      });
      setPlayerTurn(false);
    }
  }, [playerTurn, winner, validPlays, deck]);

  const handleRestart = useCallback(() => {
    setDeck(shuffle(buildDeck()));
    setPlayerHand([]);
    setAiHand([]);
    setDiscard([]);
    setPlayerTurn(true);
    setWinner(null);
    setPendingDraw(0);
    setUnoPressed(false);
  }, []);

  const mustUno =
    (playerHand.length === 1 || playerHand.length === 2) &&
    validPlays.length > 0 &&
    playerTurn &&
    !winner;
  const showUno = mustUno;

  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.container}>
        {/* Gradient header with scores */}
        <LinearGradient
          colors={['#E53E3E', Colors.dark.accentPink, Colors.dark.accentYellow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="defaultSemiBold" style={styles.title} darkColor="#fff">
              UNO
            </ThemedText>
            <View style={styles.headerScores}>
              <View style={styles.headerScoreItem}>
                <ThemedText style={styles.headerScoreLabel} darkColor="rgba(255,255,255,0.9)">You</ThemedText>
                <ThemedText style={styles.headerScoreVal} darkColor="#fff">{wins}</ThemedText>
              </View>
              <View style={styles.headerScoreDivider} />
              <View style={styles.headerScoreItem}>
                <ThemedText style={styles.headerScoreLabel} darkColor="rgba(255,255,255,0.9)">AI</ThemedText>
                <ThemedText style={styles.headerScoreVal} darkColor="#fff">{losses}</ThemedText>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Opponent */}
        <View style={styles.opponentRow}>
          <ThemedText style={styles.opponentLabel}>Opponent</ThemedText>
          <View style={styles.opponentCards}>
            {aiHand.slice(0, 8).map((_, i) => (
              <View
                key={i}
                style={[styles.opponentCardBack, i === 0 && { marginLeft: 0 }]}
              >
                <CardBack size="small" />
              </View>
            ))}
          </View>
          <ThemedText style={styles.opponentCount}>{aiHand.length} cards</ThemedText>
        </View>

        {/* Center: discard pile (large) + draw deck */}
        <View style={styles.center}>
          <View style={styles.deckPlaceholder}>
            <CardBack size="small" />
            <View style={styles.deckCountBadge}>
              <ThemedText style={styles.deckCount}>{deck.length}</ThemedText>
            </View>
          </View>
          {topCard && (
            <View style={styles.discardWrap}>
              <CardView card={topCard} size="large" />
            </View>
          )}
        </View>

        {/* Player hand */}
        <View style={styles.playerSection}>
          {winner && (
            <View style={styles.resultBar}>
              <ThemedText style={styles.resultText}>
                {winner === 'player' ? 'You win!' : 'AI wins!'}
              </ThemedText>
            </View>
          )}
          {!winner && (
            <View style={styles.turnBar}>
              <ThemedText style={styles.turnText}>
                {playerTurn ? 'Your turn' : "Opponent's turn"}
              </ThemedText>
            </View>
          )}

          {showUno && (
            <Pressable
              onPress={() => setUnoPressed(true)}
              style={[styles.unoBtn, unoPressed && styles.unoBtnPressed]}
            >
              <ThemedText style={styles.unoBtnText}>UNO!</ThemedText>
            </Pressable>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.handScroll}
          >
            {playerHand.map((card) => {
              const valid = topCard ? canPlay(card, topCard) : false;
              const disabled =
                !playerTurn ||
                !!winner ||
                !valid ||
                (mustUno && !unoPressed);
              return (
                <View key={card.id} style={styles.handCard}>
                  <CardView
                    card={card}
                    size="small"
                    onPress={() => handlePlay(card)}
                    disabled={disabled}
                    isPlayable={valid && !disabled}
                  />
                </View>
              );
            })}
          </ScrollView>

          {playerTurn && !winner && deck.length > 0 && (
            <Pressable
              onPress={handleDraw}
              style={styles.drawBtn}
              disabled={validPlays.length > 0}
            >
              <LinearGradient
                colors={
                  validPlays.length > 0
                    ? ['#4a5568', '#2d3748']
                    : ['#F6E05E', '#F6AD55', '#ED8936']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.drawBtnGradient, validPlays.length > 0 && styles.drawBtnDisabled]}
              >
                <MaterialIcons
                  name="add"
                  size={24}
                  color={validPlays.length > 0 ? '#718096' : '#1a0a2e'}
                />
                <Text
                  style={[
                    styles.drawBtnText,
                    validPlays.length > 0 && styles.drawBtnTextDisabled,
                  ]}
                >
                  Draw Card
                </Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        <Pressable onPress={handleRestart} style={styles.restartBtn}>
          <MaterialIcons name="refresh" size={22} color={Colors.dark.background} />
          <Text style={styles.restartText}>Restart</Text>
        </Pressable>
      </View>

      {/* Winner celebration modal */}
      <WinnerModal
        visible={!!winner}
        winnerName={winner === 'player' ? 'You' : 'AI'}
        score={{ wins, losses }}
        subtitle="UNO! 🎉"
        onPlayAgain={handleRestart}
        onConfettiComplete={() => {}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.background },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { marginRight: 12 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerScores: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 16,
  },
  headerScoreItem: { alignItems: 'center' },
  headerScoreLabel: { fontSize: 12 },
  headerScoreVal: { fontSize: 16, fontWeight: '800' },
  headerScoreDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  title: { fontSize: 22 },
  opponentRow: { alignItems: 'center', marginBottom: 20 },
  opponentLabel: { fontSize: 14, marginBottom: 8, opacity: 0.9 },
  opponentCards: { flexDirection: 'row', marginHorizontal: 20 },
  opponentCardBack: {
    marginLeft: -22,
  },
  opponentCount: { fontSize: 13, marginTop: 6, opacity: 0.8 },
  center: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    marginBottom: 28,
    paddingVertical: 16,
  },
  deckPlaceholder: {
    width: 62,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  deckCountBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.dark.tint,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckCount: { fontSize: 12, fontWeight: '800', color: Colors.dark.background },
  discardWrap: { marginLeft: 8 },
  card: {
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPlayableGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 12,
  },
  cardOval: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOvalSmall: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, minWidth: 32 },
  cardOvalLarge: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 24, minWidth: 56 },
  cardValue: { fontSize: 22, fontWeight: '900', color: '#1a0a2e' },
  cardValueSmall: { fontSize: 16 },
  cardValueLarge: { fontSize: 28 },
  cardPress: { marginHorizontal: 6 },
  cardDisabled: { opacity: 0.45 },
  cardPressed: { opacity: 0.9 },
  cardBack: {
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackRadius: { borderRadius: 11 },
  cardBackPattern: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackStripe: {
    position: 'absolute',
    width: 3,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
  },
  cardBackDiamond: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  cardBackCenter: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0,
  },
  playerSection: { flex: 1 },
  resultBar: { marginBottom: 8 },
  resultText: { fontSize: 20, fontWeight: '700', color: Colors.dark.tint },
  turnBar: { marginBottom: 8 },
  turnText: { fontSize: 16, opacity: 0.9 },
  unoBtn: {
    alignSelf: 'center',
    backgroundColor: Colors.dark.accentYellow,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginBottom: 12,
  },
  unoBtnPressed: { opacity: 0.7 },
  unoBtnText: { fontSize: 18, fontWeight: '800', color: '#1a0a2e' },
  handScroll: { paddingVertical: 8, gap: 4 },
  handCard: {},
  drawBtn: {
    alignSelf: 'center',
    borderRadius: 16,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#F6AD55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  drawBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  drawBtnText: { fontSize: 18, fontWeight: '800', color: '#1a0a2e' },
  drawBtnDisabled: { opacity: 0.7 },
  drawBtnTextDisabled: { color: '#718096' },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dark.tint,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  restartText: { color: Colors.dark.background, fontSize: 16, fontWeight: '700' },
});
