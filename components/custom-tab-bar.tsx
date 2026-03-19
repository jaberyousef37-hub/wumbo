import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';

const TAB_CONFIG: Record<string, { icon: string; iconSet: 'material' | 'sf'; label: string }> = {
  chat: { icon: 'bubble.left.and.bubble.right.fill', iconSet: 'sf', label: 'Chat' },
  rooms: { icon: 'people', iconSet: 'material', label: 'Rooms' },
  explore: { icon: 'gamecontroller.fill', iconSet: 'sf', label: 'Games' },
  profile: { icon: 'person.fill', iconSet: 'sf', label: 'Profile' },
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

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
        const config = TAB_CONFIG[route.name] ?? { icon: 'circle', iconSet: 'material' as const, label: route.name };

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

        const iconSize = isFocused ? 28 : 22;
        const iconColor = isFocused ? palette.tabIconSelected : palette.tabIconDefault;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? config.label}
          >
            <View style={[styles.tabContent, isFocused && styles.tabContentActive]}>
              {isFocused && (
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: `${palette.tabIconSelected}30` },
                  ]}
                />
              )}
              {config.iconSet === 'sf' ? (
                <IconSymbol name={config.icon as any} size={iconSize} color={iconColor} />
              ) : (
                <MaterialIcons name={config.icon as any} size={iconSize} color={iconColor} />
              )}
            </View>
            <Text
              style={[
                styles.label,
                { color: iconColor },
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
    minHeight: 44,
  },
  tabContent: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 36,
  },
  tabContentActive: {
    borderRadius: 18,
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: '700',
  },
});
