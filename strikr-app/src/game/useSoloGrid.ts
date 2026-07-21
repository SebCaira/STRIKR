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

  const playCell = useCallback(
    (index: number, name: string): { error: string | null } => {
      let error: string | null = null;
      let justWon = false;
      let rowsJustCompleted = 0;
      setState((prev) => {
        if (prev.status !== 'playing' || prev.cells[index].name) {
          error = 'cell_taken';
          return prev;
        }
        const ri = Math.floor(index / 3);
        const rowC = prev.grid.rows[ri];
        const colC = prev.grid.cols[index % 3];
        const found = matchesCriteria(name, rowC, colC);
        if (!found) {
          error = 'invalid_answer';
          return prev;
        }
        if (prev.usedPlayers.includes(found.n)) {
          error = 'player_used';
          return prev;
        }
        const cells = prev.cells.slice();
        cells[index] = { name: found.n };
        const usedPlayers = [...prev.usedPlayers, found.n];
        const rowComplete = cells.slice(ri * 3, ri * 3 + 3).every((c) => c.name);
        const rewardedRows = prev.rewardedRows.slice();
        if (rowComplete && !rewardedRows[ri]) {
          rewardedRows[ri] = true;
          rowsJustCompleted = 1;
        }
        const complete = cells.every((c) => c.name);
        justWon = complete;
        return { ...prev, cells, usedPlayers, rewardedRows, status: complete ? 'won' : 'playing' };
      });
      if (!error && !rewardsExhausted && rowsJustCompleted > 0) {
        addDiamonds(ROW_REWARD);
        fx.coin();
      }
      if (!error && justWon) {
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
      return { error };
    },
    [addDiamonds, recordWin, rewardsExhausted]
  );

  return { state, playCell, newGrid, rewardsExhausted, rewardedToday, rewardedLimit: REWARDED_GRIDS_PER_DAY };
}
