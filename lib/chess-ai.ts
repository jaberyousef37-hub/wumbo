/**
 * Chess AI: legal moves, minimax + alpha-beta.
 * Easy: random | Medium: depth-2, capture-heavy ordering, material + king pressure
 * Hard: depth-4, material + piece-square tables + king safety
 */

export type Piece = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type Board = (Piece | null)[][];

export type ChessMove = { fr: number; fc: number; tr: number; tc: number };

export type AiDifficulty = 'easy' | 'medium' | 'hard';

export function isWhite(p: Piece | null): boolean {
  return p !== null && p === p.toUpperCase();
}

export function isBlack(p: Piece | null): boolean {
  return p !== null && p === p.toLowerCase();
}

export function getValidMoves(board: Board, row: number, col: number): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];
  const moves: [number, number][] = [];
  const white = isWhite(piece);

  const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const isEmpty = (r: number, c: number) => !board[r][c];
  const isEnemy = (r: number, c: number) => {
    const p = board[r][c];
    return !!(p && (white ? isBlack(p) : isWhite(p)));
  };
  const isFriendly = (r: number, c: number) => {
    const p = board[r][c];
    return !!(p && (white ? isWhite(p) : isBlack(p)));
  };

  const addUntilBlocked = (dr: number, dc: number) => {
    for (let r = row + dr, c = col + dc; inBounds(r, c); r += dr, c += dc) {
      if (isEmpty(r, c)) moves.push([r, c]);
      else if (isEnemy(r, c)) {
        moves.push([r, c]);
        break;
      } else break;
    }
  };

  const p = piece.toLowerCase();
  if (p === 'p') {
    const dir = white ? -1 : 1;
    const start = white ? 6 : 1;
    if (inBounds(row + dir, col) && isEmpty(row + dir, col)) {
      moves.push([row + dir, col]);
      if (row === start && isEmpty(row + 2 * dir, col)) moves.push([row + 2 * dir, col]);
    }
    for (const dc of [-1, 1]) {
      if (inBounds(row + dir, col + dc) && isEnemy(row + dir, col + dc))
        moves.push([row + dir, col + dc]);
    }
  } else if (p === 'r') {
    addUntilBlocked(1, 0);
    addUntilBlocked(-1, 0);
    addUntilBlocked(0, 1);
    addUntilBlocked(0, -1);
  } else if (p === 'b') {
    addUntilBlocked(1, 1);
    addUntilBlocked(1, -1);
    addUntilBlocked(-1, 1);
    addUntilBlocked(-1, -1);
  } else if (p === 'q') {
    addUntilBlocked(1, 0);
    addUntilBlocked(-1, 0);
    addUntilBlocked(0, 1);
    addUntilBlocked(0, -1);
    addUntilBlocked(1, 1);
    addUntilBlocked(1, -1);
    addUntilBlocked(-1, 1);
    addUntilBlocked(-1, -1);
  } else if (p === 'n') {
    for (const [dr, dc] of [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ]) {
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c) && !isFriendly(r, c)) moves.push([r, c]);
    }
  } else if (p === 'k') {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (inBounds(r, c) && !isFriendly(r, c)) moves.push([r, c]);
      }
  }
  return moves;
}

function isSquareAttacked(board: Board, row: number, col: number, byWhite: boolean): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || (byWhite ? isBlack(p) : isWhite(p))) continue;
      const moves = getValidMoves(board, r, c);
      if (moves.some(([mr, mc]) => mr === row && mc === col)) return true;
    }
  }
  return false;
}

export function findKing(board: Board, white: boolean): [number, number] | null {
  const k = white ? 'K' : 'k';
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) if (board[r][c] === k) return [r, c];
  return null;
}

export function isInCheck(board: Board, whiteTurn: boolean): boolean {
  const king = findKing(board, whiteTurn);
  return king ? isSquareAttacked(board, king[0], king[1], !whiteTurn) : false;
}

export function filterLegalMoves(
  board: Board,
  row: number,
  col: number,
  moves: [number, number][]
): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];
  const white = isWhite(piece);
  const legal: [number, number][] = [];
  for (const [r, c] of moves) {
    const next = board.map((row) => [...row]);
    let moved = next[row][col]!;
    next[r][c] = moved;
    next[row][col] = null;
    if ((moved === 'P' && r === 0) || (moved === 'p' && r === 7)) {
      moved = (moved === 'P' ? 'Q' : 'q') as Piece;
      next[r][c] = moved;
    }
    if (!isInCheck(next, white)) legal.push([r, c]);
  }
  return legal;
}

