import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

const SIZES: Record<AvatarSize, number> = {
  small: 44,
  medium: 56,
  large: 80,
  xlarge: 160,
};

type AvatarProps = {
  initials?: string;
  imageUri?: string | null;
  size?: AvatarSize;
};

export function Avatar({ initials, imageUri, size = 'medium' }: AvatarProps) {
  const { isDark } = useTheme();
  const dim = SIZES[size];
  const fontSize = size === 'small' ? 16 : size === 'medium' ? 20 : size === 'large' ? 28 : 48;
  const bgColor = isDark ? Colors.dark.tint : Colors.light.tint;

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.avatar, { width: dim, height: dim, borderRadius: dim / 2 }]}
      />
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
