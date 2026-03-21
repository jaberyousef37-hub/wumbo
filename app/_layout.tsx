import { DarkTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/auth-context';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import { ProfileProvider } from '@/contexts/profile-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { initSounds } from '@/lib/sounds';

const WumboDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.cardBorder,
  },
};

function ThemedStack() {
  return (
    <NavThemeProvider value={WumboDarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile-setup" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const t = setTimeout(() => initSounds().catch(() => {}), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <ThemeProvider>
      <OnboardingProvider>
        <ProfileProvider>
          <AuthProvider>
            <ThemedStack />
          </AuthProvider>
        </ProfileProvider>
      </OnboardingProvider>
    </ThemeProvider>
  );
}
