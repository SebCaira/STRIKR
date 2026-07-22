// Club logos + player photos, resolved from verified static data only — no
// live Wikidata/Wikipedia search. That live search used to be the fallback
// when nothing was found in the overrides below, but it was too unreliable
// (wrong-entity matches producing wrong crests/photos), so the whole roster
// was verified offline once and is looked up here instead.
import { LOGO_OVERRIDES, PHOTO_OVERRIDES } from '../data/wikiOverrides';
import { CLUB_LOGOS } from '../data/clubLogos';

// players.ts sometimes names a club/player differently than the verified
// data (short name, reserve-team suffix, a typo) — these are the same
// entity, so point the lookup at the verified key instead of showing no
// image at all.
const CLUB_ALIASES: Record<string, string> = {
  Wolfsburg: 'VfL Wolfsburg II',
  Norwich: 'Norwich City',
  Leicester: 'Leicester City',
  Stuttgart: 'VfB Stuttgart',
  Barcelona: 'FC Barcelona',
  Coventry: 'Coventry City',
  'Marseille B': 'Marseille',
  Newcastle: 'Newcastle United',
  Swansea: 'Swansea City',
  'West Brom': 'West Bromwich',
  Verona: 'Hellas Verona',
};

const PLAYER_ALIASES: Record<string, string> = {
  'Rodrygo Bentancur': 'Rodrigo Bentancur',
  'Ronaldinho Gaúcho': 'Ronaldinho',
};

export async function getClubLogo(clubName: string): Promise<string | null> {
  if (!clubName) return null;
  const name = CLUB_ALIASES[clubName] || clubName;
  return LOGO_OVERRIDES[name] || CLUB_LOGOS[name] || null;
}

export async function getPlayerPhoto(playerName: string): Promise<string | null> {
  if (!playerName) return null;
  const name = PLAYER_ALIASES[playerName] || playerName;
  return PHOTO_OVERRIDES[name] || null;
}
