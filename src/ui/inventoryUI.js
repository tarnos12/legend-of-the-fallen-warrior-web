'use strict';

// Inventory / equipped-items rendering, extracted from dynamicHtml.js. Owns the
// inventory tab state. itemTooltipTest is exported because shopUI.js reuses it.
// CreateInventoryWeaponHtml is both re-exported (barrel) and put on window (some
// callers reference it by bare name / inline onclick).
import {
    InventoryItemTypes,
    emptyItemSlotInfo,
    loadingEquippedItems,
} from '../data/gameObjects.js';
import { equippedItems, player, playerInventory } from '../core/core.js';
import { compare, formatBig } from '../core/format.js';
import { createPotionInventory } from '../systems/potionsHotbar.js';
import { testss } from './uiCommon.js';

var inventoryTabActiveNum = 0;
function changedTabInventory(index) {
    inventoryTabActiveNum = index;
}

// Sell mode: while ON, clicking an inventory item sells it instead of
// equipping (right-click sells regardless — desktop shortcut; the toggle is
// the touch path). Module-local like the tab index; resets on reload.
var inventorySellMode = false;
function toggleSellMode() {
    inventorySellMode = !inventorySellMode;
    CreateInventoryWeaponHtml();
}
function invCellClick(id) {
    if (inventorySellMode) window.itemSell(id);
    else window.equipItem(id);
}

// ---- floating item tooltip -------------------------------------------------
// The overlay panels (#mainPanels > .tab-pane) are scroll containers
// (overflow-y: auto), which CLIPS the old absolutely-positioned in-cell
// tooltip spans at the panel edge. This single body-level, position:fixed
// layer escapes that clipping entirely; cells feed it on hover and it clamps
// itself to the viewport. Shared by the inventory grid and the shop grid.
function floatTipEl() {
    let el = document.getElementById('floatTip');
    if (!el) {
        el = document.createElement('div');
        el.id = 'floatTip';
        document.body.appendChild(el);
    }
    return el;
}
function showFloatTip(html, ev) {
    const el = floatTipEl();
    el.innerHTML = html;
    el.style.display = 'block';
    // position beside the hovered cell, clamped to the viewport
    const cell = ev && ev.target ? ev.target.getBoundingClientRect() : { right: 0, top: 0, left: 0 };
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = cell.right + 10;
    if (x + w > window.innerWidth - 8) x = cell.left - w - 10; // flip left
    if (x < 8) x = 8;
    let y = cell.top - 20;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    if (y < 8) y = 8;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
}
function hideFloatTip() {
    const el = document.getElementById('floatTip');
    if (el) el.style.display = 'none';
}
// hover handler for inventory cells: builds the same compare-tooltip content
// the old in-cell span carried (equipped item side-by-side when one is worn)
function invTipShow(id, ev) {
    const item = playerInventory.filter((obj) => obj.id === id)[0];
    if (!item) return;
    const itemStat = equippedCompareFor(item);
    const hasType = itemStat && itemStat.hasOwnProperty('itemType');
    const hint = `<strong>${inventorySellMode ? 'Left-Click to SELL' : 'Left-Click to equip'} · Right-Click to sell</strong>`;
    const html = hasType
        ? `<div class="floatTipCols"><div class="floatTipCol borderRight">` +
          itemTooltipTest(itemStat) +
          `<strong>Currently equipped</strong></div>` +
          `<div class="floatTipCol">` +
          itemTooltipTest(item) +
          hint +
          `</div></div>`
        : itemTooltipTest(item) + hint;
    showFloatTip(html, ev);
}
// the equipped item occupying this item's slot (for the compare tooltip)
function equippedCompareFor(item) {
    if (item.itemType === 'weapon') return equippedItems.weapon;
    return equippedItems[item.subType];
}

