import { describe, it, expect, beforeAll } from 'vitest';
import { stubJQuery, loadGameDom } from './utils.js';
import { player, createEquippedItemsObject, copyPlayerProperties } from '../src/core/core.js';
import { monsterList, MakeMonsterList } from '../src/data/monsterList.js';
import { primaryStatUpdate, secondaryStatUpdate } from '../src/ui/panelsUI.js';
import { applyOfflineProgress, estimateKillsPerSecond } from '../src/systems/offline.js';

describe('offline progress', () => {
    beforeAll(() => {
        stubJQuery();
        loadGameDom();
        localStorage.clear();
        copyPlayerProperties();
        createEquippedItemsObject('all');
        MakeMonsterList();
        player.properties.heroRace = 'Human';
        player.properties.combatArea = '';
        player.properties.combatWave = 0;
        // load() renders the stat panels before offline progress runs; the
        // reward pipeline's updateHtml() needs the spans they create
        primaryStatUpdate();
        secondaryStatUpdate();
    });

    it('short absences grant nothing', () => {
        expect(applyOfflineProgress(Date.now() - 30 * 1000)).toBeNull();
        expect(applyOfflineProgress(undefined)).toBeNull();
    });

    it('an hour away grants real kills, gold and kill counts', () => {
        const goldBefore = player.properties.gold;
        const killsBefore = monsterList.monster001.killCount;
        const summary = applyOfflineProgress(Date.now() - 3600 * 1000);
        expect(summary).toBeTruthy();
        expect(summary.kills).toBeGreaterThan(0);
        expect(monsterList.monster001.killCount).toBe(killsBefore + summary.kills);
        expect(player.properties.gold - goldBefore).toBe(summary.gold);
        expect(summary.gold).toBeGreaterThan(0);
        // the away banner is rendered and dismissible
        const banner = document.getElementById('offlineSummary');
        expect(banner).toBeTruthy();
        banner.querySelector('button').click();
        expect(document.getElementById('offlineSummary')).toBeNull();
    });

    it('kills are capped for very long absences', () => {
        const before = monsterList.monster001.killCount;
        const summary = applyOfflineProgress(Date.now() - 365 * 24 * 3600 * 1000);
        expect(summary.kills).toBeLessThanOrEqual(300);
        // 8h cap: a year away is no better than the cap allows
        const rate = estimateKillsPerSecond(monsterList.monster001);
        expect(summary.kills).toBeLessThanOrEqual(Math.floor(rate * 8 * 3600));
        expect(monsterList.monster001.killCount).toBe(before + summary.kills);
    });

    it('offline kills feed quest unlocks like live kills', () => {
        // the previous tests racked up 10+ grunt kills -> wave 2 unlocked
        expect(monsterList.monster001.killCount).toBeGreaterThanOrEqual(10);
        expect(monsterList.monster002.isShown).toBe(true);
    });
});
