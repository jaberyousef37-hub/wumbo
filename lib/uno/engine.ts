import { aiChooseCard, aiChooseWildColor } from './ai';
import { buildDeck, shuffle } from './deck';
import { drawCards, isCardPlayable, topCard } from './rules';
import type { UnoCard, UnoDifficulty, UnoGameState, UnoSeat, UnoSuit } from './types';

export function nextSeat(who: UnoSeat, dir: 1 | -1): UnoSeat {
  if (dir === 1) return ((who + 1) % 3) as UnoSeat;
  return ((who + 2) % 3) as UnoSeat;
}

function skipSeat(who: UnoSeat, dir: 1 | -1): UnoSeat {
  return nextSeat(nextSeat(who, dir), dir);
}

export function createInitialGame(aiDifficulty: UnoDifficulty = 'medium'): UnoGameState {
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
  const hands: [UnoCard[], UnoCard[], UnoCard[]] = [[], [], []];
  for (let i = 0; i < 7; i++) {
    for (let p = 0; p < 3; p++) {
      const card = deck.pop();
      if (!card) throw new Error('Deck underflow');
      hands[p].push(card);
    }
  }
  return {
    deck,
    discard: [starter],
    activeColor: starter.color!,
    hands,
    currentTurn: 0,
    direction: 1,
    winner: null,
    playerUnoAcknowledged: false,
    wildPicker: null,
    drawStack: 0,
    aiDifficulty,
  };
}

function removeFromHand(hand: UnoCard[], cardId: string): { next: UnoCard[]; card: UnoCard } | null {
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return null;
  const card = hand[idx];
  return { next: hand.filter((_, i) => i !== idx), card };
}

function setHand(state: UnoGameState, seat: UnoSeat, hand: UnoCard[]): UnoGameState {
  const hands: [UnoCard[], UnoCard[], UnoCard[]] = [
    seat === 0 ? hand : state.hands[0],
    seat === 1 ? hand : state.hands[1],
    seat === 2 ? hand : state.hands[2],
  ];
  return { ...state, hands };
}

/** After skip / reverse / wild (non-WD4) / normal — turn passes along direction. */
function turnAfterStandardCard(who: UnoSeat, card: UnoCard, dir: 1 | -1): { turn: UnoSeat; dir: 1 | -1 } {
  if (card.type === 'skip') {
    return { turn: skipSeat(who, dir), dir };
  }
  if (card.type === 'reverse') {
    const nd = (-dir) as 1 | -1;
    return { turn: nextSeat(who, nd), dir: nd };
  }
  if (card.type === 'wild') {
    return { turn: nextSeat(who, dir), dir };
  }
  return { turn: nextSeat(who, dir), dir };
}

function syncPlayerUnoFlag(state: UnoGameState): UnoGameState {
  if (state.hands[0].length !== 1) {
    return { ...state, playerUnoAcknowledged: false };
  }
  return state;
}

function finalizeDrawTwoPlay(
  state: UnoGameState,
  who: UnoSeat,
  card: UnoCard,
  handAfter: UnoCard[],
): UnoGameState {
  const stack = state.drawStack + 2;
  let next: UnoGameState = {
    ...setHand(state, who, handAfter),
    discard: [...state.discard, card],
    drawStack: stack,
    wildPicker: null,
  };

  if (handAfter.length === 0) {
    return syncPlayerUnoFlag({
      ...next,
      winner: who,
      currentTurn: who,
      drawStack: 0,
    });
  }

  next = {
    ...next,
    currentTurn: nextSeat(who, state.direction),
  };
  return syncPlayerUnoFlag(next);
}

function finalizeColoredPlay(
  state: UnoGameState,
  who: UnoSeat,
  card: UnoCard,
  handAfter: UnoCard[],
): UnoGameState {
  let next: UnoGameState = {
    ...setHand(state, who, handAfter),
    discard: [...state.discard, card],
    activeColor: card.color ?? state.activeColor,
    wildPicker: null,
  };

  if (handAfter.length === 0) {
    return syncPlayerUnoFlag({
      ...next,
      winner: who,
      currentTurn: who,
    });
  }

  const { turn, dir } = turnAfterStandardCard(who, card, state.direction);
  next = { ...next, currentTurn: turn, direction: dir };

  return syncPlayerUnoFlag(next);
}

