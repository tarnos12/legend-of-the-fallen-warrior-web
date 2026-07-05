import { describe, it, expect, beforeAll } from 'vitest';
import { stubJQuery, loadGameDom } from './utils.js';

// Wave grouping invariants (data/waves.js): every area splits into 5 waves —
// solo opener, three middle pools, solo boss — covering the whole monster
// chain in id order, and wave availability follows the isShown prefix.
let waves;
let monsterList;
let MakeMonsterList;
let monsterAreas;

beforeAll(async () => {
    stubJQuery();
    loadGameDom();
    const core = await import('../src/core/core.js');
    core.copyPlayerProperties();
    waves = await import('../src/data/waves.js');
    ({ monsterList, MakeMonsterList } = await import('../src/data/monsterList.js'));
    ({ monsterAreas } = await import('../src/data/gameObjects.js'));
    MakeMonsterList();
});

describe('wave groups', () => {
    it('every area splits into 5 waves: solo opener, 3 pools, solo boss', () => {
        for (const area of monsterAreas) {
            const groups = waves.waveGroups(area.type);
            const keys = waves.areaMonsterKeys(area.type);
            expect(groups.length).toBe(5);
            expect(groups[0].length).toBe(1);
            expect(groups[4].length).toBe(1);
            expect(groups[0][0]).toBe(keys[0]);
            expect(groups[4][0]).toBe(keys[keys.length - 1]);
            // full coverage, original chain order
            expect(groups.flat()).toEqual(keys);
        }
    });

    it('boss wave detection', () => {
        expect(waves.isBossWave('BanditHideout', 4)).toBe(true);
        expect(waves.isBossWave('BanditHideout', 3)).toBe(false);
        expect(waves.isBossWave('BanditHideout', 0)).toBe(false);
    });

    it('unlocked waves are a prefix driven by each group leader', () => {
        MakeMonsterList(); // only monster001 shown
        expect(waves.unlockedWaveCount('BanditHideout')).toBe(1);
        expect(waves.unlockedWaveMembers('BanditHideout', 0)).toEqual(['monster001']);

        // unlock the second group's leader -> 2 waves, pool of 1
        monsterList.monster002.isShown = true;
        expect(waves.unlockedWaveCount('BanditHideout')).toBe(2);
        expect(waves.unlockedWaveMembers('BanditHideout', 1)).toEqual(['monster002']);

        // its second member joins the same pool, no new wave
        monsterList.monster003.isShown = true;
        expect(waves.unlockedWaveCount('BanditHideout')).toBe(2);
        expect(waves.unlockedWaveMembers('BanditHideout', 1)).toEqual([
            'monster002',
            'monster003',
        ]);

        // everything shown -> all 5 waves
        for (const key of waves.areaMonsterKeys('BanditHideout')) {
            monsterList[key].isShown = true;
        }
        expect(waves.unlockedWaveCount('BanditHideout')).toBe(5);
        MakeMonsterList(); // leave clean state for other files
    });
});
