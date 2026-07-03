import { describe, it, expect } from 'vitest';
import { weaponCombatProfile } from '../src/systems/weaponBehavior.js';

const equipped = (subType, extra = {}) => ({ isEquipped: true, subType, ...extra });

describe('weaponCombatProfile — class identities', () => {
    it('falls back to fists when nothing is equipped', () => {
        expect(weaponCombatProfile(undefined).subType).toBe('fists');
        expect(weaponCombatProfile({ isEquipped: false, subType: 'sword' }).subType).toBe('fists');
        expect(weaponCombatProfile({}).subType).toBe('fists');
    });

    it('sword: fastest swing, crit + parry bonuses, single target', () => {
        const p = weaponCombatProfile(equipped('sword'));
        expect(p.cooldown).toBeLessThan(0.9);
        expect(p.critBonus).toBeGreaterThan(0);
        expect(p.parryBonus).toBeGreaterThan(0);
        expect(p.maxTargets).toBe(1);
        expect(p.projectile).toBe(false);
    });

    it('axe: cleaves multiple targets with falloff', () => {
        const p = weaponCombatProfile(equipped('axe'));
        expect(p.maxTargets).toBeGreaterThan(1);
        expect(p.cleaveFalloff).toBeGreaterThan(0);
        expect(p.cleaveFalloff).toBeLessThan(1);
    });

    it('mace: slowest, biggest hits, stuns', () => {
        const p = weaponCombatProfile(equipped('mace'));
        const sword = weaponCombatProfile(equipped('sword'));
        expect(p.cooldown).toBeGreaterThan(sword.cooldown);
        expect(p.damageMult).toBeGreaterThan(1);
        expect(p.stunChance).toBeGreaterThan(0);
        expect(p.maxTargets).toBe(1);
    });

    it('staff: magic projectile with splash', () => {
        const p = weaponCombatProfile(equipped('staff'));
        expect(p.projectile).toBe(true);
        expect(p.magic).toBe(true);
        expect(p.splashRadius).toBeGreaterThan(0);
        expect(p.range).toBeGreaterThan(100);
    });

    it('ranged: longest range, piercing with falloff', () => {
        const p = weaponCombatProfile(equipped('ranged'));
        expect(p.projectile).toBe(true);
        expect(p.pierce).toBe(true);
        expect(p.maxTargets).toBeGreaterThan(1);
        const staff = weaponCombatProfile(equipped('staff'));
        expect(p.range).toBeGreaterThan(staff.range);
    });
});

describe('weaponCombatProfile — item special stats modify behavior', () => {
    it('Attack speed reduces the cooldown proportionally', () => {
        const base = weaponCombatProfile(equipped('sword'));
        const fast = weaponCombatProfile(equipped('sword', { 'Attack speed': 100 }));
        expect(fast.cooldown).toBeCloseTo(base.cooldown / 2);
    });

    it('Extra targets raises the cleave/pierce/splash cap on any weapon', () => {
        expect(weaponCombatProfile(equipped('mace', { 'Extra targets': 1 })).maxTargets).toBe(2);
        expect(weaponCombatProfile(equipped('axe', { 'Extra targets': 2 })).maxTargets).toBe(5);
        expect(weaponCombatProfile(equipped('ranged', { 'Extra targets': 1 })).maxTargets).toBe(4);
    });

    it('Stun chance adds stun to any weapon and stacks on the mace', () => {
        const sword = weaponCombatProfile(equipped('sword', { 'Stun chance': 15 }));
        expect(sword.stunChance).toBeCloseTo(0.15);
        const maceBase = weaponCombatProfile(equipped('mace')).stunChance;
        const mace = weaponCombatProfile(equipped('mace', { 'Stun chance': 15 }));
        expect(mace.stunChance).toBeCloseTo(maceBase + 0.15);
    });

    it('special stats are ignored when absent or zero', () => {
        const p = weaponCombatProfile(equipped('sword', { 'Attack speed': 0 }));
        expect(p.cooldown).toBe(weaponCombatProfile(equipped('sword')).cooldown);
    });
});
