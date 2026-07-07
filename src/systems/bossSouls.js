'use strict';

// Boss Souls system: grant souls on area-boss kills and spend them in the Soul
// Shop to buy a boss's signature unique (guaranteed, scaled to player level).
// Data/prices live in data/bossSouls.js; the shop UI is ui/soulShopUI.js.
import { player, playerInventory } from '../core/core.js';
import { monsterAreas } from '../data/gameObjects.js';
import { Log } from '../core/log.js';
import { BOSS_UNIQUES } from '../data/bossUniques.js';
import { SOUL_DROP, soulShopEntry } from '../data/bossSouls.js';
import { mintBossUnique } from './itemDrop.js';
import { CreateInventoryWeaponHtml } from '../ui/inventoryUI.js';

// Refresh the HUD soul counter + the Soul Shop (both no-op if their DOM is
// absent, e.g. headless sims). Keeps souls visible without waiting for the next
// full updateHtml pass.
function refreshSoulUi() {
    const el = document.getElementById('soulCount');
    if (el) el.innerHTML = player.properties.bossSouls || 0;
    if (typeof window.renderSoulShop === 'function') window.renderSoulShop();
}

// Grant souls on an area-boss kill (no-op for non-bosses). Called from
// battle.grantKillRewards. quiet (offline/sim) skips the log + UI refresh.
export function grantBossSouls(monster, quiet, shiny) {
    if (!BOSS_UNIQUES[monster.name]) return;
    const amount = SOUL_DROP * (shiny ? 2 : 1);
    player.properties.bossSouls += amount;
    if (!quiet) {
        Log(
            '<span class="bold" style="color:#c08bff;">☠ ' +
                monster.displayName +
                ' dropped ' +
                amount +
                ' Boss Soul' +
                (amount > 1 ? 's' : '') +
                '!<br /></span>'
        );
        refreshSoulUi();
    }
}

function areaUnlocked(areaType) {
    const a = monsterAreas.find((x) => x.type === areaType);
    return a ? a.isUnlocked === true : false;
}

// Soul-Shop purchase (inline-onclick handler). Buys the boss's unique at the
// player's current level if the area is unlocked and enough souls are held.
function buyBossUnique(bossName) {
    const entry = soulShopEntry(bossName);
    if (!entry || !areaUnlocked(entry.areaType)) return;
    if ((player.properties.bossSouls || 0) < entry.price) return;
    const item = mintBossUnique(entry.def, player.properties.level);
    if (!item) return;
    player.properties.bossSouls -= entry.price;
    Log(
        '<span class="bold" style="color:#ff9d1a;">✦ Bought a unique: ' +
            entry.def.name +
            '!<br /></span>'
    );
    CreateInventoryWeaponHtml();
    refreshSoulUi();
}

// Index of the first OWNED (inventory) copy of a named unique, or -1. Equipped
// copies aren't counted — reforge acts on an inventory item (unequip first).
export function ownedUniqueIndex(name) {
    return playerInventory.findIndex((it) => it && it.isUnique === true && it.name === name);
}

// Soul-Shop reforge (inline-onclick handler): consume an owned inventory copy of
// the unique and mint a fresh one at the player's CURRENT level (new random
// affixes + rescaled base), for a reduced soul cost. Needs the area unlocked, a
// copy owned, and enough souls.
function reforgeBossUnique(bossName) {
    const entry = soulShopEntry(bossName);
    if (!entry || !areaUnlocked(entry.areaType)) return;
    const idx = ownedUniqueIndex(entry.def.name); // find BEFORE minting
    if (idx === -1) return;
    if ((player.properties.bossSouls || 0) < entry.reforgePrice) return;
    const item = mintBossUnique(entry.def, player.properties.level); // pushed at end
    if (!item) return;
    playerInventory.splice(idx, 1); // remove the old copy (idx precedes the new item)
    player.properties.bossSouls -= entry.reforgePrice;
    Log(
        '<span class="bold" style="color:#ff9d1a;">♻ Reforged ' +
            entry.def.name +
            ' to level ' +
            player.properties.level +
            '!<br /></span>'
    );
    CreateInventoryWeaponHtml();
    refreshSoulUi();
}

Object.assign(window, { buyBossUnique, reforgeBossUnique });
export { buyBossUnique, reforgeBossUnique };
