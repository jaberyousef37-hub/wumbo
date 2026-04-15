import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const HEADER_BG = '#0B0B0F';
const BORDER_BOTTOM = 'rgba(255,255,255,0.06)';
const H_PADDING = 16;
const HEADER_HEIGHT = 56;
const SIDE_SLOT = 44;

type Props = {
  /** Center title */
  title: string;
  /** When set, shows back arrow on the left */
  onBack?: () => void;
  /** Trailing actions (e.g. How to play, chat) */
  right?: ReactNode;
};

/**
 * App-wide header: 56px, 16px horizontal padding, unified typography and border.
 */
export function HeaderBar({ title, onBack, right }: Props) {
  return (
    <View style={styles.bar} accessibilityRole="header">
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PADDING,
    backgroundColor: HEADER_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_BOTTOM,
  },
  left: {
    width: SIDE_SLOT,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  pressed: {
    opacity: 0.72,
  },
  title: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  right: {
    minWidth: SIDE_SLOT,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
});
