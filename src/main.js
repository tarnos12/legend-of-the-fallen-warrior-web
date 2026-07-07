// ES module entry point (Phase 3).
//
// The game is being migrated from ~16 classic global <script> files to ES
// modules one file at a time. Converted files live in /src and are imported
// here in their original load order; files not yet converted remain as classic
// <script> tags in index.html and execute before this module runs (module
// scripts are deferred). As each file is converted, its <script> tag is removed
// from index.html and an import is added below.
import './systems/battle.js';
import './systems/quest.js';
import './systems/intervalFunctions.js';
import './systems/itemDrop.js';
import './systems/itemSell.js';
// Equip/unequip/sort + game-control onclick handlers (split out of core/core.js);
// side-effect imports so they register on window.
import './systems/equip.js';
import './systems/gameControls.js';
import './core/save.js';
import './data/shop.js';
import './systems/potionsHotbar.js';

// Core files (data/logic/UI) being migrated from the classic <script> tags in
// index.html, in their original relative load order. Each still self-exposes its
// publics on window so not-yet-converted classic files keep working.
import './data/skills.js';
import './data/weaponMastery.js';
import './data/monsterList.js';
// UI layer: side-effect imports so each focused module registers its inline-onclick
// handlers on window. (The old dynamicHtml.js barrel that used to do this is gone.)
// uiCommon + characterUI are additionally imported by name further below.
import './ui/monsterUI.js';
import './ui/panelsUI.js';
import './ui/inventoryUI.js';
import './ui/shopUI.js';
// Canvas combat: wraps window.startBattle, so it must load AFTER battle.js
// (imported above) has registered the real one.
import './ui/battleCanvas.js';
// Boot loading overlay: preloads all combat sprites behind #loadingOverlay
// (needs monsterList/gameObjects, imported above).
import './ui/loadingOverlay.js';
// Stage mode: close buttons + toggle-close for the overlay panels (#hudBar nav).
import './ui/stageUI.js';
// World map (area travel) + bestiary panels; both need battleCanvas/monsterList.
import './ui/mapUI.js';
import './ui/bestiaryUI.js';
// Boss Souls currency + Soul Shop (buy boss uniques with souls).
import './systems/bossSouls.js';
import './ui/soulShopUI.js';
// Canvas skill trees (Skills panel); needs skills/weaponMastery data.
import './ui/skillTreeUI.js';
import './data/gameObjects.js';
import { copyPlayerProperties, createEquippedItemsObject } from './core/core.js';
import './systems/stats.js';
import { createHerbs, createMinerals, playerProfessionHtml } from './systems/professions.js';
import { testss } from './ui/uiCommon.js';
import { startLogo, startingScreen } from './ui/characterUI.js';

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
    setTimeout(function () {
        testss();
    }, 3000);
    createEquippedItemsObject('all');
    copyPlayerProperties();
    createHerbs();
    createMinerals();
    playerProfessionHtml();
}

// Dev-only: startingScreen() autoplays the background music (myAudio.play()).
// That's intended for real players, but it's noisy on every preview reload, so
// mute it under the Vite dev server only. import.meta.env.DEV is false in a
// production build, so shipped behaviour is unchanged.
if (import.meta.env.DEV) {
    const devAudio = document.getElementById('myAudio');
    if (devAudio) devAudio.muted = true;
}

initGame();
