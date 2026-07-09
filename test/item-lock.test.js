import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { stubJQuery, loadGameDom } from './utils.js';

// Inventory lock flag (item.locked === true, set by shift-click in the UI):
// sell-side enforcement in itemSell.js. Locked items must never be sold by
// the single-sell path, the "sell all" bulk path, or the new sellItemsByIds
// bulk API — they're simply skipped.
let core, player, playerInventory, itemSell, sellAllItems, sellItemsByIds, state;

beforeAll(async () => {
    stubJQuery();
    loadGameDom();
    localStorage.clear();
    core = await import('../src/core/core.js');
    ({ player, playerInventory } = core);
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    // updateInventorySlots is normally injected by the inventory grid render
    // (inventoryUI.js), which this test doesn't exercise — add the target
    // itemSell.js's updateInventory() writes into.
    var slotsEl = document.createElement('div');
    slotsEl.id = 'updateInventorySlots';
    document.body.appendChild(slotsEl);
    ({ state } = await import('../src/core/state.js'));
    ({ itemSell, sellAllItems, sellItemsByIds } = await import('../src/systems/itemSell.js'));
    player.properties.itemIdNumber = 1;
});

// Minimal Common-rarity item so it never triggers the Epic/Legendary/Unique
// confirm dialog in itemSell()/sellAllItems().
function makeItem(id, value, extra) {
    return Object.assign(
        {
            id: id,
            name: 'Test Item ' + id,
            itemRarity: 'Common',
            isUnique: false,
            Value: value,
        },
        extra || {}
    );
}

beforeEach(() => {
    playerInventory.length = 0;
    player.properties.gold = 0;
    // sellAllItems only touches rarities whose checkbox is checked; Common
    // covers every item minted by makeItem() above.
    state.checkBoxCommon = true;
    state.checkBoxUncommon = false;
    state.checkBoxRare = false;
    state.checkBoxEpic = false;
    state.checkBoxLegendary = false;
    window.confirm = () => true;
});

describe('itemSell — single-sell lock enforcement', () => {
    it('refuses to sell a locked item and leaves gold/inventory untouched', () => {
        var locked = makeItem(1, 50, { locked: true });
        playerInventory.push(locked);
        itemSell(1);
        expect(playerInventory.length).toBe(1);
        expect(playerInventory[0]).toBe(locked);
        expect(player.properties.gold).toBe(0);
    });

    it('sells an unlocked twin normally', () => {
        var unlocked = makeItem(2, 50);
        playerInventory.push(unlocked);
        itemSell(2);
        expect(playerInventory.length).toBe(0);
        expect(player.properties.gold).toBe(50);
    });
});

describe('sellAllItems — bulk lock enforcement', () => {
    it('skips locked items, sells unlocked ones, and keeps the locked item in inventory', () => {
        var locked = makeItem(3, 30, { locked: true });
        var unlocked = makeItem(4, 20);
        playerInventory.push(locked, unlocked);
        sellAllItems();
        expect(playerInventory.length).toBe(1);
        expect(playerInventory[0]).toBe(locked);
        expect(player.properties.gold).toBe(20);
    });
});

describe('sellItemsByIds — bulk-by-id API', () => {
    it('sells only the unlocked ids, adds the summed gold, and removes them', () => {
        var locked = makeItem(5, 40, { locked: true });
        var unlockedA = makeItem(6, 10);
        var unlockedB = makeItem(7, 15);
        playerInventory.push(locked, unlockedA, unlockedB);
        sellItemsByIds([5, 6, 7]);
        expect(playerInventory.length).toBe(1);
        expect(playerInventory[0]).toBe(locked);
        expect(player.properties.gold).toBe(25);
    });

    it('does nothing (no confirm, no changes) when every id is locked or invalid', () => {
        var locked = makeItem(8, 100, { locked: true });
        playerInventory.push(locked);
        var confirmCalled = false;
        window.confirm = () => {
            confirmCalled = true;
            return true;
        };
        sellItemsByIds([8, 999]); // 8 is locked, 999 doesn't resolve
        expect(confirmCalled).toBe(false);
        expect(playerInventory.length).toBe(1);
        expect(playerInventory[0]).toBe(locked);
        expect(player.properties.gold).toBe(0);
    });
});
