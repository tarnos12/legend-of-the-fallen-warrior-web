import { describe, it, expect, beforeAll } from 'vitest';
import { stubJQuery, loadGameDom } from '../test/utils.js';

// Balance simulation report (npm run balance): simulates SIM_MINUTES of idle
// play per weapon class from a fresh level-1 character, RUNS times each, and
// prints a tuning table of per-run averages — kills, highest wave, level,
// gold, deaths. Single runs are far too noisy to tune against (drop RNG alone
// swings kills ±20%); compare classes only on the averaged table.
// Uses the same stubbed-canvas + pump() technique as test/combat-sim.test.js,
// plus setQuiet(true) so kills skip the per-kill DOM (same reward math).
const SIM_MINUTES = 30;
const CHUNK_SECONDS = 30;
const RUNS = 5;

const ctxStub = new Proxy(
    {},
    {
        get(target, prop) {
            if (prop in target) return target[prop];
            return () => {};
        },
        set(target, prop, value) {
            target[prop] = value;
            return true;
        },
    }
);

let dbg;
let core;
let monsterListMod;
let weaponMastery;
let playerPassive;
let defaultsSnapshot;

beforeAll(async () => {
    stubJQuery();
    loadGameDom();
    localStorage.clear();
    window.confirm = () => false;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: () => ctxStub,
    });
    core = await import('../src/core/core.js');
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    defaultsSnapshot = JSON.stringify(core.player.properties);
    monsterListMod = await import('../src/data/monsterList.js');
    ({ weaponMastery } = await import('../src/data/weaponMastery.js'));
    ({ playerPassive } = await import('../src/data/skills.js'));
    const { characterRaces } = await import('../src/data/gameObjects.js');
    for (const race of Object.values(characterRaces)) race.raceAge = 'Adulthood';
    const { monsterAreas } = await import('../src/data/gameObjects.js');
    // MakeMonsterList doesn't reset area unlocks; remember the pristine flags
    window.__areaFlags = monsterAreas.map((a) => a.isUnlocked);
    await import('../src/systems/gameControls.js');
    await import('../src/ui/battleCanvas.js');
    dbg = window.__battleCanvasDebug;
    dbg.setQuiet(true);
    const { primaryStatUpdate, secondaryStatUpdate } = await import('../src/ui/panelsUI.js');
    const { EquippedItemsEmpty } = await import('../src/ui/inventoryUI.js');
    core.player.properties.heroRace = 'Human';
    primaryStatUpdate();
    secondaryStatUpdate();
    EquippedItemsEmpty(); // equipItem writes into the slot divs this renders
});

async function resetRun() {
    const { player, playerInventory, createEquippedItemsObject } = core;
    player.properties = JSON.parse(defaultsSnapshot);
    player.properties.heroRace = 'Human';
    player.properties.isDead = false;
    playerInventory.length = 0;
    createEquippedItemsObject('all');
    for (const key in weaponMastery) {
        weaponMastery[key].level = 1;
        weaponMastery[key].experience = 0;
        weaponMastery[key].maxExperience = 10;
    }
    for (const key in playerPassive) playerPassive[key].level = 0;
    const { monsterAreas } = await import('../src/data/gameObjects.js');
    monsterAreas.forEach((a, i) => (a.isUnlocked = window.__areaFlags[i]));
    monsterListMod.MakeMonsterList();
}

async function equipCommonWeapon(subType) {
    const { getItemType } = await import('../src/systems/itemDrop.js');
    const { player, playerInventory } = core;
    // crafted 'Common' quality = deterministic rarity (no behavior affixes)
    getItemType(1, false, 'weapon', subType, 'Common');
    const item = playerInventory[playerInventory.length - 1];
    player.properties.itemIdNumber += 1;
    window.equipItem(item.id);
}

async function simulate(subType) {
    await resetRun();
    if (subType !== 'fists') await equipCommonWeapon(subType);
    const { player } = core;
    let deaths = 0;
    for (let t = 0; t < SIM_MINUTES * 60; t += CHUNK_SECONDS) {
        dbg.pump(CHUNK_SECONDS);
        if (player.properties.isDead === true) {
            // the real revive is a wall-clock 5s timeout the sync pump can't
            // reach; count the death and revive at the same net cost
            deaths++;
            player.properties.isDead = false;
            player.properties.health = player.functions.maxhealth();
        }
    }
    const kills = Object.keys(monsterListMod.monsterList).reduce(
        (sum, key) => sum + monsterListMod.monsterList[key].killCount,
        0
    );
    return {
        weapon: subType,
        kills,
        wave: player.properties.combatWave + 1,
        level: player.properties.level,
        gold: player.properties.gold,
        deaths,
    };
}

describe(`balance report (${SIM_MINUTES} simulated minutes per weapon, avg of ${RUNS} runs)`, () => {
    it(
        'prints the class comparison table',
        async () => {
            const rows = [];
            for (const subType of ['fists', 'sword', 'axe', 'mace', 'staff', 'ranged']) {
                const runs = [];
                for (let i = 0; i < RUNS; i++) runs.push(await simulate(subType));
                const avg = (key) =>
                    Math.round((runs.reduce((s, r) => s + r[key], 0) / RUNS) * 10) / 10;
                rows.push({
                    weapon: subType,
                    kills: avg('kills'),
                    wave: avg('wave'),
                    level: avg('level'),
                    gold: avg('gold'),
                    deaths: avg('deaths'),
                });
            }
            const pad = (v, n) => String(v).padEnd(n);
            let out = '\n' + pad('WEAPON', 8) + pad('KILLS', 8) + pad('WAVE', 6);
            out += pad('LEVEL', 7) + pad('GOLD', 8) + 'DEATHS\n';
            for (const r of rows) {
                out +=
                    pad(r.weapon, 8) +
                    pad(r.kills, 8) +
                    pad(r.wave, 6) +
                    pad(r.level, 7) +
                    pad(r.gold, 8) +
                    r.deaths +
                    '\n';
            }
            console.log(out);
            const fs = await import('node:fs');
            fs.writeFileSync('balance-report.txt', out.trimStart());
            expect(rows.every((r) => r.kills > 0)).toBe(true);
        },
        600000
    );
});
