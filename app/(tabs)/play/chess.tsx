import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { InGameChat } from '@/components/in-game-chat';
import { HowToPlayButton } from '@/components/how-to-play-button';
import { useCosmetics } from '@/contexts/cosmetics-context';
import { ThemedText } from '@/components/themed-text';
import { WinnerModal } from '@/components/winner-modal';
import { useTheme } from '@/contexts/theme-context';
import { AppColors, Colors } from '@/constants/theme';
import {
  applyMove,
  filterLegalMoves,
  getValidMoves,
  hasAnyLegalMove,
  isInCheck,
  isWhite,
  pickBlackMove,
  type AiDifficulty,
  type Board,
  type ChessMove,
  type Piece,
} from '@/lib/chess-ai';
import { moveToAlgebraic } from '@/lib/chess-notation';
import { getChessBoardColors } from '@/lib/cosmetics/catalog';
import type { RewardBreakdown } from '@/lib/game-rewards';
import { recordRecentGame } from '@/lib/recent-games';
import { playClick, playPop } from '@/lib/sounds';

const PIECE_CDN = 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150';
const PIECE_TO_CDN: Record<string, string> = {
  K: 'wk',
  Q: 'wq',
  R: 'wr',
  B: 'wb',
  N: 'wn',
  P: 'wp',
  k: 'bk',
  q: 'bq',
  r: 'br',
  b: 'bb',
  n: 'bn',
  p: 'bp',
};

const SELECTED_HIGHLIGHT = '#F6F669';
const VALID_DOT = 'rgba(34, 197, 94, 0.78)';
const VALID_RING = 'rgba(74, 222, 128, 0.98)';
const LAST_MOVE_LIGHT = 'rgba(147, 197, 253, 0.88)';
const LAST_MOVE_DARK = 'rgba(59, 130, 246, 0.62)';
const PLAYER_MOVE_MS = 150;
const AI_MOVE_MS = 300;
const AI_THINK_DELAY_MS = 800;
const RANK_GUTTER = 22;

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

function ChessPieceImage({ piece, size }: { piece: Piece; size: number }) {
  const cdnName = PIECE_TO_CDN[piece];
  if (!cdnName) return null;
  return (
    <Image
      source={{ uri: `${PIECE_CDN}/${cdnName}.png` }}
      style={{ width: size * 0.88, height: size * 0.88 }}
      contentFit="contain"
    />
  );
}

function ThinkingDots() {
  const d1 = useSharedValue(0.35);
  const d2 = useSharedValue(0.35);
  const d3 = useSharedValue(0.35);
  useEffect(() => {
    const pulse = (v: SharedValue<number>) => {
      v.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 320, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.35, { duration: 320, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    };
    const t1 = setTimeout(() => pulse(d1), 0);
    const t2 = setTimeout(() => pulse(d2), 120);
    const t3 = setTimeout(() => pulse(d3), 240);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      cancelAnimation(d1);
      cancelAnimation(d2);
      cancelAnimation(d3);
    };
  }, [d1, d2, d3]);
  const s1 = useAnimatedStyle(() => ({ opacity: d1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value }));
  return (
    <View style={styles.thinkingRow}>
      <Animated.View style={[styles.thinkingDot, s1]} />
      <Animated.View style={[styles.thinkingDot, s2]} />
      <Animated.View style={[styles.thinkingDot, s3]} />
    </View>
  );
}

function PulsingTurnDot({ tint = '#64748B' }: { tint?: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 550, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 550, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.turnPulseDot, { backgroundColor: tint }, style]} />;
}

function CheckOverlay({ flash }: { flash: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const a = 0.52 + flash.value * 0.44;
    return {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `rgba(239, 68, 68, ${a})`,
      borderWidth: 2,
      borderColor: `rgba(248, 113, 113, ${0.55 + flash.value * 0.45})`,
    };
  });
  return <Animated.View pointerEvents="none" style={style} />;
}

