import { Colors } from '@/constants/theme';

type ColorName = keyof typeof Colors.dark;

/**
 * Resolves a themed color. App is dark-only; `light` prop is treated as fallback for legacy call sites.
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ColorName
) {
  return props.dark ?? props.light ?? Colors.dark[colorName];
}
