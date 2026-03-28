import { getPlayableCards } from './rules';
import type { UnoCard, UnoDifficulty, UnoSuit } from './types';

const ACTION_PRIORITY: UnoCard['type'][] = [
  'wild_draw4',
  'draw2',
  'skip',
  'reverse',
  'wild',
];

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

  if (difficulty === 'easy') {
    return legal[Math.floor(Math.random() * legal.length)];
  }

  if (drawStack > 0) {
    const draw2s = legal.filter((c) => c.type === 'draw2');
    return draw2s[Math.floor(Math.random() * draw2s.length)] ?? legal[0] ?? null;
  }

  if (difficulty === 'hard') {
    const playerClose = playerHandCount <= 3;
    if (playerClose) {
      for (const t of ACTION_PRIORITY) {
        const found = legal.find((c) => c.type === t);
        if (found) return found;
      }
    }
    const withoutWild = legal.filter((c) => c.type !== 'wild' && c.type !== 'wild_draw4');
    if (withoutWild.length > 0) {
      const nums = withoutWild.filter((c) => c.type === 'number');
      if (nums.length > 0) {
        return nums[Math.floor(Math.random() * nums.length)];
      }
      return withoutWild[Math.floor(Math.random() * withoutWild.length)];
    }
    for (const t of ACTION_PRIORITY) {
      const found = legal.find((c) => c.type === t);
      if (found) return found;
    }
    return legal[Math.floor(Math.random() * legal.length)] ?? legal[0] ?? null;
  }

  // medium — prefer action cards when hand is small (“winning”)
  const preferAction = hand.length <= winningThreshold;
  if (preferAction) {
    for (const t of ACTION_PRIORITY) {
      const found = legal.find((c) => c.type === t);
      if (found) return found;
    }
  }
  return legal[Math.floor(Math.random() * legal.length)] ?? legal[0] ?? null;
}

/** Color the AI declares after playing wild / wild_draw4 */
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
