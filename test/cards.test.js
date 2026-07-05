import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { stubJQuery, loadGameDom } from './utils.js';

// Collectible enemy cards: drop per kill, dedupe, and completing an area's set
// activates a permanent rate bonus that the player's rate functions read.
let cards, core, monsterList, MakeMonsterList, areaMonsterKeys;

beforeAll(async () => {
    stubJQuery();
    loadGameDom();
    core = await import('../src/core/core.js');
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    ({ monsterList, MakeMonsterList } = await import('../src/data/monsterList.js'));
    ({ areaMonsterKeys } = await import('../src/data/waves.js'));
    cards = await import('../src/systems/cards.js');
    MakeMonsterList();
});

beforeEach(() => {
    core.player.properties.cardsOwned = {};
    core.player.properties.cardGoldBonus = 0;
    core.player.properties.cardDropBonus = 0;
    core.player.properties.cardExpBonus = 0;
});

describe('card drops', () => {
    it('grants a monster its card and never a duplicate', () => {
        const m = monsterList.monster001;
        // force a drop by looping (3% chance)
        let got = null;
        for (let i = 0; i < 500 && !got; i++) got = cards.rollCard(m, true, false);
        expect(got).toBe('monster001');
        expect(cards.ownsCard('monster001')).toBe(true);
        // already owned -> always null
        for (let i = 0; i < 100; i++) expect(cards.rollCard(m, true, false)).toBe(null);
    });

    it('unknown monster grants nothing', () => {
        expect(cards.rollCard({ name: 'NotAMonster', area: 'X' }, true, false)).toBe(null);
    });
});

describe('area set completion + bonus', () => {
    it('completing an area set activates its rate bonus and the player reads it', () => {
        const { player } = core;
        const goldBefore = player.functions.goldRate();
        // grant every BanditHideout card (set bonus: +5% gold)
        for (const key of areaMonsterKeys('BanditHideout')) {
            player.properties.cardsOwned[key] = true;
        }
        expect(cards.isAreaSetComplete('BanditHideout')).toBe(true);
        cards.recomputeCardBonuses();
        expect(player.properties.cardGoldBonus).toBe(5);
        // goldRate is 1 + (... + cardGoldBonus)/100, so +0.05
        expect(player.functions.goldRate()).toBeCloseTo(goldBefore + 0.05);
    });

    it('a partial set grants no bonus', () => {
        const keys = areaMonsterKeys('BanditHideout');
        for (let i = 0; i < keys.length - 1; i++) core.player.properties.cardsOwned[keys[i]] = true;
        expect(cards.isAreaSetComplete('BanditHideout')).toBe(false);
        cards.recomputeCardBonuses();
        expect(core.player.properties.cardGoldBonus).toBe(0);
    });

    it('areaCardProgress reports owned/total', () => {
        const keys = areaMonsterKeys('BanditHideout');
        core.player.properties.cardsOwned[keys[0]] = true;
        const p = cards.areaCardProgress('BanditHideout');
        expect(p.owned).toBe(1);
        expect(p.total).toBe(keys.length);
    });
});
