import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BaseCard } from '@/components/base-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { insertRoomRow } from '@/lib/supabase-rooms';
import { generateRoomCode, generateGuestName } from '@/lib/room-utils';

const GAMES = [
  { id: 'tictactoe', emoji: '⭕', name: 'Tic Tac Toe' },
  { id: 'chess', emoji: '♟️', name: 'Chess' },
  { id: 'uno', emoji: '🃏', name: 'UNO' },
  { id: 'trivia', emoji: '❓', name: 'Trivia' },
];

export default function CreateRoomScreen() {
  const router = useRouter();
  const { challengeGame, challengeCode, challengeFriend } = useLocalSearchParams<{
    challengeGame?: string;
    challengeCode?: string;
    challengeFriend?: string;
  }>();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const [creating, setCreating] = useState(false);
  const challengeStarted = useRef(false);

  const handleCreateRoom = async (gameType: string, codeOverride?: string) => {
    setCreating(true);
    const code = codeOverride ?? generateRoomCode();
    const hostName = generateGuestName();
    const players: string[] = [hostName];

    try {
      const { data, error } = await insertRoomRow({
        code,
        game_type: gameType,
        host_name: hostName,
        players,
      });

      if (error) throw error;
      if (!data?.id) throw new Error('No room id returned');

      router.replace({
        pathname: '/(tabs)/play/lobby',
        params: {
          roomId: data.id,
          roomCode: code,
          gameType,
          myName: hostName,
          isHost: '1',
          challengeFriend: challengeFriend ?? undefined,
        },
      });
    } catch (e) {
      console.error('[CreateRoom] Supabase failed:', e);
      // Fallback: local room
      router.replace({
        pathname: '/(tabs)/play/lobby',
        params: {
          roomId: 'local',
          roomCode: code,
          gameType,
          myName: hostName,
          isHost: '1',
          challengeFriend: challengeFriend ?? undefined,
        },
      });
    } finally {
      setCreating(false);
    }
  };

  // When coming from Challenge to Game: auto-create room with provided code
  useEffect(() => {
    if (challengeGame && challengeCode && !challengeStarted.current) {
      challengeStarted.current = true;
      void handleCreateRoom(challengeGame, challengeCode);
    }
  }, [challengeGame, challengeCode]);

  // When challenge flow: show loading, room is being created
  if (challengeGame && challengeCode) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={[styles.container, styles.centered]}>
          <ThemedText style={[styles.creatingText, { color: palette.icon }]}>
            Creating room for {challengeFriend ?? 'your friend'}...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Create Room
          </ThemedText>
        </View>

        <ThemedText
          style={styles.subtitle}
          lightColor={Colors.light.icon}
          darkColor={Colors.dark.icon}
        >
          Pick a game to create a room
        </ThemedText>

        {GAMES.map((game) => (
          <BaseCard
            key={game.id}
            onPress={() => handleCreateRoom(game.id)}
            showChevron
            style={styles.gameCard}
          >
            <View style={styles.gameRow}>
              <ThemedText style={styles.gameEmoji}>{game.emoji}</ThemedText>
              <ThemedText type="subtitle" style={styles.gameName}>
                {game.name}
              </ThemedText>
            </View>
          </BaseCard>
        ))}

        {creating && (
          <ThemedText style={[styles.creatingText, { color: palette.icon }]}>
            Creating room...
          </ThemedText>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backBtn: { marginRight: Spacing.sm },
  title: { fontSize: 20 },
  subtitle: { fontSize: 15, marginBottom: Spacing.md },
  gameCard: { marginBottom: Spacing.sm },
  gameRow: { flexDirection: 'row', alignItems: 'center' },
  gameEmoji: { fontSize: 28, marginRight: Spacing.sm },
  gameName: { flex: 1 },
  creatingText: { fontSize: 14, marginTop: Spacing.sm, textAlign: 'center' },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
});
