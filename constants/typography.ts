/** App-wide type scale — use via ThemedText `type` or these values in StyleSheet. */
export const Typography = {
  /** Screen title */
  screenTitle: 28,
  screenTitleLineHeight: 34,
  /** Section header */
  sectionHeader: 20,
  sectionHeaderLineHeight: 26,
  /** Card / list row title */
  cardTitle: 17,
  cardTitleLineHeight: 22,
  /** Body copy */
  body: 15,
  bodyLineHeight: 22,
  /** Caption / meta */
  caption: 12,
  captionLineHeight: 16,
  /** @deprecated use screenTitle */
  title: 28,
  titleLineHeight: 34,
  /** @deprecated use sectionHeader */
  section: 20,
  sectionLineHeight: 26,
} as const;

/** Canonical text colors (dark UI) */
export const TextColors = {
  primary: '#FFFFFF',
  secondary: '#A0A0A0',
  muted: '#555555',
} as const;

/** Nav tab icons — active / inactive sizes */
export const ICON_TAB_ACTIVE = 26;
export const ICON_TAB_INACTIVE = 22;

/** Icons inside cards / rows */
export const ICON_SIZE_CARD = 20;

/** List rows / inline header icons (not tab bar) */
export const ICON_SIZE_NAV = 24;
