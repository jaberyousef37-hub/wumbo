import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOnboarding } from '@/contexts/onboarding-context';
import { AppColors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NINE_GAME_ICONS: { icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { icon: 'casino' },
  { icon: 'style' },
  { icon: 'emoji-events' },
  { icon: 'grid-3x3' },
  { icon: 'timeline' },
  { icon: 'quiz' },
  { icon: 'local-bar' },
  { icon: 'compare-arrows' },
  { icon: 'games' },
];

type Slide = { id: string };

const SLIDE_META: Slide[] = [{ id: '1' }, { id: '2' }, { id: '3' }];

const ICON_FLOAT_MS = 1200;
const FADE_DURATION = 520;

/** Gentle vertical float for hero + grid icons */
function FloatingIcon({ children }: { children: ReactNode }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withTiming(-6, { duration: ICON_FLOAT_MS }), -1, true);
  }, [y]);
  const motion = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={motion}>{children}</Animated.View>;
}

function SlideVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <View style={styles.visualBlock}>
        <FloatingIcon>
          <Text style={styles.heroEmoji}>🎮</Text>
        </FloatingIcon>
        <Animated.View entering={FadeIn.duration(FADE_DURATION).delay(100)} style={styles.fadeWrap}>
          <Text style={styles.slideTitle}>Play 9 Games</Text>
        </Animated.View>
        <Animated.View entering={FadeIn.duration(FADE_DURATION).delay(200)} style={styles.fadeWrap}>
          <Text style={styles.slideSub}>Card classics, boards, party modes — all in one app.</Text>
        </Animated.View>
        <View style={styles.iconGrid}>
          {NINE_GAME_ICONS.map((g, i) => (
            <View key={i} style={styles.iconCell}>
              <FloatingIcon>
                <MaterialIcons name={g.icon} size={26} color="#E9D5FF" />
              </FloatingIcon>
            </View>
          ))}
        </View>
      </View>
    );
  }
  if (index === 1) {
    return (
      <View style={styles.visualBlock}>
        <FloatingIcon>
          <Text style={styles.heroEmoji}>💬</Text>
        </FloatingIcon>
        <Animated.View entering={FadeIn.duration(FADE_DURATION).delay(100)} style={styles.fadeWrap}>
          <Text style={styles.slideTitle}>Chat & Challenge</Text>
        </Animated.View>
        <Animated.View entering={FadeIn.duration(FADE_DURATION).delay(200)} style={styles.fadeWrap}>
          <Text style={styles.slideSub}>Drop invites with room codes — tap to jump in.</Text>
        </Animated.View>
        <View style={styles.chatMock}>
          <View style={styles.bubbleLeft}>
            <Text style={styles.bubbleLeftText}>Trivia rematch? 🎯</Text>
          </View>
          <LinearGradient
            colors={['#9333EA', '#581C87']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.inviteBubble}
          >
            <Text style={styles.inviteEmoji}>❓</Text>
            <Text style={styles.inviteTitle}>Trivia</Text>
            <Text style={styles.inviteCode}>Room code · 4821</Text>
            <View style={styles.inviteFakeBtn}>
              <Text style={styles.inviteFakeBtnText}>Accept Challenge</Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.visualBlock}>
      <FloatingIcon>
        <Text style={styles.heroEmoji}>🏆</Text>
      </FloatingIcon>
      <Animated.View entering={FadeIn.duration(FADE_DURATION).delay(100)} style={styles.fadeWrap}>
        <Text style={styles.slideTitle}>Earn & Compete</Text>
      </Animated.View>
      <Animated.View entering={FadeIn.duration(FADE_DURATION).delay(200)} style={styles.fadeWrap}>
        <Text style={styles.slideSub}>Stack XP, collect coins, climb the board.</Text>
      </Animated.View>
      <View style={styles.leaderCard}>
        <Text style={styles.leaderHead}>Leaderboard</Text>
        {[
          { rank: '1', name: 'You', xp: '2,400 XP' },
          { rank: '2', name: 'Alex', xp: '2,100 XP' },
          { rank: '3', name: 'Sam', xp: '1,980 XP' },
        ].map((row) => (
          <View key={row.rank} style={styles.leaderRow}>
            <Text style={styles.leaderRank}>{row.rank}</Text>
            <Text style={styles.leaderName}>{row.name}</Text>
            <Text style={styles.leaderXp}>{row.xp}</Text>
          </View>
        ))}
        <View style={styles.coinsRow}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinsLabel}>Coins unlock cosmetics in the shop</Text>
        </View>
      </View>
    </View>
  );
}