function ChessSquare({
  sq,
  piece,
  isLight,
  isSelected,
  isLastMove,
  isValidTarget,
  hidePiece,
  fadeCapture,
  capOp,
  showCheckFlash,
  checkFlash,
  lightSq,
  darkSq,
  disabled,
  onPress,
}: {
  sq: number;
  piece: Piece | null;
  isLight: boolean;
  isSelected: boolean;
  isLastMove: boolean;
  isValidTarget: boolean;
  hidePiece: boolean;
  fadeCapture: boolean;
  capOp: SharedValue<number>;
  showCheckFlash: boolean;
  checkFlash: SharedValue<number>;
  lightSq: string;
  darkSq: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const dotR = Math.max(8, sq * 0.22);
  const capStyle = useAnimatedStyle(() => ({
    opacity: fadeCapture ? capOp.value : 1,
  }));
  let bg: string = isLight ? lightSq : darkSq;
  if (isSelected) bg = SELECTED_HIGHLIGHT;
  else if (isLastMove) {
    bg = isLight ? LAST_MOVE_LIGHT : LAST_MOVE_DARK;
  }
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.square,
        { width: sq, height: sq, backgroundColor: bg },
        isSelected && styles.squareSelectedGlow,
        disabled && styles.squareDisabled,
        pressed && !disabled && { opacity: 0.92 },
      ]}
    >
      {showCheckFlash && <CheckOverlay flash={checkFlash} />}
      {isValidTarget &&
        (piece ? (
          <View style={styles.validMarkFill} pointerEvents="none">
            <View
              style={{
                width: sq * 0.72,
                height: sq * 0.72,
                borderRadius: 999,
                borderWidth: 3,
                borderColor: VALID_RING,
                backgroundColor: 'rgba(34,197,94,0.28)',
              }}
            />
          </View>
        ) : (
          <View style={styles.validMarkFill} pointerEvents="none">
            <View
              style={{
                width: dotR,
                height: dotR,
                borderRadius: dotR / 2,
                backgroundColor: VALID_DOT,
              }}
            />
          </View>
        ))}
      {!hidePiece &&
        piece &&
        (fadeCapture ? (
          <Animated.View style={[styles.pieceWrap, capStyle]}>
            <ChessPieceImage piece={piece} size={sq} />
          </Animated.View>
        ) : (
          <View style={styles.pieceWrap}>
            <ChessPieceImage piece={piece} size={sq} />
          </View>
        ))}
    </Pressable>
  );
}

type LastMove = { fr: number; fc: number; tr: number; tc: number };

type ChessSnapshot = {
  board: Board;
  whiteTurn: boolean;
  /** 'white' while you may move; 'black' during your anim, AI think, or AI anim. */
  currentTurn: 'white' | 'black';
  lastMove: LastMove | null;
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  halfmove: number;
  gameOver: string | null;
};

function cloneBoard(b: Board): Board {
  return b.map((row) => [...row]);
}

type AnimState = {
  fr: number;
  fc: number;
  tr: number;
  tc: number;
  piece: Piece;
  captured: Piece | null;
  nextBoard: Board;
  durationMs: number;
  onDone: () => void;
};

