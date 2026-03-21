import { generalKnowledgeQuestions } from './general';
import { geographyQuestions } from './geography';
import { historyQuestions } from './history';
import { moviesTvQuestions } from './movies-tv';
import { scienceTechnologyQuestions } from './science';
import { sportsQuestions } from './sports';
import type { BankQuestionDifficulty, BankTriviaQuestion, TriviaCategoryId } from './types';

export type { BankQuestionDifficulty, BankTriviaQuestion, TriviaCategoryId } from './types';

export const TRIVIA_CATEGORY_LABELS: Record<TriviaCategoryId, string> = {
  general_knowledge: 'General Knowledge',
  sports: 'Sports',
  movies_tv: 'Movies & TV',
  science_technology: 'Science & Technology',
  history: 'History',
  geography: 'Geography',
};

export const TRIVIA_QUESTIONS_BANK: BankTriviaQuestion[] = [
  ...generalKnowledgeQuestions,
  ...sportsQuestions,
  ...moviesTvQuestions,
  ...scienceTechnologyQuestions,
  ...historyQuestions,
  ...geographyQuestions,
];

export const TRIVIA_BANK_SIZE = TRIVIA_QUESTIONS_BANK.length;

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Picks up to `count` random questions for the selected game difficulty. */
export function pickQuizQuestions(
  difficulty: BankQuestionDifficulty,
  count: number,
): BankTriviaQuestion[] {
  const pool = TRIVIA_QUESTIONS_BANK.filter((q) => q.difficulty === difficulty);
  const shuffled = shuffleInPlace([...pool]);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
