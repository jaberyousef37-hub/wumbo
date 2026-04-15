/**
 * Centralized design tokens — Expo React Native (game app).
 * Use with components in `@/components/design-system`.
 */

import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#0B0B0F',
  card: '#15151A',
  primary: '#7C3AED',
  primaryGradient: ['#7C3AED', '#A855F7'] as const,
  border: 'rgba(255,255,255,0.06)',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
} as const;

/** Typography presets (TextStyle-compatible). */
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 40,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  } satisfies TextStyle,
  h2: {
    fontSize: 24,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 32,
    color: colors.textPrimary,
    letterSpacing: -0.25,
  } satisfies TextStyle,
  h3: {
    fontSize: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 26,
    color: colors.textPrimary,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 24,
    color: colors.textPrimary,
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 18,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  } satisfies TextStyle,
} as const;

export const shadows = {
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  } satisfies ViewStyle,
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  } satisfies ViewStyle,
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  } satisfies ViewStyle,
} as const;

/** Single export for spread / convenience. */
export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;
