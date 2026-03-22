/** Classic 10×10 Snakes & Ladders — square numbers 1 (bottom-left) → 100 (top-right), zig-zag rows. */

/** Bottom of ladder → top */
export const LADDERS: Readonly<Record<number, number>> = {
  4: 14,
  9: 31,
  21: 42,
  28: 84,
};

/** Mouth of snake → tail */
export const SNAKES: Readonly<Record<number, number>> = {
  17: 7,
  54: 34,
  62: 19,
};

export const BOARD_SIZE = 10;

/** Row/col are 0–9 with row 0 at the top of the screen (square 100 area). */
export function squareToRC(square: number): { row: number; col: number } {
  if (square < 1) return { row: 9, col: 0 };
  if (square > 100) return { row: 0, col: 9 };
  const rowFromBottom = Math.floor((square - 1) / 10);
  const row = 9 - rowFromBottom;
  const col = rowFromBottom % 2 === 0 ? (square - 1) % 10 : 9 - ((square - 1) % 10);
  return { row, col };
}

export function rcToSquare(row: number, col: number): number {
  const r = Math.max(0, Math.min(9, row));
  const c = Math.max(0, Math.min(9, col));
  const rowFromBottom = 9 - r;
  const base = rowFromBottom * 10;
  const offset = rowFromBottom % 2 === 0 ? c : 9 - c;
  return base + offset + 1;
}

export function applySnakeOrLadder(square: number): { end: number; kind: 'snake' | 'ladder' | null } {
  if (LADDERS[square]) return { end: LADDERS[square], kind: 'ladder' };
  if (SNAKES[square]) return { end: SNAKES[square], kind: 'snake' };
  return { end: square, kind: null };
}

/** If moving by `roll` from `from` overshoots 100, stay at `from`. */
export function nextPositionAfterRoll(from: number, roll: number): number {
  if (from >= 100) return 100;
  if (from + roll > 100) return from;
  return from + roll;
}
