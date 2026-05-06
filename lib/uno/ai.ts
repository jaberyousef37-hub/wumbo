import { getPlayableCards } from './rules';
import type { UnoCard, UnoDifficulty, UnoSuit } from './types';

/** Color the AI declares after playing wild / wild_draw4 — picks most common in hand. */
export function aiChooseWildColor(hand: UnoCard[]): UnoSuit {
  const counts: Record<UnoSuit, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
  for (const c of hand) {
    if (c.color) counts[c.color]++;
  }
  let best: UnoSuit = 'red';
  let max = -1;
  (['red', 'blue', 'green', 'yellow'] as const).forEach((s) => {
    if (counts[s] > max) {
      max = counts[s];
      best = s;
    }
  });
  return best;
}

export function aiChooseCard(
  hand: UnoCard[],
  top: UnoCard,
  activeColor: UnoSuit,
  winningThreshold: number,
  difficulty: UnoDifficulty,
  playerHandCount: number,
  drawStack: number,
): UnoCard | null {
  const legal = getPlayableCards(hand, top, activeColor, drawStack);
  if (legal.length === 0) return null;

  // Easy: random legal card
  if (difficulty === 'easy') {
    return legal[Math.floor(Math.random() * legal.length)] ?? null;
  }

  // If stacking Draw Twos, always stack
  if (drawStack > 0) {
    const draw2s = legal.filter((c) => c.type === 'draw2');
    return draw2s[0] ?? legal[0] ?? null;
  }

  // Separate WD4 — only play if hand is very small (≤ 2 cards after playing)
  // or it's the only legal option.
  const nonWd4 = legal.filter((c) => c.type !== 'wild_draw4');
  const wd4s = legal.filter((c) => c.type === 'wild_draw4');

  // If non-WD4 options exist, always prefer them (saves WD4 for endgame)
  const pool = nonWd4.length > 0 ? nonWd4 : wd4s;

  if (difficulty === 'hard') {
    const playerClose = playerHandCount <= 2;

    // When player is close to winning, prioritise aggression
    if (playerClose) {
      // Skip / Reverse / Draw2 first (same color preferred)
      const actions = pool.filter((c) => ['skip', 'reverse', 'draw2'].includes(c.type));
      if (actions.length > 0) {
        const sameColorActions = actions.filter((c) => c.color === activeColor);
        return sameColorActions[0] ?? actions[0] ?? null;
      }
      // Fallthrough to normal priority
    }

    // Normal hard priority: action cards > same-color > same-number/type > wild > WD4
    const actions = pool.filter((c) => ['skip', 'reverse', 'draw2'].includes(c.type));
    if (actions.length > 0) {
      const sameColor = actions.filter((c) => c.color === activeColor);
      return sameColor[0] ?? actions[0] ?? null;
    }

    const sameColorNums = pool.filter((c) => c.color === activeColor && c.type === 'number');
    if (sameColorNums.length > 0) {
      return sameColorNums[Math.floor(Math.random() * sameColorNums.length)] ?? null;
    }

    const anyColored = pool.filter((c) => c.color !== null && c.type !== 'wild');
    if (anyColored.length > 0) {
      return anyColored[Math.floor(Math.random() * anyColored.length)] ?? null;
    }

    const wilds = pool.filter((c) => c.type === 'wild');
    if (wilds.length > 0) return wilds[0] ?? null;

    return pool[0] ?? null;
  }

  // Medium: prioritise action cards when close to winning; otherwise weighted random
  const preferAction = hand.length <= winningThreshold;
  if (preferAction) {
    const actions = pool.filter((c) => ['skip', 'reverse', 'draw2'].includes(c.type));
    if (actions.length > 0) return actions[0] ?? null;
  }

  // Prefer same-color plays to keep colour control
  const sameColor = pool.filter((c) => c.color === activeColor);
  if (sameColor.length > 0) {
    return sameColor[Math.floor(Math.random() * sameColor.length)] ?? null;
  }

  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
