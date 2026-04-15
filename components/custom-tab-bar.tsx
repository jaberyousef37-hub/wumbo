import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';

const TAB_PILL_BG = 'rgba(124, 58, 237, 0.2)';
const INACTIVE_LABEL = 'rgba(160, 160, 160, 0.4)';
const INACTIVE_ICON = 'rgba(160, 160, 160, 0.4)';

type TabGlyph = keyof typeof MaterialCommunityIcons.glyphMap;

const TAB_CONFIG: Record<string, { active: TabGlyph; inactive: TabGlyph; label: string }> = {
  home: { active: 'home', inactive: 'home-outline', label: 'Home' },
  chat: { active: 'message', inactive: 'message-outline', label: 'Chat' },
  play: { active: 'gamepad-variant', inactive: 'gamepad-variant-outline', label: 'Play' },
  rooms: { active: 'account-group', inactive: 'account-group-outline', label: 'Rooms' },
  profile: { active: 'account', inactive: 'account-outline', label: 'Profile' },
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <BlurView intensity={Platform.OS === 'ios' ? 55 : 40} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(10,10,12,0.55)', 'rgba(10,10,12,0.92)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const labelFromOptions =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const cfg = TAB_CONFIG[route.name];
          const label = typeof labelFromOptions === 'string' ? labelFromOptions : cfg?.label ?? route.name;
          const iconName = cfg
            ? isFocused
              ? cfg.active
              : cfg.inactive
            : ('circle' as TabGlyph);
          // Single size avoids icon “pop” / layout shift when focus updates (e.g. nested stack pushes).
          const iconSize = 24;
          const iconColor = isFocused ? AppColors.text : INACTIVE_ICON;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tab}
            >
              <View style={styles.iconSlot}>
                {isFocused ? <View style={styles.iconPill} pointerEvents="none" /> : null}
                <MaterialCommunityIcons name={iconName} size={iconSize} color={iconColor} />
              </View>
              <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  iconSlot: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: TAB_PILL_BG,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: AppColors.text,
  },
  labelInactive: {
    color: INACTIVE_LABEL,
  },
});
