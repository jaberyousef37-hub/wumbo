import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { WinnerModal } from '@/components/winner-modal';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { playClick } from '@/lib/sounds';

const PIECES: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const LIGHT_SQ = '#4a2c6d';
const DARK_SQ = '#2d1b4e';
const HIGHLIGHT = 'rgba(183, 148, 246, 0.5)';
const VALID_MOVE = 'rgba(104, 211, 145, 0.4)';

type Piece = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
type Board = (Piece | null)[][];

const INITIAL: Board = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

function isWhite(p: Piece | null): boolean {
  return p !== null && p === p.toUpperCase();
}

function isBlack(p: Piece | null): boolean {
  return p !== null && p === p.toLowerCase();
}

function getValidMoves(board: Board, row: number, col: number): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];
  const moves: [number, number][] = [];
  const white = isWhite(piece);

  const inBounds = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const isEmpty = (r: number, c: number) => !board[r][c];
  const isEnemy = (r: number, c: number) => {
    const p = board[r][c];
    return p && (white ? isBlack(p) : isWhite(p));
  };
  const isFriendly = (r: number, c: number) => {
    const p = board[r][c];
    return p && (white ? isWhite(p) : isBlack(p));
  };

  const addUntilBlocked = (dr: number, dc: number) => {
    for (let r = row + dr, c = col + dc; inBounds(r, c); r += dr, c += dc) {
      if (isEmpty(r, c)) moves.push([r, c]);
      else if (isEnemy(r, c)) { moves.push([r, c]); break; }
      else break;
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
    addUntilBlocked(1, 0); addUntilBlocked(-1, 0); addUntilBlocked(0, 1); addUntilBlocked(0, -1);
  } else if (p === 'b') {
    addUntilBlocked(1, 1); addUntilBlocked(1, -1); addUntilBlocked(-1, 1); addUntilBlocked(-1, -1);
  } else if (p === 'q') {
    addUntilBlocked(1, 0); addUntilBlocked(-1, 0); addUntilBlocked(0, 1); addUntilBlocked(0, -1);
    addUntilBlocked(1, 1); addUntilBlocked(1, -1); addUntilBlocked(-1, 1); addUntilBlocked(-1, -1);
  } else if (p === 'n') {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const r = row + dr, c = col + dc;
      if (inBounds(r, c) && !isFriendly(r, c)) moves.push([r, c]);
    }
  } else if (p === 'k') {
    for (const dr of [-1,0,1]) for (const dc of [-1,0,1]) {
      if (dr===0 && dc===0) continue;
      const r = row + dr, c = col + dc;
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
    for (let c = 0; c < 8; c++)
      if (board[r][c] === k) return [r, c];
  return null;
}

function isInCheck(board: Board, whiteTurn: boolean): boolean {
  const king = findKing(board, whiteTurn);
  return king ? isSquareAttacked(board, king[0], king[1], !whiteTurn) : false;
}

function filterLegalMoves(board: Board, row: number, col: number, moves: [number, number][]): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];
  const white = isWhite(piece);
  const legal: [number, number][] = [];
  for (const [r, c] of moves) {
    const next = board.map((row) => [...row]);
    next[r][c] = piece;
    next[row][col] = null;
    if (!isInCheck(next, white)) legal.push([r, c]);
  }
  return legal;
}