export default function OnboardingSlides() {
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const finish = useCallback(() => {
    completeOnboarding();
    router.replace('/(tabs)/home');
  }, [completeOnboarding, router]);

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDE_META.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex((i) => i + 1);
    } else {
      finish();
    }
  }, [currentIndex, finish]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const idx = viewableItems[0]?.index;
      if (idx != null) setCurrentIndex(idx);
    },
    []
  );

  const viewabilityConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 50 }), []);

  const renderItem = useCallback(
    ({ index }: { item: Slide; index: number }) => (
      <View style={styles.slide}>
        <LinearGradient colors={['#1e0b3d', '#0f0520']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeSlide} edges={['top']}>
          <View style={styles.topBar}>
            <View style={styles.topSpacer} />
            <Pressable onPress={finish} hitSlop={12} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>
          <View style={styles.slideBody}>
            <SlideVisual index={index} />
          </View>
          <Animated.View entering={FadeIn.duration(FADE_DURATION).delay(280)} style={styles.nextBtnWrap}>
            <Pressable onPress={handleNext} style={styles.nextBtn}>
              <LinearGradient
                colors={[AppColors.tint, '#A78BFA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextGradient}
              >
                <Text style={styles.nextText}>{index === SLIDE_META.length - 1 ? 'Get Started' : 'Next'}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    ),
    [finish, handleNext]
  );

  return (
    <View style={styles.root}>
      <FlatList
        ref={flatListRef}
        data={SLIDE_META}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
      <View style={styles.dots}>
        {SLIDE_META.map((s, i) => (
          <View key={s.id} style={[styles.dot, i === currentIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0520' },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  safeSlide: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topSpacer: { flex: 1 },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  skipText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600' },
  slideBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  visualBlock: { alignItems: 'center' },
  fadeWrap: { width: '100%', alignItems: 'center' },
  nextBtnWrap: {
    marginHorizontal: 28,
    marginBottom: 28,
    alignSelf: 'stretch',
  },
  heroEmoji: { fontSize: 56, marginBottom: 16 },
  slideTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  slideSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    maxWidth: 320,
  },
  iconCell: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMock: { width: '100%', maxWidth: 320, gap: 12 },
  bubbleLeft: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    maxWidth: '85%',
  },
  bubbleLeftText: { color: '#fff', fontSize: 15 },
  inviteBubble: {
    alignSelf: 'flex-end',
    borderRadius: 18,
    padding: 14,
    minWidth: 220,
    maxWidth: '92%',
  },
  inviteEmoji: { fontSize: 28, textAlign: 'center', marginBottom: 4 },
  inviteTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  inviteCode: { color: 'rgba(255,255,255,0.88)', fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 12 },
  inviteFakeBtn: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  inviteFakeBtnText: { color: '#111', fontWeight: '800', fontSize: 15 },
  leaderCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  leaderHead: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 12 },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  leaderRank: { color: AppColors.tint, width: 28, fontWeight: '800' },
  leaderName: { color: '#fff', flex: 1, fontWeight: '600' },
  leaderXp: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  coinsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  coinEmoji: { fontSize: 22 },
  coinsLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1, lineHeight: 18 },
  nextBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextGradient: { paddingVertical: 16, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  dots: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#fff',
  },
});
