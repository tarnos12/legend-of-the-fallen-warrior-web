'use strict';

// Boss Souls — the guaranteed acquisition path for boss uniques (2026-07 rework,
// Phase "Souls"). Every area-boss kill drops SOUL_DROP souls (2x for shiny); the
// Soul Shop (ui/soulShopUI.js) spends them to buy ANY unlocked boss's signature
// unique at the player's current level. This removes both problems of the old
// model: the 20% RNG (souls are guaranteed) and the slot-gating (you can buy any
// unlocked area's unique instead of grinding one boss). The RNG drop
// (itemDrop.rollBossUnique) still exists as a lucky bonus on top.

import { BOSS_UNIQUES } from './bossUniques.js';

export const SOUL_DROP = 1; // souls per area-boss kill (doubled for shiny)

// Which area each boss belongs to (static; the boss monster's `area`). Kept
// explicit rather than derived from monsterList, which is built at init time.
const BOSS_AREA = {
    LordVarik: 'BanditHideout',
    JotunnScout: 'ForestofNarsus',
    DeepKingTarNuk: 'OzJotnar',
    Keeper: 'TwistedMarrow',
    GrelChief: 'KharmSheath',
    FrightGolem: 'FrigidAberration',
    TorturedBeholder: 'Zyzx',
};

// Purchasable uniques, one per area boss, cheapest first. `price` (buy) scales
// with the area's position in the chain; `reforgePrice` (re-roll an owned copy
// at the player's current level) is cheaper since you sacrifice the old item.
export const SOUL_SHOP = Object.keys(BOSS_UNIQUES).map((bossName, i) => ({
    bossName,
    areaType: BOSS_AREA[bossName],
    def: BOSS_UNIQUES[bossName][0],
    price: 3 + i * 2, // 3, 5, 7, 9, 11, 13, 15
    reforgePrice: Math.max(1, Math.ceil((3 + i * 2) / 2)), // 2, 3, 4, 5, 6, 7, 8
}));

export function soulShopEntry(bossName) {
    return SOUL_SHOP.find((e) => e.bossName === bossName) || null;
}
