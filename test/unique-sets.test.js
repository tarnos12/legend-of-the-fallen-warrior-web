import { describe, it, expect, beforeAll } from 'vitest';

// "Fallen Legends" unique set: wearing multiple boss uniques grants an
// escalating live bonus (damage/defense % + magic-find/gold flat), computed
// from equippedItems in core.js — no persistence.
let core, player, equippedItems, data;

beforeAll(async () => {
    core = await import('../src/core/core.js');
    ({ player, equippedItems } = core);
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    data = await import('../src/data/uniqueSets.js');
    document.body.innerHTML = '<div id="logConsole"></div>';
});

// Mark the first n equip slots as holding a unique (reset the rest to bare).
function setUniques(n) {
    core.createEquippedItemsObject('all'); // reset all slots to zeroed/bare
    const slots = ['weapon', 'shield', 'amulet', 'talisman'];
    for (let i = 0; i < slots.length; i++) {
        equippedItems[slots[i]].isUnique = i < n;
    }
}

describe('unique set — Fallen Legends', () => {
    it('uniqueSetBonus: nothing below 2 pieces, escalates 2→4, clamps above', () => {
        expect(data.uniqueSetBonus(0)).toEqual({});
        expect(data.uniqueSetBonus(1)).toEqual({});
        expect(data.uniqueSetBonus(2).damage).toBe(6);
        expect(data.uniqueSetBonus(3).damage).toBe(12);
        expect(data.uniqueSetBonus(4).damage).toBe(20);
        expect(data.uniqueSetBonus(9).damage).toBe(20); // clamped to the top tier
    });

    it('equippedUniqueCount counts isUnique across slots', () => {
        setUniques(3);
        expect(player.functions.equippedUniqueCount()).toBe(3);
        setUniques(0);
        expect(player.functions.equippedUniqueCount()).toBe(0);
    });

    it('the set damage bonus raises minDamage (more pieces → more damage)', () => {
        setUniques(0);
        const base = player.functions.minDamage();
        setUniques(4);
        const withSet = player.functions.minDamage();
        expect(Number.isFinite(withSet)).toBe(true);
        expect(withSet).toBeGreaterThan(base);
    });

    it('magic-find and gold fold into the rate readers at 4 pieces', () => {
        setUniques(4);
        const mf4 = player.functions.totalMagicFind();
        const gd4 = player.functions.totalGoldDrop();
        setUniques(0);
        expect(mf4 - player.functions.totalMagicFind()).toBe(8);
        expect(gd4 - player.functions.totalGoldDrop()).toBe(8);
    });
});