export function playCard(
  state: UnoGameState,
  cardId: string,
  who: UnoSeat,
  wildColor?: UnoSuit,
): UnoGameState | null {
  if (state.winner || state.wildPicker) return null;
  if (state.currentTurn !== who) return null;

  const top = topCard(state);
  if (!top) return null;

  const hand = state.hands[who];
  const removed = removeFromHand(hand, cardId);
  if (!removed) return null;
  const { card, next: handAfter } = removed;

  if (!isCardPlayable(card, hand, top, state.activeColor, state.drawStack)) return null;

  if (card.type === 'draw2') {
    return finalizeDrawTwoPlay(state, who, card, handAfter);
  }

  if (card.type === 'wild' || card.type === 'wild_draw4') {
    const isAi = who === 1 || who === 2;
    const color = wildColor ?? (isAi ? aiChooseWildColor(handAfter) : undefined);
    if (!color) {
      if (handAfter.length === 0) {
        return syncPlayerUnoFlag({
          ...setHand(state, who, handAfter),
          discard: [...state.discard, card],
          winner: who,
          currentTurn: who,
          wildPicker: null,
        });
      }
      return syncPlayerUnoFlag({
        ...setHand(state, who, handAfter),
        discard: [...state.discard, card],
        wildPicker: who,
      });
    }

    let next: UnoGameState = {
      ...setHand(state, who, handAfter),
      discard: [...state.discard, card],
      activeColor: color,
      wildPicker: null,
    };

    if (handAfter.length === 0) {
      return syncPlayerUnoFlag({
        ...next,
        winner: who,
        currentTurn: who,
      });
    }

    const victim = nextSeat(who, state.direction);
    if (card.type === 'wild_draw4') {
      next = drawCards(next, 4, victim);
    }

    if (card.type === 'wild_draw4') {
      next = { ...next, currentTurn: who };
    } else {
      const { turn, dir } = turnAfterStandardCard(who, { ...card, type: 'wild' }, state.direction);
      next = { ...next, currentTurn: turn, direction: dir };
    }
    return syncPlayerUnoFlag(next);
  }

  return finalizeColoredPlay(state, who, card, handAfter);
}

export function completePendingWild(state: UnoGameState, color: UnoSuit): UnoGameState | null {
  if (state.wildPicker !== 0) return null;
  const top = topCard(state);
  if (!top || (top.type !== 'wild' && top.type !== 'wild_draw4')) return null;

  let next: UnoGameState = {
    ...state,
    activeColor: color,
    wildPicker: null,
  };

  if (next.hands[0].length === 0) {
    return syncPlayerUnoFlag({
      ...next,
      winner: 0,
    });
  }

  const victim = nextSeat(0, state.direction);
  if (top.type === 'wild_draw4') {
    next = drawCards(next, 4, victim);
  }

  if (top.type === 'wild_draw4') {
    next = { ...next, currentTurn: 0 };
  } else {
    const { turn, dir } = turnAfterStandardCard(0, { ...top, type: 'wild' }, state.direction);
    next = { ...next, currentTurn: turn, direction: dir };
  }
  return syncPlayerUnoFlag(next);
}

export function completeAiWild(state: UnoGameState): UnoGameState | null {
  const w = state.wildPicker;
  if (w !== 1 && w !== 2) return null;
  const top = topCard(state);
  if (!top) return null;
  const color = aiChooseWildColor(state.hands[w]);

  let next: UnoGameState = {
    ...state,
    activeColor: color,
    wildPicker: null,
  };

  if (state.hands[w].length === 0) {
    return syncPlayerUnoFlag({
      ...next,
      winner: w,
    });
  }

  const victim = nextSeat(w, state.direction);
  if (top.type === 'wild_draw4') {
    next = drawCards(next, 4, victim);
  }

  if (top.type === 'wild_draw4') {
    next = { ...next, currentTurn: w };
  } else {
    const { turn, dir } = turnAfterStandardCard(w, { ...top, type: 'wild' }, state.direction);
    next = { ...next, currentTurn: turn, direction: dir };
  }
  return syncPlayerUnoFlag(next);
}

