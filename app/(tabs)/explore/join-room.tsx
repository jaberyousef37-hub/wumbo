import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';

export default function JoinRoomScreen() {
  const router = useRouter();
  const { code: initialCode } = useLocalSearchParams<{ code?: string }>();
  const [roomCode, setRoomCode] = useState(initialCode ?? '');
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    if (initialCode) setRoomCode(initialCode);
  }, [initialCode]);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    const code = roomCode.trim();
    if (!code) return;

    setJoining(true);
    setError(null);
    try {
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('id, code, players')
        .eq('code', code)
        .single();

      if (fetchError || !room) {
        setError('Room not found');
        return;
      }

      const players = (room.players as string[]) ?? [];
      if (players.length >= 2) {
        setError('Room is full');
        return;
      }

      const newPlayers = [...players, 'O'];
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ players: newPlayers })
        .eq('id', room.id);

      if (updateError) throw updateError;

      router.replace({
        pathname: '/(tabs)/explore/lobby',
        params: { roomId: room.id, roomCode: room.code, mySymbol: 'O' },
      });
    } catch (e) {
      console.error('Join room failed:', e);
      setError('Failed to join');
    } finally {
      setJoining(false);
    }
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
            Join Room
          </ThemedText>
        </View>

        <ThemedText
          style={styles.instruction}
          lightColor={Colors.light.icon}
          darkColor={Colors.dark.icon}
        >
          Enter the room code shared by your friend
        </ThemedText>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: palette.card,
              borderColor: palette.cardBorder,
              color: palette.text,
            },
          ]}
          placeholder="e.g. 4832"
          placeholderTextColor={palette.tabIconDefault}
          value={roomCode}
          onChangeText={(text) => setRoomCode(text.replace(/\D/g, '').slice(0, 4))}
          maxLength={4}
          keyboardType="number-pad"
          autoCorrect={false}
        />

        {error && (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        )}

        <PrimaryButton
          label={joining ? 'Joining...' : 'Join Room'}
          onPress={handleJoin}
          disabled={!roomCode.trim() || joining}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: { marginRight: Spacing.sm },
  title: { fontSize: 20 },
  instruction: { fontSize: 15, marginBottom: Spacing.sm },
  errorText: {
    color: Colors.dark.accentPink,
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: Spacing.md,
  },
});
