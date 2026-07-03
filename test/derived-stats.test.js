import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { stubJQuery } from './utils.js';
import {
    player,
    equippedItems,
    createEquippedItemsObject,
    copyPlayerProperties,
} from '../src/core/core.js';
import { monsterList, MakeMonsterList } from '../src/data/monsterList.js';

// Guards the battle/stat math: these numbers are pure functions of the fixed
// default player state, so a change in any snapshot means the gameplay math
// changed (which refactors must never do).
describe('derived player stats (fixed default state)', () => {
    beforeAll(() => {
        stubJQuery();
        copyPlayerProperties();
    });
    beforeEach(() => {
        createEquippedItemsObject('all'); // zeroed, unequipped slots
    });

    it('base derived values match the known-good numbers', () => {
        const f = player.functions;
        expect({
            totalStrength: f.totalStrength(),
            totalEndurance: f.totalEndurance(),
            maxhealth: f.maxhealth(),
            maxMana: f.maxMana(),
            defense: f.defense(),
            accuracy: f.accuracy(),
            evasion: f.evasion(),
            maxBattleTurns: f.maxBattleTurns(),
            inventory: f.inventory(),
        }).toMatchSnapshot();
    });

    it('equipment stat bonuses feed the derived totals', () => {
        const before = player.functions.totalStrength();
        equippedItems.chest['Strength'] = 10;
        expect(player.functions.totalStrengthBonus()).toBe(10);
        expect(player.functions.totalStrength()).toBeGreaterThan(before);
    });

    it('armor defense feeds player defense', () => {
        const before = player.functions.defense();
        equippedItems.shield.defense = 50;
        expect(player.functions.totalArmorBonus()).toBe(50);
        expect(player.functions.defense()).toBeGreaterThan(before);
    });
});

describe('monster stats (fixed default player, Hero difficulty)', () => {
    beforeAll(() => {
        MakeMonsterList();
    });

    it('roster shape', () => {
        expect(Object.keys(monsterList).length).toBe(56);
    });

    it('first/mid monsters match known-good numbers', () => {
        const snap = (m) => ({
            level: m.level,
            maxHp: m.maxHp,
            minDmg: m.minDmg(),
            maxDmg: m.maxDmg(),
            def: m.def(),
        });
        expect(snap(monsterList.monster001)).toMatchSnapshot();
        expect(snap(monsterList.monster005)).toMatchSnapshot();
    });
});
