/**
 * Wumbo app theme — dark purple palette.
 */

import { Platform } from 'react-native';

const tintColor = '#B794F6';

export const Colors = {
  light: {
    text: '#2d1b4e',
    background: '#ffffff',
    tint: '#8B5CF6',
    icon: '#7C3AED',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#8B5CF6',
    card: '#f8f5fc',
    cardBorder: '#E9E3F0',
    accentPink: '#EC4899',
    accentYellow: '#FBBF24',
  },
  dark: {
    text: '#E9E0F5',
    background: '#1a0a2e',
    tint: tintColor,
    icon: '#9F7AEA',
    tabIconDefault: '#6B46C1',
    tabIconSelected: tintColor,
    card: '#2d1b4e',
    cardBorder: '#4a2c6d',
    accentPink: '#F687B3',
    accentYellow: '#F6E05E',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
