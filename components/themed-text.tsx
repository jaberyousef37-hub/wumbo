import { StyleSheet, Text, type TextProps } from 'react-native';

import { TextColors, Typography } from '@/constants/typography';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'title'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'link'
    | 'body'
    | 'caption'
    | 'heading'
    | 'section'
    | 'cardTitle';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const textColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const color = type === 'link' ? tintColor : textColor;

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'body' ? styles.body : undefined,
        type === 'caption' ? styles.caption : undefined,
        type === 'heading' ? styles.section : undefined,
        type === 'section' ? styles.section : undefined,
        type === 'cardTitle' ? styles.cardTitle : undefined,
        type === 'title' ? styles.screenTitle : undefined,
        type === 'defaultSemiBold' ? styles.cardTitle : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: Typography.body,
    lineHeight: Typography.bodyLineHeight,
    fontWeight: '400',
    color: TextColors.primary,
  },
  caption: {
    fontSize: Typography.caption,
    lineHeight: Typography.captionLineHeight,
    fontWeight: '400',
    color: TextColors.secondary,
  },
  section: {
    fontSize: Typography.sectionHeader,
    lineHeight: Typography.sectionHeaderLineHeight,
    fontWeight: '600',
    color: TextColors.primary,
  },
  cardTitle: {
    fontSize: Typography.cardTitle,
    lineHeight: Typography.cardTitleLineHeight,
    fontWeight: '600',
    color: TextColors.primary,
  },
  default: {
    fontSize: Typography.body,
    lineHeight: Typography.bodyLineHeight,
    fontWeight: '400',
    color: TextColors.primary,
  },
  screenTitle: {
    fontSize: Typography.screenTitle,
    lineHeight: Typography.screenTitleLineHeight,
    fontWeight: '700',
    color: TextColors.primary,
  },
  subtitle: {
    fontSize: Typography.sectionHeader,
    lineHeight: Typography.sectionHeaderLineHeight,
    fontWeight: '600',
    color: TextColors.primary,
  },
  link: {
    fontSize: Typography.body,
    lineHeight: Typography.bodyLineHeight,
    fontWeight: '400',
  },
});
