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

export type UnoPlayer = 'player' | 'ai';

export type UnoGameState = {
  deck: UnoCard[];
  discard: UnoCard[];
  /** Effective color to match (after wilds) */
  activeColor: UnoSuit;
  playerHand: UnoCard[];
  aiHand: UnoCard[];
  currentTurn: UnoPlayer;
  winner: UnoPlayer | null;
  /** Player tapped UNO while holding exactly one card */
  playerUnoAcknowledged: boolean;
  /** Waiting for wild color choice */
  wildPicker: UnoPlayer | null;
};
