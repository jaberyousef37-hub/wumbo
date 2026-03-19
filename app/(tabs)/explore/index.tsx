import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BaseCard } from '@/components/base-card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';

const GAMES = [
  {
    id: '1',
    name: 'Chess',
    emoji: '♟️',
    subtitle: 'Classic strategy. Outsmart your opponent.',
  },
  {
    id: '2',
    name: 'Uno',
    emoji: '🃏',
    subtitle: 'Match colors and numbers. First to empty your hand wins.',
  },
  {
    id: '3',
    name: 'Trivia',
    emoji: '❓',
    subtitle: 'Test your knowledge across categories.',
  },
  {
    id: '4',
    name: 'Tic Tac Toe',
    emoji: '⭕',
    subtitle: 'Get three in a row. Quick and fun.',
  },
];

const FEATURED_GAME = GAMES[0];

function GameCard({ game, index }: { game: (typeof GAMES)[0]; index: number }) {
  const router = useRouter();

  const handlePress = () => {
    if (game.id === '1') router.push('/(tabs)/explore/chess');
    else if (game.id === '2') router.push('/(tabs)/explore/uno');
    else if (game.id === '3') router.push('/(tabs)/explore/trivia');
    else if (game.id === '4') router.push('/(tabs)/explore/tictactoe-details');
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify().damping(16)}>
      <BaseCard onPress={handlePress} showChevron>
        <View style={styles.gameRow}>
          <View style={styles.gameIcon}>
            <ThemedText style={styles.emoji}>{game.emoji}</ThemedText>
          </View>
          <View style={styles.gameContent}>
            <ThemedText type="subtitle" style={styles.gameName}>
              {game.name}
            </ThemedText>
            <ThemedText
              style={styles.subtitle}
              lightColor={Colors.light.icon}
              darkColor={Colors.dark.icon}
              numberOfLines={2}
            >
              {game.subtitle}
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    </Animated.View>
  );
}

export default function GamesScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Games</ThemedText>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* FEATURED GAME — dominates the screen */}
          <Animated.View entering={FadeInDown.delay(0).springify().damping(16)}>
            <Pressable
              onPress={() => router.push('/(tabs)/explore/chess')}
              style={({ pressed }) => [
                styles.featuredCard,
                { backgroundColor: palette.tint },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.featuredContent}>
                <View style={styles.featuredIcon}>
                  <ThemedText style={styles.featuredEmoji}>{FEATURED_GAME.emoji}</ThemedText>
                </View>
                <View style={styles.featuredText}>
                  <ThemedText style={styles.featuredLabel}>Featured Game</ThemedText>
                  <ThemedText style={styles.featuredName}>{FEATURED_GAME.name}</ThemedText>
                  <ThemedText style={styles.featuredSubtitle}>
                    {FEATURED_GAME.subtitle}
                  </ThemedText>
                  <PrimaryButton
                    label="Play Now"
                    onPress={() => router.push('/(tabs)/explore/chess')}
                    variant="inverted"
                    style={styles.featuredButton}
                  />
                </View>
              </View>
            </Pressable>
          </Animated.View>

          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            All Games
          </ThemedText>
          {GAMES.map((game, index) => (
            <GameCard key={game.id} game={game} index={index + 1} />
          ))}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  featuredCard: {
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredIcon: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featuredEmoji: { fontSize: 48 },
  featuredText: { flex: 1 },
  featuredLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  featuredName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  featuredSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  featuredButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(183, 148, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  emoji: { fontSize: 28 },
  gameContent: { flex: 1, minWidth: 0 },
  gameName: { marginBottom: Spacing.xs },
  subtitle: { fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.95 },
});
