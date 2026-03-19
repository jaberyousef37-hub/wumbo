import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'default' | 'inverted';
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
  variant = 'default',
}: PrimaryButtonProps) {
  const isInverted = variant === 'inverted';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isInverted && styles.buttonInverted,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, isInverted && styles.labelInverted]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.dark.tint,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonInverted: {
    backgroundColor: '#fff',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  labelInverted: {
    color: Colors.dark.tint,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.9 },
});
