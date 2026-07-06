'use strict';

// Nodebuster-style canvas skill trees (Skills panel). Two canvases:
//   #passiveTreeCanvas — the passive grid as connected node columns
//     (Offensive / Defensive / Utility); clicking an affordable node spends a
//     skill point via the existing window.upgradePassive.
//   #weaponTreeCanvas — one column per weapon: the mastery node on top, its
//     skills chained below, lit once the mastery level reaches each skill's
//     requirement (informational — weapon skills unlock by fighting).
// Hovering a node fills the side info panel (#passiveTreeInfo/#weaponTreeInfo).
// The legacy DOM renderers (CreateWeaponSkillHtml/CreatePlayerSkillsHtml)
// still run into their now-hidden divs — updateBar() and several systems
// write into spans there — these canvases are only the visible presentation.
import { player } from '../core/core.js';
import { playerPassive, weaponSkillList } from '../data/skills.js';
import { weaponMastery } from '../data/weaponMastery.js';
import { weaponTypeObject } from '../data/gameObjects.js';
import { getImage } from './uiCommon.js';

const NODE = 52;
const GAP_X = 84;
const GAP_Y = 76;
const TOP = 64;
const LEFT = 42;
// Organic layout: each node drifts sideways by a deterministic amount so the
// chains read as branching vines instead of ramrod columns, and consecutive
// nodes are joined by a smooth bezier "vine" rather than a straight spine. The
// drift is a pure function of (column,row) — stable across the frequent
// hover/click redraws — and small enough (±SWAY) to keep every node and its
// hit box inside the canvas bitmap (see index.html widths).
const SWAY = 14;
function swayX(col, row) {
    return Math.sin(row * 0.85 + col * 1.6) * SWAY;
}

const TREE_LABELS = [
    { label: 'Offensive', from: 0, to: 2 },
    { label: 'Defensive', from: 3, to: 5 },
    { label: 'Utility', from: 6, to: 7 },
];

let passiveHits = [];
let weaponHits = [];
let hoveredPassive = null;
let hoveredWeapon = null;
let redrawQueued = false;

function passiveColumns() {
    const columns = [];
    let current = null;
    for (const key in playerPassive) {
        if (playerPassive[key].firstRow === true) {
            current = [];
            columns.push(current);
        }
        if (current) current.push(key);
    }
    return columns;
}

function canvas2d(id) {
    const canvas = document.getElementById(id);
    return canvas && canvas.getContext ? { canvas, ctx: canvas.getContext('2d') } : null;
}

// icons load async; redraw once shortly after so no node stays blank
function queueRedraw() {
    if (redrawQueued) return;
    redrawQueued = true;
    setTimeout(() => {
        redrawQueued = false;
        drawPassiveTree();
        drawWeaponTree();
    }, 350);
}

function drawIcon(ctx, src, x, y, size, alpha) {
    const img = getImage(src);
    if (img.complete && img.naturalWidth > 0) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, x, y, size, size);
        ctx.globalAlpha = 1;
    } else {
        queueRedraw();
    }
}

