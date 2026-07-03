'use strict';

// Canvas combat — THE combat system. window.startBattle (the Fight button) is
// routed here: 1-5 copies of the selected monster charge the hero and bounce-
// attack; the hero auto-attacks by equipped weapon (melee lunge, projectiles
// for ranged/staff) and auto-casts the strongest affordable spell.
//
// All rules come from systems/battle.js (the classic button pipeline, kept
// there intact): heroStrikeRoll/heroSpellRoll (hit/instakill/crit/defense/
// lifesteal/mastery + mana), monsterAttack (evasion/parry/thorn/counter/block,
// real player health, playerDead), grantKillRewards per enemy killed (exp/
// level-up, gold, item drop, kill count, quest, Warp), displayLogInfo once per
// wave end (full heal, buff timers, monster panel rerender). Only the enemies'
// hp pools are local clones — one wave enemy = one real kill.
import { player } from '../core/core.js';
import { logData } from '../core/log.js';
import { monsterList } from '../data/monsterList.js';
import { characterRaces } from '../data/gameObjects.js';
import {
    heroStrikeRoll,
    heroSpellRoll,
    monsterAttack,
    grantKillRewards,
    displayLogInfo,
} from '../systems/battle.js';
import { weaponCombatProfile } from '../systems/weaponBehavior.js';

const GROUND = 235;
const HERO_X = 95;
const SPRITE = 64;

let canvas = null;
let ctx = null;
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

function startWave(monsterKey) {
    const monster = monsterList[monsterKey];
    if (!monster || !ctx) return;
    if (player.properties.isDead === true) {
        // Fight pressed while waiting for revive; the inline onclick already ran
        // disableButtons(), so re-toggle it and stay idle.
        draw();
        drawCenterText('You are dead — wait for the revive...');
        if (typeof window.disableButtons === 'function') window.disableButtons();
        return;
    }
    logData.length = 0;
    const logConsole = document.getElementById('logConsole');
    if (logConsole) logConsole.innerHTML = '';

    const count = 1 + Math.floor(Math.random() * 5);
    const enemies = [];
    for (let i = 0; i < count; i++) {
        enemies.push({
            x: canvas.width + 30 + i * 55,
            y: GROUND - ((i % 3) - 1) * 16,
            hp: monster.maxHp,
            maxHp: monster.maxHp,
            speed: 65 + Math.random() * 45,
            state: 'run', // run -> fight -> die
            bouncePhase: Math.random() * Math.PI,
            stunTimer: 0, // stunned enemies skip their round-robin attack turn
            fade: 1,
        });
    }
    wave = {
        monster,
        monsterKey,
        img: getImage('images/monsters/' + monster.name + '.png'),
        heroImg: heroImage(),
        // Recomputed every update so equipping a different weapon mid-wave
        // (the inventory stays usable) takes effect immediately.
        weapon: weaponCombatProfile(),
        enemies,
        heroAttackTimer: 0.4,
        enemyAttackTimer: 0.9,
        heroLunge: 0, // 0..1 lunge animation progress
        spellTimer: 3.5,
        projectiles: [],
        floats: [],
        effects: [],
        outcome: null, // 'victory' | 'defeat'
        outcomeTimer: 0,
        heroHitFlash: 0,
        kills: 0,
    };
    lastTs = 0;
    clearTimeout(stepTimer);
    stepTimer = setTimeout(step, 16);
}

function addFloat(x, y, txt, color) {
    wave.floats.push({ x, y, txt, color, age: 0 });
}

// Apply a hero strike/spell result to an enemy clone and animate it.
function applyRoll(enemy, roll, isSpell) {
    if (roll.result === 'miss') {
        addFloat(enemy.x, enemy.y - SPRITE, 'miss', '#6b7280');
        return;
    }
    if (roll.result === 'instakill') {
        enemy.hp = 0;
        addFloat(enemy.x, enemy.y - SPRITE, 'INSTANT KILL', '#dc2626');
    } else {
        enemy.hp -= roll.damage;
        addFloat(
            enemy.x,
            enemy.y - SPRITE,
            (isSpell ? '✦' : '') + roll.damage + (roll.crit ? '!' : ''),
            isSpell ? '#c026d3' : roll.crit ? '#ea580c' : '#b91c1c'
        );
    }
    checkEnemyDeath(enemy);
}

