import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

const CARD_GAMES = [
  {
    id: 'uno',
    name: 'UNO',
    description: 'Match colors and numbers. Empty your hand first.',
    players: '2–6 players',
    icon: '🃏',
    accent: '#F6E05E', // yellow
  },
  {
    id: 'bs',
    name: 'BS',
    description: 'Bluff, call BS, and get rid of your cards.',
    players: '3–6 players',
    icon: '🤥',
    accent: '#FC8181', // red
  },
];

const BOARD_GAMES = [
  {
    id: 'chess',
    name: 'Chess',
    description: 'Classic strategy. Outsmart your opponent.',
    players: '2 players',
    icon: '♟️',
    accent: '#B794F6', // purple
  },
];

const PARTY_GAMES = [
  {
    id: 'trivia',
    name: 'Trivia',
    description: 'Test your knowledge across fun categories.',
    players: '1–6 players',
    icon: '❓',
    accent: '#68D391', // green
  },
];

export default function GamesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Games</ThemedText>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Popular Now</ThemedText>
            <ThemedView
              style={[styles.gameCard, { borderLeftColor: CARD_GAMES[0].accent }]}
              lightColor={Colors.light.card}
              darkColor={Colors.dark.card}
            >
              <View style={[styles.leftAccent, { backgroundColor: CARD_GAMES[0].accent }]} />
              <View style={styles.rowContent}>
                <View style={styles.gameIcon}>
                  <ThemedText style={styles.emoji}>{CARD_GAMES[0].icon}</ThemedText>
                </View>
                <View style={styles.gameContent}>
                  <ThemedText type="subtitle" style={styles.gameName}>
                    {CARD_GAMES[0].name}
                  </ThemedText>
                  <ThemedText
                    style={styles.subtitle}
                    lightColor={Colors.light.icon}
                    darkColor={Colors.dark.icon}
                    numberOfLines={2}
                  >
                    {CARD_GAMES[0].description}
                  </ThemedText>
                  <ThemedText style={styles.players}>{CARD_GAMES[0].players}</ThemedText>
                </View>
              </View>
              <TouchableOpacity
                style={styles.playButton}
                activeOpacity={0.7}
                onPress={() =>
                  router.push(`/(tabs)/explore/game/${CARD_GAMES[0].id}/create-room`)
                }
              >
                <ThemedText style={styles.playText}>Play</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Card Games</ThemedText>
            {CARD_GAMES.map((game) => (
              <ThemedView
                key={game.id}
                style={[styles.gameCard, { borderLeftColor: game.accent }]}
                lightColor={Colors.light.card}
                darkColor={Colors.dark.card}
              >
                <View style={[styles.leftAccent, { backgroundColor: game.accent }]} />
                <View style={styles.rowContent}>
                  <View style={styles.gameIcon}>
                    <ThemedText style={styles.emoji}>{game.icon}</ThemedText>
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
                      {game.description}
                    </ThemedText>
                    <ThemedText style={styles.players}>{game.players}</ThemedText>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.playButton}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(tabs)/explore/game/${game.id}/create-room`)}
                >
                  <ThemedText style={styles.playText}>Play</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            ))}
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Board Games</ThemedText>
            {BOARD_GAMES.map((game) => (
              <ThemedView
                key={game.id}
                style={[styles.gameCard, { borderLeftColor: game.accent }]}
                lightColor={Colors.light.card}
                darkColor={Colors.dark.card}
              >
                <View style={[styles.leftAccent, { backgroundColor: game.accent }]} />
                <View style={styles.rowContent}>
                  <View style={styles.gameIcon}>
                    <ThemedText style={styles.emoji}>{game.icon}</ThemedText>
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
                      {game.description}
                    </ThemedText>
                    <ThemedText style={styles.players}>{game.players}</ThemedText>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.playButton}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(tabs)/explore/game/${game.id}/create-room`)}
                >
                  <ThemedText style={styles.playText}>Play</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            ))}
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Party Games</ThemedText>
            {PARTY_GAMES.map((game) => (
              <ThemedView
                key={game.id}
                style={[styles.gameCard, { borderLeftColor: game.accent }]}
                lightColor={Colors.light.card}
                darkColor={Colors.dark.card}
              >
                <View style={[styles.leftAccent, { backgroundColor: game.accent }]} />
                <View style={styles.rowContent}>
                  <View style={styles.gameIcon}>
                    <ThemedText style={styles.emoji}>{game.icon}</ThemedText>
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
                      {game.description}
                    </ThemedText>
                    <ThemedText style={styles.players}>{game.players}</ThemedText>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.playButton}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(tabs)/explore/game/${game.id}/create-room`)}
                >
                  <ThemedText style={styles.playText}>Play</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            ))}
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    borderLeftWidth: 4,
    backgroundColor: Colors.dark.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.23,
    shadowRadius: 4.62,
    elevation: 4,
  },
  leftAccent: {
    width: 4,
    borderRadius: 999,
    marginRight: 12,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(183, 148, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  emoji: {
    fontSize: 26,
  },
  gameContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  gameName: {
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.9,
  },
  players: {
    fontSize: 13,
    opacity: 0.9,
    marginTop: 8,
  },
  playButton: {
    backgroundColor: Colors.dark.tint,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    marginLeft: 12,
  },
  playText: {
    color: Colors.dark.background,
    fontSize: 15,
    fontWeight: '600',
  },
});

