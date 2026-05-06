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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/design-system';
import { HowToPlayButton } from '@/components/how-to-play-button';
import { ThemedText } from '@/components/themed-text';
import { WinnerModal } from '@/components/winner-modal';
import { useCosmetics } from '@/contexts/cosmetics-context';
import { AppColors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { TextColors, Typography } from '@/constants/typography';
import type { RewardBreakdown } from '@/lib/game-rewards';
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
/** Board cells only — light / dark alternating */
const CELL_LIGHT = '#F5F5DC';
const CELL_DARK = '#8B7355';
const LADDER_COLOR = '#2ECC71';
const SNAKE_COLOR = '#E74C3C';
/** Purple, pink, yellow, blue (max 4) */
const PLAYER_COLORS = ['#7C3AED', '#EC4899', '#FBBF24', '#3B82F6'] as const;
const DICE_FACE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

type Phase = 'setup' | 'play';

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
  const rail = LADDER_COLOR;
  const rung = LADDER_COLOR;
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
        thickness={6.5}
        color={SNAKE_COLOR}
        zIndex={zIndex}
      />,
    );
  }
  return <>{segs}</>;
}

export default function SnakesLaddersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rewardGameEnd } = useCosmetics();
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
  const [endRewards, setEndRewards] = useState<RewardBreakdown | null>(null);
  const slCoinRef = useRef(false);

  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  /** Goes true when the screen unmounts. Async roll/animation callbacks check this after
   *  every `await` and bail out so we never call setState on a dead screen. */
  const unmountedRef = useRef(false);
  /** Live dice-face cycling interval id, cleared on unmount if it's still running. */
  const diceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (diceIntervalRef.current) {
        clearInterval(diceIntervalRef.current);
        diceIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!winVisible) {
      slCoinRef.current = false;
      setEndRewards(null);
      return;
    }
    if (slCoinRef.current) return;
    slCoinRef.current = true;
    const outcome = winnerIndex === 0 ? 'win' : 'loss';
    void rewardGameEnd(outcome).then(setEndRewards);
  }, [winVisible, winnerIndex, rewardGameEnd]);

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
        if (unmountedRef.current) return;
        setDisplayPositions((prev) => {
          const next = [...prev];
          next[pi] = sq;
          return next;
        });
        await new Promise((r) => setTimeout(r, 55));
      }
      if (unmountedRef.current) return;

      const { end: afterSL, kind } = applySnakeOrLadder(land);
      if (kind && afterSL !== land) {
        Haptics.impactAsync(kind === 'ladder' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
        const slideSteps = Math.min(12, Math.abs(afterSL - land));
        let cur = land;
        for (let k = 0; k < slideSteps; k++) {
          if (unmountedRef.current) return;
          cur = Math.round(land + ((afterSL - land) * (k + 1)) / slideSteps);
          const c = cur;
          setDisplayPositions((prev) => {
            const next = [...prev];
            next[pi] = c;
            return next;
          });
          await new Promise((r) => setTimeout(r, 40));
        }
        if (unmountedRef.current) return;
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
    if (diceIntervalRef.current) clearInterval(diceIntervalRef.current);
    diceIntervalRef.current = setInterval(() => {
      f += 1;
      setDiceFace(1 + (f % 6));
    }, 70);
    await new Promise((r) => setTimeout(r, 520));
    if (diceIntervalRef.current) {
      clearInterval(diceIntervalRef.current);
      diceIntervalRef.current = null;
    }
    if (unmountedRef.current) return;
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
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
      <HeaderBar
        title="Snakes & Ladders"
        onBack={() => router.back()}
        right={<HowToPlayButton gameId="snakes-ladders" tint="#FFFFFF" />}
      />

      {phase === 'setup' ? (
        <ScrollView contentContainerStyle={styles.setupScroll} keyboardShouldPersistTaps="handled">
          <ThemedText type="section" style={styles.setupHead}>
            Players
          </ThemedText>
          <ThemedText type="body" style={styles.setupSub}>
            1–4 players. Toggle CPU for AI opponents.
          </ThemedText>
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
                  <ThemedText type="cardTitle" style={styles.aiLabel}>
                  {slot === 1 ? 'Player 2' : slot === 2 ? 'Player 3' : 'Player 4'}
                </ThemedText>
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
                  <ThemedText type="caption" style={styles.aiHint}>
                    {aiMask[slot] ? 'CPU' : 'Human'}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
          <Pressable onPress={startFromSetup} style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}>
            <ThemedText type="cardTitle" style={styles.startBtnText}>
              Start game
            </ThemedText>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.playScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.turnBanner}>
            <ThemedText type="section" style={styles.turnText}>
              {winVisible ? 'Game over' : `${playerLabel(currentPlayer)}’s turn`}
            </ThemedText>
            {!aiMask[currentPlayer] && !winVisible && (
              <ThemedText type="caption" style={styles.turnHint}>
                Roll the dice
              </ThemedText>
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
                    const isLightCell = (row + col) % 2 === 0;
                    return (
                      <View
                        key={`${row}-${col}`}
                        style={[
                          styles.cell,
                          {
                            width: cell,
                            height: cell,
                            backgroundColor: isLightCell ? CELL_LIGHT : CELL_DARK,
                            borderColor: 'rgba(0,0,0,0.18)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cellNum,
                            isLightCell ? styles.cellNumOnLight : styles.cellNumOnDark,
                          ]}
                        >
                          {n}
                        </Text>
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
                      borderColor: isCurrent ? TextColors.primary : 'rgba(0,0,0,0.4)',
                      zIndex: 20 + pi,
                      shadowColor: '#000',
                      shadowOpacity: isCurrent ? 0.35 : 0.22,
                      shadowRadius: isCurrent ? 5 : 3,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.diceRow}>
            <Animated.View style={[styles.diceBox, diceShakeStyle]}>
              <Text style={styles.diceEmoji}>{DICE_FACE[diceFace - 1]}</Text>
              <ThemedText type="cardTitle" style={styles.diceNum}>
                {diceFace}
              </ThemedText>
            </Animated.View>
            <Pressable
              onPress={rollDice}
              disabled={!canRoll}
              style={({ pressed }) => [
                styles.rollBtn,
                (!canRoll || pressed) && { opacity: canRoll ? 0.85 : 0.45 },
              ]}
            >
              <ThemedText type="cardTitle" style={styles.rollBtnText}>
                {diceRolling ? 'Rolling…' : 'Roll dice'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.legend}>
            {Array.from({ length: playerCount }, (_, i) => (
              <View key={i} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }]} />
                <ThemedText type="body" style={styles.legendText}>
                  {playerLabel(i)}
                </ThemedText>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <WinnerModal
        visible={winVisible}
        winnerName={playerLabel(winnerIndex)}
        subtitle="First to square 100 wins!"
        rewards={endRewards}
        onPlayAgain={resetGame}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  pressed: { opacity: 0.88 },
  setupScroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.lg + Spacing.md },
  setupHead: {},
  setupSub: { color: TextColors.secondary },
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
  countChipText: { color: TextColors.primary, fontWeight: '700', fontSize: Typography.cardTitle },
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
  aiLabel: { flex: 1 },
  aiHint: { color: TextColors.secondary, width: 52, textAlign: 'right', fontWeight: '600' },
  startBtn: {
    marginTop: Spacing.sm,
    backgroundColor: AppColors.tint,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  startBtnText: { color: TextColors.primary, fontWeight: '700' },
  playScroll: { alignItems: 'center', paddingBottom: Spacing.lg + Spacing.md, gap: Spacing.md },
  turnBanner: { alignItems: 'center', paddingHorizontal: Spacing.md },
  turnText: {},
  turnHint: { color: TextColors.secondary, marginTop: 4 },
  boardOuter: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.35)',
    backgroundColor: '#2A231C',
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
    fontSize: Typography.caption,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  cellNumOnLight: { color: '#4A3728' },
  cellNumOnDark: { color: 'rgba(255,255,255,0.95)' },
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
  diceNum: { color: TextColors.primary, fontWeight: '700' },
  rollBtn: {
    backgroundColor: '#6D28D9',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.5)',
  },
  rollBtnText: { color: TextColors.primary, fontWeight: '700' },
  legend: { alignSelf: 'stretch', paddingHorizontal: Spacing.lg, gap: 6, marginTop: Spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: TextColors.primary },
});
