import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BaseCard } from '@/components/base-card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';

type Room = {
  id: string;
  code: string;
  players: string[];
  board: (string | null)[];
  turn: string;
  winner: string | null;
};

export default function LobbyScreen() {
  const router = useRouter();
  const { roomId, roomCode, mySymbol } = useLocalSearchParams<{
    roomId?: string;
    roomCode?: string;
    mySymbol?: string;
  }>();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    if (roomId === 'local') {
      setRoom({
        id: 'local',
        code: (roomCode as string) ?? '',
        players: [(mySymbol as string) ?? 'X'],
        board: [null, null, null, null, null, null, null, null, null],
        turn: 'X',
        winner: null,
      });
      setLoading(false);
      return;
    }

    const loadRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, code, players, board, turn, winner')
        .eq('id', roomId)
        .single();

      if (!error && data) {
        setRoom({
          id: data.id,
          code: data.code ?? '',
          players: (data.players as string[]) ?? [],
          board: (data.board as (string | null)[]) ?? [],
          turn: data.turn ?? 'X',
          winner: data.winner,
        });
      }
      setLoading(false);
    };

    loadRoom();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const r = payload.new as Room;
          if (r) {
            setRoom({
              id: r.id,
              code: r.code ?? '',
              players: (r.players as string[]) ?? [],
              board: (r.board as (string | null)[]) ?? [],
              turn: r.turn ?? 'X',
              winner: r.winner,
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, roomCode, mySymbol]);

  const players = room?.players ?? [];
  const isLocal = roomId === 'local';
  const canStart = isLocal ? true : players.length >= 2;

  const handleStartGame = () => {
    if (!roomId || !mySymbol) return;
    router.replace({
      pathname: '/(tabs)/explore/tictactoe',
      params: { roomId, mySymbol },
    });
  };

  const handleBack = () => router.back();

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!room) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={[styles.container, styles.centered]}>
          <ThemedText>Room not found.</ThemedText>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ThemedText style={styles.linkText}>Go back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const displayPlayers = players.map((p) => (p === mySymbol ? 'You' : p));
  while (displayPlayers.length < 2) {
    displayPlayers.push('Waiting for player...');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Game Lobby
          </ThemedText>
        </View>

        <BaseCard>
          <View style={styles.roomCodeWrap}>
            <ThemedText
              style={styles.roomCodeLabel}
              lightColor={Colors.light.icon}
              darkColor={Colors.dark.icon}
            >
              Room Code
            </ThemedText>
            <ThemedText style={styles.roomCode}>{room.code}</ThemedText>
            <ThemedText
              style={styles.roomCodeHint}
              lightColor={Colors.light.icon}
              darkColor={Colors.dark.icon}
            >
              Share this code with your friend to join
            </ThemedText>
          </View>
        </BaseCard>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Players
          </ThemedText>
          {displayPlayers.map((player, index) => (
            <BaseCard key={index}>
              <View style={styles.playerRow}>
                <Avatar size="small" initials={player === 'You' ? 'Y' : '?'} />
                <ThemedText style={styles.playerName}>{player}</ThemedText>
              </View>
            </BaseCard>
          ))}
        </View>

        <View style={styles.statusWrap}>
          <View style={styles.statusDot} />
          <ThemedText
            style={styles.statusText}
            lightColor={Colors.light.icon}
            darkColor={Colors.dark.icon}
          >
            Waiting for players...
          </ThemedText>
        </View>

        {/* Prominent Start Game CTA */}
        <PrimaryButton
          label="Start Game"
          onPress={handleStartGame}
          disabled={!canStart}
          style={styles.startButton}
        />
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
  centered: { justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  linkText: { color: Colors.dark.tint, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {},
  backBtn: { marginRight: Spacing.sm },
  title: { fontSize: 20 },
  roomCodeWrap: { alignItems: 'center' },
  roomCodeLabel: { fontSize: 14, marginBottom: Spacing.xs },
  roomCode: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: Spacing.xs,
  },
  roomCodeHint: { fontSize: 13 },
  section: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, marginBottom: Spacing.sm },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: { fontSize: 16, marginLeft: Spacing.sm },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.accentYellow,
  },
  statusText: { fontSize: 14 },
  startButton: {
    minHeight: 56,
    paddingVertical: Spacing.sm,
  },
});
