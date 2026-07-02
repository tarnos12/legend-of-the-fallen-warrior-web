import { describe, it, expect } from 'vitest';
import { player, currentGameVersion, defaultValues } from '../src/core/core.js';
import { monsterList, MakeMonsterList } from '../src/data/monsterList.js';
import { characterRaces } from '../src/data/gameObjects.js';
import { state } from '../src/core/state.js';

describe('save-wipe guard (versionCheck landmine)', () => {
    // versionCheck() in save.js wipes the save whenever
    // player.properties.gameVersion !== currentGameVersion. Bumping one without the
    // other silently deletes every player's save. This test fails loudly if they
    // ever drift apart without a matching migration.
    it('player.properties.gameVersion matches currentGameVersion', () => {
        expect(player.properties.gameVersion).toBe(currentGameVersion);
    });
});

describe('save payload serialization (base64 JSON round-trip)', () => {
    it('survives btoa(JSON.stringify(...)) -> atob -> JSON.parse without loss', () => {
        const saveGame = {
            playerProperties: player.properties,
            gameVersion: currentGameVersion,
            inventory: [{ id: 42, itemRarity: 'Rare', Value: 100 }],
        };
        const encoded = btoa(JSON.stringify(saveGame));
        const decoded = JSON.parse(atob(encoded));
        expect(decoded.gameVersion).toBe(currentGameVersion);
        expect(decoded.playerProperties.level).toBe(player.properties.level);
        expect(decoded.inventory[0].id).toBe(42);
        expect(decoded.inventory[0].itemRarity).toBe('Rare');
    });
});

describe('MakeMonsterList', () => {
    it('populates the shared monsterList with monster001..056', () => {
        MakeMonsterList();
        expect(Object.keys(monsterList)).toHaveLength(56);
        expect(monsterList.monster001).toBeDefined();
        expect(monsterList.monster056).toBeDefined();
        expect(monsterList.monster056.lastEnemy).toBe(true);
    });

    it('rebuilds in place (same object reference) with fresh monsters', () => {
        MakeMonsterList();
        const ref = monsterList;
        monsterList.monster001.hp = -999; // mutate
        MakeMonsterList();
        expect(monsterList).toBe(ref); // exported const is never reassigned
        expect(monsterList.monster001.hp).not.toBe(-999); // repopulated fresh
    });
});

describe('character races (gameObjects)', () => {
    it('exposes all eight playable races with stat methods', () => {
        const names = Object.keys(characterRaces);
        expect(names).toEqual(
            expect.arrayContaining([
                'human',
                'halfElf',
                'dwarf',
                'orc',
                'elf',
                'halfing',
                'sylph',
                'giant',
            ])
        );
        expect(names).toHaveLength(8);
        expect(typeof characterRaces.human.strength).toBe('function');
        expect(characterRaces.human.strength()).toBeGreaterThan(0);
    });
});

describe('shared state defaults (state.js)', () => {
    it('exposes the reassignable primitive game state', () => {
        expect(state).toBeTypeOf('object');
        expect(state.hardcoreMode).toBe(false);
        expect(state.checkBoxCommon).toBe(false);
        expect(state.weaponAmount).toBe(0);
        // defaultValues is the save-migration backfill source
        expect(defaultValues).toBeTypeOf('object');
        expect(defaultValues.properties).toBeTypeOf('object');
    });
});
