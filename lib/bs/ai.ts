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

function countRankPlayedOnClaim(revealed: PlayingCard[], rank: Rank): number {
  return revealed.filter((c) => c.rank === rank).length;
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

function lieProbability(difficulty: BsDifficulty): number {
  if (difficulty === 'easy') return 0.25;
  if (difficulty === 'medium') return 0.4;
  return 0.55;
}

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

  const wantLie = random() < lieProbability(state.difficulty) && nonMatching.length > 0;

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
  let p = 0.1;
  if (difficulty === 'medium') p = 0.18;
  if (difficulty === 'hard') p = 0.24;
  p += Math.min(0.22, pileSize * 0.006);
  if (claimedCount >= 3) p += 0.1;
  return Math.min(0.9, p);
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
    if (state.difficulty === 'medium') return random() < 0.78;
    return random() < 0.5;
  }

  let p = baseCallProbability(state.difficulty, state.pile.length, n);

  const playedOfRank = countRankPlayedOnClaim(state.revealedMemory, claimedRank);
  p += Math.min(0.32, playedOfRank * 0.045);

  const unseenOfRank = 4 - countRankSeen(hand, state.revealedMemory, claimedRank);
  if (unseenOfRank > 0 && n > 0) {
    p += Math.min(0.3, (n / unseenOfRank) * 0.2);
  }

  if (state.difficulty === 'hard') {
    p += Math.min(0.12, (state.pile.length / 48) * 0.15);
  }

  p = Math.min(0.92, p);
  return random() < p;
}
