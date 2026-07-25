// "Mode Liste": given a themed roster (see data/quizLists.ts), name as many
// of its players as possible before a user-chosen timer runs out.
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { fx } from '../lib/fx';
import { stripAcc } from '../game/engine';
import { QUIZ_LISTS, QuizList, playerFull, playerBase } from '../data/quizLists';

export type QuizStatus = 'idle' | 'playing' | 'finished';

export const QUIZ_WIN_XP = 60;
export const QUIZ_REWARD_PER_PLAYER = 3;
const WIN_XP = QUIZ_WIN_XP;
const REWARD_PER_PLAYER = QUIZ_REWARD_PER_PLAYER;
const REWARDED_PER_DAY = 5;
const STORAGE_KEY = 'strikr_quiz_list_rewards_v1';

function norm(s: string): string {
  return stripAcc(s.trim().toLowerCase());
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useQuizList() {
  const { addDiamonds } = useDiamonds();
  const { recordWin } = useStats();
  const [list, setList] = useState<QuizList | null>(null);
  const [foundIndexes, setFoundIndexes] = useState<number[]>([]);
  const [status, setStatus] = useState<QuizStatus>('idle');
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
        const reward = foundCount * REWARD_PER_PLAYER;
        if (!rewardsExhausted) {
          addDiamonds(reward);
          setLastReward(reward);
          setRewardedToday((prev) => {
            const next = prev + 1;
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
            return next;
          });
        }
        recordWin({ kind: 'game', firstTry: false, xp: WIN_XP });
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

  const startRound = useCallback((listId: string, durationSec: number) => {
    const found = QUIZ_LISTS.find((l) => l.id === listId);
    if (!found) return;
    setList(found);
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
      if (!list || status !== 'playing') return { error: null };
      const input = norm(raw);
      if (!input) return { error: null };

      const baseCounts = new Map<string, number>();
      list.players.forEach((p) => {
        const b = norm(playerBase(p));
        baseCounts.set(b, (baseCounts.get(b) || 0) + 1);
      });

      const idx = list.players.findIndex((p, i) => {
        if (foundIndexes.includes(i)) return false;
        const full = norm(playerFull(p));
        const base = norm(playerBase(p));
        if (input === full) return true;
        if (input === base && (baseCounts.get(base) || 0) === 1) return true;
        return false;
      });

      if (idx === -1) return { error: 'not_found' };

      const nextFound = [...foundIndexes, idx];
      setFoundIndexes(nextFound);
      fx.correct();

      if (nextFound.length === list.players.length) {
        finishRound(nextFound.length);
      }

      return { error: null };
    },
    [list, status, foundIndexes, finishRound]
  );

  return {
    list,
    status,
    timeLeft,
    duration: durationRef.current,
    foundIndexes,
    foundCount: foundIndexes.length,
    totalCount: list?.players.length || 0,
    startRound,
    submitGuess,
    endRoundEarly,
    rewardsExhausted,
    rewardedToday,
    rewardedLimit: REWARDED_PER_DAY,
    lastReward,
  };
}
