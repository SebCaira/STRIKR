// "Duel Grille" — 3x3 Immaculate-Grid-style board (rows = clubs, columns =
// nationality/position). Two players take turns claiming cells by naming a
// player who satisfies both the row and column criteria and hasn't already
// been used elsewhere in this grid; first to align 3 cells wins, like tic-tac-toe.
import { PLAYERS, Player } from '../data/players';
import { NAT_FR, POS_FR, stripAcc } from './engine';

export type CriterionType = 'club' | 'nat' | 'pos';

export interface Criterion {
  type: CriterionType;
  value: string;
  label: string;
}

export interface DuelGrid {
  rows: Criterion[];
  cols: Criterion[];
}

const POSITIONS = ['GK', 'DF', 'MF', 'AT'] as const;

function playerMatches(p: Player, c: Criterion): boolean {
  if (c.type === 'club') return p.clubs.includes(c.value);
  if (c.type === 'nat') return p.nat === c.value;
  return p.pos === c.value;
}

export function cellCandidates(rowC: Criterion, colC: Criterion): Player[] {
  return PLAYERS.filter((p) => playerMatches(p, rowC) && playerMatches(p, colC));
}

export function matchesCriteria(name: string, rowC: Criterion, colC: Criterion): Player | null {
  const target = stripAcc(name.trim().toLowerCase());
  if (!target) return null;
  const found = PLAYERS.find((p) => stripAcc(p.n.toLowerCase()) === target);
  if (!found) return null;
  return playerMatches(found, rowC) && playerMatches(found, colC) ? found : null;
}

// Only pull criteria from clubs/nationalities with enough representation in
// the roster, so a freshly-generated grid isn't built on a near-empty club.
const MIN_CLUB_PLAYERS = 8;
const MIN_NAT_PLAYERS = 6;
const MIN_CANDIDATES_PER_CELL = 3;
const MAX_ATTEMPTS = 300;

function buildCriterionPools(): { clubs: Criterion[]; natsAndPos: Criterion[] } {
  const clubCounts = new Map<string, number>();
  const natCounts = new Map<string, number>();
  PLAYERS.forEach((p) => {
    p.clubs.forEach((c) => clubCounts.set(c, (clubCounts.get(c) || 0) + 1));
    natCounts.set(p.nat, (natCounts.get(p.nat) || 0) + 1);
  });

  const clubs: Criterion[] = Array.from(clubCounts.entries())
    .filter(([, n]) => n >= MIN_CLUB_PLAYERS)
    .map(([value]) => ({ type: 'club', value, label: value }));

  const nats: Criterion[] = Array.from(natCounts.entries())
    .filter(([, n]) => n >= MIN_NAT_PLAYERS)
    .map(([value]) => ({ type: 'nat', value, label: NAT_FR[value] || value }));

  const positions: Criterion[] = POSITIONS.map((value) => ({ type: 'pos', value, label: POS_FR[value] || value }));

  return { clubs, natsAndPos: [...nats, ...positions] };
}

function pickN<T>(arr: T[], n: number): T[] {
  const pool = arr.slice();
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

export function generateGrid(): DuelGrid {
  const { clubs, natsAndPos } = buildCriterionPools();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rows = pickN(clubs, 3);
    const cols = pickN(natsAndPos, 3);
    if (rows.length < 3 || cols.length < 3) continue;

    const solvable = rows.every((r) => cols.every((c) => cellCandidates(r, c).length >= MIN_CANDIDATES_PER_CELL));
    if (solvable) return { rows, cols };
  }

  // Extremely unlikely fallback: the three biggest clubs against positions,
  // which are always well represented across the whole roster.
  const rows = clubs
    .slice()
    .sort((a, b) => cellCandidates(b, POSITIONS_CRITERION).length - cellCandidates(a, POSITIONS_CRITERION).length)
    .slice(0, 3);
  const cols: Criterion[] = POSITIONS.slice(0, 3).map((value) => ({ type: 'pos', value, label: POS_FR[value] || value }));
  return { rows, cols };
}

const POSITIONS_CRITERION: Criterion = { type: 'pos', value: 'AT', label: POS_FR.AT };

export const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export type CellOwner = 'creator' | 'opponent' | null;

export function checkWin(cells: CellOwner[], owner: 'creator' | 'opponent'): boolean {
  return WIN_LINES.some((line) => line.every((i) => cells[i] === owner));
}
