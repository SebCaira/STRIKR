// Player progression: solves, daily streak, first-try rate, XP/level.
// Backed by the signed-in user's Supabase profile row (login is mandatory,
// so there's no local-only/guest fallback to maintain). Updated from real
// game outcomes (main game + daily challenge both feed the streak/XP; only
// main-game wins count as "solves", matching the Home/Profil "SOLVES" stat
// which is scoped to the guess-the-player mechanic).
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logEvent } from '../lib/analytics';
import { maybeRequestReview } from '../lib/reviewPrompt';
import { useAuth } from './auth';
import { useDiamonds } from './diamonds';

// XP curve: each level needs LEVEL_STEP more XP than the last, cumulative.
const LEVEL_STEP = 500;

// One-off diamond bonus the moment you cross into a new level — until this,
// leveling up didn't actually unlock or grant anything (see avatarFrames.ts
// for the other half: some frames now unlock by level too).
export function levelUpBonus(level: number): number {
  return 25 + level * 5;
}

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
  // Daily login reward — deliberately separate from currentStreak/
  // lastPlayedDate above: those only move on an actual game win, this moves
  // just from opening the app and claiming, so the two streaks can (and
  // will) diverge. No Streak Freeze protection here — missing a day always
  // resets to day 1, unlike the win streak.
  dailyRewardStreak: number;
  dailyRewardClaimedDate: string | null;
  // Free-hint credits (from daily reward bonuses/milestones) — spent before
  // diamonds the next time a hint is bought, see useGameEngine's buyHint.
  freeHints: number;
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
  dailyRewardStreak: 0,
  dailyRewardClaimedDate: null,
  freeHints: 0,
};

// Diamonds for the Nth consecutive daily-reward day (before any milestone
// top-up) — climbs by 1/day then caps at 15, matching the table shown to
// the player: 5,6,7,8,9,10,11,12,13, then 15 from day 10 onward. Exported
// so the Home card can preview tomorrow's amount with the same formula.
export function dailyRewardDiamonds(day: number): number {
  return day >= 10 ? 15 : 4 + day;
}

export interface DailyRewardMilestone {
  day: 10 | 30 | 50 | 100;
  diamonds: number;
  freeHints: number;
  xp: number;
  frameId: string | null;
  streakFreeze: number;
}

const DAILY_REWARD_MILESTONES: DailyRewardMilestone[] = [
  { day: 10, diamonds: 50, freeHints: 1, xp: 0, frameId: null, streakFreeze: 0 },
  { day: 30, diamonds: 100, freeHints: 2, xp: 50, frameId: null, streakFreeze: 0 },
  { day: 50, diamonds: 150, freeHints: 3, xp: 0, frameId: 'loyal', streakFreeze: 0 },
  { day: 100, diamonds: 300, freeHints: 5, xp: 0, frameId: 'legend', streakFreeze: 1 },
];

