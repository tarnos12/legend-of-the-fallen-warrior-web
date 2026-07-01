import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  getNumberMultiplierofFive,
  getTen,
  getThousands,
  player,
  equippedItems,
  createEquippedItemsObject,
  playerInventory,
} from '../src/core.js';
import { getItemType } from '../src/itemDrop.js';

// Some game functions call Log(), which writes to #logConsole; provide it.
beforeAll(() => {
  document.body.innerHTML = '<div id="logConsole"></div><div id="updateInventorySlots"></div>';
});

describe('number/display helpers (pure)', () => {
  it('getNumberMultiplierofFive rounds to nearest 5, caps at 100, floors negatives', () => {
    expect(getNumberMultiplierofFive(3)).toBe(1); // <= 4 -> 1
    expect(getNumberMultiplierofFive(23)).toBe(25); // ceil(23/5)*5
    expect(getNumberMultiplierofFive(150)).toBe(100); // cap
    expect(getNumberMultiplierofFive(-7)).toBe(-10); // floor(-7/5)*5
  });

  it('getTen scales by ~10/8, minimum 10', () => {
    expect(getTen(4)).toBe(10); // <= 8 -> 10
    expect(getTen(16)).toBe(20); // ceil(16/8)*10
    expect(getTen(-8)).toBe(-10); // floor(-8/8)*10
  });

  it('getThousands formats K/M and floors small numbers', () => {
    expect(getThousands(950)).toBe(950);
    expect(getThousands(12345)).toBe('12K');
    expect(getThousands(2500000)).toBe('2M');
    expect(getThousands(99.9)).toBe(99);
  });
});

describe('equipment stat summing (via player.functions.*Bonus)', () => {
  beforeEach(() => {
    createEquippedItemsObject('all'); // reset all slots to zeroed, unequipped
  });

  it('is 0 across empty slots', () => {
    expect(player.functions.totalStrengthBonus()).toBe(0);
    expect(player.functions.totalArmorBonus()).toBe(0);
  });

  it('sums a stat across equipment slots', () => {
    equippedItems.chest['Strength'] = 7;
    equippedItems.helmet['Strength'] = 3;
    expect(player.functions.totalStrengthBonus()).toBe(10);
  });

  it('"All attributes" contributes to every attribute bonus', () => {
    equippedItems.ring['All attributes'] = 4;
    // totalStrengthBonus = Strength(0) + AllAttributes(4)
    expect(player.functions.totalStrengthBonus()).toBe(4);
    expect(player.functions.totalLuckBonus()).toBe(4);
  });
});

describe('procedural item generation (getItemType)', () => {
  beforeEach(() => {
    playerInventory.length = 0;
    player.properties.itemIdNumber = 1;
  });

  it('generates a weapon item with the expected shape', () => {
    getItemType(1, false, 'weapon', 'sword', 'Common');
    expect(playerInventory.length).toBe(1);
    const item = playerInventory[0];
    expect(item.itemType).toBe('weapon');
    expect(item.subType).toBe('sword');
    expect(typeof item.itemRarity).toBe('string');
    expect(item.itemRarity.length).toBeGreaterThan(0);
    expect(typeof item.id).toBe('number');
    // a weapon has damage stats
    expect(item.MinDamage).toBeGreaterThanOrEqual(0);
    expect(item.MaxDamage).toBeGreaterThanOrEqual(item.MinDamage);
  });

  it('generates unique ids for successive items', () => {
    getItemType(1, false, 'weapon', 'sword', 'Common');
    getItemType(1, false, 'weapon', 'sword', 'Common');
    expect(playerInventory).toHaveLength(2);
    expect(playerInventory[0].id).not.toBe(playerInventory[1].id);
  });
});
