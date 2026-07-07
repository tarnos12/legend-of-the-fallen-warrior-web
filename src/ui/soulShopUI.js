'use strict';

// Soul Shop panel (top of the Shop tab, #soulShop): shows the player's Boss
// Soul balance and one card per area boss's signature unique — name, slot,
// area, soul price, and a Buy button (disabled if the area is locked or the
// player can't afford it). Buying is handled by systems/bossSouls.buyBossUnique.
import { player } from '../core/core.js';
import { monsterAreas } from '../data/gameObjects.js';
import { SOUL_SHOP } from '../data/bossSouls.js';
import { ownedUniqueIndex } from '../systems/bossSouls.js';

function area(areaType) {
    return monsterAreas.find((x) => x.type === areaType) || null;
}

function renderSoulShop() {
    const el = document.getElementById('soulShop');
    if (!el) return;
    const souls = player.properties.bossSouls || 0;
    const cards = SOUL_SHOP.map((e) => {
        const a = area(e.areaType);
        const unlocked = a ? a.isUnlocked === true : false;
        const areaName = a ? a.displayName : e.areaType;
        const affordable = souls >= e.price;
        const canBuy = unlocked && affordable;
        const owned = unlocked && ownedUniqueIndex(e.def.name) !== -1;
        const canReforge = owned && souls >= e.reforgePrice;
        let actions;
        if (!unlocked) {
            actions = `<div class="soulLocked">🔒 ${areaName}</div>`;
        } else {
            const buyBtn = `<button type="button" class="sell"${canBuy ? '' : ' disabled'} onclick="buyBossUnique('${e.bossName}');">${affordable ? `Buy ☠${e.price}` : `Need ${e.price - souls}`}</button>`;
            // Reforge re-rolls an owned inventory copy at your level for less
            const reforgeBtn = owned
                ? `<button type="button" class="sell soulReforge"${canReforge ? '' : ' disabled'} title="Re-roll an owned copy at your current level" onclick="reforgeBossUnique('${e.bossName}');">♻ ${e.reforgePrice}</button>`
                : '';
            actions = buyBtn + reforgeBtn;
        }
        return (
            `<div class="soulCard${canBuy ? ' soulBuyable' : ''}">` +
            `<div class="soulName">${e.def.name}</div>` +
            `<div class="soulMeta">${e.def.subType.capitalizeFirstLetter()} · ${areaName}${owned ? ' · owned' : ''}</div>` +
            `<div class="soulPrice">☠ ${e.price}</div>` +
            actions +
            `</div>`
        );
    }).join('');
    el.innerHTML =
        `<div class="soulHeader">☠ Boss Souls: <strong>${souls}</strong> — dropped by area bosses; buy any unlocked boss's signature unique at your level, or ♻ reforge an owned copy (cheaper) to re-roll it at your current level.</div>` +
        `<div class="soulGrid">${cards}</div>`;
}

Object.assign(window, { renderSoulShop });
export { renderSoulShop };
