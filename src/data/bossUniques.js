'use strict';

// Named boss uniques (2026-07 item redesign, Phase 2). Each area boss (the last
// monster in its chain) has a signature named item that drops ONLY from that
// boss at BOSS_UNIQUE_CHANCE. A unique is a forced-Legendary item of a fixed
// slot with a GUARANTEED signature affix (on top of its normal random rolls),
// a fixed name, and gold flavor text — so wave-5 kills feel like milestones and
// the bestiary/map have concrete drops to advertise.
//
// Keyed by the boss monster's `name` (see data/monsterList.js). The signature
// affix `key` must be one the slot actually applies (same rule as data/affixes.js):
// weapons take Extra targets / Stun chance / Attack speed / Bonus damage, shields
// take Block/armor/life, accessories take summed attributes/find. `value` is the
// fixed signature magnitude; `+lvl` fields scale lightly with the boss level.

export const BOSS_UNIQUE_CHANCE = 0.2; // per boss kill (doubled for shiny bosses)

export const BOSS_UNIQUES = {
    LordVarik: [
        {
            name: "Lord Varik's Cleaver",
            itemType: 'weapon',
            subType: 'axe',
            signature: { key: 'Extra targets', value: 2 }, // cleaves the whole gang
            lore: '"The blade that carved a bandit empire — it never swings at just one throat."',
        },
    ],
    JotunnScout: [
        {
            name: 'Farsight of the Jotunn',
            itemType: 'weapon',
            subType: 'ranged',
            signature: { key: 'Extra targets', value: 2 }, // pierces a whole line
            lore: '"A bow strung for giants. Its arrows do not stop for the first body."',
        },
    ],
    DeepKingTarNuk: [
        {
            name: "Tar Nuk's Reckoning",
            itemType: 'weapon',
            subType: 'mace',
            signature: { key: 'Stun chance', value: 30 }, // reliable stunlock
            lore: '"The deep king ruled by concussion. Kings die; the habit endures."',
        },
    ],
    Keeper: [
        {
            name: "The Keeper's Aegis",
            itemType: 'armor',
            subType: 'shield',
            signature: { key: 'Bonus life', value: 40, perLevel: 4 },
            lore: '"It has never been broken. It has only ever been set down."',
        },
    ],
    GrelChief: [
        {
            name: "Grel Chief's Warblade",
            itemType: 'weapon',
            subType: 'sword',
            signature: { key: 'Attack speed', value: 25 }, // flurry
            lore: '"Won a hundred duels. Lost the last one, quickly."',
        },
    ],
    FrightGolem: [
        {
            name: 'Heart of the Golem',
            itemType: 'accessory',
            subType: 'talisman',
            signature: { key: 'All attributes', value: 20, perLevel: 1 },
            lore: '"Still warm. Still beating. It does not know its maker is gone."',
        },
    ],
    TorturedBeholder: [
        {
            name: "The Beholder's Eye",
            itemType: 'accessory',
            subType: 'amulet',
            signature: { key: 'Magic find', value: 30, perLevel: 1 },
            lore: '"It sees every glittering thing. It wants you to have them all."',
        },
    ],
};

// The signature value at a given boss level.
export function signatureValue(sig, level) {
    return sig.value + (sig.perLevel ? Math.floor(sig.perLevel * level) : 0);
}
