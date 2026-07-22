import { matchesGuess, rewardFor, shuffle, streakMultiplier, stripAcc, tierOf } from './engine';
import { PLAYERS } from '../data/players';

describe('tierOf', () => {
  it('classifies a known easy name as easy', () => {
    expect(tierOf('Lionel Messi')).toBe('easy');
  });

  it('classifies a known hard name as hard', () => {
    expect(tierOf('Wesley Fofana')).toBe('hard');
  });

  it('falls back to medium for anything not explicitly listed', () => {
    expect(tierOf('Someone Unlisted')).toBe('medium');
  });
});

describe('rewardFor', () => {
  it('pays more on the first attempt than later ones, for every level', () => {
    (['easy', 'medium', 'hard'] as const).forEach((level) => {
      const first = rewardFor(level, 1);
      const midway = rewardFor(level, 2);
      const late = rewardFor(level, 4);
      expect(first).toBeGreaterThan(midway);
      expect(midway).toBeGreaterThan(late);
    });
  });

  it('treats attempts 2 and 3 the same, and any attempt >= 4 the same', () => {
    expect(rewardFor('medium', 2)).toBe(rewardFor('medium', 3));
    expect(rewardFor('medium', 4)).toBe(rewardFor('medium', 9));
  });

  it('falls back to the medium table for an unrecognized level', () => {
    expect(rewardFor('unknown' as any, 1)).toBe(rewardFor('medium', 1));
  });
});

describe('streakMultiplier', () => {
  it('is 1x below the first threshold', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(5)).toBe(1);
  });

  it('is 1.5x from 6 wins, 2x from 15 wins', () => {
    expect(streakMultiplier(6)).toBe(1.5);
    expect(streakMultiplier(14)).toBe(1.5);
    expect(streakMultiplier(15)).toBe(2);
    expect(streakMultiplier(100)).toBe(2);
  });
});

describe('stripAcc', () => {
  it('removes accents but keeps the rest of the string intact', () => {
    expect(stripAcc('Kylian Mbappé')).toBe('Kylian Mbappe');
    expect(stripAcc('N\'Golo Kanté')).toBe('N\'Golo Kante');
  });

  it('handles empty/undefined input without throwing', () => {
    expect(stripAcc('')).toBe('');
    expect(stripAcc(undefined as any)).toBe('');
  });
});

describe('matchesGuess', () => {
  const messi = PLAYERS.find((p) => p.n === 'Lionel Messi')!;

  it('matches the full name, case- and accent-insensitive', () => {
    expect(matchesGuess(messi, 'lionel messi')).toBe(true);
    expect(matchesGuess(messi, 'LIONEL MESSI')).toBe(true);
  });

  it('matches on last name alone', () => {
    expect(matchesGuess(messi, 'messi')).toBe(true);
  });

  it('rejects an unrelated guess', () => {
    expect(matchesGuess(messi, 'ronaldo')).toBe(false);
  });

  it('rejects an empty guess', () => {
    expect(matchesGuess(messi, '   ')).toBe(false);
  });
});

describe('shuffle', () => {
  it('returns an array with the same elements, just reordered', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle([...original]);
    expect(result.slice().sort()).toEqual(original.slice().sort());
  });
});
