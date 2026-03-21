import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function LoginScreen() {
  const { signIn, signUp, signInAsGuest } = useAuth();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: palette.card, borderColor: palette.cardBorder, color: palette.text }]}
              placeholder="Email"
              placeholderTextColor={palette.tabIconDefault}
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
              style={[styles.input, { backgroundColor: palette.card, borderColor: palette.cardBorder, color: palette.text }]}
              placeholder="Password"
              placeholderTextColor={palette.tabIconDefault}
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
          </View>
        </ScrollView>

        <View
          style={[
            styles.actionsFooter,
            { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: palette.cardBorder },
          ]}
        >
          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: palette.tint }, pressed && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={palette.background} size="small" />
            ) : (
              <ThemedText style={[styles.loginButtonText, { color: palette.background }]}>Login</ThemedText>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: palette.accentPink }, pressed && styles.buttonPressed]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <ThemedText style={[styles.signUpButtonText, { color: palette.background }]}>Sign Up</ThemedText>
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: palette.cardBorder }]} />
            <ThemedText style={styles.dividerText} lightColor={Colors.light.icon} darkColor={Colors.dark.icon}>
              or
            </ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: palette.cardBorder }]} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.button, styles.guestButton, { borderColor: palette.accentYellow }, pressed && styles.buttonPressed]}
            onPress={handleGuest}
            disabled={isLoading}
          >
            <ThemedText style={[styles.guestButtonText, { color: palette.accentYellow }]}>Continue as Guest</ThemedText>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 16,
  },
  actionsFooter: {
    paddingHorizontal: 28,
    paddingTop: 12,
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
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
  loginButton: { marginTop: 8 },
  loginButtonText: { fontSize: 17, fontWeight: '700' },
  signUpButton: {},
  signUpButtonText: { fontSize: 17, fontWeight: '600' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
  },
  guestButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  guestButtonText: { fontSize: 16, fontWeight: '600' },
});
