import type { BsDifficulty, BsGameState, PlayingCard, Rank } from './types';

function countRankInHand(hand: PlayingCard[], rank: Rank): number {
  return hand.filter((c) => c.rank === rank).length;
}

function countRankSeen(observerHand: PlayingCard[], revealed: PlayingCard[], rank: Rank): number {
  let n = 0;
  for (const c of observerHand) if (c.rank === rank) n++;
  for (const c of revealed) if (c.rank === rank) n++;
  return n;
}

/**
 * True if the claimed play cannot be honest: more copies of `rank` were claimed than can exist
 * outside the observer's hand among unseen cards (pile + opponents).
 */
export function isClaimImpossible(
  observerHand: PlayingCard[],
  revealedMemory: PlayingCard[],
  claimedRank: Rank,
  claimedCount: number,
): boolean {
  const unseenOfRank = 4 - countRankSeen(observerHand, revealedMemory, claimedRank);
  return claimedCount > unseenOfRank;
}

function pickRandomSubset<T>(arr: T[], count: number, random: () => number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length; i++) {
    const j = Math.floor(random() * copy.length);
    out.push(copy[j]);
    copy.splice(j, 1);
  }
  return out;
}

/** ~30% lie when possible; otherwise honest or forced lie. */
export function aiChoosePlay(
  state: BsGameState,
  playerIndex: number,
  random: () => number = Math.random,
): string[] {
  const hand = state.players[playerIndex].hand;
  const r = state.requiredRank;
  const matching = hand.filter((c) => c.rank === r);
  const nonMatching = hand.filter((c) => c.rank !== r);
  const maxPlay = Math.min(4, hand.length);
  const minPlay = Math.min(1, hand.length);
  if (maxPlay < 1) return [];

  const wantLie = random() < 0.3 && nonMatching.length > 0;

  if (!wantLie && matching.length > 0) {
    const k = minPlay + Math.floor(random() * (Math.min(matching.length, maxPlay) - minPlay + 1));
    return pickRandomSubset(matching, k, random).map((c) => c.id);
  }

  if (wantLie) {
    const k = minPlay + Math.floor(random() * (maxPlay - minPlay + 1));
    const mustWrong = pickRandomSubset(nonMatching, 1, random);
    const restPool = hand.filter((c) => c.id !== mustWrong[0].id);
    const needMore = k - 1;
    const rest = pickRandomSubset(restPool, needMore, random);
    return [...mustWrong, ...rest].map((c) => c.id);
  }

  const k = minPlay + Math.floor(random() * (maxPlay - minPlay + 1));
  return pickRandomSubset(hand, k, random).map((c) => c.id);
}

function baseCallProbability(difficulty: BsDifficulty, pileSize: number, claimedCount: number): number {
  let p = 0.12;
  if (difficulty === 'medium') p = 0.22;
  if (difficulty === 'hard') p = 0.28;
  p += Math.min(0.2, pileSize * 0.008);
  if (claimedCount >= 3) p += 0.12;
  return Math.min(0.92, p);
}

export function aiShouldCallBs(
  state: BsGameState,
  observerIndex: number,
  random: () => number = Math.random,
): boolean {
  if (state.phase !== 'bs_window' || !state.lastPlay) return false;
  const lp = state.lastPlay;
  if (lp.playerId === observerIndex) return false;

  const hand = state.players[observerIndex].hand;
  const { claimedRank } = lp;
  const n = lp.cards.length;

  if (isClaimImpossible(hand, state.revealedMemory, claimedRank, n)) {
    if (state.difficulty === 'hard') return random() < 0.95;
    if (state.difficulty === 'medium') return random() < 0.75;
    return random() < 0.45;
  }

  let p = baseCallProbability(state.difficulty, state.pile.length, n);
  if (state.difficulty === 'hard') {
    const unseenOfRank = 4 - countRankSeen(hand, state.revealedMemory, claimedRank);
    if (unseenOfRank > 0) {
      p += Math.min(0.28, (n / unseenOfRank) * 0.18);
    }
    p = Math.min(0.9, p);
  }

  return random() < p;
}
