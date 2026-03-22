import type { PlayingCard, Rank, Suit } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function createDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deal as evenly as possible; extras go to lower indices first */
export function dealHands(playerCount: number, random: () => number = Math.random): PlayingCard[][] {
  const deck = shuffle(createDeck(), random);
  const base = Math.floor(52 / playerCount);
  const extra = 52 % playerCount;
  const sizes = Array.from({ length: playerCount }, (_, i) => base + (i < extra ? 1 : 0));
  const hands: PlayingCard[][] = Array.from({ length: playerCount }, () => []);
  let idx = 0;
  for (let p = 0; p < playerCount; p++) {
    for (let k = 0; k < sizes[p]; k++) {
      hands[p].push(deck[idx++]);
    }
  }
  return hands;
}
