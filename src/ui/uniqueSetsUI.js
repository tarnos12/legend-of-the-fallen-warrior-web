'use strict';

// "Fallen Legends" set-progress panel (#uniqueSets, below the Soul Shop in the
// Shop tab). Shows how many boss uniques are currently equipped and the active
// set bonus (with a hint toward the next tier). Bonuses are computed live from
// equipped items (core.js), so this just reflects the current equip loadout.
import { player } from '../core/core.js';
import { UNIQUE_SET_NAME, UNIQUE_SET_MAX, UNIQUE_SET_TIERS } from '../data/uniqueSets.js';

function fmtBonus(b) {
    if (!b || Object.keys(b).length === 0) return null;
    const parts = [];
    if (b.damage) parts.push(`+${b.damage}% damage`);
    if (b.defense) parts.push(`+${b.defense}% defense`);
    if (b.magicFind) parts.push(`+${b.magicFind}% magic find`);
    if (b.gold) parts.push(`+${b.gold}% gold`);
    return parts.join(' · ');
}

function renderUniqueSets() {
    const el = document.getElementById('uniqueSets');
    if (!el) return;
    const pieces = player.functions.equippedUniqueCount();
    const current = fmtBonus(player.functions.uniqueSetBonus());
    // pips: filled per equipped piece, up to the max wearable
    let pips = '';
    for (let i = 0; i < UNIQUE_SET_MAX; i++) {
        pips += `<span class="setPip${i < pieces ? ' setPipOn' : ''}">☠</span>`;
    }
    // next-tier hint
    const nextBonus = pieces < UNIQUE_SET_MAX ? fmtBonus(UNIQUE_SET_TIERS[pieces + 1]) : null;
    const nextLine = nextBonus
        ? `<div class="setNext">Next (${pieces + 1} pieces): ${nextBonus}</div>`
        : pieces >= UNIQUE_SET_MAX
          ? `<div class="setNext">★ Full set — maximum bonus active.</div>`
          : '';
    el.innerHTML =
        `<div class="setHeader"><strong>${UNIQUE_SET_NAME}</strong> — ${pieces}/${UNIQUE_SET_MAX} boss uniques equipped ${pips}</div>` +
        (current
            ? `<div class="setActive">Active: ${current}</div>`
            : `<div class="setInactive">Equip 2+ boss uniques (weapon / shield / amulet / talisman) for a set bonus.</div>`) +
        nextLine;
}

// Always-visible HUD indicator mirroring the set piece-count outside the Shop.
// Hidden (empty) until at least 2 pieces are equipped (i.e. a set bonus is active).
function renderSetHud() {
    const el = document.getElementById('setHud');
    if (!el) return;
    const pieces = player.functions.equippedUniqueCount();
    el.innerHTML = pieces < 2 ? '' : '⚜ ' + pieces + '/' + UNIQUE_SET_MAX;
}

Object.assign(window, { renderUniqueSets, renderSetHud });
export { renderUniqueSets, renderSetHud };
