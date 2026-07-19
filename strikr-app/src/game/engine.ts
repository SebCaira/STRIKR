// Core "guess the player" game logic — ported from strikr-game.js, framework-agnostic.
import { Player } from '../data/players';

export type Level = 'easy' | 'medium' | 'hard';

const EASY_NAMES = [
  'Erling Haaland', 'Kylian Mbappé', 'Lionel Messi', 'Cristiano Ronaldo', 'Jude Bellingham',
  'Vinícius Júnior', 'Kevin De Bruyne', 'Mohamed Salah', 'Harry Kane', 'Robert Lewandowski',
  'Neymar Jr', 'Karim Benzema', 'Luka Modrić', 'Antoine Griezmann', 'Virgil van Dijk',
  'Toni Kroos', 'Son Heung-min', 'Phil Foden', 'Bukayo Saka', 'Pelé', 'Diego Maradona',
  'Zinédine Zidane', 'Ronaldo Nazário', 'Ronaldinho', 'Kaká', 'Luís Figo', 'Roberto Baggio',
  'Alessandro Del Piero', 'Fabio Cannavaro', 'Roberto Carlos', 'Cafu', 'Rivaldo', 'Xabi Alonso',
  'Sergio Agüero', 'David Silva', 'Cesc Fàbregas', 'Dani Alves', 'Thiago Silva', 'Thomas Müller',
  'Manuel Neuer', 'Joshua Kimmich',
];
const HARD_NAMES = [
  'Kalvin Phillips', 'Conor Gallagher', 'Levi Colwill', 'Bradley Barcola', 'Warren Zaïre-Emery',
  'Désiré Doué', 'Rayan Cherki', 'Michael Olise', 'Mathys Tel', 'Manu Koné', 'Malo Gusto',
  'Ferland Mendy', 'Nordi Mukiele', 'Corentin Tolisso', 'Wissam Ben Yedder', 'Jonathan David',
  'Youri Djorkaeff Jr', 'Rui Patrício', 'Andrea Barzagli', 'Emerson Palmieri', 'Miguel Almirón',
  'Andriy Lunin', 'Josip Iličić', 'Charles De Ketelaere', 'Serhou Guirassy', 'Andrej Kramarić',
  'Wesley Fofana',
];
const EASY_SET = new Set(EASY_NAMES);
const HARD_SET = new Set(HARD_NAMES);

export function tierOf(name: string): Level {
  return EASY_SET.has(name) ? 'easy' : HARD_SET.has(name) ? 'hard' : 'medium';
}

// Tuned so a first-try win roughly covers a hint (HINT_COSTS: 20-30 💎) —
// previously wins paid 2-6 💎, meaning ~10 wins for a single hint.
const REWARD_TABLE: Record<Level, { 1: number; rest23: number; rest4: number }> = {
  easy: { 1: 10, rest23: 6, rest4: 3 },
  medium: { 1: 15, rest23: 10, rest4: 5 },
  hard: { 1: 30, rest23: 20, rest4: 10 },
};

export function rewardFor(level: Level, attempt: number): number {
  const t = REWARD_TABLE[level] || REWARD_TABLE.medium;
  return attempt === 1 ? t[1] : attempt <= 3 ? t.rest23 : t.rest4;
}

// Bonus for consecutive wins within a session (resets the moment a round is
// lost) — distinct from the daily login streak used by the weekly mission.
export function streakMultiplier(winStreak: number): number {
  return winStreak >= 10 ? 2 : winStreak >= 5 ? 1.5 : 1;
}

const PALETTE = ['#ff5a3c', '#2b3ff2', '#ffb03c', '#a8f5c6', '#7a2b52', '#c9d8ff', '#2a6f4d', '#ffe66b', '#ffcae0'];

