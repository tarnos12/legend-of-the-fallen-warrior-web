import { describe, it, expect, beforeAll } from 'vitest';
import { stubJQuery, loadGameDom } from './utils.js';

// Deterministic canvas-combat simulation tests: jsdom has no 2D context, so
// getContext is stubbed with a no-op recorder and the sim is driven through
// the dev debug hook's pump() (synchronous fixed-step updates) — the same
// technique used for live verification, made permanent.
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
let player;
let playerInventory;
let monsterList;
let MakeMonsterList;
let quest;
let waveUnlocks;

beforeAll(async () => {
    stubJQuery();
    loadGameDom();
    localStorage.clear();
    window.confirm = () => false;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: () => ctxStub,
    });
    // import AFTER the stubs so battleCanvas init() finds a "context"
    const core = await import('../src/core/core.js');
    player = core.player;
    playerInventory = core.playerInventory;
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    ({ monsterList, MakeMonsterList } = await import('../src/data/monsterList.js'));
    ({ quest } = await import('../src/systems/quest.js'));
    ({ waveUnlocks } = await import('../src/data/waveUnlocks.js'));
    const { characterRaces } = await import('../src/data/gameObjects.js');
    for (const race of Object.values(characterRaces)) race.raceAge = 'Adulthood';
    await import('../src/systems/gameControls.js');
    await import('../src/ui/battleCanvas.js');
    dbg = window.__battleCanvasDebug;
    MakeMonsterList();
    player.properties.heroRace = 'Human';
    // newGame()/load() render the stat panels before combat ever runs; the
    // combat pipeline's updateHtml() requires the spans they create
    const { primaryStatUpdate, secondaryStatUpdate } = await import('../src/ui/panelsUI.js');
    primaryStatUpdate();
    secondaryStatUpdate();
});

describe('idle combat simulation', () => {
    it('auto-starts a wave and grants real rewards on kills', () => {
        expect(dbg).toBeTruthy();
        player.properties.combatArea = '';
        player.properties.combatWave = 0;
        player.properties.combatAutoProgress = true;
        playerInventory.length = 0;
        // jsdom images never load, so the sprite gate holds until its 8s cap
        dbg.pump(10);
        expect(dbg.getWave()).toBeTruthy();
        const goldBefore = player.properties.gold;
        dbg.pump(240); // several waves of fists vs 75hp grunts
        expect(monsterList.monster001.killCount).toBeGreaterThan(0);
        expect(player.properties.gold).toBeGreaterThan(goldBefore);
        expect(player.properties.experience + player.properties.level).toBeGreaterThan(1);
    });

    // the real revive is a 5s wall-clock timeout; tests skip the wait
    function reviveNow() {
        player.properties.isDead = false;
        player.properties.health = player.functions.maxhealth();
    }

    it('auto progress advances one wave after a clear once the next is unlocked', () => {
        if (monsterList.monster001.killCount < 10) dbg.pump(600);
        expect(monsterList.monster002.isShown).toBe(true);
        reviveNow();
        player.properties.combatWave = 0;
        player.properties.combatAutoProgress = true;
        dbg.startWave('monster001');
        // run exactly one wave to its end
        for (let i = 0; i < 40 && dbg.getWave(); i++) dbg.pump(5);
        expect(dbg.getWave()).toBeNull();
        expect(player.properties.isDead).toBe(false); // wave 1 is a safe clear
        expect(player.properties.combatWave).toBe(1);
    });

    it('death steps the wave back instead of retrying', () => {
        reviveNow();
        dbg.startWave('monster005'); // level-5 pack vs a low-level hero
        // (combatWave gets clamped to the unlocked prefix for the UI, so read
        // the effective value back rather than assuming an index)
        const waveBefore = player.properties.combatWave;
        // an explicit startWave key pins the spawn pool to that monster
        expect(dbg.getWave().pool).toEqual(['monster005']);
        expect(dbg.getWave().enemies.every((e) => e.monster === monsterList.monster005)).toBe(
            true
        );
        dbg.pump(120); // they will kill us
        expect(player.properties.isDead).toBe(true);
        expect(player.properties.combatWave).toBe(Math.max(0, waveBefore - 1));
    });
});

describe('waveUnlocks table stays consistent with quest()', () => {
    // sample normal tiers and boss/gatekeeper tiers
    const samples = ['monster002', 'monster005', 'monster008', 'monster009', 'monster016'];
    for (const key of samples) {
        it(`${key} unlocks exactly at its table threshold`, () => {
            MakeMonsterList(); // resets all isShown/killCounts
            const { requires, kills } = waveUnlocks[key];
            monsterList[requires].isShown = true;
            monsterList[requires].killCount = kills - 1;
            quest();
            expect(monsterList[key].isShown).toBe(false);
            monsterList[requires].killCount = kills;
            quest();
            expect(monsterList[key].isShown).toBe(true);
        });
    }
});
