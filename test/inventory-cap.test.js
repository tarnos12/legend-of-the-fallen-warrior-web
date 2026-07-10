import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

// Inventory hard cap (2026-07 5x5 grid revamp): the inventory is a literal
// 5x5 grid of 25 cells. player.functions.inventory() always returns 25 —
// strength and backpackUpgrade no longer grant extra slots — and
// monsterItemDrop refuses to add a 26th item once the inventory is full.
let getItemType, monsterItemDrop;
let player;
let playerInventory;
let state;

beforeAll(async () => {
    ({ getItemType, monsterItemDrop } = await import('../src/systems/itemDrop.js'));
    const core = await import('../src/core/core.js');
    ({ player, playerInventory } = core);
    ({ state } = await import('../src/core/state.js'));
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    document.body.innerHTML = '<div id="logConsole"></div><div id="updateInventorySlots"></div>';
    player.properties.itemIdNumber = 1;
});

beforeEach(() => {
    playerInventory.length = 0;
    state.checkBoxCommon = false;
    state.checkBoxUncommon = false;
    state.checkBoxRare = false;
    state.checkBoxEpic = false;
});

describe('inventory capacity is a hard-capped 25', () => {
    it('player.functions.inventory() is always 25', () => {
        expect(player.functions.inventory()).toBe(25);
    });

    it('does not grow with strength', () => {
        const before = player.functions.inventory();
        const originalStrength = player.properties.baseStrength;
        player.properties.baseStrength += 10000;
        expect(player.functions.inventory()).toBe(before);
        player.properties.baseStrength = originalStrength;
    });

    it('does not grow with backpackUpgrade', () => {
        const before = player.functions.inventory();
        const originalBackpack = player.properties.backpackUpgrade;
        player.properties.backpackUpgrade += 50;
        expect(player.functions.inventory()).toBe(before);
        player.properties.backpackUpgrade = originalBackpack;
    });
});

describe('monsterItemDrop refuses to add an item over the cap', () => {
    it('stops at 25 items and never adds a 26th', () => {
        // fill the inventory to exactly the cap using the same item-generation
        // path a real drop would use (quiet=true skips Log/render, matching
        // test/item-new.test.js's pattern)
        for (let i = 0; i < 25; i++) getItemType(20, true);
        expect(playerInventory.length).toBe(25);

        // force the drop-chance roll to always clear its threshold, so this
        // test actually exercises the capacity guard rather than depending on
        // a lucky/unlucky Math.random() roll
        const originalRandom = Math.random;
        Math.random = () => 0.999;
        try {
            monsterItemDrop(20, true, false);
        } finally {
            Math.random = originalRandom;
        }

        expect(playerInventory.length).toBe(25);
    });
});
