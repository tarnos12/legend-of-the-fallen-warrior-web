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
import { characterRaces, monsterAreas } from '../data/gameObjects.js';
import {
    heroStrikeRoll,
    heroSpellRoll,
    monsterAttack,
    grantKillRewards,
    displayLogInfo,
} from '../systems/battle.js';
import { weaponCombatProfile } from '../systems/weaponBehavior.js';
import { waveUnlocks } from '../data/waveUnlocks.js';
import {
    waveGroups,
    unlockedWaveMembers,
    unlockedWaveCount,
    isBossWave,
} from '../data/waves.js';
import { getImage, imageCache } from './uiCommon.js';

// Rare sparkling spawns: extra exp/gold (x3) and doubled drop roll — see
// systems/battle.js SHINY_REWARD_MULT and itemDrop.js.
const SHINY_CHANCE = 0.05;

// Combat runs in a FIXED logical world (the original canvas size) no matter
// how big the on-screen canvas is: wave timing, approach distances and thus
// balance are identical on a phone and a 4K monitor (and in the jsdom sims,
// where the canvas keeps its 700x280 attributes). draw() scales this world
// onto the real canvas; only cosmetic screen-space bits (ground band) span
// the full canvas width.
const WORLD_W = 700;
const WORLD_H = 280;
const GROUND = 235;
const HERO_X = 95;
const SPRITE = 64;
const NEXT_WAVE_DELAY = 1.2; // seconds of idle between waves

let canvas = null;
let ctx = null;
let realStartBattle = null;

let wave = null; // active wave state or null
let stepTimer = 0;
let lastTs = 0;
let idleTimer = 0; // counts up between waves; wave auto-starts at NEXT_WAVE_DELAY
let celebrate = null; // { text, t } banner when a new wave/area unlocks
// headless-sim switch (balance harness): kills grant the same rewards but skip
// the per-kill DOM (log rerender, inventory rerender) that dominates sim time
let quietSim = false;
let unlockWatch = { area: '', shown: -1, areas: -1 }; // change detection for the banner

// ---- Idle progression state (persisted on player.properties) ---------------
// combatArea: selected area type ('' = first unlocked); combatWave: index into
// the area's monster list (wave 1 = monster 1); combatAutoProgress: advance to
// the next unlocked wave after a clear. Death steps one wave back instead, so
// idle play never gets stuck.
function unlockedAreas() {
    return monsterAreas.filter((a) => a.isUnlocked === true);
}

function areaEntries(areaType) {
    return Object.keys(monsterList)
        .filter((key) => monsterList[key].area === areaType)
        .sort((a, b) => monsterList[a].id - monsterList[b].id)
        .map((key) => ({ key, monster: monsterList[key] }));
}

function currentAreaType() {
    let areaType = player.properties.combatArea;
    if (!unlockedAreas().some((a) => a.type === areaType)) {
        areaType = (unlockedAreas()[0] || monsterAreas[0]).type;
        player.properties.combatArea = areaType;
    }
    return areaType;
}

// Waves unlock in order (quest() flips monster isShown by kill count; a wave
// group is available once its first member is shown), so the available waves
// are a prefix and the wave index is clamped to it. Old saves stored the
// monster index (0..9) — the same clamp folds them into the 5-wave range.
function clampWave(areaType) {
    const max = Math.max(0, unlockedWaveCount(areaType) - 1);
    if (player.properties.combatWave > max) player.properties.combatWave = max;
    if (player.properties.combatWave < 0) player.properties.combatWave = 0;
    return waveGroups(areaType);
}

// The current wave's spawn pool: its unlocked members.
function currentWavePool() {
    const areaType = currentAreaType();
    clampWave(areaType);
    return unlockedWaveMembers(areaType, player.properties.combatWave);
}

