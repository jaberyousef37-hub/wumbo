import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { WinnerModal } from '@/components/winner-modal';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import {
  applyMove,
  findBestMove,
  randomBlackMove,
  filterLegalMoves,
  getValidMoves,
  hasAnyLegalMove,
  isInCheck,
  isWhite,
  type Board,
  type Piece,
} from '@/lib/chess-ai';
import { playClick } from '@/lib/sounds';

const PIECE_CDN = 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150';
const PIECE_TO_CDN: Record<string, string> = {
  K: 'wk', Q: 'wq', R: 'wr', B: 'wb', N: 'wn', P: 'wp',
  k: 'bk', q: 'bq', r: 'br', b: 'bb', n: 'bn', p: 'bp',
};
const PIECES: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const LIGHT_SQ = '#F0D9B5';
const DARK_SQ = '#B58863';
const SELECTED_HIGHLIGHT = '#F6F669';
const VALID_MOVE_DOT = '#22C55E';
const VALID_MOVE_DOT_RING = '#4ADE80';

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

type ChessDifficulty = 'easy' | 'medium' | 'hard';

function ChessPieceImage({ piece, size }: { piece: Piece; size: number }) {
  const cdnName = PIECE_TO_CDN[piece];
  if (!cdnName) return null;
  return (
    <Image
      source={{ uri: `${PIECE_CDN}/${cdnName}.png` }}
      style={{ width: size * 0.92, height: size * 0.92 }}
      contentFit="contain"
    />
  );
}

function PulsingDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    );
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[styles.pulsingDot, animatedStyle]} />
  );
}

