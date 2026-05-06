import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors } from '@/constants/design-system/theme';

type Props = {
  label: string;
  value: string | number;
  /** Optional hint under label. */
  hint?: string;
  /** e.g. `{ flex: 1 }` when used in a row */
  style?: ViewStyle;
};

export function StatCard({ label, value, hint, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientHighlight}
        pointerEvents="none"
      />
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    backgroundColor: '#15151A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    minWidth: 100,
    overflow: 'hidden',
  },
  gradientHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '52%',
    opacity: 1,
  },
  content: {
    alignItems: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '900',
    color: '#A78BFA',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.15,
  },
  hint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
