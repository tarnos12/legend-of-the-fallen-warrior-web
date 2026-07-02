'use strict';

// Equip/unequip/sort gameplay logic, extracted from core/core.js. Owns the
// slot lookup tables. equipItem/unequipItem/sortInventory are inline-onclick
// handlers (registered on window below); getStartingItem is exported for
// changeRace (systems/gameControls.js).
import { player, equippedItems, playerInventory, createEquippedItemsObject } from '../core/core.js';
import { updateHtml } from './stats.js';
import { CreatePlayerHotBar } from './potionsHotbar.js';
import { getItemType } from './itemDrop.js';
import { updateBar } from './battle.js';
import { CreateWeaponSkillHtml, CreatePlayerSkillsHtml } from '../ui/panelsUI.js';
import { CreateInventoryWeaponHtml, checkIfEquippedEmpty } from '../ui/inventoryUI.js';

//Equip item function
// Armor/accessory sub-types whose equip path is identical apart from the slot
// name. (weapon is keyed off itemType and also toggles a weapon-type flag;
// backpack is a separate legacy path.)
var equipSlotSubTypes = [
    'shield',
    'chest',
    'helmet',
    'legs',
    'boots',
    'ring',
    'amulet',
    'talisman',
];

// Maps a weapon sub-type to the player.properties flag the game uses to track
// which weapon class is equipped (for mastery/skills).
var weaponTypeFlags = {
    sword: 'isSword',
    axe: 'isAxe',
    mace: 'isMace',
    staff: 'isStaff',
    ranged: 'isRanged',
};
function setWeaponTypeFlag(subType, value) {
    var flag = weaponTypeFlags[subType];
    if (flag !== undefined) {
        player.properties[flag] = value;
    }
}

// The DOM container an unequipped item returns to, per slot.
var slotInventorySpace = {
    weapon: 'inventorySpaceweapon',
    shield: 'inventorySpacearmor',
    chest: 'inventorySpacearmor',
    helmet: 'inventorySpacearmor',
    legs: 'inventorySpacearmor',
    boots: 'inventorySpacearmor',
    ring: 'inventorySpaceaccessory',
    amulet: 'inventorySpaceaccessory',
    talisman: 'inventorySpaceaccessory',
};

// Slots checked (in order) when unequipping by item id.
var unequipSlots = [
    'weapon',
    'shield',
    'chest',
    'helmet',
    'legs',
    'boots',
    'ring',
    'amulet',
    'talisman',
];

// Shared equip logic for a given slot: swap out anything already there, move the
// item from the inventory into the slot, and update the UI. (item.id === id is
// always true here since item was looked up by id, so that guard is dropped.)
function equipSlot(slot, item, id) {
    if (equippedItems[slot].isEquipped === true) {
        unequipItem(equippedItems[slot].id, 'duo'); // duo = swapping while another item is equipped
    }
    equippedItems[slot] = item;
    equippedItems[slot].isEquipped = true;
    if (slot === 'weapon') {
        // Set the weapon-type flag here (after the old weapon's unequip cleared
        // it) so swapping two weapons of the same sub-type ends up enabled.
        setWeaponTypeFlag(item.subType, true);
    }
    var index = playerInventory.indexOf(item, 0);
    if (index > -1) {
        playerInventory.splice(index, 1);
    }
    player.functions[slot] = $('#testingItem' + id);
    $('#testingItem' + id).remove();
    updateHtml();
}

function equipItem(id) {
    var item = playerInventory.filter(function (obj) {
        return obj.id === id;
    })[0];
    if (item !== undefined) {
        if (item.itemType === 'weapon') {
            equipSlot('weapon', item, id);
        } else if (equipSlotSubTypes.indexOf(item.subType) > -1) {
            equipSlot(item.subType, item, id);
        } else if (item.itemType === 'BackPack') {
            if (equippedItems.backpack.isEquipped === true) {
                var typeItem = 'duo'; // It means that we equip item while another item is already equipped
                unequipItem(typeItem);
            }
            if (item.id === id) {
                equippedItems.backpack = item;
                equippedItems.backpack.isEquipped = true;
                var item = playerInventory.filter(function (obj) {
                    return obj.id === id;
                })[0];
                var index = playerInventory.indexOf(item, 0);
                if (index > -1) {
                    playerInventory.splice(index, 1);
                }
            }
            player.functions.backpack = $('#testingItem' + id);
            $('#testingItem' + id).remove();
            updateHtml();
        }
    }
    CreateWeaponSkillHtml();
    updateHtml();
    CreatePlayerSkillsHtml();
    CreatePlayerHotBar();
    updateBar();
    checkIfEquippedEmpty();
    CreateInventoryWeaponHtml();
}

//Unequip item function
function unequipItem(id, type) {
    for (var i = 0; i < unequipSlots.length; i++) {
        var slot = unequipSlots[i];
        if (id === equippedItems[slot].id) {
            equippedItems[slot].isEquipped = false;
            playerInventory.push(equippedItems[slot]);
            if (slot === 'weapon') {
                setWeaponTypeFlag(equippedItems.weapon.subType, false);
            }
            $('#' + slotInventorySpace[slot]).append(player.functions[slot]);
            $('#equippedItem' + id).remove();
            if (type === 'solo') {
                createEquippedItemsObject(slot);
            }
            updateHtml();
            break;
        }
    }
    CreateWeaponSkillHtml();
    updateHtml();
    CreatePlayerSkillsHtml();
    CreatePlayerHotBar();
    checkIfEquippedEmpty();
    if (type === 'solo') {
        CreateInventoryWeaponHtml();
    }
}
//Will show a number on a tab like inventory, displaying amount of NEW items, player have not seen yet.

function sortInventory(type) {
    if (type === 'Value') {
        playerInventory.sort(function (a, b) {
            return b.Value - a.Value;
        });
    } else if (type === 'Rarity') {
        playerInventory.sort(function (a, b) {
            return b.rarityValue - a.rarityValue;
        });
    } else if (type === 'Damage') {
        playerInventory.sort(function (a, b) {
            return b.AverageDamage - a.AverageDamage;
        });
    } else if (type === 'iLvl') {
        playerInventory.sort(function (a, b) {
            return b.iLvl - a.iLvl;
        });
    }
    CreateInventoryWeaponHtml();
}
function getStartingItem(itemType) {
    getItemType(1, false, 'weapon', itemType, 'Common');
    var itemID = player.properties.itemIdNumber - 1; // -1 because "getItemType function finish before it changes ID of the item, so equip function is called, before item drop finishes I guess...not sure -_-
    equipItem(itemID);
}

export { getStartingItem };
Object.assign(window, { equipItem, unequipItem, sortInventory });
