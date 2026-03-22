import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wumbo_recent_games_v1';
const MAX = 5;

export type RecentGameRow = {
  id: string;
  gameName: string;
  result: 'win' | 'loss';
  score: string;
  date: string;
};

function formatDate(): string {
  return new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function recordRecentGame(entry: Omit<RecentGameRow, 'id' | 'date'> & { date?: string }): Promise<void> {
  const row: RecentGameRow = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: entry.date ?? formatDate(),
    gameName: entry.gameName,
    result: entry.result,
    score: entry.score,
  };
  const raw = await AsyncStorage.getItem(KEY);
  let list: RecentGameRow[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw) as RecentGameRow[];
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }
  }
  list.unshift(row);
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export async function loadRecentGames(): Promise<RecentGameRow[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as RecentGameRow[];
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
}
