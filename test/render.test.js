import { describe, it, expect, beforeAll } from 'vitest';
import { stubJQuery, loadGameDom, captureRender } from './utils.js';
import { player, createEquippedItemsObject, copyPlayerProperties } from '../src/core/core.js';
import { state } from '../src/core/state.js';
import { characterRaces } from '../src/data/gameObjects.js';
import { MakeMonsterList } from '../src/data/monsterList.js';
import { CreateMonsterHtml } from '../src/ui/monsterUI.js';
import {
    CreateWeaponSkillHtml,
    checkBoxHtml,
    CreatePlayerSkillsHtml,
    primaryStatUpdate,
    secondaryStatUpdate,
} from '../src/ui/panelsUI.js';
import { EquippedItemsEmpty, itemTooltipTest } from '../src/ui/inventoryUI.js';
import { shopOther } from '../src/ui/shopUI.js';
import {
    startingScreen,
    saveGameSlot,
    characterCreationHtml,
    checkHeroRace,
} from '../src/ui/characterUI.js';

// Regression snapshots for every deterministic renderer. The captured string is
// the EXACT raw html assigned to innerHTML, so any refactor that changes output
// by even one byte fails here (the golden-master technique, made permanent).
//
// NOTE: tests run in file order and some renderers mutate shared state
// (checkHeroRace -> raceStats() adds race bonuses to player.properties), so the
// order below is part of the fixture — don't reorder without regenerating
// snapshots deliberately (npx vitest run -u after reviewing the diff).
describe('render snapshots (fixed game state)', () => {
    beforeAll(() => {
        stubJQuery();
        loadGameDom();
        localStorage.clear();
        copyPlayerProperties();
        createEquippedItemsObject('all');
        MakeMonsterList();
        for (const race of Object.values(characterRaces)) race.raceAge = 'Adulthood';
        state.checkBoxCommon = true;
        state.checkBoxUncommon = true;
        state.checkBoxRare = false;
        state.checkBoxEpic = false;
        state.checkBoxLegendary = false;
    });

    it('startingScreen', () => {
        expect(captureRender(startingScreen, 'buttonDiv')).toMatchSnapshot();
    });
    it('saveGameSlot', () => {
        expect(captureRender(saveGameSlot, 'saveGameSlot')).toMatchSnapshot();
    });
    it('checkBoxHtml', () => {
        expect(captureRender(checkBoxHtml, 'checkBoxHtml')).toMatchSnapshot();
    });
    it('EquippedItemsEmpty', () => {
        expect(captureRender(EquippedItemsEmpty, 'equipHtml')).toMatchSnapshot();
    });
    it('CreateMonsterHtml', () => {
        expect(captureRender(CreateMonsterHtml, 'monsterTabs')).toMatchSnapshot();
    });
    it('CreateWeaponSkillHtml', () => {
        expect(captureRender(CreateWeaponSkillHtml, 'weaponSkill')).toMatchSnapshot();
    });
    it('CreatePlayerSkillsHtml', () => {
        expect(captureRender(CreatePlayerSkillsHtml, 'playerSkills')).toMatchSnapshot();
    });
    it('primaryStatUpdate', () => {
        expect(captureRender(primaryStatUpdate, 'primaryStat')).toMatchSnapshot();
    });
    it('secondaryStatUpdate', () => {
        expect(captureRender(secondaryStatUpdate, 'secondaryStat')).toMatchSnapshot();
    });
    it('shopOther', () => {
        expect(captureRender(shopOther, 'shopOther')).toMatchSnapshot();
    });
    it('characterCreationHtml (race grid, empty heroRace)', () => {
        player.properties.heroRace = '';
        expect(captureRender(characterCreationHtml, 'raceCreation')).toMatchSnapshot();
    });
    it('checkHeroRace (Human selected)', () => {
        player.properties.heroRace = 'Human';
        expect(captureRender(checkHeroRace, 'characterRace')).toMatchSnapshot();
    });
    it('itemTooltipTest (fixed weapon + shield)', () => {
        const weapon = {
            id: 1,
            itemType: 'weapon',
            subType: 'sword',
            itemRarity: 'Rare',
            name: 'Test Sword',
            color: '#4169E1',
            image: 'sword1',
            MinDamage: 10,
            MaxDamage: 20,
            AverageDamage: 15,
            'Critical chance': 5,
            'Bonus damage': 2,
            Strength: 3,
            Value: 100,
            iLvl: 4,
            lore: 'A test blade.',
        };
        const shield = {
            id: 2,
            itemType: 'armor',
            subType: 'shield',
            itemRarity: 'Common',
            name: 'Test Shield',
            color: '#FFFFFF',
            image: 'shield1',
            defense: 12,
            'Block chance': 8,
            'Bonus armor': 0,
            Endurance: 2,
            Value: 50,
            iLvl: 3,
            lore: 'A test wall.',
        };
        expect(itemTooltipTest(weapon)).toMatchSnapshot();
        expect(itemTooltipTest(shield)).toMatchSnapshot();
    });
});
