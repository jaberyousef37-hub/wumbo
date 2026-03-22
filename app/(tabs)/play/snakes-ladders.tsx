import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HowToPlayButton } from '@/components/how-to-play-button';
import { ThemedText } from '@/components/themed-text';
import { WinnerModal } from '@/components/winner-modal';
import { AppColors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import {
  applySnakeOrLadder,
  BOARD_SIZE,
  LADDERS,
  nextPositionAfterRoll,
  SNAKES,
  squareToRC,
} from '@/lib/snakes-ladders';

const BG = '#12051f';
const BOARD_PAD = 6;
const PLAYER_COLORS = ['#F472B6', '#38BDF8', '#4ADE80', '#FBBF24'] as const;
const DICE_FACE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

type Phase = 'setup' | 'play';

function cellHue(row: number, col: number): string {
  const hues = [280, 200, 140, 320, 45, 170];
  const i = (row * 3 + col * 2) % hues.length;
  return `hsl(${hues[i]}, 65%, ${42 + ((row + col) % 3) * 6}%)`;
}

function SegmentLine({
  x1,
  y1,
  x2,
  y2,
  thickness,
  color,
  zIndex,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  color: string;
  zIndex: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.segment,
        {
          left: cx - len / 2,
          top: cy - thickness / 2,
          width: len,
          height: thickness,
          backgroundColor: color,
          borderRadius: thickness / 2,
          zIndex,
          transform: [{ rotate: `${angle}deg` }],
        },
      ]}
    />
  );
}

function LadderGraphic({
  from,
  to,
  cell,
  pad,
  zIndex,
}: {
  from: number;
  to: number;
  cell: number;
  pad: number;
  zIndex: number;
}) {
  const a = squareToRC(from);
  const b = squareToRC(to);
  const x1 = pad + a.col * cell + cell / 2;
  const y1 = pad + a.row * cell + cell / 2;
  const x2 = pad + b.col * cell + cell / 2;
  const y2 = pad + b.row * cell + cell / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * 5;
  const py = (dx / len) * 5;
  const rail = '#FDE68A';
  const rung = '#FBBF24';
  const steps = Math.max(4, Math.floor(len / (cell * 0.35)));
  const rungs: { x: number; y: number; angle: number }[] = [];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const mx = x1 + dx * t;
    const my = y1 + dy * t;
    rungs.push({ x: mx, y: my, angle: (Math.atan2(dy, dx) * 180) / Math.PI });
  }
  return (
    <>
      <SegmentLine x1={x1 + px} y1={y1 + py} x2={x2 + px} y2={y2 + py} thickness={3} color={rail} zIndex={zIndex} />
      <SegmentLine x1={x1 - px} y1={y1 - py} x2={x2 - px} y2={y2 - py} thickness={3} color={rail} zIndex={zIndex} />
      {rungs.map((r, idx) => (
        <View
          key={idx}
          pointerEvents="none"
          style={[
            styles.segment,
            {
              left: r.x - 6,
              top: r.y - 2,
              width: 12,
              height: 3,
              backgroundColor: rung,
              borderRadius: 2,
              zIndex: zIndex + 1,
              transform: [{ rotate: `${r.angle + 90}deg` }],
            },
          ]}
        />
      ))}
    </>
  );
}

function SnakeGraphic({
  from,
  to,
  cell,
  pad,
  zIndex,
}: {
  from: number;
  to: number;
  cell: number;
  pad: number;
  zIndex: number;
}) {
  const a = squareToRC(from);
  const b = squareToRC(to);
  const x1 = pad + a.col * cell + cell / 2;
  const y1 = pad + a.row * cell + cell / 2;
  const x2 = pad + b.col * cell + cell / 2;
  const y2 = pad + b.row * cell + cell / 2;
  const parts = 5;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= parts; i++) {
    const t = i / parts;
    const wx = Math.sin(t * Math.PI * 2) * (cell * 0.12);
    const wy = Math.cos(t * Math.PI * 1.5) * (cell * 0.08);
    pts.push({
      x: x1 + (x2 - x1) * t + wx,
      y: y1 + (y2 - y1) * t + wy,
    });
  }
  const segs: ReactNode[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    segs.push(
      <SegmentLine
        key={i}
        x1={pts[i].x}
        y1={pts[i].y}
        x2={pts[i + 1].x}
        y2={pts[i + 1].y}
        thickness={i % 2 === 0 ? 7 : 6}
        color={i % 2 === 0 ? '#15803D' : '#166534'}
        zIndex={zIndex}
      />,
    );
  }
  return <>{segs}</>;
}

