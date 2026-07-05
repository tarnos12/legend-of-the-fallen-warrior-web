'use strict';

// World map panel: the 7 areas as clickable nodes on a canvas (#mapCanvas),
// placeholder biome colors/icons on a grid until real map art exists. Clicking
// a node fills the info panel on the right (#mapInfo: level range, enemy list
// — bestiary-aware, unfought enemies stay ???, drops placeholder); Travel
// moves combat there, restarting from wave 1. Locked areas draw grey + 🔒.
import { player } from '../core/core.js';
import { monsterAreas } from '../data/gameObjects.js';
import { monsterList } from '../data/monsterList.js';
import { areaMonsterKeys } from '../data/waves.js';
import { travelTo } from './battleCanvas.js';

// node layout on a 700x380 map; placeholder biomes until a real image lands
const NODES = {
    BanditHideout: { x: 100, y: 300, color: '#8a6d1a', icon: '🏕️', biome: 'Bandit camp' },
    ForestofNarsus: { x: 230, y: 230, color: '#3f8f4f', icon: '🌲', biome: 'Forest' },
    OzJotnar: { x: 350, y: 300, color: '#8b8b8b', icon: '⛰️', biome: 'Mountains' },
    TwistedMarrow: { x: 440, y: 180, color: '#7c5bb0', icon: '🕸️', biome: 'Caverns' },
    KharmSheath: { x: 540, y: 260, color: '#c2a25a', icon: '🏜️', biome: 'Wastes' },
    FrigidAberration: { x: 590, y: 120, color: '#7fc4e0', icon: '❄️', biome: 'Glacier' },
    Zyzx: { x: 470, y: 60, color: '#d9b24a', icon: '👑', biome: 'Capital' },
};
const NODE_R = 26;

let selectedArea = null;

function mapCtx() {
    const canvas = document.getElementById('mapCanvas');
    return canvas && canvas.getContext ? canvas.getContext('2d') : null;
}

function drawMap() {
    const ctx = mapCtx();
    if (!ctx) return;
    const canvas = document.getElementById('mapCanvas');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // placeholder terrain grid
    ctx.strokeStyle = 'rgba(74, 59, 29, 0.25)';
    for (let x = 0; x <= canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // route between consecutive areas
    ctx.strokeStyle = '#4a3b1d';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    monsterAreas.forEach((area, i) => {
        const node = NODES[area.type];
        if (!node) return;
        if (i === 0) ctx.moveTo(node.x, node.y);
        else ctx.lineTo(node.x, node.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;

    for (const area of monsterAreas) {
        const node = NODES[area.type];
        if (!node) continue;
        const unlocked = area.isUnlocked === true;
        const current = player.properties.combatArea === area.type;
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = unlocked ? node.color : '#3a3a3a';
        ctx.fill();
        ctx.strokeStyle =
            selectedArea === area.type ? '#edd26e' : current ? '#4ade80' : '#1c1712';
        ctx.lineWidth = selectedArea === area.type || current ? 4 : 2;
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(unlocked ? node.icon : '🔒', node.x, node.y + 1);
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = unlocked ? '#e9ddc2' : '#7a6f5c';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(area.displayName, node.x, node.y + NODE_R + 16);
        if (current) {
            ctx.fillStyle = '#4ade80';
            ctx.fillText('◆ you are here', node.x, node.y - NODE_R - 8);
        }
    }
}

function levelRange(areaType) {
    const levels = areaMonsterKeys(areaType).map((key) => monsterList[key].level);
    if (levels.length === 0) return '';
    return Math.min(...levels) + '–' + Math.max(...levels);
}

function renderInfo() {
    const info = document.getElementById('mapInfo');
    if (!info) return;
    const area = monsterAreas.find((a) => a.type === selectedArea);
    if (!area) {
        info.innerHTML = `<div class="c3">Select an area node for details.</div>`;
        return;
    }
    const node = NODES[area.type] || {};
    const unlocked = area.isUnlocked === true;
    const enemies = areaMonsterKeys(area.type)
        .map((key) => {
            const m = monsterList[key];
            // bestiary rule: enemies you never fought stay hidden
            return m.killCount > 0
                ? `<li>${m.displayName} <span class="mapEnemyLvl">lvl ${m.level}</span></li>`
                : `<li class="mapUnknown">??? <span class="mapEnemyLvl">lvl ${m.level}</span></li>`;
        })
        .join('');
    info.innerHTML =
        `<h4>${node.icon || ''} ${area.displayName}</h4>` +
        `<div class="mapBiome">${node.biome || ''}${unlocked ? '' : ' — <span style="color:var(--red);">locked</span>'}</div>` +
        `<div class="mapMeta">Enemy levels: ${levelRange(area.type)}</div>` +
        `<div class="mapMeta">Enemies:</div>` +
        `<ul class="mapEnemyList">${enemies}</ul>` +
        `<div class="mapMeta" style="opacity:0.6;">Notable drops: coming soon</div>` +
        (unlocked
            ? `<button type="button" id="mapTravel" class="sell" style="margin-top:8px;">Travel here</button>`
            : `<div class="mapMeta" style="opacity:0.8;">🔒 Unlocks through story progression.</div>`);
    const btn = info.querySelector('#mapTravel');
    if (btn) {
        btn.addEventListener('click', () => {
            if (travelTo(area.type)) {
                drawMap(); // "you are here" marker moves
                renderInfo();
                if (typeof window.CreateMonsterHtml === 'function') window.CreateMonsterHtml();
            }
        });
    }
}

function handleMapClick(event) {
    const canvas = document.getElementById('mapCanvas');
    const rect = canvas.getBoundingClientRect();
    // the canvas can be CSS-scaled; convert back to bitmap coordinates
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    for (const area of monsterAreas) {
        const node = NODES[area.type];
        if (!node) continue;
        if ((x - node.x) ** 2 + (y - node.y) ** 2 <= (NODE_R + 6) ** 2) {
            selectedArea = area.type;
            drawMap();
            renderInfo();
            return;
        }
    }
}

// Rerender when the panel opens (HUD nav onclick) — unlocks/current area may
// have changed since the last look.
function renderWorldMap() {
    if (!selectedArea) selectedArea = player.properties.combatArea || monsterAreas[0].type;
    drawMap();
    renderInfo();
}

function init() {
    const canvas = document.getElementById('mapCanvas');
    if (canvas) canvas.addEventListener('click', handleMapClick);
    renderWorldMap();
}

init();

Object.assign(window, { renderWorldMap });
