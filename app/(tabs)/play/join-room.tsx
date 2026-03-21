import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';
import { generateGuestName } from '@/lib/room-utils';

export default function JoinRoomScreen() {
  const router = useRouter();
  const { code: initialCode } = useLocalSearchParams<{ code?: string }>();
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const [joining, setJoining] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const roomCode = digits.join('');
  const isComplete = roomCode.length === 4;

  useEffect(() => {
    if (initialCode && initialCode.length === 4) {
      setDigits(initialCode.split(''));
    }
  }, [initialCode]);

  const handleDigitChange = (index: number, value: string) => {
    const num = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = num;
    setDigits(next);
    setSubmitError(null);
    if (num && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
    }
  };

  const handleJoin = async () => {
    if (!isComplete) return;

    setJoining(true);
    setSubmitError(null);
    const myName = generateGuestName();

    try {
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('id, code, players, game_type')
        .eq('code', roomCode)
        .single();

      if (fetchError || !room) {
        setSubmitError('Room not found');
        setJoining(false);
        return;
      }

      const players = (room.players as string[]) ?? [];
      if (players.length >= 2) {
        setSubmitError('Room is full');
        setJoining(false);
        return;
      }

      const newPlayers = [...players, myName];
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ players: newPlayers })
        .eq('id', room.id);

      if (updateError) throw updateError;

      router.replace({
        pathname: '/(tabs)/play/lobby',
        params: {
          roomId: room.id,
          roomCode: room.code,
          gameType: (room.game_type as string) ?? 'tictactoe',
          myName,
          isHost: '0',
        },
      });
    } catch (e) {
      console.error('[JoinRoom] Supabase failed:', e);
      // Fallback: local room so UI still works when Supabase fails
      router.replace({
        pathname: '/(tabs)/play/lobby',
        params: {
          roomId: 'local',
          roomCode,
          gameType: 'tictactoe',
          myName,
          isHost: '0',
        },
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
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

          <View style={styles.otpRow}>
            {[0, 1, 2, 3].map((i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: palette.card,
                    borderColor: submitError ? palette.accentPink : palette.cardBorder,
                    color: palette.text,
                  },
                ]}
                value={digits[i]}
                onChangeText={(v) => handleDigitChange(i, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                maxLength={1}
                keyboardType="number-pad"
                selectTextOnFocus
              />
            ))}
          </View>

          {submitError && (
            <ThemedText style={[styles.errorText, { color: palette.accentPink }]}>
              {submitError}
            </ThemedText>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <PrimaryButton
            label={joining ? 'Joining...' : 'Join Room'}
            onPress={handleJoin}
            disabled={!isComplete || joining}
          />
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
    justifyContent: 'space-between',
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.md,
  },
  footer: {
    paddingTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: { marginRight: Spacing.sm },
  title: { fontSize: 20 },
  instruction: { fontSize: 15, marginBottom: Spacing.md },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  otpBox: {
    width: 56,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
});
