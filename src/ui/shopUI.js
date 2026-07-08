'use strict';

// Item-shop rendering + buy logic, extracted from dynamicHtml.js. Owns the shop
// stock arrays and tab/other data. Reuses itemTooltipTest + CreateInventoryWeaponHtml
// from inventoryUI.js. itemBuy/rerollShopItems are inline-onclick handlers on window;
// the stock arrays + render fns are re-exported via dynamicHtml.js for core/itemDrop/
// save. The potion*/backpack/statStatus imports resolve the shopOther price lookup.
import { getItemType } from '../systems/itemDrop.js';
import { player, playerInventory } from '../core/core.js';
import { formatBig } from '../core/format.js';
import { state } from '../core/state.js';
import { itemTooltipTest, CreateInventoryWeaponHtml } from './inventoryUI.js';
import {
    potionStatus,
    mediumPotionStatus,
    superPotionStatus,
    backpackStatus,
    statStatus,
} from '../data/shop.js';

export const itemShopWeapon = [];
export const itemShopArmor = [];
export const itemShopAccessory = [];
// weaponAmount/armorAmount/accessoryAmount are reassigned primitives -> state.js
function getShopItem() {
    var shopItemAmount = 100;
    var shopItemLevel = player.properties.level;
    for (var i = 0; i < shopItemAmount; i++) {
        if (
            itemShopWeapon.length < 20 ||
            itemShopArmor.length < 20 ||
            itemShopAccessory.length < 20
        ) {
            getItemType(shopItemLevel, false);
        } else {
            break;
        }
    }
    createShopTabs();
    displayShopItems(itemShopWeapon);
    displayShopItems(itemShopArmor);
    displayShopItems(itemShopAccessory);
    shopOther();
}
var shopItemTabs = [
    {
        name: 'shopWeapon',
        type: 'weapon',
    },
    {
        name: 'shopArmor',
        type: 'armor',
    },
    {
        name: 'shopAccessory',
        type: 'accessory',
    },
    {
        name: 'shopOther',
        type: 'items',
    },
];

function createShopTabs() {
    const tabs = shopItemTabs.slice(0, 4);
    const navTabs = tabs
        .map(
            (tab, i) =>
                `<li${i === 0 ? ' class="active"' : ''}>` +
                `<a href="#tab_${tab.name}" data-toggle="tab"><span class="icons ${tab.type}" data-toggle="tooltip" data-placement="top" title="${tab.name.capitalizeFirstLetter()}"></span>` +
                `</li>`
        )
        .join('');
    const panes = tabs
        .map(
            (tab, i) =>
                `<div class="tab-pane ${i === 0 ? 'active' : ''}" id="tab_${tab.name}">` +
                `<div id="${tab.name}"></div>` +
                `</div>`
        )
        .join('');

    document.getElementById('shopTabs').innerHTML =
        `<ul class="nav nav-tabs">${navTabs}</ul><div class="tab-content">${panes}</div>`;
}

function displayShopItems(type) {
    // The sort buttons need the category name in their onclick; the target
    // container is chosen from the same three arrays.
    let category = '';
    let containerId = '';
    if (type === itemShopWeapon) [category, containerId] = ['Weapon', 'shopWeapon'];
    else if (type === itemShopArmor) [category, containerId] = ['Armor', 'shopArmor'];
    else if (type === itemShopAccessory) [category, containerId] = ['Accessory', 'shopAccessory'];

    // same slot-grid cells as the inventory: rarity = outline color, price as
    // the corner badge, detail in the hover tooltip; the radio (hidden by CSS)
    // still drives Buy via state.checkedShopItem
    const items = type
        .map((item) => {
            const imgClass = item.itemType === 'weapon' ? item.itemType : item.subType;
            return (
                `<div class="invCell shopCell">` +
                `<a class="tooltips" style="cursor:pointer;">` +
                `<label> <input type="radio" name="shopItem" value=${item.id}>` +
                `<img class="${imgClass}, ${item.itemRarity}" src="images/items/${item.subType}/${item.image}.png"/>` +
                `</label>` +
                `<span style="width:300px;left:10px; bottom:40px;">` +
                `<div class="row"><div class="col-xs-10 col-xs-offset-1">` +
                itemTooltipTest(item) +
                `<strong>Select, then Buy below</strong>` +
                `</div></div></span></a>` +
                `<span class="invPower">${formatBig(item.shopPrice)}g</span>` +
                `</div>`
            );
        })
        .join('');

    const html =
        `<div class="row"><div class="col-xs-10 col-xs-offset-1">` +
        `<div class="shopItemBuy"></div>` +
        `<div class="c3">Sort by:<br />` +
        `<button type="button" onclick="sortShop('Value', '${category}')">Value</button>` +
        `<button type="button" onclick="sortShop('Rarity', '${category}')">Rarity</button>` +
        `</div>` +
        `<div class="row"><div class="col-xs-12">` +
        `<div class="c3"><h3>Item Shop</h3></div></div>` +
        `<div class="invGrid">${items}</div>` +
        `</div></div></div>`;

    if (containerId) document.getElementById(containerId).innerHTML = html;
    ShopBuyButtons();
}

