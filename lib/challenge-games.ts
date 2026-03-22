/** Games you can pick when challenging someone from chat (multiplayer-first). */

export const CHALLENGE_GAME_PICKS = [
  {
    id: 'bs',
    name: 'BS',
    emoji: '🎰',
    gradient: ['#DC2626', '#7F1D1D'] as const,
  },
  {
    id: 'uno',
    name: 'UNO',
    emoji: '🃏',
    gradient: ['#EAB308', '#A16207'] as const,
  },
  {
    id: 'chess',
    name: 'Chess',
    emoji: '♟️',
    gradient: ['#4B5563', '#1F2937'] as const,
  },
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    emoji: '⭕',
    gradient: ['#2563EB', '#1E3A8A'] as const,
  },
  {
    id: 'trivia',
    name: 'Trivia',
    emoji: '❓',
    gradient: ['#9333EA', '#581C87'] as const,
  },
  {
    id: 'shell',
    name: 'Shell Game',
    emoji: '🥤',
    gradient: ['#0EA5E9', '#0C4A6E'] as const,
  },
  {
    id: 'snake',
    name: 'Snake',
    emoji: '🐍',
    gradient: ['#22C55E', '#14532D'] as const,
  },
] as const;

export type ChallengeGameId = (typeof CHALLENGE_GAME_PICKS)[number]['id'];

export function gameGradientForId(gameId: string): readonly [string, string] {
  const row = CHALLENGE_GAME_PICKS.find((g) => g.id === gameId);
  return row?.gradient ?? (['#7C3AED', '#4C1D95'] as const);
}

export function gameEmojiForId(gameId: string): string {
  const row = CHALLENGE_GAME_PICKS.find((g) => g.id === gameId);
  return row?.emoji ?? '🎮';
}

export function gameNameForId(gameId: string): string {
  const row = CHALLENGE_GAME_PICKS.find((g) => g.id === gameId);
  return row?.name ?? gameId;
}
