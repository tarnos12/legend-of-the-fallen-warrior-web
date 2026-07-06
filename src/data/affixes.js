'use strict';

// Curated affix pools (2026-07 item redesign). Every equipment slot rolls
// ONLY from its own prefix/suffix lists, so a shield can never roll crit and
// a sword can never roll armor. Rarity buys affix SLOTS (not raw multipliers);
// the compressed power curve lives in data/gameObjects.js itemRarity.power.
//
//   prefix  = "power"    — what the item DOES (damage, crit, armor, block…)
//   suffix  = "utility"  — what it GIVES (attributes, find/gold/exp, life…)
//
// `key` MUST match the stat name the player reads (core.js sumEquippedStat /
// the weapon+shield live reads / the fold-at-generation Bonus damage/armor),
// or the affix would display but do nothing. `kind` tells itemDrop how to roll
// and apply the value:
//   attr        summed attribute, value = floor(rand in [min·iLvl·0.5, max·iLvl])
//   util        summed utility (same scaling as attr; Value uses baseValue)
//   foldDamage  % that folds into weapon MinDamage/MaxDamage at generation
//   foldArmor   % that folds into armor defense at generation
//   flatCrit    live-read weapon/accessory crit %, value = rand(min..max)+iLvl/5
//   flatDamage  live-read accessory % bonus damage (NOT folded — accessories
//               have no weapon damage to fold into), value = rand(min..max)+iLvl/10
//   behavior    weaponBehavior special (%): value 5–10, Legendary 10–20
//   targets     +N cleave/pierce/splash targets (weaponBehavior)
//   block       shield block chance/amount (kept innate; see itemDrop)

// baseValue mirrors the old itemModifiers baseValue (drives item gold Value).
const A = {
    // attributes
    allAttr: { key: 'All attributes', label: 'All Attributes', kind: 'attr', min: 1, max: 2, baseValue: 50 },
    str: { key: 'Strength', label: 'Strength', kind: 'attr', min: 1, max: 4, baseValue: 10 },
    end: { key: 'Endurance', label: 'Endurance', kind: 'attr', min: 1, max: 4, baseValue: 10 },
    agi: { key: 'Agility', label: 'Agility', kind: 'attr', min: 1, max: 4, baseValue: 10 },
    dex: { key: 'Dexterity', label: 'Dexterity', kind: 'attr', min: 1, max: 4, baseValue: 10 },
    wis: { key: 'Wisdom', label: 'Wisdom', kind: 'attr', min: 1, max: 4, baseValue: 10 },
    int: { key: 'Intelligence', label: 'Intelligence', kind: 'attr', min: 1, max: 4, baseValue: 10 },
    luck: { key: 'Luck', label: 'Luck', kind: 'attr', min: 1, max: 4, baseValue: 10 },
    // utility (summed)
    life: { key: 'Bonus life', label: 'Bonus Life', kind: 'util', min: 5, max: 10, baseValue: 5 },
    mana: { key: 'Bonus mana', label: 'Bonus Mana', kind: 'util', min: 5, max: 10, baseValue: 3 },
    magicFind: { key: 'Magic find', label: 'Magic Find', kind: 'util', min: 1, max: 3, baseValue: 10 },
    gold: { key: 'Gold drop', label: 'Gold Find', kind: 'util', min: 1, max: 3, baseValue: 10 },
    exp: { key: 'Experience rate', label: 'Experience', kind: 'util', min: 1, max: 3, baseValue: 10 },
    lifeOnHit: { key: 'Life gain on hit', label: 'Life on Hit', kind: 'util', min: 1, max: 2, baseValue: 15 },
    // weapon / ring power
    bonusDamage: { key: 'Bonus damage', label: 'Bonus Damage %', kind: 'foldDamage', min: 5, max: 10, baseValue: 20 },
    // accessory version of bonus damage: a modest LIVE % (read by core, not
    // folded into weapon damage), so rings can add offense without a weapon base
    accDamage: { key: 'Bonus damage', label: 'Bonus Damage %', kind: 'flatDamage', min: 3, max: 6, baseValue: 20 },
    crit: { key: 'Critical chance', label: 'Crit Chance %', kind: 'flatCrit', min: 3, max: 8, baseValue: 25 },
    attackSpeed: { key: 'Attack speed', label: 'Attack Speed %', kind: 'behavior', baseValue: 15 },
    stun: { key: 'Stun chance', label: 'Stun Chance %', kind: 'behavior', baseValue: 15 },
    extraTargets: { key: 'Extra targets', label: 'Extra Target', kind: 'targets', baseValue: 200 },
    // armor power
    bonusArmor: { key: 'Bonus armor', label: 'Bonus Armor %', kind: 'foldArmor', min: 5, max: 10, baseValue: 20 },
};

