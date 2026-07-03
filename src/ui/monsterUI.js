'use strict';

// Area progression panel (formerly the monster-selection panel with Fight
// buttons — selection moved to the canvas combat control bar). Renders the
// current combat area's waves into #monsterTabs: kill counts for unlocked
// waves, the exact unlock requirement for the next one, and ??? beyond that.
// CreateMonsterHtml keeps its name/signature because half the game refreshes
// it (battle kills, quests, saves, stat updates).
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

    let firstLockedShown = false;
    const rows = entries
        .map((key, i) => {
            const monster = monsterList[key];
            const waveNo = i + 1;
            if (monster.isShown === true) {
                const current =
                    i === player.properties.combatWave ? ' style="font-weight:bold;"' : '';
                return (
                    `<div class="col-xs-12"${current}>` +
                    `Wave ${waveNo}: ${monster.displayName} — Killed: ${monster.killCount}` +
                    (monster.lastEnemy === true && monster.killCount > 0 ? ' ⚑' : '') +
                    `</div>`
                );
            }
            // first locked wave: show the exact requirement and live progress
            const unlock = waveUnlocks[key];
            if (!firstLockedShown && unlock && monsterList[unlock.requires]) {
                firstLockedShown = true;
                const need = monsterList[unlock.requires];
                return (
                    `<div class="col-xs-12" style="opacity:0.75;">` +
                    `Wave ${waveNo}: 🔒 unlocks at ${unlock.kills} ${need.displayName} kills ` +
                    `(${Math.min(need.killCount, unlock.kills)}/${unlock.kills})` +
                    `</div>`
                );
            }
            return `<div class="col-xs-12" style="opacity:0.4;">Wave ${waveNo}: ???</div>`;
        })
        .join('');

    container.innerHTML =
        `<div class="row" style="padding:4px 0;">` +
        `<div class="col-xs-12 c3"><h4>${area ? area.displayName : ''}${player.properties.prestigeSuffix}</h4></div>` +
        rows +
        `</div>`;
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
