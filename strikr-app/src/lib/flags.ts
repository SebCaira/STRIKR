// Flag emoji for the nationality codes used across the app (see NAT_FR in
// game/engine.ts). Standard ISO 3166-1 alpha-2 codes convert directly to
// regional indicator symbols; a few codes used for player nationality
// aren't real country codes (England has no ISO code of its own) and need
// an explicit flag.
const SPECIAL_FLAGS: Record<string, string> = {
  EN: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
};

export function flagEmoji(code: string): string {
  if (!code) return '';
  if (SPECIAL_FLAGS[code]) return SPECIAL_FLAGS[code];
  if (code.length !== 2) return '';
  const points = code
    .toUpperCase()
    .split('')
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...points);
}
