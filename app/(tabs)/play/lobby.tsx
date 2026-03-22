import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Href } from 'expo-router';
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
import { GAME_NAMES } from '@/lib/room-utils';

type Room = {
  id: string;
  code: string;
  players: string[];
  game_type?: string;
  status?: string;
};

export default function LobbyScreen() {
  const router = useRouter();
  const { roomId, roomCode, gameType, myName, isHost, challengeFriend } = useLocalSearchParams<{
    roomId?: string;
    roomCode?: string;
    gameType?: string;
    myName?: string;
    isHost?: string;
    challengeFriend?: string;
  }>();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  const gameName = GAME_NAMES[gameType ?? 'tictactoe'] ?? gameType ?? 'Game';
  const amHost = isHost === '1';

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    if (roomId === 'local') {
      setRoom({
        id: 'local',
        code: (roomCode as string) ?? '',
        players: [(myName as string) ?? 'Guest'],
        game_type: (gameType as string) ?? 'tictactoe',
        status: 'waiting',
      });
      setLoading(false);
      return;
    }

    const loadRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, code, players, game_type, status')
        .eq('id', roomId)
        .single();

      if (!error && data) {
        setRoom({
          id: data.id,
          code: data.code ?? '',
          players: (data.players as string[]) ?? [],
          game_type: (data.game_type as string) ?? 'tictactoe',
          status: (data.status as string) ?? 'waiting',
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
              game_type: r.game_type ?? 'tictactoe',
              status: r.status ?? 'waiting',
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, roomCode, gameType, myName]);

  const players = room?.players ?? [];
  const isLocal = roomId === 'local';
  const canStart = isLocal ? players.length >= 1 : players.length >= 2;
  const waitingForPlayers = players.length < 2;

  const handleStartGame = () => {
    if (!roomId || !gameType) return;

    if (!isLocal) {
      supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId).then(() => {});
    }

    if (gameType === 'tictactoe') {
      router.replace({
        pathname: '/(tabs)/play/tictactoe',
        params: { roomId, mySymbol: amHost ? 'X' : 'O' },
      } as unknown as Href);
    } else if (gameType === 'chess') {
      router.replace('/(tabs)/play/chess' as Href);
    } else if (gameType === 'uno') {
      router.replace('/(tabs)/play/uno' as Href);
    } else if (gameType === 'trivia') {
      router.replace('/(tabs)/play/trivia' as Href);
    } else if (gameType === 'bs') {
      router.replace('/(tabs)/play/bs' as Href);
    } else if (gameType === 'shell') {
      router.replace('/(tabs)/play/shell-game' as Href);
    } else if (gameType === 'snake') {
      router.replace('/(tabs)/play/snake' as Href);
    } else {
      router.replace('/(tabs)/play/tictactoe' as Href);
    }
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
            <ThemedText style={[styles.linkText, { color: palette.tint }]}>Go back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
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

        {/* Room code big at top */}
        <View style={[styles.codeCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <ThemedText
            style={styles.codeLabel}
            lightColor={Colors.light.icon}
            darkColor={Colors.dark.icon}
          >
            Room Code
          </ThemedText>
          <ThemedText style={[styles.roomCode, { color: palette.tint }]}>{room.code}</ThemedText>
          <ThemedText
            style={styles.codeHint}
            lightColor={Colors.light.icon}
            darkColor={Colors.dark.icon}
          >
            Share this code with friends to join
          </ThemedText>
        </View>

        <ThemedText
          style={[styles.gameName, { color: palette.text }]}
        >
          {gameName}
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Players
          </ThemedText>
          {players.map((name, index) => (
            <BaseCard key={index}>
              <View style={styles.playerRow}>
                <Avatar
                  size="small"
                  initials={name === myName ? 'You' : name.slice(0, 2).toUpperCase()}
                />
                <ThemedText style={styles.playerName}>
                  {name === myName ? 'You' : name}
                  {amHost && index === 0 && (
                    <ThemedText
                      style={[styles.hostBadge, { color: palette.tint }]}
                    >
                      {' '}(Host)
                    </ThemedText>
                  )}
                </ThemedText>
              </View>
            </BaseCard>
          ))}
        </View>

        {challengeFriend && (
          <Pressable
            onPress={() => router.push('/(tabs)/chat')}
            style={[styles.sendToChatBtn, { backgroundColor: palette.tint }]}
          >
            <MaterialIcons name="message" size={20} color="#fff" />
            <ThemedText style={styles.sendToChatText}>
              Send code to {challengeFriend} via Chat
            </ThemedText>
          </Pressable>
        )}

        <View style={styles.statusWrap}>
          <View style={[styles.statusDot, { backgroundColor: palette.accentYellow }]} />
          <ThemedText
            style={styles.statusText}
            lightColor={Colors.light.icon}
            darkColor={Colors.dark.icon}
          >
            {waitingForPlayers ? 'Waiting for players...' : 'Ready to start!'}
          </ThemedText>
        </View>

        {amHost && (
          <PrimaryButton
            label="Start Game"
            onPress={handleStartGame}
            disabled={!canStart}
            style={styles.startButton}
          />
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
  centered: { justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  linkText: { fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {},
  backBtn: { marginRight: Spacing.sm },
  title: { fontSize: 20 },
  codeCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  codeLabel: { fontSize: 14, marginBottom: Spacing.xs },
  roomCode: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 8,
    marginBottom: Spacing.xs,
  },
  codeHint: { fontSize: 13 },
  gameName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  section: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, marginBottom: Spacing.sm },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: { fontSize: 16, marginLeft: Spacing.sm },
  hostBadge: { fontSize: 14, fontWeight: '600' },
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
  },
  statusText: { fontSize: 14 },
  sendToChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  sendToChatText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  startButton: {
    minHeight: 56,
    paddingVertical: Spacing.sm,
  },
});