function CreateInventoryWeaponHtml() {
    const navTabs = InventoryItemTypes.map((t, k) => {
        const li =
            k === inventoryTabActiveNum
                ? `<li class="active" onClick = changedTabInventory(${k})>`
                : `<li onClick = changedTabInventory(${k})>`;
        return (
            li +
            `<a href="#tab_${t.type}" data-toggle="tab"><span class="icons ${t.icon}" data-toggle="tooltip" data-placement="top" title="${t.displayName}"></span></a></li>`
        );
    }).join('');

    const panes = InventoryItemTypes.map((t, j) => {
        const active = j === inventoryTabActiveNum ? ' active' : '';
        const paneOpen =
            t.type === 'other'
                ? `<div class="col-xs-12 tab-pane${active} marginBottom"`
                : `<div class="col-xs-10 col-xs-offset-1 tab-pane${active} marginBottom"`;

        let sortSection = '';
        if (t.type !== 'other') {
            sortSection =
                `<div class="c3">Sort by:</div>` +
                `<button type="button" onclick="sortInventory('Value')">Value</button>` +
                `<button type="button" onclick="sortInventory('Rarity')">Rarity</button>` +
                `<button type="button" onclick="sortInventory('iLvl')">Level</button>` +
                (t.type === 'weapon'
                    ? `<button type="button" onclick="sortInventory('Damage')">Damage</button>`
                    : '') +
                `<button type="button" class="sellModeToggle${inventorySellMode ? ' backgroundRed' : ''}" onclick="toggleSellMode()" ` +
                `title="While ON, clicking an item sells it (right-click always sells)">` +
                `💰 Sell mode${inventorySellMode ? ' ON' : ''}</button>`;
        }

        let cards = '';
        let cardCount = 0;
        for (var i = 0; i < playerInventory.length; i++) {
            if (playerInventory[i].itemType === t.type) {
                cardCount++;
                const item = playerInventory[i];
                const imgClass = item.itemType === 'weapon' ? item.itemType : item.subType;
                // corner badge: the item's headline number (avg damage /
                // defense / item level) — rarity is the icon's outline color,
                // full detail lives in the floating hover tooltip (invTipShow;
                // the old in-cell tooltip span was clipped by the overlay
                // panel's overflow-y:auto scroll container)
                const power =
                    item.itemType === 'weapon'
                        ? Math.round((item.MinDamage + item.MaxDamage) / 2)
                        : item.itemType === 'armor'
                          ? Math.floor(item.defense)
                          : item.iLvl;
                cards +=
                    `<div class="invCell${inventorySellMode ? ' sellArmed' : ''}" id="testingItem${item.id}">` +
                    `<img class="${imgClass}, ${item.itemRarity}" style="cursor:pointer;" src="images/items/${item.subType}/${item.image}.png" ` +
                    `onerror="this.onerror=null;this.src='images/questionMark.png';" ` +
                    `onmouseenter="invTipShow(${item.id}, event)" onmouseleave="hideFloatTip()" ` +
                    `onclick="invCellClick(${item.id})" oncontextmenu="itemSell(${item.id});return false;"/>` +
                    `<span class="invPower">${formatBig(power)}</span>` +
                    `</div>`;
            }
        }
        // fixed 5-wide grid, at least 4 rows; leftover cells render empty
        if (t.type !== 'other') {
            const cellTotal = Math.max(20, Math.ceil(cardCount / 5) * 5);
            for (let empty = cardCount; empty < cellTotal; empty++) {
                cards += `<div class="invCell empty"></div>`;
            }
            cards = `<div class="invGrid">${cards}</div>`;
        }

        let otherBlock = '';
        if (t.type === 'other') {
            const radios = [1, 2, 3, 4, 5, 6, 7, 8]
                .map(
                    (n) =>
                        `<label class="radio-inline"><input class="visibilityLabel" type="radio" name="hotBarValue" value="${n}"${n === 1 ? ' checked="checked"' : ''}>${n}</input></label>`
                )
                .join('');
            otherBlock =
                `<div class="row">` +
                `<div class="col-xs-12">` +
                `Choose hot bar slot, then press a button next to a potion.` +
                `<form role="form">` +
                radios +
                `</form>` +
                `</div>` +
                `</div>` +
                `<div id="potionInventory">`;
        }

        return (
            paneOpen +
            `id="tab_${t.type}" style="min-height:400px;">` +
            `<div class="row" id="inventorySpace${t.type}">` +
            `<div class="c3" style="margin-bottom:10px;"><h4>Inventory</h4>` +
            sortSection +
            `</div>` +
            cards +
            otherBlock +
            `</div>` +
            `</div>`
        );
    }).join('');

    document.getElementById('inventory').innerHTML =
        `<div class="c3" id="updateInventorySlots">Inventory Slots: ${playerInventory.length}/${player.functions.inventory()}</div>` +
        `<ul class="nav nav-tabs draggable">${navTabs}</ul>` +
        `<div class="tab-content" id="tabControl_Inventory">${panes}</div>`;
    testss();
    createPotionInventory();
}

