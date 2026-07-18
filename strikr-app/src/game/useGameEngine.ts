import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PLAYERS, Player } from '../data/players';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { useAuth } from '../state/auth';
import { useSolvedPlayers } from '../state/solvedPlayers';
import { supabase } from '../lib/supabase';
import { fx } from '../lib/fx';
import {
  FORFEIT_COST,
  GAME_WIN_XP,
  HINT_COSTS,
  Level,
  MAX_GUESSES_AFTER_FULL_REVEAL,
  matchesGuess,
  rewardFor,
  shuffle,
  streakMultiplier,
  stripAcc,
  tierOf,
} from './engine';

export interface Hints {
  nat: boolean;
  pos: boolean;
  age: boolean;
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

type PendingEffect =
  | { kind: 'win'; reward: number; firstTry: boolean; level: Level; elapsedMs?: number; playerName: string; attempt: number; winStreak: number; multiplier: number }
  | { kind: 'wrong' }
  | { kind: 'lost'; playerName: string }
  | { kind: 'hint'; cost: number }
  | null;

export interface GameState {
  level: Level | null;
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
  winStreak: number;
  pendingEffect: PendingEffect;
}

const fullPool = PLAYERS.map((_, i) => i).filter((i) => PLAYERS[i].clubs.length >= 3);
const nameToIndex = new Map(PLAYERS.map((p, i) => [p.n, i]));

export function useGameEngine() {
  const { diamonds, addDiamonds } = useDiamonds();
  const { recordWin } = useStats();
  const { user } = useAuth();
  const { solvedPlayers, markSolved } = useSolvedPlayers();
  // Single shuffled draw pool for the whole roster (not per-level anymore).
  // A win removes the player for good (see markSolved); a loss reinserts it
  // at a random spot so it can still come back around before the pool
  // (re)cycles — see submit() below.
  const remainingPool = useRef<number[]>([]);
  const solvedRef = useRef(solvedPlayers);
  solvedRef.current = solvedPlayers;

  const [state, setState] = useState<GameState>({
    level: null,
    player: null,
    revealed: 0,
    wrongList: [],
    status: 'idle',
    guess: '',
    solvedAt: null,
    hints: { nat: false, pos: false, age: false },
    animateReveal: false,
    lowDiamondsFlash: 0,
    roundStartedAt: null,
    overflowGuesses: 0,
    winStreak: 0,
    pendingEffect: null,
  });

  useEffect(() => {
    const pe = state.pendingEffect;
    if (!pe) return;
    if (pe.kind === 'win') {
      addDiamonds(pe.reward);
      recordWin({ kind: 'game', firstTry: pe.firstTry, xp: GAME_WIN_XP, level: pe.level, elapsedMs: pe.elapsedMs });
      markSolved(pe.playerName);
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
    }
    setState((prev) => (prev.pendingEffect === pe ? { ...prev, pendingEffect: null } : prev));
  }, [state.pendingEffect, addDiamonds, recordWin, markSolved, user]);

  const pickPlayer = useCallback(() => {
    let pool = remainingPool.current;
    if (!pool.length) {
      const unsolved = fullPool.filter((i) => !solvedRef.current.has(PLAYERS[i].n));
      // Whole roster solved — start the pool over rather than stalling the game.
      pool = shuffle((unsolved.length ? unsolved : fullPool).slice());
      remainingPool.current = pool;
    }
    const playerIdx = pool.pop()!;
    const p = PLAYERS[playerIdx];
    setState((prev) => ({
      ...prev,
      level: tierOf(p.n),
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
        const winStreak = prev.winStreak + 1;
        const multiplier = streakMultiplier(winStreak);
        const baseReward = rewardFor(prev.level || 'medium', attempt);
        return {
          ...prev,
          status: 'won',
          solvedAt: attempt,
          revealed: p.clubs.length,
          guess: '',
          animateReveal: false,
          winStreak,
          pendingEffect: {
            kind: 'win',
            reward: Math.round(baseReward * multiplier),
            firstTry: prev.wrongList.length === 0,
            level: prev.level || 'medium',
            elapsedMs,
            playerName: p.n,
            attempt,
            winStreak,
            multiplier,
          },
        };
      }
      const wasFullyRevealed = prev.revealed >= p.clubs.length;
      const overflowGuesses = wasFullyRevealed ? prev.overflowGuesses + 1 : prev.overflowGuesses;
      const forcedLoss = wasFullyRevealed && overflowGuesses >= MAX_GUESSES_AFTER_FULL_REVEAL;
      if (forcedLoss) {
        // Missed players stay in the rotation (unlike solved ones) — put
        // this one back at a random spot instead of leaving it gone.
        const pool = remainingPool.current;
        const pIdx = nameToIndex.get(p.n);
        if (pIdx !== undefined) pool.splice(Math.floor(Math.random() * (pool.length + 1)), 0, pIdx);
      }
      return {
        ...prev,
        wrongList: [...prev.wrongList, guessText.trim()],
        guess: '',
        revealed: Math.min(prev.revealed + 1, p.clubs.length),
        animateReveal: !wasFullyRevealed,
        overflowGuesses,
        status: forcedLoss ? 'lost' : prev.status,
        winStreak: forcedLoss ? 0 : prev.winStreak,
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
    let shouldForfeit = false;
    setState((prev) => {
      if (prev.status !== 'playing') return prev;
      if (diamonds < FORFEIT_COST) {
        flashLowDiamonds();
        return prev;
      }
      if (prev.player) {
        const pIdx = nameToIndex.get(prev.player.n);
        if (pIdx !== undefined) {
          const pool = remainingPool.current;
          pool.splice(Math.floor(Math.random() * (pool.length + 1)), 0, pIdx);
        }
      }
      shouldForfeit = true;
      return { ...prev, winStreak: 0 };
    });
    // Done outside the updater (not via pendingEffect) so it can't get
    // silently dropped by the pickPlayer() setState batched right after it.
    if (shouldForfeit) {
      addDiamonds(-FORFEIT_COST);
      pickPlayer();
    }
  }, [diamonds, flashLowDiamonds, addDiamonds, pickPlayer]);

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
    setGuess,
    submit,
    buyHint,
    skipOrForfeit,
  };
}
