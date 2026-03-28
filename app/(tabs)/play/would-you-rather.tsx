import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HowToPlayButton } from '@/components/how-to-play-button';
import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { WYR_QUESTIONS, type WyrCategory } from '@/lib/would-you-rather-data';
import { fakePercentsForPick } from '@/lib/wyr-stats';

const BG = '#0c0614';
const LEFT_SOLID = '#7C3AED';
const RIGHT_SOLID = '#E74C3C';
const MENU_CARD_BG = '#2a2a2a';

type ScreenPhase = 'menu' | 'play';
type PlayMode = 'solo' | 'friends';

function shuffleIndices(len: number): number[] {
  const a = Array.from({ length: len }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CATEGORY_COLORS: Record<WyrCategory, string> = {
  Fun: '#F472B6',
  Extreme: '#FB923C',
  Food: '#FBBF24',
  Superpowers: '#60A5FA',
  Life: '#A78BFA',
};

function StatBar({
  label,
  pct,
  fill,
  track,
  anim,
}: {
  label: string;
  pct: number;
  fill: string;
  track: string;
  anim: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    width: `${anim.value}%`,
  }));
  return (
    <View style={styles.statBlock}>
      <View style={styles.statLabelRow}>
        <Text style={styles.statLabel} numberOfLines={2}>
          {label}
        </Text>
        <Text style={styles.statPct}>{pct}%</Text>
      </View>
      <View style={[styles.statTrack, { backgroundColor: track }]}>
        <Animated.View style={[styles.statFill, { backgroundColor: fill }, style]} />
      </View>
    </View>
  );
}

