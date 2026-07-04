'use strict';

// Weapon combat profiles: how each weapon type behaves in canvas combat.
// The BASE numbers below define the class identity (matched to the weapon's
// existing skill flavor — axe has Whirlwind, mace has Tremor, ranged has
// Pierce the Veil...). The equipped weapon ITEM can then modify the profile
// through special stats, so future item affixes change battle behavior with
// no combat-code changes. Recognized item stats (additive, display-ready in
// the inventory tooltip):
//   'Attack speed'  (%)  -> cooldown / (1 + v/100)
//   'Extra targets' (+n) -> maxTargets + n  (cleave / pierce / splash cap)
//   'Stun chance'   (%)  -> stunChance + v/100  (any weapon can learn to stun)
// To add a new special stat: read it here, use it in ui/battleCanvas.js (or
// pass it to systems/battle.js as a roll modifier), and whitelist its name in
// inventoryUI.itemTooltipTest so it shows on the item.
import { equippedItems } from '../core/core.js';

// Class identity. maxTargets means: melee = cleave targets per swing,
// ranged = enemies one arrow can pierce, staff = enemies one splash can hit.
// All rough-tuned to a similar total damage budget against a 3-enemy wave:
// sword/mace win small waves (speed+crit / big hits+stun), axe/staff win
// stacked groups, bow wins the approach phase and lines.
const BASE_PROFILES = {
    fists: { range: 52, cooldown: 0.9, projectile: false, maxTargets: 1 },
    sword: {
        range: 52,
        cooldown: 0.65, // fastest swing
        projectile: false,
        maxTargets: 1,
        critBonus: 10, // +10% crit chance (Sword Finesse identity)
        parryBonus: 10, // +10% parry chance (Parry & Riposte identity)
    },
    axe: {
        range: 52,
        cooldown: 1.0,
        projectile: false,
        maxTargets: 3, // cleave (Whirlwind identity)
        cleaveFalloff: 0.6, // 2nd target 60%, 3rd 36%
    },
    mace: {
        range: 52,
        cooldown: 1.4, // slowest swing...
        projectile: false,
        maxTargets: 1,
        damageMult: 2.2, // ...but the biggest hits (Overbearing Wallop).
        // sim-tuned from 1.6s/1.8x (~15% behind every other armed class over
        // 30 min): early enemies are one-shot either way, so kill rate hangs
        // on the swing rate — raising damage alone measurably did nothing.
        stunChance: 0.25, // Tremor identity: stunned enemies skip their
        stunSeconds: 1.2, // round-robin attack turn
    },
    staff: {
        range: 240,
        cooldown: 1.2,
        projectile: true,
        magic: true,
        maxTargets: 3,
        splashRadius: 70, // impact explosion (Hate Cannon identity)
        splashFalloff: 0.4,
    },
    ranged: {
        range: 260, // longest reach: starts firing during the approach
        cooldown: 1.1,
        projectile: true,
        maxTargets: 3,
        pierce: true, // Pierce the Veil identity
        pierceFalloff: 0.5, // 2nd enemy 50%, 3rd 25%
    },
};

// Build the effective profile for a weapon item (defaults to the equipped
// weapon). Base behavior comes from the weapon class; the item's special
// stats then modify it.
export function weaponCombatProfile(weapon) {
    if (weapon === undefined) weapon = equippedItems.weapon;
    const subType = weapon && weapon.isEquipped === true ? weapon.subType : 'fists';
    const base = BASE_PROFILES[subType] || BASE_PROFILES.fists;
    const profile = {
        subType,
        projectile: false,
        magic: false,
        maxTargets: 1,
        cleaveFalloff: 0.6,
        pierce: false,
        pierceFalloff: 0.5,
        splashRadius: 0,
        splashFalloff: 0.4,
        damageMult: 1,
        critBonus: 0,
        parryBonus: 0,
        stunChance: 0,
        stunSeconds: 1.2,
        ...base,
    };
    if (weapon && weapon.isEquipped === true) {
        if (weapon['Attack speed'] > 0) {
            profile.cooldown = profile.cooldown / (1 + weapon['Attack speed'] / 100);
        }
        if (weapon['Extra targets'] > 0) {
            profile.maxTargets += weapon['Extra targets'];
        }
        if (weapon['Stun chance'] > 0) {
            profile.stunChance += weapon['Stun chance'] / 100;
        }
    }
    return profile;
}
