import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/constants/design-system/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  /** Extra padding inside the card. */
  padded?: boolean;
  shadow?: keyof typeof shadows;
};

export function Card({ children, style, padded = true, shadow = 'small' }: Props) {
  return (
    <View style={[styles.card, shadows[shadow], padded && styles.padded, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
});