function hasAnyLegalMove(board: Board, whiteTurn: boolean): boolean {
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

export default function ChessScreen() {
  const router = useRouter();
  const [board, setBoard] = useState<Board>(() => INITIAL.map((r) => [...r]));
  const [whiteTurn, setWhiteTurn] = useState(true);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  const inCheck = isInCheck(board, whiteTurn);
  const checkmate = inCheck && !hasAnyLegalMove(board, whiteTurn);

  const handleSquarePress = useCallback((row: number, col: number) => {
    if (gameOver) return;

    const piece = board[row][col];
    const isPieceWhite = piece && isWhite(piece);
    const isPieceBlack = piece && isBlack(piece);

    if (selected) {
      const [sr, sc] = selected;
      const isTarget = validMoves.some(([r, c]) => r === row && c === col);
      if (isTarget) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        playClick();
        const next = board.map((r) => [...r]);
        let piece = next[sr][sc]!;
        next[sr][sc] = null;
        if ((piece === 'P' && row === 0) || (piece === 'p' && row === 7)) {
          piece = (piece === 'P' ? 'Q' : 'q') as Piece;
        }
        next[row][col] = piece;
        setBoard(next);
        setWhiteTurn(!whiteTurn);
        setSelected(null);
        setValidMoves([]);

        const nextInCheck = isInCheck(next, !whiteTurn);
        const nextCheckmate = nextInCheck && !hasAnyLegalMove(next, !whiteTurn);
        if (nextCheckmate) {
          const whiteWins = whiteTurn;
          setGameOver(whiteWins ? 'White wins!' : 'Black wins!');
          setWins((w) => w + (whiteWins ? 1 : 0));
          setLosses((l) => l + (whiteWins ? 0 : 1));
        }
      } else if (piece && ((whiteTurn && isPieceWhite) || (!whiteTurn && isPieceBlack))) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const moves = filterLegalMoves(board, row, col, getValidMoves(board, row, col));
        setSelected([row, col]);
        setValidMoves(moves);
      } else {
        setSelected(null);
        setValidMoves([]);
      }
    } else {
      if (piece && ((whiteTurn && isPieceWhite) || (!whiteTurn && isPieceBlack))) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const moves = filterLegalMoves(board, row, col, getValidMoves(board, row, col));
        setSelected([row, col]);
        setValidMoves(moves);
      }
    }
  }, [board, whiteTurn, selected, validMoves, gameOver]);

  const handleRestart = useCallback(() => {
    setBoard(INITIAL.map((r) => [...r]));
    setWhiteTurn(true);
    setSelected(null);
    setValidMoves([]);
    setGameOver(null);
  }, []);

  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.container}>
        {/* Gradient header with scores */}
        <LinearGradient
          colors={[Colors.dark.tint, Colors.dark.accentPink, Colors.dark.accentYellow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="defaultSemiBold" style={styles.title} darkColor="#fff">
              Chess
            </ThemedText>
            <View style={styles.headerScores}>
              <View style={styles.headerScoreItem}>
                <ThemedText style={styles.headerScoreLabel} darkColor="rgba(255,255,255,0.9)">White</ThemedText>
                <ThemedText style={styles.headerScoreVal} darkColor="#fff">{wins}</ThemedText>
              </View>
              <View style={styles.headerScoreDivider} />
              <View style={styles.headerScoreItem}>
                <ThemedText style={styles.headerScoreLabel} darkColor="rgba(255,255,255,0.9)">Black</ThemedText>
                <ThemedText style={styles.headerScoreVal} darkColor="#fff">{losses}</ThemedText>
              </View>
            </View>
          </View>
        </LinearGradient>

        {!gameOver && (
          <View style={styles.turnBar}>
            <ThemedText style={styles.turnText}>
              {whiteTurn ? "White's turn" : "Black's turn"}
              {inCheck && ' • Check!'}
            </ThemedText>
          </View>
        )}
        {gameOver && (
          <View style={styles.resultBar}>
            <ThemedText style={styles.resultText}>{gameOver}</ThemedText>
          </View>
        )}

        <View style={styles.boardWrap}>
          {board.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((piece, colIdx) => {
                const isLight = (rowIdx + colIdx) % 2 === 1;
                const isSelected = selected?.[0] === rowIdx && selected?.[1] === colIdx;
                const isValidTarget = validMoves.some(([r, c]) => r === rowIdx && c === colIdx);
                return (
                  <Pressable
                    key={colIdx}
                    onPress={() => handleSquarePress(rowIdx, colIdx)}
                    style={[
                      styles.square,
                      { backgroundColor: isValidTarget ? VALID_MOVE : isSelected ? HIGHLIGHT : isLight ? LIGHT_SQ : DARK_SQ },
                    ]}
                  >
                    {piece && <Text style={styles.piece}>{PIECES[piece]}</Text>}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <Pressable onPress={handleRestart} style={styles.restartBtn}>
          <MaterialIcons name="refresh" size={22} color={Colors.dark.background} />
          <Text style={styles.restartText}>Restart</Text>
        </Pressable>
      </View>

      {/* Winner celebration modal */}
      <WinnerModal
        visible={!!gameOver}
        winnerName={gameOver?.replace(' wins!', '') ?? ''}
        score={{ wins, losses }}
        subtitle="Checkmate!"
        onPlayAgain={handleRestart}
      />
    </SafeAreaView>
  );
}

const SQUARE_SIZE = 44;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: { marginRight: 12 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerScores: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 16,
  },
  headerScoreItem: { alignItems: 'center' },
  headerScoreLabel: { fontSize: 12 },
  headerScoreVal: { fontSize: 16, fontWeight: '800' },
  headerScoreDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  title: { fontSize: 22 },
  turnBar: { marginBottom: 8 },
  turnText: { fontSize: 16, opacity: 0.9 },
  resultBar: { marginBottom: 8 },
  resultText: { fontSize: 18, fontWeight: '700', color: Colors.dark.tint },
  boardWrap: {
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  row: { flexDirection: 'row' },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: { fontSize: 28, color: Colors.dark.text },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dark.tint,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 20,
    alignSelf: 'center',
  },
  restartText: { color: Colors.dark.background, fontSize: 16, fontWeight: '700' },
});
