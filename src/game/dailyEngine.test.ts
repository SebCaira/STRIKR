import {
  computeFeedback,
  pickHintIndex,
  pickHintPresentLetter,
  rewardForTries,
  targetLetters,
} from './dailyEngine';

describe('computeFeedback', () => {
  it('marks every letter exact on a perfect guess', () => {
    const target = ['H', 'A', 'A', 'L', 'A', 'N', 'D'];
    expect(computeFeedback([...target], target)).toEqual(target.map(() => 'exact'));
  });

  it('marks a letter absent when it is nowhere in the target', () => {
    expect(computeFeedback(['Z'], ['A'])).toEqual(['absent']);
  });

  it('marks a letter present when it is in the target but the wrong spot', () => {
    expect(computeFeedback(['A', 'B'], ['B', 'A'])).toEqual(['present', 'present']);
  });

  // Wordle's classic double-letter trap: a repeated guessed letter should
  // only be flagged "present" as many times as it actually remains in the
  // target after exact matches are accounted for, not once per occurrence
  // in the guess.
  it('does not over-credit a repeated letter beyond how many times it appears in the target', () => {
    const target = ['A', 'B', 'C', 'D'];
    const guess = ['A', 'A', 'A', 'A'];
    expect(computeFeedback(guess, target)).toEqual(['exact', 'absent', 'absent', 'absent']);
  });

  it('prioritizes exact matches before handing out present flags for the same letter', () => {
    const target = ['A', 'X', 'A', 'Y'];
    const guess = ['A', 'A', 'Z', 'Z'];
    // index 0: exact ('A' === 'A'); index 2: 'A' is present (target has a
    // second 'A' at index 2, already consumed by the exact match at 0... but
    // that one is at a different position, so one 'A' remains unconsumed).
    expect(computeFeedback(guess, target)).toEqual(['exact', 'present', 'absent', 'absent']);
  });
});

describe('rewardForTries', () => {
  it('pays the most for a first-try win', () => {
    expect(rewardForTries(1)).toBe(50);
  });

  it('pays a middle amount for tries 2-3', () => {
    expect(rewardForTries(2)).toBe(25);
    expect(rewardForTries(3)).toBe(25);
  });

  it('pays the minimum for try 4 and beyond', () => {
    expect(rewardForTries(4)).toBe(10);
    expect(rewardForTries(6)).toBe(10);
  });
});

describe('targetLetters', () => {
  it('extracts the uppercased, accent-stripped last name', () => {
    expect(targetLetters({ n: 'Kylian Mbappé', nat: 'FR', dob: 1998, pos: 'AT', clubs: [] })).toEqual(
      'MBAPPE'.split('')
    );
  });
});

describe('pickHintIndex', () => {
  it('never returns an already-locked index', () => {
    const target = ['A', 'B', 'C', 'D'];
    const locked = { 0: 'A', 1: 'B' };
    for (let i = 0; i < 20; i++) {
      const idx = pickHintIndex(target, locked);
      expect(idx).not.toBeNull();
      expect(locked[idx as number]).toBeUndefined();
    }
  });

  it('returns null once everything is locked', () => {
    const target = ['A', 'B'];
    expect(pickHintIndex(target, { 0: 'A', 1: 'B' })).toBeNull();
  });
});

describe('pickHintPresentLetter', () => {
  it('never returns a letter that is already locked or already hinted', () => {
    const target = ['A', 'B', 'C'];
    for (let i = 0; i < 20; i++) {
      const letter = pickHintPresentLetter(target, { 0: 'A' }, ['B']);
      expect(letter).toBe('C');
    }
  });

  it('returns null once every letter is already known', () => {
    const target = ['A', 'B'];
    expect(pickHintPresentLetter(target, { 0: 'A', 1: 'B' }, [])).toBeNull();
  });
});
