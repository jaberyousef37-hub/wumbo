/**
 * Room utilities — code generation, player names, fallback.
 */

export function generateRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function generateGuestName(): string {
  return `Guest${Math.floor(100 + Math.random() * 900)}`;
}

export const GAME_NAMES: Record<string, string> = {
  tictactoe: 'Tic Tac Toe',
  chess: 'Chess',
  uno: 'UNO',
  trivia: 'Trivia',
  shell_game: 'Shell Game',
};
