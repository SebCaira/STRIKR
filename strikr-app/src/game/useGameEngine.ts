import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PLAYERS, Player } from '../data/players';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { useAuth } from '../state/auth';
import { supabase } from '../lib/supabase';
import { fx } from '../lib/fx';
import {
  CategoryId,
  FORFEIT_COST,
  GAME_WIN_XP,
  HINT_COSTS,
  Level,
  MAX_GUESSES_AFTER_FULL_REVEAL,
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

export type GameStatus = 'level-select' | 'playing' | 'won' | 'lost';

type PendingEffect =
  | { kind: 'win'; reward: number; firstTry: boolean; level: Level; elapsedMs?: number; playerName: string; attempt: number }
  | { kind: 'wrong' }
  | { kind: 'lost'; playerName: string }
  | { kind: 'hint'; cost: number }
  | { kind: 'forfeit'; cost: number }
  | null;

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
  roundStartedAt: number | null;
  overflowGuesses: number;
  pendingEffect: PendingEffect;
}

const fullPool = PLAYERS.map((_, i) => i).filter((i) => PLAYERS[i].clubs.length >= 3);

export function useGameEngine() {
  const { diamonds, addDiamonds } = useDiamonds();
  const { recordWin } = useStats();
  const { user } = useAuth();
  const remainingByLevel = useRef<Record<Level, number[]>>({ easy: [], medium: [], hard: [] });
  const categoryRef = useRef<CategoryId | null>(null);
  const levelRef = useRef<Level>('medium');

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
    roundStartedAt: null,
    overflowGuesses: 0,
    pendingEffect: null,
  });

  useEffect(() => {
    const pe = state.pendingEffect;
    if (!pe) return;
    if (pe.kind === 'win') {
      addDiamonds(pe.reward);
      recordWin({ kind: 'game', firstTry: pe.firstTry, xp: GAME_WIN_XP, level: pe.level, elapsedMs: pe.elapsedMs });
      fx.win();
      if (user) {
        supabase
          .from('game_rounds')
          .insert({ user_id: user.id, kind: 'game', player_name: pe.playerName, won: true, attempt: pe.attempt, reward_diamonds: pe.reward })
          .then(() => {});
      }
    } else if (pe.kind === 'wrong') {
      fx.wrong();
    } else if (pe.kind === 'lost') {
      fx.wrong();
      if (user) {
        supabase
          .from('game_rounds')
          .insert({ user_id: user.id, kind: 'game', player_name: pe.playerName, won: false, reward_diamonds: 0 })
          .then(() => {});
      }
    } else if (pe.kind === 'hint') {
      addDiamonds(-pe.cost);
      fx.coin();
    } else if (pe.kind === 'forfeit') {
      addDiamonds(-pe.cost);
    }
    setState((prev) => (prev.pendingEffect === pe ? { ...prev, pendingEffect: null } : prev));
  }, [state.pendingEffect, addDiamonds, recordWin, user]);

  const pickPlayer = useCallback((level?: Level) => {
    const lvl = level || levelRef.current;
    levelRef.current = lvl;
    let pool = remainingByLevel.current[lvl];
    if (!pool || !pool.length) {
      pool = poolForLevel(PLAYERS, lvl, categoryRef.current, fullPool).slice();
      remainingByLevel.current[lvl] = pool;
    }
    const idx = Math.floor(Math.random() * pool.length);
    const playerIdx = pool.splice(idx, 1)[0];
    const p = PLAYERS[playerIdx];
    setState((prev) => ({
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
      roundStartedAt: Date.now(),
      overflowGuesses: 0,
      pendingEffect: null,
    }));
  }, []);

  const promptLevel = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'level-select' }));
  }, []);

  const setCategory = useCallback((cat: CategoryId | null) => {
    remainingByLevel.current = { easy: [], medium: [], hard: [] };
    categoryRef.current = cat;
    setState((prev) => ({ ...prev, category: cat }));
  }, []);

  const flashLowDiamonds = useCallback(() => {
    setState((prev) => ({ ...prev, lowDiamondsFlash: prev.lowDiamondsFlash + 1 }));
  }, []);

  const setGuess = useCallback((g: string) => {
    setState((prev) => ({ ...prev, guess: g }));
  }, []);

  const submit = useCallback((text?: string) => {
    setState((prev) => {
      if (!prev.player || prev.status === 'won' || prev.status === 'lost') return prev;
      const guessText = text !== undefined ? text : prev.guess;
      if (!guessText.trim()) return prev;
      const p = prev.player;
      if (matchesGuess(p, guessText)) {
        const attempt = prev.wrongList.length + 1;
        const elapsedMs = prev.roundStartedAt ? Date.now() - prev.roundStartedAt : undefined;
        return {
          ...prev,
          status: 'won',
          solvedAt: attempt,
          revealed: p.clubs.length,
          guess: '',
          animateReveal: false,
          pendingEffect: {
            kind: 'win',
            reward: rewardFor(prev.level || 'medium', attempt),
            firstTry: prev.wrongList.length === 0,
            level: prev.level || 'medium',
            elapsedMs,
            playerName: p.n,
            attempt,
          },
        };
      }
      const wasFullyRevealed = prev.revealed >= p.clubs.length;
      const overflowGuesses = wasFullyRevealed ? prev.overflowGuesses + 1 : prev.overflowGuesses;
      const forcedLoss = wasFullyRevealed && overflowGuesses >= MAX_GUESSES_AFTER_FULL_REVEAL;
      return {
        ...prev,
        wrongList: [...prev.wrongList, guessText.trim()],
        guess: '',
        revealed: Math.min(prev.revealed + 1, p.clubs.length),
        animateReveal: !wasFullyRevealed,
        overflowGuesses,
        status: forcedLoss ? 'lost' : prev.status,
        pendingEffect: forcedLoss ? { kind: 'lost', playerName: p.n } : { kind: 'wrong' },
      };
    });
  }, []);

  const buyHint = useCallback(
    (kind: keyof Hints) => {
      setState((prev) => {
        if (!prev.player || prev.status === 'won' || prev.hints[kind]) return prev;
        const cost = HINT_COSTS[kind];
        if (diamonds < cost) {
          flashLowDiamonds();
          return prev;
        }
        return { ...prev, hints: { ...prev.hints, [kind]: true }, pendingEffect: { kind: 'hint', cost } };
      });
    },
    [diamonds, flashLowDiamonds]
  );

  const skipOrForfeit = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing') return { ...prev, status: 'level-select' };
      if (diamonds < FORFEIT_COST) {
        flashLowDiamonds();
        return prev;
      }
      return { ...prev, status: 'level-select', pendingEffect: { kind: 'forfeit', cost: FORFEIT_COST } };
    });
  }, [diamonds, flashLowDiamonds]);

  const newRound = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'level-select' }));
  }, []);

  const suggestions = useMemo(() => {
    const q = state.guess.trim().toLowerCase();
    if (q.length < 2 || state.status !== 'playing') return [];
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
