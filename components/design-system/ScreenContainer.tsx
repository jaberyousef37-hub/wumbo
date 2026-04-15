import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/design-system/theme';

type Props = {
  children: ReactNode;
  /** Safe-area edges. Default: full screen insets. */
  edges?: Edge[];
  /** Subtle vertical gradient over base background (luxury game shell). */
  variant?: 'solid' | 'gradient';
  contentStyle?: ViewStyle;
};

export function ScreenContainer({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  variant = 'solid',
  contentStyle,
}: Props) {
  if (variant === 'gradient') {
    return (
      <SafeAreaView style={styles.safe} edges={edges}>
        <LinearGradient
          colors={[colors.background, '#101018', colors.background]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, styles.solid]} edges={edges}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  solid: {
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
