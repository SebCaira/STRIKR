// Card collection: every player ever solved in "Devine le joueur" (solo)
// is already tracked permanently via useSolvedPlayers (see state/solvedPlayers.tsx)
// — that Set IS the collection, no separate storage needed. This file only
// adds the one-time diamond bonus and the rarity used to display cards.
import { CLUB_DATA } from '../data/clubData';
import { Player } from '../data/players';

// Awarded once, the first time a player's card is obtained — rides on the
// existing daily reward cap (GAME_REWARDED_WINS_PER_DAY in engine.ts)
// instead of a separate one, so it can't become a new uncapped diamond
// source: no bonus on a capped win, same as the base reward.
export const CARD_BONUS_DIAMONDS = 5;

export type CardRarity = 'commune' | 'rare' | 'legendaire';

// Derived from the biggest stadium capacity among a player's clubs
// (already collected in clubData.ts from Wikidata) — no new data to
// maintain just for rarity.
export function cardRarity(player: Player): CardRarity {
  let maxCapacity = 0;
  for (const club of player.clubs) {
    const capacity = CLUB_DATA[club]?.capacity;
    if (capacity && capacity > maxCapacity) maxCapacity = capacity;
  }
  if (maxCapacity >= 60000) return 'legendaire';
  if (maxCapacity >= 40000) return 'rare';
  return 'commune';
}
