// Daily Wordle-style challenge logic — ported from strikr-daily.js.
import { Player } from '../data/players';
import { stripAcc } from './engine';

export const MAX_ROWS = 6;

export function todaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
}

export function pickDailyPlayer(pool: Player[]): Player | null {
  if (!pool.length) return null;
  let eligible = pool.filter((p) => {
    const last = stripAcc(p.n.split(' ').slice(-1)[0]).replace(/[^A-Za-z]/g, '');
    return last.length >= 3 && last.length <= 10;
  });
  if (!eligible.length) eligible = pool;
  const idx = todaySeed() % eligible.length;
  return eligible[idx];
}

export function targetLetters(player: Player): string[] {
  return stripAcc(player.n.split(' ').slice(-1)[0])
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .split('');
}

export type LetterFeedback = 'exact' | 'present' | 'absent';

export function computeFeedback(guessLetters: string[], target: string[]): LetterFeedback[] {
  const n = target.length;
  const result: LetterFeedback[] = new Array(n).fill('absent');
  const counts: Record<string, number> = {};
  const used: boolean[] = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (guessLetters[i] === target[i]) {
      result[i] = 'exact';
      used[i] = true;
    }
  }
  for (let i = 0; i < n; i++) {
    if (!used[i]) counts[target[i]] = (counts[target[i]] || 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (result[i] === 'exact') continue;
    const g = guessLetters[i];
    if (counts[g] > 0) {
      result[i] = 'present';
      counts[g]--;
    }
  }
  return result;
}

export function rewardForTries(n: number): number {
  if (n === 1) return 50;
  if (n === 2 || n === 3) return 25;
  return 10;
}

// Picks a random not-yet-locked position to reveal in place — the paid
// equivalent of getting an "exact" tile without spending a guess row.
export function pickHintIndex(target: string[], locked: Record<number, string>): number | null {
  const candidates: number[] = [];
  for (let i = 0; i < target.length; i++) {
    if (!locked[i]) candidates.push(i);
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Picks a random letter that's in the word but not yet known (locked or
// already hinted-present) — the paid equivalent of a "present" tile.
export function pickHintPresentLetter(target: string[], locked: Record<number, string>, alreadyHinted: string[]): string | null {
  const known = new Set([...Object.values(locked), ...alreadyHinted]);
  const candidates = Array.from(new Set(target)).filter((l) => !known.has(l));
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
