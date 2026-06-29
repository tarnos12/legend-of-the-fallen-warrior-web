"use strict";
import { itemRarity } from './gameObjects.js';
import { player, playerInventory } from './core.js';
import { state } from './state.js';
var total = 0;
var inventoryId = [];
function sellAllItems() {
    var canSell = false;
    if (state.checkBoxEpic === true || state.checkBoxLegendary === true) {
        if (confirm("You are going to sell Epic and/or Legendary items, are you sure?") === true) {
            canSell = true;
        }
        else {
            canSell = false;
        }
    }
    else {
        canSell = true;
    }
    if (canSell === true) {
        for (var i = 0; i < playerInventory.length; i++) {
            if ((playerInventory[i].itemRarity === 'Legendary' && state.checkBoxLegendary === true ||
                playerInventory[i].itemRarity === 'Epic' && state.checkBoxEpic === true ||
                playerInventory[i].itemRarity === 'Rare' && state.checkBoxRare === true ||
                playerInventory[i].itemRarity === 'Uncommon' && state.checkBoxUncommon === true ||
                playerInventory[i].itemRarity === 'Common' && state.checkBoxCommon === true)) {
                total += playerInventory[i].Value << 0;
                var item = "testingItem" + playerInventory[i].id;
                $('#' + item).remove();
                var itemId = playerInventory[i];
                inventoryId.push(itemId);
            }
        }
        player.properties.gold += total;
        document.getElementById("gold").innerHTML = player.properties.gold;
        total = 0;
    };
    for (var j = 0; j < inventoryId.length; j++) {
        var itemRemove = inventoryId[j];
        var index = playerInventory.indexOf(itemRemove);
        if (index > -1) {
            playerInventory.splice(index, 1);
        }
        updateInventory();
    };
    inventoryId = [];
};

//Single item sell
function itemSell(id) {
    var item = playerInventory.filter(function(obj) {
        return obj.id === id;
    })[0];
    var index = playerInventory.indexOf(item);
    if (index > -1) {
        playerInventory.splice(index, 1);
        var itemToRemove = "testingItem" + item.id;
        $('#' + itemToRemove).remove();
        updateInventory();
    }
    if (item !== undefined) {
        player.properties.gold += item.Value;
        document.getElementById("gold").innerHTML = player.properties.gold;
    };
};

function updateInventory() {
    $('#updateInventorySlots').empty().append("Inventory Slots: " + playerInventory.length + "/" + player.functions.inventory())
};

// ES module (Phase 3): bare reads (player, playerInventory, checkBox*, $) resolve
// through the global object. Re-expose the public functions on window for the
// inline onclick handlers (dynamicHtml.js) and other scripts that call them.
// total/inventoryId stay module-local (only used here).
window.sellAllItems = sellAllItems;
window.itemSell = itemSell;
window.updateInventory = updateInventory;