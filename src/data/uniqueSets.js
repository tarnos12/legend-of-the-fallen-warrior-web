'use strict';

// "Fallen Legends" unique set (2026-07). A single collection set that rewards
// wearing multiple boss uniques at once. The 7 signature uniques span slots
// weapon / shield / amulet / talisman, so at most FOUR can be equipped together
// (the four weapon uniques compete for the one weapon slot). Bonuses scale with
// the number of distinct boss uniques currently EQUIPPED and are computed live
// from equippedItems (no persistence needed) — see core.js equippedUniqueCount /
// uniqueSetBonus, folded into damage / defense / magic-find / gold.

export const UNIQUE_SET_NAME = 'Fallen Legends';
export const UNIQUE_SET_MAX = 4; // most uniques wearable at once

// Bonus by piece count (index = pieces equipped). 0-1 pieces: no set bonus.
// damage/defense are % (folded into the bonusDamage/bonusDefense multipliers);
// magicFind/gold are flat points (added to the summed find/gold rates).
export const UNIQUE_SET_TIERS = [
    {}, // 0
    {}, // 1
    { damage: 6, defense: 6, magicFind: 0, gold: 0 }, // 2 pieces
    { damage: 12, defense: 12, magicFind: 4, gold: 4 }, // 3 pieces
    { damage: 20, defense: 20, magicFind: 8, gold: 8 }, // 4 pieces
];

// The active bonus for a given equipped-piece count (clamped to the table).
export function uniqueSetBonus(pieces) {
    const i = Math.max(0, Math.min(pieces, UNIQUE_SET_TIERS.length - 1));
    return UNIQUE_SET_TIERS[i] || {};
}
