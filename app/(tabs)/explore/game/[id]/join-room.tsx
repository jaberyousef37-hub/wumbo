import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

const GAME_NAMES: Record<string, string> = {
  uno: 'UNO',
  shadda: 'Shadda',
  bs: 'BS',
};

export default function JoinRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [code, setCode] = useState('');

  const gameName = id ? GAME_NAMES[id] ?? 'Game' : 'Game';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Back</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Join room
          </ThemedText>
          <ThemedText style={styles.gameLabel}>Game</ThemedText>
          <ThemedText style={styles.gameName}>{gameName}</ThemedText>

          <ThemedText style={styles.inputLabel}>Room code</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter 4-digit code"
            placeholderTextColor={Colors.dark.tabIconDefault}
            keyboardType="number-pad"
            maxLength={4}
            value={code}
            onChangeText={setCode}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.joinButton,
              !code.trim() && styles.joinButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={() => {
              if (!code.trim()) return;
              // Placeholder: joining the game would go here
            }}
            disabled={!code.trim()}
          >
            <ThemedText style={styles.joinText}>Join</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 8,
  },
  backText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 16,
  },
  title: {
    marginBottom: 4,
  },
  gameLabel: {
    fontSize: 13,
    opacity: 0.9,
  },
  gameName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    letterSpacing: 4,
    color: Colors.dark.text,
    width: '100%',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  joinButton: {
    borderRadius: 16,
    backgroundColor: Colors.dark.tint,
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.background,
  },
});

