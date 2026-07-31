// "Mode inverse": given a player, name as many of their clubs as possible
// before a user-chosen timer runs out. Structurally the same engine as
// useQuizList.ts (Mode Liste) — same reward constants reused as-is
// (QUIZ_WIN_XP, QUIZ_REWARD_PER_PLAYER) — just with a player's own club
// history as content instead of a themed roster, and its own separate
// daily-reward cap/storage key since it's a distinct mode.
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { fx } from '../lib/fx';
import { stripAcc } from './engine';
import { PLAYERS, Player } from '../data/players';
import { QUIZ_WIN_XP, QUIZ_REWARD_PER_PLAYER } from './useQuizList';

export type ClubsQuizStatus = 'idle' | 'playing' | 'finished';

const REWARDED_PER_DAY = 5;
const STORAGE_KEY = 'strikr_clubs_quiz_rewards_v1';
// Players with too few distinct clubs would make for a trivially short round.
const ELIGIBLE_PLAYERS = PLAYERS.filter((p) => new Set(p.clubs).size >= 3);

function norm(s: string): string {
  return stripAcc(s.trim().toLowerCase());
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useClubsQuiz() {
  const { addDiamonds } = useDiamonds();
  const { recordWin } = useStats();
  const [player, setPlayer] = useState<Player | null>(null);
  const [clubs, setClubs] = useState<string[]>([]);
  const [foundIndexes, setFoundIndexes] = useState<number[]>([]);
  const [status, setStatus] = useState<ClubsQuizStatus>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [rewardedToday, setRewardedToday] = useState(0);
  const [lastReward, setLastReward] = useState(0);
  const durationRef = useRef(0);

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

  const finishRound = useCallback(
    (foundCount: number) => {
      setStatus('finished');
      if (foundCount > 0) {
        const reward = foundCount * QUIZ_REWARD_PER_PLAYER;
        if (!rewardsExhausted) {
          addDiamonds(reward);
          setLastReward(reward);
          setRewardedToday((prev) => {
            const next = prev + 1;
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
            return next;
          });
        }
        recordWin({ kind: 'game', firstTry: false, xp: QUIZ_WIN_XP });
      }
      fx.win();
    },
    [addDiamonds, recordWin, rewardsExhausted]
  );

  // Countdown ticks once a round is playing; ends the round at zero.
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status === 'playing' && timeLeft === 0) {
      finishRound(foundIndexes.length);
    }
  }, [status, timeLeft, foundIndexes.length, finishRound]);

  const startRound = useCallback((durationSec: number) => {
    const p = ELIGIBLE_PLAYERS[Math.floor(Math.random() * ELIGIBLE_PLAYERS.length)];
    setPlayer(p);
    setClubs(Array.from(new Set(p.clubs)));
    setFoundIndexes([]);
    setLastReward(0);
    durationRef.current = durationSec;
    setTimeLeft(durationSec);
    setStatus('playing');
  }, []);

  const endRoundEarly = useCallback(() => {
    if (status !== 'playing') return;
    finishRound(foundIndexes.length);
  }, [status, foundIndexes.length, finishRound]);

  const submitGuess = useCallback(
    (raw: string): { error: string | null } => {
      if (!player || status !== 'playing') return { error: null };
      const input = norm(raw);
      if (!input) return { error: null };

      const idx = clubs.findIndex((c, i) => !foundIndexes.includes(i) && norm(c) === input);
      if (idx === -1) return { error: 'not_found' };

      const nextFound = [...foundIndexes, idx];
      setFoundIndexes(nextFound);
      fx.correct();

      if (nextFound.length === clubs.length) {
        finishRound(nextFound.length);
      }

      return { error: null };
    },
    [player, status, clubs, foundIndexes, finishRound]
  );

  return {
    player,
    clubs,
    status,
    timeLeft,
    duration: durationRef.current,
    foundIndexes,
    foundCount: foundIndexes.length,
    totalCount: clubs.length,
    startRound,
    submitGuess,
    endRoundEarly,
    rewardsExhausted,
    rewardedToday,
    rewardedLimit: REWARDED_PER_DAY,
    lastReward,
  };
}
