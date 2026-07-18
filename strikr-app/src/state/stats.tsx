// Player progression: solves, daily streak, first-try rate, XP/level.
// Backed by the signed-in user's Supabase profile row (login is mandatory,
// so there's no local-only/guest fallback to maintain). Updated from real
// game outcomes (main game + daily challenge both feed the streak/XP; only
// main-game wins count as "solves", matching the Home/Profil "SOLVES" stat
// which is scoped to the guess-the-player mechanic).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth';

// XP curve: each level needs LEVEL_STEP more XP than the last, cumulative.
const LEVEL_STEP = 500;

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
  kind: 'game' | 'daily';
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
  ready: boolean;
}

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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
        if (prev.lastPlayedDate !== today) {
          if (prev.lastPlayedDate === yesterdayStr()) currentStreak += 1;
          else currentStreak = 1;
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

  const firstTryPercent = stats.totalWins > 0 ? Math.round((stats.firstTryWins / stats.totalWins) * 100) : 0;
  const { level, progress, xpIntoLevel, xpForNext } = levelForXp(stats.xp);

  return (
    <StatsContext.Provider
      value={{
        stats,
        derived: { firstTryPercent, level, levelProgress: progress, xpIntoLevel, xpForNextLevel: xpForNext },
        recordWin,
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
