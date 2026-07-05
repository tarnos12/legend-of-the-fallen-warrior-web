'use strict';

// Bestiary panel: one card per monster, grouped by area, driven entirely by
// the persisted killCount (no new save data). Knowledge unlocks in tiers:
//   0 kills   — ??? silhouette
//   1+ kills  — name, portrait, level
//   10+ kills — combat stats (health, damage, defense)
//   25+ kills — rewards (exp, gold range)
//   100 kills — mastered (drop table placeholder until drops-per-monster land)
// Shiny variants (ui/battleCanvas.js) are called out in the header.
import { monsterAreas } from '../data/gameObjects.js';
import { monsterList } from '../data/monsterList.js';
import { areaMonsterKeys } from '../data/waves.js';

export const BESTIARY_MASTERY_KILLS = 100;

function tierFor(kills) {
    if (kills >= BESTIARY_MASTERY_KILLS) return 4;
    if (kills >= 25) return 3;
    if (kills >= 10) return 2;
    if (kills >= 1) return 1;
    return 0;
}

function monsterCard(key) {
    const m = monsterList[key];
    const kills = m.killCount;
    const tier = tierFor(kills);
    if (tier === 0) {
        return (
            `<div class="beastCard beastUnknown">` +
            `<div class="beastPortrait">?</div>` +
            `<div class="beastName">???</div>` +
            `</div>`
        );
    }
    const progress = Math.min(kills, BESTIARY_MASTERY_KILLS);
    const statsBlock =
        tier >= 2
            ? `<div class="beastStats">❤ ${m.maxHp} · ⚔ ${Math.floor(m.minDmg())}-${Math.floor(m.maxDmg())} · 🛡 ${Math.floor(m.def())}</div>`
            : `<div class="beastStats beastLocked">Stats at 10 kills</div>`;
    const rewardBlock =
        tier >= 3
            ? `<div class="beastStats">✦ ${Math.floor(m.baseExp())} exp · 💰 ${m.level}-${m.level + 5} gold</div>`
            : `<div class="beastStats beastLocked">Rewards at 25 kills</div>`;
    const masteryBlock =
        tier >= 4
            ? `<div class="beastStats beastMastered">★ Mastered — drop table coming soon</div>`
            : `<div class="beastStats beastLocked">Drops at ${BESTIARY_MASTERY_KILLS} kills</div>`;
    return (
        `<div class="beastCard">` +
        `<div class="beastPortrait"><img src="images/monsters/${m.name}.png" alt=""></div>` +
        `<div class="beastName">${m.displayName}${m.lastEnemy === true ? ' ⚑' : ''}</div>` +
        `<div class="beastStats">Level ${m.level} · ${kills} kills</div>` +
        statsBlock +
        rewardBlock +
        masteryBlock +
        `<div class="beastProgress"><div class="beastProgressFill" style="width:${Math.floor((progress / BESTIARY_MASTERY_KILLS) * 100)}%;"></div></div>` +
        `</div>`
    );
}

function renderBestiary() {
    const container = document.getElementById('bestiaryContent');
    if (!container || Object.keys(monsterList).length === 0) return;
    let known = 0;
    let total = 0;
    for (const key in monsterList) {
        total++;
        if (monsterList[key].killCount > 0) known++;
    }
    const sections = monsterAreas
        .map((area) => {
            const cards = areaMonsterKeys(area.type).map(monsterCard).join('');
            return (
                `<div class="c3 beastAreaTitle"><h4>${area.displayName}</h4></div>` +
                `<div class="beastGrid">${cards}</div>`
            );
        })
        .join('');
    container.innerHTML =
        `<div class="c3">Encountered: ${known}/${total} — fight a monster to reveal its entry; ` +
        `keep hunting it to learn more (complete at ${BESTIARY_MASTERY_KILLS} kills). ` +
        `<span style="color:#facc15;">✨ Shiny</span> variants grant triple exp/gold and better drops.</div>` +
        sections;
}

Object.assign(window, { renderBestiary });