function ShopBuyButtons() {
    const html =
        `<div class="row"><div class="col-xs-4 col-xs-offset-4">` +
        `<button type="button" class="shopButton" onclick="itemBuy(${state.checkedShopItem})">Buy</button>` +
        `<button type="button" class="shopButton" onclick="rerollShopItems()">Refresh</button>` +
        `</div></div>`;
    $('.shopItemBuy').empty().append(html);
}

function itemBuy(id) {
    var item = itemShopWeapon.filter(function (obj) {
        return obj.id === id;
    })[0];
    if (item !== undefined) {
        if (player.properties.gold - item.shopPrice >= 0) {
            var index = itemShopWeapon.indexOf(item, 0);
            playerInventory.push(item);
            if (index > -1) {
                itemShopWeapon.splice(index, 1);
            }
            displayShopItems(itemShopWeapon);
            state.weaponAmount--;
        }
    }

    if (item === undefined) {
        item = itemShopArmor.filter(function (obj) {
            return obj.id === id;
        })[0];
        if (item !== undefined) {
            if (player.properties.gold - item.shopPrice >= 0) {
                index = itemShopArmor.indexOf(item, 0);
                playerInventory.push(item);

                if (index > -1) {
                    itemShopArmor.splice(index, 1);
                }
                displayShopItems(itemShopArmor);
                state.armorAmount--;
            }
        }
        if (item === undefined) {
            item = itemShopAccessory.filter(function (obj) {
                return obj.id === id;
            })[0];
            if (item !== undefined) {
                if (player.properties.gold - item.shopPrice >= 0) {
                    index = itemShopAccessory.indexOf(item, 0);
                    playerInventory.push(item);

                    if (index > -1) {
                        itemShopAccessory.splice(index, 1);
                    }
                    displayShopItems(itemShopAccessory);
                    state.accessoryAmount--;
                }
            }
        }
    }
    if (item !== undefined && player.properties.gold - item.shopPrice >= 0) {
        player.properties.gold -= item.shopPrice;
        document.getElementById('gold').innerHTML = player.properties.gold;
    }
    CreateInventoryWeaponHtml();
}

function refillShopInterval() {
    if (itemShopArmor.length + itemShopAccessory.length + itemShopWeapon.length < 30) {
        getShopItem();
    }
    setTimeout(refillShopInterval, 10000);
}

function rerollShopItems() {
    itemShopWeapon.length = 0;
    itemShopArmor.length = 0;
    itemShopAccessory.length = 0;
    state.weaponAmount = 0;
    state.armorAmount = 0;
    state.accessoryAmount = 0;
    getShopItem();
}

function shopOther() {
    // Resolve item.type3 (e.g. "backpackStatus") to its status object. Built at
    // runtime (not module scope) so the circular shop<->shopUI imports are
    // initialised. Replaces the former window[item.type3] dynamic global lookup.
    const shopStatusByName = {
        potionStatus,
        mediumPotionStatus,
        superPotionStatus,
        backpackStatus,
        statStatus,
    };
    const buyButton = (type2, amount, label) =>
        `<button type="button" class="buy" onclick="${type2}(${amount})">${label}</button>`;

    const rows = Object.values(shopOtherList)
        .map(
            (item) =>
                `<div class="col-xs-12"><div class="c3">` +
                `<img src=${item.image} alt="Buy"><br />` +
                `${item.type} - ${shopStatusByName[item.type3].price} Gold<br />` +
                buyButton(item.type2, 1, 'Buy') +
                buyButton(item.type2, 10, 'Buy 10') +
                buyButton(item.type2, 100, 'Buy 100') +
                `</div></div>`
        )
        .join('');

    // The pane only exists after createShopTabs() has run; loading a save on a
    // fresh page calls shopOther() first. The original jQuery $('#shopOther')
    // silently no-op'd then — keep that behavior (refillShopInterval builds the
    // tabs right after load() and calls shopOther() again).
    const pane = document.getElementById('shopOther');
    if (pane) {
        pane.innerHTML = `<div class="row"><div class="col-xs-12"><div class="row">${rows}</div></div></div>`;
    }
}

var shopOtherList = [
    {
        type: 'Stat Points',
        image: 'images/stat.png',
        type2: 'buyStat',
        type3: 'statStatus',
    },
    {
        type: 'Backpack',
        image: 'images/bag.png',
        type2: 'buyBackpack',
        type3: 'backpackStatus',
    },
    {
        type: 'Small Potion',
        image: 'images/smallPotion.png',
        type2: 'buySmallPotion',
        type3: 'potionStatus',
    },
    {
        type: 'Medium Potion',
        image: 'images/mediumPotion.png',
        type2: 'buyMediumPotion',
        type3: 'mediumPotionStatus',
    },
    {
        type: 'Super Potion',
        image: 'images/superPotion.png',
        type2: 'buySuperPotion',
        type3: 'superPotionStatus',
    },
];

export { displayShopItems, ShopBuyButtons, refillShopInterval, shopOther };
Object.assign(window, { itemBuy, rerollShopItems });
