import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HowToPlayButton } from '@/components/how-to-play-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { AppColors, Colors } from '@/constants/theme';
import {
  pickQuizQuestions,
  TRIVIA_CATEGORY_LABELS,
  type BankTriviaQuestion,
} from '@/lib/trivia-bank';
import { recordRecentGame } from '@/lib/recent-games';

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  categoryLabel: string;
};

const QUESTIONS_PER_ROUND = 15;

function bankToScreenQuestion(q: BankTriviaQuestion): Question {
  return {
    id: q.id,
    question: q.question,
    options: [...q.options],
    correctIndex: q.correctIndex,
    categoryLabel: TRIVIA_CATEGORY_LABELS[q.category],
  };
}

type TriviaDifficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<
  TriviaDifficulty,
  { seconds: number; label: string; badgeBg: string; badgeText: string }
> = {
  easy: {
    seconds: 15,
    label: 'Easy',
    badgeBg: '#22C55E',
    badgeText: '#fff',
  },
  medium: {
    seconds: 10,
    label: 'Medium',
    badgeBg: AppColors.yellow,
    badgeText: '#0d0d0d',
  },
  hard: {
    seconds: 7,
    label: 'Hard',
    badgeBg: '#EF4444',
    badgeText: '#fff',
  },
};

const BASE_POINTS = 10;

