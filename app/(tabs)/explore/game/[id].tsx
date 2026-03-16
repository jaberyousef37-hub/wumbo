import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

const GAME_CONFIG: Record<
  string,
  { name: string; description: string; players: string }
> = {
  chess: {
    name: 'Chess',
    description:
      'Classic strategy game where you develop pieces, control the center, and checkmate the king.',
    players: '2 players',
  },
  trivia: {
    name: 'Trivia',
    description:
      'Answer questions from different categories and see who knows the most.',
    players: '1–6 players',
  },
  uno: {
    name: 'UNO',
    description:
      'Match colors and numbers, play action cards, and be the first to get rid of all your cards.',
    players: '2–6 players',
  },
  bs: {
    name: 'BS',
    description:
      'Play cards face down, bluff your way through, and call BS when you think someone is lying.',
    players: '3–6 players',
  },
};

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const game = id ? GAME_CONFIG[id] : undefined;

  if (!game) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedText>Game not found.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Games</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {game.name}
          </ThemedText>
          <ThemedText
            style={styles.description}
            lightColor={Colors.light.icon}
            darkColor={Colors.dark.icon}
          >
            {game.description}
          </ThemedText>

          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Player count</ThemedText>
            <ThemedText style={styles.infoValue}>{game.players}</ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            activeOpacity={0.8}
            onPress={() => router.push(`/(tabs)/explore/game/${id}/create-room`)}
          >
            <ThemedText style={styles.primaryText}>Create Room</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            activeOpacity={0.8}
            onPress={() => router.push(`/(tabs)/explore/game/${id}/join-room`)}
          >
            <ThemedText style={styles.secondaryText}>Join Room</ThemedText>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 8,
  },
  backText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  infoLabel: {
    fontSize: 15,
    opacity: 0.9,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.dark.tint,
  },
  primaryText: {
    color: Colors.dark.background,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