// An enemy clone reaching 0 hp is a REAL kill: exp/gold/drop/killCount/quest,
// followed by the classic end-of-battle cleanup (full heal, buff timer tick,
// monster panel rerender) — the same per-kill cadence as the old 1v1 combat,
// which is what keeps multi-enemy waves survivable at the old balance.
function checkEnemyDeath(enemy) {
    if (enemy.hp <= 0 && enemy.state !== 'die') {
        enemy.state = 'die';
        wave.kills++;
        grantKillRewards(wave.monster);
        displayLogInfo();
        addFloat(enemy.x, enemy.y - SPRITE - 16, '+' + player.properties.goldDrop + 'g', '#a16207');
    }
}

function targetable() {
    return wave.enemies.filter((e) => e.state !== 'die');
}

// Secondary damage from cleave/pierce/splash: derived from the primary roll
// (no re-roll, so lifesteal/mastery aren't multiplied by target count).
function applySecondary(enemy, damage, color) {
    enemy.hp -= damage;
    addFloat(enemy.x, enemy.y - SPRITE, damage, color);
    checkEnemyDeath(enemy);
}

// Roll the profile's stun on a landed primary hit.
function maybeStun(enemy, profile) {
    if (enemy.state !== 'die' && profile.stunChance > 0 && Math.random() < profile.stunChance) {
        enemy.stunTimer = profile.stunSeconds;
        addFloat(enemy.x, enemy.y - SPRITE - 16, 'STUN', '#ca8a04');
    }
}

