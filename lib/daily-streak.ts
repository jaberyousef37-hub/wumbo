import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_LAST = 'wumbo_streak_last_day';
const KEY_COUNT = 'wumbo_streak_count';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Call when home (or app) opens. Returns current streak length (days in a row). */
export async function updateAndGetDailyStreak(): Promise<number> {
  const today = todayKey();
  const yest = yesterdayKey();
  const [last, rawCount] = await Promise.all([
    AsyncStorage.getItem(KEY_LAST),
    AsyncStorage.getItem(KEY_COUNT),
  ]);
  let count = rawCount ? parseInt(rawCount, 10) : 0;
  if (!Number.isFinite(count) || count < 0) count = 0;

  if (last === today) {
    return count;
  }
  if (last === yest) {
    count += 1;
  } else if (last != null && last !== '') {
    count = 1;
  } else {
    count = 1;
  }

  await AsyncStorage.multiSet([
    [KEY_LAST, today],
    [KEY_COUNT, String(count)],
  ]);
  return count;
}
