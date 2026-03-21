import { shuffle } from './deck';
import type { UnoCard, UnoGameState, UnoPlayer, UnoSuit } from './types';

export function topCard(state: UnoGameState): UnoCard | undefined {
  return state.discard[state.discard.length - 1];
}

/** Hand has a colored card matching active color (for Wild Draw Four legality). */
export function handHasColorMatch(hand: UnoCard[], activeColor: UnoSuit): boolean {
  return hand.some((c) => c.color !== null && c.color === activeColor);
}

export function isCardPlayable(
  card: UnoCard,
  hand: UnoCard[],
  top: UnoCard,
  activeColor: UnoSuit,
): boolean {
  if (card.type === 'wild') return true;
  if (card.type === 'wild_draw4') {
    return !handHasColorMatch(hand, activeColor);
  }
  if (card.color === null) return false;

  if (top.type === 'wild' || top.type === 'wild_draw4') {
    return card.color === activeColor;
  }

  if (card.color === activeColor) return true;
  if (top.type === 'number' && card.type === 'number' && card.value === top.value) return true;
  if (top.type !== 'number' && card.type === top.type) return true;
  return false;
}

export function getPlayableCards(hand: UnoCard[], top: UnoCard, activeColor: UnoSuit): UnoCard[] {
  return hand.filter((c) => isCardPlayable(c, hand, top, activeColor));
}

/** Reshuffle discard into deck (keep top card). Returns new deck + discard or null if impossible. */
export function reshuffleDiscardIfEmpty(deck: UnoCard[], discard: UnoCard[]): { deck: UnoCard[]; discard: UnoCard[] } | null {
  if (discard.length < 2) return null;
  const top = discard[discard.length - 1];
  const rest = discard.slice(0, -1);
  return {
    deck: shuffle([...deck, ...rest]),
    discard: [top],
  };
}

export function drawCards(
  state: UnoGameState,
  count: number,
  target: UnoPlayer,
): UnoGameState {
  let { deck, discard, playerHand, aiHand } = state;
  const hand = target === 'player' ? [...playerHand] : [...aiHand];
  let drawn = 0;

  while (drawn < count) {
    if (deck.length === 0) {
      const r = reshuffleDiscardIfEmpty(deck, discard);
      if (!r) break;
      deck = r.deck;
      discard = r.discard;
    }
    if (deck.length === 0) break;
    const c = deck[deck.length - 1];
    deck = deck.slice(0, -1);
    hand.push(c);
    drawn++;
  }

  return {
    ...state,
    deck,
    discard,
    playerHand: target === 'player' ? hand : playerHand,
    aiHand: target === 'ai' ? hand : aiHand,
  };
}
