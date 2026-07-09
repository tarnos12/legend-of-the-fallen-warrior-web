import { describe, it, expect, beforeAll } from 'vitest';

// Item redesign (2026-07): dropped items should have isNew flag set to true,
// while crafted items should not have the flag.
let getItemType;
let player;
let playerInventory;
let state;

beforeAll(async () => {
    ({ getItemType } = await import('../src/systems/itemDrop.js'));
    const core = await import('../src/core/core.js');
    ({ player, playerInventory } = core);
    ({ state } = await import('../src/core/state.js'));
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    document.body.innerHTML = '<div id="logConsole"></div><div id="updateInventorySlots"></div>';
    player.properties.itemIdNumber = 1;
});

// generate dropped items at item level 20 with random type, looping until
// at least one is kept (not filtered by rarity checkboxes)
function generateDrops(n) {
    playerInventory.length = 0;
    // set all rarity checkboxes to false so drops are kept (checkbox false means keep)
    state.checkBoxCommon = false;
    state.checkBoxUncommon = false;
    state.checkBoxRare = false;
    state.checkBoxEpic = false;
    for (let i = 0; i < n; i++) getItemType(20, true);
    return playerInventory.slice();
}

describe('isNew flag on item drops', () => {
    it('dropped items have isNew === true', () => {
        const drops = generateDrops(50);
        expect(drops.length).toBeGreaterThan(0);
        for (const item of drops) {
            expect(item.isNew).toBe(true);
        }
    });

    it('crafted items do NOT have isNew flag', () => {
        playerInventory.length = 0;
        getItemType(20, false, 'weapon', 'sword', 'Master');
        expect(playerInventory.length).toBe(1);
        const crafted = playerInventory[0];
        expect(crafted.isCrafted).toBe(true);
        expect(crafted.isNew === undefined || crafted.isNew === false).toBe(true);
    });
});