export function hasAnyLegalMove(board: Board, whiteTurn: boolean): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || (whiteTurn ? isBlack(p) : isWhite(p))) continue;
      const moves = filterLegalMoves(board, r, c, getValidMoves(board, r, c));
      if (moves.length > 0) return true;
    }
  }
  return false;
}

export function applyMove(board: Board, m: ChessMove): Board {
  const next = board.map((row) => [...row]);
  let moved = next[m.fr][m.fc]!;
  next[m.fr][m.fc] = null;
  if ((moved === 'P' && m.tr === 0) || (moved === 'p' && m.tr === 7)) {
    moved = (moved === 'P' ? 'Q' : 'q') as Piece;
  }
  next[m.tr][m.tc] = moved;
  return next;
}

function getAllLegalMoves(board: Board, forBlack: boolean): ChessMove[] {
  const out: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || (forBlack ? !isBlack(p) : !isWhite(p))) continue;
      const legal = filterLegalMoves(board, r, c, getValidMoves(board, r, c));
      for (const [tr, tc] of legal) out.push({ fr: r, fc: c, tr, tc });
    }
  }
  return out;
}

const VAL: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

function pieceVal(p: Piece): number {
  return VAL[p.toLowerCase()] ?? 0;
}

/** Material only — Black positive. */
function evaluateMaterial(board: Board): number {
  let s = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const v = pieceVal(p);
      s += isBlack(p) ? v : -v;
    }
  }
  return s;
}

function kingPressure(board: Board): number {
  const bKing = findKing(board, false);
  const wKing = findKing(board, true);
  let s = 0;
  if (bKing && isSquareAttacked(board, bKing[0], bKing[1], true)) s -= 380;
  if (wKing && isSquareAttacked(board, wKing[0], wKing[1], false)) s += 380;
  return s;
}

/** Piece-square tables (white-oriented: row 0 = far side / promotion for white pawns in classic tables — we map from board coords). */
const PST_P: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const PST_N: number[][] = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const PST_B: number[][] = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const PST_R: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const PST_Q: number[][] = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const PST_K_MG: number[][] = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

function pstLookup(
  piece: Piece,
  r: number,
  c: number,
  whitePiece: boolean
): number {
  const t = piece.toLowerCase();
  const row = whitePiece ? 7 - r : r;
  const col = whitePiece ? c : 7 - c;
  let tab: number[][];
  switch (t) {
    case 'p':
      tab = PST_P;
      break;
    case 'n':
      tab = PST_N;
      break;
    case 'b':
      tab = PST_B;
      break;
    case 'r':
      tab = PST_R;
      break;
    case 'q':
      tab = PST_Q;
      break;
    case 'k':
      tab = PST_K_MG;
      break;
    default:
      return 0;
  }
  const v = tab[row]?.[col] ?? 0;
  return whitePiece ? -v : v;
}

function evaluatePST(board: Board): number {
  let s = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.toLowerCase() === 'k') continue;
      const w = isWhite(p);
      const pst = pstLookup(p, r, c, w);
      s += w ? -pst : pst;
    }
  }
  return s;
}

function kingPST(board: Board): number {
  let s = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.toLowerCase() !== 'k') continue;
      const w = isWhite(p);
      const pst = pstLookup(p, r, c, w);
      s += w ? -pst : pst;
    }
  }
  return s;
}

/** Extended king safety: attacks on adjacent squares + pawn shield. */
function kingSafetyHard(board: Board): number {
  let s = kingPressure(board);
  const bKing = findKing(board, false);
  const wKing = findKing(board, true);

  const shield = (kr: number, kc: number, forWhite: boolean) => {
    let bonus = 0;
    const dir = forWhite ? 1 : -1;
    for (let dc = -1; dc <= 1; dc++) {
      const r = kr + dir;
      const c = kc + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = board[r][c];
        if (p && (forWhite ? p === 'P' : p === 'p')) bonus += 18;
      }
    }
    return bonus;
  };

  const attackRing = (kr: number, kc: number, attackedByWhite: boolean) => {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = kr + dr;
        const c = kc + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8 && isSquareAttacked(board, r, c, attackedByWhite))
          n += 1;
      }
    return n;
  };

  if (bKing) {
    s -= attackRing(bKing[0], bKing[1], true) * 22;
    s += shield(bKing[0], bKing[1], false);
  }
  if (wKing) {
    s += attackRing(wKing[0], wKing[1], false) * 22;
    s -= shield(wKing[0], wKing[1], true);
  }
  return s;
}

