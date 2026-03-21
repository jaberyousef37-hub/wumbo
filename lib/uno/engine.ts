import { aiChooseCard, aiChooseWildColor } from './ai';
import { buildDeck, shuffle } from './deck';
import { drawCards, isCardPlayable, topCard } from './rules';
import type { UnoCard, UnoGameState, UnoPlayer, UnoSuit } from './types';

export function createInitialGame(): UnoGameState {
  let deck = shuffle(buildDeck());
  let starter: UnoCard;
  while (true) {
    const c = deck.pop();
    if (!c) throw new Error('Empty deck');
    if (c.type === 'number' && c.color !== null) {
      starter = c;
      break;
    }
    deck = shuffle([...deck, c]);
  }
  const playerHand: UnoCard[] = [];
  const aiHand: UnoCard[] = [];
  for (let i = 0; i < 7; i++) {
    const pc = deck.pop();
    const ac = deck.pop();
    if (!pc || !ac) throw new Error('Deck underflow');
    playerHand.push(pc);
    aiHand.push(ac);
  }
  return {
    deck,
    discard: [starter],
    activeColor: starter.color!,
    playerHand,
    aiHand,
    currentTurn: 'player',
    winner: null,
    playerUnoAcknowledged: false,
    wildPicker: null,
  };
}

function removeFromHand(hand: UnoCard[], cardId: string): { next: UnoCard[]; card: UnoCard } | null {
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return null;
  const card = hand[idx];
  return { next: hand.filter((_, i) => i !== idx), card };
}

function nextTurnAfterResolved(who: UnoPlayer, card: UnoCard): UnoPlayer {
  const opp: UnoPlayer = who === 'player' ? 'ai' : 'player';
  if (card.type === 'skip' || card.type === 'reverse') return who;
  if (card.type === 'draw2') return who;
  if (card.type === 'wild_draw4') return who;
  if (card.type === 'wild') return opp;
  return opp;
}

function syncPlayerUnoFlag(state: UnoGameState): UnoGameState {
  if (state.playerHand.length !== 1) {
    return { ...state, playerUnoAcknowledged: false };
  }
  return state;
}

function finalizeColoredPlay(
  state: UnoGameState,
  who: UnoPlayer,
  card: UnoCard,
  handAfter: UnoCard[],
): UnoGameState {
  let next: UnoGameState = {
    ...state,
    discard: [...state.discard, card],
    playerHand: who === 'player' ? handAfter : state.playerHand,
    aiHand: who === 'ai' ? handAfter : state.aiHand,
    activeColor: card.color ?? state.activeColor,
    wildPicker: null,
  };

  const newHand = who === 'player' ? handAfter : state.aiHand;
  const victim: UnoPlayer = who === 'player' ? 'ai' : 'player';

  if (newHand.length === 0) {
    return syncPlayerUnoFlag({
      ...next,
      winner: who,
      currentTurn: who,
    });
  }

  if (card.type === 'draw2') {
    next = drawCards(next, 2, victim);
  }

  next = {
    ...next,
    currentTurn: nextTurnAfterResolved(who, card),
  };

  return syncPlayerUnoFlag(next);
}

/** Non-wild colored play, or wild with immediate color (AI). */
export function playCard(
  state: UnoGameState,
  cardId: string,
  who: UnoPlayer,
  wildColor?: UnoSuit,
): UnoGameState | null {
  if (state.winner || state.wildPicker) return null;
  if (state.currentTurn !== who) return null;

  const top = topCard(state);
  if (!top) return null;

  const hand = who === 'player' ? state.playerHand : state.aiHand;
  const removed = removeFromHand(hand, cardId);
  if (!removed) return null;
  const { card, next: handAfter } = removed;

  if (!isCardPlayable(card, hand, top, state.activeColor)) return null;

  if (card.type === 'wild' || card.type === 'wild_draw4') {
    const color =
      wildColor ?? (who === 'ai' ? aiChooseWildColor(handAfter) : undefined);
    if (!color) {
      return syncPlayerUnoFlag({
        ...state,
        discard: [...state.discard, card],
        playerHand: who === 'player' ? handAfter : state.playerHand,
        aiHand: who === 'ai' ? handAfter : state.aiHand,
        wildPicker: who,
      });
    }

    let next: UnoGameState = {
      ...state,
      discard: [...state.discard, card],
      playerHand: who === 'player' ? handAfter : state.playerHand,
      aiHand: who === 'ai' ? handAfter : state.aiHand,
      activeColor: color,
      wildPicker: null,
    };

    const newHand = who === 'player' ? handAfter : state.aiHand;
    if (newHand.length === 0) {
      return syncPlayerUnoFlag({
        ...next,
        winner: who,
        currentTurn: who,
      });
    }

    const victim: UnoPlayer = who === 'player' ? 'ai' : 'player';
    if (card.type === 'wild_draw4') {
      next = drawCards(next, 4, victim);
    }

    next = {
      ...next,
      currentTurn:
        card.type === 'wild_draw4' ? who : nextTurnAfterResolved(who, card),
    };
    return syncPlayerUnoFlag(next);
  }

  return finalizeColoredPlay(state, who, card, handAfter);
}

