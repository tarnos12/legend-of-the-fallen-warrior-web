'use strict';

// Inventory / equipped-items rendering, extracted from dynamicHtml.js. Owns the
// inventory tab state. itemTooltipTest is exported because shopUI.js reuses it.
// CreateInventoryWeaponHtml is both re-exported (barrel) and put on window (some
// callers reference it by bare name / inline onclick).
import { emptyItemSlotInfo, loadingEquippedItems } from '../data/gameObjects.js';
import { equippedItems, player, playerInventory } from '../core/core.js';
import { compare, formatBig } from '../core/format.js';
import { createPotionInventory } from '../systems/potionsHotbar.js';
import { testss } from './uiCommon.js';

// ---- unified-grid view state (module-local; resets on reload) ---------------
// One grid of ALL items with filter chips (type / min-rarity / upgrades-only)
// replaced the old per-type Bootstrap tabs. 'potions' switches the panel to the
// hotbar/potion section instead of the item grid.
var invFilterType = 'all'; // 'all' | 'weapon' | 'armor' | 'accessory' | 'potions'
var invMinRarity = 0; // index into RARITY_ORDER; 0 = show all rarities
var invUpgradesOnly = false; // only items whose headline number beats the equipped slot
var invSelected = []; // ctrl-clicked item ids (bulk sell via itemSell.sellItemsByIds)
const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

function setInvFilter(type) {
    invFilterType = type;
    CreateInventoryWeaponHtml();
}
function setInvRarity(i) {
    invMinRarity = i;
    CreateInventoryWeaponHtml();
}
function toggleInvUpgrades() {
    invUpgradesOnly = !invUpgradesOnly;
    CreateInventoryWeaponHtml();
}
function sellSelectedItems() {
    if (invSelected.length > 0 && typeof window.sellItemsByIds === 'function') {
        window.sellItemsByIds(invSelected.slice());
        invSelected.length = 0;
        CreateInventoryWeaponHtml();
    }
}
// bulk-sell every currently-visible unlocked item (same filter set the grid
// shows); locked items are never included. sellItemsByIds owns the confirm.
function sellShownItems() {
    const ids = playerInventory
        .filter((item) => passesInvFilter(item) && item.locked !== true)
        .map((item) => item.id);
    if (ids.length > 0 && typeof window.sellItemsByIds === 'function') {
        window.sellItemsByIds(ids);
        CreateInventoryWeaponHtml();
    }
}

// Sell mode: while ON, clicking an inventory item sells it instead of
// equipping (right-click sells regardless — desktop shortcut; the toggle is
// the touch path).
var inventorySellMode = false;
function toggleSellMode() {
    inventorySellMode = !inventorySellMode;
    CreateInventoryWeaponHtml();
}
// Cell click: Ctrl/Cmd = toggle multi-select, Shift = toggle 🔒 lock,
// plain = equip (or sell while sell mode is armed).
function invCellClick(id, ev) {
    if (ev && (ev.ctrlKey || ev.metaKey)) {
        const at = invSelected.indexOf(id);
        if (at === -1) invSelected.push(id);
        else invSelected.splice(at, 1);
        CreateInventoryWeaponHtml();
        return;
    }
    if (ev && ev.shiftKey) {
        const item = playerInventory.filter((obj) => obj.id === id)[0];
        if (item) {
            item.locked = item.locked !== true;
            CreateInventoryWeaponHtml();
        }
        return;
    }
    if (inventorySellMode) window.itemSell(id);
    else window.equipItem(id);
}

