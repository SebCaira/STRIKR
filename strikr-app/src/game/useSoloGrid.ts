// Solo variant of the Duel grid: no opponent, no turns — just fill all 9
// cells of a fresh Immaculate-Grid-style board, same club/nationality rules
// and same "no reusing a player" constraint as the real Duel.
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDiamonds } from '../state/diamonds';
import { useStats } from '../state/stats';
import { fx } from '../lib/fx';
import { DuelGrid, generateGrid, matchesCriteria } from './gridDuel';

export interface SoloCell {
  name: string | null;
}

export type SoloStatus = 'playing' | 'won';

export interface SoloState {
  grid: DuelGrid;
  cells: SoloCell[];
  usedPlayers: string[];
  rewardedRows: boolean[];
  status: SoloStatus;
}

// Paid per completed row (all 3 cells in it filled), not per cell — a full
// grid is 3 rows, so 6 diamonds max, plus whatever completions still fit
// under today's cap.
const ROW_REWARD = 2;
const SOLO_WIN_XP = 60;

// Freely replayable, but only the first few completions a day pay out —
// otherwise this mode is an unlimited diamond faucet compared to every
// other source in the app (all either capped once/day or cost-for-reward).
const REWARDED_GRIDS_PER_DAY = 3;
const STORAGE_KEY = 'strikr_solo_grid_rewards_v1';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function freshState(): SoloState {
  return {
    grid: generateGrid(),
    cells: Array.from({ length: 9 }, () => ({ name: null })),
    usedPlayers: [],
    rewardedRows: [false, false, false],
    status: 'playing',
  };
}

export function useSoloGrid() {
  const { addDiamonds } = useDiamonds();
  const { recordWin } = useStats();
  const [state, setState] = useState<SoloState>(freshState);
  const [rewardedToday, setRewardedToday] = useState(0);

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

  const rewardsExhausted = rewardedToday >= REWARDED_GRIDS_PER_DAY;

  const newGrid = useCallback(() => setState(freshState()), []);

  // Validated against `state` directly, before calling setState — not via a
  // flag mutated inside the updater and read right after setState() returns,
  // which isn't guaranteed to have run yet at that point (see the identical
  // bug fixed in useDailyEngine.ts's buyLetterHint: it made the diamond
  // deduction silently never fire). Here that same gap would have both
  // swallowed row/win rewards and always returned { error: null } even on an
  // invalid guess.
  const playCell = useCallback(
    (index: number, name: string): { error: string | null } => {
      if (state.status !== 'playing' || state.cells[index].name) {
        return { error: 'cell_taken' };
      }
      const ri = Math.floor(index / 3);
      const rowC = state.grid.rows[ri];
      const colC = state.grid.cols[index % 3];
      const found = matchesCriteria(name, rowC, colC);
      if (!found) {
        return { error: 'invalid_answer' };
      }
      if (state.usedPlayers.includes(found.n)) {
        return { error: 'player_used' };
      }

      const cells = state.cells.slice();
      cells[index] = { name: found.n };
      const usedPlayers = [...state.usedPlayers, found.n];
      const rowComplete = cells.slice(ri * 3, ri * 3 + 3).every((c) => c.name);
      const rewardedRows = state.rewardedRows.slice();
      const rowJustCompleted = rowComplete && !rewardedRows[ri];
      if (rowJustCompleted) rewardedRows[ri] = true;
      const complete = cells.every((c) => c.name);

      setState((prev) => ({ ...prev, cells, usedPlayers, rewardedRows, status: complete ? 'won' : 'playing' }));

      if (!rewardsExhausted && rowJustCompleted) {
        addDiamonds(ROW_REWARD);
        fx.coin();
      }
      if (complete) {
        if (!rewardsExhausted) {
          setRewardedToday((prev) => {
            const next = prev + 1;
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayStr(), count: next })).catch(() => {});
            return next;
          });
        }
        recordWin({ kind: 'duel_solo', firstTry: true, xp: SOLO_WIN_XP });
        fx.win();
      }
      return { error: null };
    },
    [state, addDiamonds, recordWin, rewardsExhausted]
  );

  return { state, playCell, newGrid, rewardsExhausted, rewardedToday, rewardedLimit: REWARDED_GRIDS_PER_DAY };
}
