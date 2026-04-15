import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Card,
  HeaderBar,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  SectionTitle,
} from '@/components/design-system';
import { InGameChat } from '@/components/in-game-chat';
import { HowToPlayButton } from '@/components/how-to-play-button';
import { colors, spacing, typography } from '@/constants/design-system/theme';
import { supabase } from '@/lib/supabase';
import { generateRoomCode, generateGuestName } from '@/lib/room-utils';

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
    <ScreenContainer variant="gradient" contentStyle={styles.screenNoPad}>
      <HeaderBar
        title="Shell Game"
        onBack={handleBack}
        right={
          <>
            <InGameChat selfName="You" opponentName="Friend" opponentIsAi={false} />
            <HowToPlayButton gameId="shell" tint={colors.primary} />
          </>
        }
      />

      <View style={styles.main}>
        <Card style={styles.heroCard} shadow="medium">
          <Text style={styles.emoji} accessibilityLabel="Shell game">
            🥤
          </Text>
          <Text style={styles.subtitle}>
            Find the ball under the cups. Host picks, guesser guesses.
          </Text>
        </Card>

        <SectionTitle title="Play" />

        <PrimaryButton
          label={creating ? 'Creating...' : 'Create Room'}
          onPress={handleCreateRoom}
          loading={creating}
          disabled={creating}
          leftIcon={
            !creating ? (
              <MaterialIcons name="add-circle-outline" size={24} color={colors.textPrimary} />
            ) : undefined
          }
        />

        <SecondaryButton
          label="Join with Code"
          onPress={handleJoinRoom}
          leftIcon={<MaterialIcons name="login" size={22} color={colors.primary} />}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenNoPad: {
    paddingHorizontal: 0,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  heroCard: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
