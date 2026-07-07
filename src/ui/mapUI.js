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
import { BOSS_UNIQUES } from '../data/bossUniques.js';
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

// ---- painted world-map basemap (fully procedural, deterministic) ------------
// Replaces the old placeholder grid with a hand-drawn continent: a smooth
// sine-perturbed coastline, per-area biome tints, terrain glyphs, ocean waves
// and a compass. Everything is a pure function of position (no Math.random at
// draw time) so it stays rock-steady across the frequent hover/click redraws.
const MAP_CX = 350;
const MAP_CY = 196;
const MAP_RX = 312;
const MAP_RY = 172;

// coastline radius multiplier at angle theta — layered sines = organic but
// stable. The SAME function backs isOcean(), so decor/waves land correctly.
function coastM(theta) {
    return (
        1 +
        0.1 * Math.sin(3 * theta + 0.7) +
        0.06 * Math.sin(5 * theta + 2.1) +
        0.045 * Math.sin(8 * theta + 4.2)
    );
}
function isOcean(x, y) {
    const dx = (x - MAP_CX) / MAP_RX;
    const dy = (y - MAP_CY) / MAP_RY;
    return Math.hypot(dx, dy) > coastM(Math.atan2(dy, dx));
}
function coastPath(ctx) {
    ctx.beginPath();
    const STEPS = 96;
    for (let i = 0; i <= STEPS; i++) {
        const th = (i / STEPS) * Math.PI * 2;
        const m = coastM(th);
        const x = MAP_CX + Math.cos(th) * MAP_RX * m;
        const y = MAP_CY + Math.sin(th) * MAP_RY * m;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}
// deterministic PRNG + string hash so scattered decor is stable per area
function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function hexA(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function drawTree(ctx, x, y, s) {
    ctx.fillStyle = '#5a3b1e';
    ctx.fillRect(x - s * 0.1, y + s * 0.35, s * 0.2, s * 0.45);
    ctx.fillStyle = '#2f5133';
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x - s * 0.6, y + s * 0.5);
    ctx.lineTo(x + s * 0.6, y + s * 0.5);
    ctx.closePath();
    ctx.fill();
}
function drawMountain(ctx, x, y, s, snow) {
    ctx.fillStyle = '#6b6256';
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x - s * 0.9, y + s * 0.7);
    ctx.lineTo(x + s * 0.9, y + s * 0.7);
    ctx.closePath();
    ctx.fill();
    if (snow) {
        ctx.fillStyle = '#e8eef2';
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.lineTo(x - s * 0.32, y - s * 0.26);
        ctx.lineTo(x, y - s * 0.1);
        ctx.lineTo(x + s * 0.32, y - s * 0.26);
        ctx.closePath();
        ctx.fill();
    }
}
function drawDune(ctx, x, y, s) {
    ctx.strokeStyle = '#9a884f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y + s * 0.4, s, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.lineWidth = 1;
}
function drawTower(ctx, x, y, s) {
    ctx.fillStyle = '#7a6a3a';
    ctx.fillRect(x - s * 0.35, y - s, s * 0.7, s * 1.5);
    ctx.fillStyle = '#c9a94a';
    ctx.fillRect(x - s * 0.45, y - s * 1.25, s * 0.9, s * 0.3);
}
function drawWave(ctx, x, y, s) {
    ctx.strokeStyle = 'rgba(180,205,214,0.3)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(x - s, y, s, Math.PI, 0, true);
    ctx.arc(x + s, y, s, Math.PI, 0, true);
    ctx.stroke();
    ctx.lineWidth = 1;
}
function decorFor(ctx, biome, x, y, rng) {
    const s = 5 + rng() * 3;
    if (biome === 'Forest') drawTree(ctx, x, y, s + 2);
    else if (biome === 'Mountains') drawMountain(ctx, x, y, s + 3, false);
    else if (biome === 'Glacier') drawMountain(ctx, x, y, s + 3, true);
    else if (biome === 'Wastes') drawDune(ctx, x, y, s + 1);
    else if (biome === 'Caverns') drawMountain(ctx, x, y, s + 1, false);
    else if (biome === 'Capital') drawTower(ctx, x, y, s);
    else drawTree(ctx, x, y, s); // bandit camp: sparse scrub
}
function drawCompass(ctx, x, y, r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(233,221,194,0.55)';
    ctx.fillStyle = 'rgba(233,221,194,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
        const a = k * (Math.PI / 2) - Math.PI / 2; // N is up
        const tipX = x + Math.cos(a) * r;
        const tipY = y + Math.sin(a) * r;
        const px = Math.cos(a + Math.PI / 2) * r * 0.16;
        const py = Math.sin(a + Math.PI / 2) * r * 0.16;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(x + px, y + py);
        ctx.lineTo(x - px, y - py);
        ctx.closePath();
        if (k === 0) ctx.fill();
        else ctx.stroke();
    }
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(233,221,194,0.8)';
    ctx.fillText('N', x, y - r - 6);
    ctx.restore();
}

