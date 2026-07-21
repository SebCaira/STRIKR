// "Devine le club" — Wordle-style guessing game: 6 attempts to name a
// mystery club, each guess compared against it on nationality, founding
// year, stadium capacity, and direction/distance (needs full clubData.ts
// coverage, so both the mystery club and any valid guess are drawn from
// clubs that have every field filled in).
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { fx } from '../lib/fx';
import { CLUB_DATA } from '../data/clubData';
import { haversineKm, compassArrow } from '../lib/geo';

export type ClubGuessStatus = 'playing' | 'won' | 'lost';
export type ClueCompare = 'match' | 'up' | 'down';

export interface ClubGuessRow {
  name: string;
  natMatch: boolean;
  nat: string;
  founded: number;
  foundedCompare: ClueCompare;
  capacity: number;
  capacityCompare: ClueCompare;
  direction: string;
  distanceKm: number;
}

export const MAX_GUESSES = 6;
const WIN_XP = 80;
const WIN_DIAMONDS_BASE = 8;
const REWARDED_PER_DAY = 5;
const STORAGE_KEY = 'strikr_club_guess_rewards_v1';

type CompleteClub = { country: string; founded: number; capacity: number; lat: number; lng: number };

function isComplete(r: (typeof CLUB_DATA)[string]): r is (typeof CLUB_DATA)[string] & CompleteClub {
  return !!r.country && !!r.founded && !!r.capacity && r.lat !== null && r.lng !== null;
}

function eligibleClubs(): [string, CompleteClub][] {
  return Object.entries(CLUB_DATA).filter((e): e is [string, CompleteClub] => isComplete(e[1]));
}

function pickMystery(): [string, CompleteClub] {
  const pool = eligibleClubs();
  return pool[Math.floor(Math.random() * pool.length)];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useClubGuess() {
  const { addDiamonds } = useDiamonds();
  const { recordWin } = useStats();
  const [mystery, setMystery] = useState<[string, CompleteClub]>(() => pickMystery());
  const [guesses, setGuesses] = useState<ClubGuessRow[]>([]);
  const [status, setStatus] = useState<ClubGuessStatus>('playing');
  const [rewardedToday, setRewardedToday] = useState(0);
  const [lastReward, setLastReward] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr()) setRewardedToday(parsed.count || 0);
      } catch {
        // ignore corrupt storage
      }
    });
  }, []);

  const rewardsExhausted = rewardedToday >= REWARDED_PER_DAY;

  const newRound = useCallback(() => {
    setMystery(pickMystery());
    setGuesses([]);
    setStatus('playing');
    setLastReward(0);
  }, []);

  const submitGuess = useCallback(
    (rawName: string): { error: string | null } => {
      if (status !== 'playing') return { error: null };
      const name = Object.keys(CLUB_DATA).find((n) => n.toLowerCase() === rawName.trim().toLowerCase());
      if (!name) return { error: 'unknown_club' };
      const guessData = CLUB_DATA[name];
      if (!isComplete(guessData)) return { error: 'unknown_club' };
      if (guesses.some((g) => g.name === name)) return { error: 'already_guessed' };

      const [mysteryName, mysteryData] = mystery;
      const row: ClubGuessRow = {
        name,
        natMatch: guessData.country === mysteryData.country,
        nat: guessData.country,
        founded: guessData.founded,
        foundedCompare: guessData.founded === mysteryData.founded ? 'match' : mysteryData.founded > guessData.founded ? 'up' : 'down',
        capacity: guessData.capacity,
        capacityCompare: guessData.capacity === mysteryData.capacity ? 'match' : mysteryData.capacity > guessData.capacity ? 'up' : 'down',
        direction: compassArrow(guessData.lat, guessData.lng, mysteryData.lat, mysteryData.lng),
        distanceKm: Math.round(haversineKm(guessData.lat, guessData.lng, mysteryData.lat, mysteryData.lng)),
      };
      const nextGuesses = [row, ...guesses];
      setGuesses(nextGuesses);

      const won = name === mysteryName;
      const lost = !won && nextGuesses.length >= MAX_GUESSES;

      if (won) {
        setStatus('won');
        const attempt = nextGuesses.length;
        const reward = Math.max(2, WIN_DIAMONDS_BASE - (attempt - 1));
        if (!rewardsExhausted) {
          addDiamonds(reward);
          setLastReward(reward);
          setRewardedToday((prev) => {
            const next = prev + 1;
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
            return next;
          });
        }
        recordWin({ kind: 'club_guess', firstTry: attempt === 1, xp: WIN_XP });
        fx.win();
      } else if (lost) {
        setStatus('lost');
        fx.wrong();
      } else {
        fx.wrong();
      }

      return { error: null };
    },
    [status, mystery, guesses, addDiamonds, recordWin, rewardsExhausted]
  );

  return {
    mysteryName: mystery[0],
    guesses,
    status,
    attempt: guesses.length + 1,
    submitGuess,
    newRound,
    rewardsExhausted,
    rewardedToday,
    rewardedLimit: REWARDED_PER_DAY,
    lastReward,
  };
}
