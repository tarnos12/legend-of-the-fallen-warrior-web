'use strict';

// Soul Shop panel (top of the Shop tab, #soulShop): shows the player's Boss
// Soul balance and one card per area boss's signature unique — name, slot,
// area, soul price, and a Buy button (disabled if the area is locked or the
// player can't afford it). Buying is handled by systems/bossSouls.buyBossUnique.
import { player } from '../core/core.js';
import { monsterAreas } from '../data/gameObjects.js';
import { SOUL_SHOP } from '../data/bossSouls.js';

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
        const btn = !unlocked
            ? `<div class="soulLocked">🔒 ${areaName}</div>`
            : `<button type="button" class="sell"${canBuy ? '' : ' disabled'} onclick="buyBossUnique('${e.bossName}');">${affordable ? 'Buy' : `Need ${e.price - souls} more`}</button>`;
        return (
            `<div class="soulCard${canBuy ? ' soulBuyable' : ''}">` +
            `<div class="soulName">${e.def.name}</div>` +
            `<div class="soulMeta">${e.def.subType.capitalizeFirstLetter()} · ${areaName}</div>` +
            `<div class="soulPrice">☠ ${e.price}</div>` +
            btn +
            `</div>`
        );
    }).join('');
    el.innerHTML =
        `<div class="soulHeader">☠ Boss Souls: <strong>${souls}</strong> — dropped by area bosses; spend them to buy any unlocked boss's signature unique at your level.</div>` +
        `<div class="soulGrid">${cards}</div>`;
}

Object.assign(window, { renderSoulShop });
export { renderSoulShop };
