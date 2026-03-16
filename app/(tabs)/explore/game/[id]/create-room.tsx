import React, { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

const GAME_NAMES: Record<string, string> = {
  uno: 'UNO',
  bs: 'BS',
  tarneeb: 'Tarneeb',
  chess: 'Chess',
  trivia: 'Trivia',
};

function generateRoomCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return String(num);
}

export default function CreateRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const gameName = id ? GAME_NAMES[id] ?? 'Game' : 'Game';
  const roomCode = useMemo(() => generateRoomCode(), []);

  const slots = ['You', 'Waiting for player 2…', 'Waiting for player 3…', 'Waiting for player 4…'];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Back</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Room Lobby
          </ThemedText>
          <ThemedText style={styles.gameLabel}>Game</ThemedText>
          <ThemedText style={styles.gameName}>{gameName}</ThemedText>

          <View style={styles.codeCard}>
            <ThemedText
              style={styles.codeLabel}
              lightColor={Colors.light.icon}
              darkColor={Colors.dark.icon}
            >
              Room code
            </ThemedText>
            <ThemedText style={styles.codeValue}>{roomCode}</ThemedText>
          </View>

          <View style={styles.playersCard}>
            <ThemedText style={styles.playersTitle}>Players</ThemedText>
            {slots.map((label) => (
              <View key={label} style={styles.playerRow}>
                <View style={styles.playerAvatar}>
                  <ThemedText style={styles.playerAvatarText}>
                    {label === 'You' ? 'Y' : '?'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.playerLabel}>{label}</ThemedText>
              </View>
            ))}
            <ThemedText
              style={styles.waitingText}
              lightColor={Colors.light.icon}
              darkColor={Colors.dark.icon}
            >
              Waiting for players to join…
            </ThemedText>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.leaveButton}
              activeOpacity={0.8}
              onPress={() => router.back()}
            >
              <ThemedText style={styles.leaveText}>Leave Room</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.startButton}
              activeOpacity={0.8}
              onPress={() => {
                // Placeholder: starting the game would go here
              }}
            >
              <ThemedText style={styles.startText}>Start Game</ThemedText>
            </TouchableOpacity>
          </View>
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
    gap: 16,
  },
  title: {
    marginBottom: 4,
  },
  gameLabel: {
    fontSize: 13,
    opacity: 0.9,
  },
  gameName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  codeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
    padding: 16,
  },
  codeLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  codeValue: {
    fontSize: 28,
    letterSpacing: 4,
    fontWeight: '700',
  },
  playersCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
    padding: 16,
    marginTop: 4,
  },
  playersTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.tint,
    marginRight: 10,
  },
  playerAvatarText: {
    color: Colors.dark.background,
    fontWeight: '700',
  },
  playerLabel: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  waitingText: {
    marginTop: 10,
    fontSize: 13,
    opacity: 0.9,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  leaveButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
    paddingVertical: 14,
    alignItems: 'center',
  },
  leaveText: {
    fontSize: 16,
    fontWeight: '500',
  },
  startButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#F6E05E',
    paddingVertical: 14,
    alignItems: 'center',
  },
  startText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A0A2E',
  },
});

