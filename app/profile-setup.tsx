import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile } from '@/contexts/profile-context';
import { useTheme } from '@/contexts/theme-context';
import { AppColors, Colors } from '@/constants/theme';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { setProfile } = useProfile();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const handleContinue = () => {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim();
    if (!trimmedName || !trimmedUsername) return;
    const formattedUsername = trimmedUsername.startsWith('@') ? trimmedUsername : `@${trimmedUsername}`;
    setProfile(trimmedName, formattedUsername);
    router.replace('/(tabs)/home');
  };

  const isValid = name.trim().length > 0 && username.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <LinearGradient
        colors={[palette.background, palette.card]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: palette.text }]}>What&apos;s your name?</Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.card, borderColor: palette.cardBorder, color: palette.text }]}
            placeholder="Enter your name"
            placeholderTextColor={palette.tabIconDefault}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Text style={[styles.title, { color: palette.text }]}>Choose a username</Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.card, borderColor: palette.cardBorder, color: palette.text }]}
            placeholder="@username"
            placeholderTextColor={palette.tabIconDefault}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Pressable
            onPress={handleContinue}
            disabled={!isValid}
            style={[styles.button, !isValid && styles.buttonDisabled]}
          >
            <LinearGradient
              colors={isValid ? [palette.accentPink, palette.accentYellow] : [palette.cardBorder, palette.cardBorder]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scroll: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 24,
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: AppColors.text,
  },
  button: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.background,
  },
});
