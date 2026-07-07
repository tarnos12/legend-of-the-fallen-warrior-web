import { describe, it, expect, beforeAll } from 'vitest';
import { stubJQuery, loadGameDom } from './utils.js';

// Boss Souls acquisition rework: area-boss kills drop a guaranteed soul
// currency; the Soul Shop spends it to buy any UNLOCKED boss's signature unique
// at the player's level. Removes the old 20%-RNG + slot-gating.
let core, player, playerInventory, monsterAreas, souls, data;

beforeAll(async () => {
    stubJQuery();
    loadGameDom();
    localStorage.clear();
    core = await import('../src/core/core.js');
    ({ player, playerInventory } = core);
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    await import('../src/systems/equip.js');
    ({ monsterAreas } = await import('../src/data/gameObjects.js'));
    data = await import('../src/data/bossSouls.js');
    souls = await import('../src/systems/bossSouls.js');
    player.properties.itemIdNumber = 1;
    player.properties.bossSouls = 0;
});

describe('boss souls — drops', () => {
    it('grants souls on boss kills (2x shiny), never on non-bosses', () => {
        player.properties.bossSouls = 0;
        souls.grantBossSouls({ name: 'LordVarik', displayName: 'Lord Varik', level: 20 }, true, false);
        expect(player.properties.bossSouls).toBe(data.SOUL_DROP);
        souls.grantBossSouls({ name: 'LordVarik', displayName: 'Lord Varik', level: 20 }, true, true);
        expect(player.properties.bossSouls).toBe(data.SOUL_DROP * 3); // +1, then +2 (shiny)
        const before = player.properties.bossSouls;
        souls.grantBossSouls({ name: 'VarikGrunt', displayName: 'Grunt', level: 1 }, true, false);
        expect(player.properties.bossSouls).toBe(before);
    });
});

describe('boss souls — soul shop purchase', () => {
    it('buys a unique when the area is unlocked and affordable, deducting souls', () => {
        const entry = data.SOUL_SHOP[0]; // LordVarik / BanditHideout
        const area = monsterAreas.find((a) => a.type === entry.areaType);
        area.isUnlocked = true;
        player.properties.level = 20;
        player.properties.bossSouls = entry.price;
        playerInventory.length = 0;
        souls.buyBossUnique(entry.bossName);
        expect(player.properties.bossSouls).toBe(0);
        expect(playerInventory.length).toBe(1);
        expect(playerInventory[0].name).toBe(entry.def.name);
        expect(playerInventory[0].isUnique).toBe(true);
        expect(playerInventory[0].itemRarity).toBe('Legendary');
    });

    it('refuses when the area is locked or souls are insufficient', () => {
        const entry = data.SOUL_SHOP[1];
        const area = monsterAreas.find((a) => a.type === entry.areaType);
        // locked area, plenty of souls -> no purchase
        area.isUnlocked = false;
        player.properties.bossSouls = 999;
        playerInventory.length = 0;
        souls.buyBossUnique(entry.bossName);
        expect(playerInventory.length).toBe(0);
        expect(player.properties.bossSouls).toBe(999);
        // unlocked but too poor -> no purchase
        area.isUnlocked = true;
        player.properties.bossSouls = entry.price - 1;
        souls.buyBossUnique(entry.bossName);
        expect(playerInventory.length).toBe(0);
        expect(player.properties.bossSouls).toBe(entry.price - 1);
    });
});
