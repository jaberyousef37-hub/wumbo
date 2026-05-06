import type { Href } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { useCosmetics } from '@/contexts/cosmetics-context';
import { CARD_GAP, SECTION_GAP, Spacing } from '@/constants/spacing';
import { useProfile } from '@/contexts/profile-context';
import { updateAndGetDailyStreak } from '@/lib/daily-streak';

const BG = AppColors.background;
const ACCENT = AppColors.tint;
const CARD_DARK = '#1a1a1a';
const CARD_ELEV = '#2a2a2a';

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
  if (h < 18) return 'afternoon';
  return 'evening';
}

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

function PulsingFire() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [scale]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.Text style={[styles.streakEmoji, animStyle]}>🔥</Animated.Text>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { name } = useProfile();
  const { xpTotal, level, coins } = useCosmetics();
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
        nestedScrollEnabled
      >
        <LinearGradient
          colors={['#1e0b3d', '#4C1D95', '#5B21B6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Animated.View entering={FadeIn.duration(420)}>
            <View style={styles.topRow}>
              <Pressable
                onPress={() => router.push('/(tabs)/chat')}
                style={({ pressed }) => [styles.msgPill, pressed && styles.pressed]}
                hitSlop={8}
              >
                <MaterialIcons name="chat-bubble-outline" size={22} color="#F5F3FF" />
              </Pressable>
            </View>
            <Text style={styles.greeting}>
              {greet}, {displayName} 👋
            </Text>
            <ThemedText
              type="caption"
              style={styles.dateHint}
              lightColor="rgba(255,255,255,0.75)"
              darkColor="rgba(255,255,255,0.75)"
            >
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </ThemedText>
            <View style={styles.streakPill}>
              <PulsingFire />
              <Text style={styles.streakLabel}>
                Daily streak: <Text style={styles.streakCount}>{dailyStreak}</Text>{' '}
                {dailyStreak === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>

        {RECENT_GAME && (
          <Animated.View entering={FadeInDown.delay(60).springify().damping(18)}>
            <Text style={styles.sectionTitleContinue}>Continue playing</Text>
            <Pressable
              onPress={() => router.push(RECENT_GAME.route)}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <LinearGradient
                colors={['#7C3AED', '#A78BFA', '#FF6FD8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.continueGradientBorder}
              >
                <View style={styles.continueCard}>
                  <View style={styles.continueIcon}>
                    <MaterialIcons name={RECENT_GAME.icon} size={44} color={ACCENT} />
                  </View>
                  <View style={styles.continueMain}>
                    <Text style={styles.continueName}>{RECENT_GAME.name}</Text>
                    <Text style={styles.continueSub}>{RECENT_GAME.subtitle}</Text>
                    <LinearGradient
                      colors={[ACCENT, '#A78BFA']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.continueCta}
                    >
                      <Text style={styles.continueCtaText}>Resume</Text>
                      <MaterialIcons name="play-arrow" size={22} color="#fff" />
                    </LinearGradient>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(120).springify().damping(18)}>
          <Pressable
            onPress={() => router.push(featured.route)}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <View style={styles.dailyCard}>
              <View style={styles.dailyBadge}>
                <Text style={styles.dailyBadgeText}>Daily Challenge</Text>
              </View>
              <View style={styles.dailyRow}>
                <View style={styles.dailyIconWrap}>
                  <MaterialIcons name={featured.icon} size={32} color="#E9D5FF" />
                </View>
                <View style={styles.dailyTextCol}>
                  <Text style={styles.dailyTitle}>{featured.name}</Text>
                  <Text style={styles.dailyBlurb}>{featured.blurb}</Text>
                  <Text style={styles.dailyCta}>Tap to play →</Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).springify().damping(18)}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Popular now</Text>
            <Pressable onPress={() => router.push('/(tabs)/play')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            nestedScrollEnabled
            style={styles.popularScrollOuter}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularScroll}
          >
            {POPULAR.map((g, i) => (
              <Animated.View key={g.id} entering={FadeInDown.delay(200 + i * 50).springify().damping(16)}>
                <Pressable
                  onPress={() => router.push(g.route)}
                  style={({ pressed }) => [styles.popularCard, pressed && styles.pressed]}
                >
                  <View style={styles.popularIcon}>
                    <MaterialIcons name={g.icon} size={28} color={ACCENT} />
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

        <Animated.View entering={FadeInDown.delay(260).springify().damping(18)} style={styles.statsStrip}>
          {(
            [
              { label: 'Level', value: String(level) },
              { label: 'XP', value: xpTotal > 9999 ? `${Math.round(xpTotal / 1000)}k` : String(xpTotal) },
              { label: 'Coins', value: coins > 9999 ? `${Math.round(coins / 1000)}k` : String(coins) },
            ] as const
          ).map((s, i) => (
            <View key={s.label} style={[styles.statMini, i > 0 && styles.statMiniBorder]}>
              <Text style={styles.statMiniValue}>{s.value}</Text>
              <Text style={styles.statMiniLabel}>{s.label}</Text>
            </View>
          ))}
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
    paddingBottom: 100,
    gap: SECTION_GAP,
  },
  headerGradient: {
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Spacing.xs },
  msgPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: Spacing.xs,
  },
  dateHint: { color: 'rgba(255,255,255,0.75)', marginTop: 6 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
  },
  streakEmoji: { fontSize: 22 },
  streakLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  streakCount: { fontWeight: '900', color: '#FDE047' },
  sectionTitleContinue: {
    color: AppColors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: Spacing.sm,
  },
  continueGradientBorder: {
    borderRadius: 24,
    padding: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: CARD_ELEV,
    borderRadius: 22,
    padding: Spacing.md + 4,
    gap: Spacing.md,
    minHeight: 148,
  },
  continueIcon: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: CARD_DARK,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  continueMain: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 10 },
  continueName: { color: AppColors.text, fontSize: 26, fontWeight: '900' },
  continueSub: { color: AppColors.muted, fontSize: 15, lineHeight: 22 },
  continueCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  continueCtaText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  dailyCard: {
    borderRadius: 18,
    padding: Spacing.md,
    backgroundColor: '#4C1D95',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  dailyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  dailyBadgeText: { color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: '800' },
  dailyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dailyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyTextCol: { flex: 1, minWidth: 0 },
  dailyTitle: { color: '#fff', fontSize: 19, fontWeight: '900' },
  dailyBlurb: { color: 'rgba(255,255,255,0.88)', fontSize: 14, marginTop: 4, lineHeight: 20 },
  dailyCta: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', marginTop: 8 },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: AppColors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  seeAll: { color: ACCENT, fontWeight: '700', fontSize: 14 },
  popularScrollOuter: { flexGrow: 0 },
  popularScroll: { gap: CARD_GAP, paddingRight: Spacing.sm },
  popularCard: {
    width: 132,
    backgroundColor: CARD_DARK,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    padding: Spacing.sm + 2,
  },
  popularIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: CARD_ELEV,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  popularName: { color: AppColors.text, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  popularLive: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.success,
  },
  popularLiveText: { color: AppColors.muted, fontSize: 11, fontWeight: '600' },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_DARK,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: Spacing.xs,
  },
  statMini: { flex: 1, alignItems: 'center', gap: 2 },
  statMiniBorder: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.08)',
  },
  statMiniValue: { color: AppColors.text, fontSize: 15, fontWeight: '800' },
  statMiniLabel: { color: AppColors.muted, fontSize: 10, fontWeight: '600' },
  pressed: { opacity: 0.92 },
});