export function stripAcc(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function clubColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

export function clubInit(name: string): string {
  const w = (name || '').split(/\s+/).filter(Boolean);
  return w.slice(0, 2).map((x) => x[0]).join('').toUpperCase();
}

export const HINT_COSTS = { nat: 30, pos: 20, age: 30 };
// Wordle-style letter hints: a "present" letter just confirms it's somewhere
// in the name (cheaper, less info); a "placed" letter reveals it in position.
export const LETTER_HINT_COSTS = { present: 30, placed: 50 };
const LETTER_RE = /[a-zà-öø-ÿ]/i;

export interface LetterHints {
  placed: Record<number, string>;
  present: string[];
}

export function emptyLetterHints(): LetterHints {
  return { placed: {}, present: [] };
}

// Picks a random not-yet-placed letter index in `name` and reveals it in
// place. Returns the same object (no eligible index left) if nothing to add.
export function revealPlacedLetter(name: string, hints: LetterHints): LetterHints {
  const candidates: number[] = [];
  for (let i = 0; i < name.length; i++) {
    if (LETTER_RE.test(name[i]) && hints.placed[i] === undefined) candidates.push(i);
  }
  if (!candidates.length) return hints;
  const i = candidates[Math.floor(Math.random() * candidates.length)];
  return { ...hints, placed: { ...hints.placed, [i]: name[i] } };
}

// Picks a random letter (accent-stripped, lowercase) present somewhere in
// `name` that isn't already flagged, without revealing its position.
export function revealPresentLetter(name: string, hints: LetterHints): LetterHints {
  const known = new Set(hints.present);
  const candidates = new Set<string>();
  for (const ch of stripAcc(name).toLowerCase()) {
    if (LETTER_RE.test(ch) && !known.has(ch)) candidates.add(ch);
  }
  if (!candidates.size) return hints;
  const arr = Array.from(candidates);
  const letter = arr[Math.floor(Math.random() * arr.length)];
  return { ...hints, present: [...hints.present, letter] };
}

export function placedHintExhausted(name: string, hints: LetterHints): boolean {
  return [...name].every((ch, i) => !LETTER_RE.test(ch) || hints.placed[i] !== undefined);
}

export function presentHintExhausted(name: string, hints: LetterHints): boolean {
  const known = new Set(hints.present);
  for (const ch of stripAcc(name).toLowerCase()) {
    if (LETTER_RE.test(ch) && !known.has(ch)) return false;
  }
  return true;
}

export const FORFEIT_COST = 30;
export const GAME_WIN_XP = 250;
export const DAILY_WIN_XP = 100;
// Once every club is revealed, the player gets this many more wrong guesses
// before the round is forced to end and the answer is revealed.
export const MAX_GUESSES_AFTER_FULL_REVEAL = 2;

// Fisher-Yates. Used to pre-shuffle a level's player pool once, rather than
// drawing a fresh Math.random() index on every pick — a single weak/low
// first random value right after a cold app start would otherwise always
// land near the start of the (unshuffled, declaration-order) pool.
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function matchesGuess(player: Player, guess: string): boolean {
  const g = stripAcc(guess.trim().toLowerCase());
  if (!g) return false;
  const nameLc = stripAcc(player.n.toLowerCase());
  const lastLc = nameLc.split(' ').slice(-1)[0];
  return g === nameLc || g === lastLc;
}

export const FLAGS: Record<string, string> = {
  NO: 'Norway', FR: 'France', AR: 'Argentina', PT: 'Portugal', EN: 'England', BR: 'Brazil', ES: 'Spain',
  BE: 'Belgium', EG: 'Egypt', PL: 'Poland', HR: 'Croatia', KR: 'South_Korea', DE: 'Germany', UY: 'Uruguay',
  SN: 'Senegal', DZ: 'Algeria', MA: 'Morocco', GA: 'Gabon', CI: "Cote_d'Ivoire", CM: 'Cameroon', GH: 'Ghana',
  GN: 'Guinea', NL: 'Netherlands', IT: 'Italy', RS: 'Serbia', GE: 'Georgia', NG: 'Nigeria', SE: 'Sweden',
  PY: 'Paraguay', CO: 'Colombia', CA: 'Canada', SI: 'Slovenia', UA: 'Ukraine',
};

export function flagUrl(nat: string, width = 60): string | null {
  const country = FLAGS[nat];
  if (!country) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_${encodeURIComponent(country)}.svg?width=${width}`;
}

export const NAT_FR: Record<string, string> = {
  NO: 'NORVÈGE', FR: 'FRANCE', AR: 'ARGENTINE', PT: 'PORTUGAL', EN: 'ANGLETERRE', BR: 'BRÉSIL', ES: 'ESPAGNE',
  BE: 'BELGIQUE', EG: 'ÉGYPTE', PL: 'POLOGNE', HR: 'CROATIE', KR: 'CORÉE', DE: 'ALLEMAGNE', UY: 'URUGUAY',
  SN: 'SÉNÉGAL', DZ: 'ALGÉRIE', MA: 'MAROC', GA: 'GABON', CI: "CÔTE D'IVOIRE", CM: 'CAMEROUN', GH: 'GHANA',
  GN: 'GUINÉE', NL: 'PAYS-BAS', IT: 'ITALIE', RS: 'SERBIE', GE: 'GÉORGIE', NG: 'NIGERIA', SE: 'SUÈDE',
  PY: 'PARAGUAY', CO: 'COLOMBIE', CA: 'CANADA', SI: 'SLOVÉNIE', UA: 'UKRAINE',
};

export const POS_FR: Record<string, string> = { GK: 'GARDIEN', DF: 'DÉFENSEUR', MF: 'MILIEU', AT: 'ATTAQUANT' };
