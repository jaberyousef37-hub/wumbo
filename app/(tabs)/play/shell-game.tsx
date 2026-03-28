import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { InGameChat } from '@/components/in-game-chat';
import { HowToPlayButton } from '@/components/how-to-play-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';
import { generateRoomCode, generateGuestName } from '@/lib/room-utils';

const BG_DEEP = '#0d2818';
const BG_CENTER = '#1a4030';
const GOLD = '#C9A227';
const ACCENT = GOLD;

export default function ShellGameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <LinearGradient
        colors={[BG_CENTER, BG_DEEP, '#081810']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={[styles.title, { flex: 1 }]} darkColor="#fff">
            Shell Game
          </ThemedText>
          <InGameChat selfName="You" opponentName="Friend" opponentIsAi={false} />
          <HowToPlayButton gameId="shell" tint={GOLD} />
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

          <Pressable
            onPress={handleJoinRoom}
            style={[styles.joinBtn, { borderColor: 'rgba(201,162,39,0.55)' }]}
          >
            <MaterialIcons name="login" size={22} color={GOLD} />
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
  safe: { flex: 1, backgroundColor: BG_DEEP },
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
