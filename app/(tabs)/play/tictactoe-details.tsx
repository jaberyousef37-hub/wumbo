import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BaseCard } from '@/components/base-card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import {
  supabase,
  supabaseAnonKey,
  supabaseUrl,
} from '@/lib/supabase';

const EMPTY_BOARD = [null, null, null, null, null, null, null, null, null];

function generateRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function TicTacToeDetailsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const [creating, setCreating] = useState(false);

  const handleCreateRoom = async () => {
    setCreating(true);
    try {
      // --- Debug: connection health check ---
      console.log('[CreateRoom] Supabase URL:', supabaseUrl);
      console.log('[CreateRoom] Anon key exists:', !!supabaseAnonKey);

      // Direct fetch test
      const restUrl = `${supabaseUrl}/rest/v1/`;
      try {
        const fetchRes = await fetch(restUrl, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        });
        console.log('[CreateRoom] Fetch test to', restUrl, '- status:', fetchRes.status);
      } catch (fetchErr) {
        console.log('[CreateRoom] Fetch test failed:', fetchErr);
      }

      // Supabase test query
      const { data: testData, error: testError } = await supabase
        .from('rooms')
        .select('id')
        .limit(1);

      console.log('[CreateRoom] Test query result - data:', testData, 'error:', testError);

      if (testError) {
        // Supabase unavailable: fall back to local play
        const code = String(generateRoomCode());
        router.push({
          pathname: '/(tabs)/play/lobby',
          params: { roomId: 'local', roomCode: code, mySymbol: 'X' },
        });
        return;
      }

      // --- Proceed with insert ---
      const code = String(generateRoomCode());
      const players: string[] = ['X'];
      const board: (null)[] = [...EMPTY_BOARD];
      const turn = 'X';
      const winner = null;

      const insertPayload = { code, players, board, turn, winner };
      console.log('[CreateRoom] Before insert:', JSON.stringify(insertPayload));

      const { data, error } = await supabase
        .from('rooms')
        .insert(insertPayload)
        .select('id')
        .single();

      if (error) {
        console.log('[CreateRoom] Supabase error:', error);
        throw error;
      }
      if (!data?.id) {
        throw new Error('No room id returned');
      }

      router.push({
        pathname: '/(tabs)/play/lobby',
        params: { roomId: String(data.id), roomCode: code, mySymbol: 'X' },
      });
    } catch (e) {
      console.log('[CreateRoom] Error:', e);
      // Supabase failed: fall back to local play
      const code = String(generateRoomCode());
      router.push({
        pathname: '/(tabs)/play/lobby',
        params: { roomId: 'local', roomCode: code, mySymbol: 'X' },
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = () => {
    router.push('/(tabs)/play/join-room');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Game Details
          </ThemedText>
        </View>

        <BaseCard>
          <View style={styles.cardContent}>
            <ThemedText style={styles.emoji}>⭕</ThemedText>
            <ThemedText type="title" style={styles.gameTitle}>
              Tic Tac Toe
            </ThemedText>
            <ThemedText
              style={styles.description}
              lightColor={Colors.light.icon}
              darkColor={Colors.dark.icon}
            >
              Get three in a row. Classic X vs O. Quick and fun for two players.
            </ThemedText>
            <View style={styles.playerCount}>
              <MaterialIcons name="people" size={20} color={palette.tint} />
              <ThemedText style={styles.playerCountText}>2 players</ThemedText>
            </View>
          </View>
        </BaseCard>

        <View style={styles.buttons}>
          <PrimaryButton
            label={creating ? 'Creating...' : 'Create Room'}
            onPress={handleCreateRoom}
            disabled={creating}
          />
          <Pressable onPress={handleJoinRoom} style={[styles.secondaryButton, { borderColor: palette.tint }]}>
            <MaterialIcons name="login" size={22} color={palette.tint} />
            <ThemedText style={[styles.secondaryButtonText, { color: palette.tint }]}>
              Join Room
            </ThemedText>
          </Pressable>
        </View>
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
  backButton: { marginRight: Spacing.sm },
  title: { fontSize: 20 },
  cardContent: { alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: Spacing.sm },
  gameTitle: { marginBottom: Spacing.xs, textAlign: 'center' },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  playerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  playerCountText: { fontSize: 16, fontWeight: '600' },
  buttons: { gap: Spacing.sm },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 44,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
});