function update(dt) {
    const w = wave;
    // re-resolve so equipping a different weapon mid-wave takes effect,
    // including any special stats on the item (Extra targets, Stun chance...)
    const prof = weaponCombatProfile();
    w.weapon = prof;

    // enemies: run in, then bounce (visual); the wave attacks ROUND-ROBIN at
    // the old one-attack-per-turn rate, so a 5-enemy wave is a longer fight,
    // not 5x the incoming damage of the classic 1v1 turn exchange.
    for (const e of w.enemies) {
        if (e.state === 'die') {
            e.fade = Math.max(0, e.fade - dt * 2.5);
            continue;
        }
        if (w.outcome) continue;
        e.stunTimer = Math.max(0, e.stunTimer - dt);
        if (e.state === 'run') {
            e.x -= e.speed * dt;
            e.bouncePhase += dt * 10;
            if (e.x <= HERO_X + 58) {
                e.x = HERO_X + 58;
                e.state = 'fight';
            }
        } else if (e.state === 'fight' && e.stunTimer <= 0) {
            e.bouncePhase += dt * 6;
        }
    }
    if (!w.outcome) {
        // stunned enemies (mace / "Stun chance" items) skip their attack turn
        const fighters = w.enemies.filter((e) => e.state === 'fight' && e.stunTimer <= 0);
        w.enemyAttackTimer -= dt;
        if (w.enemyAttackTimer <= 0 && fighters.length) {
            const attacker = fighters[Math.floor(Math.random() * fighters.length)];
            attacker.bouncePhase = 0; // sync the lunge with the hit
            const healthBefore = player.properties.health;
            // evasion/parry/thorn/counter/block; sword raises parry
            monsterAttack(w.monster, attacker, { parryBonus: prof.parryBonus });
            const dealt = healthBefore - player.properties.health;
            if (dealt > 0) {
                w.heroHitFlash = 0.25;
                addFloat(HERO_X, GROUND - SPRITE, dealt, '#7f1d1d');
            }
            checkEnemyDeath(attacker); // thorn/counter can kill the attacker
            w.enemyAttackTimer = 0.9 + Math.random() * 0.4;
            if (player.properties.isDead === true) {
                w.outcome = 'defeat';
                w.outcomeTimer = 1.6;
            }
        }
    }

    // hero auto-attack + auto-spell (real rolls via battle.js)
    if (!w.outcome) {
        w.heroAttackTimer -= dt;
        w.heroLunge = Math.max(0, w.heroLunge - dt * 4);
        const targets = targetable();
        if (w.heroAttackTimer <= 0 && targets.length) {
            const inRange = targets.filter((e) => e.x - HERO_X <= prof.range + SPRITE);
            if (inRange.length) {
                const target = inRange[0];
                if (prof.projectile) {
                    w.projectiles.push({
                        x: HERO_X + 30,
                        y: GROUND - SPRITE / 2,
                        speed: 340,
                        target,
                        magic: prof.magic,
                        hits: 0,
                        struck: new Set(),
                    });
                } else {
                    w.heroLunge = 1;
                    const roll = heroStrikeRoll(w.monster, {
                        damageMult: prof.damageMult,
                        critBonus: prof.critBonus,
                    });
                    applyRoll(target, roll, false);
                    if (roll.result === 'hit') {
                        maybeStun(target, prof);
                        // axe cleave: the swing carries into other engaged
                        // enemies at falloff damage
                        if (prof.maxTargets > 1) {
                            const others = targets.filter(
                                (e) => e !== target && e.state === 'fight'
                            );
                            for (let i = 0; i < others.length && i < prof.maxTargets - 1; i++) {
                                applySecondary(
                                    others[i],
                                    Math.max(
                                        1,
                                        Math.floor(
                                            roll.damage * Math.pow(prof.cleaveFalloff, i + 1)
                                        )
                                    ),
                                    '#b91c1c'
                                );
                            }
                        }
                    }
                }
                w.heroAttackTimer = prof.cooldown;
            }
        }

        w.spellTimer -= dt;
        if (w.spellTimer <= 0 && targets.length) {
            const target = targets[0];
            const roll = heroSpellRoll(w.monster);
            if (roll === null) {
                w.spellTimer = 0.75; // nothing castable yet (mana/skills) — retry soon
            } else {
                applyRoll(target, roll, true);
                w.effects.push({
                    x: target.x,
                    y: GROUND - SPRITE / 2,
                    age: 0,
                    label: roll.name + '!',
                });
                w.spellTimer = 3.5;
            }
        }
    }

    // projectiles: bow arrows PIERCE through enemies along their path (damage
    // falloff per enemy); staff bolts EXPLODE on first impact, splashing
    // nearby enemies. Primary target gets the full roll pipeline; the rest
    // take derived damage.
    for (const p of w.projectiles) {
        p.x += p.speed * dt;
        if (w.outcome) {
            p.done = true;
            continue;
        }
        const reached = targetable().filter((e) => !p.struck.has(e) && p.x >= e.x - 14);
        for (const enemy of reached) {
            if (p.done) break;
            p.struck.add(enemy);
            if (p.hits === 0) {
                p.primaryRoll = heroStrikeRoll(w.monster, {
                    damageMult: prof.damageMult,
                    critBonus: prof.critBonus,
                });
                applyRoll(enemy, p.primaryRoll, false);
                if (p.primaryRoll.result === 'miss') {
                    p.done = true; // the whole shot missed
                    break;
                }
                if (p.primaryRoll.result === 'hit') maybeStun(enemy, prof);
                p.hits = 1;
                if (p.magic && prof.splashRadius > 0 && p.primaryRoll.result === 'hit') {
                    // staff: explode on impact
                    const near = targetable().filter(
                        (e) => e !== enemy && Math.abs(e.x - enemy.x) <= prof.splashRadius
                    );
                    for (let i = 0; i < near.length && i < prof.maxTargets - 1; i++) {
                        applySecondary(
                            near[i],
                            Math.max(1, Math.floor(p.primaryRoll.damage * prof.splashFalloff)),
                            '#7c3aed'
                        );
                    }
                    w.effects.push({
                        x: enemy.x,
                        y: GROUND - SPRITE / 2,
                        age: 0,
                        label: '',
                    });
                    p.done = true;
                }
                if (!prof.pierce) p.done = true;
            } else if (prof.pierce && p.hits < prof.maxTargets) {
                // bow: the arrow keeps flying through, weakening per enemy
                applySecondary(
                    enemy,
                    Math.max(
                        1,
                        Math.floor(p.primaryRoll.damage * Math.pow(prof.pierceFalloff, p.hits))
                    ),
                    '#78350f'
                );
                p.hits++;
                if (p.hits >= prof.maxTargets) p.done = true;
            }
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

    // victory: wave cleared (the last kill's displayLogInfo already ran the
    // end-of-battle cleanup and re-rendered/unlocked the monster panel)
    if (!w.outcome && targetable().length === 0) {
        w.outcome = 'victory';
        w.outcomeTimer = 1.6;
    }
    if (w.outcome) {
        w.outcomeTimer -= dt;
        if (w.outcomeTimer <= 0) endWave();
    }
}

function drawBar(x, y, width, ratio, color) {
    ctx.fillStyle = '#00000033';
    ctx.fillRect(x, y, width, 6);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, width * Math.min(1, ratio)), 6);
    ctx.strokeStyle = '#00000066';
    ctx.strokeRect(x, y, width, 6);
}