/** After player picks a color in the modal (wild already on discard). */
export function completePendingWild(state: UnoGameState, color: UnoSuit): UnoGameState | null {
  if (state.wildPicker !== 'player') return null;
  const top = topCard(state);
  if (!top || (top.type !== 'wild' && top.type !== 'wild_draw4')) return null;

  let next: UnoGameState = {
    ...state,
    activeColor: color,
    wildPicker: null,
  };

  const who: UnoPlayer = 'player';
  const newHand = next.playerHand;
  if (newHand.length === 0) {
    return syncPlayerUnoFlag({
      ...next,
      winner: who,
    });
  }

  const victim: UnoPlayer = 'ai';
  if (top.type === 'wild_draw4') {
    next = drawCards(next, 4, victim);
  }

  next = {
    ...next,
    currentTurn:
      top.type === 'wild_draw4' ? who : nextTurnAfterResolved(who, top),
  };
  return syncPlayerUnoFlag(next);
}

/** AI played wild without color in playCard — pick color and resolve (no-op if not pending). */
export function completeAiWild(state: UnoGameState): UnoGameState | null {
  if (state.wildPicker !== 'ai') return null;
  const top = topCard(state);
  if (!top) return null;
  const color = aiChooseWildColor(state.aiHand);

  let next: UnoGameState = {
    ...state,
    activeColor: color,
    wildPicker: null,
  };

  if (state.aiHand.length === 0) {
    return syncPlayerUnoFlag({
      ...next,
      winner: 'ai',
    });
  }

  const victim: UnoPlayer = 'player';
  if (top.type === 'wild_draw4') {
    next = drawCards(next, 4, victim);
  }

  next = {
    ...next,
    currentTurn:
      top.type === 'wild_draw4' ? 'ai' : nextTurnAfterResolved('ai', top),
  };
  return syncPlayerUnoFlag(next);
}

export function playerDrawOne(state: UnoGameState): UnoGameState | null {
  if (state.winner || state.wildPicker) return null;
  if (state.currentTurn !== 'player') return null;
  const top = topCard(state);
  if (!top) return null;
  const playable = state.playerHand.some((c) =>
    isCardPlayable(c, state.playerHand, top, state.activeColor),
  );
  if (playable) return null;

  let next = drawCards(state, 1, 'player');
  next = { ...next, currentTurn: 'ai' };
  return syncPlayerUnoFlag(next);
}

export function acknowledgePlayerUno(state: UnoGameState): UnoGameState | null {
  if (state.playerHand.length !== 1 || state.currentTurn !== 'player') return null;
  return { ...state, playerUnoAcknowledged: true };
}

/** When AI turn begins: catch forgetful player. */
export function applyUnoCatchPenalty(state: UnoGameState): UnoGameState {
  if (
    state.playerHand.length === 1 &&
    !state.playerUnoAcknowledged &&
    state.currentTurn === 'ai'
  ) {
    return syncPlayerUnoFlag(drawCards(state, 2, 'player'));
  }
  return state;
}

/** AI has no playable card: draw one; play it if legal, else pass to player. */
export function aiDrawTurn(state: UnoGameState): UnoGameState | null {
  if (state.currentTurn !== 'ai' || state.winner || state.wildPicker) return null;
  const s = drawCards(state, 1, 'ai');
  const drawn = s.aiHand[s.aiHand.length - 1];
  const top = topCard(s);
  if (drawn && top && isCardPlayable(drawn, s.aiHand, top, s.activeColor)) {
    let played = playCard({ ...s, currentTurn: 'ai' }, drawn.id, 'ai');
    if (played?.wildPicker === 'ai') {
      played = completeAiWild(played);
    }
    return played;
  }
  return syncPlayerUnoFlag({ ...s, currentTurn: 'player' });
}

/** One atomic AI step: UNO catch, resolve pending wild, play or draw. */
export function runAiTurn(state: UnoGameState): UnoGameState {
  let s = state;
  if (s.winner || s.currentTurn !== 'ai') return s;
  s = applyUnoCatchPenalty(s);
  if (s.wildPicker === 'ai') {
    s = completeAiWild(s) ?? s;
  }
  if (s.winner || s.currentTurn !== 'ai') return s;
  const top = topCard(s);
  if (!top) return s;
  const choice = aiChooseCard(s.aiHand, top, s.activeColor, 3);
  if (choice) {
    let next = playCard(s, choice.id, 'ai');
    if (!next) return s;
    if (next.wildPicker === 'ai') {
      next = completeAiWild(next) ?? next;
    }
    return next;
  }
  return aiDrawTurn(s) ?? s;
}
