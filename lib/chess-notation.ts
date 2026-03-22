import type { Board, ChessMove } from './chess-ai';

function sq(row: number, col: number): string {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

const PIECE_LETTER: Partial<Record<string, string>> = {
  N: 'N',
  B: 'B',
  R: 'R',
  Q: 'Q',
  K: 'K',
  n: 'N',
  b: 'B',
  r: 'R',
  q: 'Q',
  k: 'K',
};

/** Simplified SAN (no disambiguation for duplicate pieces). */
export function moveToAlgebraic(board: Board, mv: ChessMove): string {
  const piece = board[mv.fr][mv.fc];
  if (!piece) return sq(mv.tr, mv.tc);
  const dest = sq(mv.tr, mv.tc);
  const cap = board[mv.tr][mv.tc];
  const pl = piece.toLowerCase();
  if (pl === 'p') {
    if (cap) return `${String.fromCharCode(97 + mv.fc)}x${dest}`;
    return dest;
  }
  const letter = PIECE_LETTER[piece] ?? '';
  return `${letter}${cap ? 'x' : ''}${dest}`;
}

export function sideLabel(whiteMoved: boolean): string {
  return whiteMoved ? 'White' : 'Black';
}