export default function SnakesLaddersScreen() {
  const router = useRouter();
  const { width: winW } = useWindowDimensions();

  const [phase, setPhase] = useState<Phase>('setup');
  const [playerCount, setPlayerCount] = useState(2);
  const [aiMask, setAiMask] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    true,
    true,
    true,
  ]);
  const [positions, setPositions] = useState<number[]>([0, 0, 0, 0]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [diceFace, setDiceFace] = useState(1);
  const [diceRolling, setDiceRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [winVisible, setWinVisible] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState(0);
  const [displayPositions, setDisplayPositions] = useState<number[]>([0, 0, 0, 0]);

  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  const diceShake = useSharedValue(0);
  const diceShakeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${diceShake.value}deg` }, { translateX: diceShake.value * 0.15 }],
  }));

  const boardMaxW = Math.min(winW - Spacing.sm * 2, 420);
  const cell = Math.floor((boardMaxW - BOARD_PAD * 2) / BOARD_SIZE);
  const boardPx = cell * BOARD_SIZE + BOARD_PAD * 2;

  const playerLabel = useCallback(
    (i: number) => {
      if (i === 0) return 'You';
      return aiMask[i] ? `CPU ${i}` : `Player ${i + 1}`;
    },
    [aiMask],
  );

  const resetGame = useCallback(() => {
    setPositions([0, 0, 0, 0]);
    setDisplayPositions([0, 0, 0, 0]);
    setCurrentPlayer(0);
    setDiceFace(1);
    setWinVisible(false);
    setBusy(false);
    setDiceRolling(false);
    setPhase('play');
  }, []);

  const startFromSetup = useCallback(() => {
    setPositions(Array.from({ length: 4 }, () => 0));
    setDisplayPositions(Array.from({ length: 4 }, () => 0));
    setCurrentPlayer(0);
    setDiceFace(1);
    setWinVisible(false);
    setBusy(false);
    setPhase('play');
  }, []);

  const advanceTurn = useCallback(
    (from: number) => {
      let next = (from + 1) % playerCount;
      setCurrentPlayer(next);
    },
    [playerCount],
  );

  const runRoll = useCallback(
    async (roll: number) => {
      const pi = currentPlayer;
      setBusy(true);
      const start = positionsRef.current[pi] ?? 0;
      const land = nextPositionAfterRoll(start, roll);
      if (land === start) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setBusy(false);
        advanceTurn(pi);
        return;
      }

      const path: number[] = [];
      for (let s = start + 1; s <= land; s++) path.push(s);
      for (const sq of path) {
        setDisplayPositions((prev) => {
          const next = [...prev];
          next[pi] = sq;
          return next;
        });
        await new Promise((r) => setTimeout(r, 55));
      }

      const { end: afterSL, kind } = applySnakeOrLadder(land);
      if (kind && afterSL !== land) {
        Haptics.impactAsync(kind === 'ladder' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
        const slideSteps = Math.min(12, Math.abs(afterSL - land));
        let cur = land;
        for (let k = 0; k < slideSteps; k++) {
          cur = Math.round(land + ((afterSL - land) * (k + 1)) / slideSteps);
          const c = cur;
          setDisplayPositions((prev) => {
            const next = [...prev];
            next[pi] = c;
            return next;
          });
          await new Promise((r) => setTimeout(r, 40));
        }
        setDisplayPositions((prev) => {
          const next = [...prev];
          next[pi] = afterSL;
          return next;
        });
        setPositions((prev) => {
          const next = [...prev];
          next[pi] = afterSL;
          return next;
        });
      } else {
        setPositions((prev) => {
          const next = [...prev];
          next[pi] = land;
          return next;
        });
      }

      const finalPos =
        kind && afterSL !== land ? afterSL : land;
      if (finalPos >= 100) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setWinnerIndex(pi);
        setWinVisible(true);
        setBusy(false);
        return;
      }

      setBusy(false);
      advanceTurn(pi);
    },
    [advanceTurn, currentPlayer],
  );

  const rollDice = useCallback(async () => {
    if (busy || diceRolling || winVisible || phase !== 'play') return;
    const roll = 1 + Math.floor(Math.random() * 6);
    setDiceRolling(true);
    diceShake.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 40, easing: Easing.linear }),
        withTiming(10, { duration: 40, easing: Easing.linear }),
        withTiming(-8, { duration: 40, easing: Easing.linear }),
        withTiming(8, { duration: 40, easing: Easing.linear }),
      ),
      5,
      false,
    );
    let f = 0;
    const interval = setInterval(() => {
      f += 1;
      setDiceFace(1 + (f % 6));
    }, 70);
    await new Promise((r) => setTimeout(r, 520));
    clearInterval(interval);
    setDiceFace(roll);
    diceShake.value = withTiming(0, { duration: 120 });
    setDiceRolling(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await runRoll(roll);
  }, [busy, diceRolling, diceShake, phase, runRoll, winVisible]);

  useEffect(() => {
    if (phase !== 'play' || winVisible || busy || diceRolling) return;
    if (!aiMask[currentPlayer]) return;
    const t = setTimeout(() => {
      rollDice();
    }, 650);
    return () => clearTimeout(t);
  }, [phase, winVisible, busy, diceRolling, currentPlayer, aiMask, rollDice]);

  const ladderFromSquares = useMemo(() => Object.keys(LADDERS).map((k) => Number(k)), []);
  const snakeFromSquares = useMemo(() => Object.keys(SNAKES).map((k) => Number(k)), []);

  const canRoll =
    phase === 'play' &&
    !busy &&
    !diceRolling &&
    !winVisible &&
    !aiMask[currentPlayer];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <MaterialIcons name="arrow-back" size={24} color="#E9D5FF" />
        </Pressable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Snakes & Ladders
        </ThemedText>
        <HowToPlayButton gameId="snakes-ladders" tint="#E9D5FF" />
      </View>

      {phase === 'setup' ? (
        <ScrollView contentContainerStyle={styles.setupScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.setupHead}>Players</Text>
          <Text style={styles.setupSub}>1–4 players. Toggle CPU for AI opponents.</Text>
          <View style={styles.countRow}>
            {[1, 2, 3, 4].map((n) => (
              <Pressable
                key={n}
                onPress={() => setPlayerCount(n)}
                style={[styles.countChip, playerCount === n && styles.countChipOn]}
              >
                <Text style={[styles.countChipText, playerCount === n && styles.countChipTextOn]}>{n}</Text>
              </Pressable>
            ))}
          </View>
          {playerCount > 1 && (
            <View style={styles.aiList}>
              {Array.from({ length: playerCount - 1 }, (_, i) => i + 1).map((slot) => (
                <View key={slot} style={styles.aiRow}>
                  <Text style={styles.aiLabel}>{slot === 1 ? 'Player 2' : slot === 2 ? 'Player 3' : 'Player 4'}</Text>
                  <Switch
                    value={aiMask[slot]}
                    onValueChange={(v) =>
                      setAiMask((m) => {
                        const next = [...m] as [boolean, boolean, boolean, boolean];
                        next[slot] = v;
                        return next;
                      })
                    }
                    trackColor={{ false: '#3f3f46', true: 'rgba(124, 58, 237, 0.55)' }}
                    thumbColor={aiMask[slot] ? '#C4B5FD' : '#71717A'}
                  />
                  <Text style={styles.aiHint}>{aiMask[slot] ? 'CPU' : 'Human'}</Text>
                </View>
              ))}
            </View>
          )}
          <Pressable onPress={startFromSetup} style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}>
            <Text style={styles.startBtnText}>Start game</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.playScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.turnBanner}>
            <Text style={styles.turnText}>
              {winVisible ? 'Game over' : `${playerLabel(currentPlayer)}’s turn`}
            </Text>
            {!aiMask[currentPlayer] && !winVisible && (
              <Text style={styles.turnHint}>Roll the dice</Text>
            )}
          </View>

          <View style={[styles.boardOuter, { width: boardPx, height: boardPx }]}>
            <View style={[styles.boardGrid, { left: BOARD_PAD, top: BOARD_PAD, width: cell * BOARD_SIZE, height: cell * BOARD_SIZE }]}>
              {Array.from({ length: BOARD_SIZE }, (_, row) => (
                <View key={row} style={styles.row}>
                  {Array.from({ length: BOARD_SIZE }, (_, col) => {
                    const rowFromBottom = 9 - row;
                    const base = rowFromBottom * 10;
                    const offset = rowFromBottom % 2 === 0 ? col : 9 - col;
                    const n = base + offset + 1;
                    return (
                      <View
                        key={`${row}-${col}`}
                        style={[
                          styles.cell,
                          {
                            width: cell,
                            height: cell,
                            backgroundColor: cellHue(row, col),
                            borderColor: 'rgba(0,0,0,0.2)',
                          },
                        ]}
                      >
                        <Text style={styles.cellNum}>{n}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            {ladderFromSquares.map((fromSq) => (
              <LadderGraphic
                key={`L${fromSq}`}
                from={fromSq}
                to={LADDERS[fromSq]!}
                cell={cell}
                pad={BOARD_PAD}
                zIndex={3}
              />
            ))}
            {snakeFromSquares.map((fromSq) => (
              <SnakeGraphic
                key={`S${fromSq}`}
                from={fromSq}
                to={SNAKES[fromSq]!}
                cell={cell}
                pad={BOARD_PAD}
                zIndex={4}
              />
            ))}

            {Array.from({ length: playerCount }, (_, pi) => {
              const pos = displayPositions[pi] ?? 0;
              if (pos < 1) return null;
              const { row, col } = squareToRC(pos);
              const sameSq = Array.from({ length: playerCount }, (_, j) => (displayPositions[j] ?? 0) === pos).filter(
                Boolean,
              ).length;
              const idxOnSq =
                Array.from({ length: pi + 1 }, (_, j) => (displayPositions[j] ?? 0) === pos).filter(Boolean).length - 1;
              const ox = sameSq > 1 ? (idxOnSq % 2) * 10 - 5 : 0;
              const oy = sameSq > 1 ? Math.floor(idxOnSq / 2) * 10 - 5 : 0;
              const isCurrent = pi === currentPlayer && !winVisible;
              return (
                <View
                  key={pi}
                  pointerEvents="none"
                  style={[
                    styles.piece,
                    {
                      width: Math.max(14, cell * 0.34),
                      height: Math.max(14, cell * 0.34),
                      borderRadius: 999,
                      left: BOARD_PAD + col * cell + cell / 2 - Math.max(14, cell * 0.34) / 2 + ox,
                      top: BOARD_PAD + row * cell + cell / 2 - Math.max(14, cell * 0.34) / 2 + oy,
                      backgroundColor: PLAYER_COLORS[pi % PLAYER_COLORS.length],
                      borderWidth: isCurrent ? 3 : 2,
                      borderColor: isCurrent ? '#FEF08A' : 'rgba(0,0,0,0.35)',
                      zIndex: 20 + pi,
                      shadowColor: isCurrent ? '#FDE047' : '#000',
                      shadowOpacity: isCurrent ? 0.55 : 0.25,
                      shadowRadius: isCurrent ? 6 : 3,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.diceRow}>
            <Animated.View style={[styles.diceBox, diceShakeStyle]}>
              <Text style={styles.diceEmoji}>{DICE_FACE[diceFace - 1]}</Text>
              <Text style={styles.diceNum}>{diceFace}</Text>
            </Animated.View>
            <Pressable
              onPress={rollDice}
              disabled={!canRoll}
              style={({ pressed }) => [
                styles.rollBtn,
                (!canRoll || pressed) && { opacity: canRoll ? 0.85 : 0.45 },
              ]}
            >
              <Text style={styles.rollBtnText}>{diceRolling ? 'Rolling…' : 'Roll dice'}</Text>
            </Pressable>
          </View>

          <View style={styles.legend}>
            {Array.from({ length: playerCount }, (_, i) => (
              <View key={i} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }]} />
                <Text style={styles.legendText}>{playerLabel(i)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <WinnerModal
        visible={winVisible}
        winnerName={playerLabel(winnerIndex)}
        subtitle="First to square 100 wins!"
        onPlayAgain={resetGame}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, color: '#E9D5FF', fontWeight: '800' },
  pressed: { opacity: 0.88 },
  setupScroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.lg + Spacing.md },
  setupHead: { color: '#F5F3FF', fontSize: 22, fontWeight: '800' },
  setupSub: { color: '#C4B5FD', fontSize: 15, lineHeight: 22 },
  countRow: { flexDirection: 'row', gap: 10 },
  countChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  countChipOn: {
    backgroundColor: 'rgba(124, 58, 237, 0.55)',
    borderColor: '#C4B5FD',
  },
  countChipText: { color: '#DDD6FE', fontWeight: '800', fontSize: 17 },
  countChipTextOn: { color: '#fff' },
  aiList: { gap: Spacing.sm },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  aiLabel: { color: '#E9D5FF', fontWeight: '700', flex: 1 },
  aiHint: { color: '#A78BFA', fontWeight: '700', width: 52, textAlign: 'right' },
  startBtn: {
    marginTop: Spacing.sm,
    backgroundColor: AppColors.tint,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  playScroll: { alignItems: 'center', paddingBottom: Spacing.lg + Spacing.md, gap: Spacing.md },
  turnBanner: { alignItems: 'center', paddingHorizontal: Spacing.md },
  turnText: { color: '#F5F3FF', fontSize: 18, fontWeight: '800' },
  turnHint: { color: '#C4B5FD', fontSize: 14, marginTop: 4, fontWeight: '600' },
  boardOuter: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.45)',
    backgroundColor: '#1e1033',
  },
  boardGrid: { position: 'absolute', zIndex: 0 },
  row: { flexDirection: 'row' },
  cell: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  cellNum: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 9,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  segment: { position: 'absolute' },
  piece: { position: 'absolute' },
  diceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  diceBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(233, 213, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceEmoji: { fontSize: 28, marginBottom: 2 },
  diceNum: { color: '#F5F3FF', fontWeight: '900', fontSize: 16 },
  rollBtn: {
    backgroundColor: '#6D28D9',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.5)',
  },
  rollBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  legend: { alignSelf: 'stretch', paddingHorizontal: Spacing.lg, gap: 6, marginTop: Spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: '#DDD6FE', fontWeight: '600', fontSize: 14 },
});
