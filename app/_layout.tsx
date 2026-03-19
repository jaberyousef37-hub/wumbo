import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/auth-context';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import { ProfileProvider } from '@/contexts/profile-context';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { initSounds } from '@/lib/sounds';

function ThemedStack() {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: palette.tint,
          background: palette.background,
          card: palette.background,
          text: palette.text,
          border: palette.cardBorder,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: palette.tint,
          background: palette.background,
          card: palette.card,
          text: palette.text,
          border: palette.cardBorder,
        },
      };

  return (
    <NavThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile-setup" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
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