function nodeFrame(ctx, x, y, state, hovered) {
    // state: 'locked' | 'available' | 'leveled' | 'maxed'
    ctx.fillStyle = state === 'maxed' ? '#3a2f1c' : state === 'locked' ? '#171310' : '#241d16';
    ctx.strokeStyle =
        state === 'locked'
            ? '#4a3b1d'
            : state === 'maxed'
              ? '#edd26e'
              : state === 'leveled'
                ? '#d9b24a'
                : '#8a6d1a';
    ctx.lineWidth = state === 'locked' ? 1 : 2;
    if (state === 'available') {
        ctx.shadowColor = '#d9b24a';
        ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.roundRect(x, y, NODE, NODE, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    if (hovered) {
        ctx.strokeStyle = '#e9ddc2';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - 3, y - 3, NODE + 6, NODE + 6, 10);
        ctx.stroke();
    }
    ctx.lineWidth = 1;
}

// Smooth connector through a chain of node-center points: each segment is a
// vertical-tangent bezier, so a small horizontal offset between stacked nodes
// curves organically instead of kinking.
function drawVine(ctx, points) {
    if (points.length < 2) return;
    ctx.strokeStyle = '#4a3b1d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const midY = (a.y + b.y) / 2;
        ctx.bezierCurveTo(a.x, midY, b.x, midY, b.x, b.y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
}

function drawPassiveTree() {
    const c = canvas2d('passiveTreeCanvas');
    if (!c) return;
    const { canvas, ctx } = c;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    passiveHits = [];

    const columns = passiveColumns();
    // group headers
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    for (const group of TREE_LABELS) {
        if (group.from >= columns.length) continue;
        const x1 = LEFT + group.from * GAP_X;
        const x2 = LEFT + Math.min(group.to, columns.length - 1) * GAP_X + NODE;
        ctx.fillStyle = '#d9b24a';
        ctx.fillText(group.label, (x1 + x2) / 2, 24);
        ctx.strokeStyle = '#4a3b1d';
        ctx.beginPath();
        ctx.moveTo(x1, 34);
        ctx.lineTo(x2, 34);
        ctx.stroke();
    }

    columns.forEach((keys, col) => {
        const baseX = LEFT + col * GAP_X;
        // organic node positions (deterministic sideways drift per row)
        const nodes = keys.map((key, row) => ({
            key,
            x: baseX + swayX(col, row),
            y: TOP + row * GAP_Y,
        }));
        // vine connector through the swayed node centers
        drawVine(
            ctx,
            nodes.map((n) => ({ x: n.x + NODE / 2, y: n.y + NODE / 2 }))
        );

        nodes.forEach(({ key, x, y }) => {
            const passive = playerPassive[key];
            const unlocked = player.properties.level >= passive.levelReq;
            let state;
            if (!unlocked) state = 'locked';
            else if (passive.level >= passive.maxLevel) state = 'maxed';
            else if (passive.level > 0) state = 'leveled';
            // unlocked at 0 points draws 'available' (glow) only when there
            // is actually a point to spend; otherwise like a leveled node
            else state = player.properties.skillPoints > 0 ? 'available' : 'leveled';
            nodeFrame(ctx, x, y, state, hoveredPassive === key);
            drawIcon(
                ctx,
                'images/passive/' + passive.image + '.png',
                x + 6,
                y + 6,
                NODE - 12,
                unlocked ? 1 : 0.3
            );
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            if (unlocked) {
                ctx.fillStyle = passive.level >= passive.maxLevel ? '#edd26e' : '#b0a184';
                ctx.fillText(passive.level + '/' + passive.maxLevel, x + NODE / 2, y + NODE + 13);
            } else {
                ctx.fillStyle = '#7a6f5c';
                ctx.fillText('Lv ' + passive.levelReq, x + NODE / 2, y + NODE + 13);
            }
            passiveHits.push({ x, y, key });
        });
    });
}

function drawWeaponTree() {
    const c = canvas2d('weaponTreeCanvas');
    if (!c) return;
    const { canvas, ctx } = c;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    weaponHits = [];

    weaponTypeObject.forEach((weapon, col) => {
        const type = weapon.type;
        const baseX = LEFT + col * (GAP_X + 30);
        const mastery = weaponMastery[type];
        const skills = Object.keys(weaponSkillList[type] || {});

        // chain: mastery node (index 0) then its skills, each with organic drift
        const chain = [{ y: 20 }].concat(
            skills.map((_, row) => ({ y: 20 + (row + 1) * GAP_Y }))
        );
        chain.forEach((n, i) => {
            n.x = baseX + swayX(col, i);
        });
        // vine connector through the swayed centers
        drawVine(
            ctx,
            chain.map((n) => ({ x: n.x + NODE / 2, y: n.y + NODE / 2 }))
        );

        // mastery node on top
        const mx = chain[0].x;
        const my = chain[0].y;
        nodeFrame(
            ctx,
            mx,
            my,
            mastery.level > 1 ? 'maxed' : 'leveled',
            hoveredWeapon === 'mastery:' + type
        );
        drawIcon(ctx, 'images/skills/' + type + '.png', mx + 6, my + 6, NODE - 12, 1);
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#edd26e';
        ctx.fillText('Lv ' + mastery.level, mx + NODE / 2, my + NODE + 13);
        weaponHits.push({ x: mx, y: my, key: 'mastery:' + type });

        skills.forEach((skillKey, row) => {
            const skill = weaponSkillList[type][skillKey];
            const nx = chain[row + 1].x;
            const ny = chain[row + 1].y;
            const unlocked = mastery.level >= skill.levelReq;
            nodeFrame(ctx, nx, ny, unlocked ? 'maxed' : 'locked', hoveredWeapon === type + ':' + skillKey);
            drawIcon(
                ctx,
                'images/skills/' + skill.image + '.png',
                nx + 6,
                ny + 6,
                NODE - 12,
                unlocked ? 1 : 0.3
            );
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = unlocked ? '#b0a184' : '#7a6f5c';
            ctx.fillText(unlocked ? '✓' : 'Lv ' + skill.levelReq, nx + NODE / 2, ny + NODE + 13);
            weaponHits.push({ x: nx, y: ny, key: type + ':' + skillKey });
        });
    });
}

function renderPassiveInfo(key) {
    const info = document.getElementById('passiveTreeInfo');
    if (!info) return;
    const header =
        `<div class="treeInfoHeader">Skill points: <strong>${player.properties.skillPoints}</strong> ` +
        `<button type="button" class="sell" onclick="resetPassiveSkills(); renderSkillTrees();">Reset</button></div>`;
    if (!key || !playerPassive[key]) {
        info.innerHTML = header + `<div class="c3">Hover a node for details; click to spend a point.</div>`;
        return;
    }
    const passive = playerPassive[key];
    info.innerHTML =
        header +
        `<h4>${passive.name}</h4>` +
        `<div>${passive.description()} player level ${passive.levelReq}</div>` +
        `<div class="mapMeta">Level: ${passive.level}/${passive.maxLevel}</div>` +
        (player.properties.level < passive.levelReq
            ? `<div style="color:var(--red);">🔒 Requires player level ${passive.levelReq}</div>`
            : passive.level < passive.maxLevel
              ? `<div style="color:var(--green);">Click the node to level up</div>`
              : `<div style="color:var(--gold-bright);">★ Maxed</div>`);
}

function renderWeaponInfo(key) {
    const info = document.getElementById('weaponTreeInfo');
    if (!info) return;
    if (!key) {
        info.innerHTML = `<div class="c3">Weapon skills unlock automatically as the matching weapon mastery levels up (fight with the weapon equipped).</div>`;
        return;
    }
    if (key.startsWith('mastery:')) {
        const type = key.slice(8);
        const mastery = weaponMastery[type];
        const weapon = weaponTypeObject.find((w) => w.type === type);
        info.innerHTML =
            `<h4>${weapon ? weapon.displayName : type} Mastery</h4>` +
            `<div class="mapMeta">Level ${mastery.level} — ${mastery.experience}/${mastery.maxExperience} exp</div>` +
            `<div class="c3">Levels up as you fight with a ${type} equipped; unlocks the skills below and boosts stats.</div>`;
        return;
    }
    const [type, skillKey] = key.split(':');
    const skill = weaponSkillList[type] && weaponSkillList[type][skillKey];
    if (!skill) return;
    const unlocked = weaponMastery[type].level >= skill.levelReq;
    info.innerHTML =
        `<h4>${skill.name}</h4>` +
        `<div>${skill.description()}</div>` +
        `<div class="mapMeta">${unlocked ? '✓ Unlocked' : '🔒 Requires ' + type + ' mastery ' + skill.levelReq} (now ${weaponMastery[type].level})</div>`;
}

function hitAt(canvas, hits, event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const hit = hits.find((h) => x >= h.x && x <= h.x + NODE && y >= h.y && y <= h.y + NODE);
    return hit ? hit.key : null;
}

function renderSkillTrees() {
    drawPassiveTree();
    drawWeaponTree();
    renderPassiveInfo(hoveredPassive);
    renderWeaponInfo(hoveredWeapon);
}

function init() {
    const passive = document.getElementById('passiveTreeCanvas');
    if (passive) {
        passive.addEventListener('mousemove', (e) => {
            const key = hitAt(passive, passiveHits, e);
            passive.style.cursor = key ? 'pointer' : 'default';
            if (key !== hoveredPassive) {
                hoveredPassive = key;
                drawPassiveTree();
                renderPassiveInfo(key);
            }
        });
        passive.addEventListener('click', (e) => {
            const key = hitAt(passive, passiveHits, e);
            if (key && typeof window.upgradePassive === 'function') {
                window.upgradePassive(key);
                drawPassiveTree();
                renderPassiveInfo(key);
            }
        });
    }
    const weapon = document.getElementById('weaponTreeCanvas');
    if (weapon) {
        weapon.addEventListener('mousemove', (e) => {
            const key = hitAt(weapon, weaponHits, e);
            weapon.style.cursor = key ? 'pointer' : 'default';
            if (key !== hoveredWeapon) {
                hoveredWeapon = key;
                drawWeaponTree();
                renderWeaponInfo(key);
            }
        });
        weapon.addEventListener('click', (e) => {
            const key = hitAt(weapon, weaponHits, e);
            hoveredWeapon = key;
            drawWeaponTree();
            renderWeaponInfo(key);
        });
    }
    renderSkillTrees();
}

init();

Object.assign(window, { renderSkillTrees });
