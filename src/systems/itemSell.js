'use strict';
import { player, playerInventory } from '../core/core.js';
import { state } from '../core/state.js';
var total = 0;
var inventoryId = [];
function sellAllItems() {
    var canSell = false;
    // would any currently-checked rarity bucket include a unique item? Uniques
    // (boss drops bought with souls) must never be lost to an accidental bulk sell.
    var hasUniqueInSelection = playerInventory.some(function (invItem) {
        return (
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
            if (
                (playerInventory[i].itemRarity === 'Legendary' &&
                    state.checkBoxLegendary === true) ||
                (playerInventory[i].itemRarity === 'Epic' && state.checkBoxEpic === true) ||
                (playerInventory[i].itemRarity === 'Rare' && state.checkBoxRare === true) ||
                (playerInventory[i].itemRarity === 'Uncommon' && state.checkBoxUncommon === true) ||
                (playerInventory[i].itemRarity === 'Common' && state.checkBoxCommon === true)
            ) {
                total += playerInventory[i].Value << 0;
                var item = 'testingItem' + playerInventory[i].id;
                var itemEl = document.getElementById(item);
                if (itemEl) itemEl.remove();
                var itemId = playerInventory[i];
                inventoryId.push(itemId);
            }
        }
        player.properties.gold += total;
        document.getElementById('gold').innerHTML = player.properties.gold;
        total = 0;
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

// sellAllItems and itemSell are inline-onclick-dispatched (sellAllItems via the
// generated `sellAll` string; itemSell via generated per-item Sell buttons), so
// they stay on window. updateInventory has no callers -> not exposed.
// total/inventoryId stay module-local (only used here).
window.sellAllItems = sellAllItems;
window.itemSell = itemSell;
