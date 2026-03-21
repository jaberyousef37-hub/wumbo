/**
 * Wumbo — forced dark design system (single palette).
 */

import { Platform } from 'react-native';

/** Canonical tokens */
export const AppColors = {
  background: '#0d0d0d',
  card: '#1a1a1a',
  cardBorder: '#2a2a2a',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  tint: '#7C3AED',
  accent: '#FF6FD8',
  yellow: '#FFE066',
  tabIconDefault: '#555555',
  tabIconSelected: '#7C3AED',
  success: '#2ECC71',
  /** Legacy alias — same as `tint` */
  primary: '#7C3AED',
  /** Legacy alias — same as `card` */
  surface: '#1a1a1a',
  /** Legacy alias — same as `textSecondary` */
  muted: '#A0A0A0',
  /** Legacy alias — same as `cardBorder` */
  border: '#2a2a2a',
} as const;

/** Navigation / useTheme compatibility — light mirrors dark so theme mode never flashes wrong colors */
const palette = {
  text: AppColors.text,
  background: AppColors.background,
  tint: AppColors.tint,
  icon: AppColors.tint,
  tabIconDefault: AppColors.tabIconDefault,
  tabIconSelected: AppColors.tabIconSelected,
  card: AppColors.card,
  cardBorder: AppColors.cardBorder,
  textSecondary: AppColors.textSecondary,
  accent: AppColors.accent,
  yellow: AppColors.yellow,
  accentPink: AppColors.accent,
  accentYellow: AppColors.yellow,
} as const;

export const Colors = {
  light: palette,
  dark: palette,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
