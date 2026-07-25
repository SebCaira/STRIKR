// Badge definitions, derived live from permanent (never-reset) stats fields
// so a badge, once unlocked, never disappears. Deliberately excludes the
// "today" stats fields (those reset daily and would make a badge flicker).
import { StatsData } from '../state/stats';

export interface BadgeDef {
  id: string;
  icon: string;
  bg: string;
  label: string;
  isUnlocked: (stats: StatsData, level: number) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'first_win', icon: '⚽', bg: '#ffe66b', label: 'Premier pas', isUnlocked: (s) => s.solves >= 1 },
  { id: 'win_5', icon: '🔥', bg: '#ff5a3c', label: '5 victoires', isUnlocked: (s) => s.solves >= 5 },
  { id: 'win_25', icon: '🏆', bg: '#2b3ff2', label: '25 victoires', isUnlocked: (s) => s.solves >= 25 },
  { id: 'win_100', icon: '👑', bg: '#7a2b52', label: '100 victoires', isUnlocked: (s) => s.solves >= 100 },
  { id: 'first_try_1', icon: '⚡', bg: '#a8f5c6', label: 'Précision', isUnlocked: (s) => s.firstTryWins >= 1 },
  { id: 'first_try_10', icon: '🎪', bg: '#ffcae0', label: 'Tireur d’élite', isUnlocked: (s) => s.firstTryWins >= 10 },
  { id: 'streak_3', icon: '💪', bg: '#ffe66b', label: 'Série de 3', isUnlocked: (s) => s.bestStreak >= 3 },
  { id: 'streak_7', icon: '🌟', bg: '#ff5a3c', label: 'Série de 7', isUnlocked: (s) => s.bestStreak >= 7 },
  { id: 'streak_30', icon: '🚀', bg: '#2b3ff2', label: 'Série de 30', isUnlocked: (s) => s.bestStreak >= 30 },
  { id: 'level_5', icon: '📈', bg: '#a8f5c6', label: 'Niveau 5', isUnlocked: (_s, level) => level >= 5 },
  { id: 'level_10', icon: '📊', bg: '#ffcae0', label: 'Niveau 10', isUnlocked: (_s, level) => level >= 10 },
  { id: 'xp_1000', icon: '💎', bg: '#7a2b52', label: '1000 XP', isUnlocked: (s) => s.xp >= 1000 },
];
