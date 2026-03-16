import React from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

const OPEN_ROOMS = [
  {
    id: 'r1',
    game: 'UNO',
    gameId: 'uno',
    code: '4832',
    players: 3,
    maxPlayers: 6,
  },
  {
    id: 'r2',
    game: 'BS',
    gameId: 'bs',
    code: '9174',
    players: 4,
    maxPlayers: 6,
  },
  {
    id: 'r3',
    game: 'Chess',
    gameId: 'chess',
    code: '1209',
    players: 1,
    maxPlayers: 2,
  },
];

const ONLINE_PLAYERS = [
  { id: 'u1', name: 'Alex', favoriteGame: 'UNO', status: 'Online' },
  { id: 'u2', name: 'Jordan', favoriteGame: 'Chess', status: 'In lobby' },
  { id: 'u3', name: 'Sam', favoriteGame: 'BS', status: 'Online' },
  { id: 'u4', name: 'Riley', favoriteGame: 'Trivia', status: 'In game' },
];

export default function RoomsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Rooms</ThemedText>
          <ThemedText
            style={styles.subtitle}
            lightColor={Colors.light.icon}
            darkColor={Colors.dark.icon}
          >
            Meet players and jump into games.
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Random Match</ThemedText>
            <TouchableOpacity
              style={styles.actionPrimary}
              activeOpacity={0.8}
              onPress={() => {
                // Local-only placeholder: could pick a random room or game
              }}
            >
              <ThemedText style={styles.actionPrimaryText}>Find Random Match</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Join Public Room</ThemedText>
            {OPEN_ROOMS.map((room) => (
              <ThemedView
                key={room.id}
                style={styles.roomCard}
                lightColor={Colors.light.card}
                darkColor={Colors.dark.card}
              >
                <View style={styles.roomInfo}>
                  <ThemedText type="subtitle" style={styles.roomGame}>
                    {room.game}
                  </ThemedText>
                  <ThemedText style={styles.roomMeta}>
                    Code {room.code} · {room.players}/{room.maxPlayers} players
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.joinButton}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push(`/(tabs)/explore/game/${room.gameId}/create-room`)
                  }
                >
                  <ThemedText style={styles.joinButtonText}>Join</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            ))}
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Create Private Room</ThemedText>
            <TouchableOpacity
              style={styles.actionSecondary}
              activeOpacity={0.8}
              onPress={() => {
                const code = Math.floor(1000 + Math.random() * 9000).toString();
                router.push({
                  pathname: '/(tabs)/explore/game/uno/create-room',
                  params: { id: 'uno', code, players: '1' },
                });
              }}
            >
              <ThemedText style={styles.actionSecondaryText}>Start New Private UNO Room</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Online Players</ThemedText>
            {ONLINE_PLAYERS.map((player) => (
              <ThemedView
                key={player.id}
                style={styles.playerRow}
                lightColor={Colors.light.card}
                darkColor={Colors.dark.card}
              >
                <View style={styles.playerAvatar}>
                  <ThemedText style={styles.playerAvatarText}>
                    {player.name.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.playerInfo}>
                  <ThemedText style={styles.playerName}>{player.name}</ThemedText>
                  <ThemedText
                    style={styles.playerMeta}
                    lightColor={Colors.light.icon}
                    darkColor={Colors.dark.icon}
                  >
                    Likes {player.favoriteGame}
                  </ThemedText>
                </View>
                <View style={styles.statusPill}>
                  <View
                    style={[
                      styles.statusDot,
                      player.status === 'Online' && styles.statusDotOnline,
                      player.status === 'In lobby' && styles.statusDotLobby,
                      player.status === 'In game' && styles.statusDotInGame,
                    ]}
                  />
                  <ThemedText style={styles.statusText}>{player.status}</ThemedText>
                </View>
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
    paddingBottom: 12,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.9,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionPrimary: {
    flex: 1,
    backgroundColor: Colors.dark.tint,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimaryText: {
    color: Colors.dark.background,
    fontSize: 16,
    fontWeight: '600',
  },
  actionSecondary: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  roomInfo: {
    flex: 1,
  },
  roomGame: {
    marginBottom: 4,
  },
  roomMeta: {
    fontSize: 13,
    opacity: 0.9,
  },
  joinButton: {
    backgroundColor: Colors.dark.tint,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  joinButtonText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: '600',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  playerAvatarText: {
    color: Colors.dark.background,
    fontWeight: '700',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    marginBottom: 2,
  },
  playerMeta: {
    fontSize: 13,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.cardBorder,
  },
  statusDotOnline: {
    backgroundColor: '#48BB78',
  },
  statusDotLobby: {
    backgroundColor: '#F6E05E',
  },
  statusDotInGame: {
    backgroundColor: '#F56565',
  },
  statusText: {
    fontSize: 12,
  },
});

