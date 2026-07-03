'use strict';

// Canvas combat PROTOTYPE (visual only — no game state is read-modified).
// While the "#canvasBattleToggle" checkbox is checked, window.startBattle is
// routed here: pressing Fight spawns 1-5 copies of the selected monster that
// run at the hero and bounce-attack; the hero auto-attacks by equipped weapon
// (melee lunge, or projectiles for ranged/staff) and auto-casts a spell every
// few seconds. Unchecking the toggle restores the real combat untouched.
// Damage numbers use the real player/monster stat functions, but all HP pools
// here are local copies — nothing writes back to the game.
import { player, equippedItems } from '../core/core.js';
import { monsterList } from '../data/monsterList.js';
import { characterRaces } from '../data/gameObjects.js';

const GROUND = 235;
const HERO_X = 95;
const SPRITE = 64;

let canvas = null;
let ctx = null;
let toggle = null;
let wrap = null;
let realStartBattle = null;

let wave = null; // active wave state or null
let stepTimer = 0;
let lastTs = 0;

const imageCache = {};
function getImage(src) {
    if (!imageCache[src]) {
        const img = new Image();
        img.src = src;
        imageCache[src] = img;
    }
    return imageCache[src];
}

function heroImage() {
    for (const key in characterRaces) {
        const race = characterRaces[key];
        if (race.name === player.properties.heroRace) {
            try {
                return getImage('images/races/' + race.image() + '.png');
            } catch {
                return null;
            }
        }
    }
    return null;
}

function weaponProfile() {
    const weapon = equippedItems.weapon;
    const subType = weapon && weapon.isEquipped === true ? weapon.subType : 'fists';
    if (subType === 'ranged') return { subType, range: 260, cooldown: 1.1, projectile: true };
    if (subType === 'staff') return { subType, range: 240, cooldown: 1.2, projectile: true };
    return { subType, range: 52, cooldown: 0.9, projectile: false };
}

function rollPlayerDamage() {
    try {
        const min = player.functions.minDamage();
        const max = player.functions.maxDamage();
        return Math.floor(Math.random() * (max - min + 1)) + min;
    } catch {
        return 5 + Math.floor(Math.random() * 5);
    }
}

function startWave(monsterKey) {
    const monster = monsterList[monsterKey];
    if (!monster || !ctx) return;
    const count = 1 + Math.floor(Math.random() * 5);
    const enemies = [];
    for (let i = 0; i < count; i++) {
        let minDmg = 1;
        let maxDmg = 2;
        try {
            minDmg = monster.minDmg();
            maxDmg = monster.maxDmg();
        } catch {
            /* visual fallback */
        }
        enemies.push({
            x: canvas.width + 30 + i * 55,
            y: GROUND - ((i % 3) - 1) * 16,
            hp: monster.maxHp,
            maxHp: monster.maxHp,
            speed: 65 + Math.random() * 45,
            state: 'run', // run -> fight -> die
            bouncePhase: Math.random() * Math.PI,
            attackTimer: 0.6 + Math.random() * 0.6,
            minDmg,
            maxDmg,
            fade: 1,
        });
    }
    let heroHp = 500;
    try {
        heroHp = player.functions.maxhealth();
    } catch {
        /* visual fallback */
    }
    wave = {
        monster,
        img: getImage('images/monsters/' + monster.name + '.png'),
        heroImg: heroImage(),
        weapon: weaponProfile(),
        enemies,
        heroHp,
        heroMaxHp: heroHp,
        heroAttackTimer: 0.4,
        heroLunge: 0, // 0..1 lunge animation progress
        spellTimer: 3.5,
        projectiles: [],
        floats: [],
        effects: [],
        outcome: null, // 'victory' | 'defeat'
        outcomeTimer: 0,
        heroHitFlash: 0,
    };
    lastTs = 0;
    clearTimeout(stepTimer);
    stepTimer = setTimeout(step, 16);
}

function addFloat(x, y, txt, color) {
    wave.floats.push({ x, y, txt, color, age: 0 });
}

function hitEnemy(enemy, dmg, isSpell) {
    enemy.hp -= dmg;
    addFloat(
        enemy.x,
        enemy.y - SPRITE,
        (isSpell ? '✦' : '') + dmg,
        isSpell ? '#c026d3' : '#b91c1c'
    );
    if (enemy.hp <= 0 && enemy.state !== 'die') {
        enemy.state = 'die';
    }
}

function targetable() {
    return wave.enemies.filter((e) => e.state !== 'die');
}

