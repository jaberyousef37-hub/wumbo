export type CosmeticKind = 'avatar' | 'uno_skin' | 'chess_theme' | 'profile_frame' | 'chat_color';

export type CosmeticItem = {
  id: string;
  kind: CosmeticKind;
  name: string;
  price: number;
  /** Emoji or short label for grid preview */
  preview: string;
};

export const COIN_START = 100;
export const COIN_WIN_GAME = 20;
export const COIN_COMPLETE_GAME = 5;
export const COIN_DAILY_LOGIN = 10;
/** Extra coins when the player has a multi-day daily streak (≥2). */
export const COIN_STREAK_BONUS = 10;

export const COSMETIC_ITEMS: CosmeticItem[] = [
  { id: 'avatar_default', kind: 'avatar', name: 'Initials', price: 0, preview: 'Aa' },
  { id: 'avatar_lion', kind: 'avatar', name: 'Lion', price: 50, preview: '🦁' },
  { id: 'avatar_dragon', kind: 'avatar', name: 'Dragon', price: 120, preview: '🐉' },
  { id: 'avatar_fox', kind: 'avatar', name: 'Fox', price: 60, preview: '🦊' },
  { id: 'avatar_wolf', kind: 'avatar', name: 'Wolf', price: 70, preview: '🐺' },
  { id: 'avatar_robot', kind: 'avatar', name: 'Robot', price: 90, preview: '🤖' },
  { id: 'avatar_crown', kind: 'avatar', name: 'Crown', price: 100, preview: '👑' },
  { id: 'avatar_diamond', kind: 'avatar', name: 'Diamond', price: 150, preview: '💎' },
  { id: 'avatar_moon', kind: 'avatar', name: 'Moon', price: 80, preview: '🌙' },
  { id: 'avatar_bolt', kind: 'avatar', name: 'Lightning', price: 95, preview: '⚡' },

  { id: 'uno_classic', kind: 'uno_skin', name: 'Classic', price: 0, preview: '🃏' },
  { id: 'uno_neon', kind: 'uno_skin', name: 'Neon', price: 100, preview: '💚' },
  { id: 'uno_galaxy', kind: 'uno_skin', name: 'Galaxy', price: 200, preview: '🌌' },
  { id: 'uno_fire', kind: 'uno_skin', name: 'Fire', price: 130, preview: '🔥' },
  { id: 'uno_ice', kind: 'uno_skin', name: 'Ice', price: 140, preview: '❄️' },

  { id: 'chess_classic', kind: 'chess_theme', name: 'Classic wood', price: 0, preview: '♟️' },
  { id: 'chess_marble', kind: 'chess_theme', name: 'Marble', price: 150, preview: '⬜' },
  { id: 'chess_gold', kind: 'chess_theme', name: 'Gold', price: 150, preview: '🟨' },
  { id: 'chess_neon', kind: 'chess_theme', name: 'Neon', price: 150, preview: '💜' },

  { id: 'frame_none', kind: 'profile_frame', name: 'None', price: 0, preview: '○' },
  { id: 'frame_crown', kind: 'profile_frame', name: 'Golden crown', price: 100, preview: '👑' },
  { id: 'frame_fire', kind: 'profile_frame', name: 'Fire', price: 120, preview: '🔥' },
  { id: 'frame_diamond', kind: 'profile_frame', name: 'Diamond', price: 150, preview: '💠' },
  { id: 'frame_rainbow', kind: 'profile_frame', name: 'Rainbow', price: 200, preview: '🌈' },

  { id: 'chat_default', kind: 'chat_color', name: 'Default', price: 0, preview: '💬' },
  { id: 'chat_ocean', kind: 'chat_color', name: 'Ocean', price: 75, preview: '🌊' },
  { id: 'chat_sunset', kind: 'chat_color', name: 'Sunset', price: 85, preview: '🌅' },
  { id: 'chat_forest', kind: 'chat_color', name: 'Forest', price: 80, preview: '🌲' },
  { id: 'chat_lavender', kind: 'chat_color', name: 'Lavender', price: 90, preview: '💜' },
];

const byId = new Map(COSMETIC_ITEMS.map((i) => [i.id, i]));

export function getCosmeticItem(id: string): CosmeticItem | undefined {
  return byId.get(id);
}

export function itemsForKind(kind: CosmeticKind): CosmeticItem[] {
  return COSMETIC_ITEMS.filter((i) => i.kind === kind);
}

export const DEFAULT_OWNED_IDS = COSMETIC_ITEMS.filter((i) => i.price === 0).map((i) => i.id);