export default function WouldYouRatherScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<ScreenPhase>('menu');
  const [mode, setMode] = useState<PlayMode>('solo');
  const [friendCount, setFriendCount] = useState(3);
  const [order, setOrder] = useState<number[]>(() => shuffleIndices(WYR_QUESTIONS.length));
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<'a' | 'b' | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [aPct, setAPct] = useState(50);
  const [bPct, setBPct] = useState(50);

  const barA = useSharedValue(0);
  const barB = useSharedValue(0);

  const q = order[qi] !== undefined ? WYR_QUESTIONS[order[qi]!]! : WYR_QUESTIONS[0]!;

  const resetBars = useCallback(() => {
    barA.value = 0;
    barB.value = 0;
  }, [barA, barB]);

  useEffect(() => {
    if (!picked) {
      resetBars();
      return;
    }
    const { aPct: a, bPct: b } = fakePercentsForPick(q.id, picked);
    setAPct(a);
    setBPct(b);
    barA.value = 0;
    barB.value = 0;
    barA.value = withTiming(a, { duration: 920 });
    barB.value = withTiming(b, { duration: 920 });
  }, [picked, q.id, barA, barB, resetBars]);

  const startPlay = useCallback((m: PlayMode) => {
    setMode(m);
    setOrder(shuffleIndices(WYR_QUESTIONS.length));
    setQi(0);
    setPicked(null);
    setTurnIndex(0);
    setPhase('play');
    resetBars();
  }, [resetBars]);

  const onPick = useCallback(
    (side: 'a' | 'b') => {
      if (picked) return;
      setPicked(side);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [picked],
  );

  const nextQuestion = useCallback(() => {
    setPicked(null);
    setQi((i) => (i + 1 >= order.length ? 0 : i + 1));
    if (mode === 'friends') {
      setTurnIndex((t) => (t + 1) % friendCount);
    }
    resetBars();
  }, [mode, friendCount, order.length, resetBars]);

  const turnLabel = useMemo(() => {
    if (mode === 'solo') return 'Your pick';
    return `Player ${turnIndex + 1}’s turn`;
  }, [mode, turnIndex]);

  const menu = (
    <ScrollView contentContainerStyle={styles.menuScroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.menuTitle}>How do you want to play?</Text>
      <Text style={styles.menuSub}>Solo: you answer every prompt. Friends: pass the phone — turns rotate.</Text>
      <Pressable onPress={() => startPlay('solo')} style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}>
        <View style={[styles.modeGrad, { backgroundColor: MENU_CARD_BG }]}>
          <MaterialIcons name="person" size={36} color="#C4B5FD" />
          <Text style={styles.modeName}>Solo</Text>
          <Text style={styles.modeDesc}>You choose every time — instant results.</Text>
        </View>
      </Pressable>
      <View style={styles.friendsBlock}>
        <Text style={styles.friendsHead}>Friends (take turns)</Text>
        <View style={styles.stepper}>
          {[2, 3, 4, 5, 6, 7, 8].map((n) => (
            <Pressable
              key={n}
              onPress={() => setFriendCount(n)}
              style={[styles.stepChip, friendCount === n && styles.stepChipOn]}
            >
              <Text style={[styles.stepChipText, friendCount === n && styles.stepChipTextOn]}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.friendsHint}>{friendCount} players · rotate who taps</Text>
        <Pressable onPress={() => startPlay('friends')} style={({ pressed }) => [styles.startFriends, pressed && styles.pressed]}>
          <Text style={styles.startFriendsText}>Start with {friendCount} players</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const play = (
    <View style={styles.playRoot}>
      <View style={styles.metaRow}>
        <View style={[styles.catPill, { borderColor: CATEGORY_COLORS[q.category] }]}>
          <Text style={[styles.catText, { color: CATEGORY_COLORS[q.category] }]}>{q.category}</Text>
        </View>
        <Text style={styles.turnMeta}>{turnLabel}</Text>
      </View>

      <View style={styles.split}>
        <Pressable
          onPress={() => onPick('a')}
          disabled={!!picked}
          style={({ pressed }) => [
            styles.half,
            styles.halfLeft,
            { backgroundColor: LEFT_SOLID },
            pressed && !picked && { opacity: 0.92 },
          ]}
        >
          <Text style={styles.orLabel}>Would you rather…</Text>
          <Text style={styles.optionText}>{q.a}</Text>
          {picked === 'a' && <View pointerEvents="none" style={styles.chosenRing} />}
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          onPress={() => onPick('b')}
          disabled={!!picked}
          style={({ pressed }) => [
            styles.half,
            styles.halfRight,
            { backgroundColor: RIGHT_SOLID },
            pressed && !picked && { opacity: 0.92 },
          ]}
        >
          <Text style={styles.orLabel}>…or…</Text>
          <Text style={styles.optionText}>{q.b}</Text>
          {picked === 'b' && <View pointerEvents="none" style={styles.chosenRing} />}
        </Pressable>
      </View>

      <View style={styles.bottomPanel}>
        {!picked ? (
          <Text style={styles.hint}>Tap either side to vote</Text>
        ) : (
          <>
            <Text style={styles.resultsTitle}>Worldwide picks (simulated)</Text>
            <StatBar label={q.a} pct={aPct} fill={LEFT_SOLID} track="rgba(255,255,255,0.12)" anim={barA} />
            <StatBar label={q.b} pct={bPct} fill={RIGHT_SOLID} track="rgba(255,255,255,0.12)" anim={barB} />
            <Pressable onPress={nextQuestion} style={({ pressed }) => [styles.nextBtnSolid, pressed && styles.pressed]}>
              <Text style={styles.nextBtnText}>Next question</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <MaterialIcons name="arrow-back" size={24} color="#E9D5FF" />
        </Pressable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Would You Rather
        </ThemedText>
        <HowToPlayButton gameId="would-you-rather" tint="#E9D5FF" />
      </View>
      {phase === 'menu' ? menu : play}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, color: '#EDE9FE', fontWeight: '800' },
  pressed: { opacity: 0.9 },
  menuScroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.lg + Spacing.md },
  menuTitle: { color: '#F5F3FF', fontSize: 24, fontWeight: '800' },
  menuSub: { color: '#A78BFA', fontSize: 15, lineHeight: 22 },
  modeCard: { borderRadius: 18, overflow: 'hidden' },
  modeGrad: { padding: Spacing.lg, gap: 8 },
  modeName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  modeDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 22 },
  friendsBlock: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    gap: Spacing.sm,
  },
  friendsHead: { color: '#E9D5FF', fontWeight: '800', fontSize: 17 },
  stepper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stepChipOn: {
    backgroundColor: 'rgba(124, 58, 237, 0.45)',
    borderColor: '#C4B5FD',
  },
  stepChipText: { color: '#C4B5FD', fontWeight: '800' },
  stepChipTextOn: { color: '#fff' },
  friendsHint: { color: AppColors.muted, fontSize: 13, fontWeight: '600' },
  startFriends: {
    marginTop: 4,
    backgroundColor: AppColors.tint,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  startFriendsText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  playRoot: { flex: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  catPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  catText: { fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
  turnMeta: { color: '#DDD6FE', fontWeight: '700', fontSize: 14, flex: 1, textAlign: 'right' },
  split: { flex: 1, flexDirection: 'row', minHeight: 280 },
  half: { flex: 1, justifyContent: 'center', padding: Spacing.md, position: 'relative', overflow: 'hidden' },
  halfLeft: {},
  halfRight: {},
  divider: { width: 3, backgroundColor: 'rgba(0,0,0,0.35)' },
  orLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  chosenRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    borderColor: '#FDE047',
  },
  bottomPanel: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  hint: { color: AppColors.muted, textAlign: 'center', fontWeight: '600', paddingVertical: Spacing.sm },
  resultsTitle: {
    color: '#E9D5FF',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 4,
  },
  statBlock: { gap: 6, marginBottom: 10 },
  statLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  statLabel: { color: '#F5F3FF', fontWeight: '700', fontSize: 14, flex: 1 },
  statPct: { color: '#C4B5FD', fontWeight: '900', fontSize: 14 },
  statTrack: {
    height: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statFill: {
    height: '100%',
    borderRadius: 8,
  },
  nextBtnSolid: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
