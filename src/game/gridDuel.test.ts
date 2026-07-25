// Guards the exact regression fixed this session: VALID_GRIDS must only
// ever contain combos where every one of the 9 cells has at least one real
// match on the current players.ts roster — otherwise generateGrid() can
// hand out an unsolvable grid. If this test starts failing, players.ts
// changed enough that some entries in VALID_GRIDS no longer hold up and the
// list needs regenerating (see the comment above VALID_GRIDS in gridDuel.ts).
import { cellCandidates, checkWin, generateGrid, matchesCriteria, WIN_LINES, Criterion } from './gridDuel';
import { PLAYERS } from '../data/players';

describe('generateGrid', () => {
  it('always returns a grid where every one of the 9 cells has a real match', () => {
    for (let i = 0; i < 200; i++) {
      const grid = generateGrid();
      expect(grid.rows).toHaveLength(3);
      expect(grid.cols).toHaveLength(3);
      grid.rows.forEach((rowC) => {
        grid.cols.forEach((colC) => {
          expect(cellCandidates(rowC, colC).length).toBeGreaterThan(0);
        });
      });
    }
  });

  it('produces more than one distinct grid across repeated calls (not stuck on a fallback)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const grid = generateGrid();
      seen.add(JSON.stringify([grid.rows.map((r) => r.value), grid.cols.map((c) => c.value)]));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('matchesCriteria', () => {
  const clubCriterion: Criterion = { type: 'club', value: 'Real Madrid', label: 'Real Madrid' };
  const natCriterion: Criterion = { type: 'nat', value: 'FR', label: 'France' };

  it('finds a player by name, case- and accent-insensitive', () => {
    const found = matchesCriteria(
      'kylian mbappe',
      { type: 'club', value: 'Real Madrid', label: 'Real Madrid' },
      { type: 'nat', value: 'FR', label: 'France' }
    );
    expect(found?.n).toBe('Kylian Mbappé');
  });

  it('returns null when the named player does not satisfy both criteria', () => {
    // Messi never played for Real Madrid.
    expect(matchesCriteria('Lionel Messi', clubCriterion, natCriterion)).toBeNull();
  });

  it('returns null for a name not in the roster', () => {
    expect(matchesCriteria('Nobody Real', clubCriterion, natCriterion)).toBeNull();
  });
});

describe('checkWin', () => {
  it('detects a completed row', () => {
    const cells = ['creator', 'creator', 'creator', null, null, null, null, null, null] as const;
    expect(checkWin([...cells], 'creator')).toBe(true);
  });

  it('detects a completed diagonal', () => {
    const cells = ['creator', null, null, null, 'creator', null, null, null, 'creator'] as const;
    expect(checkWin([...cells], 'creator')).toBe(true);
  });

  it('does not award a win to the wrong owner', () => {
    const cells = ['creator', 'creator', 'creator', null, null, null, null, null, null] as const;
    expect(checkWin([...cells], 'opponent')).toBe(false);
  });

  it('reports no win on an empty board', () => {
    expect(checkWin(new Array(9).fill(null), 'creator')).toBe(false);
  });

  it('covers exactly the 8 standard tic-tac-toe lines', () => {
    expect(WIN_LINES).toHaveLength(8);
  });
});

describe('cellCandidates', () => {
  it('only returns players who satisfy both the row and column criteria', () => {
    const rowC: Criterion = { type: 'club', value: 'Real Madrid', label: 'Real Madrid' };
    const colC: Criterion = { type: 'nat', value: 'FR', label: 'France' };
    const candidates = cellCandidates(rowC, colC);
    expect(candidates.length).toBeGreaterThan(0);
    candidates.forEach((p) => {
      expect(p.clubs).toContain('Real Madrid');
      expect(p.nat).toBe('FR');
    });
  });

  it('returns an empty list for a combo nobody on the roster satisfies', () => {
    const rowC: Criterion = { type: 'club', value: 'A Club That Does Not Exist', label: 'x' };
    const colC: Criterion = { type: 'nat', value: 'FR', label: 'France' };
    expect(cellCandidates(rowC, colC)).toEqual([]);
  });
});

describe('roster sanity', () => {
  it('has at least one player (guards against an accidentally emptied players.ts)', () => {
    expect(PLAYERS.length).toBeGreaterThan(0);
  });
});
