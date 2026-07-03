import { describe, it, expect, beforeAll, vi } from 'vitest';
import { stubJQuery, loadGameDom } from './utils.js';
// Importing save.js + gameControls.js pulls in the whole game graph and
// registers saveGameFunction/load on window, exactly like the browser.
import '../src/core/save.js';
import '../src/systems/gameControls.js';
import {
    player,
    playerInventory,
    createEquippedItemsObject,
    copyPlayerProperties,
} from '../src/core/core.js';
import { monsterList, MakeMonsterList } from '../src/data/monsterList.js';
import { playerPassive } from '../src/data/skills.js';
import { weaponMastery } from '../src/data/weaponMastery.js';
import { characterRaces } from '../src/data/gameObjects.js';

// Full persistence round trip through the REAL save/load functions: save to
// localStorage, wreck the live state, load(), and confirm everything is back.
// load() re-renders the whole UI, so the real index.html body is loaded first.
describe('save -> mutate -> load round trip', () => {
    beforeAll(() => {
        vi.useFakeTimers(); // keep load()'s autoSave/interval loops from running
        stubJQuery();
        loadGameDom();
        localStorage.clear();
        window.confirm = () => false; // load() must never fall into "new game?"
        copyPlayerProperties();
        createEquippedItemsObject('all');
        MakeMonsterList();
        for (const race of Object.values(characterRaces)) race.raceAge = 'Adulthood';
    });

    it('restores player, inventory, kill counts, passives and mastery', () => {
        // distinctive state
        player.properties.heroRace = 'Human';
        player.properties.gold = 1234;
        player.properties.level = 7;
        playerInventory.length = 0;
        playerInventory.push({
            id: 99,
            itemType: 'weapon',
            subType: 'sword',
            itemRarity: 'Rare',
            name: 'Roundtrip Sword',
            Value: 42,
            iLvl: 7,
        });
        monsterList.monster001.killCount = 42;
        const passiveKey = Object.keys(playerPassive)[0];
        playerPassive[passiveKey].level = 3;
        weaponMastery.sword.level = 5;

        window.saveGameFunction('manualSave', 2);
        expect(localStorage.EncodedSave2).toBeTypeOf('string');
        const payload = JSON.parse(atob(localStorage.EncodedSave2));
        expect(payload.playerProperties.gold).toBe(1234);
        expect(payload.inventory).toHaveLength(1);
        expect(payload.monster001).toBe(42);
        expect(payload[passiveKey]).toBe(3);
        expect(payload.swordLevel).toBe(5);

        // wreck the live state
        player.properties.gold = 0;
        player.properties.level = 1;
        playerInventory.length = 0;
        monsterList.monster001.killCount = 0;
        playerPassive[passiveKey].level = 0;
        weaponMastery.sword.level = 1;

        window.load(2);

        expect(player.properties.gold).toBe(1234);
        expect(player.properties.level).toBe(7);
        expect(playerInventory).toHaveLength(1);
        expect(playerInventory[0].name).toBe('Roundtrip Sword');
        expect(monsterList.monster001.killCount).toBe(42);
        expect(playerPassive[passiveKey].level).toBe(3);
        expect(weaponMastery.sword.level).toBe(5);
        // the visible gold counter is refreshed by load()
        expect(document.getElementById('gold').innerHTML).toBe('1234');
        // save-wipe guard: version matched, so the save must still be there
        expect(localStorage.EncodedSave2).toBeTypeOf('string');
    });
});
