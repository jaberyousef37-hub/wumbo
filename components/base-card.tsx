import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';

type BaseCardProps = {
  children: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function BaseCard({ children, onPress, showChevron = false, style }: BaseCardProps) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  const content = (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }, style]}>
      <View style={styles.content}>{children}</View>
      {showChevron && onPress && (
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={palette.icon}
          style={styles.chevron}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
        hitSlop={8}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: { flex: 1 },
  chevron: { marginLeft: Spacing.xs },
  pressed: { opacity: 0.9 },
});
