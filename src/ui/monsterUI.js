'use strict';

// On-stage quest tracker (formerly the full wave-progression list in the
// Character panel). Renders the current area's SINGLE active objective into
// #monsterTabs on the stage: the next locked wave's exact kill requirement
// with live progress, then the area boss, then "cleared". CreateMonsterHtml
// keeps its name/signature because half the game refreshes it (battle kills,
// quests, saves, stat updates) — that's also what keeps the tracker live.
import { monsterAreas } from '../data/gameObjects.js';
import { player } from '../core/core.js';
import { monsterList } from '../data/monsterList.js';
import { waveUnlocks } from '../data/waveUnlocks.js';

function panelAreaType() {
    const selected = player.properties.combatArea;
    if (monsterAreas.some((a) => a.type === selected && a.isUnlocked === true)) return selected;
    return (monsterAreas.find((a) => a.isUnlocked === true) || monsterAreas[0]).type;
}

function CreateMonsterHtml() {
    const container = document.getElementById('monsterTabs');
    if (!container) return;
    if (Object.keys(monsterList).length === 0) {
        container.innerHTML = '';
        return;
    }
    const areaType = panelAreaType();
    const area = monsterAreas.find((a) => a.type === areaType);
    const entries = Object.keys(monsterList)
        .filter((key) => monsterList[key].area === areaType)
        .sort((a, b) => monsterList[a].id - monsterList[b].id);

    // the one objective that matters right now: the first locked wave's
    // requirement (never revealing the locked monster's name), else the boss,
    // else the area is done
    let goal = '';
    const lockedIndex = entries.findIndex((key) => monsterList[key].isShown !== true);
    if (lockedIndex !== -1) {
        const unlock = waveUnlocks[entries[lockedIndex]];
        if (unlock && monsterList[unlock.requires]) {
            const need = monsterList[unlock.requires];
            goal =
                `🎯 Unlock wave ${lockedIndex + 1}: kill ${unlock.kills} ${need.displayName} ` +
                `(${Math.min(need.killCount, unlock.kills)}/${unlock.kills})`;
        }
    } else {
        const boss = entries.map((key) => monsterList[key]).find((m) => m.lastEnemy === true);
        if (boss && boss.killCount === 0) {
            goal = `🎯 Defeat the area boss: ${boss.displayName} ⚑`;
        } else {
            goal = `✓ All waves cleared — Warp available`;
        }
    }

    if (goal === '') goal = '🎯 Keep fighting to unlock the next wave'; // no waveUnlocks entry
    container.innerHTML =
        `<div class="questArea">${area ? area.displayName : ''}${player.properties.prestigeSuffix}</div>` +
        `<div class="questGoal">${goal}</div>`;
}

// Select an area by index (kept for rebirth(), which resets to the first area).
function changedTabmonster(index) {
    const area = monsterAreas[index];
    if (!area) return;
    player.properties.combatArea = area.type;
    player.properties.combatWave = 0;
    CreateMonsterHtml();
}

export { CreateMonsterHtml, changedTabmonster };