export interface DailyRewardResult {
  streakDay: number;
  diamonds: number;
  xp: number;
  freeHints: number;
  bonusRoll: 'hint' | 'xp' | null;
  milestone: DailyRewardMilestone | null;
}

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
  kind: 'game' | 'daily' | 'duel_solo' | 'club_guess' | 'duel';
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
  // XP-only top-up (e.g. "watch an ad to double your win") — deliberately
  // does NOT touch solves/totalWins/streak/daily-mission counters, unlike
  // recordWin, so it can't be mistaken for a second win being recorded.
  addBonusXp: (xp: number) => void;
  buyStreakFreeze: () => { error: string | null };
  // Daily login reward — see claimDailyReward below for the day-1..N+
  // amounts and day 10/30/50/100 milestones.
  canClaimDailyReward: boolean;
  nextDailyRewardDay: number;
  claimDailyReward: () => DailyRewardResult | null;
  spendFreeHint: () => void;
  // Set the moment a recordWin() crosses into a new level; a mounted
  // <LevelUpModal /> shows the celebration and calls clearLevelUpEvent()
  // once dismissed. Diamonds are credited independently of that UI (see the
  // effect below), so the bonus lands even if no modal happens to be
  // mounted when it fires.
  levelUpEvent: number | null;
  clearLevelUpEvent: () => void;
  ready: boolean;
}

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { diamonds, addDiamonds } = useDiamonds();
  const [stats, setStats] = useState<StatsData>(DEFAULT_STATS);
  const [ready, setReady] = useState(false);
  const [levelUpEvent, setLevelUpEvent] = useState<number | null>(null);
  const loadedForUser = useRef<string | null>(null);
  // True only once a real fetch of the player's row has succeeded — every
  // Supabase write below is gated on this so a slow/failed load can never
  // persist DEFAULT_STATS over real progress (see the retry loop below for
  // why a load can be slow: right after an OTA update, the first launch on
  // the new bundle does extra cold-start work — bundle verification, a
  // fresh Metro/Hermes warmup, re-establishing the Supabase session — on
  // top of the network round trip, so a short one-shot timeout used to
  // lose that race often enough to look like "the daily streak resets to
  // day 1 every time there's an update": defaults would load, the UI would
  // show day 1, and the moment the player did anything, that got written
  // back to Supabase, permanently overwriting their real streak).
  const loadedFromServer = useRef(false);

  useEffect(() => {
    if (!user) {
      setReady(false);
      loadedForUser.current = null;
      loadedFromServer.current = false;
      return;
    }
    if (loadedForUser.current === user.id) return;
    let cancelled = false;
    let attempt = 0;
    const MAX_ATTEMPTS = 5;

    const tryLoad = () => {
      attempt += 1;
      supabase
        .from('profiles')
        .select('stats')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (cancelled) return;
          // A request can resolve without throwing (so .catch() below never
          // fires) yet still carry an `error` — e.g. the Supabase session
          // isn't fully re-established yet right after an OTA cold start.
          // Treat that exactly like a network failure (retry) instead of
          // silently accepting `data: undefined` as "loaded successfully".
          if (error) throw error;
          setStats({ ...DEFAULT_STATS, ...(data?.stats as Partial<StatsData> | undefined) });
          loadedFromServer.current = true;
          loadedForUser.current = user.id;
          setReady(true);
        })
        .catch(() => {
          if (cancelled) return;
          if (attempt < MAX_ATTEMPTS) {
            setTimeout(tryLoad, 3000);
            return;
          }
          // Genuinely can't reach the server after several tries — let the
          // player use the app with local defaults for this session, but
          // never persist them: loadedFromServer stays false, so every
          // write below silently skips its Supabase .update() rather than
          // clobbering the real row the next time this loads successfully.
          setStats(DEFAULT_STATS);
          loadedForUser.current = user.id;
          setReady(true);
        });
    };
    tryLoad();
    return () => {
      cancelled = true;
    };
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
        const prevLevel = levelForXp(prev.xp).level;
        const nextLevel = levelForXp(next.xp).level;
        if (nextLevel > prevLevel) setLevelUpEvent(nextLevel);
        if (user && loadedFromServer.current) {
          supabase.from('profiles').update({ stats: next }).eq('id', user.id).then(() => {});
        }
        return next;
      });
      // Single choke point every game mode already calls on a win (main
      // game, daily, duel, club guess, grille, group games...) — the
      // cheapest way to get real engagement data (which modes people
      // actually finish, by day) without instrumenting each mode
      // separately.
      logEvent(user?.id, 'game_win', { kind, firstTry, level });
    },
    [user]
  );

  // Credits the level-up bonus whenever levelUpEvent changes to a non-null
  // value — driven by committed state, not by a flag read right after
  // setStats() (the exact bug fixed elsewhere this session: that flag isn't
  // guaranteed to be set yet at that point).
  useEffect(() => {
    if (levelUpEvent === null) return;
    addDiamonds(levelUpBonus(levelUpEvent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelUpEvent]);

  // Ask for an App Store/Play Store rating right as the streak crosses one
  // of these — a player is clearly enjoying the app by then, not just
  // trying it out. Reacts to the committed streak value (like the level-up
  // effect above) rather than reading it right after setStats(), since
  // React doesn't guarantee that's applied yet at that point. The ref
  // tracks the previous value so this only fires on the exact day the
  // streak crosses the threshold, not on every render once past it.
  const prevStreakForReview = useRef(stats.currentStreak);
  useEffect(() => {
    const prev = prevStreakForReview.current;
    prevStreakForReview.current = stats.currentStreak;
    if (stats.currentStreak > prev && (stats.currentStreak === 3 || stats.currentStreak === 10)) {
      maybeRequestReview();
    }
  }, [stats.currentStreak]);

  const addBonusXp = useCallback(
    (xp: number) => {
      setStats((prev) => {
        const today = todayStr();
        const xpToday = prev.xpTodayDate === today ? prev.xpToday + xp : xp;
        const next: StatsData = { ...prev, xp: prev.xp + xp, xpTodayDate: today, xpToday };
        const prevLevel = levelForXp(prev.xp).level;
        const nextLevel = levelForXp(next.xp).level;
        if (nextLevel > prevLevel) setLevelUpEvent(nextLevel);
        if (user && loadedFromServer.current) {
          supabase.from('profiles').update({ stats: next }).eq('id', user.id).then(() => {});
        }
        return next;
      });
    },
    [user]
  );

  const clearLevelUpEvent = useCallback(() => setLevelUpEvent(null), []);

  const buyStreakFreeze = useCallback((): { error: string | null } => {
    if (diamonds < STREAK_FREEZE_COST) return { error: 'not_enough_diamonds' };
    addDiamonds(-STREAK_FREEZE_COST);
    setStats((prev) => {
      const next = { ...prev, streakFreezes: prev.streakFreezes + 1 };
      if (user && loadedFromServer.current) {
        supabase.from('profiles').update({ stats: next }).eq('id', user.id).then(() => {});
      }
      return next;
    });
    return { error: null };
  }, [diamonds, addDiamonds, user]);

  // What claiming right now would be worth — used to preview the popup/card
  // before the player actually taps "Récupérer" (which commits it below).
  const nextDailyRewardDay = stats.dailyRewardClaimedDate === yesterdayStr() ? stats.dailyRewardStreak + 1 : 1;
  const canClaimDailyReward = stats.dailyRewardClaimedDate !== todayStr();

  const claimDailyReward = useCallback((): DailyRewardResult | null => {
    if (stats.dailyRewardClaimedDate === todayStr()) return null;
    const day = nextDailyRewardDay;
    const milestone = DAILY_REWARD_MILESTONES.find((m) => m.day === day) || null;
    const roll = Math.random() * 100;
    const bonusRoll: 'hint' | 'xp' | null = roll < 15 ? 'hint' : roll < 30 ? 'xp' : null;
    const result: DailyRewardResult = {
      streakDay: day,
      diamonds: dailyRewardDiamonds(day) + (milestone?.diamonds ?? 0),
      xp: (bonusRoll === 'xp' ? 10 : 0) + (milestone?.xp ?? 0),
      freeHints: (bonusRoll === 'hint' ? 1 : 0) + (milestone?.freeHints ?? 0),
      bonusRoll,
      milestone,
    };
    addDiamonds(result.diamonds);
    setStats((prev) => {
      const today = todayStr();
      const xpToday = prev.xpTodayDate === today ? prev.xpToday + result.xp : result.xp;
      const next: StatsData = {
        ...prev,
        dailyRewardStreak: day,
        dailyRewardClaimedDate: today,
        freeHints: prev.freeHints + result.freeHints,
        xp: prev.xp + result.xp,
        xpTodayDate: result.xp > 0 ? today : prev.xpTodayDate,
        xpToday: result.xp > 0 ? xpToday : prev.xpToday,
        streakFreezes: prev.streakFreezes + (milestone?.streakFreeze ?? 0),
      };
      const prevLevel = levelForXp(prev.xp).level;
      const nextLevel = levelForXp(next.xp).level;
      if (nextLevel > prevLevel) setLevelUpEvent(nextLevel);
      if (user && loadedFromServer.current) {
        supabase.from('profiles').update({ stats: next }).eq('id', user.id).then(() => {});
      }
      return next;
    });
    return result;
  }, [stats.dailyRewardClaimedDate, nextDailyRewardDay, addDiamonds, user]);

  const spendFreeHint = useCallback(() => {
    setStats((prev) => {
      if (prev.freeHints <= 0) return prev;
      const next = { ...prev, freeHints: prev.freeHints - 1 };
      if (user && loadedFromServer.current) {
        supabase.from('profiles').update({ stats: next }).eq('id', user.id).then(() => {});
      }
      return next;
    });
  }, [user]);

  const firstTryPercent = stats.totalWins > 0 ? Math.round((stats.firstTryWins / stats.totalWins) * 100) : 0;
  const { level, progress, xpIntoLevel, xpForNext } = levelForXp(stats.xp);

  return (
    <StatsContext.Provider
      value={{
        stats,
        derived: { firstTryPercent, level, levelProgress: progress, xpIntoLevel, xpForNextLevel: xpForNext },
        recordWin,
        addBonusXp,
        buyStreakFreeze,
        canClaimDailyReward,
        nextDailyRewardDay,
        claimDailyReward,
        spendFreeHint,
        levelUpEvent,
        clearLevelUpEvent,
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