function unequipItemLoad() {
    // Create a variable inside player.properties which store currently equipped item, for easy access...
    for (var key in loadingEquippedItems) {
        if (loadingEquippedItems.hasOwnProperty(key)) {
            var i = loadingEquippedItems[key].type;
            var itemStat = equippedItems[i];
            if (itemStat.subType !== undefined) {
                const hasType = itemStat.hasOwnProperty('itemType');
                const imgClass =
                    itemStat.itemType === 'weapon' ? itemStat.itemType : itemStat.subType;
                var html =
                    `<div class="col-xs-12 col-lg-6 c8"id="testingItem${itemStat.id}">` +
                    `<a class="tooltips" style="cursor:pointer;">` +
                    `<img class="${imgClass}"src="images/items/${itemStat.subType}/${itemStat.image}.png" onclick="equipItem(${itemStat.id})"/>` +
                    (hasType ? `<span>` : `<span style="width:200px;">`) +
                    `<div class="row">` +
                    `<div class="col-xs-12">` +
                    (hasType
                        ? `<div class="row">` +
                          `<div class="col-xs-6">` +
                          itemTooltipTest(itemStat) +
                          `<strong>Currently equipped</strong>` +
                          `</div>`
                        : '') +
                    (hasType
                        ? `<div class="col-xs-6">`
                        : `<div class="col-xs-10 col-xs-offset-1">`) +
                    itemTooltipTest(itemStat) +
                    `<strong>Left-Click to equip</strong>` +
                    `</div></div>` +
                    `</div>` +
                    (hasType ? `</div>` : '') +
                    `</span>` +
                    `</a>` +
                    `<button type="button" class="equip" onclick="itemSell(${itemStat.id})">Sell</button>` +
                    `</div>`;
                player.functions[i] = $(html);
            }
        }
    }
}

function EquippedItemsEmpty() {
    let slots = '';
    for (var itemType in emptyItemSlotInfo) {
        if (emptyItemSlotInfo.hasOwnProperty(itemType)) {
            var item = emptyItemSlotInfo[itemType].type;
            var itemEmpty = item + 'Empty';
            const cell = `<div class="col-xs-4 marginTest"id="${itemEmpty}"><img src=images/${itemEmpty}.png></div>`;
            if (item === 'talisman' || item === 'helmet' || item === 'amulet') {
                if (item === 'talisman')
                    slots += `<div class="col-xs-10 col-xs-offset-1"><div class="row">`;
                slots += cell;
                if (item === 'amulet') slots += `</div></div>`;
            } else if (item === 'weapon' || item === 'chest' || item === 'shield') {
                if (item === 'weapon')
                    slots += `<div class="col-xs-10 col-xs-offset-1"><div class="row">`;
                slots += cell;
                if (item === 'shield') slots += `</div></div>`;
            } else if (item === 'legs' || item === 'ring') {
                if (item === 'legs')
                    slots += `<div class="col-xs-10 col-xs-offset-1"><div class="row"><div class="col-xs-4 marginTest"></div>`;
                slots += cell;
                if (item === 'ring') slots += `</div></div>`;
            } else if (item === 'boots') {
                slots += `<div class="col-xs-10 col-xs-offset-1"><div class="row"><div class="col-xs-4 col-xs-offset-4"id="${itemEmpty}"><img src=images/${itemEmpty}.png></div></div></div>`;
            }
        }
    }
    document.getElementById('equipHtml').innerHTML =
        `<div class="row" style="padding-top: 5px; padding-bottom: 10px;">` +
        `<div class="centerText"><h4>Equipped Items</h4></div>` +
        slots +
        `</div>`;
}

function checkIfEquippedEmpty() {
    for (var item in equippedItems) {
        var itemType = equippedItems[item];
        if (itemType.isEquipped === true) {
            var testItem = checkEquippedItemType(item);
            document.getElementById(item + 'Empty').innerHTML = testItem;
        } else if (itemType.isEquipped === false) {
            var currentItem = '<img src=images/' + item + 'Empty' + '.png>';
            document.getElementById(item + 'Empty').innerHTML = currentItem;
        }
    }
}

function checkEquippedItemType(newItem, check) {
    const itemType = equippedItems[newItem];
    if (!itemType.hasOwnProperty('itemType')) {
        return '';
    }
    const imgClass = itemType.itemType === 'weapon' ? itemType.itemType : itemType.subType;
    return (
        `<div id="equippedItem${itemType.id}">` +
        `<a class="tooltips" style="cursor:pointer;">` +
        `<img class="${imgClass}"src="images/items/${itemType.subType}/${itemType.image}.png" onclick="unequipItem(${itemType.id}, 'solo')" />` +
        `<span style="width:200px; left:50px; right:0px; bottom:50px;">` +
        `<div class="row">` +
        `<div class="col-xs-12">` +
        itemTooltipTest(itemType) +
        `<strong>Currently equipped</strong>` +
        `</div>` +
        `</div>` +
        `</span></a>` +
        `</div>`
    );
}

