import { dealHands } from './deck';
import type { BsDifficulty, BsGameState, BsPlayer, LastPlay, PlayingCard, Rank } from './types';

const RANKS_CYCLE: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function rankLabel(rank: Rank): string {
  switch (rank) {
    case 1:
      return 'A';
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    default:
      return String(rank);
  }
}

export function nextRank(rank: Rank): Rank {
  const i = RANKS_CYCLE.indexOf(rank);
  return RANKS_CYCLE[(i + 1) % RANKS_CYCLE.length];
}

export function createInitialState(
  playerCount: number,
  humanIndex: number,
  difficulty: BsDifficulty,
  random: () => number = Math.random,
): BsGameState {
  const hands = dealHands(playerCount, random);
  const players: BsPlayer[] = hands.map((hand, id) => ({
    id,
    isHuman: id === humanIndex,
    name: id === humanIndex ? 'You' : `AI ${id < humanIndex ? id + 1 : id}`,
    hand: [...hand].sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit)),
  }));

  return {
    players,
    humanIndex,
    pile: [],
    requiredRank: 1,
    turnIndex: 0,
    phase: 'play_select',
    lastPlay: null,
    bsCallerIndex: null,
    winnerIndex: null,
    difficulty,
    revealedMemory: [],
  };
}

export function cardsMatchClaim(cards: PlayingCard[], claimedRank: Rank): boolean {
  return cards.every((c) => c.rank === claimedRank);
}

export type PlayResult =
  | { ok: true; state: BsGameState }
  | { ok: false; reason: string };

/** Human / engine: play selected cards from current player */
export function playCards(state: BsGameState, cardIds: string[]): PlayResult {
  if (state.phase !== 'play_select') return { ok: false, reason: 'Not in play phase' };
  if (cardIds.length < 1 || cardIds.length > 4) return { ok: false, reason: 'Play 1–4 cards' };

  const p = state.players[state.turnIndex];
  const idSet = new Set(cardIds);
  if (idSet.size !== cardIds.length) return { ok: false, reason: 'Duplicate card' };

  const played: PlayingCard[] = [];
  const nextHand: PlayingCard[] = [];
  const handIds = new Set(p.hand.map((c) => c.id));
  for (const id of cardIds) {
    if (!handIds.has(id)) return { ok: false, reason: 'Invalid card' };
  }
  for (const c of p.hand) {
    if (idSet.has(c.id)) played.push(c);
    else nextHand.push(c);
  }
  if (played.length !== cardIds.length) return { ok: false, reason: 'Card not in hand' };

  const lastPlay: LastPlay = {
    playerId: p.id,
    cards: played,
    claimedRank: state.requiredRank,
  };

  const players = state.players.map((pl, i) =>
    i === state.turnIndex ? { ...pl, hand: nextHand } : pl,
  );

  const next: BsGameState = {
    ...state,
    players,
    pile: [...state.pile, ...played],
    lastPlay,
    phase: 'anim_play',
    bsCallerIndex: null,
  };

  return { ok: true, state: next };
}

/** After animation: open BS window */
export function afterPlayAnimation(state: BsGameState): BsGameState {
  if (state.phase !== 'anim_play') return state;
  return { ...state, phase: 'bs_window' };
}

export function applyBsResolution(state: BsGameState, callerIndex: number): BsGameState {
  const lp = state.lastPlay;
  if (!lp || (state.phase !== 'bs_window' && state.phase !== 'bs_flip')) return state;

  const honest = cardsMatchClaim(lp.cards, lp.claimedRank);
  const liarTakes = !honest;
  const victimIndex = liarTakes ? lp.playerId : callerIndex;
  const pile = [...state.pile];

  const revealed = [...state.revealedMemory, ...lp.cards];

  const players = state.players.map((pl) => ({ ...pl, hand: [...pl.hand] }));
  for (const c of pile) {
    players[victimIndex].hand.push(c);
  }
  for (const pl of players) {
    pl.hand.sort((a, b) => a.rank - b.rank || a.suit.localeCompare(b.suit));
  }

  const winnerIndex = players.findIndex((pl) => pl.hand.length === 0);
  const hasWinner = winnerIndex >= 0;

  return {
    ...state,
    players,
    pile: [],
    lastPlay: null,
    phase: hasWinner ? 'game_over' : 'play_select',
    bsCallerIndex: null,
    turnIndex: hasWinner ? state.turnIndex : nextPlayerAfterBs(state, lp.playerId, callerIndex, honest),
    requiredRank: hasWinner ? state.requiredRank : nextRank(state.requiredRank),
    winnerIndex: hasWinner ? winnerIndex : null,
    revealedMemory: revealed,
  };
}

/**
 * Standard house rule: if BS was wrong (honest play), caller takes pile and caller goes next.
 * If BS was right (lie), liar takes pile and liar goes next.
 */
function nextPlayerAfterBs(
  state: BsGameState,
  actorIndex: number,
  callerIndex: number,
  honest: boolean,
): number {
  if (honest) return callerIndex;
  return actorIndex;
}

export function skipBs(state: BsGameState): BsGameState {
  if (state.phase !== 'bs_window' || !state.lastPlay) return state;

  const lp = state.lastPlay;
  const players = state.players.map((pl) => ({ ...pl, hand: [...pl.hand] }));

  const winnerIndex = players.findIndex((pl) => pl.hand.length === 0);
  const hasWinner = winnerIndex >= 0;
  const n = players.length;
  const nextFromActor = (lp.playerId + 1) % n;

  return {
    ...state,
    players,
    phase: hasWinner ? 'game_over' : 'play_select',
    turnIndex: hasWinner ? state.turnIndex : nextFromActor,
    requiredRank: hasWinner ? state.requiredRank : nextRank(state.requiredRank),
    winnerIndex: hasWinner ? winnerIndex : null,
    lastPlay: null,
    bsCallerIndex: null,
  };
}

export function enterBsFlip(state: BsGameState, callerIndex: number): BsGameState {
  if (state.phase !== 'bs_window' || !state.lastPlay) return state;
  if (callerIndex === state.lastPlay.playerId) return state;
  return { ...state, phase: 'bs_flip', bsCallerIndex: callerIndex };
}

export function finishBsFlip(state: BsGameState): BsGameState {
  if (state.phase !== 'bs_flip' || state.bsCallerIndex == null || !state.lastPlay) return state;
  return applyBsResolution(state, state.bsCallerIndex);
}
