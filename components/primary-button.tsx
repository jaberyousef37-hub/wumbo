import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { BUTTON_HEIGHT, BUTTON_RADIUS, Spacing } from '@/constants/spacing';

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
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const isInverted = variant === 'inverted';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: isInverted ? palette.card : palette.tint },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: isInverted ? palette.tint : palette.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BUTTON_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: BUTTON_HEIGHT,
  },
  label: { fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.9 },
});
