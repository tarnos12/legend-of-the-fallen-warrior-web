import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { itemImageName } from '../src/core/format.js';

// Regression: item art is derived from subType+rarity(+level number for
// weapons/shields). Generation (itemDrop) and the on-load repair (save.js) must
// agree AND the resulting file must exist — a mismatch broke every weapon/shield
// icon after loading a save. Locks both: derivation matches generation, and
// every produced filename maps to a real PNG under public/images/items/.
const HERE = dirname(fileURLToPath(import.meta.url));
const IMAGES = join(HERE, '..', 'public', 'images', 'items');
const imgPath = (item) => join(IMAGES, item.subType, itemImageName(item) + '.png');

let getItemType;
let player;
let playerInventory;

beforeAll(async () => {
    ({ getItemType } = await import('../src/systems/itemDrop.js'));
    const core = await import('../src/core/core.js');
    ({ player, playerInventory } = core);
    core.copyPlayerProperties();
    core.createEquippedItemsObject('all');
    document.body.innerHTML = '<div id="logConsole"></div><div id="updateInventorySlots"></div>';
    player.properties.itemIdNumber = 1;
});

const SLOTS = [
    ['weapon', 'sword'], ['weapon', 'axe'], ['weapon', 'mace'], ['weapon', 'staff'], ['weapon', 'ranged'],
    ['armor', 'shield'], ['armor', 'chest'], ['armor', 'helmet'], ['armor', 'legs'], ['armor', 'boots'],
    ['accessory', 'ring'], ['accessory', 'amulet'], ['accessory', 'talisman'],
];

describe('item art filenames resolve to real files', () => {
    it('every generated item across slots/levels has an existing PNG', () => {
        for (const [itemType, subType] of SLOTS) {
            for (const iLvl of [1, 5, 12, 40, 120]) {
                playerInventory.length = 0;
                getItemType(iLvl, false, itemType, subType, 'Master');
                const item = playerInventory[playerInventory.length - 1];
                player.properties.itemIdNumber += 1;
                expect(item, `${subType}@${iLvl}`).toBeTruthy();
                // generation's stored image must match the shared derivation...
                expect(item.image, `${subType}@${iLvl}`).toBe(itemImageName(item));
                // ...and the file must exist (this is what the on-load repair produces)
                expect(existsSync(imgPath(item)), imgPath(item)).toBe(true);
            }
        }
    });

    it('the no-number armor/accessory form has no file (why weapons need the suffix)', () => {
        // a weapon derived WITHOUT the number (the old repair bug) points nowhere
        const broken = join(IMAGES, 'sword', 'swordLegendary.png');
        expect(existsSync(broken)).toBe(false);
    });
});
