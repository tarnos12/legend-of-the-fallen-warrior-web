import { describe, it, expect } from 'vitest';

// Smoke test: importing core.js pulls in most of the module graph (weaponMastery,
// skills, gameObjects, monsterList, dynamicHtml, stats, battle, itemDrop, quest,
// professions, potionsHotbar, shop, state). This verifies the whole ESM graph
// evaluates cleanly in jsdom without throwing at import time.
import * as core from '../src/core.js';

describe('module graph loads', () => {
  it('exports core game state + helpers', () => {
    expect(core.player).toBeTypeOf('object');
    expect(core.player.properties).toBeTypeOf('object');
    expect(core.equippedItems).toBeTypeOf('object');
    expect(core.getThousands).toBeTypeOf('function');
    expect(core.getNumberMultiplierofFive).toBeTypeOf('function');
    expect(core.getTen).toBeTypeOf('function');
    expect(core.Log).toBeTypeOf('function');
  });
});
