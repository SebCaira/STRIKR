// Core "guess the player" game logic — ported from strikr-game.js, framework-agnostic.
import { Player } from '../data/players';

export type Level = 'easy' | 'medium' | 'hard';
export type CategoryId = 'gk' | 'forward' | 'legends' | 'ligue1';

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

export const LEVELS: Level[] = ['easy', 'medium', 'hard'];

const LIGUE1_CLUBS = new Set([
  'Paris Saint-Germain', 'Olympique Lyonnais', 'Lyon', 'Marseille', 'Lille', 'AS Monaco', 'Monaco',
  'Nice', 'OGC Nice', 'Rennes', 'Nantes', 'Bordeaux', 'Lens', 'Montpellier', 'Toulouse', 'Reims',
  'Strasbourg', 'Saint-Étienne',
]);

export const CATEGORIES: Record<CategoryId, { emoji: string; match: (p: Player) => boolean }> = {
  gk: { emoji: '\u{1F9E4}', match: (p) => p.pos === 'GK' },
  forward: { emoji: '⚽', match: (p) => p.pos === 'AT' },
  legends: { emoji: '\u{1F31F}', match: (p) => (p.dob || 9999) <= 1990 },
  ligue1: { emoji: '\u{1F1EB}\u{1F1F7}', match: (p) => (p.clubs || []).some((c) => LIGUE1_CLUBS.has(c)) },
};

const REWARD_TABLE: Record<Level, { 1: number; rest23: number; rest4: number }> = {
  easy: { 1: 2, rest23: 1, rest4: 1 },
  medium: { 1: 3, rest23: 2, rest4: 1 },
  hard: { 1: 6, rest23: 4, rest4: 2 },
};

export function rewardFor(level: Level, solvedAt: number): number {
  const t = REWARD_TABLE[level] || REWARD_TABLE.medium;
  return solvedAt === 1 ? t[1] : solvedAt <= 3 ? t.rest23 : t.rest4;
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
export const FORFEIT_COST = 30;
export const GAME_WIN_XP = 250;
export const DAILY_WIN_XP = 100;

export function poolForLevel(players: Player[], level: Level, category: CategoryId | null, fullPool: number[]): number[] {
  const arr: number[] = [];
  players.forEach((p, i) => {
    if (!p.clubs || p.clubs.length < 3) return;
    if (tierOf(p.n) !== level) return;
    if (category && CATEGORIES[category] && !CATEGORIES[category].match(p)) return;
    arr.push(i);
  });
  if (arr.length) return arr;
  if (category) {
    const catOnly: number[] = [];
    players.forEach((p, j) => {
      if (p.clubs && p.clubs.length >= 3 && CATEGORIES[category].match(p)) catOnly.push(j);
    });
    if (catOnly.length) return catOnly;
  }
  return fullPool;
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
