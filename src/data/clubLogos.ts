// Verified club logo URLs, built once from Wikidata (P154) by
// build-club-logos.js rather than searched live on every render — see that
// script for why. Checked against wikiOverrides.ts's manual corrections
// first (higher priority); this file is the second line of defense before
// falling back to a live, less reliable search. Empty until the script is
// run from an environment with real internet access (Wikidata isn't
// reachable from this dev sandbox).
export const CLUB_LOGOS: Record<string, string> = {};
