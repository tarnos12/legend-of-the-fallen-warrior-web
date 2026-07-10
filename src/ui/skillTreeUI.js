'use strict';

// Nodebuster-style RADIAL canvas skill trees (Skills panel). Two canvases, each
// a central hub with chains radiating outward like tree branches:
//   #passiveTreeCanvas — a central "Core" hub; the 8 passive chains (the
//     firstRow grouping, passiveColumns()) branch out in 8 directions, keeping
//     the Offensive / Defensive / Utility group identity via group-tinted vines
//     and arc headers. Left-clicking an affordable node spends a skill point via
//     the existing window.upgradePassive.
//   #weaponTreeCanvas — a central "Weapons" hub; 5 branches (one per weapon):
//     the mastery node nearest the hub, its skills chained outward, lit once the
//     mastery level reaches each skill's requirement (informational — weapon
//     skills unlock by fighting).
// Positions are a pure function of (branch index, depth) — no Math.random /
// Date.now — so they are stable across the frequent hover/pan redraws. Node
// details float in the shared body-level tooltip (showFloatTip from
// inventoryUI); the side panels keep only the points/Reset header (passive) and
// the generic mastery explainer (weapon). Right-click-drag pans each canvas.
import { player } from '../core/core.js';
import { playerPassive, weaponSkillList } from '../data/skills.js';
import { weaponMastery } from '../data/weaponMastery.js';
import { weaponTypeObject } from '../data/gameObjects.js';
import { getImage } from './uiCommon.js';
import { showFloatTip } from './inventoryUI.js';

const NODE = 52;
// Radial geometry: the first node of every branch sits FIRST_R from the hub,
// each successive node STEP further out. Tuned so the longest chains (6 nodes)
// keep every node and its hit box inside the canvas bitmaps (see index.html).
const FIRST_R = 70;
const STEP = 36;

// group identity for the 8 passive branches (indices into passiveColumns())
const GROUP_OF = (idx) => (idx <= 2 ? 'Offensive' : idx <= 5 ? 'Defensive' : 'Utility');
const GROUP_COLOR = { Offensive: '#c76b52', Defensive: '#5a89c7', Utility: '#6bb06b' };

let passiveHits = [];
let weaponHits = [];
let hoveredPassive = null;
let hoveredWeapon = null;
let redrawQueued = false;

// pan offset per canvas, persisted for the whole session (a redraw never resets
// it; the initial 0,0 centers the hub because the trees are drawn around the
// canvas center).
const offsets = {
    passiveTreeCanvas: { x: 0, y: 0 },
    weaponTreeCanvas: { x: 0, y: 0 },
};

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