function itemTooltipTest(item) {
    var equippedItemStat = equippedItems[item.subType];
    if (item.itemType === 'weapon') {
        equippedItemStat = equippedItems[item.itemType];
    }
    let html = `<font color="${item.color}"><strong>${item.name}</strong></font><br />`;
    if (item.itemType === 'weapon') {
        html += `<div class="borderBottom borderTop">Weapon class: ${item.subType.capitalizeFirstLetter()}<br />`;
        if (item['Bonus damage'] > 0) {
            html += `<strong><font color="#2175D9">Damage: ${item.MinDamage} to ${item.MaxDamage}</font></strong></div>`;
        } else {
            html += `Damage: ${item.MinDamage} to ${item.MaxDamage}</div>`;
        }
        html += `Average Damage: ${compare(item.AverageDamage, equippedItemStat.AverageDamage, '')}`;
        html += `<div class="borderBottom borderTop">Critical Chance: ${compare(item['Critical chance'], equippedItemStat['Critical chance'], '%')}</div>`;
    }
    if (item.itemType === 'armor') {
        if (item['Bonus armor'] > 0) {
            html += `<div class="borderBottom borderTop"><strong><font color="#1e69c3">Defense: ${compare(item.defense.toFixed(0), equippedItemStat.defense.toFixed(0), '')}</font></strong></div>`;
        } else {
            html += `<div class="borderBottom borderTop">Defense: ${compare(item.defense, equippedItemStat.defense, '')} </div>`;
        }
        if (item.subType === 'shield') {
            html += `<div class="borderBottom borderTop">Chance to Block: ${item['Block chance']}% </div>`;
        }
        if (item['Bonus armor'] > 0) {
            html += `<strong><font color="#7FCC7F">Bonus armor: ${compare(item['Bonus armor'], equippedItemStat['Bonus armor'], '%')}</font></strong><br />`;
        }
        html += `Damage reduction: ${(
            100 -
            ((player.properties.prestigeMultiplier * 500) /
                (player.properties.prestigeMultiplier * 500 +
                    (player.functions.defense() +
                        (item.defense - equippedItems[item.subType].defense)))) *
                100 -
            (100 -
                ((player.properties.prestigeMultiplier * 500) /
                    (player.properties.prestigeMultiplier * 500 + player.functions.defense())) *
                    100)
        ).toFixed(2)}%<br />`;
    }
    // accessories now carry live crit (core reads it off ring/amulet); bonus
    // damage renders via the generic stat loop below. Weapon crit is shown in
    // the weapon block above, so this branch is accessory-only.
    if (item.itemType === 'accessory' && item['Critical chance'] > 0) {
        html += `<div class="borderBottom borderTop">Critical Chance: ${compare(item['Critical chance'], equippedItemStat['Critical chance'], '%')}</div>`;
    }
    for (var statName in item) {
        //Here stat will become the word Defense
        if (item.hasOwnProperty(statName)) {
            if (
                'All attributes, Strength, Endurance, Agility, Dexterity, Wisdom, Intelligence, Luck, Evasion, Bonus damage, Bonus life, Bonus mana, Health regen, Mana regen, Magic find, Gold drop, Experience rate, Life gain on hit, Critical damage, Attack speed, Extra targets, Stun chance'.indexOf(
                    statName
                ) !== -1
            ) {
                //Getting the actual stat object from the word.
                var selectedStat = item[statName];
                var equippedItemTest = equippedItemStat[statName];
                // The "%" stats format the delta with a percent sign; the rest
                // plain. Attack speed / Stun chance are the weapon-behavior
                // special stats (see systems/weaponBehavior.js).
                const unit =
                    statName === 'Bonus damage' ||
                    statName === 'Magic find' ||
                    statName === 'Gold drop' ||
                    statName === 'Experience rate' ||
                    statName === 'Attack speed' ||
                    statName === 'Stun chance'
                        ? '%'
                        : '';
                if (selectedStat > 0 || (selectedStat === 0 && equippedItemTest > 0)) {
                    html += `<strong><font color="#0066FF">${statName}: ${compare(selectedStat, equippedItemTest, unit)}</font></strong><br />`;
                }
            }
        }
    }
    html += `<div class="borderBottom borderTop">Value: ${item.Value} gold<br />Item level: ${item.iLvl}<br /><font color="#CC6633">${item.lore}</font></div>`;
    return html;
}

export {
    CreateInventoryWeaponHtml,
    unequipItemLoad,
    EquippedItemsEmpty,
    checkIfEquippedEmpty,
    itemTooltipTest,
    showFloatTip,
};
// changedTabInventory is dispatched by the generated `onClick = changedTabInventory(k)`
// on the inventory nav tabs, so it must be on window (it silently dropped off during
// the ESM conversion, leaving tab clicks throwing a ReferenceError and the active-tab
// state stuck at 0 across re-renders).
// invTipShow/hideFloatTip are the floating-tooltip hover handlers on the
// generated inventory cells (and hideFloatTip on the shop cells).
Object.assign(window, {
    CreateInventoryWeaponHtml,
    changedTabInventory,
    toggleSellMode,
    invCellClick,
    invTipShow,
    hideFloatTip,
});
