/** Deterministic “crowd” percentages per question (for fun — not real data). */

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Returns percent for option A (left); B is the remainder. Slightly favors the player’s pick. */
export function fakePercentsForPick(questionId: string, pick: 'a' | 'b'): { aPct: number; bPct: number } {
  const h = hash32(questionId);
  const mid = 36 + (h % 29);
  const bump = 5 + ((h >> 7) % 8);
  if (pick === 'a') {
    const a = Math.min(78, mid + bump);
    return { aPct: a, bPct: 100 - a };
  }
  const a = Math.max(22, mid - bump);
  return { aPct: a, bPct: 100 - a };
}