function update(dt) {
    const w = wave;

    // enemies: run in, then bounce-attack
    for (const e of w.enemies) {
        if (e.state === 'die') {
            e.fade = Math.max(0, e.fade - dt * 2.5);
            continue;
        }
        if (w.outcome) continue;
        if (e.state === 'run') {
            e.x -= e.speed * dt;
            e.bouncePhase += dt * 10;
            if (e.x <= HERO_X + 58) {
                e.x = HERO_X + 58;
                e.state = 'fight';
            }
        } else if (e.state === 'fight') {
            // bounce back and forth; deal damage at each forward contact
            e.bouncePhase += dt * 6;
            e.attackTimer -= dt;
            if (e.attackTimer <= 0) {
                const dmg = Math.floor(Math.random() * (e.maxDmg - e.minDmg + 1)) + e.minDmg;
                w.heroHp = Math.max(0, w.heroHp - dmg);
                w.heroHitFlash = 0.25;
                addFloat(HERO_X, GROUND - SPRITE, dmg, '#7f1d1d');
                e.attackTimer = 0.8 + Math.random() * 0.5;
                if (w.heroHp <= 0) {
                    w.outcome = 'defeat';
                    w.outcomeTimer = 1.6;
                }
            }
        }
    }

    // hero auto-attack
    if (!w.outcome) {
        w.heroAttackTimer -= dt;
        w.heroLunge = Math.max(0, w.heroLunge - dt * 4);
        const targets = targetable();
        if (w.heroAttackTimer <= 0 && targets.length) {
            const inRange = targets.filter((e) => e.x - HERO_X <= w.weapon.range + SPRITE);
            if (inRange.length) {
                const target = inRange[0];
                if (w.weapon.projectile) {
                    w.projectiles.push({
                        x: HERO_X + 30,
                        y: GROUND - SPRITE / 2,
                        speed: 340,
                        target,
                        magic: w.weapon.subType === 'staff',
                    });
                } else {
                    w.heroLunge = 1;
                    hitEnemy(target, rollPlayerDamage(), false);
                }
                w.heroAttackTimer = w.weapon.cooldown;
            }
        }

        // auto-spell every few seconds
        w.spellTimer -= dt;
        if (w.spellTimer <= 0 && targets.length) {
            const target = targets[0];
            hitEnemy(target, Math.floor(rollPlayerDamage() * 2.5) + 1, true);
            w.effects.push({
                x: target.x,
                y: GROUND - SPRITE / 2,
                age: 0,
                label: w.weapon.subType === 'staff' ? 'Fire Bolt!' : 'Savage Strike!',
            });
            w.spellTimer = 3.5;
        }
    }

    // projectiles
    for (const p of w.projectiles) {
        p.x += p.speed * dt;
        if (p.target.state !== 'die' && p.x >= p.target.x - 14) {
            hitEnemy(p.target, rollPlayerDamage(), false);
            p.done = true;
        }
        if (p.x > canvas.width) p.done = true;
    }
    w.projectiles = w.projectiles.filter((p) => !p.done);

    // floats + effects age out
    for (const f of w.floats) f.age += dt;
    w.floats = w.floats.filter((f) => f.age < 1.1);
    for (const fx of w.effects) fx.age += dt;
    w.effects = w.effects.filter((fx) => fx.age < 0.7);

    w.heroHitFlash = Math.max(0, w.heroHitFlash - dt);

    // outcome
    if (!w.outcome && targetable().length === 0) {
        w.outcome = 'victory';
        w.outcomeTimer = 1.6;
    }
    if (w.outcome) {
        w.outcomeTimer -= dt;
        if (w.outcomeTimer <= 0) {
            endWave();
        }
    }
}

function drawBar(x, y, width, ratio, color) {
    ctx.fillStyle = '#00000033';
    ctx.fillRect(x, y, width, 6);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, width * ratio), 6);
    ctx.strokeStyle = '#00000066';
    ctx.strokeRect(x, y, width, 6);
}

function drawSprite(img, x, y, flash) {
    const drawX = x - SPRITE / 2;
    const drawY = y - SPRITE;
    // shadow
    ctx.fillStyle = '#00000022';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, SPRITE / 2.4, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, drawX, drawY, SPRITE, SPRITE);
    } else {
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(drawX, drawY, SPRITE, SPRITE);
    }
    if (flash > 0) {
        ctx.fillStyle = `rgba(220,38,38,${flash})`;
        ctx.fillRect(drawX, drawY, SPRITE, SPRITE);
    }
}

