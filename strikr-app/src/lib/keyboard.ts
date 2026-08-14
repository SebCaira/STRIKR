import { Lang } from '../i18n/i18n';

// On-screen keyboard rows shown across every guessing game (Devine le
// joueur, Duel, Devine le club, Mode inverse, Mode Liste, Grille, Défi du
// jour, XI Duel) — was hardcoded to French AZERTY independently in each of
// those 9 screens, so switching the app to English/Spanish left the
// keyboard in French no matter what. One shared lookup, keyed by the
// current app language, used everywhere instead.
export const KEY_ROWS_BY_LANG: Record<Lang, string[]> = {
  fr: ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'],
  en: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'],
  es: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'],
};