export default function ChessScreen() {
  const router = useRouter();
  const { width: winW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const margin = 16;
  const boardPx = Math.max(240, winW - margin * 2 - RANK_GUTTER);
  const sq = boardPx / 8;

  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const { equipped, rewardGameEnd } = useCosmetics();
  const { light: lightSq, dark: darkSq } = useMemo(
    () => getChessBoardColors(equipped.chess_theme),
    [equipped.chess_theme],
  );

  const [board, setBoard] = useState<Board>(() => INITIAL.map((r) => [...r]));
  const [whiteTurn, setWhiteTurn] = useState(true);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [capturedByWhite, setCapturedByWhite] = useState<Piece[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<Piece[]>([]);
  const [difficulty, setDifficulty] = useState<AiDifficulty | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [halfmove, setHalfmove] = useState(0);
  const [currentTurn, setCurrentTurnState] = useState<'white' | 'black'>('white');
  /** Synchronous mirror of `currentTurn` so touch handlers never act on a stale value before re-render. */
  const currentTurnRef = useRef<'white' | 'black'>('white');
  const setCurrentTurn = useCallback((next: 'white' | 'black') => {
    currentTurnRef.current = next;
    setCurrentTurnState(next);
  }, []);
  const [aiThinking, setAiThinking] = useState(false);
  const [anim, setAnim] = useState<AnimState | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<ChessSnapshot[]>([]);
  const [endRewards, setEndRewards] = useState<RewardBreakdown | null>(null);

  const boardRef = useRef(board);
  boardRef.current = board;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostOp = useSharedValue(0);
  const capOp = useSharedValue(1);

  const checkFlash = useSharedValue(0);

  const snapFieldsRef = useRef({
    whiteTurn,
    currentTurn,
    lastMove,
    capturedByWhite,
    capturedByBlack,
    halfmove,
    gameOver,
  });
  snapFieldsRef.current = {
    whiteTurn,
    currentTurn,
    lastMove,
    capturedByWhite,
    capturedByBlack,
    halfmove,
    gameOver,
  };

  const chessRecordedRef = useRef(false);

  const inCheck = isInCheck(board, whiteTurn);

  useEffect(() => {
    if (!inCheck || gameOver) {
      cancelAnimation(checkFlash);
      checkFlash.value = 0;
      return;
    }
    checkFlash.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 220, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [inCheck, gameOver, checkFlash]);

  const ghostStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: ghostX.value,
    top: ghostY.value,
    width: sq,
    height: sq,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: ghostOp.value,
    zIndex: 20,
    pointerEvents: 'none',
  }));

  const runAnimation = useCallback(
    (a: AnimState) => {
      const { fr, fc, tr, tc, captured, onDone, durationMs } = a;
      const pad = sq * 0.06;
      ghostX.value = fc * sq + pad;
      ghostY.value = fr * sq + pad;
      ghostOp.value = 1;
      capOp.value = 1;
      if (captured) {
        capOp.value = withTiming(0, { duration: durationMs, easing: Easing.out(Easing.quad) });
      }
      ghostX.value = withTiming(
        tc * sq + pad,
        { duration: durationMs, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(onDone)();
        }
      );
      ghostY.value = withTiming(tr * sq + pad, { duration: durationMs, easing: Easing.out(Easing.cubic) });
    },
    [ghostOp, ghostX, ghostY, capOp, sq]
  );

  const startAnimatedMove = useCallback(
    (mv: ChessMove, current: Board, after: () => void, opts?: { durationMs?: number }) => {
      const durationMs = opts?.durationMs ?? PLAYER_MOVE_MS;
      const piece = current[mv.fr][mv.fc]!;
      const captured = current[mv.tr][mv.tc];
      const nextBoard = applyMove(current, mv);
      setAnim({
        fr: mv.fr,
        fc: mv.fc,
        tr: mv.tr,
        tc: mv.tc,
        piece,
        captured,
        nextBoard,
        durationMs,
        onDone: () => {
          setBoard(nextBoard);
          setAnim(null);
          ghostOp.value = 0;
          capOp.value = 1;
          after();
        },
      });
    },
    [ghostOp, capOp]
  );

  useEffect(() => {
    if (!anim) return;
    const id = requestAnimationFrame(() => runAnimation(anim));
    return () => cancelAnimationFrame(id);
  }, [anim, runAnimation]);

  const handleSquarePress = useCallback(
    (row: number, col: number, currentTurn: 'white' | 'black' = currentTurnRef.current) => {
      if (currentTurn !== 'white') return;
      if (gameOver) return;

      const b = board;
      const piece = b[row][col];
      const isPieceWhite = piece && isWhite(piece);

      if (selected) {
        const [sr, sc] = selected;
        const isTarget = validMoves.some(([r, c]) => r === row && c === col);
        if (isTarget) {
          const captured = b[row][col];
          if (captured) {
            void playPop();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else {
            void playClick();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          setCurrentTurn('black');
          setSelected(null);
          setValidMoves([]);
          setUndoStack((s) => [
            ...s,
            {
              board: cloneBoard(b),
              whiteTurn,
              currentTurn,
              lastMove,
              capturedByWhite: [...capturedByWhite],
              capturedByBlack: [...capturedByBlack],
              halfmove,
              gameOver,
            },
          ]);
          setMoveHistory((h) => [...h, moveToAlgebraic(b, { fr: sr, fc: sc, tr: row, tc: col })]);
          startAnimatedMove({ fr: sr, fc: sc, tr: row, tc: col }, b, () => {
            const nb = boardRef.current;
            const moved = nb[row][col]!;
            if (captured) {
              if (isWhite(moved)) setCapturedByWhite((prev) => [...prev, captured]);
              else setCapturedByBlack((prev) => [...prev, captured]);
            }
            setLastMove({ fr: sr, fc: sc, tr: row, tc: col });
            setHalfmove((h) => h + 1);
            setWhiteTurn(false);
            const blackInCheck = isInCheck(nb, false);
            const blackMated = blackInCheck && !hasAnyLegalMove(nb, false);
            if (blackMated) {
              setGameOver('White wins!');
              setWins((w) => w + 1);
            }
          });
        } else if (piece && isPieceWhite) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const moves = filterLegalMoves(b, row, col, getValidMoves(b, row, col));
          setSelected([row, col]);
          setValidMoves(moves);
        } else {
          setSelected(null);
          setValidMoves([]);
        }
      } else if (piece && isPieceWhite) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const moves = filterLegalMoves(b, row, col, getValidMoves(b, row, col));
        setSelected([row, col]);
        setValidMoves(moves);
      }
    },
    [
      board,
      selected,
      validMoves,
      gameOver,
      startAnimatedMove,
      setCurrentTurn,
      lastMove,
      capturedByWhite,
      capturedByBlack,
      halfmove,
    ]
  );

  const handleRestart = useCallback(() => {
    setBoard(INITIAL.map((r) => [...r]));
    setWhiteTurn(true);
    setCurrentTurn('white');
    setSelected(null);
    setValidMoves([]);
    setGameOver(null);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setLastMove(null);
    setHalfmove(0);
    setAnim(null);
    setAiThinking(false);
    setMoveHistory([]);
    setUndoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (anim || aiThinking || undoStack.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const snap = undoStack[undoStack.length - 1];
    const hadOver = gameOver;
    setUndoStack((s) => s.slice(0, -1));
    setBoard(snap.board.map((r) => [...r]));
    setWhiteTurn(snap.whiteTurn);
    setLastMove(snap.lastMove);
    setCapturedByWhite(snap.capturedByWhite);
    setCapturedByBlack(snap.capturedByBlack);
    setHalfmove(snap.halfmove);
    setGameOver(snap.gameOver);
    setMoveHistory((h) => h.slice(0, -1));
    setSelected(null);
    setValidMoves([]);
    setCurrentTurn(snap.currentTurn);
    setAnim(null);
    ghostOp.value = 0;
    capOp.value = 1;
    setAiThinking(false);
    if (hadOver && !snap.gameOver) {
      if (hadOver === 'White wins!') setWins((w) => Math.max(0, w - 1));
      else if (hadOver === 'Black wins!') setLosses((l) => Math.max(0, l - 1));
    }
  }, [anim, aiThinking, undoStack, gameOver, ghostOp, capOp]);

  const handleChangeDifficulty = useCallback(() => {
    setDifficulty(null);
    handleRestart();
  }, [handleRestart]);

  useEffect(() => {
    if (gameOver || whiteTurn || difficulty === null || anim) return;
    let cancelled = false;
    setAiThinking(true);
    const t = setTimeout(() => {
      if (cancelled) return;
      const b = boardRef.current;
      const diff = difficultyRef.current;
      if (!diff) {
        setAiThinking(false);
        return;
      }
      const mv = pickBlackMove(b, diff);
      if (cancelled) return;
      setAiThinking(false);
      if (!mv) return;
      const captured = b[mv.tr][mv.tc];
      const f = snapFieldsRef.current;
      setUndoStack((s) => [
        ...s,
        {
          board: cloneBoard(b),
          whiteTurn: f.whiteTurn,
          currentTurn: f.currentTurn,
          lastMove: f.lastMove,
          capturedByWhite: [...f.capturedByWhite],
          capturedByBlack: [...f.capturedByBlack],
          halfmove: f.halfmove,
          gameOver: f.gameOver,
        },
      ]);
      setMoveHistory((h) => [...h, moveToAlgebraic(b, mv)]);
      if (captured) {
        void playPop();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        void playClick();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      startAnimatedMove(
        mv,
        b,
        () => {
          if (cancelled) return;
          const nb = boardRef.current;
          if (captured) {
            if (isWhite(captured)) setCapturedByBlack((prev) => [...prev, captured]);
            else setCapturedByWhite((prev) => [...prev, captured]);
          }
          setLastMove({ fr: mv.fr, fc: mv.fc, tr: mv.tr, tc: mv.tc });
          setHalfmove((h) => h + 1);
          setWhiteTurn(true);
          const whiteInCheck = isInCheck(nb, true);
          const whiteMated = whiteInCheck && !hasAnyLegalMove(nb, true);
          if (whiteMated) {
            setGameOver('Black wins!');
            setLosses((l) => l + 1);
            setCurrentTurn('black');
          } else if (!hasAnyLegalMove(nb, true) && !whiteInCheck) {
            setGameOver('Draw (stalemate)');
            setCurrentTurn('black');
          } else {
            setCurrentTurn('white');
          }
        },
        { durationMs: AI_MOVE_MS },
      );
    }, AI_THINK_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setAiThinking(false);
    };
  }, [whiteTurn, gameOver, difficulty, anim, startAnimatedMove]);

  useEffect(() => {
    if (!gameOver) {
      chessRecordedRef.current = false;
      setEndRewards(null);
      return;
    }
    if (chessRecordedRef.current) return;
    chessRecordedRef.current = true;
    const win = gameOver.includes('White wins');
    const loss = gameOver.includes('Black wins');
    const draw =
      gameOver.toLowerCase().includes('draw') || gameOver.toLowerCase().includes('stalemate');
    const outcome = win ? 'win' : draw ? 'draw' : 'loss';
    void rewardGameEnd(outcome).then(setEndRewards);
    void recordRecentGame({
      gameName: 'Chess',
      result: win ? 'win' : 'loss',
      score: win ? 'Checkmate' : loss ? 'Checkmated' : 'Stalemate',
    });
  }, [gameOver, rewardGameEnd]);

  const moveLabel = Math.floor(halfmove / 2) + 1;
  const lastTenMoves = moveHistory.slice(-10);
  const canUndo = undoStack.length > 0 && !anim && !aiThinking;
  const boardLocked = gameOver != null || currentTurn !== 'white';
  const diffLabel =
    difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : difficulty === 'hard' ? 'Hard' : '';

  if (difficulty === null) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['bottom', 'left', 'right']}>
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: 12 }]}>
          <View style={styles.diffHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <MaterialIcons name="arrow-back" size={24} color={palette.text} />
            </Pressable>
            <ThemedText type="title" style={{ flex: 1 }}>
              Chess
            </ThemedText>
            <InGameChat selfName="You" opponentName="Opponent" opponentIsAi />
            <HowToPlayButton gameId="chess" tint={palette.text} />
          </View>
          <ThemedText type="section" style={[styles.diffTitle, { color: palette.text }]}>
            Choose difficulty
          </ThemedText>
          <ThemedText type="body" style={[styles.diffSub, { color: AppColors.muted }]}>
            You play White (bottom). AI plays Black — Easy picks at random, Medium searches 2 plies and
            favors captures, Hard searches 4 plies with positional evaluation.
          </ThemedText>
          <Pressable
            onPress={() => setDifficulty('easy')}
            style={({ pressed }) => [styles.diffBtn, styles.diffEasy, pressed && { opacity: 0.92 }]}
          >
            <ThemedText type="section" style={styles.diffBtnTitle}>
              Easy
            </ThemedText>
            <ThemedText type="caption" style={styles.diffBtnCaption}>
              Random legal moves
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setDifficulty('medium')}
            style={({ pressed }) => [styles.diffBtn, styles.diffMedium, pressed && { opacity: 0.92 }]}
          >
            <ThemedText type="section" style={styles.diffBtnTitle}>
              Medium
            </ThemedText>
            <ThemedText type="caption" style={styles.diffBtnCaption}>
              Minimax depth 2 · capture-first
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setDifficulty('hard')}
            style={({ pressed }) => [styles.diffBtn, styles.diffHard, pressed && { opacity: 0.92 }]}
          >
            <ThemedText type="section" style={styles.diffBtnTitle}>
              Hard
            </ThemedText>
            <ThemedText type="caption" style={styles.diffBtnCaption}>
              Minimax depth 4 · PST + king safety
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['bottom', 'left', 'right']}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: 8 }]}>
        <View style={styles.gameHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="section" style={{ flex: 1, color: palette.text }}>
            Chess
          </ThemedText>
          <InGameChat selfName="You" opponentName="Opponent" opponentIsAi />
          <HowToPlayButton gameId="chess" tint={palette.text} />
          <View style={[styles.diffPill, { backgroundColor: palette.tint }]}>
            <Text style={styles.diffPillText}>{diffLabel}</Text>
          </View>
        </View>

        {/* Opponent (Black) */}
        <View
          style={[
            styles.infoBar,
            { backgroundColor: palette.card, borderColor: palette.cardBorder },
          ]}
        >
          <View style={styles.infoBarLeft}>
            <MaterialIcons name="smart-toy" size={20} color={palette.icon} />
            {currentTurn !== 'white' && !gameOver && !aiThinking && <PulsingTurnDot tint="#94A3B8" />}
            {aiThinking && <ThinkingDots />}
            <ThemedText
              type="defaultSemiBold"
              style={{ color: aiThinking ? '#9CA3AF' : palette.text }}
            >
              {aiThinking ? 'AI Thinking…' : 'Opponent'}
            </ThemedText>
          </View>
          <View style={styles.capturedStrip}>
            {capturedByBlack.map((p, i) => (
              <View key={`cb-${i}`} style={styles.capturedMini}>
                <ChessPieceImage piece={p} size={22} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.metaRow}>
          <ThemedText type="caption" style={{ color: AppColors.muted }}>
            Move {moveLabel}
          </ThemedText>
          <View style={styles.turnChip}>
            {gameOver ? (
              <ThemedText type="caption" style={{ color: palette.text, fontWeight: '600' }}>
                Game over
              </ThemedText>
            ) : currentTurn === 'white' ? (
              <View style={styles.turnChipInner}>
                <PulsingTurnDot tint="#22C55E" />
                <Text style={styles.turnLabelYourTurn}>Your Turn</Text>
              </View>
            ) : aiThinking ? (
              <View style={styles.turnChipInner}>
                <ThinkingDots />
                <Text style={styles.turnLabelAiThinking}>AI Thinking…</Text>
              </View>
            ) : (
              <Text style={styles.turnLabelAiThinking}>Opponent moving…</Text>
            )}
          </View>
        </View>

        <View style={[styles.historyRow, { borderColor: palette.cardBorder }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyScroll}>
            <View style={styles.historyChips}>
              {lastTenMoves.length === 0 ? (
                <ThemedText type="caption" style={{ color: AppColors.muted }}>
                  Moves appear here (last 10)
                </ThemedText>
              ) : (
                lastTenMoves.map((m, i) => (
                  <View key={`${i}-${m}`} style={[styles.historyChip, { borderColor: palette.cardBorder }]}>
                    <Text style={[styles.historyChipText, { color: palette.text }]}>{m}</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
          <Pressable
            onPress={handleUndo}
            disabled={!canUndo}
            style={[
              styles.undoBtn,
              { backgroundColor: canUndo ? palette.tint : palette.cardBorder },
            ]}
          >
            <MaterialIcons name="undo" size={18} color={canUndo ? '#fff' : palette.icon} />
            <Text style={[styles.undoBtnText, { color: canUndo ? '#fff' : palette.icon }]}>Undo</Text>
          </Pressable>
        </View>

        {gameOver && (
          <View style={styles.resultBanner}>
            <ThemedText type="section" style={{ color: palette.tint }}>
              {gameOver}
            </ThemedText>
          </View>
        )}

        <LinearGradient
          colors={['#5D4E37', '#8B6914', '#6B4423', '#4A3728']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.woodFrame, { borderColor: '#3d2f1f' }]}
        >
          <View style={styles.boardRow}>
            <View style={[styles.rankGutter, { width: RANK_GUTTER }]}>
              {Array.from({ length: 8 }, (_, i) => (
                <Text
                  key={i}
                  style={[styles.rankText, { height: sq, lineHeight: sq, color: '#E8DCC8' }]}
                >
                  {8 - i}
                </Text>
              ))}
            </View>
            <View style={{ width: boardPx, height: boardPx, position: 'relative' }}>
              {board.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.row}>
                  {row.map((piece, colIdx) => {
                    const isLight = (rowIdx + colIdx) % 2 === 1;
                    const isSel =
                      currentTurn === 'white' &&
                      selected?.[0] === rowIdx &&
                      selected?.[1] === colIdx;
                    const isLast =
                      !!lastMove &&
                      ((lastMove.fr === rowIdx && lastMove.fc === colIdx) ||
                        (lastMove.tr === rowIdx && lastMove.tc === colIdx));
                    const isValid =
                      currentTurn === 'white' &&
                      validMoves.some(([r, c]) => r === rowIdx && c === colIdx);
                    const hidePiece = anim?.fr === rowIdx && anim.fc === colIdx;
                    const fadeCapture =
                      !!anim?.captured && anim.tr === rowIdx && anim.tc === colIdx;
                    const kingFlash =
                      (piece === 'K' && inCheck && whiteTurn) ||
                      (piece === 'k' && inCheck && !whiteTurn);
                    return (
                      <ChessSquare
                        key={colIdx}
                        sq={sq}
                        piece={piece}
                        isLight={isLight}
                        isSelected={isSel}
                        isLastMove={isLast}
                        isValidTarget={isValid}
                        hidePiece={hidePiece}
                        fadeCapture={fadeCapture}
                        capOp={capOp}
                        showCheckFlash={kingFlash}
                        checkFlash={checkFlash}
                        lightSq={lightSq}
                        darkSq={darkSq}
                        disabled={boardLocked}
                        onPress={() => handleSquarePress(rowIdx, colIdx)}
                      />
                    );
                  })}
                </View>
              ))}
              {anim && (
                <Animated.View style={ghostStyle}>
                  <ChessPieceImage piece={anim.piece} size={sq} />
                </Animated.View>
              )}
            </View>
          </View>
          <View style={[styles.fileRow, { width: RANK_GUTTER + boardPx }]}>
            <View style={{ width: RANK_GUTTER }} />
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((l) => (
              <Text key={l} style={[styles.fileText, { width: sq, color: '#E8DCC8' }]}>
                {l}
              </Text>
            ))}
          </View>
        </LinearGradient>

        {/* You (White) */}
        <View
          style={[
            styles.infoBar,
            { backgroundColor: palette.card, borderColor: palette.cardBorder, marginTop: 10 },
          ]}
        >
          <View style={styles.infoBarLeft}>
            <MaterialIcons name="person" size={20} color={palette.icon} />
            {currentTurn === 'white' && !gameOver && <PulsingTurnDot tint="#22C55E" />}
            <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
              You
            </ThemedText>
          </View>
          <View style={styles.capturedStrip}>
            {capturedByWhite.map((p, i) => (
              <View key={`cw-${i}`} style={styles.capturedMini}>
                <ChessPieceImage piece={p} size={22} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footerRow}>
          <Pressable onPress={handleRestart} style={[styles.footerBtn, { backgroundColor: palette.tint }]}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.footerBtnTextLight}>Restart</Text>
          </Pressable>
          <Pressable
            onPress={handleChangeDifficulty}
            style={[styles.footerBtn, styles.footerBtnOutline, { borderColor: palette.cardBorder }]}
          >
            <MaterialIcons name="tune" size={20} color={palette.text} />
            <Text style={[styles.footerBtnText, { color: palette.text }]}>Level</Text>
          </Pressable>
        </View>
      </View>

      <WinnerModal
        visible={!!gameOver}
        winnerName={gameOver?.replace(' wins!', '') ?? ''}
        score={{ wins, losses }}
        subtitle={gameOver?.includes('Draw') ? 'Stalemate' : 'Checkmate!'}
        rewards={endRewards}
        onPlayAgain={handleRestart}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  diffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  backBtn: { padding: 4 },
  diffTitle: { marginBottom: 6 },
  diffSub: { marginBottom: 20, lineHeight: 22 },
  diffBtn: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 2,
  },
  diffEasy: {
    backgroundColor: 'rgba(34, 197, 94, 0.22)',
    borderColor: '#22C55E',
  },
  diffMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderColor: '#F59E0B',
  },
  diffHard: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  diffBtnTitle: { color: '#fff', fontWeight: '700' },
  diffBtnCaption: { color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  diffPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  diffPillText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  infoBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  capturedStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, maxWidth: 140, justifyContent: 'flex-end' },
  capturedMini: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 6,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  historyScroll: { flex: 1, maxHeight: 36 },
  historyChips: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 },
  historyChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  historyChipText: { fontSize: 13, fontWeight: '700' },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  undoBtnText: { fontSize: 13, fontWeight: '800' },
  turnChip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  turnChipInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  turnLabelYourTurn: {
    fontSize: 14,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: 0.2,
  },
  turnLabelAiThinking: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },
  turnPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
  },
  resultBanner: { marginBottom: 6 },
  woodFrame: {
    alignSelf: 'center',
    borderRadius: 10,
    borderWidth: 3,
    padding: 10,
    overflow: 'hidden',
  },
  boardRow: { flexDirection: 'row', alignItems: 'stretch' },
  rankGutter: { justifyContent: 'space-between', paddingRight: 4 },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  row: { flexDirection: 'row' },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  squareDisabled: {
    opacity: 0.88,
  },
  squareSelectedGlow: {
    shadowColor: '#F6F669',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 10,
  },
  validMarkFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fileText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 14,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  footerBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  footerBtnText: { fontSize: 15, fontWeight: '700' },
  footerBtnTextLight: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