// Per-slot pools. Every affix here is a key the slot's equip actually
// contributes to the player: fold-damage/crit/speed/stun/targets/life-on-hit
// apply on WEAPONS only, fold-armor on ARMOR only, and the rest are summed
// attributes/utility that work in any slot. Accessories additionally carry LIVE
// offensive affixes — direct crit (flatCrit) and % bonus damage (flatDamage) —
// which core.js now reads off ring/amulet slots, so a ring is a real offense
// piece rather than only an attribute stick. The weaponBehavior specials
// (Attack speed/Stun/Extra targets) and Life-on-hit stay weapon-only (the engine
// reads them off the equipped weapon). Prefix = the slot's power identity,
// suffix = flavor/utility; rarity buys how many of each.
export const AFFIX_POOLS = {
    // ---- weapons (all subtypes share this pool for v1) ----
    weapon: {
        prefixes: [A.bonusDamage, A.crit, A.attackSpeed, A.stun, A.extraTargets],
        suffixes: [A.str, A.dex, A.int, A.wis, A.allAttr, A.lifeOnHit, A.mana],
    },
    // ---- armor (Bonus armor folds into defense; life/mana/attrs are summed) ----
    chest: {
        prefixes: [A.bonusArmor, A.life],
        suffixes: [A.end, A.str, A.allAttr],
    },
    legs: {
        prefixes: [A.bonusArmor, A.life],
        suffixes: [A.end, A.agi, A.allAttr],
    },
    helmet: {
        prefixes: [A.bonusArmor, A.mana],
        suffixes: [A.wis, A.int, A.magicFind, A.allAttr],
    },
    boots: {
        prefixes: [A.bonusArmor, A.life],
        suffixes: [A.agi, A.dex, A.allAttr],
    },
    shield: {
        // block is innate (see itemDrop); affixes add armor + endurance/life
        prefixes: [A.bonusArmor, A.life],
        suffixes: [A.end, A.allAttr],
    },
    // ---- accessories (summed stats only; identity via attribute bias) ----
    ring: {
        // offense accessory: direct crit + % bonus damage, plus Str/Dex which
        // also raise damage/crit through the attribute system
        prefixes: [A.str, A.dex, A.crit, A.accDamage],
        suffixes: [A.luck, A.gold, A.magicFind, A.life],
    },
    amulet: {
        // utility/find + caster stats, with a crit option
        prefixes: [A.magicFind, A.mana, A.crit],
        suffixes: [A.wis, A.int, A.gold, A.exp, A.allAttr],
    },
    talisman: {
        // defense/sustain accessory (dedicated defensive-special affixes are a
        // later phase once new combat readers exist)
        prefixes: [A.life, A.end],
        suffixes: [A.luck, A.magicFind, A.allAttr],
    },
};

// Rarity → how many prefix/suffix affix slots roll. Ranges are inclusive; the
// generator picks a random count in-range and draws that many DISTINCT affixes
// from the slot's pool. Common = base stats only.
export const RARITY_AFFIX_BUDGET = {
    Common: { prefix: [0, 0], suffix: [0, 0] },
    Uncommon: { prefix: [0, 1], suffix: [0, 1] },
    Rare: { prefix: [1, 1], suffix: [1, 1] },
    Epic: { prefix: [1, 2], suffix: [1, 2] },
    Legendary: { prefix: [2, 3], suffix: [2, 3] },
};

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Roll a concrete value for an affix at the given item level. Returns the
// numeric value; itemDrop decides how to store/apply it by `kind`.
export function rollAffixValue(affix, iLvl, legendary) {
    switch (affix.kind) {
        case 'attr':
        case 'util':
            return (
                Math.floor(Math.random() * (affix.max * iLvl - affix.min * iLvl * 0.5 + 1)) +
                Math.floor(affix.min * iLvl * 0.5)
            );
        case 'foldDamage':
        case 'foldArmor':
            return randInt(affix.min, affix.max) + iLvl;
        case 'flatCrit':
            return randInt(affix.min, affix.max) + Math.floor(iLvl / 5);
        case 'flatDamage':
            return randInt(affix.min, affix.max) + Math.floor(iLvl / 10);
        case 'behavior':
            return legendary ? randInt(10, 20) : randInt(5, 10);
        case 'targets':
            return 1;
        default:
            return 0;
    }
}
