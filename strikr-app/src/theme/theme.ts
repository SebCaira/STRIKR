// STRIKR design tokens — "Sticker Album" style: cream backgrounds, thick ink
// borders, hard offset shadows (no blur), playful accent colors that never
// change between light/dark — only neutral chrome flips.
export const accent = {
  coral: '#ff5a3c',
  blue: '#2b3ff2',
  mint: '#a8f5c6',
  yellow: '#ffe66b',
  pink: '#ffcae0',
  lightBlue: '#c9d8ff',
  wrongRed: '#ffd6d0',
};

export interface ThemeColors {
  bg: string;
  card: string;
  track: string;
  ink: string;
  border: string;
  muted: string;
  mutedStrong: string;
}

export const lightColors: ThemeColors = {
  bg: '#fff8ee',
  card: '#ffffff',
  track: '#f0eadf',
  ink: '#1a1a1a',
  border: '#1a1a1a',
  muted: 'rgba(0,0,0,.55)',
  mutedStrong: 'rgba(0,0,0,.7)',
};

export const darkColors: ThemeColors = {
  bg: '#15130f',
  card: '#211d17',
  track: '#2a251c',
  ink: '#f0e9d8',
  border: '#55503f',
  muted: 'rgba(240,233,216,.55)',
  mutedStrong: 'rgba(240,233,216,.75)',
};

export const radii = { sm: 8, md: 12, lg: 18, pill: 999 };

export const fonts = {
  display: 'InterTight_900Black',
  displayBold: 'InterTight_800ExtraBold',
  displaySemibold: 'InterTight_700Bold',
  body: 'SpaceGrotesk_500Medium',
  bodySemibold: 'SpaceGrotesk_600SemiBold',
  mono: 'JetBrainsMono_700Bold',
  monoMedium: 'JetBrainsMono_500Medium',
};

export function hardShadow(color: string, offset = 3) {
  return {
    shadowColor: color,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: offset,
  };
}
