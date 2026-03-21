import type { UnoCard, UnoCardType, UnoSuit } from './types';

const SUITS: UnoSuit[] = ['red', 'blue', 'green', 'yellow'];

function pushNumberRun(deck: UnoCard[], suit: UnoSuit, id: { n: number }) {
  deck.push({
    id: `uno-${id.n++}`,
    color: suit,
    type: 'number',
    value: 0,
  });
  for (let v = 1; v <= 9; v++) {
    for (let k = 0; k < 2; k++) {
      deck.push({
        id: `uno-${id.n++}`,
        color: suit,
        type: 'number',
        value: v,
      });
    }
  }
}

function pushActions(deck: UnoCard[], suit: UnoSuit, id: { n: number }) {
  const actions: UnoCardType[] = ['skip', 'reverse', 'draw2'];
  for (const type of actions) {
    for (let k = 0; k < 2; k++) {
      deck.push({
        id: `uno-${id.n++}`,
        color: suit,
        type,
        value: null,
      });
    }
  }
}

/** Full official-style deck: 108 cards */
export function buildDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  const id = { n: 0 };

  for (const suit of SUITS) {
    pushNumberRun(deck, suit, id);
    pushActions(deck, suit, id);
  }

  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `uno-${id.n++}`,
      color: null,
      type: 'wild',
      value: null,
    });
  }
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `uno-${id.n++}`,
      color: null,
      type: 'wild_draw4',
      value: null,
    });
  }

  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
