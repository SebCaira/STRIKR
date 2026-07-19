// Player progression: solves, daily streak, first-try rate, XP/level.
// Backed by the signed-in user's Supabase profile row (login is mandatory,
// so there's no local-only/guest fallback to maintain). Updated from real
// game outcomes (main game + daily challenge both feed the streak/XP; only
// main-game wins count as "solves", matching the Home/Profil "SOLVES" stat
// which is scoped to the guess-the-player mechanic).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';
import { useDiamonds } from './diamonds';

// XP curve: each level needs LEVEL_STEP more XP than the last, cumulative.
const LEVEL_STEP = 500;

// Diamond sink: protects the win streak from resetting the next time a full
// day gets missed. Stacks (buy several in advance); each covers exactly one
// missed day, not an arbitrarily long gap.
export const STREAK_FREEZE_COST = 80;

export interface StatsData {
  solves: number;
  firstTryWins: number;
  totalWins: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string | null;
  xp: number;
  xpTodayDate: string | null;
  xpToday: number;
  streakFreezes: number;
  // Daily mission tracking — all reset when missionsDate rolls to a new day.
  missionsDate: string | null;
  gameWinsToday: number;
  firstTryHardWinToday: boolean;
  fastestSolveMsToday: number | null;
}

const DEFAULT_STATS: StatsData = {
  solves: 0,
  firstTryWins: 0,
  totalWins: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDate: null,
  xp: 0,
  xpTodayDate: null,
  xpToday: 0,
  streakFreezes: 0,
  missionsDate: null,
  gameWinsToday: 0,
  firstTryHardWinToday: false,
  fastestSolveMsToday: null,
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime();
  return Math.round(ms / 86400000);
}

function levelForXp(xp: number): { level: number; progress: number; xpIntoLevel: number; xpForNext: number } {
  let level = 1;
  let remaining = xp;
  let needed = LEVEL_STEP;
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = level * LEVEL_STEP;
  }
  return { level, progress: remaining / needed, xpIntoLevel: remaining, xpForNext: needed };
}

interface RecordWinOptions {
  kind: 'game' | 'daily' | 'duel_solo';
  firstTry: boolean;
  xp: number;
  level?: 'easy' | 'medium' | 'hard';
  elapsedMs?: number;
}

interface StatsContextValue {
  stats: StatsData;
  derived: {
    firstTryPercent: number;
    level: number;
    levelProgress: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
  };
  recordWin: (opts: RecordWinOptions) => void;
  buyStreakFreeze: () => { error: string | null };
  ready: boolean;
}

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { diamonds, addDiamonds } = useDiamonds();
  const [stats, setStats] = useState<StatsData>(DEFAULT_STATS);
  const [ready, setReady] = useState(false);
  const loadedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setReady(false);
      loadedForUser.current = null;
      return;
    }
    if (loadedForUser.current === user.id) return;
    supabase
      .from('profiles')
      .select('stats')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setStats({ ...DEFAULT_STATS, ...(data?.stats as Partial<StatsData> | undefined) });
        loadedForUser.current = user.id;
        setReady(true);
      });
  }, [user]);

  const recordWin = useCallback(
    ({ kind, firstTry, xp, level, elapsedMs }: RecordWinOptions) => {
      setStats((prev) => {
        const today = todayStr();
        let currentStreak = prev.currentStreak;
        let bestStreak = prev.bestStreak;
        let streakFreezes = prev.streakFreezes;
        if (prev.lastPlayedDate !== today) {
          if (prev.lastPlayedDate === yesterdayStr()) {
            currentStreak += 1;
          } else if (prev.lastPlayedDate && streakFreezes > 0 && daysBetween(prev.lastPlayedDate, today) === 2) {
            // Missed exactly one day, but a freeze covers it — streak survives.
            currentStreak += 1;
            streakFreezes -= 1;
          } else {
            currentStreak = 1;
          }
          bestStreak = Math.max(bestStreak, currentStreak);
        }
        const xpToday = prev.xpTodayDate === today ? prev.xpToday + xp : xp;

        // Daily mission counters reset whenever the calendar day changes.
        const sameMissionDay = prev.missionsDate === today;
        const gameWinsToday = kind === 'game' ? (sameMissionDay ? prev.gameWinsToday + 1 : 1) : sameMissionDay ? prev.gameWinsToday : 0;
        const priorFirstTryHard = sameMissionDay ? prev.firstTryHardWinToday : false;
        const firstTryHardWinToday = priorFirstTryHard || (kind === 'game' && level === 'hard' && firstTry);
        const priorFastest = sameMissionDay ? prev.fastestSolveMsToday : null;
        const fastestSolveMsToday =
          kind === 'game' && elapsedMs !== undefined
            ? priorFastest === null
              ? elapsedMs
              : Math.min(priorFastest, elapsedMs)
            : priorFastest;

        const next: StatsData = {
          solves: kind === 'game' ? prev.solves + 1 : prev.solves,
          firstTryWins: firstTry ? prev.firstTryWins + 1 : prev.firstTryWins,
          totalWins: prev.totalWins + 1,
          currentStreak,
          bestStreak,
          lastPlayedDate: today,
          xp: prev.xp + xp,
          xpTodayDate: today,
          xpToday,
          streakFreezes,
          missionsDate: today,
          gameWinsToday,
          firstTryHardWinToday,
          fastestSolveMsToday,
        };
        if (user) {
          supabase.from('profiles').update({ stats: next }).eq('id', user.id).then(() => {});
        }
        return next;
      });
    },
    [user]
  );

  const buyStreakFreeze = useCallback((): { error: string | null } => {
    if (diamonds < STREAK_FREEZE_COST) return { error: 'not_enough_diamonds' };
    addDiamonds(-STREAK_FREEZE_COST);
    setStats((prev) => {
      const next = { ...prev, streakFreezes: prev.streakFreezes + 1 };
      if (user) {
        supabase.from('profiles').update({ stats: next }).eq('id', user.id).then(() => {});
      }
      return next;
    });
    return { error: null };
  }, [diamonds, addDiamonds, user]);

  const firstTryPercent = stats.totalWins > 0 ? Math.round((stats.firstTryWins / stats.totalWins) * 100) : 0;
  const { level, progress, xpIntoLevel, xpForNext } = levelForXp(stats.xp);

  return (
    <StatsContext.Provider
      value={{
        stats,
        derived: { firstTryPercent, level, levelProgress: progress, xpIntoLevel, xpForNextLevel: xpForNext },
        recordWin,
        buyStreakFreeze,
        ready,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be used within StatsProvider');
  return ctx;
}
