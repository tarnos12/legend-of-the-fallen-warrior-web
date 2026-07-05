import { describe, it, expect, beforeAll } from 'vitest';
import { stubJQuery, loadGameDom } from './utils.js';

// Regression: the affix redesign makes items carry ONLY the stat keys they
// rolled (no more zero-filling every modifier). The player's stat engine sums
// keys across equipped slots, so a missing key must read as 0, not undefined —
// otherwise the sum is NaN and the hero deals NaN damage (nothing dies, nothing
// takes damage: a silent combat stalemate). This locks the null-safe reads.
let core, idrop;
beforeAll(async () => {
    stubJQuery();
    loadGameDom();
    localStorage.clear();
    core = await import('../src/core/core.js');
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    const { characterRaces } = await import('../src/data/gameObjects.js');
    for (const r of Object.values(characterRaces)) r.raceAge = 'Adulthood';
    core.player.properties.heroRace = 'Human';
    const { primaryStatUpdate, secondaryStatUpdate } = await import('../src/ui/panelsUI.js');
    primaryStatUpdate();
    secondaryStatUpdate();
    await import('../src/systems/gameControls.js');
    const eq = await import('../src/ui/inventoryUI.js');
    eq.EquippedItemsEmpty();
    await import('../src/systems/equip.js');
    idrop = await import('../src/systems/itemDrop.js');
});

function equipCrafted(itemType, subType) {
    core.player.properties.itemIdNumber = (core.player.properties.itemIdNumber || 0) + 1;
    core.playerInventory.length = 0;
    idrop.getItemType(5, false, itemType, subType, 'Common');
    const item = core.playerInventory[core.playerInventory.length - 1];
    core.player.properties.itemIdNumber += 1;
    window.equipItem(item.id);
    return item;
}

describe('equipped sparse items keep player stats finite', () => {
    it('a Common weapon yields finite, positive damage (not NaN)', () => {
        equipCrafted('weapon', 'sword');
        const dmg = core.player.functions.minDamage();
        expect(Number.isFinite(dmg)).toBe(true);
        expect(dmg).toBeGreaterThan(0);
        expect(Number.isFinite(core.player.functions.maxDamage())).toBe(true);
        expect(Number.isFinite(core.player.functions.totalCriticalChance())).toBe(true);
        expect(Number.isFinite(core.player.functions.totalLifeGainOnHit())).toBe(true);
    });

    it('a Common shield yields finite block + defense', () => {
        equipCrafted('armor', 'shield');
        expect(Number.isFinite(core.player.functions.totalBlockChance())).toBe(true);
        expect(Number.isFinite(core.player.functions.totalBlockAmount())).toBe(true);
        expect(Number.isFinite(core.player.functions.defense())).toBe(true);
    });

    it('a Common ring yields finite summed attribute/utility stats', () => {
        equipCrafted('accessory', 'ring');
        expect(Number.isFinite(core.player.functions.totalStrength())).toBe(true);
        expect(Number.isFinite(core.player.functions.totalMagicFind())).toBe(true);
        expect(Number.isFinite(core.player.functions.totalGoldDrop())).toBe(true);
    });
});
