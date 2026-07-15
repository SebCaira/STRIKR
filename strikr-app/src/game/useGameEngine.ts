import { useCallback, useMemo, useRef, useState } from 'react';
import { PLAYERS, Player } from '../data/players';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { fx } from '../lib/fx';
import {
  CategoryId,
  FORFEIT_COST,
  GAME_WIN_XP,
  HINT_COSTS,
  Level,
  matchesGuess,
  poolForLevel,
  rewardFor,
  stripAcc,
} from './engine';

export interface Hints {
  nat: boolean;
  pos: boolean;
  age: boolean;
}

export type GameStatus = 'level-select' | 'playing' | 'won';

export interface GameState {
  level: Level | null;
  category: CategoryId | null;
  player: Player | null;
  revealed: number;
  wrongList: string[];
  status: GameStatus;
  guess: string;
  solvedAt: number | null;
  hints: Hints;
  animateReveal: boolean;
  lowDiamondsFlash: number;
}

const fullPool = PLAYERS.map((_, i) => i).filter((i) => PLAYERS[i].clubs.length >= 3);

export function useGameEngine() {
  const { diamonds, addDiamonds } = useDiamonds();
  const { recordWin } = useStats();
  const remainingByLevel = useRef<Record<Level, number[]>>({ easy: [], medium: [], hard: [] });

  const [state, setState] = useState<GameState>({
    level: null,
    category: null,
    player: null,
    revealed: 0,
    wrongList: [],
    status: 'level-select',
    guess: '',
    solvedAt: null,
    hints: { nat: false, pos: false, age: false },
    animateReveal: false,
    lowDiamondsFlash: 0,
  });

  const pickPlayer = useCallback((level?: Level) => {
    setState((prev) => {
      const lvl = level || prev.level || 'medium';
      let pool = remainingByLevel.current[lvl];
      if (!pool || !pool.length) {
        pool = poolForLevel(PLAYERS, lvl, prev.category, fullPool).slice();
        remainingByLevel.current[lvl] = pool;
      }
      const idx = Math.floor(Math.random() * pool.length);
      const playerIdx = pool.splice(idx, 1)[0];
      const p = PLAYERS[playerIdx];
      return {
        ...prev,
        level: lvl,
        player: p,
        revealed: Math.max(1, Math.min(3, p.clubs.length - 2)),
        animateReveal: false,
        wrongList: [],
        status: 'playing',
        guess: '',
        solvedAt: null,
        hints: { nat: false, pos: false, age: false },
      };
    });
  }, []);

  const promptLevel = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'level-select' }));
  }, []);

  const setCategory = useCallback((cat: CategoryId | null) => {
    remainingByLevel.current = { easy: [], medium: [], hard: [] };
    setState((prev) => ({ ...prev, category: cat }));
  }, []);

  const flashLowDiamonds = useCallback(() => {
    setState((prev) => ({ ...prev, lowDiamondsFlash: prev.lowDiamondsFlash + 1 }));
  }, []);

  const setGuess = useCallback((g: string) => {
    setState((prev) => ({ ...prev, guess: g }));
  }, []);

  const submit = useCallback(
    (text?: string) => {
      setState((prev) => {
        if (!prev.player || prev.status === 'won') return prev;
        const guessText = text !== undefined ? text : prev.guess;
        if (!guessText.trim()) return prev;
        const p = prev.player;
        if (matchesGuess(p, guessText)) {
          const solvedAt = prev.revealed;
          const reward = rewardFor(prev.level || 'medium', solvedAt);
          addDiamonds(reward);
          recordWin({ kind: 'game', firstTry: prev.wrongList.length === 0, xp: GAME_WIN_XP });
          fx.win();
          return { ...prev, status: 'won', solvedAt, revealed: p.clubs.length, guess: '' };
        }
        fx.wrong();
        return {
          ...prev,
          wrongList: [...prev.wrongList, guessText.trim()],
          guess: '',
          revealed: Math.min(prev.revealed + 1, p.clubs.length),
          animateReveal: true,
        };
      });
    },
    [addDiamonds, recordWin]
  );

  const buyHint = useCallback(
    (kind: keyof Hints) => {
      setState((prev) => {
        if (!prev.player || prev.status === 'won' || prev.hints[kind]) return prev;
        const cost = HINT_COSTS[kind];
        if (diamonds < cost) {
          flashLowDiamonds();
          return prev;
        }
        addDiamonds(-cost);
        fx.coin();
        return { ...prev, hints: { ...prev.hints, [kind]: true } };
      });
    },
    [diamonds, addDiamonds, flashLowDiamonds]
  );

  const skipOrForfeit = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing') return { ...prev, status: 'level-select' };
      if (diamonds < FORFEIT_COST) {
        flashLowDiamonds();
        return prev;
      }
      addDiamonds(-FORFEIT_COST);
      return { ...prev, status: 'level-select' };
    });
  }, [diamonds, addDiamonds, flashLowDiamonds]);

  const newRound = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'level-select' }));
  }, []);

  const suggestions = useMemo(() => {
    const q = state.guess.trim().toLowerCase();
    if (q.length < 2 || state.status === 'won') return [];
    const qq = stripAcc(q);
    const out: string[] = [];
    for (let i = 0; i < PLAYERS.length && out.length < 6; i++) {
      const nL = stripAcc(PLAYERS[i].n.toLowerCase());
      if (nL.indexOf(qq) > -1) out.push(PLAYERS[i].n);
    }
    return out;
  }, [state.guess, state.status]);

  return {
    state,
    diamonds,
    suggestions,
    pickPlayer,
    promptLevel,
    setCategory,
    setGuess,
    submit,
    buyHint,
    skipOrForfeit,
    newRound,
  };
}
