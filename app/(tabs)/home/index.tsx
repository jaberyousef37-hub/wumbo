import type { Href } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { CARD_GAP, SECTION_GAP, Spacing } from '@/constants/spacing';
import { useProfile } from '@/contexts/profile-context';
import { updateAndGetDailyStreak } from '@/lib/daily-streak';

const BG = AppColors.background;
const ACCENT = AppColors.tint;

const DAILY_POOL: {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: Href;
  blurb: string;
}[] = [
  {
    id: 'uno',
    name: 'UNO',
    icon: 'style',
    route: '/(tabs)/play/uno',
    blurb: 'Drop wilds, stack +2s, shout UNO.',
  },
  {
    id: 'chess',
    name: 'Chess',
    icon: 'emoji-events',
    route: '/(tabs)/play/chess',
    blurb: 'Five quick games — no draws allowed.',
  },
  {
    id: 'trivia',
    name: 'Trivia',
    icon: 'quiz',
    route: '/(tabs)/play/trivia',
    blurb: 'Speed round: general knowledge only.',
  },
  {
    id: 'bs',
    name: 'BS',
    icon: 'casino',
    route: '/(tabs)/play/bs' as Href,
    blurb: 'Bluff the pile away before your friends do.',
  },
];

function dailyFeaturedIndex(dateKey: string): number {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  return h % DAILY_POOL.length;
}

function greetingPeriod(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const STATS = {
  gamesToday: 3,
  winStreak: 5,
  totalXp: 12400,
};

const RECENT_GAME: {
  name: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: Href;
} | null = {
  name: 'UNO',
  subtitle: 'Continue your last solo match',
  icon: 'style',
  route: '/(tabs)/play/uno',
};

const POPULAR: {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  activeLabel: string;
  route: Href;
}[] = [
  { id: 'p1', name: 'UNO', icon: 'style', activeLabel: '2.1k playing', route: '/(tabs)/play/uno' },
  { id: 'p2', name: 'Chess', icon: 'emoji-events', activeLabel: '890 playing', route: '/(tabs)/play/chess' },
  { id: 'p3', name: 'Trivia', icon: 'quiz', activeLabel: '1.4k playing', route: '/(tabs)/play/trivia' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { name } = useProfile();
  const displayName = name.trim() || 'Yousef';
  const [dailyStreak, setDailyStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void updateAndGetDailyStreak().then((n) => {
        if (!cancelled) setDailyStreak(n);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const dateKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const featured = DAILY_POOL[dailyFeaturedIndex(dateKey)];
  const period = greetingPeriod();
  const greet =
    period === 'morning'
      ? 'Good morning'
      : period === 'afternoon'
        ? 'Good afternoon'
        : 'Good evening';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(420)}>
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.push('/(tabs)/chat')}
              style={({ pressed }) => [styles.msgPill, pressed && styles.pressed]}
              hitSlop={8}
            >
              <MaterialIcons name="chat-bubble-outline" size={22} color={AppColors.text} />
            </Pressable>
          </View>
          <Text style={styles.greeting}>
            {greet}, {displayName} 👋
          </Text>
          <ThemedText type="caption" style={styles.dateHint}>
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </ThemedText>
          <View style={styles.streakPill}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakLabel}>
              Daily streak: <Text style={styles.streakCount}>{dailyStreak}</Text>{' '}
              {dailyStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
          <Pressable
            onPress={() => router.push(featured.route)}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <LinearGradient
              colors={['#5B21B6', '#7C3AED', '#A78BFA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dailyCard}
            >
              <View style={styles.dailyBadge}>
                <Text style={styles.dailyBadgeText}>Daily Challenge</Text>
              </View>
              <View style={styles.dailyRow}>
                <View style={styles.dailyIconWrap}>
                  <MaterialIcons name={featured.icon} size={40} color="#fff" />
                </View>
                <View style={styles.dailyTextCol}>
                  <Text style={styles.dailyTitle}>{featured.name}</Text>
                  <Text style={styles.dailyBlurb}>{featured.blurb}</Text>
                  <Text style={styles.dailyCta}>Tap to play →</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify().damping(18)} style={styles.statsRow}>
          {(
            [
              { label: 'Games today', value: String(STATS.gamesToday) },
              { label: 'Win streak', value: String(STATS.winStreak) },
              { label: 'Total XP', value: STATS.totalXp.toLocaleString() },
            ] as const
          ).map((s) => (
            <View key={s.label} style={styles.statCell}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {RECENT_GAME && (
          <Animated.View entering={FadeInDown.delay(200).springify().damping(18)}>
            <Text style={styles.sectionTitle}>Continue playing</Text>
            <Pressable
              onPress={() => router.push(RECENT_GAME.route)}
              style={({ pressed }) => [styles.recentCard, pressed && styles.pressed]}
            >
              <View style={styles.recentIcon}>
                <MaterialIcons name={RECENT_GAME.icon} size={28} color={ACCENT} />
              </View>
              <View style={styles.recentMain}>
                <Text style={styles.recentName}>{RECENT_GAME.name}</Text>
                <Text style={styles.recentSub}>{RECENT_GAME.subtitle}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={AppColors.muted} />
            </Pressable>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(260).springify().damping(18)}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Popular now</Text>
            <Pressable onPress={() => router.push('/(tabs)/play')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularScroll}
          >
            {POPULAR.map((g, i) => (
              <Animated.View key={g.id} entering={FadeInDown.delay(280 + i * 60).springify().damping(16)}>
                <Pressable
                  onPress={() => router.push(g.route)}
                  style={({ pressed }) => [styles.popularCard, pressed && styles.pressed]}
                >
                  <View style={styles.popularIcon}>
                    <MaterialIcons name={g.icon} size={32} color={ACCENT} />
                  </View>
                  <Text style={styles.popularName}>{g.name}</Text>
                  <View style={styles.popularLive}>
                    <View style={styles.liveDot} />
                    <Text style={styles.popularLiveText}>{g.activeLabel}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.lg + Spacing.md,
    gap: SECTION_GAP,
  },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Spacing.xs },
  msgPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.card,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: AppColors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: Spacing.xs,
  },
  dateHint: { color: AppColors.muted, marginTop: 6 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: AppColors.card,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    alignSelf: 'flex-start',
  },
  streakEmoji: { fontSize: 22 },
  streakLabel: { color: AppColors.text, fontSize: 15, fontWeight: '600' },
  streakCount: { fontWeight: '900', color: ACCENT },
  dailyCard: {
    borderRadius: 20,
    padding: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dailyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  dailyBadgeText: { color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '800' },
  dailyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dailyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyTextCol: { flex: 1, minWidth: 0 },
  dailyTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  dailyBlurb: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4, lineHeight: 20 },
  dailyCta: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', marginTop: 10 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: AppColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: AppColors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: AppColors.muted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  sectionTitle: {
    color: AppColors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  seeAll: { color: ACCENT, fontWeight: '700', fontSize: 14 },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  recentIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentMain: { flex: 1, minWidth: 0 },
  recentName: { color: AppColors.text, fontSize: 17, fontWeight: '800' },
  recentSub: { color: AppColors.muted, fontSize: 13, marginTop: 2 },
  popularScroll: { gap: CARD_GAP, paddingRight: Spacing.sm },
  popularCard: {
    width: 148,
    backgroundColor: AppColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    padding: Spacing.md,
  },
  popularIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  popularName: { color: AppColors.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  popularLive: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.success,
  },
  popularLiveText: { color: AppColors.muted, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.92 },
});
