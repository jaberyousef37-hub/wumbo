import { StyleSheet, Text, type TextProps } from 'react-native';

import { Typography } from '@/constants/typography';
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
    | 'section';
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
        type === 'heading' ? styles.heading : undefined,
        type === 'section' ? styles.section : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
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
  },
  caption: {
    fontSize: Typography.caption,
    lineHeight: Typography.captionLineHeight,
  },
  heading: {
    fontSize: Typography.section,
    lineHeight: Typography.sectionLineHeight,
    fontWeight: '600',
  },
  section: {
    fontSize: Typography.section,
    lineHeight: Typography.sectionLineHeight,
    fontWeight: '600',
  },
  default: {
    fontSize: Typography.body,
    lineHeight: Typography.bodyLineHeight,
  },
  defaultSemiBold: {
    fontSize: Typography.section,
    lineHeight: Typography.sectionLineHeight,
    fontWeight: '600',
  },
  title: {
    fontSize: Typography.title,
    lineHeight: Typography.titleLineHeight,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: Typography.section,
    lineHeight: Typography.sectionLineHeight,
    fontWeight: '700',
  },
  link: {
    fontSize: Typography.body,
    lineHeight: Typography.bodyLineHeight,
  },
});
