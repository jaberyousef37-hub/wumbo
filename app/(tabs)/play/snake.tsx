import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/design-system';
import { GameResultsSummary } from '@/components/game-results-summary';
import { HowToPlayButton } from '@/components/how-to-play-button';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { useCosmetics } from '@/contexts/cosmetics-context';
import type { RewardBreakdown } from '@/lib/game-rewards';
import { recordRecentGame } from '@/lib/recent-games';
import { playClick } from '@/lib/sounds';

const INITIAL_SPEED = 220;
const MIN_SPEED = 72;
const SPEED_DECREMENT = 6;

const BG_DARK = AppColors.background;
const SNAKE_COLOR = '#00ff88';
const FOOD_COLOR = '#ff4444';
const GRID_LINE = AppColors.cardBorder;

type Dir = 'up' | 'down' | 'left' | 'right';

function getNextHead(head: [number, number], dir: Dir): [number, number] {
  const [r, c] = head;
  if (dir === 'up') return [r - 1, c];
  if (dir === 'down') return [r + 1, c];
  if (dir === 'left') return [r, c - 1];
  return [r, c + 1];
}

function randomFood(snake: [number, number][], gridSize: number): [number, number] {
  let r: number;
  let c: number;
  const set = new Set(snake.map(([a, b]) => `${a},${b}`));
  do {
    r = Math.floor(Math.random() * gridSize);
    c = Math.floor(Math.random() * gridSize);
  } while (set.has(`${r},${c}`));
  return [r, c];
}

function makeInitialSnake(mid: number): [number, number][] {
  return [
    [mid, mid],
    [mid, mid - 1],
    [mid, mid - 2],
  ];
}

const CONTROLS_RESERVE = 168;