function drawBasemap(ctx, w, h) {
    // ocean
    const sea = ctx.createLinearGradient(0, 0, 0, h);
    sea.addColorStop(0, '#15303a');
    sea.addColorStop(1, '#0e2028');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);

    // open-water waves (stable, only outside the coast)
    const wrng = makeRng(0x1357);
    for (let i = 0; i < 110; i++) {
        const x = wrng() * w;
        const y = wrng() * h;
        if (!isOcean(x, y)) continue;
        drawWave(ctx, x, y, 3 + wrng() * 2);
    }

    // landmass with a soft drop shadow, then a foam + ink coastline
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    coastPath(ctx);
    const land = ctx.createLinearGradient(0, 10, 0, h);
    land.addColorStop(0, '#857856');
    land.addColorStop(1, '#6a5f45');
    ctx.fillStyle = land;
    ctx.fill();
    ctx.restore();
    coastPath(ctx);
    ctx.strokeStyle = 'rgba(216,203,160,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#3e3722';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.lineWidth = 1;

    // per-area biome tint + terrain glyphs, clipped to the land
    ctx.save();
    coastPath(ctx);
    ctx.clip();
    for (const area of monsterAreas) {
        const node = NODES[area.type];
        if (!node) continue;
        const g = ctx.createRadialGradient(node.x, node.y, 6, node.x, node.y, 96);
        g.addColorStop(0, hexA(node.color, area.isUnlocked === true ? 0.5 : 0.26));
        g.addColorStop(1, hexA(node.color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(node.x - 104, node.y - 104, 208, 208);
    }
    for (const area of monsterAreas) {
        const node = NODES[area.type];
        if (!node) continue;
        const rng = makeRng(hashStr(area.type));
        for (let i = 0; i < 8; i++) {
            const ang = rng() * Math.PI * 2;
            const dist = 26 + rng() * 48;
            const x = node.x + Math.cos(ang) * dist;
            const y = node.y + Math.sin(ang) * dist * 0.7;
            if (isOcean(x, y)) continue;
            decorFor(ctx, node.biome, x, y, rng);
        }
    }
    ctx.restore();

    // compass + inner frame
    drawCompass(ctx, w - 52, h - 52, 22);
    ctx.strokeStyle = 'rgba(74,59,29,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.lineWidth = 1;
}

function drawMap() {
    const ctx = mapCtx();
    if (!ctx) return;
    const canvas = document.getElementById('mapCanvas');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // painted continent (ocean, coastline, biomes, decor, compass)
    drawBasemap(ctx, canvas.width, canvas.height);

    // dotted travel trail between consecutive areas
    ctx.strokeStyle = 'rgba(43,32,14,0.85)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([1.5, 7]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    monsterAreas.forEach((area, i) => {
        const node = NODES[area.type];
        if (!node) return;
        if (i === 0) ctx.moveTo(node.x, node.y);
        else ctx.lineTo(node.x, node.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
    ctx.lineWidth = 1;

    for (const area of monsterAreas) {
        const node = NODES[area.type];
        if (!node) continue;
        const unlocked = area.isUnlocked === true;
        const current = player.properties.combatArea === area.type;
        // node disc pops off the painted land with a soft shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle = unlocked ? node.color : '#3a3a3a';
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle =
            selectedArea === area.type ? '#edd26e' : current ? '#4ade80' : '#1c1712';
        ctx.lineWidth = selectedArea === area.type || current ? 4 : 2;
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(unlocked ? node.icon : '🔒', node.x, node.y + 1);
        // labels get a dark outline so they stay readable over any biome
        ctx.font = 'bold 12px sans-serif';
        ctx.textBaseline = 'alphabetic';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(20,16,12,0.85)';
        ctx.fillStyle = unlocked ? '#f1e7cf' : '#9a8f78';
        ctx.strokeText(area.displayName, node.x, node.y + NODE_R + 16);
        ctx.fillText(area.displayName, node.x, node.y + NODE_R + 16);
        if (current) {
            ctx.fillStyle = '#67e88a';
            ctx.strokeText('◆ you are here', node.x, node.y - NODE_R - 8);
            ctx.fillText('◆ you are here', node.x, node.y - NODE_R - 8);
        }
        ctx.lineWidth = 1;
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
    const bossUniqueNames = areaMonsterKeys(area.type)
        .flatMap((key) => BOSS_UNIQUES[monsterList[key].name] || [])
        .map((u) => u.name);
    const bossDropLine = bossUniqueNames.length
        ? `<div class="mapMeta">Boss drop: <span class="mapUnique">☠ ${bossUniqueNames.join(', ')}</span></div>`
        : '';
    info.innerHTML =
        `<h4>${node.icon || ''} ${area.displayName}</h4>` +
        `<div class="mapBiome">${node.biome || ''}${unlocked ? '' : ' — <span style="color:var(--red);">locked</span>'}</div>` +
        `<div class="mapMeta">Enemy levels: ${levelRange(area.type)}</div>` +
        `<div class="mapMeta">Enemies:</div>` +
        `<ul class="mapEnemyList">${enemies}</ul>` +
        `<div class="mapMeta">Drops: item level ${levelRange(area.type)} gear</div>` +
        bossDropLine +
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
