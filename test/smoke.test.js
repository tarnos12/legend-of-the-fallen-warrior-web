import { describe, it, expect } from 'vitest';

// Smoke test: save.js + gameControls.js together import the whole ui/core/data/
// systems graph (core.js itself now only pulls its three data providers). This
// verifies the ESM graph evaluates cleanly in jsdom without throwing at import
// time.
import '../src/core/save.js';
import '../src/systems/gameControls.js';
import * as core from '../src/core/core.js';
import * as log from '../src/core/log.js';
import * as format from '../src/core/format.js';

describe('module graph loads', () => {
    it('exports core game state + helpers', () => {
        expect(core.player).toBeTypeOf('object');
        expect(core.player.properties).toBeTypeOf('object');
        expect(core.equippedItems).toBeTypeOf('object');
        expect(format.getThousands).toBeTypeOf('function');
        expect(format.getNumberMultiplierofFive).toBeTypeOf('function');
        expect(format.getTen).toBeTypeOf('function');
        expect(log.Log).toBeTypeOf('function');
    });
});
