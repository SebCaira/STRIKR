// Manual corrections for club logos / player photos that the automatic
// Wikidata/Wikipedia lookup gets wrong. Human-verified via the design
// team's "Logo Review" pass — these take priority over any live lookup,
// and are now the ONLY source used (no more live Wikidata search).
//
// The actual data lives in wikiOverridesData.json rather than inline here:
// some entries are base64 data URIs (a few MB total), and Metro's JSON
// parser handles a blob that size far faster at startup than evaluating an
// equivalent JS object literal with thousands of escaped-string properties.
import wikiOverridesData from './wikiOverridesData.json';

export const LOGO_OVERRIDES: Record<string, string> = wikiOverridesData.logos;
export const PHOTO_OVERRIDES: Record<string, string> = wikiOverridesData.photos;
