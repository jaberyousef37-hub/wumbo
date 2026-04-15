import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/design-system/theme';

type Props = {
  title: string;
  /** Optional right-aligned action label (e.g. “See all”). */
  right?: string;
};

export function SectionTitle({ title, right }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {right ? <Text style={styles.right}>{right}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  right: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