export function playerDrawOne(state: UnoGameState): UnoGameState | null {
  if (state.winner || state.wildPicker) return null;
  if (state.currentTurn !== 0) return null;
  const top = topCard(state);
  if (!top) return null;

  if (state.drawStack > 0) {
    let next = drawCards(state, state.drawStack, 0);
    next = { ...next, drawStack: 0, currentTurn: nextSeat(0, state.direction) };
    return syncPlayerUnoFlag(next);
  }

  const playable = state.hands[0].some((c) =>
    isCardPlayable(c, state.hands[0], top, state.activeColor, state.drawStack),
  );
  if (playable) return null;

  let next = drawCards(state, 1, 0);
  next = { ...next, currentTurn: nextSeat(0, state.direction) };
  return syncPlayerUnoFlag(next);
}

export function acknowledgePlayerUno(state: UnoGameState): UnoGameState | null {
  if (state.hands[0].length !== 1) return null;
  return { ...state, playerUnoAcknowledged: true };
}

export function applyUnoCatchPenalty(state: UnoGameState): UnoGameState {
  const aiTurn = state.currentTurn === 1 || state.currentTurn === 2;
  if (state.hands[0].length === 1 && !state.playerUnoAcknowledged && aiTurn) {
    return syncPlayerUnoFlag(drawCards(state, 2, 0));
  }
  return state;
}

function minOpponentHand(state: UnoGameState, seat: UnoSeat): number {
  const sizes = [0, 1, 2].filter((s) => s !== seat).map((s) => state.hands[s].length);
  return Math.min(...sizes);
}

export function aiDrawTurn(state: UnoGameState): UnoGameState | null {
  const seat = state.currentTurn;
  if (seat !== 1 && seat !== 2) return null;
  if (state.winner || state.wildPicker) return null;

  if (state.drawStack > 0) {
    let next = drawCards(state, state.drawStack, seat);
    next = { ...next, drawStack: 0, currentTurn: nextSeat(seat, state.direction) };
    return syncPlayerUnoFlag(next);
  }

  const s = drawCards(state, 1, seat);
  const drawn = s.hands[seat][s.hands[seat].length - 1];
  const top = topCard(s);
  if (drawn && top && isCardPlayable(drawn, s.hands[seat], top, s.activeColor, s.drawStack)) {
    let played = playCard({ ...s, currentTurn: seat }, drawn.id, seat);
    if (played?.wildPicker === seat) {
      played = completeAiWild(played);
    }
    return played;
  }
  return syncPlayerUnoFlag({ ...s, currentTurn: nextSeat(seat, s.direction) });
}

export function runAiTurn(state: UnoGameState): UnoGameState {
  const seat = state.currentTurn;
  if (seat !== 1 && seat !== 2) return state;
  let s = state;
  if (s.winner) return s;

  s = applyUnoCatchPenalty(s);
  if (s.wildPicker === 1 || s.wildPicker === 2) {
    s = completeAiWild(s) ?? s;
  }
  if (s.winner || s.currentTurn !== seat) return s;

  const top = topCard(s);
  if (!top) return s;

  const hand = s.hands[seat];
  const legal = hand.filter((c) => isCardPlayable(c, hand, top, s.activeColor, s.drawStack));

  if (legal.length === 0) {
    return aiDrawTurn(s) ?? s;
  }

  const choice = aiChooseCard(
    hand,
    top,
    s.activeColor,
    3,
    s.aiDifficulty,
    minOpponentHand(s, seat),
    s.drawStack,
  );
  if (!choice) {
    return aiDrawTurn(s) ?? s;
  }

  let next = playCard(s, choice.id, seat);
  if (!next) return s;
  if (next.wildPicker === seat) {
    next = completeAiWild(next) ?? next;
  }
  return next;
}
