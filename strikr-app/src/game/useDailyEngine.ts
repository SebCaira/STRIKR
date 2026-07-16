import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLAYERS, Player } from '../data/players';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { fx } from '../lib/fx';
import { LetterFeedback, MAX_ROWS, computeFeedback, pickDailyPlayer, rewardForTries, targetLetters } from './dailyEngine';
import { DAILY_WIN_XP } from './engine';

export interface DailyGuess {
  letters: string[];
  feedback: LetterFeedback[];
}

export type DailyStatus = 'playing' | 'won' | 'lost';

interface DailyState {
  player: Player;
  target: string[];
  guesses: DailyGuess[];
  current: string[];
  locked: Record<number, string>;
  status: DailyStatus;
  rewardGiven: boolean;
}

const STORAGE_KEY = 'strikr_daily_state_v1';

interface PersistedDaily {
  date: string;
  guesses: DailyGuess[];
  locked: Record<number, string>;
  status: DailyStatus;
  rewardGiven: boolean;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeEmptyCurrent(target: string[], locked: Record<number, string>): string[] {
  return target.map((_, i) => locked[i] || '');
}

function init(): DailyState {
  const player = pickDailyPlayer(PLAYERS)!;
  const target = targetLetters(player);
  return {
    player,
    target,
    guesses: [],
    current: makeEmptyCurrent(target, {}),
    locked: {},
    status: 'playing',
    rewardGiven: false,
  };
}

export function useDailyEngine() {
  const { diamonds, addDiamonds } = useDiamonds();
  const { recordWin } = useStats();
  const [state, setState] = useState<DailyState>(init);
  const [loaded, setLoaded] = useState(false);
  // Only true right after a submit finishes today's round *this session* —
  // never set when a finished state is merely restored from storage — so
  // the screen knows exactly when to auto-navigate back to Home.
  const [justCompleted, setJustCompleted] = useState(false);

  // Restore today's progress (if any) once on mount. A stored round from a
  // previous day is ignored — a fresh puzzle for the new day takes over.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const persisted: PersistedDaily = JSON.parse(raw);
          if (persisted.date === todayStr()) {
            setState((prev) => ({
              ...prev,
              guesses: persisted.guesses,
              locked: persisted.locked,
              status: persisted.status,
              rewardGiven: persisted.rewardGiven,
              current: makeEmptyCurrent(prev.target, persisted.locked),
            }));
          }
        } catch {
          // ignore corrupt storage, keep the fresh init() state
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const persisted: PersistedDaily = {
      date: todayStr(),
      guesses: state.guesses,
      locked: state.locked,
      status: state.status,
      rewardGiven: state.rewardGiven,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {});
  }, [loaded, state.guesses, state.locked, state.status, state.rewardGiven]);

  useEffect(() => {
    if (state.status === 'won' && !state.rewardGiven) {
      const reward = rewardForTries(state.guesses.length);
      addDiamonds(reward);
      recordWin({ kind: 'daily', firstTry: state.guesses.length === 1, xp: DAILY_WIN_XP });
      setState((prev) => ({ ...prev, rewardGiven: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const nextEditableIndex = useCallback((s: DailyState): number => {
    for (let i = 0; i < s.current.length; i++) {
      if (!s.locked[i] && !s.current[i]) return i;
    }
    return -1;
  }, []);

  const lastEditableFilledIndex = useCallback((s: DailyState): number => {
    for (let i = s.current.length - 1; i >= 0; i--) {
      if (!s.locked[i] && s.current[i]) return i;
    }
    return -1;
  }, []);

  const typeLetter = useCallback(
    (l: string) => {
      setState((prev) => {
        if (prev.status !== 'playing') return prev;
        const idx = nextEditableIndex(prev);
        if (idx === -1) return prev;
        const current = prev.current.slice();
        current[idx] = l;
        return { ...prev, current };
      });
    },
    [nextEditableIndex]
  );

  const backspace = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing') return prev;
      const idx = lastEditableFilledIndex(prev);
      if (idx === -1) return prev;
      const current = prev.current.slice();
      current[idx] = '';
      return { ...prev, current };
    });
  }, [lastEditableFilledIndex]);

  const submitGuess = useCallback(() => {
    const outcome: { current: 'win' | 'lost' | 'tap' | null } = { current: null };
    setState((prev) => {
      if (prev.status !== 'playing') return prev;
      if (nextEditableIndex(prev) !== -1) return prev;
      const letters = prev.current.slice();
      const feedback = computeFeedback(letters, prev.target);
      const locked = { ...prev.locked };
      feedback.forEach((f, i) => {
        if (f === 'exact') locked[i] = letters[i];
      });
      const isWin = feedback.every((f) => f === 'exact');
      const guesses = [...prev.guesses, { letters, feedback }];
      const current = makeEmptyCurrent(prev.target, locked);
      let status: DailyStatus = prev.status;
      if (isWin) {
        status = 'won';
        outcome.current = 'win';
      } else if (guesses.length >= MAX_ROWS) {
        status = 'lost';
        outcome.current = 'lost';
      } else {
        outcome.current = 'tap';
      }
      return { ...prev, guesses, locked, current, status };
    });
    if (outcome.current === 'win') {
      fx.win();
      setJustCompleted(true);
    } else if (outcome.current === 'lost') {
      fx.wrong();
      setJustCompleted(true);
    } else if (outcome.current === 'tap') {
      fx.tap();
    }
  }, [nextEditableIndex]);

  const clearJustCompleted = useCallback(() => setJustCompleted(false), []);

  const letterState = useMemo(() => {
    const map: Record<string, LetterFeedback> = {};
    const rank = { absent: 0, present: 1, exact: 2 };
    state.guesses.forEach((g) => {
      g.letters.forEach((l, i) => {
        const f = g.feedback[i];
        if (rank[f] > (map[l] ? rank[map[l]] : -1)) map[l] = f;
      });
    });
    return map;
  }, [state.guesses]);

  return {
    state,
    diamonds,
    letterState,
    justCompleted,
    clearJustCompleted,
    typeLetter,
    backspace,
    submitGuess,
  };
}
