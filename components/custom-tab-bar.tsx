import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { ICON_SIZE_NAV } from '@/constants/typography';

const TAB_CONFIG: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string }> = {
  home: { icon: 'home', label: 'Home' },
  chat: { icon: 'chat', label: 'Chat' },
  play: { icon: 'sports-esports', label: 'Play' },
  rooms: { icon: 'groups', label: 'Rooms' },
  profile: { icon: 'person', label: 'Profile' },
};

const palette = Colors.dark;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.card,
          borderTopColor: palette.cardBorder,
          paddingBottom: Math.max(insets.bottom, Spacing.xs),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const config = TAB_CONFIG[route.name] ?? {
          icon: 'circle' as const,
          label: route.name,
        };

        const onPress = () => {
          if (process.env.EXPO_OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? config.label}
          >
            <View
              style={[
                styles.tabContent,
                isFocused && styles.tabContentActive,
                !isFocused && { opacity: 0.6 },
              ]}
            >
              {isFocused && (
                <View style={[styles.pill, { backgroundColor: palette.tint }]} />
              )}
              <MaterialIcons
                name={config.icon}
                size={ICON_SIZE_NAV}
                color={isFocused ? palette.text : palette.tabIconDefault}
              />
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isFocused ? palette.tabIconSelected : palette.tabIconDefault,
                },
                isFocused && styles.labelActive,
              ]}
              numberOfLines={1}
            >
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: Spacing.xs,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  tabContent: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 40,
  },
  tabContentActive: {
    borderRadius: 22,
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
  labelActive: {
    fontWeight: '700',
  },
});
