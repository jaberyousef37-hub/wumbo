import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

type AvatarSize = 'mini' | 'small' | 'medium' | 'large' | 'xlarge';

const SIZES: Record<AvatarSize, number> = {
  mini: 28,
  small: 44,
  medium: 56,
  large: 80,
  xlarge: 160,
};

type AvatarProps = {
  initials?: string;
  imageUri?: string | null;
  /** Shop emoji avatar (single grapheme) */
  emoji?: string | null;
  size?: AvatarSize;
};

export function Avatar({ initials, imageUri, emoji, size = 'medium' }: AvatarProps) {
  const { isDark } = useTheme();
  const dim = SIZES[size];
  const fontSize =
    size === 'mini' ? 10 : size === 'small' ? 16 : size === 'medium' ? 20 : size === 'large' ? 28 : 48;
  const bgColor = isDark ? Colors.dark.tint : Colors.light.tint;

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.avatar, { width: dim, height: dim, borderRadius: dim / 2 }]}
      />
    );
  }

  if (emoji) {
    const emojiFont = size === 'mini' ? 14 : size === 'small' ? 22 : size === 'medium' ? 28 : size === 'large' ? 40 : 72;
    return (
      <View
        style={[
          styles.avatar,
          { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bgColor },
        ]}
      >
        <Text style={{ fontSize: emojiFont }}>{emoji}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bgColor },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>
        {initials?.slice(0, 2).toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
});
