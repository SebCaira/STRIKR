import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLAYERS, Player } from '../data/players';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { useAuth } from '../state/auth';
import { supabase } from '../lib/supabase';
import { fx } from '../lib/fx';
import { LetterFeedback, MAX_ROWS, computeFeedback, pickDailyPlayer, pickHintIndex, pickHintPresentLetter, rewardForTries, targetLetters } from './dailyEngine';
import { DAILY_WIN_XP, LETTER_HINT_COSTS } from './engine';

export type LetterHintKind = 'placed' | 'present';

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
  hintedPresent: string[];
  status: DailyStatus;
  rewardGiven: boolean;
}

const STORAGE_KEY = 'strikr_daily_state_v1';

interface PersistedDaily {
  date: string;
  // Pins today's target player so it can never change again once picked —
  // pickDailyPlayer() indexes into PLAYERS by date % PLAYERS.length, so
  // any edit to players.ts (even a same-day OTA update, like the Algeria
  // additions) shifts PLAYERS.length and silently picks a different
  // player. Without this, guesses typed against this morning's target
  // stayed on screen after such an update while the name banner (which
  // re-reads state.player fresh) switched to the newly-computed one,
  // showing an old guess next to a different player's name. Optional so
  // rounds persisted before this fix (no `player` field) still load —
  // those fall back to the freshly-computed target, same as before.
  player?: Player;
  guesses: DailyGuess[];
  locked: Record<number, string>;
  hintedPresent: string[];
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
    hintedPresent: [],
    status: 'playing',
    rewardGiven: false,
  };
}

export function useDailyEngine() {
  const { diamonds, addDiamonds } = useDiamonds();
  const { recordWin } = useStats();
  const { user } = useAuth();
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
          // A round saved before this fix has no `player` field, so there's
          // no way to know which player its guesses actually refer to —
          // salvaging it by pairing those guesses with a freshly-picked
          // player would just reproduce the exact bug this fix closes.
          // Safer to drop it and let the fresh init() state (already
          // correctly pinned) stand as today's round; the player keeps
          // whatever diamonds/XP that earlier win already paid out, they'd
          // just get to (and could) play today's puzzle once more.
          if (persisted.date === todayStr() && persisted.player) {
            const target = targetLetters(persisted.player);
            setState((prev) => ({
              ...prev,
              player: persisted.player!,
              target,
              guesses: persisted.guesses,
              locked: persisted.locked,
              hintedPresent: persisted.hintedPresent || [],
              status: persisted.status,
              rewardGiven: persisted.rewardGiven,
              current: makeEmptyCurrent(target, persisted.locked),
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
      player: state.player,
      guesses: state.guesses,
      locked: state.locked,
      hintedPresent: state.hintedPresent,
      status: state.status,
      rewardGiven: state.rewardGiven,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {});
  }, [loaded, state.player, state.guesses, state.locked, state.hintedPresent, state.status, state.rewardGiven]);

  useEffect(() => {
    if (state.status === 'won' && !state.rewardGiven) {
      const reward = rewardForTries(state.guesses.length);
      addDiamonds(reward);
      recordWin({ kind: 'daily', firstTry: state.guesses.length === 1, xp: DAILY_WIN_XP });
      setState((prev) => ({ ...prev, rewardGiven: true }));
      if (user) {
        supabase
          .from('game_rounds')
          .insert({ user_id: user.id, kind: 'daily', player_name: state.player.n, won: true, attempt: state.guesses.length, reward_diamonds: reward })
          .then(() => {});
      }
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
    const outcome: { current: 'win' | 'lost' | 'tap' | null; playerName: string } = { current: null, playerName: '' };
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
      outcome.playerName = prev.player.n;
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
      if (user) {
        supabase
          .from('game_rounds')
          .insert({ user_id: user.id, kind: 'daily', player_name: outcome.playerName, won: false, reward_diamonds: 0 })
          .then(() => {});
      }
    } else if (outcome.current === 'tap') {
      fx.tap();
    }
  }, [nextEditableIndex, user]);

  const clearJustCompleted = useCallback(() => setJustCompleted(false), []);

  // Reveals a letter without spending a guess row: 'placed' locks a random
  // remaining position in place (same as an "exact" tile), 'present' just
  // flags a letter as somewhere in the word (same as a "present" tile).
  //
  // Whether a hint applies is decided up front against `state` (not inside
  // the setState updater): a flag set inside the updater and read right
  // after setState() isn't guaranteed to be set yet at that point, which
  // made addDiamonds(-cost) silently never fire — diamonds got spent on a
  // hint with nothing actually deducted.
  const buyLetterHint = useCallback(
    (kind: LetterHintKind) => {
      const cost = LETTER_HINT_COSTS[kind];
      if (diamonds < cost || state.status !== 'playing') return;
      if (kind === 'placed') {
        const idx = pickHintIndex(state.target, state.locked);
        if (idx === null) return;
        const locked = { ...state.locked, [idx]: state.target[idx] };
        setState((prev) => ({ ...prev, locked, current: makeEmptyCurrent(prev.target, locked) }));
      } else {
        const letter = pickHintPresentLetter(state.target, state.locked, state.hintedPresent);
        if (letter === null) return;
        setState((prev) => ({ ...prev, hintedPresent: [...prev.hintedPresent, letter] }));
      }
      addDiamonds(-cost);
      fx.coin();
    },
    [diamonds, addDiamonds, state]
  );

  const letterHintExhausted = useMemo(
    () => ({
      placed: pickHintIndex(state.target, state.locked) === null,
      present: pickHintPresentLetter(state.target, state.locked, state.hintedPresent) === null,
    }),
    [state.target, state.locked, state.hintedPresent]
  );

  const letterState = useMemo(() => {
    const map: Record<string, LetterFeedback> = {};
    const rank = { absent: 0, present: 1, exact: 2 };
    const consider = (l: string, f: LetterFeedback) => {
      if (rank[f] > (map[l] ? rank[map[l]] : -1)) map[l] = f;
    };
    state.guesses.forEach((g) => {
      g.letters.forEach((l, i) => consider(l, g.feedback[i]));
    });
    Object.values(state.locked).forEach((l) => consider(l, 'exact'));
    state.hintedPresent.forEach((l) => consider(l, 'present'));
    return map;
  }, [state.guesses, state.locked, state.hintedPresent]);

  return {
    state,
    diamonds,
    letterState,
    justCompleted,
    clearJustCompleted,
    typeLetter,
    backspace,
    submitGuess,
    buyLetterHint,
    letterHintExhausted,
  };
}
