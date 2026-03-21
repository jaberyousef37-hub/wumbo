import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import AnimatedRN, {
  cancelAnimation,
  Easing as ReEasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { Typography } from '@/constants/typography';
import { playClick } from '@/lib/sounds';
import { supabase } from '@/lib/supabase';

const BG_DARK = AppColors.background;
const CUP_GOLD = '#d4af37';
const BALL_COLOR = '#fff';
const ACCENT = AppColors.tint;

const SHUFFLE_COUNT = 6;
const SWAP_DURATION = 580;
const WATCH_MS = 1500;

/** Cups and track scaled to 80% of previous layout */
const CUP_SIZE = Math.round(144 * 0.8);
const CUP_SPACING = Math.round(32 * 0.8);
const CUP_BODY_WIDTH = Math.round(128 * 0.8);
const CUP_BODY_HEIGHT = Math.round(140 * 0.8);
const CUP_TOP_WIDTH = Math.round(144 * 0.8);
const CUP_TOP_HEIGHT = Math.round(24 * 0.8);
const BALL_SIZE = Math.round(32 * 0.8);
const BOB_Y = Math.round(-22 * 0.8);

type GamePhase = 'hiding' | 'watching' | 'shuffling' | 'guessing' | 'result';

type ShellGameState = {
  ball_position: number | null;
  shuffle_sequence: [number, number][];
  game_phase: GamePhase;
  winner: 'host' | 'guesser' | null;
  guesser_choice: number | null;
};

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function generateShuffleSequence(): [number, number][] {
  const seq: [number, number][] = [];
  for (let i = 0; i < SHUFFLE_COUNT; i++) {
    const slots = shuffleArray([0, 1, 2]);
    seq.push([slots[0], slots[1]]);
  }
  return seq;
}

export default function ShellGamePlayScreen() {
  const router = useRouter();
  const { gameId, roomCode, isHost, myName } = useLocalSearchParams<{
    gameId?: string;
    roomCode?: string;
    isHost?: string;
    myName?: string;
  }>();

  const totalWidth = CUP_SIZE * 3 + CUP_SPACING * 2;
  const [trackLayoutW, setTrackLayoutW] = useState(
    () => Math.max(0, Dimensions.get('window').width - 32)
  );
  const layoutRef = useRef({ baseX: 0 });
  layoutRef.current.baseX = Math.max(0, (trackLayoutW - totalWidth) / 2);

  const [state, setState] = useState<ShellGameState>({
    ball_position: null,
    shuffle_sequence: [],
    game_phase: 'hiding',
    winner: null,
    guesser_choice: null,
  });
  const [shuffling, setShuffling] = useState(false);
  const [canGuess, setCanGuess] = useState(false);
  const [localBallPick, setLocalBallPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const cupX0 = useSharedValue(0);
  const cupX1 = useSharedValue(0);
  const cupX2 = useSharedValue(0);
  const cupY0 = useSharedValue(0);
  const cupY1 = useSharedValue(0);
  const cupY2 = useSharedValue(0);
  const pickPulse = useSharedValue(1);
  const pickActive = useSharedValue(0);

  const watchPulse = useRef(new Animated.Value(1)).current;
  const wrongRevealAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const correctRevealAnim = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(1)).current;

  const amHost = isHost === '1';
  const isLocal = gameId === 'local';

  const getCupX = useCallback(
    (slot: number) => layoutRef.current.baseX + slot * (CUP_SIZE + CUP_SPACING),
    []
  );

  const prevTrackW = useRef(-1);
  useEffect(() => {
    if (trackLayoutW <= 0 || shuffling) return;
    if (prevTrackW.current === trackLayoutW) return;
    prevTrackW.current = trackLayoutW;
    cupY0.value = 0;
    cupY1.value = 0;
    cupY2.value = 0;
    cupX0.value = getCupX(0);
    cupX1.value = getCupX(1);
    cupX2.value = getCupX(2);
  }, [trackLayoutW, getCupX, shuffling, cupX0, cupX1, cupX2, cupY0, cupY1, cupY2]);

  useEffect(() => {
    if (!gameId || gameId === 'local') {
      return;
    }

    const loadGame = async () => {
      const { data, error } = await supabase
        .from('shell_games')
        .select('ball_position, shuffle_sequence, game_phase, winner, guesser_choice')
        .eq('id', gameId)
        .single();

      if (!error && data) {
        const seq = (data.shuffle_sequence as [number, number][] | null) ?? [];
        setState({
          ball_position: data.ball_position as number | null,
          shuffle_sequence: seq,
          game_phase: (data.game_phase as GamePhase) ?? 'hiding',
          winner: data.winner as 'host' | 'guesser' | null,
          guesser_choice: data.guesser_choice as number | null,
        });
      }
    };

    loadGame();

    const channel = supabase
      .channel(`shell-game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shell_games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const r = payload.new as {
            ball_position: number | null;
            shuffle_sequence: [number, number][];
            game_phase: GamePhase;
            winner: 'host' | 'guesser' | null;
            guesser_choice: number | null;
          };
          if (r) {
            const seq = (r.shuffle_sequence ?? []) as [number, number][];
            setState({
              ball_position: r.ball_position ?? null,
              shuffle_sequence: seq,
              game_phase: (r.game_phase ?? 'hiding') as GamePhase,
              winner: r.winner ?? null,
              guesser_choice: r.guesser_choice ?? null,
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId]);

  useEffect(() => {
    if (shuffling) {
      watchPulse.setValue(1);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(watchPulse, {
            toValue: 1.08,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(watchPulse, {
            toValue: 0.92,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [shuffling, watchPulse]);

  const isGuessingPhase = state.game_phase === 'guessing';
  useEffect(() => {
    if (shuffling || !canGuess || state.game_phase !== 'guessing') {
      pickActive.value = 0;
      cancelAnimation(pickPulse);
      pickPulse.value = 1;
      return;
    }
    pickActive.value = 1;
    pickPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800, easing: ReEasing.inOut(ReEasing.ease) }),
        withTiming(0.98, { duration: 800, easing: ReEasing.inOut(ReEasing.ease) })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(pickPulse);
      pickPulse.value = 1;
    };
  }, [shuffling, canGuess, state.game_phase, pickActive, pickPulse]);

  const ballUnder = state.ball_position ?? localBallPick ?? 0;
  const showResult = state.game_phase === 'result';
  const guesserChoice = state.guesser_choice ?? -1;
  const won = state.winner === 'guesser';

  const scoreBumpRef = useRef(false);
  useEffect(() => {
    if (state.game_phase !== 'result') {
      scoreBumpRef.current = false;
      return;
    }
    if (state.winner === 'guesser' && !scoreBumpRef.current) {
      scoreBumpRef.current = true;
      setScore((s) => s + 1);
    }
  }, [state.game_phase, state.winner]);

  useEffect(() => {
    if (!showResult) return;

    if (won) {
      celebrateScale.setValue(1);
      Animated.sequence([
        Animated.timing(celebrateScale, {
          toValue: 1.2,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(celebrateScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 4,
          tension: 200,
        }),
      ]).start();
    } else if (guesserChoice >= 0) {
      wrongRevealAnims.forEach((f) => f.setValue(0));
      correctRevealAnim.setValue(0);
      Animated.sequence([
        Animated.timing(wrongRevealAnims[guesserChoice], {
          toValue: 1,
          duration: 350,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(120),
        Animated.timing(correctRevealAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showResult, won, guesserChoice, wrongRevealAnims, correctRevealAnim, celebrateScale]);

  const onShuffleAnimationsDone = useCallback(() => {
    setShuffling(false);
    setCanGuess(true);
    cupY0.value = 0;
    cupY1.value = 0;
    cupY2.value = 0;
  }, [cupY0, cupY1, cupY2]);

  const runShuffleFromSequence = useCallback(
    (seq: [number, number][]) => {
      setShuffling(true);
      setCanGuess(false);
      playClick();

      const getX = (slot: number) =>
        layoutRef.current.baseX + slot * (CUP_SIZE + CUP_SPACING);

      const xs = [cupX0, cupX1, cupX2];
      const ys = [cupY0, cupY1, cupY2];
      for (let i = 0; i < 3; i++) {
        cancelAnimation(xs[i]);
        cancelAnimation(ys[i]);
        xs[i].value = getX(i);
        ys[i].value = 0;
      }

      const advance = (step: number, order: [number, number, number]) => {
        if (step >= seq.length) {
          onShuffleAnimationsDone();
          return;
        }
        const [a, b] = seq[step];
        const newOrder: [number, number, number] = [...order];
        [newOrder[a], newOrder[b]] = [newOrder[b], newOrder[a]];

        let done = 0;
        const tick = () => {
          done += 1;
          if (done === 3) {
            advance(step + 1, newOrder);
          }
        };

        for (let cupId = 0; cupId < 3; cupId++) {
          const targetX = getX(newOrder.indexOf(cupId));
          xs[cupId].value = withTiming(
            targetX,
            {
              duration: SWAP_DURATION,
              easing: ReEasing.bezier(0.33, 0, 0.2, 1),
            },
            (finished) => {
              if (finished) runOnJS(tick)();
            }
          );
          ys[cupId].value = withSequence(
            withTiming(BOB_Y, {
              duration: Math.round(SWAP_DURATION * 0.42),
              easing: ReEasing.out(ReEasing.cubic),
            }),
            withTiming(0, {
              duration: Math.round(SWAP_DURATION * 0.58),
              easing: ReEasing.inOut(ReEasing.cubic),
            })
          );
        }
      };

      advance(0, [0, 1, 2]);
    },
    [cupX0, cupX1, cupX2, cupY0, cupY1, cupY2, onShuffleAnimationsDone]
  );

  useEffect(() => {
    if (
      state.game_phase === 'shuffling' &&
      state.shuffle_sequence.length > 0 &&
      state.ball_position !== null &&
      !shuffling
    ) {
      runShuffleFromSequence(state.shuffle_sequence);
    }
  }, [
    state.game_phase,
    state.shuffle_sequence,
    state.ball_position,
    runShuffleFromSequence,
    shuffling,
  ]);

  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** When Supabase fails, host uses local timer only — skip DB-driven watch effect. */
  const watchLocalOnlyRef = useRef(false);
  useEffect(() => {
    if (state.game_phase === 'shuffling' || state.game_phase === 'guessing') {
      watchLocalOnlyRef.current = false;
    }
  }, [state.game_phase]);

  useEffect(() => {
    if (!amHost || isLocal || state.game_phase !== 'watching' || !gameId || gameId === 'local') {
      return;
    }
    if (watchLocalOnlyRef.current) return;
    const t = setTimeout(async () => {
      const seq = generateShuffleSequence();
      await supabase
        .from('shell_games')
        .update({ game_phase: 'shuffling', shuffle_sequence: seq })
        .eq('id', gameId);
    }, WATCH_MS);
    watchTimerRef.current = t;
    return () => {
      clearTimeout(t);
      watchTimerRef.current = null;
    };
  }, [amHost, isLocal, state.game_phase, gameId]);

  const handleHostPickCup = useCallback(
    async (cupId: number) => {
      if (!amHost || state.game_phase !== 'hiding' || shuffling) return;

      if (isLocal) {
        setLocalBallPick(cupId);
        setState({
          ball_position: cupId,
          shuffle_sequence: [],
          game_phase: 'watching',
          winner: null,
          guesser_choice: null,
        });
        if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
        watchTimerRef.current = setTimeout(() => {
          watchTimerRef.current = null;
          const seq = generateShuffleSequence();
          setState((s) => ({
            ...s,
            game_phase: 'shuffling',
            shuffle_sequence: seq,
          }));
          runShuffleFromSequence(seq);
        }, WATCH_MS);
        return;
      }

      playClick();

      const { error } = await supabase
        .from('shell_games')
        .update({
          ball_position: cupId,
          shuffle_sequence: [],
          game_phase: 'watching',
        })
        .eq('id', gameId);

      if (error) {
        watchLocalOnlyRef.current = true;
        setLocalBallPick(cupId);
        setState({
          ball_position: cupId,
          shuffle_sequence: [],
          game_phase: 'watching',
          winner: null,
          guesser_choice: null,
        });
        if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
        watchTimerRef.current = setTimeout(() => {
          watchTimerRef.current = null;
          const seq = generateShuffleSequence();
          setState((s) => ({
            ...s,
            game_phase: 'shuffling',
            shuffle_sequence: seq,
          }));
          runShuffleFromSequence(seq);
        }, WATCH_MS);
      }
    },
    [amHost, state.game_phase, shuffling, isLocal, gameId, runShuffleFromSequence]
  );

  useEffect(() => {
    if (
      isLocal &&
      !shuffling &&
      state.game_phase === 'shuffling' &&
      state.shuffle_sequence.length > 0
    ) {
      setState((s) => ({ ...s, game_phase: 'guessing' }));
    }
  }, [isLocal, shuffling, state.game_phase, state.shuffle_sequence.length]);

  const handleShuffleComplete = useCallback(async () => {
    if (!amHost || isLocal || state.game_phase !== 'shuffling') return;
    await supabase
      .from('shell_games')
      .update({ game_phase: 'guessing' })
      .eq('id', gameId);
  }, [amHost, isLocal, state.game_phase, gameId]);

  useEffect(() => {
    if (
      !shuffling &&
      state.game_phase === 'shuffling' &&
      state.shuffle_sequence.length > 0 &&
      amHost &&
      !isLocal
    ) {
      handleShuffleComplete();
    }
  }, [
    shuffling,
    state.game_phase,
    state.shuffle_sequence.length,
    amHost,
    isLocal,
    handleShuffleComplete,
  ]);

  const handleGuesserPickCup = useCallback(
    async (cupId: number) => {
      const canActAsGuesser = !amHost || isLocal;
      if (!canActAsGuesser || state.game_phase !== 'guessing' || !canGuess || shuffling)
        return;

      const ballPos = state.ball_position ?? localBallPick;
      if (ballPos === null) return;

      const roundWon = cupId === ballPos;
      const winner = roundWon ? 'guesser' : 'host';

      if (roundWon) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      playClick();

      if (isLocal) {
        setState((s) => ({
          ...s,
          game_phase: 'result',
          winner,
          guesser_choice: cupId,
        }));
        return;
      }

      const { error } = await supabase
        .from('shell_games')
        .update({ game_phase: 'result', winner, guesser_choice: cupId })
        .eq('id', gameId);

      if (error) {
        setState((s) => ({
          ...s,
          game_phase: 'result',
          winner,
          guesser_choice: cupId,
        }));
      }
    },
    [
      amHost,
      state.game_phase,
      state.ball_position,
      canGuess,
      shuffling,
      localBallPick,
      isLocal,
      gameId,
    ]
  );

  const handleCupPress = useCallback(
    (cupId: number) => {
      if (amHost && state.game_phase === 'hiding') {
        handleHostPickCup(cupId);
      } else if ((!amHost || isLocal) && state.game_phase === 'guessing') {
        handleGuesserPickCup(cupId);
      }
    },
    [amHost, isLocal, state.game_phase, handleHostPickCup, handleGuesserPickCup]
  );

  const handleBack = () => router.back();

  const cupStyle0 = useAnimatedStyle(() => ({
    transform: [
      { translateX: cupX0.value },
      { translateY: cupY0.value },
      { scale: 1 + pickActive.value * (pickPulse.value - 1) },
    ],
  }));
  const cupStyle1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: cupX1.value },
      { translateY: cupY1.value },
      { scale: 1 + pickActive.value * (pickPulse.value - 1) },
    ],
  }));
  const cupStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: cupX2.value },
      { translateY: cupY2.value },
      { scale: 1 + pickActive.value * (pickPulse.value - 1) },
    ],
  }));
  const cupStyles = [cupStyle0, cupStyle1, cupStyle2];

  if (!gameId || !roomCode || !myName) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: BG_DARK }]} edges={['top']}>
        <View style={[styles.container, styles.centered]}>
          <ThemedText style={styles.errorText} darkColor="#fff">
            Invalid game session.
          </ThemedText>
          <Pressable onPress={handleBack}>
            <ThemedText style={[styles.linkText, { color: ACCENT }]}>Go back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const showBallWatch =
    state.game_phase === 'watching' &&
    state.ball_position !== null &&
    !shuffling;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG_DARK }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <ThemedText type="defaultSemiBold" style={styles.scoreText} darkColor="#fff">
          Score: {score}
        </ThemedText>
      </View>

      <View style={styles.container}>
        {state.game_phase === 'hiding' && amHost && (
          <ThemedText style={[styles.phaseHint, { color: 'rgba(255,255,255,0.7)' }]}>
            Tap a cup to hide the ball
          </ThemedText>
        )}
        {state.game_phase === 'hiding' && !amHost && (
          <ThemedText style={[styles.phaseHint, { color: 'rgba(255,255,255,0.7)' }]}>
            Waiting for host…
          </ThemedText>
        )}
        {showBallWatch && (
          <ThemedText style={[styles.phaseTitle, { color: ACCENT }]}>
            Watch the ball
          </ThemedText>
        )}
        {shuffling && (
          <Animated.View style={{ opacity: watchPulse }}>
            <ThemedText style={[styles.phaseTitle, { color: ACCENT }]}>Shuffling…</ThemedText>
          </Animated.View>
        )}
        {isGuessingPhase && canGuess && !shuffling && (
          <ThemedText style={[styles.phaseTitle, { color: ACCENT }]}>Pick a cup!</ThemedText>
        )}

        <View
          style={styles.cupsContainer}
          onLayout={(e) => setTrackLayoutW(e.nativeEvent.layout.width)}
        >
          {[0, 1, 2].map((cupId) => {
            const isCorrectCup = cupId === ballUnder;
            const isWrongGuess = cupId === guesserChoice && !won;
            const wrongOpacity = wrongRevealAnims[cupId].interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.35],
            });
            const correctScale = correctRevealAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            });

            const showWatchBall = showBallWatch && isCorrectCup;

            return (
              <AnimatedRN.View
                key={cupId}
                style={[styles.cupOuter, cupStyles[cupId]]}
              >
                <Pressable
                  onPress={() => handleCupPress(cupId)}
                  style={({ pressed }) => [
                    styles.cup,
                    pressed &&
                      ((amHost && state.game_phase === 'hiding') ||
                        ((!amHost || isLocal) && isGuessingPhase && canGuess)) &&
                      styles.cupPressed,
                  ]}
                  disabled={
                    !(
                      (amHost && state.game_phase === 'hiding') ||
                      ((!amHost || isLocal) &&
                        state.game_phase === 'guessing' &&
                        canGuess &&
                        !shuffling)
                    )
                  }
                >
                  <Animated.View
                    style={[
                      styles.cupInner,
                      isWrongGuess && showResult && { opacity: wrongOpacity },
                    ]}
                  >
                    <View style={[styles.cupBody, { backgroundColor: CUP_GOLD }]} />
                    <View style={[styles.cupTop, { backgroundColor: CUP_GOLD }]} />
                    {showWatchBall && <View style={styles.ball} />}
                    {showResult && isCorrectCup && (
                      <Animated.View
                        style={[
                          styles.ball,
                          won && { transform: [{ scale: celebrateScale }] },
                          !won && {
                            opacity: correctScale,
                            transform: [{ scale: correctScale }],
                          },
                        ]}
                      />
                    )}
                    {showResult && isWrongGuess && (
                      <Animated.View
                        style={[
                          styles.emptyIndicator,
                          {
                            opacity: wrongRevealAnims[cupId].interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 1],
                            }),
                          },
                        ]}
                      />
                    )}
                  </Animated.View>
                </Pressable>
              </AnimatedRN.View>
            );
          })}
        </View>

        {showResult && (
          <View style={styles.resultWrap}>
            <ThemedText
              style={[
                styles.resultText,
                state.winner === 'guesser' ? styles.resultWin : styles.resultLose,
                { color: state.winner === 'guesser' ? '#00ff88' : '#ff4444' },
              ]}
            >
              {state.winner === 'guesser' ? 'Correct! 🎉' : 'Wrong cup!'}
            </ThemedText>
            <ThemedText
              style={[styles.revealText, { color: 'rgba(255,255,255,0.9)' }]}
            >
              The ball was under cup {ballUnder + 1}
            </ThemedText>
          </View>
        )}

        <View style={styles.roomCodeWrap}>
          <ThemedText style={[styles.roomCode, { color: CUP_GOLD }]}>{roomCode}</ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { padding: 4 },
  scoreText: { fontSize: Typography.section },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  phaseHint: { fontSize: Typography.body, marginBottom: 8 },
  phaseTitle: {
    fontSize: Typography.section,
    fontWeight: '700',
    marginBottom: 16,
  },
  cupsContainer: {
    width: '100%',
    minHeight: CUP_BODY_HEIGHT + CUP_TOP_HEIGHT + 48,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cupOuter: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    alignItems: 'center',
  },
  cup: {
    width: CUP_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cupInner: {},
  cupPressed: { opacity: 0.85 },
  cupBody: {
    width: CUP_BODY_WIDTH,
    height: CUP_BODY_HEIGHT,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cupTop: {
    width: CUP_TOP_WIDTH,
    height: CUP_TOP_HEIGHT,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginTop: -4,
  },
  ball: {
    position: 'absolute',
    top: CUP_BODY_HEIGHT / 2 - BALL_SIZE / 2,
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: BALL_COLOR,
  },
  emptyIndicator: {
    position: 'absolute',
    top: CUP_BODY_HEIGHT / 2 - 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.4)',
    backgroundColor: 'transparent',
  },
  resultWrap: { alignItems: 'center', marginTop: 24 },
  resultText: { fontSize: Typography.title, fontWeight: '700' },
  resultWin: {},
  resultLose: {},
  revealText: { fontSize: Typography.body, marginTop: 8 },
  roomCodeWrap: { position: 'absolute', bottom: 24 },
  roomCode: { fontSize: Typography.section, fontWeight: '700', letterSpacing: 4 },
  errorText: {},
  linkText: { fontSize: Typography.body, fontWeight: '600' },
});
