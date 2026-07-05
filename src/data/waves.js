'use strict';

// 5-wave structure per area (2026-07 combat rework). Each area's monster
// chain (8 per area, sorted by id) is grouped into five waves:
//   wave 1: the area's first monster alone (the on-ramp)
//   waves 2-4: the middle monsters split as evenly as possible; spawns pick
//              SEMI-RANDOMLY among the wave's currently UNLOCKED members, so
//              players farm a specific wave for a specific monster
//   wave 5: the area boss (the chain's last monster), fought alone
// Progression still runs on the per-monster quest chain (quest.js flips
// isShown by kill count; data/waveUnlocks.js documents the thresholds):
// a wave becomes available when its FIRST member unlocks, and later members
// join its spawn pool as their own unlocks land.
import { monsterList } from './monsterList.js';

export const WAVES_PER_AREA = 5;

export function areaMonsterKeys(areaType) {
    return Object.keys(monsterList)
        .filter((key) => monsterList[key].area === areaType)
        .sort((a, b) => monsterList[a].id - monsterList[b].id);
}

// -> array of (up to) 5 arrays of monster keys, in chain order
export function waveGroups(areaType) {
    const keys = areaMonsterKeys(areaType);
    if (keys.length === 0) return [];
    if (keys.length === 1) return [keys];
    const middle = keys.slice(1, -1);
    const chunks = [[], [], []];
    middle.forEach((key, i) => chunks[Math.floor((i * 3) / middle.length)].push(key));
    return [[keys[0]], ...chunks.filter((c) => c.length > 0), [keys[keys.length - 1]]];
}

export function waveMembers(areaType, waveIndex) {
    return waveGroups(areaType)[waveIndex] || [];
}

export function unlockedWaveMembers(areaType, waveIndex) {
    return waveMembers(areaType, waveIndex).filter((key) => monsterList[key].isShown === true);
}

// Monster unlocks are sequential, so the available waves are a prefix: a wave
// counts as unlocked once its first member is shown.
export function unlockedWaveCount(areaType) {
    const groups = waveGroups(areaType);
    let count = 0;
    for (const group of groups) {
        const first = monsterList[group[0]];
        if (first && first.isShown === true) count++;
        else break;
    }
    return count;
}

// True for the wave that holds the area boss (fought alone).
export function isBossWave(areaType, waveIndex) {
    const groups = waveGroups(areaType);
    return groups.length > 1 && waveIndex === groups.length - 1;
}
