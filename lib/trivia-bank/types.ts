export type TriviaCategoryId =
  | 'general_knowledge'
  | 'sports'
  | 'movies_tv'
  | 'science_technology'
  | 'history'
  | 'geography';

export type BankQuestionDifficulty = 'easy' | 'medium' | 'hard';

export type BankTriviaQuestion = {
  id: string;
  category: TriviaCategoryId;
  difficulty: BankQuestionDifficulty;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};
