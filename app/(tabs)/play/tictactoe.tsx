import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HowToPlayButton } from '@/components/how-to-play-button';
import { ThemedText } from '@/components/themed-text';
import { WinnerModal } from '@/components/winner-modal';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { playPop } from '@/lib/sounds';
import { supabase } from '@/lib/supabase';

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

type CellValue = 'X' | 'O' | null;

function getWinner(board: CellValue[]): { winner: CellValue; line: number[] } | null {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
}

function isDraw(board: CellValue[]): boolean {
  return board.every((cell) => cell !== null);
}

const EMPTY_BOARD: CellValue[] = [null, null, null, null, null, null, null, null, null];

export default function TicTacToeScreen() {
  const router = useRouter();
  const { roomId, mySymbol } = useLocalSearchParams<{ roomId?: string; mySymbol?: string }>();

  const [board, setBoard] = useState<CellValue[]>(EMPTY_BOARD);
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<CellValue>(null);
  const [loading, setLoading] = useState(!!roomId);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const prevWinnerRef = useRef<CellValue>(null);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    // Local mode: no Supabase, use local state only
    if (roomId === 'local') {
      setBoard(EMPTY_BOARD);
      setTurn('X');
      setWinner(null);
      setLoading(false);
      return;
    }

    const loadRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('board, turn, winner')
        .eq('id', roomId)
        .single();

      if (!error && data) {
        const b = (data.board as CellValue[]) ?? EMPTY_BOARD;
        setBoard(b.length === 9 ? b : EMPTY_BOARD);
        setTurn((data.turn as 'X' | 'O') ?? 'X');
        setWinner((data.winner as CellValue) ?? null);
      }
      setLoading(false);
    };

    loadRoom();

    const channel = supabase
      .channel(`room-game:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const r = payload.new as { board: CellValue[]; turn: string; winner: string | null };
          if (r) {
            const b = (r.board as CellValue[]) ?? EMPTY_BOARD;
            setBoard(b.length === 9 ? b : EMPTY_BOARD);
            setTurn((r.turn as 'X' | 'O') ?? 'X');
            setWinner((r.winner as CellValue) ?? null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const result = getWinner(board);
  const draw = !result && isDraw(board);
  const gameOver = !!winner || !!result || draw;
  const isLocal = roomId === 'local';
  const isMyTurn = (isLocal || turn === mySymbol) && !gameOver;

  useEffect(() => {
    if (winner && winner !== prevWinnerRef.current) {
      prevWinnerRef.current = winner;
      const iWon = winner === mySymbol;
      setWins((w) => w + (iWon ? 1 : 0));
      setLosses((l) => l + (iWon ? 0 : 1));
    }
    if (!winner) prevWinnerRef.current = null;
  }, [winner, mySymbol]);

  const handleCellPress = useCallback(
    async (index: number) => {
      if (board[index] || gameOver || !isMyTurn || !roomId) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playPop();

      const newBoard = [...board];
      newBoard[index] = turn as CellValue;
      const win = getWinner(newBoard);
      const newWinner = win?.winner ?? null;
      const newTurn = win ? turn : (turn === 'X' ? 'O' : 'X');

      if (roomId === 'local') {
        setBoard(newBoard);
        setTurn(newTurn);
        setWinner(newWinner);
        return;
      }

      const { error } = await supabase
        .from('rooms')
        .update({
          board: newBoard,
          turn: newTurn,
          winner: newWinner,
        })
        .eq('id', roomId);

      if (error) console.error('Move failed:', error);
    },
    [board, turn, gameOver, isMyTurn, roomId]
  );

  const handleRestart = useCallback(async () => {
    if (!roomId) return;
    if (roomId === 'local') {
      setBoard(EMPTY_BOARD);
      setTurn('X');
      setWinner(null);
      return;
    }
    await supabase
      .from('rooms')
      .update({
        board: EMPTY_BOARD,
        turn: 'X',
        winner: null,
      })
      .eq('id', roomId);
  }, [roomId]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const { width: winW, height: winH } = useWindowDimensions();
  const gridGap = 12;
  const horizontalPad = 24 * 2;
  const maxGrid = Math.min(winW - horizontalPad - 16, winH * 0.42);
  const cellSize = Math.max(96, Math.min(132, Math.floor((maxGrid - gridGap * 2) / 3)));

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!roomId || !mySymbol) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={[styles.container, styles.centered]}>
          <ThemedText>Invalid game session.</ThemedText>
          <Pressable onPress={handleBack}>
            <ThemedText style={[styles.linkText, { color: palette.tint }]}>Go back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const displayWinner = winner ?? result?.winner;
  const displayLine = result?.line;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.container}>
        {/* Gradient header with player scores */}
        <LinearGradient
          colors={[palette.tint, palette.accentPink, palette.accentYellow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText type="defaultSemiBold" style={styles.title} darkColor="#fff">
              Tic Tac Toe
            </ThemedText>
            <View style={styles.headerScores}>
              <View style={styles.headerScoreItem}>
                <ThemedText style={styles.headerScoreLabel} darkColor="rgba(255,255,255,0.9)">X</ThemedText>
                <ThemedText style={styles.headerScoreVal} darkColor="#fff">{wins}</ThemedText>
              </View>
              <View style={styles.headerScoreDivider} />
              <View style={styles.headerScoreItem}>
                <ThemedText style={styles.headerScoreLabel} darkColor="rgba(255,255,255,0.9)">O</ThemedText>
                <ThemedText style={styles.headerScoreVal} darkColor="#fff">{losses}</ThemedText>
              </View>
            </View>
          </View>
          <HowToPlayButton gameId="tictactoe" tint="#fff" />
        </LinearGradient>

        {/* Turn indicator */}
        {!gameOver && (
          <View style={styles.turnRow}>
            <ThemedText style={styles.turnLabel}>
              {turn === 'X' ? "X's turn" : "O's turn"}
              {!isMyTurn && ' (waiting for opponent)'}
            </ThemedText>
            <View style={styles.turnIndicators}>
              <View
                style={[
                  styles.turnDot,
                  turn === 'X' && styles.turnDotActiveX,
                  { backgroundColor: turn === 'X' ? palette.tint : palette.cardBorder },
                ]}
              />
              <View
                style={[
                  styles.turnDot,
                  turn === 'O' && styles.turnDotActiveO,
                  { backgroundColor: turn === 'O' ? palette.accentPink : palette.cardBorder },
                ]}
              />
            </View>
          </View>
        )}

        {/* Result message */}
        {displayWinner && (
          <View style={styles.resultWrap}>
            <ThemedText style={[styles.resultText, styles.resultWinner, { color: palette.tint }]}>
              {displayWinner} wins!
            </ThemedText>
          </View>
        )}
        {draw && (
          <View style={styles.resultWrap}>
            <ThemedText style={styles.resultText}>It&apos;s a draw!</ThemedText>
          </View>
        )}

        {/* Grid - centered and bigger */}
        <View style={styles.gridWrap}>
          <View style={[styles.grid, { gap: gridGap, width: cellSize * 3 + gridGap * 2 }]}>
            {board.map((cell, index) => {
              const isWinningCell = displayLine?.includes(index);
              return (
                <Pressable
                  key={index}
                  onPress={() => handleCellPress(index)}
                  disabled={gameOver || !isMyTurn}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: palette.card,
                      borderColor: isWinningCell ? palette.accentYellow : palette.cardBorder,
                      ...(isWinningCell && { shadowColor: palette.accentYellow }),
                    },
                    isWinningCell && styles.cellWinning,
                  ]}
                >
                  {cell === 'X' && (
                    <Text style={[styles.cellText, styles.cellX, { color: palette.tint, fontSize: cellSize * 0.42 }]}>
                      X
                    </Text>
                  )}
                  {cell === 'O' && (
                    <Text style={[styles.cellText, styles.cellO, { color: palette.accentPink, fontSize: cellSize * 0.42 }]}>
                      O
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Restart button - only show when game over and room exists */}
        {gameOver && roomId && (
        <Pressable onPress={handleRestart} style={[styles.restartButton, { backgroundColor: palette.tint }]}>
          <MaterialIcons name="refresh" size={22} color={palette.background} />
          <Text style={[styles.restartText, { color: palette.background }]}>Restart</Text>
        </Pressable>
        )}
      </View>

      {/* Winner celebration modal */}
      <WinnerModal
        visible={!!displayWinner && !draw}
        winnerName={displayWinner ?? ''}
        score={{ wins, losses }}
        subtitle="Great game!"
        onPlayAgain={handleRestart}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: { marginRight: 12 },
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
  gridWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  turnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  turnLabel: {
    fontSize: 16,
    opacity: 0.9,
  },
  turnIndicators: {
    flexDirection: 'row',
    gap: 8,
  },
  turnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.5,
  },
  turnDotActiveX: { opacity: 1 },
  turnDotActiveO: { opacity: 1 },
  resultWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultText: {
    fontSize: 20,
    fontWeight: '600',
  },
  resultWinner: {},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
  },
  cell: {
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellWinning: {
    backgroundColor: 'rgba(246, 224, 94, 0.15)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  cellText: {
    fontWeight: '800',
  },
  cellX: {},
  cellO: {},
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignSelf: 'center',
  },
  restartText: { fontSize: 16, fontWeight: '700' },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  linkText: {
    fontSize: 16,
  },
});