export default function SnakeScreen() {
  const router = useRouter();
  const { rewardGameEnd } = useCosmetics();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const { gridSize, cellSize, gridWidth } = useMemo(() => {
    const horizontalPad = 16 * 2;
    const usableW = winW - horizontalPad;
    const usableH = winH - insets.top - insets.bottom - CONTROLS_RESERVE;
    const usable = Math.min(usableW, usableH);
    const targetCell = 10;
    const g = Math.max(18, Math.min(32, Math.floor(usable / targetCell)));
    const cs = Math.max(10, Math.floor(usable / g));
    return { gridSize: g, cellSize: cs, gridWidth: cs * g };
  }, [winW, winH, insets.top, insets.bottom]);

  const mid = Math.floor(gridSize / 2);
  const [snake, setSnake] = useState<[number, number][]>(() => makeInitialSnake(Math.max(7, Math.floor(15 / 2))));
  const [food, setFood] = useState<[number, number]>([5, 5]);
  const [direction, setDirection] = useState<Dir>('right');
  const [nextDirection, setNextDirection] = useState<Dir>('right');
  const [gameOver, setGameOver] = useState(false);
  const [endRewards, setEndRewards] = useState<RewardBreakdown | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playing, setPlaying] = useState(true);

  const directionRef = useRef<Dir>('right');
  const gridSizeRef = useRef(gridSize);
  const scoreRef = useRef(score);
  const tickRef = useRef<() => void>(() => {});
  const snakeRecordedRef = useRef(false);

  directionRef.current = direction;
  gridSizeRef.current = gridSize;
  scoreRef.current = score;

  const tick = useCallback(() => {
    const G = gridSizeRef.current;
    const nd = nextDirection;
    const cur = directionRef.current;
    const effectiveDir =
      (cur === 'up' && nd === 'down') ||
      (cur === 'down' && nd === 'up') ||
      (cur === 'left' && nd === 'right') ||
      (cur === 'right' && nd === 'left')
        ? cur
        : nd;
    directionRef.current = effectiveDir;
    setDirection(effectiveDir);

    setSnake((s) => {
      const head = s[0];
      const dir = effectiveDir;
      if (
        (dir === 'up' && head[0] === 0) ||
        (dir === 'down' && head[0] === G - 1) ||
        (dir === 'left' && head[1] === 0) ||
        (dir === 'right' && head[1] === G - 1)
      ) {
        setGameOver(true);
        setPlaying(false);
        return s;
      }
      const nextHead = getNextHead(head, dir);
      const hitSelf = s.some(([r, c]) => r === nextHead[0] && c === nextHead[1]);
      if (hitSelf) {
        setGameOver(true);
        setPlaying(false);
        return s;
      }
      const ateFood = nextHead[0] === food[0] && nextHead[1] === food[1];
      const newSnake = [nextHead, ...s];
      if (!ateFood) newSnake.pop();
      if (ateFood) {
        setScore((sc) => sc + 1);
        setFood(randomFood(newSnake, G));
      }
      return newSnake;
    });
  }, [nextDirection, food]);

  tickRef.current = tick;

  useEffect(() => {
    const s0 = makeInitialSnake(mid);
    setSnake(s0);
    setFood(randomFood(s0, gridSize));
    setDirection('right');
    setNextDirection('right');
    directionRef.current = 'right';
    setGameOver(false);
    setScore(0);
    setPlaying(true);
  }, [gridSize, mid]);

  useEffect(() => {
    if (!playing || gameOver) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      if (!playing || gameOver) return;
      const speed = Math.max(MIN_SPEED, INITIAL_SPEED - scoreRef.current * SPEED_DECREMENT);
      acc += now - last;
      last = now;
      while (acc >= speed) {
        acc -= speed;
        tickRef.current();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, gameOver]);

  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      void AsyncStorage.setItem('snake_high_score', String(score));
    }
  }, [gameOver, score, highScore]);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem('snake_high_score').then((v) => {
      if (cancelled || !v) return;
      const parsed = parseInt(v, 10);
      if (Number.isNaN(parsed)) return;
      // Merge instead of overwrite: if a new best was set before this read resolved,
      // keep the larger value rather than clobbering it with the stale persisted one.
      setHighScore((prev) => Math.max(prev, parsed));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gameOver) {
      snakeRecordedRef.current = false;
      setEndRewards(null);
      return;
    }
    if (snakeRecordedRef.current) return;
    snakeRecordedRef.current = true;
    const beatBest = score > highScore;
    const outcome = beatBest ? 'win' : 'loss';
    void rewardGameEnd(outcome).then(setEndRewards);
    void recordRecentGame({
      gameName: 'Snake',
      result: beatBest ? 'win' : 'loss',
      score: `${score} pts`,
    });
  }, [gameOver, score, highScore, rewardGameEnd]);

  const handleRestart = useCallback(() => {
    const s0 = makeInitialSnake(mid);
    setSnake(s0);
    setFood(randomFood(s0, gridSize));
    setDirection('right');
    setNextDirection('right');
    directionRef.current = 'right';
    setGameOver(false);
    setEndRewards(null);
    setScore(0);
    setPlaying(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playClick();
  }, [gridSize, mid]);

  const handleDir = useCallback((dir: Dir) => {
    setNextDirection(dir);
    playClick();
  }, []);

  const handleDirRef = useRef(handleDir);
  handleDirRef.current = handleDir;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 || Math.abs(g.dy) > 14,
      onPanResponderRelease: (_, g) => {
        const { dx, dy } = g;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          handleDirRef.current(dx > 0 ? 'right' : 'left');
        } else {
          handleDirRef.current(dy > 0 ? 'down' : 'up');
        }
      },
    })
  ).current;

  const speedMs = Math.max(MIN_SPEED, INITIAL_SPEED - score * SPEED_DECREMENT);
  const speedLevel = 1 + Math.min(15, Math.floor((INITIAL_SPEED - speedMs) / SPEED_DECREMENT) + 1);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG_DARK }]} edges={['bottom', 'left', 'right']}>
      <View style={{ paddingTop: insets.top }}>
        <HeaderBar
          title="Snake"
          onBack={() => router.back()}
          right={<HowToPlayButton gameId="snake" tint="#FFFFFF" />}
        />
        <View style={styles.scoreStrip}>
          <View style={styles.scores}>
            <ThemedText style={styles.scoreText}>Score: {score}</ThemedText>
            <ThemedText style={styles.highScoreText}>Best: {Math.max(score, highScore)}</ThemedText>
            <ThemedText style={styles.speedLabel}>
              Speed Lv {speedLevel} · {speedMs}ms/step
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.container, { paddingBottom: 8 }]}>
        <ThemedText style={styles.swipeHint} darkColor="rgba(255,255,255,0.55)">
          Swipe on the grid — or use arrows below
        </ThemedText>

        <View
          style={[styles.gridWrap, { width: gridWidth, height: gridWidth }]}
          {...panResponder.panHandlers}
        >
          {Array.from({ length: gridSize * gridSize }, (_, i) => {
            const r = Math.floor(i / gridSize);
            const c = i % gridSize;
            const isSnake = snake.some(([sr, sc]) => sr === r && sc === c);
            const isFood = food[0] === r && food[1] === c;
            return (
              <View
                key={i}
                style={[
                  styles.cell,
                  {
                    width: cellSize - 0.5,
                    height: cellSize - 0.5,
                    backgroundColor: isSnake ? SNAKE_COLOR : isFood ? FOOD_COLOR : BG_DARK,
                    borderColor: GRID_LINE,
                  },
                ]}
              />
            );
          })}
        </View>

        {gameOver && (
          <View style={styles.gameOverWrap}>
            <ThemedText style={styles.gameOverText}>Game Over!</ThemedText>
            <ThemedText style={styles.gameOverScore}>Score: {score}</ThemedText>
            {endRewards != null && endRewards.xpAdded + endRewards.coinsAdded > 0 ? (
              <GameResultsSummary rewards={endRewards} compact />
            ) : null}
            <PrimaryButton label="Play Again" onPress={handleRestart} style={styles.restartBtn} />
          </View>
        )}

        <View style={styles.controls}>
          <View style={styles.arrowRow}>
            <View style={styles.arrowSpacer} />
            <Pressable
              onPress={() => handleDir('up')}
              style={({ pressed }) => [styles.arrowBtn, pressed && styles.arrowBtnPressed]}
              hitSlop={12}
            >
              <MaterialIcons name="keyboard-arrow-up" size={56} color={SNAKE_COLOR} />
            </Pressable>
            <View style={styles.arrowSpacer} />
          </View>
          <View style={styles.arrowRow}>
            <Pressable
              onPress={() => handleDir('left')}
              style={({ pressed }) => [styles.arrowBtn, pressed && styles.arrowBtnPressed]}
              hitSlop={12}
            >
              <MaterialIcons name="keyboard-arrow-left" size={56} color={SNAKE_COLOR} />
            </Pressable>
            <View style={styles.arrowSpacer} />
            <Pressable
              onPress={() => handleDir('right')}
              style={({ pressed }) => [styles.arrowBtn, pressed && styles.arrowBtnPressed]}
              hitSlop={12}
            >
              <MaterialIcons name="keyboard-arrow-right" size={56} color={SNAKE_COLOR} />
            </Pressable>
          </View>
          <View style={styles.arrowRow}>
            <View style={styles.arrowSpacer} />
            <Pressable
              onPress={() => handleDir('down')}
              style={({ pressed }) => [styles.arrowBtn, pressed && styles.arrowBtnPressed]}
              hitSlop={12}
            >
              <MaterialIcons name="keyboard-arrow-down" size={56} color={SNAKE_COLOR} />
            </Pressable>
            <View style={styles.arrowSpacer} />
          </View>
        </View>

        <Pressable onPress={() => router.back()} style={styles.backToGames}>
          <ThemedText style={styles.backToGamesText}>Back to Play</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  scoreStrip: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  scores: { alignItems: 'flex-end' },
  scoreText: { color: '#00ff88', fontSize: 16, fontWeight: '700' },
  highScoreText: { color: AppColors.textSecondary, fontSize: 14 },
  speedLabel: { color: AppColors.yellow, fontSize: 12, fontWeight: '600', marginTop: 2 },
  swipeHint: { fontSize: 12, marginBottom: 8, alignSelf: 'center' },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 2,
    borderColor: AppColors.cardBorder,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cell: {
    borderWidth: 0.5,
    borderRadius: 2,
  },
  gameOverWrap: {
    position: 'absolute',
    top: '35%',
    left: 20,
    right: 20,
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
  },
  gameOverText: { color: AppColors.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  gameOverScore: { color: '#00ff88', fontSize: 18, marginBottom: 16 },
  restartBtn: { minWidth: 140 },
  controls: { marginTop: 14 },
  arrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  arrowSpacer: { width: 72, height: 72 },
  arrowBtn: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: 'rgba(0,255,136,0.12)',
  },
  arrowBtnPressed: { opacity: 0.7 },
  backToGames: { marginTop: 20 },
  backToGamesText: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },
});