function draw() {
    const w = wave;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ground
    ctx.strokeStyle = '#8a6d1a';
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 8);
    ctx.lineTo(canvas.width, GROUND + 8);
    ctx.stroke();

    if (!w) {
        ctx.fillStyle = '#6b5310';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Select a monster and press Fight', canvas.width / 2, 140);
        return;
    }

    // header
    ctx.fillStyle = '#4a3a08';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
        w.monster.displayName + ' x' + targetable().length + '  —  ' + w.weapon.subType,
        10,
        20
    );

    // hero
    const lungeOffset = Math.sin(w.heroLunge * Math.PI) * 18;
    drawSprite(w.heroImg, HERO_X + lungeOffset, GROUND, w.heroHitFlash);
    drawBar(HERO_X - SPRITE / 2, GROUND - SPRITE - 12, SPRITE, w.heroHp / w.heroMaxHp, '#16a34a');

    // enemies
    for (const e of w.enemies) {
        if (e.state === 'die' && e.fade <= 0) continue;
        ctx.globalAlpha = e.state === 'die' ? e.fade : 1;
        const bounce = e.state === 'fight' ? Math.max(0, Math.sin(e.bouncePhase)) * -14 : 0;
        const hop = e.state === 'run' ? Math.abs(Math.sin(e.bouncePhase)) * -5 : 0;
        drawSprite(w.img, e.x + bounce, e.y + hop, 0);
        if (e.state !== 'die') {
            drawBar(e.x - SPRITE / 2, e.y - SPRITE - 12, SPRITE, e.hp / e.maxHp, '#dc2626');
        }
        ctx.globalAlpha = 1;
    }

    // projectiles
    for (const p of w.projectiles) {
        ctx.fillStyle = p.magic ? '#7c3aed' : '#78350f';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.magic ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // spell effects
    for (const fx of w.effects) {
        const t = fx.age / 0.7;
        ctx.strokeStyle = `rgba(192,38,211,${1 - t})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 20 + t * 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = `rgba(112,26,117,${1 - t})`;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(fx.label, fx.x, fx.y - 46 - t * 12);
    }

    // floating damage numbers
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    for (const f of w.floats) {
        const t = f.age / 1.1;
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 1 - t;
        ctx.fillText(f.txt, f.x, f.y - t * 28);
        ctx.globalAlpha = 1;
    }

    // outcome banner
    if (w.outcome) {
        ctx.fillStyle = w.outcome === 'victory' ? '#166534' : '#7f1d1d';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            w.outcome === 'victory' ? 'Victory!' : 'Defeated (visual only)',
            canvas.width / 2,
            120
        );
    }
}

// setTimeout-driven loop, NOT requestAnimationFrame: rAF is suspended in
// background/hidden tabs (same reason core/log.js fadeLog uses timers), which
// would freeze the wave. The sim advances by real elapsed time in fixed 50ms
// substeps, so it runs at the same speed whether the tab ticks at 60fps or at
// the browser's 1s background clamp (elapsed capped to avoid huge catch-ups).
const SIM_STEP = 0.05;
function step() {
    const ts = performance.now();
    if (!lastTs) lastTs = ts;
    let elapsed = Math.min(1.5, (ts - lastTs) / 1000);
    lastTs = ts;
    while (wave && elapsed > 0) {
        update(Math.min(SIM_STEP, elapsed));
        elapsed -= SIM_STEP;
    }
    draw();
    if (wave) stepTimer = setTimeout(step, 16);
}

function endWave() {
    wave = null;
    draw();
    // the Fight button's inline onclick ran disableButtons() when the wave
    // started; re-toggle it so the monster buttons unlock like a real fight end
    if (typeof window.disableButtons === 'function') window.disableButtons();
}

function onToggle() {
    if (wrap) wrap.style.display = toggle.checked ? 'block' : 'none';
    if (toggle.checked) draw();
    if (!toggle.checked && wave) {
        // abandon a running wave and unlock the buttons
        endWave();
    }
}

function init() {
    canvas = document.getElementById('battleCanvas');
    toggle = document.getElementById('canvasBattleToggle');
    wrap = document.getElementById('canvasBattleWrap');
    if (!canvas || !toggle || !wrap || !canvas.getContext) return;
    ctx = canvas.getContext('2d');

    // Route Fight through the prototype while the toggle is on; the real
    // startBattle (battle.js) is untouched and used when it's off.
    realStartBattle = window.startBattle;
    window.startBattle = function (monsterKey) {
        if (toggle.checked) startWave(monsterKey);
        else if (realStartBattle) realStartBattle(monsterKey);
    };

    toggle.addEventListener('change', onToggle);
    onToggle();
}

init();

// Dev-only debug hook for the prototype (inspect wave state from the console).
if (import.meta.env.DEV) {
    window.__battleCanvasDebug = {
        getWave: () => wave,
        getCtx: () => ctx,
        monsterKeys: () => Object.keys(monsterList).length,
        startWave,
    };
}