/** Medium leaf: material + basic check pressure on kings. */
function evaluateMedium(board: Board): number {
  return evaluateMaterial(board) + kingPressure(board);
}

/** Hard leaf: material + PST + king placement + extended safety. */
function evaluateHard(board: Board): number {
  return (
    evaluateMaterial(board) +
    evaluatePST(board) +
    kingPST(board) +
    kingSafetyHard(board)
  );
}

function sortMovesCaptureFirst(board: Board, moves: ChessMove[]): ChessMove[] {
  const score = (m: ChessMove) => {
    const target = board[m.tr][m.tc];
    const cap = target ? pieceVal(target) : 0;
    const self = pieceVal(board[m.fr][m.fc]!);
    return cap * 100 - self;
  };
  return [...moves].sort((a, b) => score(b) - score(a));
}

function sortMovesMVVLVA(board: Board, moves: ChessMove[]): ChessMove[] {
  const score = (m: ChessMove) => {
    const target = board[m.tr][m.tc];
    const cap = target ? pieceVal(target) : 0;
    const self = pieceVal(board[m.fr][m.fc]!);
    return cap * 12 - self * 0.15;
  };
  return [...moves].sort((a, b) => score(b) - score(a));
}

function minimax(
  board: Board,
  depth: number,
  maximizingForBlack: boolean,
  alpha: number,
  beta: number,
  leafEval: (b: Board) => number,
  orderMoves: (b: Board, m: ChessMove[]) => ChessMove[]
): number {
  const forBlack = maximizingForBlack;
  const sideToMoveIsWhite = !forBlack;
  const moves = getAllLegalMoves(board, forBlack);

  if (moves.length === 0) {
    if (isInCheck(board, sideToMoveIsWhite)) {
      return forBlack ? -100000 + depth : 100000 - depth;
    }
    return 0;
  }

  if (depth === 0) return leafEval(board);

  const ordered = orderMoves(board, moves);

  if (forBlack) {
    let best = -Infinity;
    for (const m of ordered) {
      const nb = applyMove(board, m);
      const sc = minimax(nb, depth - 1, false, alpha, beta, leafEval, orderMoves);
      best = Math.max(best, sc);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of ordered) {
    const nb = applyMove(board, m);
    const sc = minimax(nb, depth - 1, true, alpha, beta, leafEval, orderMoves);
    best = Math.min(best, sc);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function findBestMoveWithEval(
  board: Board,
  depth: number,
  leafEval: (b: Board) => number,
  orderMoves: (b: Board, m: ChessMove[]) => ChessMove[]
): ChessMove | null {
  const moves = getAllLegalMoves(board, true);
  if (moves.length === 0) return null;
  const ordered = orderMoves(board, moves);
  let best: ChessMove = ordered[0]!;
  let bestScore = -Infinity;
  for (const m of ordered) {
    const nb = applyMove(board, m);
    const sc = minimax(nb, depth - 1, false, -Infinity, Infinity, leafEval, orderMoves);
    if (sc > bestScore) {
      bestScore = sc;
      best = m;
    }
  }
  return best;
}

export function findBestMoveMedium(board: Board, depth = 2): ChessMove | null {
  return findBestMoveWithEval(board, depth, evaluateMedium, sortMovesCaptureFirst);
}

export function findBestMoveHard(board: Board, depth = 4): ChessMove | null {
  return findBestMoveWithEval(board, depth, evaluateHard, sortMovesMVVLVA);
}

export function randomBlackMove(board: Board): ChessMove | null {
  const moves = getAllLegalMoves(board, true);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)]!;
}

export function pickBlackMove(board: Board, mode: AiDifficulty): ChessMove | null {
  if (mode === 'easy') return randomBlackMove(board);
  if (mode === 'medium') return findBestMoveMedium(board, 2);
  return findBestMoveHard(board, 4);
}
