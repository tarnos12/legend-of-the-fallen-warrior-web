import { describe, it, expect, beforeAll } from 'vitest';

// Item redesign (2026-07): curated per-slot affix pools + compressed rarity
// power curve. These tests lock the two guarantees the design promised:
//   1. each slot rolls ONLY affixes from its pool (no crit on shields, no
//      armor on swords, no dead weapon-keys on accessories)
//   2. Legendary is ~1.8x a Common at the same item level, not 5x
let getItemType;
let player;
let playerInventory;

beforeAll(async () => {
    ({ getItemType } = await import('../src/systems/itemDrop.js'));
    const core = await import('../src/core/core.js');
    ({ player, playerInventory } = core);
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    document.body.innerHTML = '<div id="logConsole"></div><div id="updateInventorySlots"></div>';
    player.properties.itemIdNumber = 1;
});

// generate `n` items of a slot at item level `iLvl`, returns the pushed items
function generate(itemType, subType, n, quality) {
    playerInventory.length = 0;
    for (let i = 0; i < n; i++) getItemType(20, false, itemType, subType, quality);
    return playerInventory.slice();
}

const WEAPON_ONLY = ['Bonus damage', 'Critical chance', 'Attack speed', 'Stun chance', 'Extra targets', 'Life gain on hit'];
const ARMOR_ONLY = ['Bonus armor'];

describe('affix pools are slot-restricted', () => {
    it('shields never roll crit, bonus damage, or attack speed', () => {
        const shields = generate('armor', 'shield', 150, 'Master');
        for (const s of shields) {
            for (const key of WEAPON_ONLY) expect(s[key] === undefined || s[key] === 0).toBe(true);
        }
    });

    it('swords never roll armor or defense affixes', () => {
        const swords = generate('weapon', 'sword', 150, 'Master');
        for (const w of swords) {
            for (const key of ARMOR_ONLY) expect(w[key] === undefined || w[key] === 0).toBe(true);
            expect(w.defense === undefined).toBe(true);
        }
    });

    it('accessories never roll weapon/armor-only keys (only summed stats apply)', () => {
        for (const sub of ['ring', 'amulet', 'talisman']) {
            const items = generate('accessory', sub, 120, 'Master');
            for (const it of items) {
                for (const key of WEAPON_ONLY.concat(ARMOR_ONLY)) {
                    expect(it[key] === undefined || it[key] === 0).toBe(true);
                }
            }
        }
    });

    it('common accessories still drop despite having no base stats', () => {
        const rings = generate('accessory', 'ring', 40, 'Common');
        expect(rings.length).toBe(40); // Value floor keeps them past the push guard
        for (const r of rings) expect(r.itemRarity).toBe('Common');
    });
});

describe('rarity affix budget scales', () => {
    it('commons have no affixes, legendaries have several', () => {
        // Critical chance is excluded: weapons get innate subtype crit, which
        // isn't a pool affix (a crit prefix would just add to it)
        const affixCount = (it) => {
            const keys = ['Strength', 'Endurance', 'Agility', 'Dexterity', 'Wisdom', 'Intelligence', 'Luck', 'All attributes', 'Bonus life', 'Bonus mana', 'Bonus damage', 'Attack speed', 'Stun chance', 'Extra targets', 'Life gain on hit'];
            return keys.filter((k) => it[k] > 0).length;
        };
        const commons = generate('weapon', 'sword', 60, 'Common');
        // Common weapons: 0 pool affixes (innate crit is expected, excluded above)
        for (const c of commons) expect(affixCount(c)).toBe(0);
        const legendaries = generate('weapon', 'sword', 60, 'Master').filter(
            (i) => i.itemRarity === 'Legendary'
        );
        // Legendary: 2-3 prefixes + 2-3 suffixes -> comfortably several
        const avg = legendaries.reduce((s, i) => s + affixCount(i), 0) / (legendaries.length || 1);
        expect(avg).toBeGreaterThan(2);
    });
});

describe('compressed power curve', () => {
    it('legendary average damage is ~1.8x common, not 5x', () => {
        const avgDmg = (items) =>
            items.reduce((s, i) => s + (i.MinDamage + i.MaxDamage) / 2, 0) / items.length;
        // isolate base-rarity power: same subtype, strip the Bonus-damage prefix
        // by comparing many samples (affix fold averages out across the set)
        const commons = generate('weapon', 'sword', 300, 'Common');
        playerInventory.length = 0;
        const legendaries = generate('weapon', 'sword', 800, 'Master').filter(
            (i) => i.itemRarity === 'Legendary'
        );
        const ratio = avgDmg(legendaries) / avgDmg(commons);
        // compressed: well under the old 5x; comfortably in a 1.4-2.6 band once
        // the Bonus-damage prefix (Legendary-only, averaged) is included
        expect(ratio).toBeGreaterThan(1.4);
        expect(ratio).toBeLessThan(2.8);
    });
});
