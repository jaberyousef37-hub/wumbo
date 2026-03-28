/** XP thresholds: level N = 1 + floor(totalXp / XP_PER_LEVEL). */
export const XP_PER_LEVEL = 350;
export const XP_WIN = 55;
export const XP_LOSS = 15;
export const XP_DRAW = 15;
/** Extra XP when daily streak ≥ 2 days */
export const XP_STREAK_BONUS = 20;

export function levelFromTotalXp(totalXp: number): number {
  return 1 + Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL);
}

export function xpProgressInLevel(totalXp: number): { inLevel: number; forNext: number; level: number } {
  const level = levelFromTotalXp(totalXp);
  const inLevel = totalXp % XP_PER_LEVEL;
  return { inLevel, forNext: XP_PER_LEVEL, level };
}

export type RewardBreakdown = {
  coinsAdded: number;
  xpAdded: number;
  leveledUp: boolean;
  newLevel: number;
  streakDays: number;
  streakBonusApplied: boolean;
};
