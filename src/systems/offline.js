'use strict';

// Offline progress: when a save is loaded, the time since it was written
// (savedAt, stamped by every manual save and autosave) is converted into
// kills of the save's current wave monster, using the same numbers the live
// sim runs on. Each offline kill grants the REAL per-kill rewards
// (exp/level-ups, gold, item-drop rolls, kill counts, quest unlocks) via
// grantKillRewards, so offline loot is real loot. The wave selection is NOT
// advanced offline — you resume exactly where you left off, richer.
import { player, playerInventory } from '../core/core.js';
import { Log } from '../core/log.js';
import { monsterList } from '../data/monsterList.js';
import { monsterAreas } from '../data/gameObjects.js';
import { unlockedWaveCount, unlockedWaveMembers } from '../data/waves.js';
import { grantKillRewards, displayLogInfo } from './battle.js';
import { weaponCombatProfile } from './weaponBehavior.js';
import { quest } from './quest.js';
import { updateHtml } from './stats.js';
import { CreateInventoryWeaponHtml } from '../ui/inventoryUI.js';

const MIN_AWAY_SECONDS = 60; // shorter absences aren't worth a banner
const MAX_AWAY_SECONDS = 8 * 3600; // idle-game classic: 8h offline cap
const MAX_KILLS = 300; // hard cap (each kill runs the real reward pipeline)
const EFFICIENCY = 0.7; // walk-in time, wave gaps, deaths...

// The save's current wave monster (same selection rules as the combat canvas:
// the wave group's first unlocked member stands in for the mixed pool).
function savedWaveMonster() {
    let areaType = player.properties.combatArea;
    const unlocked = monsterAreas.filter((a) => a.isUnlocked === true);
    if (!unlocked.some((a) => a.type === areaType)) {
        areaType = (unlocked[0] || monsterAreas[0]).type;
    }
    const index = Math.max(
        0,
        Math.min(player.properties.combatWave, unlockedWaveCount(areaType) - 1)
    );
    const pool = unlockedWaveMembers(areaType, index);
    return pool.length ? monsterList[pool[0]] : null;
}

// Kills per second from the live-combat numbers: average weapon damage at the
// weapon's swing speed, hit chance vs the monster, a modest spell bonus.
export function estimateKillsPerSecond(monster) {
    const profile = weaponCombatProfile();
    const avgDamage = (player.functions.minDamage() + player.functions.maxDamage()) / 2;
    const hitChance = Math.max(0.1, Math.min(1, (player.functions.accuracy() - monster.eva) / 100));
    const dps = (avgDamage / profile.cooldown) * hitChance * 1.2;
    return (dps / monster.maxHp) * EFFICIENCY;
}

function formatAway(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? hours + 'h ' + minutes + 'm' : minutes + 'm';
}

function showBanner(summary) {
    const anchor = document.getElementById('canvasBattleWrap');
    if (!anchor) return;
    const banner = document.createElement('div');
    banner.id = 'offlineSummary';
    banner.className = 'c3';
    banner.style.cssText =
        'margin:6px 0; padding:8px; border:1px solid #8a6d1a; background:#f3e2a0;';
    banner.innerHTML =
        `<strong>While you were away (${formatAway(summary.awaySeconds)}):</strong> ` +
        `${summary.kills} kills, +${summary.gold} gold` +
        // the exp counter resets on level-ups, so show whichever is meaningful
        (summary.levels > 0 ? `, +${summary.levels} levels` : `, +${summary.exp} exp`) +
        (summary.items > 0 ? `, ${summary.items} items` : '') +
        ` <button type="button" class="sell" style="margin-left:8px;">OK</button>`;
    banner.querySelector('button').addEventListener('click', () => banner.remove());
    anchor.parentElement.insertBefore(banner, anchor);
}

export function applyOfflineProgress(savedAt) {
    if (typeof savedAt !== 'number') return null;
    const elapsed = (Date.now() - savedAt) / 1000;
    if (elapsed < MIN_AWAY_SECONDS) return null;
    const monster = savedWaveMonster();
    if (!monster) return null;
    const awaySeconds = Math.min(elapsed, MAX_AWAY_SECONDS);
    const kills = Math.min(MAX_KILLS, Math.floor(awaySeconds * estimateKillsPerSecond(monster)));
    if (kills <= 0) return null;

    const before = {
        gold: player.properties.gold,
        exp: player.properties.experience,
        level: player.properties.level,
        items: playerInventory.length,
    };
    // quiet mode: the per-kill DOM work (log/gold counter/updateHtml/quest
    // re-render) is skipped in the loop and done ONCE below — 300 kills would
    // otherwise hitch the load for seconds
    for (let i = 0; i < kills; i++) grantKillRewards(monster, true);
    quest(); // apply any unlocks the offline kills earned
    updateHtml();
    CreateInventoryWeaponHtml(); // render the offline drops once
    displayLogInfo(); // one end-of-battle cleanup: heal + buff tick + rerender

    const summary = {
        awaySeconds: Math.floor(awaySeconds),
        kills,
        gold: player.properties.gold - before.gold,
        // exp across level-ups isn't a simple delta; report the raw counter
        // difference when no level was gained, else the levels themselves
        exp: Math.max(0, player.properties.experience - before.exp),
        levels: player.properties.level - before.level,
        items: playerInventory.length - before.items,
    };
    Log(
        '<span class="bold" style="color:orange;">While you were away: ' +
            summary.kills +
            ' kills, +' +
            summary.gold +
            ' gold.<br /></span>'
    );
    showBanner(summary);
    return summary;
}
