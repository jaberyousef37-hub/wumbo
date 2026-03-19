import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useProfile } from '@/contexts/profile-context';
import { Colors } from '@/constants/theme';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { setProfile } = useProfile();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const handleContinue = () => {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim();
    if (!trimmedName || !trimmedUsername) return;
    const formattedUsername = trimmedUsername.startsWith('@') ? trimmedUsername : `@${trimmedUsername}`;
    setProfile(trimmedName, formattedUsername);
    router.replace('/(tabs)');
  };

  const isValid = name.trim().length > 0 && username.trim().length > 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.dark.background, Colors.dark.card]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <View style={styles.content}>
          <Text style={styles.title}>What's your name?</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Text style={styles.title}>Choose a username</Text>
          <TextInput
            style={styles.input}
            placeholder="@username"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={handleContinue}
            disabled={!isValid}
            style={[styles.button, !isValid && styles.buttonDisabled]}
          >
            <LinearGradient
              colors={isValid ? [Colors.dark.accentPink, Colors.dark.accentYellow] : ['#4a2c6d', '#4a2c6d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  keyboard: { flex: 1, justifyContent: 'center' },
  content: {
    paddingHorizontal: 32,
    gap: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#fff',
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
    color: '#1a0a2e',
  },
});