export const DEFAULT_EQUIPPED: Record<CosmeticKind, string> = {
  avatar: 'avatar_default',
  uno_skin: 'uno_classic',
  chess_theme: 'chess_classic',
  profile_frame: 'frame_none',
  chat_color: 'chat_default',
};

export type UnoSkinVisual = {
  felt: string;
  feltRim: string;
  cardBack: string;
  cardBackBorder: string;
  faceGlow: string;
  wildBg: string;
};

const UNO_SKINS: Record<string, UnoSkinVisual> = {
  uno_classic: {
    felt: '#0f4d35',
    feltRim: '#063822',
    cardBack: '#0d3d28',
    cardBackBorder: '#1a5c40',
    faceGlow: 'transparent',
    wildBg: '#111',
  },
  uno_neon: {
    felt: '#042f2e',
    feltRim: '#0f766e',
    cardBack: '#022c22',
    cardBackBorder: '#2dd4bf',
    faceGlow: '#5eead4',
    wildBg: '#0c1a1a',
  },
  uno_galaxy: {
    felt: '#0f0a1a',
    feltRim: '#312e81',
    cardBack: '#1e1b4b',
    cardBackBorder: '#6366f1',
    faceGlow: '#a5b4fc',
    wildBg: '#0b0820',
  },
  uno_fire: {
    felt: '#431407',
    feltRim: '#9a3412',
    cardBack: '#7c2d12',
    cardBackBorder: '#f97316',
    faceGlow: '#fb923c',
    wildBg: '#1c0a05',
  },
  uno_ice: {
    felt: '#082f49',
    feltRim: '#0369a1',
    cardBack: '#0c4a6e',
    cardBackBorder: '#7dd3fc',
    faceGlow: '#bae6fd',
    wildBg: '#082030',
  },
};

export function getUnoSkinVisual(skinId: string): UnoSkinVisual {
  return UNO_SKINS[skinId] ?? UNO_SKINS.uno_classic;
}

export type ChessBoardColors = { light: string; dark: string };

const CHESS_THEMES: Record<string, ChessBoardColors> = {
  chess_classic: { light: '#F0D9B5', dark: '#B58863' },
  chess_marble: { light: '#E8E8E8', dark: '#2D2D2D' },
  chess_gold: { light: '#D4AF37', dark: '#3D2914' },
  chess_neon: { light: '#E879F9', dark: '#6B21A8' },
};

export function getChessBoardColors(themeId: string): ChessBoardColors {
  return CHESS_THEMES[themeId] ?? CHESS_THEMES.chess_classic;
}

export type ProfileFrameStyle = {
  borderWidth: number;
  borderColor: string;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  padding?: number;
};

const FRAMES: Record<string, ProfileFrameStyle> = {
  frame_none: { borderWidth: 3, borderColor: '#2a2a2a' },
  frame_crown: {
    borderWidth: 4,
    borderColor: '#FBBF24',
    shadowColor: '#FBBF24',
    shadowOpacity: 0.55,
    shadowRadius: 10,
    padding: 2,
  },
  frame_fire: {
    borderWidth: 4,
    borderColor: '#F97316',
    shadowColor: '#EF4444',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    padding: 2,
  },
  frame_diamond: {
    borderWidth: 4,
    borderColor: '#67E8F9',
    shadowColor: '#22D3EE',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    padding: 2,
  },
  frame_rainbow: {
    borderWidth: 4,
    borderColor: '#A78BFA',
    shadowColor: '#EC4899',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    padding: 2,
  },
};

export function getProfileFrameStyle(frameId: string): ProfileFrameStyle {
  return FRAMES[frameId] ?? FRAMES.frame_none;
}

export type ChatBubbleTheme = {
  self: string;
  other: string;
  otherBorder: string;
};

const CHAT_THEMES: Record<string, ChatBubbleTheme> = {
  chat_default: { self: '#7C3AED', other: '#2a2a2a', otherBorder: '#3f3f46' },
  chat_ocean: { self: '#0EA5E9', other: '#0C4A6E', otherBorder: '#0369A1' },
  chat_sunset: { self: '#F97316', other: '#431407', otherBorder: '#C2410C' },
  chat_forest: { self: '#22C55E', other: '#14532D', otherBorder: '#166534' },
  chat_lavender: { self: '#A78BFA', other: '#3B0764', otherBorder: '#7C3AED' },
};

export function getChatBubbleTheme(chatId: string): ChatBubbleTheme {
  return CHAT_THEMES[chatId] ?? CHAT_THEMES.chat_default;
}

export function getAvatarEmoji(avatarId: string): string | null {
  const item = byId.get(avatarId);
  if (!item || item.kind !== 'avatar' || item.id === 'avatar_default') return null;
  return item.preview;
}
