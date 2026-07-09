'use strict';
import { player, playerInventory } from '../core/core.js';
import { state } from '../core/state.js';
import { Log } from '../core/log.js';
var total = 0;
var inventoryId = [];

// Shared per-item gold formula (bulk paths force-truncate to an integer with
// `<< 0`; single-item itemSell() below trusts item.Value directly — kept as-is
// since changing it is out of this slice's scope).
function itemGoldValue(item) {
    return item.Value << 0;
}

function sellAllItems() {
    var canSell = false;
    var lockedSkipped = 0;
    // would any currently-checked rarity bucket include a unique item? Uniques
    // (boss drops bought with souls) must never be lost to an accidental bulk sell.
    // Locked items are excluded entirely — they're never sold, so they never
    // need a confirm.
    var hasUniqueInSelection = playerInventory.some(function (invItem) {
        return (
            invItem.locked !== true &&
            invItem.isUnique === true &&
            ((invItem.itemRarity === 'Legendary' && state.checkBoxLegendary === true) ||
                (invItem.itemRarity === 'Epic' && state.checkBoxEpic === true) ||
                (invItem.itemRarity === 'Rare' && state.checkBoxRare === true) ||
                (invItem.itemRarity === 'Uncommon' && state.checkBoxUncommon === true) ||
                (invItem.itemRarity === 'Common' && state.checkBoxCommon === true))
        );
    });
    if (state.checkBoxEpic === true || state.checkBoxLegendary === true || hasUniqueInSelection) {
        if (
            confirm(
                hasUniqueInSelection
                    ? 'You are going to sell one or more Unique items, are you sure?'
                    : 'You are going to sell Epic and/or Legendary items, are you sure?'
            ) === true
        ) {
            canSell = true;
        } else {
            canSell = false;
        }
    } else {
        canSell = true;
    }
    if (canSell === true) {
        for (var i = 0; i < playerInventory.length; i++) {
            var matchesSelection =
                (playerInventory[i].itemRarity === 'Legendary' &&
                    state.checkBoxLegendary === true) ||
                (playerInventory[i].itemRarity === 'Epic' && state.checkBoxEpic === true) ||
                (playerInventory[i].itemRarity === 'Rare' && state.checkBoxRare === true) ||
                (playerInventory[i].itemRarity === 'Uncommon' && state.checkBoxUncommon === true) ||
                (playerInventory[i].itemRarity === 'Common' && state.checkBoxCommon === true);
            if (!matchesSelection) {
                continue;
            }
            if (playerInventory[i].locked === true) {
                lockedSkipped++;
                continue;
            }
            total += itemGoldValue(playerInventory[i]);
            var item = 'testingItem' + playerInventory[i].id;
            var itemEl = document.getElementById(item);
            if (itemEl) itemEl.remove();
            var itemId = playerInventory[i];
            inventoryId.push(itemId);
        }
        player.properties.gold += total;
        document.getElementById('gold').innerHTML = player.properties.gold;
        total = 0;
        if (lockedSkipped > 0) {
            Log(
                '<span class="bold" style="color:red;">🔒 Kept ' +
                    lockedSkipped +
                    ' locked item' +
                    (lockedSkipped > 1 ? 's' : '') +
                    '.<br /></span>'
            );
        }
    }
    for (var j = 0; j < inventoryId.length; j++) {
        var itemRemove = inventoryId[j];
        var index = playerInventory.indexOf(itemRemove);
        if (index > -1) {
            playerInventory.splice(index, 1);
        }
        updateInventory();
    }
    inventoryId = [];
}

//Single item sell (right-click / sell mode in the inventory grid)
function itemSell(id) {
    var item = playerInventory.filter(function (obj) {
        return obj.id === id;
    })[0];
    if (item !== undefined && item.locked === true) {
        Log(
            '<span class="bold" style="color:red;">🔒 Item is locked (Shift+Click to unlock).<br /></span>'
        );
        return;
    }
    // high-rarity items (and any Unique, boss-souls-bought item regardless of
    // rarity) are painful to lose to a stray click
    if (
        item !== undefined &&
        (item.itemRarity === 'Epic' || item.itemRarity === 'Legendary' || item.isUnique === true) &&
        confirm('Sell ' + item.itemRarity + ' ' + item.name + ' for ' + item.Value + ' gold?') !==
            true
    ) {
        return;
    }
    var index = playerInventory.indexOf(item);
    if (index > -1) {
        playerInventory.splice(index, 1);
        var itemToRemove = 'testingItem' + item.id;
        var removeEl = document.getElementById(itemToRemove);
        if (removeEl) removeEl.remove();
        updateInventory();
    }
    if (item !== undefined) {
        player.properties.gold += item.Value;
        document.getElementById('gold').innerHTML = player.properties.gold;
    }
}

function updateInventory() {
    document.getElementById('updateInventorySlots').innerHTML =
        'Inventory Slots: ' + playerInventory.length + '/' + player.functions.inventory();
}

// Bulk-sell a specific set of inventory ids in one operation (the inventory
// revamp's multi-select sell action). Locked items and ids that don't resolve
// to an inventory item are silently skipped. A single confirm covers the whole
// batch; if nothing in `ids` is sellable, this is a no-op (no confirm shown).
function sellItemsByIds(ids) {
    var sellable = [];
    for (var i = 0; i < ids.length; i++) {
        var found = playerInventory.filter(function (obj) {
            return obj.id === ids[i];
        })[0];
        if (found !== undefined && found.locked !== true) {
            sellable.push(found);
        }
    }
    if (sellable.length === 0) {
        return;
    }
    var batchTotal = 0;
    var hasUnique = false;
    for (var k = 0; k < sellable.length; k++) {
        batchTotal += itemGoldValue(sellable[k]);
        if (sellable[k].isUnique === true) {
            hasUnique = true;
        }
    }
    var confirmMsg =
        'Sell ' +
        sellable.length +
        ' item' +
        (sellable.length > 1 ? 's' : '') +
        ' for ' +
        batchTotal +
        ' gold?' +
        (hasUnique ? ' (includes Unique item(s))' : '');
    if (confirm(confirmMsg) !== true) {
        return;
    }
    for (var m = 0; m < sellable.length; m++) {
        var idx = playerInventory.indexOf(sellable[m]);
        if (idx > -1) {
            playerInventory.splice(idx, 1);
        }
        var el = document.getElementById('testingItem' + sellable[m].id);
        if (el) el.remove();
    }
    player.properties.gold += batchTotal;
    document.getElementById('gold').innerHTML = player.properties.gold;
    Log(
        '<span class="bold" style="color:green;">Sold ' +
            sellable.length +
            ' item' +
            (sellable.length > 1 ? 's' : '') +
            ' for ' +
            batchTotal +
            ' gold.<br /></span>'
    );
    updateInventory();
}

// sellAllItems and itemSell are inline-onclick-dispatched (sellAllItems via the
// generated `sellAll` string; itemSell via generated per-item Sell buttons), so
// they stay on window. sellItemsByIds is called from the inventory revamp's
// multi-select UI (bulk sell action). updateInventory has no callers -> not
// exposed. total/inventoryId stay module-local (only used here).
window.sellAllItems = sellAllItems;
window.itemSell = itemSell;
window.sellItemsByIds = sellItemsByIds;

export { sellAllItems, itemSell, sellItemsByIds };
