import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BaseCard } from '@/components/base-card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';

const GAME_ICONS: Record<string, string> = {
  uno: '🃏',
  bs: '🃏',
  chess: '♟️',
};

const OPEN_ROOMS = [
  { id: 'r1', game: 'UNO', gameId: 'uno', code: '4832', players: 3, maxPlayers: 6 },
  { id: 'r2', game: 'BS', gameId: 'bs', code: '9174', players: 4, maxPlayers: 6 },
  { id: 'r3', game: 'Chess', gameId: 'chess', code: '1209', players: 1, maxPlayers: 2 },
];

const ONLINE_PLAYERS = [
  { id: 'u1', name: 'Alex', favoriteGame: 'UNO', status: 'Online' },
  { id: 'u2', name: 'Jordan', favoriteGame: 'Chess', status: 'In lobby' },
  { id: 'u3', name: 'Sam', favoriteGame: 'BS', status: 'Online' },
  { id: 'u4', name: 'Riley', favoriteGame: 'Trivia', status: 'In game' },
];

const LEADERBOARD = [
  { rank: 1, name: 'Luna Star', wins: 156, winRate: 87 },
  { rank: 2, name: 'Max Power', wins: 142, winRate: 86 },
  { rank: 3, name: 'Zara Swift', wins: 128, winRate: 85 },
  { rank: 4, name: 'Leo Knight', wins: 115, winRate: 82 },
  { rank: 5, name: 'Aria Bloom', wins: 98, winRate: 82 },
];

const PLAYERS_ONLINE = 127;

export default function RoomsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        <View style={[styles.hero, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <ThemedText type="title" style={styles.heroTitle}>
            Find Your Game
          </ThemedText>
          <ThemedText
            style={styles.heroSubtitle}
            lightColor={Colors.light.icon}
            darkColor={Colors.dark.icon}
          >
            Join rooms or match with players
          </ThemedText>
          <View style={[styles.playersBadge, { backgroundColor: palette.tint }]}>
            <View style={styles.playersDot} />
            <ThemedText style={styles.playersText} darkColor="#fff">
              {PLAYERS_ONLINE} players online
            </ThemedText>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Leaderboard
            </ThemedText>
            {LEADERBOARD.map((player) => (
              <BaseCard key={player.rank} showChevron onPress={() => {}}>
                <View style={styles.leaderboardRow}>
                  <Avatar
                    initials={player.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    size="small"
                  />
                  <View style={styles.leaderboardInfo}>
                    <ThemedText style={styles.leaderboardName}>{player.name}</ThemedText>
                    <ThemedText
                      style={styles.leaderboardMeta}
                      lightColor={Colors.light.icon}
                      darkColor={Colors.dark.icon}
                    >
                      {player.wins} wins · {player.winRate}% win rate
                    </ThemedText>
                  </View>
                </View>
              </BaseCard>
            ))}
          </View>

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Random Match
            </ThemedText>
            <PrimaryButton label="Find Random Match" onPress={() => {}} />
          </View>

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Join Public Room
            </ThemedText>
            {OPEN_ROOMS.map((room) => {
              const emoji = GAME_ICONS[room.gameId] ?? '🎮';
              return (
                <BaseCard
                  key={room.id}
                  showChevron
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/explore/join-room',
                      params: { code: room.code },
                    })
                  }
                >
                  <View style={styles.roomRow}>
                    <View style={styles.roomIcon}>
                      <ThemedText style={styles.roomEmoji}>{emoji}</ThemedText>
                    </View>
                    <View style={styles.roomInfo}>
                      <ThemedText type="subtitle" style={styles.roomGame}>
                        {room.game}
                      </ThemedText>
                      <ThemedText
                        style={styles.roomMeta}
                        lightColor={Colors.light.icon}
                        darkColor={Colors.dark.icon}
                      >
                        Code {room.code} · {room.players}/{room.maxPlayers} players
                      </ThemedText>
                    </View>
                  </View>
                </BaseCard>
              );
            })}
          </View>

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Create Private Room
            </ThemedText>
            <PrimaryButton
              label="Start New Private UNO Room"
              onPress={() => router.push('/(tabs)/explore/tictactoe-details')}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Online Players
            </ThemedText>
            {ONLINE_PLAYERS.map((player) => (
              <BaseCard key={player.id} showChevron onPress={() => {}}>
                <View style={styles.playerRow}>
                  <Avatar initials={player.name} size="small" />
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
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          player.status === 'Online'
                            ? 'rgba(72, 187, 120, 0.2)'
                            : player.status === 'In lobby'
                              ? 'rgba(246, 224, 94, 0.2)'
                              : 'rgba(245, 101, 101, 0.2)',
                      },
                    ]}
                  >
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
                </View>
              </BaseCard>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  hero: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  heroTitle: { marginBottom: Spacing.xs },
  heroSubtitle: { fontSize: 15, marginBottom: Spacing.sm },
  playersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
  },
  playersDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#68D391',
  },
  playersText: { fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: 16, marginBottom: Spacing.xs },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  leaderboardInfo: { flex: 1, marginLeft: Spacing.sm },
  leaderboardName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  leaderboardMeta: { fontSize: 13 },
  roomRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(183, 148, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  roomEmoji: { fontSize: 24 },
  roomInfo: { flex: 1 },
  roomGame: { marginBottom: 2 },
  roomMeta: { fontSize: 13 },
  playerRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  playerInfo: { flex: 1, marginLeft: Spacing.sm },
  playerName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  playerMeta: { fontSize: 13 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.cardBorder,
  },
  statusDotOnline: { backgroundColor: '#48BB78' },
  statusDotLobby: { backgroundColor: '#F6E05E' },
  statusDotInGame: { backgroundColor: '#F56565' },
  statusText: { fontSize: 12, fontWeight: '600' },
});