// even 360° fan: branch `index` of `count` starts pointing up and rotates round.
function branchAngle(index, count) {
    return -Math.PI / 2 + (index / count) * Math.PI * 2;
}
// center of the node at `depth` (0 = nearest the hub) along a branch angle
function radialCenter(cx, cy, angle, depth) {
    const r = FIRST_R + depth * STEP;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

function nodeFrame(ctx, x, y, state, hovered) {
    // state: 'locked' | 'available' | 'leveled' | 'maxed'; (x,y) = top-left
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

// Smooth connector through a chain of node-center points. Adapted for arbitrary
// (radial) directions: each segment bows out along its own perpendicular by a
// small deterministic amount (a pure function of the segment index + branch
// seed), so a branch curves organically in whatever direction it radiates
// instead of only reading well vertically.
function drawVine(ctx, points, color, seed) {
    if (points.length < 2) return;
    ctx.strokeStyle = color || '#4a3b1d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        // unit perpendicular to the segment
        const px = -dy / len;
        const py = dx / len;
        const bow = Math.sin((i + seed) * 1.7) * 9;
        ctx.quadraticCurveTo(mx + px * bow, my + py * bow, b.x, b.y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
}

// text label, clamped to stay inside the canvas
function clampedLabel(ctx, text, x, y, w, h, color) {
    const cx = Math.max(50, Math.min(w - 50, x));
    const cy = Math.max(22, Math.min(h - 14, y));
    ctx.fillStyle = color;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, cx, cy);
}

// draws the shared central hub node + caption
function drawHub(ctx, cx, cy, caption) {
    nodeFrame(ctx, cx - NODE / 2, cy - NODE / 2, 'leveled', false);
    ctx.fillStyle = '#edd26e';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(caption, cx, cy + 4);
}

function drawPassiveTree() {
    const c = canvas2d('passiveTreeCanvas');
    if (!c) return;
    const { canvas, ctx } = c;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    passiveHits = [];
    const off = offsets.passiveTreeCanvas;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.translate(off.x, off.y);

    const columns = passiveColumns();

    // group arc headers: one tinted label per group, placed beyond the group's
    // middle branch (mean angle of its branch indices), clamped to the bitmap.
    const groupBranches = { Offensive: [], Defensive: [], Utility: [] };
    columns.forEach((_, col) => groupBranches[GROUP_OF(col)].push(col));
    for (const name in groupBranches) {
        const idxs = groupBranches[name];
        if (!idxs.length) continue;
        const meanAngle =
            idxs.reduce((s, i) => s + branchAngle(i, columns.length), 0) / idxs.length;
        const lx = cx + Math.cos(meanAngle) * 275;
        const ly = cy + Math.sin(meanAngle) * 275;
        clampedLabel(ctx, name, lx, ly, canvas.width, canvas.height, GROUP_COLOR[name]);
    }

    // branches: vine first (under the nodes), then the nodes
    columns.forEach((keys, col) => {
        const angle = branchAngle(col, columns.length);
        const centers = keys.map((_, depth) => radialCenter(cx, cy, angle, depth));
        drawVine(ctx, [{ x: cx, y: cy }].concat(centers), GROUP_COLOR[GROUP_OF(col)], col);

        keys.forEach((key, depth) => {
            const passive = playerPassive[key];
            const { x: ncx, y: ncy } = centers[depth];
            const x = ncx - NODE / 2;
            const y = ncy - NODE / 2;
            const unlocked = player.properties.level >= passive.levelReq;
            let state;
            if (!unlocked) state = 'locked';
            else if (passive.level >= passive.maxLevel) state = 'maxed';
            else if (passive.level > 0) state = 'leveled';
            // unlocked at 0 points glows 'available' only when a point is
            // actually available to spend; otherwise reads like a leveled node
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
                ctx.fillText(passive.level + '/' + passive.maxLevel, ncx, y + NODE + 13);
            } else {
                ctx.fillStyle = '#7a6f5c';
                ctx.fillText('Lv ' + passive.levelReq, ncx, y + NODE + 13);
            }
            passiveHits.push({ x, y, key });
        });
    });

    // hub on top of the branch roots
    drawHub(ctx, cx, cy, 'Core');
    ctx.restore();
}

function drawWeaponTree() {
    const c = canvas2d('weaponTreeCanvas');
    if (!c) return;
    const { canvas, ctx } = c;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    weaponHits = [];
    const off = offsets.weaponTreeCanvas;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.translate(off.x, off.y);

    weaponTypeObject.forEach((weapon, col) => {
        const type = weapon.type;
        const angle = branchAngle(col, weaponTypeObject.length);
        const mastery = weaponMastery[type];
        const skills = Object.keys(weaponSkillList[type] || {});

        // depth 0 = mastery node, depths 1..n = its skills
        const centers = [radialCenter(cx, cy, angle, 0)].concat(
            skills.map((_, row) => radialCenter(cx, cy, angle, row + 1))
        );
        drawVine(ctx, [{ x: cx, y: cy }].concat(centers), '#7a5a2a', col + 3);

        // mastery node nearest the hub
        const mcx = centers[0].x;
        const mcy = centers[0].y;
        const mx = mcx - NODE / 2;
        const my = mcy - NODE / 2;
        nodeFrame(ctx, mx, my, mastery.level > 1 ? 'maxed' : 'leveled', hoveredWeapon === 'mastery:' + type);
        drawIcon(ctx, 'images/skills/' + type + '.png', mx + 6, my + 6, NODE - 12, 1);
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#edd26e';
        ctx.fillText('Lv ' + mastery.level, mcx, my + NODE + 13);
        weaponHits.push({ x: mx, y: my, key: 'mastery:' + type });

        skills.forEach((skillKey, row) => {
            const skill = weaponSkillList[type][skillKey];
            const ncx = centers[row + 1].x;
            const ncy = centers[row + 1].y;
            const nx = ncx - NODE / 2;
            const ny = ncy - NODE / 2;
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
            ctx.fillText(unlocked ? '✓' : 'Lv ' + skill.levelReq, ncx, ny + NODE + 13);
            weaponHits.push({ x: nx, y: ny, key: type + ':' + skillKey });
        });
    });

    drawHub(ctx, cx, cy, 'Weapons');
    ctx.restore();
}

// ---- floating per-node tooltip content (moved off the side panels) ----------
// Same details renderPassiveInfo/renderWeaponInfo used to show in-panel.
function passiveTipHtml(key) {
    const passive = playerPassive[key];
    if (!passive) return '';
    return (
        `<h4>${passive.name}</h4>` +
        `<div>${passive.description()} player level ${passive.levelReq}</div>` +
        `<div class="mapMeta">Level: ${passive.level}/${passive.maxLevel}</div>` +
        (player.properties.level < passive.levelReq
            ? `<div style="color:var(--red);">🔒 Requires player level ${passive.levelReq}</div>`
            : passive.level < passive.maxLevel
              ? `<div style="color:var(--green);">Click the node to level up</div>`
              : `<div style="color:var(--gold-bright);">★ Maxed</div>`)
    );
}

function weaponTipHtml(key) {
    if (!key) return '';
    if (key.startsWith('mastery:')) {
        const type = key.slice(8);
        const mastery = weaponMastery[type];
        const weapon = weaponTypeObject.find((w) => w.type === type);
        return (
            `<h4>${weapon ? weapon.displayName : type} Mastery</h4>` +
            `<div class="mapMeta">Level ${mastery.level} — ${mastery.experience}/${mastery.maxExperience} exp</div>` +
            `<div class="c3">Levels up as you fight with a ${type} equipped; unlocks the skills below and boosts stats.</div>`
        );
    }
    const [type, skillKey] = key.split(':');
    const skill = weaponSkillList[type] && weaponSkillList[type][skillKey];
    if (!skill) return '';
    const unlocked = weaponMastery[type].level >= skill.levelReq;
    return (
        `<h4>${skill.name}</h4>` +
        `<div>${skill.description()}</div>` +
        `<div class="mapMeta">${unlocked ? '✓ Unlocked' : '🔒 Requires ' + type + ' mastery ' + skill.levelReq} (now ${weaponMastery[type].level})</div>`
    );
}

// float the shared tooltip near the cursor. showFloatTip positions beside
// ev.target.getBoundingClientRect(); a canvas' own rect is its whole edge, so
// feed a synthetic zero-size rect AT the cursor to anchor it cursor-side.
function floatTipAtCursor(html, e) {
    if (!html) {
        window.hideFloatTip();
        return;
    }
    showFloatTip(html, {
        target: {
            getBoundingClientRect: () => ({
                left: e.clientX,
                right: e.clientX,
                top: e.clientY,
            }),
        },
    });
}

// ---- side info panels: now only the header (passive) / explainer (weapon) ----
function renderPassiveInfo() {
    const info = document.getElementById('passiveTreeInfo');
    if (!info) return;
    info.innerHTML =
        `<div class="treeInfoHeader">Skill points: <strong>${player.properties.skillPoints}</strong> ` +
        `<button type="button" class="sell" onclick="resetPassiveSkills(); renderSkillTrees();">Reset</button></div>` +
        `<div class="c3">Hover a node for details; left-click an available node to spend a point. Right-click-drag to pan.</div>`;
}

function renderWeaponInfo() {
    const info = document.getElementById('weaponTreeInfo');
    if (!info) return;
    info.innerHTML = `<div class="c3">Weapon skills unlock automatically as the matching weapon mastery levels up (fight with the weapon equipped). Hover a node for details; right-click-drag to pan.</div>`;
}

// hit test in logical (pre-pan) coordinates: undo the pan offset applied in draw
function hitAt(canvas, hits, event, off) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width - off.x;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height - off.y;
    const hit = hits.find((h) => x >= h.x && x <= h.x + NODE && y >= h.y && y <= h.y + NODE);
    return hit ? hit.key : null;
}

