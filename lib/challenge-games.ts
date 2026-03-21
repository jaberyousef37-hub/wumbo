/** Games you can pick when challenging someone from chat (multiplayer-first). */
export const CHALLENGE_GAME_PICKS = [
  { id: 'chess', name: 'Chess', emoji: '♟️' },
  { id: 'uno', name: 'UNO', emoji: '🃏' },
  { id: 'trivia', name: 'Trivia', emoji: '❓' },
  { id: 'tictactoe', name: 'Tic Tac Toe', emoji: '⭕' },
] as const;

export type ChallengeGameId = (typeof CHALLENGE_GAME_PICKS)[number]['id'];
