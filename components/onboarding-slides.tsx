import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useOnboarding } from '@/contexts/onboarding-context';
import { useTheme } from '@/contexts/theme-context';
import { AppColors, Colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getSlides(palette: typeof Colors.dark) {
  return [
    {
      id: '1',
      title: 'Welcome to Wumbo',
      gradient: [palette.background, palette.card, palette.cardBorder] as const,
    },
    {
      id: '2',
      title: 'Play Games with Friends',
      gradient: [palette.card, palette.cardBorder, palette.tint] as const,
      gameIcons: ['⭕', '🃏', '♟️', '❓'],
    },
    {
      id: '3',
      title: 'Compete & Win',
      gradient: [palette.cardBorder, palette.tint, palette.icon] as const,
      trophy: true,
    },
  ];
}

function SlideItem({
  item,
  index,
  onNext,
  isLast,
  palette,
}: {
  item: ReturnType<typeof getSlides>[0];
  index: number;
  onNext: () => void;
  isLast: boolean;
  palette: typeof Colors.dark;
}) {
  return (
    <View style={styles.slide}>
      <LinearGradient
        colors={[...item.gradient]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.slideContent}>
        {index === 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.logoWrap}>
            <LinearGradient
              colors={[palette.accentPink, palette.accentYellow, palette.accentPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Text style={[styles.logo, { color: palette.text }]}>Wumbo</Text>
            </LinearGradient>
          </Animated.View>
        )}
        {item.gameIcons && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.gameIconsRow}
          >
            {item.gameIcons.map((emoji, i) => (
              <View key={i} style={styles.gameIconWrap}>
                <Text style={styles.gameIconEmoji}>{emoji}</Text>
              </View>
            ))}
          </Animated.View>
        )}
        {item.trophy && (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.trophyWrap}>
            <Text style={styles.trophy}>🏆</Text>
          </Animated.View>
        )}
        <Text style={[styles.slideTitle, { color: palette.text }]}>{item.title}</Text>
      </View>

      <Pressable onPress={onNext} style={styles.nextBtn}>
        <LinearGradient
          colors={[palette.accentPink, palette.accentYellow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.nextBtnGradient}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export default function OnboardingSlides() {
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const SLIDES = React.useMemo(() => getSlides(palette), [palette]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = React.useRef<FlatList>(null);

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex((i) => i + 1);
    } else {
      completeOnboarding();
      router.replace('/profile-setup');
    }
  }, [currentIndex, completeOnboarding, router]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const idx = viewableItems[0]?.index;
      if (idx != null) setCurrentIndex(idx);
    },
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SlideItem
            item={item}
            index={index}
            onNext={handleNext}
            isLast={index === SLIDES.length - 1}
            palette={palette}
          />
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: { marginBottom: 40 },
  logoGradient: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 24,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 3,
  },
  gameIconsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  gameIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameIconEmoji: { fontSize: 32 },
  trophyWrap: { marginBottom: 24 },
  trophy: { fontSize: 80 },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  nextBtn: {
    marginBottom: 48,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  nextBtnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.background,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 24,
    backgroundColor: AppColors.text,
  },
});