function renderSkillTrees() {
    drawPassiveTree();
    drawWeaponTree();
    renderPassiveInfo();
    renderWeaponInfo();
}

// wires hover-tooltip + right-click-drag pan on a canvas; caller supplies the
// per-node redraw/tooltip/click behavior.
function wireCanvas(canvas, getHits, off, redraw, getHovered, setHovered, tipHtml, onLeftClick) {
    let panning = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 2) return;
        panning = true;
        moved = false;
        startX = e.clientX;
        startY = e.clientY;
        baseX = off.x;
        baseY = off.y;
        window.hideFloatTip();
        if (getHovered() !== null) {
            setHovered(null);
            redraw();
        }
        e.preventDefault();
    });

    canvas.addEventListener('mousemove', (e) => {
        if (panning) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
            off.x = baseX + dx;
            off.y = baseY + dy;
            redraw();
            return;
        }
        const key = hitAt(canvas, getHits(), e, off);
        canvas.style.cursor = key ? 'pointer' : 'default';
        if (key !== getHovered()) {
            setHovered(key);
            redraw();
        }
        floatTipAtCursor(tipHtml(key), e);
    });

    const endPan = () => {
        panning = false;
        moved = false;
    };
    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 2) endPan();
    });
    canvas.addEventListener('mouseleave', () => {
        panning = false;
        window.hideFloatTip();
        if (getHovered() !== null) {
            setHovered(null);
            redraw();
        }
    });

    canvas.addEventListener('click', (e) => {
        // only a real left-click (never the tail of a pan) acts
        if (moved) return;
        const key = hitAt(canvas, getHits(), e, off);
        if (onLeftClick) onLeftClick(key, e);
    });
}

function init() {
    const passive = document.getElementById('passiveTreeCanvas');
    if (passive) {
        wireCanvas(
            passive,
            () => passiveHits,
            offsets.passiveTreeCanvas,
            drawPassiveTree,
            () => hoveredPassive,
            (k) => {
                hoveredPassive = k;
            },
            passiveTipHtml,
            (key, e) => {
                if (key && typeof window.upgradePassive === 'function') {
                    window.upgradePassive(key);
                    drawPassiveTree();
                    renderPassiveInfo();
                    floatTipAtCursor(passiveTipHtml(key), e);
                }
            }
        );
    }
    const weapon = document.getElementById('weaponTreeCanvas');
    if (weapon) {
        wireCanvas(
            weapon,
            () => weaponHits,
            offsets.weaponTreeCanvas,
            drawWeaponTree,
            () => hoveredWeapon,
            (k) => {
                hoveredWeapon = k;
            },
            weaponTipHtml,
            null // weapon nodes are informational
        );
    }
    renderSkillTrees();
}

init();

Object.assign(window, { renderSkillTrees });
