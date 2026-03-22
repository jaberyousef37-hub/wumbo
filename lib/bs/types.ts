export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

/** Ace = 1 … King = 13 */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export type PlayingCard = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export type BsDifficulty = 'easy' | 'medium' | 'hard';

export type BsPlayer = {
  id: number;
  isHuman: boolean;
  name: string;
  hand: PlayingCard[];
};

export type LastPlay = {
  playerId: number;
  cards: PlayingCard[];
  claimedRank: Rank;
};

export type BsPhase =
  | 'setup'
  | 'play_select'
  | 'anim_play'
  | 'bs_window'
  | 'bs_flip'
  | 'game_over';

export type BsGameState = {
  players: BsPlayer[];
  /** Human player index */
  humanIndex: number;
  /** All face-down cards in the center, in play order */
  pile: PlayingCard[];
  /** Rank that must be claimed on the current play (Ace–King cycle) */
  requiredRank: Rank;
  /** Whose turn to play */
  turnIndex: number;
  phase: BsPhase;
  lastPlay: LastPlay | null;
  /** Player who called BS (during flip / resolution) */
  bsCallerIndex: number | null;
  winnerIndex: number | null;
  difficulty: BsDifficulty;
  /** Cards revealed during BS challenges (public knowledge for AI) */
  revealedMemory: PlayingCard[];
};