export default function TriviaScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const [difficulty, setDifficulty] = useState<TriviaDifficulty | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [streak, setStreak] = useState(0);
  const [roundQuestions, setRoundQuestions] = useState<Question[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triviaRecordedRef = useRef(false);

  const questions = roundQuestions;
  const timerSeconds = difficulty ? DIFFICULTY_CONFIG[difficulty].seconds : 15;
  const question = questions[currentIndex];

  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  useEffect(() => {
    if (!gameOver || difficulty === null) {
      triviaRecordedRef.current = false;
      return;
    }
    if (triviaRecordedRef.current) return;
    triviaRecordedRef.current = true;
    const maxPossible = questions.length * BASE_POINTS * 2;
    const pct =
      maxPossible > 0 ? Math.min(100, Math.round((score / maxPossible) * 100)) : 0;
    void recordRecentGame({
      gameName: 'Trivia',
      result: pct >= 50 ? 'win' : 'loss',
      score: `${score} pts (${pct}%)`,
    });
  }, [gameOver, difficulty, score, questions.length]);

  const finishQuestionTransition = useCallback(() => {
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(timerSeconds);
    setCurrentIndex((i) => {
      const len = questionsRef.current.length;
      if (i >= len - 1) {
        setGameOver(true);
        return i;
      }
      return i + 1;
    });
  }, [timerSeconds]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(timerSeconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timerSeconds]);

  useEffect(() => {
    if (gameOver || difficulty === null) return;
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, gameOver, resetTimer, difficulty]);

  useEffect(() => {
    if (gameOver || difficulty === null || timeLeft !== 0 || showResult) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setShowResult(true);
    setSelectedAnswer(-1);
    setStreak(0);
    const t = setTimeout(finishQuestionTransition, 1500);
    return () => clearTimeout(t);
  }, [timeLeft, showResult, gameOver, finishQuestionTransition, difficulty]);

  const handleAnswer = useCallback(
    (index: number) => {
      if (showResult || gameOver || difficulty === null) return;
      if (timerRef.current) clearInterval(timerRef.current);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedAnswer(index);
      setShowResult(true);
      if (index === question.correctIndex) {
        setStreak((prev) => {
          const ns = prev + 1;
          const pts = ns >= 3 ? BASE_POINTS * 2 : BASE_POINTS;
          setScore((s) => s + pts);
          return ns;
        });
      } else {
        setStreak(0);
      }
      setTimeout(finishQuestionTransition, 1500);
    },
    [showResult, gameOver, question, finishQuestionTransition, difficulty]
  );

  const startQuiz = useCallback((d: TriviaDifficulty) => {
    const picked = pickQuizQuestions(d, QUESTIONS_PER_ROUND).map(bankToScreenQuestion);
    setRoundQuestions(picked);
    setDifficulty(d);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setTimeLeft(DIFFICULTY_CONFIG[d].seconds);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameOver(false);
  }, []);

  const handlePlayAgain = useCallback(() => {
    if (difficulty) {
      startQuiz(difficulty);
    } else {
      setCurrentIndex(0);
      setScore(0);
      setStreak(0);
      setTimeLeft(15);
      setSelectedAnswer(null);
      setShowResult(false);
      setGameOver(false);
      setRoundQuestions([]);
    }
  }, [difficulty, startQuiz]);

  const handlePickNewDifficulty = useCallback(() => {
    setDifficulty(null);
    setRoundQuestions([]);
    setGameOver(false);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setSelectedAnswer(null);
    setShowResult(false);
  }, []);

  if (difficulty === null) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.container}>
          <LinearGradient
            colors={[palette.tint, palette.accentPink, palette.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <ThemedText type="defaultSemiBold" style={styles.title} darkColor="#fff">
              Trivia
            </ThemedText>
            <HowToPlayButton gameId="trivia" tint="#fff" />
          </LinearGradient>
          <ThemedText type="title" style={[styles.pickTitle, { color: palette.text }]}>
            Choose difficulty
          </ThemedText>
          <ThemedText style={[styles.pickSub, { color: palette.icon }]}>
            Timers get tighter and questions tougher. Streak: 3 correct in a row = 2× points ({BASE_POINTS} →{' '}
            {BASE_POINTS * 2}).
          </ThemedText>
          {(['easy', 'medium', 'hard'] as const).map((d) => {
            const cfg = DIFFICULTY_CONFIG[d];
            return (
              <Pressable
                key={d}
                onPress={() => startQuiz(d)}
                style={({ pressed }) => [
                  styles.diffRow,
                  { backgroundColor: palette.card, borderColor: palette.cardBorder },
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
                  <Text style={[styles.badgeLabel, { color: cfg.badgeText }]}>{cfg.label}</Text>
                </View>
                <View style={styles.diffMeta}>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.text }}>
                    {cfg.seconds}s per question
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: palette.icon }}>
                    {d === 'easy' ? 'Simple facts' : d === 'medium' ? 'Mixed topics' : 'Harder questions'}
                  </ThemedText>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={palette.icon} />
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    );
  }

  if (gameOver && difficulty !== null) {
    const maxPossible = questions.length * BASE_POINTS * 2;
    const displayPct = Math.min(100, Math.round((score / maxPossible) * 100));
    const cfg = DIFFICULTY_CONFIG[difficulty];

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.container}>
          <LinearGradient
            colors={[palette.tint, palette.accentPink, palette.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <ThemedText type="defaultSemiBold" style={styles.title} darkColor="#fff">
              Trivia
            </ThemedText>
            <HowToPlayButton gameId="trivia" tint="#fff" />
          </LinearGradient>
          <View style={styles.finalScore}>
            <View style={[styles.badge, styles.badgeLarge, { backgroundColor: cfg.badgeBg }]}>
              <Text style={[styles.badgeLabel, { color: cfg.badgeText }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.finalEmoji}>{displayPct >= 70 ? '🎉' : displayPct >= 50 ? '👍' : '💪'}</Text>
            <ThemedText style={styles.finalTitle}>Quiz Complete!</ThemedText>
            <ThemedText style={styles.finalScoreText}>
              {score} pts · {questions.length} questions
            </ThemedText>
            <ThemedText style={styles.finalPercent}>{displayPct}% of max (with streak bonus)</ThemedText>
            <Pressable onPress={handlePlayAgain} style={styles.playAgainBtn}>
              <LinearGradient
                colors={[palette.accentPink, palette.accentYellow]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.playAgainGradient}
              >
                <Text style={styles.playAgainText}>Play Again</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={handlePickNewDifficulty} style={styles.changeDiffBtn}>
              <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Change difficulty</ThemedText>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.backToGames}>
              <ThemedText style={[styles.backToGamesText, { color: palette.tint }]}>Back to Play</ThemedText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const cfg = DIFFICULTY_CONFIG[difficulty];
  if (!question) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.container}>
          <ThemedText style={{ color: palette.text }}>Loading questions…</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient
          colors={[palette.tint, palette.accentPink, palette.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.title} darkColor="#fff">
            Trivia
          </ThemedText>
          <View style={styles.headerRight}>
            <HowToPlayButton gameId="trivia" tint="#fff" />
            <View style={[styles.badge, styles.badgeSmall, { backgroundColor: cfg.badgeBg }]}>
              <Text style={[styles.badgeLabelSmall, { color: cfg.badgeText }]}>{cfg.label}</Text>
            </View>
            <View style={styles.scoreBadge}>
              <ThemedText style={styles.scoreText} darkColor="#fff">
                {score} pts
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        {streak >= 2 && (
          <ThemedText style={[styles.streakBanner, { color: palette.accentPink }]}>
            🔥 Streak {streak}! {streak >= 3 ? '2× points on!' : 'One more for 2× points'}
          </ThemedText>
        )}

        <View style={[styles.timerWrap, { backgroundColor: palette.card }]}>
          <View
            style={[
              styles.timerBar,
              {
                width: `${(timeLeft / timerSeconds) * 100}%`,
                backgroundColor: timeLeft <= 3 ? '#EF4444' : palette.accentYellow,
              },
            ]}
          />
        </View>
        <ThemedText style={styles.timerText}>
          {timeLeft}s · +{BASE_POINTS} pts{streak >= 2 ? ' (next correct may be 2×!)' : ''}
        </ThemedText>

        <View style={styles.questionWrap}>
          <ThemedText style={styles.questionNum}>
            Question {currentIndex + 1} of {questions.length}
          </ThemedText>
          <ThemedText type="caption" style={[styles.categoryPill, { color: palette.tint }]}>
            {question.categoryLabel}
          </ThemedText>
          <ThemedText style={styles.question}>{question.question}</ThemedText>
        </View>

        <View style={styles.options}>
          {question.options.map((opt, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === question.correctIndex;
            const showCorrect = showResult && isCorrect;
            const showWrong = showResult && isSelected && !isCorrect;
            return (
              <Pressable
                key={index}
                onPress={() => handleAnswer(index)}
                disabled={showResult}
                style={[
                  styles.option,
                  { backgroundColor: palette.card, borderColor: palette.cardBorder },
                  showCorrect && styles.optionCorrect,
                  showWrong && styles.optionWrong,
                ]}
              >
                <ThemedText style={styles.optionText}>{opt}</ThemedText>
                {showCorrect && <MaterialIcons name="check-circle" size={24} color="#68D391" />}
                {showWrong && <MaterialIcons name="cancel" size={24} color="#FC8181" />}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { marginRight: 4 },
  title: { fontSize: 22, flex: 1 },
  pickTitle: { marginBottom: 8 },
  pickSub: { marginBottom: 20, lineHeight: 20 },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  diffMeta: { flex: 1 },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  badgeSmall: { paddingVertical: 4, paddingHorizontal: 8 },
  badgeLarge: { marginBottom: 12 },
  badgeLabel: { fontWeight: '800', fontSize: 14 },
  badgeLabelSmall: { fontWeight: '800', fontSize: 11 },
  scoreBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  scoreText: { fontSize: 14, fontWeight: '700' },
  streakBanner: { textAlign: 'center', fontWeight: '700', marginBottom: 8, fontSize: 15 },
  timerWrap: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  timerBar: {
    height: '100%',
    borderRadius: 3,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  questionWrap: { marginBottom: 28 },
  questionNum: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  categoryPill: {
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 12,
  },
  question: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  options: { gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  optionCorrect: {
    borderColor: '#68D391',
    backgroundColor: 'rgba(104, 211, 145, 0.2)',
  },
  optionWrong: {
    borderColor: '#FC8181',
    backgroundColor: 'rgba(252, 129, 129, 0.2)',
  },
  optionText: { fontSize: 16, flex: 1 },
  finalScore: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalEmoji: { fontSize: 64, marginBottom: 16 },
  finalTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  finalScoreText: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  finalPercent: { fontSize: 18, opacity: 0.9, marginBottom: 32 },
  playAgainBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  changeDiffBtn: { paddingVertical: 12, marginBottom: 8 },
  playAgainGradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  playAgainText: { fontSize: 18, fontWeight: '800', color: AppColors.background },
  backToGames: { paddingVertical: 12 },
  backToGamesText: { fontSize: 16 },
});