// Warm the cache for every monster + race sprite as soon as the game data
// exists, so a first encounter never draws the grey placeholder while its
// image is still downloading. (The old DOM combat never had this problem
// because the monster panel's <img> had always fetched the sprite before a
// fight; the canvas draws cold.) ~60 small local PNGs — negligible.
let imagesPreloaded = false;
function preloadCombatImages() {
    if (imagesPreloaded || Object.keys(monsterList).length === 0) return;
    imagesPreloaded = true;
    for (const key in monsterList) {
        getImage('images/monsters/' + monsterList[key].name + '.png');
    }
    for (const key in characterRaces) {
        try {
            getImage('images/races/' + characterRaces[key].image() + '.png');
        } catch {
            /* race age not picked yet — the hero image loads on first draw */
        }
    }
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

// Start the selected wave. With an explicit monsterKey (debug / tests / the
// intercepted startBattle), the selection follows that monster's area + wave
// group and the wave spawns ONLY that monster — deterministic farming. With
// no key, spawns pick semi-randomly among the wave group's unlocked members.
function startWave(monsterKey) {
    if (!ctx) return;
    if (player.properties.isDead === true) {
        draw();
        drawCenterText('You are dead — reviving...');
        if (typeof window.disableButtons === 'function') window.disableButtons();
        return;
    }
    let pool;
    if (monsterKey !== undefined && monsterList[monsterKey]) {
        const monster = monsterList[monsterKey];
        player.properties.combatArea = monster.area;
        const waveIdx = waveGroups(monster.area).findIndex((g) => g.includes(monsterKey));
        player.properties.combatWave = Math.max(0, waveIdx);
        pool = [monsterKey];
        renderControls();
    } else {
        pool = currentWavePool();
    }
    if (pool.length === 0) return;
    preloadCombatImages(); // covers manual/debug starts too
    logData.length = 0;
    const logConsole = document.getElementById('logConsole');
    if (logConsole) logConsole.innerHTML = '';

    // the boss wave is a duel; regular waves bring 1-5 mixed enemies
    const bossWave = isBossWave(currentAreaType(), player.properties.combatWave);
    const count = bossWave ? 1 : 1 + Math.floor(Math.random() * 5);
    const enemies = [];
    for (let i = 0; i < count; i++) {
        const monster = monsterList[pool[Math.floor(Math.random() * pool.length)]];
        enemies.push({
            monster,
            img: getImage('images/monsters/' + monster.name + '.png'),
            shiny: Math.random() < SHINY_CHANCE,
            x: WORLD_W + 30 + i * 55,
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
        pool,
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
}

function addFloat(x, y, txt, color) {
    wave.floats.push({ x, y, txt, color, age: 0 });
}

// Apply a hero strike/spell result to an enemy clone and animate it.
function applyRoll(enemy, roll, isSpell) {
    if (roll.result === 'miss') {
        addFloat(enemy.x, enemy.y - SPRITE, 'miss', '#9ca3af');
        return;
    }
    if (roll.result === 'instakill') {
        enemy.hp = 0;
        addFloat(enemy.x, enemy.y - SPRITE, 'INSTANT KILL', '#f87171');
    } else {
        enemy.hp -= roll.damage;
        addFloat(
            enemy.x,
            enemy.y - SPRITE,
            (isSpell ? '✦' : '') + roll.damage + (roll.crit ? '!' : ''),
            isSpell ? '#e879f9' : roll.crit ? '#fb923c' : '#fca5a5'
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
        grantKillRewards(enemy.monster, quietSim, enemy.shiny);
        displayLogInfo(quietSim); // heal/buff tick always; DOM skipped when quiet
        if (!quietSim) {
            addFloat(
                enemy.x,
                enemy.y - SPRITE - 16,
                (enemy.shiny ? '✨ ' : '') + '+' + player.properties.goldDrop + 'g',
                '#eab308'
            );
        }
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
        addFloat(enemy.x, enemy.y - SPRITE - 16, 'STUN', '#facc15');
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
            monsterAttack(attacker.monster, attacker, { parryBonus: prof.parryBonus });
            const dealt = healthBefore - player.properties.health;
            if (dealt > 0) {
                w.heroHitFlash = 0.25;
                addFloat(HERO_X, GROUND - SPRITE, dealt, '#ef4444');
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
                    const roll = heroStrikeRoll(target.monster, {
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
                                    '#fca5a5'
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
            const roll = heroSpellRoll(target.monster);
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
                p.primaryRoll = heroStrikeRoll(enemy.monster, {
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
                            '#a78bfa'
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
                    '#d9b24a'
                );
                p.hits++;
                if (p.hits >= prof.maxTargets) p.done = true;
            }
        }
        if (p.x > WORLD_W + 40) p.done = true;
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
    ctx.fillStyle = '#00000066';
    ctx.fillRect(x, y, width, 6);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, width * Math.min(1, ratio)), 6);
    ctx.strokeStyle = '#00000066';
    ctx.strokeRect(x, y, width, 6);
}

function drawSprite(img, x, y, flash) {
    const drawX = x - SPRITE / 2;
    const drawY = y - SPRITE;
    ctx.fillStyle = '#00000055';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, SPRITE / 2.4, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, drawX, drawY, SPRITE, SPRITE);
    } else {
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(drawX, drawY, SPRITE, SPRITE);
    }
    if (flash > 0) {
        ctx.fillStyle = `rgba(220,38,38,${flash})`;
        ctx.fillRect(drawX, drawY, SPRITE, SPRITE);
    }
}

function drawCenterText(text) {
    ctx.fillStyle = '#b0a184';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, WORLD_W / 2, 140);
}

// How the logical world maps onto the actual canvas: fit inside, clamp the
// zoom, center horizontally, anchor to the bottom (the ground). At exactly
// 700x280 (tests, legacy layout) this is the identity transform.
function viewTransform() {
    const scale = Math.max(0.85, Math.min(canvas.width / WORLD_W, canvas.height / WORLD_H, 2.6));
    return {
        scale,
        offX: Math.max(0, (canvas.width - WORLD_W * scale) / 2),
        offY: Math.max(0, canvas.height - WORLD_H * scale),
    };
}

function draw() {
    const w = wave;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ground band in screen space so it spans the whole canvas, not the world
    const view = viewTransform();
    const groundY = view.offY + (GROUND + 8) * view.scale;
    ctx.fillStyle = '#191410';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    ctx.strokeStyle = '#8a6d1a';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    // everything below draws in world coordinates
    ctx.setTransform(view.scale, 0, 0, view.scale, view.offX, view.offY);

    if (!w) {
        if (player.properties.heroRace === '') {
            drawCenterText('Create a character to begin');
        } else if (player.properties.isDead === true) {
            drawCenterText('You have died — reviving...');
        } else {
            drawCenterText('Next wave incoming...');
        }
        drawCelebration();
        return;
    }

    // header: living enemies — weapon (area + wave live in the floating
    // control bar right above; repeating them here was just noise)
    const living = {};
    for (const e of targetable()) {
        living[e.monster.displayName] = (living[e.monster.displayName] || 0) + 1;
    }
    const composition = Object.keys(living)
        .map((name) => name + (living[name] > 1 ? ' x' + living[name] : ''))
        .join(', ');
    ctx.fillStyle = '#d9b24a';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(composition + '  —  ' + w.weapon.subType, 10, 20);

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
        '#4ade80'
    );
    drawBar(
        HERO_X - SPRITE / 2,
        GROUND - SPRITE - 12,
        SPRITE,
        player.properties.mana / maxMana,
        '#60a5fa'
    );

    // enemies
    for (const e of w.enemies) {
        if (e.state === 'die' && e.fade <= 0) continue;
        ctx.globalAlpha = e.state === 'die' ? e.fade : 1;
        const stunned = e.stunTimer > 0;
        const bounce =
            e.state === 'fight' && !stunned ? Math.max(0, Math.sin(e.bouncePhase)) * -14 : 0;
        const hop = e.state === 'run' ? Math.abs(Math.sin(e.bouncePhase)) * -5 : 0;
        if (e.shiny) {
            // golden aura behind the sprite
            ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
            ctx.beginPath();
            ctx.ellipse(e.x + bounce, e.y + hop - SPRITE / 2, SPRITE * 0.7, SPRITE * 0.75, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        drawSprite(e.img, e.x + bounce, e.y + hop, 0);
        if (e.state !== 'die') {
            drawBar(e.x - SPRITE / 2, e.y - SPRITE - 12, SPRITE, e.hp / e.maxHp, '#f87171');
            if (e.shiny) {
                ctx.fillStyle = '#facc15';
                ctx.font = 'bold 13px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('✨', e.x + SPRITE / 2, e.y - SPRITE - 16);
            }
            if (stunned) {
                ctx.fillStyle = '#facc15';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('✶ ✶', e.x, e.y - SPRITE - 18);
            }
        }
        ctx.globalAlpha = 1;
    }

    // projectiles
    for (const p of w.projectiles) {
        ctx.fillStyle = p.magic ? '#a78bfa' : '#d9b24a';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.magic ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // spell effects
    for (const fx of w.effects) {
        const t = fx.age / 0.7;
        ctx.strokeStyle = `rgba(232,121,249,${1 - t})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 20 + t * 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = `rgba(240,171,252,${1 - t})`;
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
        ctx.fillStyle = w.outcome === 'victory' ? '#4ade80' : '#ef4444';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            w.outcome === 'victory' ? 'Victory! (' + w.kills + ' kills)' : 'You have died...',
            WORLD_W / 2,
            120
        );
    }
    drawCelebration();
}

// "New wave/area unlocked!" banner, drawn over both fights and idle frames.
function drawCelebration() {
    if (!celebrate) return;
    const alpha = Math.min(1, celebrate.t);
    ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(celebrate.text, WORLD_W / 2, 48);
}

// setTimeout-driven loop, NOT requestAnimationFrame: rAF is suspended in
// background/hidden tabs (same reason core/log.js fadeLog uses timers), which
// would freeze the wave. The sim advances by real elapsed time in fixed 50ms
// substeps, so it runs at the same speed whether the tab ticks at 60fps or at
// the browser's 1s background clamp (elapsed capped to avoid huge catch-ups).
const SIM_STEP = 0.05;

// Between waves: count idle time and auto-start the selected wave once the
// hero exists, monsters are built, and the hero isn't waiting on a revive.
function idleTick(dt) {
    // Not in a fightable state: keep the timer at zero so it measures time
    // actually spent waiting (otherwise sitting on the start screen counts
    // toward the sprite-wait cap below and defeats it).
    if (
        player.properties.heroRace === '' ||
        player.properties.isDead === true ||
        Object.keys(monsterList).length === 0
    ) {
        idleTimer = 0;
        return;
    }
    idleTimer += dt;
    if (idleTimer < NEXT_WAVE_DELAY) return;
    preloadCombatImages();
    const pool = currentWavePool();
    if (pool.length === 0) return;
    // Loading a save starts combat moments after the 64-sprite preload kicks
    // off, so hold this wave until ITS sprites are in (img.complete is also
    // true for a failed load — the placeholder shows, nothing stalls; the 8s
    // cap is a belt-and-braces guard against a hung request).
    const poolReady = pool.every(
        (key) => getImage('images/monsters/' + monsterList[key].name + '.png').complete
    );
    const heroImg = heroImage();
    if (idleTimer < 8 && (!poolReady || (heroImg && !heroImg.complete))) return;
    // covers the first wave after character creation/load, when the bar
    // hasn't been rendered with game data yet
    const bar = document.getElementById('battleControls');
    if (bar && bar.innerHTML === '') renderControls();
    startWave();
}

function tick(dt) {
    if (celebrate) {
        celebrate.t -= dt;
        if (celebrate.t <= 0) celebrate = null;
    }
    if (wave) update(dt);
    else idleTick(dt);
}

let frameCount = 0;
function step() {
    // self-healing bitmap size (belt and braces around the resize listener:
    // fullscreen toggles, devtools docking, HUD height changes...)
    if ((frameCount++ & 31) === 0) resizeCanvas();
    const ts = performance.now();
    if (!lastTs) lastTs = ts;
    let elapsed = Math.min(1.5, (ts - lastTs) / 1000);
    lastTs = ts;
    while (elapsed > 0) {
        tick(Math.min(SIM_STEP, elapsed));
        elapsed -= SIM_STEP;
    }
    draw();
    stepTimer = setTimeout(step, 16);
    // Vite HMR re-evaluates this module in dev; kill any previous loop so two
    // instances never tick side by side.
    if (window.__battleCanvasLoop && window.__battleCanvasLoop !== stepTimer) {
        clearTimeout(window.__battleCanvasLoop);
    }
    window.__battleCanvasLoop = stepTimer;
}

// Wave end + idle progression: a cleared wave advances to the next UNLOCKED
// wave (quest kill thresholds flip isShown) when auto-progress is on; a death
// steps one wave back so idle play never grinds against a wall.
function endWave() {
    const outcome = wave ? wave.outcome : null;
    wave = null;
    idleTimer = 0;
    if (outcome === 'victory' && player.properties.combatAutoProgress === true) {
        if (player.properties.combatWave + 1 < unlockedWaveCount(currentAreaType())) {
            player.properties.combatWave++;
        }
    } else if (outcome === 'defeat') {
        player.properties.combatWave = Math.max(0, player.properties.combatWave - 1);
    }
    // celebrate unlocks the kills of this wave earned (quest() flipped them)
    const areaType = currentAreaType();
    const shownNow = areaEntries(areaType).filter((e) => e.monster.isShown === true).length;
    const areasNow = unlockedAreas().length;
    if (unlockWatch.area === areaType && unlockWatch.shown >= 0 && shownNow > unlockWatch.shown) {
        celebrate = { text: 'New wave unlocked!', t: 3 };
    }
    if (unlockWatch.areas >= 0 && areasNow > unlockWatch.areas) {
        celebrate = { text: 'New area unlocked!', t: 3 };
    }
    unlockWatch = { area: areaType, shown: shownNow, areas: areasNow };
    renderControls();
    draw();
}

// Travel to an area (world map): select it, restart from wave 1, abandon any
// running wave. Exported for ui/mapUI.js.
export function travelTo(areaType) {
    if (!monsterAreas.some((a) => a.type === areaType && a.isUnlocked === true)) return false;
    player.properties.combatArea = areaType;
    player.properties.combatWave = 0;
    abortWave();
    renderControls();
    return true;
}

// ---- Control bar: area select, wave nav, auto-progress ---------------------
function abortWave() {
    // switching area/wave mid-fight abandons the current wave (no rewards)
    wave = null;
    idleTimer = NEXT_WAVE_DELAY; // restart immediately with the new selection
}

function renderControls() {
    const bar = document.getElementById('battleControls');
    if (!bar) return;
    if (Object.keys(monsterList).length === 0 || player.properties.heroRace === '') {
        bar.innerHTML = ''; // no game yet — the bar appears once a character exists
        return;
    }
    const areaType = currentAreaType();
    const groups = clampWave(areaType);
    const waveIndex = player.properties.combatWave;
    const areaOptions = unlockedAreas()
        .map(
            (a) =>
                `<option value="${a.type}"${a.type === areaType ? ' selected' : ''}>${a.displayName}</option>`
        )
        .join('');
    // current wave label: its unlocked members (the spawn pool)
    const poolNames = unlockedWaveMembers(areaType, waveIndex).map(
        (key) => monsterList[key].displayName
    );
    const waveLabel =
        isBossWave(areaType, waveIndex) && poolNames.length
            ? `Boss: ${poolNames[0]}`
            : poolNames.slice(0, 2).join(', ') + (poolNames.length > 2 ? '…' : '');
    // next unlock: the first locked monster in this area (could join the
    // CURRENT wave's pool or open the next wave) — quest.js thresholds,
    // mirrored in data/waveUnlocks.js
    let lockedInfo = '';
    const lockedKey = groups.flat().find((key) => monsterList[key].isShown !== true);
    if (lockedKey) {
        const unlock = waveUnlocks[lockedKey];
        if (unlock && monsterList[unlock.requires]) {
            const need = monsterList[unlock.requires];
            lockedInfo =
                `<span style="margin-left:6px; opacity:0.8;">🔒 next: ` +
                `${Math.min(need.killCount, unlock.kills)}/${unlock.kills} kills</span>`;
        }
    }
    // the area boss was killed: the prestige Warp lives here now (formerly a
    // button injected into the old monster panel)
    const warpable = groups
        .flat()
        .map((key) => monsterList[key])
        .find((m) => m.lastEnemy === true && m.killCount > 0);
    const warpButton = warpable
        ? ` <button type="button" id="combatWarp" class="sell" title="Prestige: restart at higher monster levels">Warp</button>`
        : '';
    bar.innerHTML =
        `<label>Area: <select id="combatAreaSelect">${areaOptions}</select></label> ` +
        `<button type="button" id="combatWavePrev" class="sell">◀</button>` +
        `<span style="margin:0 6px;">Wave ${waveIndex + 1}/${groups.length}` +
        (waveLabel ? ` — ${waveLabel}` : '') +
        `</span>` +
        `<button type="button" id="combatWaveNext" class="sell">▶</button>` +
        lockedInfo +
        ` <label style="margin-left:10px;"><input type="checkbox" id="combatAutoProgress"` +
        ` style="visibility:visible; position:relative;"` +
        `${player.properties.combatAutoProgress === true ? ' checked' : ''}> Auto progress</label>` +
        warpButton;
    bar.querySelector('#combatAreaSelect').addEventListener('change', (e) => {
        player.properties.combatArea = e.target.value;
        player.properties.combatWave = 0;
        abortWave();
        renderControls();
    });
    bar.querySelector('#combatWavePrev').addEventListener('click', () => {
        if (player.properties.combatWave > 0) {
            player.properties.combatWave--;
            abortWave();
            renderControls();
        }
    });
    bar.querySelector('#combatWaveNext').addEventListener('click', () => {
        if (player.properties.combatWave < unlockedWaveCount(currentAreaType()) - 1) {
            player.properties.combatWave++;
            abortWave();
            renderControls();
        }
    });
    bar.querySelector('#combatAutoProgress').addEventListener('change', (e) => {
        player.properties.combatAutoProgress = e.target.checked;
    });
    const warp = bar.querySelector('#combatWarp');
    if (warp && warpable) {
        warp.addEventListener('click', () => {
            if (typeof window.rebirth === 'function') window.rebirth(warpable.monster.level);
        });
    }
}

// Size the canvas bitmap to its container (the full-screen stage). In jsdom
// clientWidth/Height are 0, so tests keep the 700x280 attributes and the
// identity view transform — sims are unaffected by stage mode.
function resizeCanvas() {
    const wrap = canvas.parentElement;
    if (!wrap || !wrap.clientWidth || !wrap.clientHeight) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(wrap.clientWidth * dpr);
    const height = Math.round(wrap.clientHeight * dpr);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
}

function init() {
    canvas = document.getElementById('battleCanvas');
    if (!canvas || !canvas.getContext) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', () => {
        resizeCanvas();
        draw();
    });
    // the stylesheet that sizes the stage can land after module evaluation
    setTimeout(() => {
        resizeCanvas();
        draw();
    }, 300);

    // The Fight button's generated onclick calls startBattle by name; route it
    // here (it selects that monster's area/wave). The classic button combat
    // stays available as realStartBattle.
    realStartBattle = window.startBattle;
    window.startBattle = function (monsterKey) {
        startWave(monsterKey);
    };

    renderControls();
    draw();
    step(); // the loop runs permanently: combat is idle and self-restarting
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
        imageCacheStatus: () => {
            const srcs = Object.keys(imageCache);
            return {
                total: srcs.length,
                loaded: srcs.filter((s) => imageCache[s].complete && imageCache[s].naturalWidth > 0)
                    .length,
                failed: srcs.filter(
                    (s) => imageCache[s].complete && imageCache[s].naturalWidth === 0
                ),
            };
        },
        // advance the sim synchronously (hidden preview tabs get intensively
        // timer-throttled, freezing the normal step loop between checks);
        // drives the idle auto-start/progression too
        pump: (seconds) => {
            const n = Math.max(1, Math.round(seconds / SIM_STEP));
            for (let i = 0; i < n; i++) tick(SIM_STEP);
            draw();
        },
        setQuiet: (v) => {
            quietSim = v === true;
        },
        renderControls,
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