// the item's headline number (same one the corner badge shows)
function headlinePower(item) {
    return item.itemType === 'weapon'
        ? Math.round((item.MinDamage + item.MaxDamage) / 2)
        : item.itemType === 'armor'
          ? Math.floor(item.defense)
          : item.iLvl;
}
// "upgrade" = headline number beats whatever is equipped in the item's slot
// (an empty slot always counts as an upgrade)
function isUpgrade(item) {
    const equipped = equippedCompareFor(item);
    if (!equipped || !equipped.hasOwnProperty('itemType')) return true;
    return headlinePower(item) > headlinePower(equipped);
}
// the visibility predicate the grid loop applies — factored out so the
// "Sell shown" button can recompute the exact same visible set
function passesInvFilter(item) {
    if (invFilterType !== 'all' && item.itemType !== invFilterType) return false;
    if (invMinRarity > 0 && RARITY_ORDER.indexOf(item.itemRarity) < invMinRarity) return false;
    if (invUpgradesOnly && !isUpgrade(item)) return false;
    return true;
}

// ---- drag-to-equip -----------------------------------------------------------
// Cells are draggable; dropping anywhere on the equipped paper-doll
// (#equipHtml) equips the dragged item (equip logic picks the slot from the
// item itself). Delegated at document level because #equipHtml re-renders.
var invDragId = null;
function invDragStart(id, ev) {
    invDragId = id;
    if (ev && ev.dataTransfer) {
        ev.dataTransfer.setData('text/plain', String(id));
        ev.dataTransfer.effectAllowed = 'move';
    }
    hideFloatTip();
}
if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('dragover', function (e) {
        if (e.target && e.target.closest && e.target.closest('#equipHtml')) e.preventDefault();
    });
    document.addEventListener('drop', function (e) {
        if (e.target && e.target.closest && e.target.closest('#equipHtml')) {
            e.preventDefault();
            var id =
                invDragId != null
                    ? invDragId
                    : parseInt(e.dataTransfer && e.dataTransfer.getData('text/plain'), 10);
            invDragId = null;
            if (id != null && !isNaN(id) && typeof window.equipItem === 'function')
                window.equipItem(id);
        }
    });
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
    // the NEW badge is a "seen it" flag — clear on first hover; the badge
    // itself disappears on the next render (we don't re-render here)
    if (item.isNew === true) item.isNew = false;
}
// hover handler for equipped paper-doll cells: floats the tooltip for the
// item worn in `slot` (escapes the overlay-panel clipping the old in-cell
// span suffered). Registered on window for the inline onmouseenter.
function equipTipShow(slot, ev) {
    const item = equippedItems[slot];
    if (!item || !item.hasOwnProperty('itemType')) return;
    showFloatTip(itemTooltipTest(item) + `<strong>Currently equipped</strong>`, ev);
}
// the equipped item occupying this item's slot (for the compare tooltip)
function equippedCompareFor(item) {
    if (item.itemType === 'weapon') return equippedItems.weapon;
    return equippedItems[item.subType];
}

