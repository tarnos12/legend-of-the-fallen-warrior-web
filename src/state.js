'use strict';

// Shared mutable PRIMITIVE game state (Phase 3 ESM).
//
// ES module imports are read-only live bindings, so a primitive (boolean/number/
// string) that is *reassigned* from more than one module can't be a plain
// exported binding — a consumer can't write to an imported `let`/`var`. Instead
// these live as properties of this single exported `state` object, which every
// module imports and mutates (`state.hardcoreMode = true`, etc.). Object
// properties are freely reassignable, so all files stay in sync through one slot.
//
// Only genuinely cross-module reassigned primitives belong here. Reassigned
// arrays/objects (playerInventory, logData, monsterList, itemShop*) are mutated
// in place and exported as normal bindings; core-only scratch vars are plain
// module-local `var`s in core.js.
export const state = {
    // battle scratch shared between battle.js and core.js
    battleTurn: undefined,
    damageTaken: 0,
    // new-game hardcore toggle (set from the start screen checkbox, read by save)
    hardcoreMode: false,
    // currently-selected shop radio item
    checkedShopItem: '',
    // auto-sell / drop-filter rarity checkboxes
    checkBoxCommon: false,
    checkBoxUncommon: false,
    checkBoxRare: false,
    checkBoxEpic: false,
    checkBoxLegendary: false,
    // per-reroll shop stock counters
    weaponAmount: 0,
    armorAmount: 0,
    accessoryAmount: 0,
};
