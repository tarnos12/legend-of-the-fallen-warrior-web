'use strict';

// Barrel module. dynamicHtml.js was the ~1600-line monolithic render file; its
// functions now live in focused *UI.js modules. It is kept as a re-export hub so
// existing importers (battle/core/quest/save/stats/gameObjects/itemDrop/main/
// potionsHotbar/professions) don't need their import paths changed.
//
// Importing this module (or any symbol from it) evaluates every UI module below,
// which is how each one's inline-onclick handlers get registered on window. New
// code can import directly from the focused modules instead of this barrel.
export { testss } from './uiCommon.js';
export { CreateMonsterHtml, changedTabmonster } from './monsterUI.js';
export {
    CreateWeaponSkillHtml,
    checkBoxHtml,
    CreatePlayerSkillsHtml,
    primaryStatUpdate,
    secondaryStatUpdate,
    activeBuffsHtml,
} from './panelsUI.js';
export {
    CreateInventoryWeaponHtml,
    unequipItemLoad,
    EquippedItemsEmpty,
    checkIfEquippedEmpty,
} from './inventoryUI.js';
export {
    itemShopWeapon,
    itemShopArmor,
    itemShopAccessory,
    displayShopItems,
    ShopBuyButtons,
    refillShopInterval,
    shopOther,
} from './shopUI.js';
export {
    startLogo,
    startingScreen,
    removeStartingScreen,
    characterCreationHtml,
    checkHeroRace,
    saveGameSlot,
} from './characterUI.js';
