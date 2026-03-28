import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  COIN_COMPLETE_GAME,
  COIN_DAILY_LOGIN,
  COIN_STREAK_BONUS,
  COIN_START,
  COIN_WIN_GAME,
  DEFAULT_EQUIPPED,
  DEFAULT_OWNED_IDS,
  type CosmeticKind,
  getCosmeticItem,
} from '@/lib/cosmetics/catalog';
import { updateAndGetDailyStreak } from '@/lib/daily-streak';
import {
  levelFromTotalXp,
  XP_DRAW,
  XP_LOSS,
  XP_STREAK_BONUS,
  XP_WIN,
  type RewardBreakdown,
} from '@/lib/game-rewards';

const KEY_COINS = 'wumbo_cosmetics_coins_v1';
const KEY_OWNED = 'wumbo_cosmetics_owned_v1';
const KEY_EQUIPPED = 'wumbo_cosmetics_equipped_v1';
const KEY_DAILY = 'wumbo_cosmetics_daily_v1';
const KEY_XP = 'wumbo_xp_total_v1';

type EquippedMap = Record<CosmeticKind, string>;

const EMPTY_BREAKDOWN: RewardBreakdown = {
  coinsAdded: 0,
  xpAdded: 0,
  leveledUp: false,
  newLevel: 1,
  streakDays: 0,
  streakBonusApplied: false,
};

type CosmeticsContextValue = {
  coins: number;
  xpTotal: number;
  level: number;
  hydrated: boolean;
  pendingLevelUp: number | null;
  dismissLevelUp: () => void;
  ownedIds: Set<string>;
  equipped: EquippedMap;
  isOwned: (id: string) => boolean;
  isEquipped: (id: string) => boolean;
  buyItem: (id: string) => boolean;
  equipItem: (id: string) => void;
  rewardGameEnd: (outcome: 'win' | 'loss' | 'draw') => Promise<RewardBreakdown>;
};

const CosmeticsContext = createContext<CosmeticsContextValue | null>(null);

function parseOwned(raw: string | null): Set<string> {
  if (!raw) return new Set(DEFAULT_OWNED_IDS);
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set(DEFAULT_OWNED_IDS);
    return new Set(arr.filter((x) => typeof x === 'string'));
  } catch {
    return new Set(DEFAULT_OWNED_IDS);
  }
}

function parseEquipped(raw: string | null): EquippedMap {
  if (!raw) return { ...DEFAULT_EQUIPPED };
  try {
    const o = JSON.parse(raw) as Partial<EquippedMap>;
    return {
      avatar: typeof o.avatar === 'string' ? o.avatar : DEFAULT_EQUIPPED.avatar,
      uno_skin: typeof o.uno_skin === 'string' ? o.uno_skin : DEFAULT_EQUIPPED.uno_skin,
      chess_theme: typeof o.chess_theme === 'string' ? o.chess_theme : DEFAULT_EQUIPPED.chess_theme,
      profile_frame: typeof o.profile_frame === 'string' ? o.profile_frame : DEFAULT_EQUIPPED.profile_frame,
      chat_color: typeof o.chat_color === 'string' ? o.chat_color : DEFAULT_EQUIPPED.chat_color,
    };
  } catch {
    return { ...DEFAULT_EQUIPPED };
  }
}

