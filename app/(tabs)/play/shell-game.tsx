import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';
import { generateRoomCode, generateGuestName } from '@/lib/room-utils';

const BG_DARK = AppColors.background;
const ACCENT = AppColors.tint;

export default function ShellGameScreen() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleCreateRoom = async () => {
    setCreating(true);
    const roomCode = generateRoomCode();
    const hostName = generateGuestName();

    try {
      const { data, error } = await supabase
        .from('shell_games')
        .insert({
          room_code: roomCode,
          host_name: hostName,
          guesser_name: null,
          ball_position: null,
          shuffle_sequence: [],
          game_phase: 'hiding',
          winner: null,
        })
        .select('id')
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error('No game id returned');

      router.replace({
        pathname: '/(tabs)/play/shell-game-play' as '/',
        params: {
          gameId: data.id,
          roomCode,
          isHost: '1',
          myName: hostName,
        },
      });
    } catch {
      // Supabase failed: fall back to local single-player mode
      router.replace({
        pathname: '/(tabs)/play/shell-game-play' as '/',
        params: {
          gameId: 'local',
          roomCode,
          isHost: '1',
          myName: hostName,
        },
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = () => {
    router.push('/(tabs)/play/shell-game-join' as '/');
  };

  const handleBack = () => router.back();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG_DARK }]} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.title} darkColor="#fff">
            Shell Game
          </ThemedText>
        </View>

        <View style={styles.content}>
          <View style={styles.emojiWrap}>
            <ThemedText style={styles.emoji} darkColor="#fff">
              🥤
            </ThemedText>
          </View>
          <ThemedText
            style={[styles.subtitle, { color: 'rgba(255,255,255,0.85)' }]}
          >
            Find the ball under the cups. Host picks, guesser guesses.
          </ThemedText>

          <Pressable
            onPress={handleCreateRoom}
            disabled={creating}
            style={({ pressed }) => [
              styles.createBtn,
              { backgroundColor: ACCENT },
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons name="add-circle-outline" size={28} color="#fff" />
            <ThemedText style={styles.createBtnText} darkColor="#fff">
              {creating ? 'Creating...' : 'Create Room'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={handleJoinRoom} style={[styles.joinBtn, { borderColor: `${ACCENT}88` }]}>
            <MaterialIcons name="login" size={22} color={ACCENT} />
            <ThemedText style={[styles.joinBtnText, { color: ACCENT }]}>
              Join with Code
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
    marginBottom: Spacing.lg,
  },
  backBtn: { marginRight: Spacing.sm },
  title: {},
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  emojiWrap: { marginBottom: Spacing.md },
  emoji: { fontSize: 64 },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    minHeight: 64,
    borderRadius: 16,
    marginBottom: Spacing.md,
  },
  createBtnText: { fontSize: 20, fontWeight: '700' },
  pressed: { opacity: 0.9 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    borderWidth: 2,
  },
  joinBtnText: { fontSize: 16, fontWeight: '600' },
});
