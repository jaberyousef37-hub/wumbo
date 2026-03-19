import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function LoginScreen() {
  const { signIn, signUp, signInAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setError(null);
    setIsLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setIsLoading(false);
    if (err) setError(err.message);
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    setIsLoading(true);
    const { error: err } = await signUp(email.trim(), password);
    setIsLoading(false);
    if (err) setError(err.message);
  };

  const handleGuest = async () => {
    setError(null);
    setIsLoading(true);
    const { error: err } = await signInAsGuest();
    setIsLoading(false);
    if (err) setError(err.message);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Wumbo logo/name */}
          <View style={styles.logoSection}>
            <ThemedText style={styles.logo}>Wumbo</ThemedText>
            <ThemedText
              style={styles.tagline}
              lightColor={Colors.light.icon}
              darkColor={Colors.dark.icon}
            >
              Chat & play together
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.dark.tabIconDefault}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.dark.tabIconDefault}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(null);
              }}
              secureTextEntry
            />

            {error && (
              <ThemedText style={styles.error} lightColor={Colors.light.accentPink} darkColor={Colors.dark.accentPink}>
                {error}
              </ThemedText>
            )}

            <Pressable
              style={({ pressed }) => [styles.button, styles.loginButton, pressed && styles.buttonPressed]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.dark.background} size="small" />
              ) : (
                <ThemedText style={styles.loginButtonText}>Login</ThemedText>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.button, styles.signUpButton, pressed && styles.buttonPressed]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              <ThemedText style={styles.signUpButtonText}>Sign Up</ThemedText>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText} lightColor={Colors.light.icon} darkColor={Colors.dark.icon}>
                or
              </ThemedText>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, styles.guestButton, pressed && styles.buttonPressed]}
              onPress={handleGuest}
              disabled={isLoading}
            >
              <ThemedText style={styles.guestButtonText}>Continue as Guest</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 15,
    marginTop: 8,
    opacity: 0.9,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.dark.text,
  },
  error: {
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  loginButton: {
    backgroundColor: Colors.dark.tint,
    marginTop: 8,
  },
  loginButtonText: {
    color: Colors.dark.background,
    fontSize: 17,
    fontWeight: '700',
  },
  signUpButton: {
    backgroundColor: Colors.dark.accentPink,
  },
  signUpButtonText: {
    color: Colors.dark.background,
    fontSize: 17,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.cardBorder,
  },
  dividerText: {
    fontSize: 14,
  },
  guestButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.dark.accentYellow,
  },
  guestButtonText: {
    color: Colors.dark.accentYellow,
    fontSize: 16,
    fontWeight: '600',
  },
});
