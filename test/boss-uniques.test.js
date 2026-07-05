import { describe, it, expect, beforeAll } from 'vitest';
import { BOSS_UNIQUES, signatureValue } from '../src/data/bossUniques.js';

// Phase 2: named boss uniques. Each area boss drops a forced-Legendary item of
// a fixed slot with a guaranteed signature affix, fixed name, gold color, and
// isUnique flag; non-bosses never drop one.
let rollBossUnique;
let player;
let playerInventory;

beforeAll(async () => {
    ({ rollBossUnique } = await import('../src/systems/itemDrop.js'));
    const core = await import('../src/core/core.js');
    ({ player, playerInventory } = core);
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    document.body.innerHTML = '<div id="logConsole"></div><div id="updateInventorySlots"></div>';
    player.properties.itemIdNumber = 1;
});

// force the roll to always fire by looping until it drops (chance is 20%)
function forceUnique(monster) {
    for (let i = 0; i < 200; i++) {
        playerInventory.length = 0;
        const item = rollBossUnique(monster, true, false);
        if (item) return item;
    }
    return null;
}

describe('boss uniques', () => {
    it('each defined boss drops its named unique with the signature affix', () => {
        for (const [bossName, defs] of Object.entries(BOSS_UNIQUES)) {
            const def = defs[0];
            const monster = { name: bossName, displayName: bossName, level: 20 };
            const item = forceUnique(monster);
            expect(item, bossName).toBeTruthy();
            expect(item.name).toBe(def.name);
            expect(item.isUnique).toBe(true);
            expect(item.itemRarity).toBe('Legendary');
            expect(item.subType).toBe(def.subType);
            // signature affix present at >= its fixed magnitude
            const sig = signatureValue(def.signature, 20);
            expect(item[def.signature.key]).toBeGreaterThanOrEqual(sig);
        }
    });

    it('non-boss monsters never drop a unique', () => {
        const grunt = { name: 'VarikGrunt', displayName: 'Varik Grunt', level: 1 };
        for (let i = 0; i < 300; i++) {
            playerInventory.length = 0;
            expect(rollBossUnique(grunt, true, false)).toBe(null);
        }
    });

    it('signature scales with boss level where perLevel is set', () => {
        // Heart of the Golem: All attributes 20 + 1/level
        const golem = BOSS_UNIQUES.FrightGolem[0];
        expect(signatureValue(golem.signature, 0)).toBe(20);
        expect(signatureValue(golem.signature, 46)).toBe(66);
        // Lord Varik's Cleaver: flat +2 Extra targets, no scaling
        expect(signatureValue(BOSS_UNIQUES.LordVarik[0].signature, 99)).toBe(2);
    });
});
