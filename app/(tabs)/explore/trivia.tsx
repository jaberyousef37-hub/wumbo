import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
};

const QUESTIONS: Question[] = [
  { id: '1', question: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], correctIndex: 2 },
  { id: '2', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctIndex: 1 },
  { id: '3', question: 'How many continents are there?', options: ['5', '6', '7', '8'], correctIndex: 2 },
  { id: '4', question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctIndex: 3 },
  { id: '5', question: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Leonardo da Vinci', 'Rembrandt'], correctIndex: 2 },
  { id: '6', question: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correctIndex: 2 },
  { id: '7', question: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctIndex: 2 },
  { id: '8', question: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], correctIndex: 2 },
  { id: '9', question: 'Which country is home to the kangaroo?', options: ['South Africa', 'Brazil', 'Australia', 'India'], correctIndex: 2 },
  { id: '10', question: 'What is the speed of light in km/s (approximately)?', options: ['150,000', '200,000', '300,000', '400,000'], correctIndex: 2 },
];

const TIMER_SECONDS = 15;

export default function TriviaScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const question = QUESTIONS[currentIndex];
  const isLastQuestion = currentIndex === QUESTIONS.length - 1;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (gameOver) return;
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, gameOver, resetTimer]);

  useEffect(() => {
    if (timeLeft === 0 && !showResult) {
      if (timerRef.current) clearInterval(timerRef.current);
      setShowResult(true);
      setSelectedAnswer(-1);
      const t = setTimeout(() => {
        setSelectedAnswer(null);
        setShowResult(false);
        if (currentIndex >= QUESTIONS.length - 1) {
          setGameOver(true);
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [timeLeft, showResult, currentIndex]);

  const handleAnswer = useCallback(
    (index: number) => {
      if (showResult) return;
      if (timerRef.current) clearInterval(timerRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedAnswer(index);
      setShowResult(true);
      if (index === question.correctIndex) {
        setScore((s) => s + 1);
      }
      setTimeout(() => nextQuestion(), 1500);
    },
    [showResult, question?.correctIndex]
  );

  const nextQuestion = useCallback(() => {
    setSelectedAnswer(null);
    setShowResult(false);
    if (isLastQuestion) {
      setGameOver(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [isLastQuestion]);

  const handlePlayAgain = useCallback(() => {
    setCurrentIndex(0);
    setScore(0);
    setTimeLeft(TIMER_SECONDS);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameOver(false);
  }, []);

  if (gameOver) {
    const percentage = Math.round((score / QUESTIONS.length) * 100);
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.container}>
          <LinearGradient
            colors={[Colors.dark.tint, Colors.dark.accentPink, Colors.dark.card]}
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
          </LinearGradient>
          <View style={styles.finalScore}>
            <Text style={styles.finalEmoji}>{percentage >= 70 ? '🎉' : percentage >= 50 ? '👍' : '💪'}</Text>
            <ThemedText style={styles.finalTitle}>Quiz Complete!</ThemedText>
            <ThemedText style={styles.finalScoreText}>
              {score} / {QUESTIONS.length}
            </ThemedText>
            <ThemedText style={styles.finalPercent}>{percentage}%</ThemedText>
            <Pressable onPress={handlePlayAgain} style={styles.playAgainBtn}>
              <LinearGradient
                colors={[Colors.dark.accentPink, Colors.dark.accentYellow]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.playAgainGradient}
              >
                <Text style={styles.playAgainText}>Play Again</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.backToGames}>
              <ThemedText style={styles.backToGamesText}>Back to Games</ThemedText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.dark.tint, Colors.dark.accentPink, Colors.dark.card]}
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
          <View style={styles.scoreBadge}>
            <ThemedText style={styles.scoreText} darkColor="#fff">
              {score}/{QUESTIONS.length}
            </ThemedText>
          </View>
        </LinearGradient>

        <View style={styles.timerWrap}>
          <View style={[styles.timerBar, { width: `${(timeLeft / TIMER_SECONDS) * 100}%` }]} />
        </View>
        <ThemedText style={styles.timerText}>{timeLeft}s</ThemedText>

        <View style={styles.questionWrap}>
          <ThemedText style={styles.questionNum}>
            Question {currentIndex + 1} of {QUESTIONS.length}
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
  safe: { flex: 1, backgroundColor: Colors.dark.background },
  container: { flex: 1, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backBtn: { marginRight: 12 },
  title: { fontSize: 22, flex: 1 },
  scoreBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  scoreText: { fontSize: 14, fontWeight: '700' },
  timerWrap: {
    height: 6,
    backgroundColor: Colors.dark.card,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  timerBar: {
    height: '100%',
    backgroundColor: Colors.dark.accentYellow,
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
    backgroundColor: Colors.dark.card,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
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
  playAgainBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  playAgainGradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  playAgainText: { fontSize: 18, fontWeight: '800', color: '#1a0a2e' },
  backToGames: { paddingVertical: 12 },
  backToGamesText: { fontSize: 16, color: Colors.dark.tint },
});