export function CosmeticsProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState(COIN_START);
  const [xpTotal, setXpTotal] = useState(0);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(() => new Set(DEFAULT_OWNED_IDS));
  const [equipped, setEquipped] = useState<EquippedMap>({ ...DEFAULT_EQUIPPED });
  const [hydrated, setHydrated] = useState(false);
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  const persistSkip = useRef(true);
  const xpRef = useRef(0);

  const level = useMemo(() => levelFromTotalXp(xpTotal), [xpTotal]);

  useEffect(() => {
    xpRef.current = xpTotal;
  }, [xpTotal]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [cRaw, oRaw, eRaw, dRaw, xRaw] = await Promise.all([
          AsyncStorage.getItem(KEY_COINS),
          AsyncStorage.getItem(KEY_OWNED),
          AsyncStorage.getItem(KEY_EQUIPPED),
          AsyncStorage.getItem(KEY_DAILY),
          AsyncStorage.getItem(KEY_XP),
        ]);
        if (cancelled) return;

        let loadedCoins = COIN_START;
        if (cRaw !== null) {
          const n = parseInt(cRaw, 10);
          if (!Number.isNaN(n)) loadedCoins = Math.max(0, n);
        }

        let loadedXp = 0;
        if (xRaw !== null) {
          const x = parseInt(xRaw, 10);
          if (!Number.isNaN(x)) loadedXp = Math.max(0, x);
        }
        setXpTotal(loadedXp);
        xpRef.current = loadedXp;

        const today = new Date().toDateString();
        if (dRaw !== today) {
          loadedCoins += COIN_DAILY_LOGIN;
          await AsyncStorage.setItem(KEY_DAILY, today);
        }
        setCoins(loadedCoins);
        await AsyncStorage.setItem(KEY_COINS, String(loadedCoins));

        let owned = parseOwned(oRaw);
        for (const id of DEFAULT_OWNED_IDS) owned.add(id);
        setOwnedIds(owned);

        setEquipped(parseEquipped(eRaw));
      } finally {
        if (!cancelled) {
          persistSkip.current = false;
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || persistSkip.current) return;
    void AsyncStorage.setItem(KEY_COINS, String(coins));
  }, [coins, hydrated]);

  useEffect(() => {
    if (!hydrated || persistSkip.current) return;
    void AsyncStorage.setItem(KEY_XP, String(xpTotal));
  }, [xpTotal, hydrated]);

  useEffect(() => {
    if (!hydrated || persistSkip.current) return;
    void AsyncStorage.setItem(KEY_OWNED, JSON.stringify([...ownedIds]));
  }, [ownedIds, hydrated]);

  useEffect(() => {
    if (!hydrated || persistSkip.current) return;
    void AsyncStorage.setItem(KEY_EQUIPPED, JSON.stringify(equipped));
  }, [equipped, hydrated]);

  const dismissLevelUp = useCallback(() => setPendingLevelUp(null), []);

  const isOwned = useCallback((id: string) => ownedIds.has(id), [ownedIds]);

  const isEquipped = useCallback((id: string) => {
    const item = getCosmeticItem(id);
    if (!item) return false;
    return equipped[item.kind] === id;
  }, [equipped]);

  const buyItem = useCallback((id: string) => {
    const item = getCosmeticItem(id);
    if (!item || ownedIds.has(id)) return false;
    if (coins < item.price) return false;
    setCoins((c) => c - item.price);
    setOwnedIds((prev) => new Set(prev).add(id));
    return true;
  }, [coins, ownedIds]);

  const equipItem = useCallback((id: string) => {
    const item = getCosmeticItem(id);
    if (!item || !ownedIds.has(id)) return;
    setEquipped((prev) => ({ ...prev, [item.kind]: id }));
  }, [ownedIds]);

  const rewardGameEnd = useCallback(async (outcome: 'win' | 'loss' | 'draw'): Promise<RewardBreakdown> => {
    if (!hydrated) {
      return { ...EMPTY_BREAKDOWN, newLevel: levelFromTotalXp(xpRef.current) };
    }

    const streakDays = await updateAndGetDailyStreak();
    const streakBonusApplied = streakDays >= 2;

    const coinsAdded =
      COIN_COMPLETE_GAME +
      (outcome === 'win' ? COIN_WIN_GAME : 0) +
      (streakBonusApplied ? COIN_STREAK_BONUS : 0);

    const xpBase = outcome === 'win' ? XP_WIN : outcome === 'draw' ? XP_DRAW : XP_LOSS;
    const xpAdded = xpBase + (streakBonusApplied ? XP_STREAK_BONUS : 0);

    const prevXp = xpRef.current;
    const nextXp = prevXp + xpAdded;
    const oldLevel = levelFromTotalXp(prevXp);
    const newLevel = levelFromTotalXp(nextXp);
    const leveledUp = newLevel > oldLevel;

    setCoins((c) => c + coinsAdded);
    setXpTotal(nextXp);

    if (leveledUp) setPendingLevelUp(newLevel);

    return {
      coinsAdded,
      xpAdded,
      leveledUp,
      newLevel,
      streakDays,
      streakBonusApplied,
    };
  }, [hydrated]);

  const value = useMemo(
    () => ({
      coins,
      xpTotal,
      level,
      hydrated,
      pendingLevelUp,
      dismissLevelUp,
      ownedIds,
      equipped,
      isOwned,
      isEquipped,
      buyItem,
      equipItem,
      rewardGameEnd,
    }),
    [
      coins,
      xpTotal,
      level,
      hydrated,
      pendingLevelUp,
      dismissLevelUp,
      ownedIds,
      equipped,
      isOwned,
      isEquipped,
      buyItem,
      equipItem,
      rewardGameEnd,
    ],
  );

  return <CosmeticsContext.Provider value={value}>{children}</CosmeticsContext.Provider>;
}

export function useCosmetics(): CosmeticsContextValue {
  const ctx = useContext(CosmeticsContext);
  if (!ctx) {
    throw new Error('useCosmetics must be used within CosmeticsProvider');
  }
  return ctx;
}

export function useCosmeticsOptional(): CosmeticsContextValue | null {
  return useContext(CosmeticsContext);
}

export type { CosmeticKind };