function drawSprite(img, x, y, flash) {
    const drawX = x - SPRITE / 2;
    const drawY = y - SPRITE;
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

function drawCenterText(text) {
    ctx.fillStyle = '#6b5310';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, 140);
}

function draw() {
    const w = wave;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#8a6d1a';
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 8);
    ctx.lineTo(canvas.width, GROUND + 8);
    ctx.stroke();

    if (!w) {
        drawCenterText('Select a monster and press Fight');
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

    // hero (real health/mana pools)
    const lungeOffset = Math.sin(w.heroLunge * Math.PI) * 18;
    drawSprite(w.heroImg, HERO_X + lungeOffset, GROUND, w.heroHitFlash);
    let maxHp = 1;
    let maxMana = 1;
    try {
        maxHp = player.functions.maxhealth();
        maxMana = player.functions.maxMana();
    } catch {
        /* keep drawing */
    }
    drawBar(
        HERO_X - SPRITE / 2,
        GROUND - SPRITE - 20,
        SPRITE,
        player.properties.health / maxHp,
        '#16a34a'
    );
    drawBar(
        HERO_X - SPRITE / 2,
        GROUND - SPRITE - 12,
        SPRITE,
        player.properties.mana / maxMana,
        '#2563eb'
    );

    // enemies
    for (const e of w.enemies) {
        if (e.state === 'die' && e.fade <= 0) continue;
        ctx.globalAlpha = e.state === 'die' ? e.fade : 1;
        const stunned = e.stunTimer > 0;
        const bounce =
            e.state === 'fight' && !stunned ? Math.max(0, Math.sin(e.bouncePhase)) * -14 : 0;
        const hop = e.state === 'run' ? Math.abs(Math.sin(e.bouncePhase)) * -5 : 0;
        drawSprite(w.img, e.x + bounce, e.y + hop, 0);
        if (e.state !== 'die') {
            drawBar(e.x - SPRITE / 2, e.y - SPRITE - 12, SPRITE, e.hp / e.maxHp, '#dc2626');
            if (stunned) {
                ctx.fillStyle = '#ca8a04';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('✶ ✶', e.x, e.y - SPRITE - 18);
            }
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
            w.outcome === 'victory' ? 'Victory! (' + w.kills + ' kills)' : 'You have died...',
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

// Wave end. The Fight buttons were re-created enabled by the monster-panel
// rerender (displayLogInfo on victory, playerDead's own displayLogInfo on
// defeat), so no disableButtons() re-toggle is needed here.
function endWave() {
    wave = null;
    draw();
}

function init() {
    canvas = document.getElementById('battleCanvas');
    if (!canvas || !canvas.getContext) return;
    ctx = canvas.getContext('2d');

    // The Fight button's generated onclick calls startBattle by name; route it
    // here. The classic button combat stays available as realStartBattle.
    realStartBattle = window.startBattle;
    window.startBattle = function (monsterKey) {
        startWave(monsterKey);
    };

    draw();
}

init();

// Dev-only debug hook (inspect wave state from the console / preview evals).
if (import.meta.env.DEV) {
    window.__battleCanvasDebug = {
        getWave: () => wave,
        getCtx: () => ctx,
        monsterKeys: () => Object.keys(monsterList).length,
        startWave,
        realStartBattle: () => realStartBattle,
        getProfile: () => weaponCombatProfile(),
        // advance the sim synchronously (hidden preview tabs get intensively
        // timer-throttled, freezing the normal step loop between checks)
        pump: (seconds) => {
            const n = Math.max(1, Math.round(seconds / SIM_STEP));
            for (let i = 0; i < n && wave; i++) update(SIM_STEP);
            draw();
        },
        // drop + equip a weapon of the given subType (and optional special
        // stats) for testing the behavior matrix, e.g.
        //   __battleCanvasDebug.giveWeapon('axe', { 'Stun chance': 50 })
        giveWeapon: async (subType, specialStats) => {
            const { getItemType } = await import('../systems/itemDrop.js');
            getItemType(player.properties.level, false, 'weapon', subType, 'Rare');
            const item = (window.__lastGivenWeapon = (
                await import('../core/core.js')
            ).playerInventory.slice(-1)[0]);
            Object.assign(item, specialStats || {});
            window.equipItem(item.id);
            return weaponCombatProfile();
        },
    };
}
