// ES module entry point (Phase 3).
//
// The game is being migrated from ~16 classic global <script> files to ES
// modules one file at a time. Converted files live in /src and are imported
// here in their original load order; files not yet converted remain as classic
// <script> tags in index.html and execute before this module runs (module
// scripts are deferred). As each file is converted, its <script> tag is removed
// from index.html and an import is added below.
import './battle.js';
import './quest.js';
import './intervalFunctions.js';
import './itemDrop.js';
import './itemSell.js';
import './save.js';
import './shop.js';
import './potionsHotbar.js';

// Core files (data/logic/UI) being migrated from the classic <script> tags in
// index.html, in their original relative load order. Each still self-exposes its
// publics on window so not-yet-converted classic files keep working.
import './skills.js';
import './weaponMastery.js';
import './monsterList.js';
import './gameObjects.js';
import './stats.js';

// Game bootstrap (Phase 3 ESM). Previously these ran inline at parse-time inside
// the classic dynamicHtml.js / main.js / professions.js scripts. They were
// extracted here so the core files can be converted to ES modules in any order
// without breaking parse-time cross-file references. Order below mirrors the
// original classic script-load order exactly. The functions are still classic
// globals for now (resolved off window); they will become imports as each file
// is converted. Data-construction blocks (gameObjects races, the professions
// IIFE, String.prototype.capitalizeFirstLetter) stay in their files and run at
// load, before this code.
function initGame() {
    startingScreen();
    startLogo();
    setTimeout(function () { testss(); }, 3000);
    createEquippedItemsObject('all');
    copyPlayerProperties();
    createHerbs();
    createMinerals();
    playerProfessionHtml();
}
initGame();
