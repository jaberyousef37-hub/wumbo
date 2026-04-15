import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/design-system';
import { InGameChat } from '@/components/in-game-chat';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { generateGuestName } from '@/lib/room-utils';
import { supabase } from '@/lib/supabase';
import { Spacing } from '@/constants/spacing';

const JOIN_PAD = 24;

const BG_DEEP = '#0d2818';
const BG_CENTER = '#1a4030';
const GOLD = '#C9A227';

export default function ShellGameJoinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [joining, setJoining] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const roomCode = digits.join('');
  const isComplete = roomCode.length === 4;

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
      const { data: game, error: fetchError } = await supabase
        .from('shell_games')
        .select('id, room_code, guesser_name, game_phase')
        .eq('room_code', roomCode)
        .single();

      if (fetchError || !game) {
        setSubmitError('Room not found');
        setJoining(false);
        return;
      }

      if ((game.guesser_name as string | null)) {
        setSubmitError('Room is full');
        setJoining(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('shell_games')
        .update({ guesser_name: myName })
        .eq('id', game.id);

      if (updateError) throw updateError;

      router.replace({
        pathname: '/(tabs)/play/shell-game-play' as '/',
        params: {
          gameId: game.id,
          roomCode: game.room_code as string,
          isHost: '0',
          myName,
        },
      });
    } catch {
      // Supabase failed: fall back to local single-player mode
      router.replace({
        pathname: '/(tabs)/play/shell-game-play' as '/',
        params: {
          gameId: 'local',
          roomCode,
          isHost: '0',
          myName,
        },
      });
    } finally {
      setJoining(false);
    }
  };

  const handleBack = () => router.back();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG_DEEP }]} edges={['bottom', 'left', 'right']}>
      <LinearGradient
        colors={[BG_CENTER, BG_DEEP, '#081810']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginHorizontal: -JOIN_PAD }}>
            <HeaderBar
              title="Join Shell Game"
              onBack={handleBack}
              right={<InGameChat selfName="You" opponentName="Host" opponentIsAi={false} />}
            />
          </View>

          <ThemedText
            style={[styles.instruction, { color: 'rgba(255,255,255,0.85)' }]}
          >
            Enter the 4-digit room code
          </ThemedText>

          <View style={styles.otpRow}>
            {[0, 1, 2, 3].map((i) => (
              <TextInput
                key={i}
                ref={(r) => {
                  inputRefs.current[i] = r;
                }}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: 'rgba(13,40,24,0.92)',
                    borderColor: submitError ? '#ff4444' : 'rgba(201,162,39,0.55)',
                    color: '#fff',
                  },
                ]}
                value={digits[i]}
                onChangeText={(v) => handleDigitChange(i, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                maxLength={1}
                keyboardType="number-pad"
                selectTextOnFocus
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            ))}
          </View>

          {submitError && (
            <ThemedText style={styles.errorText}>{submitError}</ThemedText>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Spacing.md }]}>
          <PrimaryButton
            label={joining ? 'Joining...' : 'Join Room'}
            onPress={handleJoin}
            disabled={!isComplete || joining}
            style={{ ...styles.joinBtn, backgroundColor: GOLD }}
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
    paddingHorizontal: JOIN_PAD,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  footer: {
    paddingTop: 8,
  },
  instruction: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  otpBox: {
    width: 64,
    height: 72,
    borderRadius: 14,
    borderWidth: 2,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  joinBtn: { minWidth: 200 },
});
