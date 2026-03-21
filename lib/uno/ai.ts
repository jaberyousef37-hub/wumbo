import type { UnoCard, UnoSuit } from './types';
import { getPlayableCards } from './rules';

const ACTION_PRIORITY: UnoCard['type'][] = [
  'wild_draw4',
  'draw2',
  'skip',
  'reverse',
  'wild',
];

/** Prefer action cards when hand is small (“winning”). */
export function aiChooseCard(
  hand: UnoCard[],
  top: UnoCard,
  activeColor: UnoSuit,
  winningThreshold: number,
): UnoCard | null {
  const legal = getPlayableCards(hand, top, activeColor);
  if (legal.length === 0) return null;

  const preferAction = hand.length <= winningThreshold;
  if (preferAction) {
    for (const t of ACTION_PRIORITY) {
      const found = legal.find((c) => c.type === t);
      if (found) return found;
    }
  }
  return legal[Math.floor(Math.random() * legal.length)];
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