export default function ChessScreen() {
  const router = useRouter();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const boardPadding = 16;
  const rankCol = 20;
  const reservedVertical =
    insets.top + insets.bottom + 56 + 52 * 2 + 36 + 56 + 24;
  const maxBoardPx = Math.min(winW - boardPadding * 2 - rankCol, winH - reservedVertical);
  const squareSize = Math.max(28, Math.floor(maxBoardPx / 8));

  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  const [board, setBoard] = useState<Board>(() => INITIAL.map((r) => [...r]));
  const [whiteTurn, setWhiteTurn] = useState(true);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [capturedByWhite, setCapturedByWhite] = useState<Piece[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<Piece[]>([]);
  const [difficulty, setDifficulty] = useState<ChessDifficulty | null>(null);

  const boardRef = useRef(board);
  boardRef.current = board;

  const inCheck = isInCheck(board, whiteTurn);

  const handleSquarePress = useCallback(
    (row: number, col: number) => {
      if (gameOver || !whiteTurn) return;

      const piece = board[row][col];
      const isPieceWhite = piece && isWhite(piece);

      if (selected) {
        const [sr, sc] = selected;
        const isTarget = validMoves.some(([r, c]) => r === row && c === col);
        if (isTarget) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          playClick();
          const next = board.map((r) => [...r]);
          let movedPiece = next[sr][sc]!;
          const captured = next[row][col];
          next[sr][sc] = null;
          if ((movedPiece === 'P' && row === 0) || (movedPiece === 'p' && row === 7)) {
            movedPiece = (movedPiece === 'P' ? 'Q' : 'q') as Piece;
          }
          next[row][col] = movedPiece;
          setBoard(next);

          if (captured) {
            if (isWhite(movedPiece)) {
              setCapturedByWhite((prev) => [...prev, captured]);
            } else {
              setCapturedByBlack((prev) => [...prev, captured]);
            }
          }

          setWhiteTurn(false);
          setSelected(null);
          setValidMoves([]);

          const blackInCheck = isInCheck(next, false);
          const blackMated = blackInCheck && !hasAnyLegalMove(next, false);
          if (blackMated) {
            setGameOver('White wins!');
            setWins((w) => w + 1);
          }
        } else if (piece && isPieceWhite) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const moves = filterLegalMoves(board, row, col, getValidMoves(board, row, col));
          setSelected([row, col]);
          setValidMoves(moves);
        } else {
          setSelected(null);
          setValidMoves([]);
        }
      } else if (piece && isPieceWhite) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const moves = filterLegalMoves(board, row, col, getValidMoves(board, row, col));
        setSelected([row, col]);
        setValidMoves(moves);
      }
    },
    [board, whiteTurn, selected, validMoves, gameOver]
  );

  const handleRestart = useCallback(() => {
    setBoard(INITIAL.map((r) => [...r]));
    setWhiteTurn(true);
    setSelected(null);
    setValidMoves([]);
    setGameOver(null);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
  }, []);

  const handleChangeDifficulty = useCallback(() => {
    setDifficulty(null);
    setBoard(INITIAL.map((r) => [...r]));
    setWhiteTurn(true);
    setSelected(null);
    setValidMoves([]);
    setGameOver(null);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
  }, []);

  useEffect(() => {
    if (gameOver || whiteTurn || difficulty === null) return;
    const id = setTimeout(() => {
      const b = boardRef.current;
      let mv = null;
      if (difficulty === 'easy') mv = randomBlackMove(b);
      else if (difficulty === 'medium') mv = findBestMove(b, 2);
      else mv = findBestMove(b, 4);
      if (!mv) return;
      const captured = b[mv.tr][mv.tc];
      const next = applyMove(b, mv);
      setBoard(next);
      if (captured) {
        if (isWhite(captured)) setCapturedByBlack((prev) => [...prev, captured]);
        else setCapturedByWhite((prev) => [...prev, captured]);
      }
      setWhiteTurn(true);
      const whiteInCheck = isInCheck(next, true);
      const whiteMated = whiteInCheck && !hasAnyLegalMove(next, true);
      if (whiteMated) {
        setGameOver('Black wins!');
        setLosses((l) => l + 1);
      } else if (!hasAnyLegalMove(next, true) && !whiteInCheck) {
        setGameOver('Draw (stalemate)');
      }
    }, 450);
    return () => clearTimeout(id);
  }, [whiteTurn, gameOver, difficulty]);

  const diffLabel =
    difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : difficulty === 'hard' ? 'Hard' : '';

  if (difficulty === null) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.container}>
          <LinearGradient
            colors={[palette.tint, palette.accentPink, palette.accentYellow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <ThemedText type="defaultSemiBold" style={styles.title} darkColor="#fff">
              Chess
            </ThemedText>
          </LinearGradient>
          <ThemedText type="title" style={[styles.diffScreenTitle, { color: palette.text }]}>
            Choose difficulty
          </ThemedText>
          <ThemedText style={[styles.diffScreenSub, { color: palette.icon }]}>
            You play White (bottom). The AI plays Black with search depth: Easy = random, Medium = 2 plies, Hard = 4
            plies (minimax + alpha-beta, piece values & king safety).
          </ThemedText>
          <Pressable
            onPress={() => setDifficulty('easy')}
            style={({ pressed }) => [
              styles.diffOption,
              { backgroundColor: palette.card, borderColor: palette.cardBorder },
              pressed && { opacity: 0.9 },
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
              Easy
            </ThemedText>
            <ThemedText type="caption" style={{ color: palette.icon }}>
              Random legal moves
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setDifficulty('medium')}
            style={({ pressed }) => [
              styles.diffOption,
              { backgroundColor: palette.card, borderColor: palette.cardBorder },
              pressed && { opacity: 0.9 },
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
              Medium
            </ThemedText>
            <ThemedText type="caption" style={{ color: palette.icon }}>
              Minimax depth 2
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setDifficulty('hard')}
            style={({ pressed }) => [
              styles.diffOption,
              { backgroundColor: palette.card, borderColor: palette.cardBorder },
              pressed && { opacity: 0.9 },
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
              Hard
            </ThemedText>
            <ThemedText type="caption" style={{ color: palette.icon }}>
              Minimax depth 4 — takes captures first
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient
          colors={[palette.tint, palette.accentPink, palette.accentYellow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.title} darkColor="#fff">
            Chess
          </ThemedText>
          <View style={styles.diffBadge}>
            <Text style={styles.diffBadgeText}>{diffLabel}</Text>
          </View>
        </LinearGradient>

        {/* Opponent bar (top - Black) */}
        <View style={[styles.playerBar, styles.playerBarTop, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.playerBarLeft}>
            {!whiteTurn && !gameOver && <PulsingDot />}
            <ThemedText type="defaultSemiBold" style={styles.playerName}>Opponent</ThemedText>
            {inCheck && !gameOver && !whiteTurn && (
              <ThemedText style={[styles.checkBadge, { color: palette.accentPink }]}>Check!</ThemedText>
            )}
          </View>
          <View style={styles.capturedRow}>
            {capturedByBlack.map((p, i) => (
              <Text key={`b-${i}`} style={styles.capturedPiece}>{PIECES[p]}</Text>
            ))}
          </View>
        </View>

        {!gameOver && (
          <View style={styles.turnBar}>
            <ThemedText style={styles.turnText}>
              {whiteTurn ? "Your turn" : "Opponent's turn"}
              {inCheck && ' • Check!'}
            </ThemedText>
          </View>
        )}
        {gameOver && (
          <View style={styles.resultBar}>
            <ThemedText style={[styles.resultText, { color: palette.tint }]}>{gameOver}</ThemedText>
          </View>
        )}

        <View
          style={[
            styles.boardWrap,
            {
              borderColor: palette.cardBorder,
              width: rankCol + squareSize * 8,
            },
          ]}
        >
          {/* File labels (a-h) - top */}
          <View style={[styles.coordRow, { width: squareSize * 8 + 20 }]}>
            <View style={[styles.coordCorner, { width: 20 }]} />
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((l, i) => (
              <Text key={l} style={[styles.coordLabel, { width: squareSize }]}>{l}</Text>
            ))}
          </View>
          <View style={styles.boardInner}>
            {/* Rank labels (8-1) + board */}
            {board.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.rowWithCoord}>
                <Text style={[styles.coordLabel, styles.rankLabel, { width: 20, height: squareSize }]}>
                  {8 - rowIdx}
                </Text>
                <View style={styles.row}>
                  {row.map((piece, colIdx) => {
                    const isLight = (rowIdx + colIdx) % 2 === 1;
                    const isSelectedSq = selected?.[0] === rowIdx && selected?.[1] === colIdx;
                    const isValidTarget = validMoves.some(([r, c]) => r === rowIdx && c === colIdx);
                    const sqColor = isSelectedSq ? SELECTED_HIGHLIGHT : isLight ? LIGHT_SQ : DARK_SQ;
                    return (
                      <Pressable
                        key={colIdx}
                        onPress={() => handleSquarePress(rowIdx, colIdx)}
                        style={[styles.square, { width: squareSize, height: squareSize, backgroundColor: sqColor }]}
                      >
                        {isValidTarget && (
                          <View style={[
                            styles.validMoveDot,
                            piece ? styles.validMoveDotCapture : undefined,
                          ]} />
                        )}
                        {piece && <ChessPieceImage piece={piece} size={squareSize} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
          {/* File labels (a-h) - bottom */}
          <View style={[styles.coordRow, { width: squareSize * 8 + 20 }]}>
            <View style={[styles.coordCorner, { width: 20 }]} />
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((l) => (
              <Text key={l} style={[styles.coordLabel, { width: squareSize }]}>{l}</Text>
            ))}
          </View>
        </View>

        {/* You bar (bottom - White) */}
        <View style={[styles.playerBar, styles.playerBarBottom, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.playerBarLeft}>
            {whiteTurn && !gameOver && <PulsingDot />}
            <ThemedText type="defaultSemiBold" style={styles.playerName}>You</ThemedText>
            {inCheck && !gameOver && whiteTurn && (
              <ThemedText style={[styles.checkBadge, { color: palette.accentPink }]}>Check!</ThemedText>
            )}
          </View>
          <View style={styles.capturedRow}>
            {capturedByWhite.map((p, i) => (
              <Text key={`w-${i}`} style={styles.capturedPiece}>{PIECES[p]}</Text>
            ))}
          </View>
        </View>

        <View style={styles.footerRow}>
          <Pressable onPress={handleRestart} style={[styles.restartBtn, { backgroundColor: palette.tint }]}>
            <MaterialIcons name="refresh" size={22} color={palette.background} />
            <Text style={[styles.restartText, { color: palette.background }]}>Restart</Text>
          </Pressable>
          <Pressable
            onPress={handleChangeDifficulty}
            style={[styles.restartBtn, styles.levelBtn, { borderColor: palette.cardBorder }]}
          >
            <MaterialIcons name="tune" size={22} color={palette.text} />
            <Text style={[styles.restartText, { color: palette.text }]}>Level</Text>
          </Pressable>
        </View>
      </View>

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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  backBtn: { marginRight: 12 },
  title: { fontSize: 20, flex: 1 },
  diffBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  diffBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  diffScreenTitle: { marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  diffScreenSub: { marginBottom: 20, lineHeight: 20, paddingHorizontal: 4 },
  diffOption: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 4,
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  playerBarTop: { marginBottom: 8 },
  playerBarBottom: { marginTop: 8 },
  playerBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerName: { fontSize: 16 },
  checkBadge: { fontSize: 14, fontWeight: '700' },
  capturedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    maxWidth: 120,
  },
  capturedPiece: { fontSize: 14 },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC71',
  },
  turnBar: { marginBottom: 8 },
  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  turnText: { fontSize: 14, opacity: 0.9 },
  resultBar: { marginBottom: 8 },
  resultText: { fontSize: 18, fontWeight: '700' },
  boardWrap: {
    alignSelf: 'center',
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
  },
  row: { flexDirection: 'row' },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  validMoveDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: VALID_MOVE_DOT,
    borderWidth: 2,
    borderColor: VALID_MOVE_DOT_RING,
  },
  validMoveDotCapture: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: VALID_MOVE_DOT_RING,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  coordCorner: {},
  coordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5D4E37',
    textAlign: 'center',
  },
  rankLabel: { textAlign: 'right', paddingRight: 4 },
  boardInner: {},
  rowWithCoord: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  levelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  restartText: { fontSize: 16, fontWeight: '700' },
});
