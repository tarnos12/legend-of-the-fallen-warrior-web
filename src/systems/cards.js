'use strict';

// Collectible-card system (2026-07). Card ownership lives in
// player.properties.cardsOwned (map monsterKey -> true, persisted). Completing
// an area's full card set adds that area's bonus to the aggregate rate numbers
// on player.properties, which core.js's drop/exp/gold rate functions read.
import { player } from '../core/core.js';
import { monsterList } from '../data/monsterList.js';
import { monsterAreas } from '../data/gameObjects.js';
import { CARD_DROP_CHANCE, CARD_SET_BONUS } from '../data/cards.js';
import { Log } from '../core/log.js';

function areaCardKeys(areaType) {
    return Object.keys(monsterList).filter((key) => monsterList[key].area === areaType);
}

// An area's set is complete when every one of its monsters' cards is owned.
export function isAreaSetComplete(areaType) {
    const keys = areaCardKeys(areaType);
    if (keys.length === 0) return false;
    const owned = player.properties.cardsOwned || {};
    return keys.every((key) => owned[key] === true);
}

// Recompute the three aggregate rate bonuses from all COMPLETED area sets.
// Called after gaining a card and once on load (old saves start at 0).
export function recomputeCardBonuses() {
    let gold = 0;
    let drop = 0;
    let exp = 0;
    for (const area of monsterAreas) {
        const bonus = CARD_SET_BONUS[area.type];
        if (!bonus || !isAreaSetComplete(area.type)) continue;
        if (bonus.channel === 'gold') gold += bonus.value;
        else if (bonus.channel === 'drop') drop += bonus.value;
        else if (bonus.channel === 'exp') exp += bonus.value;
    }
    player.properties.cardGoldBonus = gold;
    player.properties.cardDropBonus = drop;
    player.properties.cardExpBonus = exp;
}

// Card ownership helpers (used by the bestiary UI).
export function ownsCard(monsterKey) {
    return (player.properties.cardsOwned || {})[monsterKey] === true;
}
export function areaCardProgress(areaType) {
    const keys = areaCardKeys(areaType);
    const owned = keys.filter((key) => ownsCard(key)).length;
    return { owned, total: keys.length };
}

// Roll a card drop for a kill. Grants the monster's card (if not already owned)
// at CARD_DROP_CHANCE (doubled for shiny). Returns the monster KEY on a new
// card, else null. quiet skips the log (offline bulk grants).
export function rollCard(monster, quiet, shiny) {
    if (!player.properties.cardsOwned) player.properties.cardsOwned = {};
    // find this monster's key (kills carry the monster object, not the key)
    let key = null;
    for (const k in monsterList) {
        if (monsterList[k] === monster || monsterList[k].name === monster.name) {
            key = k;
            break;
        }
    }
    if (key === null || player.properties.cardsOwned[key] === true) return null;
    if (Math.random() >= CARD_DROP_CHANCE * (shiny ? 2 : 1)) return null;
    player.properties.cardsOwned[key] = true;
    const areaComplete = isAreaSetComplete(monster.area);
    recomputeCardBonuses();
    if (!quiet) {
        Log(
            '<span class="bold" style="color:#60a5fa;">🃏 ' +
                monster.displayName +
                ' card collected!' +
                (areaComplete ? ' Area set complete — set bonus active!' : '') +
                '<br /></span>'
        );
    }
    return key;
}
