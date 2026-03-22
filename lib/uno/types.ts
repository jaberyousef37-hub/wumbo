export type UnoSuit = 'red' | 'blue' | 'green' | 'yellow';

export type UnoCardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4';

export type UnoCard = {
  id: string;
  /** null only for wild / wild_draw4 in hand */
  color: UnoSuit | null;
  type: UnoCardType;
  /** 0–9 when type is number */
  value: number | null;
};

/** 0 = You, 1 = Alex (AI), 2 = Sam (AI) */
export type UnoSeat = 0 | 1 | 2;

export const UNO_NAMES: readonly [string, string, string] = ['You', 'Alex', 'Sam'];

export type UnoDifficulty = 'easy' | 'medium' | 'hard';

export type UnoGameState = {
  deck: UnoCard[];
  discard: UnoCard[];
  /** Effective color to match (after wilds) */
  activeColor: UnoSuit;
  hands: [UnoCard[], UnoCard[], UnoCard[]];
  currentTurn: UnoSeat;
  /** +1: 0→1→2→0, -1: reverse */
  direction: 1 | -1;
  winner: UnoSeat | null;
  /** Seat 0 tapped UNO while holding exactly one card */
  playerUnoAcknowledged: boolean;
  wildPicker: UnoSeat | null;
  drawStack: number;
  aiDifficulty: UnoDifficulty;
};
