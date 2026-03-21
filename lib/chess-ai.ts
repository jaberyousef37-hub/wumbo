/**
 * Chess AI: minimax + alpha-beta; evaluation = material + king safety (Black maximizes).
 */

export type Piece = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type Board = (Piece | null)[][];

type Move = { fr: number; fc: number; tr: number; tc: number };

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

function findKing(board: Board, white: boolean): [number, number] | null {
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

export function applyMove(board: Board, m: Move): Board {
  const next = board.map((row) => [...row]);
  let moved = next[m.fr][m.fc]!;
  next[m.fr][m.fc] = null;
  if ((moved === 'P' && m.tr === 0) || (moved === 'p' && m.tr === 7)) {
    moved = (moved === 'P' ? 'Q' : 'q') as Piece;
  }
  next[m.tr][m.tc] = moved;
  return next;
}

function getAllLegalMoves(board: Board, forBlack: boolean): Move[] {
  const out: Move[] = [];
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

function evaluate(board: Board): number {
  let material = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const v = pieceVal(p);
      material += isBlack(p) ? v : -v;
    }
  }

  const bKing = findKing(board, false);
  const wKing = findKing(board, true);
  let kingSafety = 0;
  if (bKing && isSquareAttacked(board, bKing[0], bKing[1], true)) kingSafety -= 380;
  if (wKing && isSquareAttacked(board, wKing[0], wKing[1], false)) kingSafety += 380;

  return material + kingSafety;
}

function sortMoves(board: Board, moves: Move[]): Move[] {
  const score = (m: Move) => {
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
  beta: number
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

  if (depth === 0) return evaluate(board);

  const ordered = sortMoves(board, moves);

  if (forBlack) {
    let best = -Infinity;
    for (const m of ordered) {
      const nb = applyMove(board, m);
      const sc = minimax(nb, depth - 1, false, alpha, beta);
      best = Math.max(best, sc);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of ordered) {
    const nb = applyMove(board, m);
    const sc = minimax(nb, depth - 1, true, alpha, beta);
    best = Math.min(best, sc);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

export function findBestMove(board: Board, depth: number): Move | null {
  const moves = getAllLegalMoves(board, true);
  if (moves.length === 0) return null;
  const ordered = sortMoves(board, moves);
  let best: Move = ordered[0]!;
  let bestScore = -Infinity;
  for (const m of ordered) {
    const nb = applyMove(board, m);
    const sc = minimax(nb, depth - 1, false, -Infinity, Infinity);
    if (sc > bestScore) {
      bestScore = sc;
      best = m;
    }
  }
  return best;
}

export function randomBlackMove(board: Board): Move | null {
  const moves = getAllLegalMoves(board, true);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)]!;
}
