// Year ranges for each club in a player's career (aligned by index with
// `clubs` in players.ts), used to show e.g. "2018-2021" under a revealed
// club. Empty until filled in by scripts/build-player-club-dates.js (run
// from an environment with real internet access — Wikidata isn't reachable
// from this dev sandbox). Missing years are left out entirely rather than
// guessed.
export interface ClubStint {
  club: string;
  start: number | null;
  end: number | null;
}

export const PLAYER_CLUB_YEARS: Record<string, ClubStint[]> = {};

export function clubYearsLabel(playerName: string, clubIndex: number): string | null {
  const stints = PLAYER_CLUB_YEARS[playerName];
  const stint = stints?.[clubIndex];
  if (!stint) return null;
  if (stint.start && stint.end) return `${stint.start}-${stint.end}`;
  if (stint.start && !stint.end) return `${stint.start}-`;
  if (!stint.start && stint.end) return `-${stint.end}`;
  return null;
}