function CreateInventoryWeaponHtml() {
    // prune selections whose items no longer exist (sold/equipped)
    for (let s = invSelected.length - 1; s >= 0; s--) {
        if (!playerInventory.some((it) => it.id === invSelected[s])) invSelected.splice(s, 1);
    }
    const capacity = player.functions.inventory();
    const counts = { weapon: 0, armor: 0, accessory: 0 };
    for (const it of playerInventory) if (counts[it.itemType] !== undefined) counts[it.itemType]++;
    const totalItems = counts.weapon + counts.armor + counts.accessory;

    // ---- filter chips ----
    const typeChip = (key, label) =>
        `<button type="button" class="invChip${invFilterType === key ? ' chipOn' : ''}" onclick="setInvFilter('${key}')">${label}</button>`;
    const rarityChip = (i, label) =>
        `<button type="button" class="invChip rarity${i}${invMinRarity === i ? ' chipOn' : ''}" onclick="setInvRarity(${i})">${label}</button>`;
    const chipRow1 =
        typeChip('all', `All (${totalItems})`) +
        typeChip('weapon', `⚔ Weapons (${counts.weapon})`) +
        typeChip('armor', `🛡 Armor (${counts.armor})`) +
        typeChip('accessory', `💍 Accessories (${counts.accessory})`) +
        typeChip('potions', `🧪 Potions`);
    const showGrid = invFilterType !== 'potions';
    const chipRow2 = !showGrid
        ? ''
        : `<span class="chipLabel">Rarity:</span>` +
          rarityChip(0, 'All') +
          RARITY_ORDER.slice(1)
              .map((r, i) => rarityChip(i + 1, `${r}+`))
              .join('') +
          `<button type="button" class="invChip${invUpgradesOnly ? ' chipOn' : ''}" onclick="toggleInvUpgrades()" title="Only items whose headline number beats what you have equipped">⬆ Upgrades</button>`;

    // ---- toolbar: sort / sell mode / bulk sell ----
    // "Sell shown" appears only when a filter narrows the grid and at least one
    // visible item is unlocked (N = that unlocked count; locked never counted)
    const anyFilterActive = invFilterType !== 'all' || invMinRarity > 0 || invUpgradesOnly;
    const shownUnlocked = anyFilterActive
        ? playerInventory.filter((item) => passesInvFilter(item) && item.locked !== true).length
        : 0;
    const toolbar = !showGrid
        ? ''
        : `<span class="chipLabel">Sort:</span>` +
          `<button type="button" onclick="sortInventory('Value')">Value</button>` +
          `<button type="button" onclick="sortInventory('Rarity')">Rarity</button>` +
          `<button type="button" onclick="sortInventory('iLvl')">Level</button>` +
          `<button type="button" onclick="sortInventory('Damage')">Damage</button>` +
          `<button type="button" class="sellModeToggle${inventorySellMode ? ' backgroundRed' : ''}" onclick="toggleSellMode()" ` +
          `title="While ON, clicking an item sells it (right-click always sells)">` +
          `💰 Sell mode${inventorySellMode ? ' ON' : ''}</button>` +
          (invSelected.length > 0
              ? `<button type="button" class="backgroundRed" onclick="sellSelectedItems()">Sell selected (${invSelected.length})</button>`
              : '') +
          (anyFilterActive && shownUnlocked > 0
              ? `<button type="button" class="backgroundRed" onclick="sellShownItems()">Sell shown (${shownUnlocked})</button>`
              : '');

    // ---- the unified item grid ----
    let cards = '';
    let shown = 0;
    if (showGrid) {
        for (var i = 0; i < playerInventory.length; i++) {
            const item = playerInventory[i];
            if (!passesInvFilter(item)) continue;
            shown++;
            const imgClass = item.itemType === 'weapon' ? item.itemType : item.subType;
            const selected = invSelected.indexOf(item.id) !== -1;
            // corner badges: headline number (avg dmg / defense / iLvl),
            // 🔒 when locked, ⚜ on Fallen Legends uniques; rarity = outline
            // color; full detail in the floating hover tooltip (invTipShow)
            cards +=
                `<div class="invCell${inventorySellMode ? ' sellArmed' : ''}${selected ? ' invSelected' : ''}" id="testingItem${item.id}">` +
                `<img class="${imgClass}, ${item.itemRarity}" style="cursor:pointer;" draggable="true" src="images/items/${item.subType}/${item.image}.png" ` +
                `onerror="this.onerror=null;this.src='images/questionMark.png';" ` +
                `ondragstart="invDragStart(${item.id}, event)" ` +
                `onmouseenter="invTipShow(${item.id}, event)" onmouseleave="hideFloatTip()" ` +
                `onclick="invCellClick(${item.id}, event)" oncontextmenu="itemSell(${item.id});return false;"/>` +
                `<span class="invPower">${formatBig(headlinePower(item))}</span>` +
                (item.locked === true ? `<span class="lockBadge">🔒</span>` : '') +
                (item.isUnique === true ? `<span class="setBadge">⚜</span>` : '') +
                (item.isNew === true ? `<span class="newBadge">NEW</span>` : '') +
                `</div>`;
        }
        // unfiltered view: render the REAL free capacity as empty cells
        if (invFilterType === 'all' && invMinRarity === 0 && !invUpgradesOnly) {
            for (let empty = totalItems; empty < capacity; empty++) {
                cards += `<div class="invCell empty"></div>`;
            }
        }
        cards = `<div class="invGrid">${cards}</div>`;
    }

    // ---- potions / hotbar section (ALWAYS in the DOM: potionsHotbar's
    // createPotionInventory writes into #potionInventory unconditionally) ----
    const radios = [1, 2, 3, 4, 5, 6, 7, 8]
        .map(
            (n) =>
                `<label class="radio-inline"><input class="visibilityLabel" type="radio" name="hotBarValue" value="${n}"${n === 1 ? ' checked="checked"' : ''}>${n}</input></label>`
        )
        .join('');
    const potionSection =
        `<div id="invPotions" style="${showGrid ? 'display:none;' : ''}">` +
        `<div class="row"><div class="col-xs-12">` +
        `Choose hot bar slot, then press a button next to a potion.` +
        `<form role="form">${radios}</form>` +
        `</div></div>` +
        `<div id="potionInventory"></div>` +
        `</div>`;

    const filterNote =
        showGrid && (invFilterType !== 'all' || invMinRarity > 0 || invUpgradesOnly)
            ? `<span class="chipLabel">— showing ${shown}/${totalItems}</span>`
            : '';

    document.getElementById('inventory').innerHTML =
        `<div class="c3" id="updateInventorySlots">Inventory Slots: ${totalItems}/${capacity}` +
        ` <span class="chipLabel">(Ctrl+Click select · Shift+Click 🔒 lock · drag onto Equipped to equip)</span></div>` +
        `<div class="invChips">${chipRow1}</div>` +
        (chipRow2 ? `<div class="invChips">${chipRow2}${filterNote}</div>` : '') +
        (toolbar ? `<div class="invChips">${toolbar}</div>` : '') +
        `<div class="row" id="inventorySpaceitems" style="min-height:400px;">` +
        cards +
        potionSection +
        `</div>`;
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
                const imgClass =
                    itemStat.itemType === 'weapon' ? itemStat.itemType : itemStat.subType;
                // tooltip now floats via equipTipShow (body-level #floatTip),
                // escaping the overlay-panel clipping the in-cell span suffered
                var html =
                    `<div class="col-xs-12 col-lg-6 c8"id="testingItem${itemStat.id}">` +
                    `<img class="${imgClass}"src="images/items/${itemStat.subType}/${itemStat.image}.png" onclick="equipItem(${itemStat.id})" onmouseenter="equipTipShow('${i}', event)" onmouseleave="hideFloatTip()"/>` +
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
    // tooltip now floats via equipTipShow (body-level #floatTip), escaping the
    // overlay-panel clipping the in-cell span suffered
    return (
        `<div id="equippedItem${itemType.id}">` +
        `<img class="${imgClass}"src="images/items/${itemType.subType}/${itemType.image}.png" onclick="unequipItem(${itemType.id}, 'solo')" onmouseenter="equipTipShow('${newItem}', event)" onmouseleave="hideFloatTip()" />` +
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
// All handlers below are dispatched from generated inline onclick/onmouseenter/
// ondragstart HTML, so they must live on window: filter chips (setInvFilter/
// setInvRarity/toggleInvUpgrades), bulk sell (sellSelectedItems), cell
// interactions (invCellClick), drag-to-equip (invDragStart), and the
// floating-tooltip hover handlers (invTipShow/hideFloatTip — hideFloatTip is
// also used by the shop cells).
Object.assign(window, {
    CreateInventoryWeaponHtml,
    toggleSellMode,
    invCellClick,
    invTipShow,
    equipTipShow,
    hideFloatTip,
    setInvFilter,
    setInvRarity,
    toggleInvUpgrades,
    sellSelectedItems,
    sellShownItems,
    invDragStart,
});
