'use strict';
// Player-state module: the player object (properties/functions/buffs),
// equippedItems, playerInventory, defaultValues, currentGameVersion. The
// gameplay handlers that used to live here are in systems/equip.js and
// systems/gameControls.js; the log system is core/log.js; formatters are
// core/format.js. Circular imports with the data providers below are safe:
// every cross-module use is inside a function body, never at module-eval.
import { weaponMastery } from '../data/weaponMastery.js';
import { playerPassive, weaponSkillList } from '../data/skills.js';
import { loadingEquippedItems } from '../data/gameObjects.js';

var currentGameVersion = 1.8;
var defaultValues = {
    properties: {},
};

// Equipment slots that contribute attribute/bonus stats, in a fixed order.
// Used by the player.functions.total*Bonus() helpers below.
var equipmentSlots = [
    'weapon',
    'shield',
    'chest',
    'helmet',
    'legs',
    'boots',
    'ring',
    'amulet',
    'talisman',
];
// Slots that contribute to armor/defense (excludes weapon and accessories).
var armorSlots = ['shield', 'chest', 'helmet', 'legs', 'boots'];
// Accessory slots — the only non-weapon slots that carry OFFENSIVE affixes
// (crit chance, % bonus damage). Their attributes/utility are summed via
// equipmentSlots above; the two offensive keys are read separately below so a
// ring/amulet can meaningfully roll crit and bonus damage.
var accessorySlots = ['ring', 'amulet', 'talisman'];
// Sum a single stat key across the given equipped slots. Order-independent for
// integer stats, so the result is identical to the original unrolled sums.
function sumEquippedStat(statKey, slots) {
    var total = 0;
    for (var i = 0; i < slots.length; i++) {
        // `|| 0`: items only carry the stat keys they actually rolled (the
        // affix redesign no longer zero-fills every key), so a missing key
        // must read as 0, not undefined — otherwise the sum becomes NaN.
        total += equippedItems[slots[i]][statKey] || 0;
    }
    return total;
}

//PLAYER STATS
var player = {
    buffs: {
        Strength: { amount: 0, timer: 0 },
        Endurance: { amount: 0, timer: 0 },
        Agility: { amount: 0, timer: 0 },
        Dexterity: { amount: 0, timer: 0 },
        Wisdom: { amount: 0, timer: 0 },
        Intelligence: { amount: 0, timer: 0 },
        Luck: { amount: 0, timer: 0 },
        AllStats: { amount: 0, timer: 0 },
        ExpGain: { amount: 0, timer: 0 },
        ItemDrop: { amount: 0, timer: 0 },
        GoldDrop: { amount: 0, timer: 0 },
    },
    properties: {
        monsterBackground: 'green',
        prestigeMultiplier: 1,
        prestigeSuffix: '',
        difficulty: 'Hero',
        lastEnemyLevel: 1, // Used for crafting, it will change based on highest enemy level killed.
        monsterLevel: 0, //Used when reset game i.e. prestige ( It will be set for highest monster which will determine first monster level after prestige)
        // Idle canvas-combat state (ui/battleCanvas.js). Old saves are backfilled
        // with these defaults by load()'s missing-property pass.
        combatArea: '', // '' = first unlocked area
        combatWave: 0, // index into the area's monsters (wave 1 = index 0)
        combatAutoProgress: true,
        // Collectible enemy cards (systems/cards.js). cardsOwned maps monster
        // key -> true; the three bonuses are the aggregate % from COMPLETED
        // per-area card sets, recomputed on card gain + on load, read by the
        // rate functions below. Old saves backfill to {}/0 (no cards, no bonus).
        cardsOwned: {},
        cardGoldBonus: 0,
        cardDropBonus: 0,
        cardExpBonus: 0,
        potionInventory: [],
        //Minerals
        Thaumerite: 0,
        LiteCyan: 0,
        OhmStone: 0,
        Techtite: 0,
        XilBond: 0,
        VulcanatedIron: 0,
        //Herbs
        LillyWisp: 0,
        RusinsSinew: 0,
        EssenceofWillow: 0,
        SinnersDelight: 0,
        BarletBark: 0,
        ThistleWart: 0,
        Vystim: 0,
        //Other
        raceAllStats: 0,
        raceGoldDrop: 0,
        raceExpRate: 0,
        raceDropRate: 0,
        raceEvasion: 0,
        raceDamage: 0,
        raceHealth: 0,
        raceAccuracy: 0,
        raceDefense: 0,
        raceManaRegen: 0,
        raceMaxMana: 0,
        raceCriticalChance: 0,
        raceSpellPower: 0,
        saveSlot: 0,
        gameVersion: 1.8,
        heroRace: '',
        sound: 'off',
        hardcoreMode: false,
        isLoading: true,
        isDead: false,
        runOnce: false,
        isSword: false,
        isAxe: false,
        isMace: false,
        isStaff: false,
        isRanged: false,
        itemIdNumber: 1,
        stats: 0,
        skillPoints: 0,
        gold: 0,
        level: 1,
        experience: 0,
        maxExperience: 100,
        backpackUpgrade: 0,
        goldDrop: 0, //Display values in player log after defeating a monster
        expGain: 0,
        goldLost: 0,
        expLost: 0,
        //Strength
        baseStrength: 5,

        //Endurance
        baseEndurance: 5,

        //Agility
        baseAgility: 5,

        //Dexterity
        baseDexterity: 5,

        //Intelligence
        baseIntelligence: 5,

        //Wisdom
        baseWisdom: 5,

        //Luck
        baseLuck: 5,

        //Health
        health: 500,

        //Mana
        mana: 10,
    },
    functions: {
        maxBattleTurns: function () {
            return Math.floor(
                10 +
                    player.functions.totalEndurance() / 100 +
                    player.functions.totalAgility() / 100 +
                    player.functions.totalDexterity() / 100
            );
        },
        weapon: '',
        shield: '',
        chest: '',
        helmet: '',
        legs: '',
        boots: '',
        ring: '',
        amulet: '',
        talisman: '',
        totalAllAttributesBonus: function () {
            return sumEquippedStat('All attributes', equipmentSlots);
        },
        totalStrengthBonus: function () {
            return (
                sumEquippedStat('Strength', equipmentSlots) +
                player.functions.totalAllAttributesBonus()
            );
        },
        totalEnduranceBonus: function () {
            return (
                sumEquippedStat('Endurance', equipmentSlots) +
                player.functions.totalAllAttributesBonus()
            );
        },
        totalAgilityBonus: function () {
            return (
                sumEquippedStat('Agility', equipmentSlots) +
                player.functions.totalAllAttributesBonus()
            );
        },
        totalDexterityBonus: function () {
            return (
                sumEquippedStat('Dexterity', equipmentSlots) +
                player.functions.totalAllAttributesBonus()
            );
        },
        totalWisdomBonus: function () {
            return (
                sumEquippedStat('Wisdom', equipmentSlots) +
                player.functions.totalAllAttributesBonus()
            );
        },
        totalIntelligenceBonus: function () {
            return (
                sumEquippedStat('Intelligence', equipmentSlots) +
                player.functions.totalAllAttributesBonus()
            );
        },
        totalLuckBonus: function () {
            return (
                sumEquippedStat('Luck', equipmentSlots) + player.functions.totalAllAttributesBonus()
            );
        },
        totalBlockChance: function () {
            return equippedItems.shield['Block chance'] || 0;
        },
        totalBlockAmount: function () {
            return equippedItems.shield['Block amount'] || 0;
        },
        totalLifeGainOnHit: function () {
            return equippedItems.weapon['Life gain on hit'] || 0;
        },
        totalCriticalChance: function () {
            return (
                (equippedItems.weapon['Critical chance'] || 0) +
                sumEquippedStat('Critical chance', accessorySlots)
            );
        },
        totalArmorBonus: function () {
            return sumEquippedStat('defense', armorSlots);
        },
        totalLifeBonus: function () {
            return sumEquippedStat('Bonus life', equipmentSlots);
        },
        totalManaBonus: function () {
            return sumEquippedStat('Bonus mana', equipmentSlots);
        },
        totalMagicFind: function () {
            return sumEquippedStat('Magic find', equipmentSlots);
        },
        totalGoldDrop: function () {
            return sumEquippedStat('Gold drop', equipmentSlots);
        },
        totalExperienceRate: function () {
            return sumEquippedStat('Experience rate', equipmentSlots);
        },
        // % bonus physical damage rolled on ACCESSORIES. The weapon's own
        // 'Bonus damage' affix is folded into its MinDamage/MaxDamage at
        // generation (systems/itemDrop.js), so it is NOT summed here — that
        // would double-count it. Accessories store it as a live key that feeds
        // the bonusDamage() multiplier below.
        totalBonusDamage: function () {
            return sumEquippedStat('Bonus damage', accessorySlots);
        },
        bonusDamage: function () {
            var damage = player.functions.totalBonusDamage();
            if (playerPassive.brawler.level > 0) {
                damage += playerPassive.brawler.bonusTotal();
            }
            if (playerPassive.mighty.level > 0) {
                damage += playerPassive.mighty.bonusTotal();
            }
            if (playerPassive.combatTraining.level > 0) {
                damage += playerPassive.combatTraining.bonusTotal();
            }
            if (playerPassive.combatMaster.level > 0) {
                damage += playerPassive.combatMaster.bonusTotal();
            }
            return damage;
        },
        bonusCriticalChance: function () {
            var criticalChance = 0;
            if (playerPassive.reflex.level > 0) {
                criticalChance += playerPassive.reflex.bonusTotal();
            }
            return criticalChance;
        },
        bonusCriticalDamage: function () {
            var criticalDamage = 0;
            if (playerPassive.masterofArms.level > 0) {
                criticalDamage += playerPassive.masterofArms.bonusTotal();
            }
            if (playerPassive.fierceImpact.level > 0) {
                criticalDamage += playerPassive.fierceImpact.bonusTotal();
            }
            return criticalDamage;
        },
        bonusStrength: function () {
            var strength = 0;
            if (playerPassive.physicalExercise.level > 0) {
                strength += playerPassive.physicalExercise.bonusTotal();
            }
            return strength;
        },
        bonusEndurance: function () {
            var endurance = 0;
            if (playerPassive.constitution.level > 0) {
                endurance += playerPassive.constitution.bonusTotal();
            }
            return endurance;
        },
        bonusAgility: function () {
            var agility = 0;
            if (playerPassive.sixthSense.level > 0) {
                agility += playerPassive.sixthSense.bonusTotal();
            }
            return agility;
        },
        bonusSpellPower: function () {
            var spellPower = 0;
            if (playerPassive.elementalMastery.level > 0) {
                spellPower += playerPassive.elementalMastery.bonusTotal();
            }
            if (playerPassive.magicTraining.level > 0) {
                spellPower += playerPassive.magicTraining.bonusTotal();
            }
            if (playerPassive.mentalMastery.level > 0) {
                spellPower += playerPassive.mentalMastery.bonusTotal();
            }
            if (playerPassive.spiritualAttunement.level > 0) {
                spellPower += playerPassive.spiritualAttunement.bonusTotal();
            }
            spellPower =
                weaponSkillList.staff.spellSimulacrum.damage() +
                (spellPower + player.properties.raceSpellPower) / 100;
            return spellPower.toFixed(2);
        },
        bonusMana: function () {
            var mana = 0;
            if (playerPassive.manaEnchant.level > 0) {
                mana += playerPassive.manaEnchant.bonusTotal();
            }
            return mana;
        },
        bonusManaRegen: function () {
            var manaRegen = 0;
            if (playerPassive.quickMeditation.level > 0) {
                manaRegen += playerPassive.quickMeditation.bonusTotal();
            }
            return manaRegen;
        },
        bonusDefense: function () {
            var defense = 0;
            if (playerPassive.armorProficiency.level > 0) {
                defense += playerPassive.armorProficiency.bonusTotal();
            }
            if (playerPassive.ironSkin.level > 0) {
                defense += playerPassive.ironSkin.bonusTotal();
            }
            return defense;
        },
        bonusHealthRegen: function () {
            var hpRegen = 0;
            if (playerPassive.recovery.level > 0) {
                hpRegen += playerPassive.recovery.bonusTotal();
            }
            if (playerPassive.robust.level > 0) {
                hpRegen += playerPassive.robust.bonusTotal();
            }
            return hpRegen;
        },
        bonusHealth: function () {
            var health = 0;
            if (playerPassive.vitality.level > 0) {
                health += playerPassive.vitality.bonusTotal();
            }
            if (playerPassive.fortitude.level > 0) {
                health += playerPassive.fortitude.bonusTotal();
            }
            return health;
        },
        bonusEvasion: function () {
            var evasion = 0;
            if (playerPassive.evasion.level > 0) {
                evasion += playerPassive.evasion.bonusTotal();
            }
            return evasion;
        },
        dropRate: function () {
            return (
                1 +
                (player.functions.totalLuck() / 5 +
                    player.functions.totalMagicFind() +
                    player.properties.raceDropRate +
                    player.properties.cardDropBonus +
                    player.buffs.ItemDrop.amount) /
                    100
            );
        },
        expRate: function () {
            return (
                1 +
                (player.functions.totalExperienceRate() +
                    player.properties.raceExpRate +
                    player.properties.cardExpBonus +
                    player.buffs.ExpGain.amount) /
                    100
            );
        },
        goldRate: function () {
            return (
                1 +
                (player.functions.totalGoldDrop() +
                    player.properties.raceGoldDrop +
                    player.properties.cardGoldBonus +
                    player.buffs.GoldDrop.amount) /
                    100
            );
        },
        inventory: function () {
            return Math.floor(
                30 + player.functions.totalStrength() / 10 + player.properties.backpackUpgrade
            ); //Add backpacks "new item type"
        },
        masteryStrength: function () {
            return (
                weaponMastery.axe.axeStrength() *
                    weaponMastery.ranged.rangedStrength() *
                    weaponMastery.sword.swordStrength() +
                player.functions.bonusStrength() / 100
            );
        },
        totalStrength: function () {
            return Math.floor(
                (player.properties.baseStrength + player.functions.totalStrengthBonus()) *
                    (player.functions.masteryStrength() +
                        player.properties.raceAllStats / 100 +
                        (player.buffs.Strength.amount + player.buffs.AllStats.amount))
            );
        },
        masteryEndurance: function () {
            return (
                weaponMastery.mace.maceEndurance() * weaponMastery.axe.axeEndurance() +
                player.functions.bonusEndurance() / 100
            );
        },
        totalEndurance: function () {
            return Math.floor(
                (player.properties.baseEndurance + player.functions.totalEnduranceBonus()) *
                    (player.functions.masteryEndurance() +
                        player.properties.raceAllStats / 100 +
                        (player.buffs.Endurance.amount + player.buffs.AllStats.amount))
            );
        },
        masteryAgility: function () {
            return weaponMastery.sword.swordAgility() + player.functions.bonusAgility() / 100;
        },
        totalAgility: function () {
            return Math.floor(
                (player.properties.baseAgility + player.functions.totalAgilityBonus()) *
                    (player.functions.masteryAgility() +
                        player.properties.raceAllStats / 100 +
                        (player.buffs.Agility.amount + player.buffs.AllStats.amount))
            );
        },
        masteryDexterity: function () {
            return weaponMastery.ranged.rangedDexterity();
        },
        totalDexterity: function () {
            return Math.floor(
                (player.properties.baseDexterity + player.functions.totalDexterityBonus()) *
                    (player.functions.masteryDexterity() +
                        player.properties.raceAllStats / 100 +
                        (player.buffs.Dexterity.amount + player.buffs.AllStats.amount))
            );
        },
        masteryIntelligence: function () {
            return weaponMastery.staff.staffIntelligence();
        },
        totalIntelligence: function () {
            return Math.floor(
                (player.properties.baseIntelligence + player.functions.totalIntelligenceBonus()) *
                    (player.functions.masteryIntelligence() +
                        player.properties.raceAllStats / 100 +
                        (player.buffs.Intelligence.amount + player.buffs.AllStats.amount))
            );
        },
        masteryWisdom: function () {
            return weaponMastery.staff.staffWisdom() * weaponMastery.mace.maceWisdom();
        },
        totalWisdom: function () {
            return Math.floor(
                (player.properties.baseWisdom + player.functions.totalWisdomBonus()) *
                    (player.functions.masteryWisdom() +
                        player.properties.raceAllStats / 100 +
                        (player.buffs.Wisdom.amount + player.buffs.AllStats.amount))
            );
        },
        totalLuck: function () {
            return Math.floor(
                (player.properties.baseLuck + player.functions.totalLuckBonus()) *
                    (1 +
                        player.properties.raceAllStats / 100 +
                        (player.buffs.Luck.amount + player.buffs.AllStats.amount))
            );
        },
        maxhealth: function () {
            return Math.floor(
                (475 + player.functions.totalLifeBonus() + player.functions.totalEndurance() * 5) *
                    (1 + player.functions.bonusHealth() / 100) *
                    (1 + player.properties.raceHealth / 100)
            );
        },
        hpregen: function () {
            return Math.floor(
                (2 + player.functions.totalEndurance() / 10) *
                    (1 + player.functions.bonusHealthRegen() / 100)
            );
        },
        //Mana
        maxMana: function () {
            return Math.floor(
                (7 +
                    player.functions.totalManaBonus() +
                    player.functions.totalWisdom() * 5 +
                    player.functions.totalIntelligence() * 0.1) *
                    (1 + player.functions.bonusMana() / 100) *
                    (1 + player.properties.raceMaxMana / 100)
            );
        },
        manaRegen: function () {
            return (
                (player.functions.totalWisdom() / 10) *
                (1 + (player.properties.raceManaRegen + player.functions.bonusManaRegen()) / 100)
            );
        },
        //Damage
        minDamage: function () {
            return Math.floor(
                (7 +
                    player.functions.totalStrength() * 0.6 +
                    equippedItems.weapon.MinDamage +
                    weaponSkillList.sword.swordFinesse.damage()) *
                    (1 + player.functions.bonusDamage() / 100) *
                    (1 + player.properties.raceDamage / 100)
            );
        },
        maxDamage: function () {
            return Math.floor(
                (10 +
                    player.functions.totalStrength() * 0.6 +
                    equippedItems.weapon.MinDamage +
                    weaponSkillList.sword.swordFinesse.damage()) *
                    (1 + player.functions.bonusDamage() / 100) *
                    (1 + player.properties.raceDamage / 100)
            );
        },
        //Secondary
        accuracy: function () {
            if (player.properties.raceAccuracy === 100) {
                return 200;
            } else {
                return Math.floor(
                    90 +
                        player.properties.raceAccuracy +
                        playerPassive.preciseAttack.bonusTotal() +
                        player.functions.totalAgility() * 0.02
                );
            }
        },
        defense: function () {
            return (
                (player.functions.totalAgility() * 0.1 + player.functions.totalArmorBonus()) *
                (1 + (player.properties.raceDefense + player.functions.bonusDefense()) / 100)
            );
        },
        evasion: function () {
            if (player.properties.raceEvasion === "Can't evade") {
                return 0;
            } else {
                if (
                    5 +
                        player.functions.bonusEvasion() +
                        player.properties.raceEvasion +
                        (player.functions.totalAgility() * 0.03 +
                            player.functions.totalLuck() * 0.01) >=
                    75
                ) {
                    return 75;
                } else {
                    return (
                        5 +
                        player.functions.bonusEvasion() +
                        player.properties.raceEvasion +
                        (player.functions.totalAgility() * 0.03 +
                            player.functions.totalLuck() * 0.01)
                    );
                }
            }
        },
        criticalChance: function () {
            if (
                10 +
                    player.functions.totalCriticalChance() +
                    (player.properties.raceCriticalChance +
                        player.functions.bonusCriticalChance()) +
                    (player.functions.totalDexterity() * 0.03 +
                        player.functions.totalLuck() * 0.01) >
                75
            ) {
                return 75 + weaponSkillList.ranged.archerFocus.damage();
            } else {
                return (
                    10 +
                    weaponSkillList.ranged.archerFocus.damage() +
                    player.functions.totalCriticalChance() +
                    (player.properties.raceCriticalChance +
                        player.functions.bonusCriticalChance()) +
                    (player.functions.totalDexterity() * 0.03 + player.functions.totalLuck() * 0.01)
                );
            }
        },
        criticalDamage: function () {
            return (
                1.1 +
                player.functions.totalDexterity() * 0.005 +
                (weaponSkillList.axe.butchersInsight.damage() +
                    player.functions.bonusCriticalDamage()) /
                    100
            );
        },
        blockChance: function () {
            if (
                Math.floor(
                    weaponSkillList.sword.parryAndRiposte.blockChance() +
                        player.functions.totalBlockChance()
                ) >= 40
            ) {
                return 40;
            } else {
                return Math.floor(
                    weaponSkillList.sword.parryAndRiposte.blockChance() +
                        player.functions.totalBlockChance()
                );
            }
        },
        blockAmount: function () {
            return Math.floor(
                weaponSkillList.sword.parryAndRiposte.blockAmount() +
                    player.functions.totalBlockAmount()
            );
        },
        counterChance: function () {
            return Math.floor(weaponSkillList.sword.parryAndRiposte.counterChance());
        },
        counterDamage: function () {
            return Math.floor(weaponSkillList.sword.parryAndRiposte.counterDamage());
        },
        lifeSteal: function () {
            return Math.floor(
                weaponSkillList.sword.savageStrike.lifeStealAmount() +
                    player.functions.totalLifeGainOnHit()
            );
        },
        baseSpellPower: function () {
            return Math.floor(
                player.functions.totalIntelligence() * 2 + player.functions.totalWisdom() * 0.5
            );
        },
        spellPower: function () {
            return Math.floor(
                player.functions.baseSpellPower() * player.functions.bonusSpellPower()
            );
        },
        ignoreDefense: function () {
            var ignore = 1;
            if (playerPassive.piercingAttack.level > 0) {
                ignore -= playerPassive.piercingAttack.bonusTotal() / 100;
            }
            return ignore;
        },
        instantKillChance: function () {
            var instantKill = 0;
            if (playerPassive.assasination.level > 0) {
                instantKill += playerPassive.assasination.bonusTotal();
            }
            return instantKill;
        },
        parryChance: function () {
            var parry = 0;
            if (playerPassive.parry.level > 0) {
                parry += playerPassive.parry.bonusTotal();
            }
            return parry;
        },
        thornAura: function () {
            var thorns = 0;
            if (playerPassive.thornAura.level > 0) {
                thorns += playerPassive.thornAura.bonusTotal();
            }
            return thorns;
        },
        ignoreDamage: function () {
            var ignoreDamage = 0;
            if (playerPassive.stoneSkin.level > 0) {
                ignoreDamage += playerPassive.stoneSkin.bonusTotal();
            }
            return ignoreDamage;
        },
        reflect: function () {
            var reflect = 0;
            if (playerPassive.damageReflect.level > 0) {
                reflect += playerPassive.damageReflect.bonusTotal();
            }
            return reflect;
        },
    },
};

//Equipped items object, storing 0 values, so all player stats will work at the beginning of the game
var equippedItems = {};
function createEquippedItemsObject(typeOfTheItem) {
    for (var key in loadingEquippedItems) {
        if (loadingEquippedItems.hasOwnProperty(key)) {
            var itemKey = loadingEquippedItems[key];
            if (itemKey.hasOwnProperty('type')) {
                if (typeOfTheItem === itemKey.type || typeOfTheItem === 'all') {
                    var itemType = itemKey.type;
                    if (
                        equippedItems[itemType] === undefined ||
                        equippedItems[itemType].isEquipped === false
                    ) {
                        equippedItems[itemType] = {};
                        equippedItems[itemType]['All attributes'] = 0;
                        equippedItems[itemType]['Strength'] = 0;
                        equippedItems[itemType]['Endurance'] = 0;
                        equippedItems[itemType]['Agility'] = 0;
                        equippedItems[itemType]['Dexterity'] = 0;
                        equippedItems[itemType]['Wisdom'] = 0;
                        equippedItems[itemType]['Intelligence'] = 0;
                        equippedItems[itemType]['Luck'] = 0;
                        equippedItems[itemType]['Bonus life'] = 0;
                        equippedItems[itemType]['Bonus mana'] = 0;
                        equippedItems[itemType]['Magic find'] = 0;
                        equippedItems[itemType]['Gold drop'] = 0;
                        equippedItems[itemType]['Experience rate'] = 0;
                        equippedItems[itemType]['isEquipped'] = false;
                        if (itemType === 'shield') {
                            equippedItems[itemType]['Block chance'] = 0;
                            equippedItems[itemType]['Block amount'] = 0;
                            equippedItems[itemType]['Bonus armor'] = 0;
                            equippedItems[itemType]['defense'] = 0;
                        } else if (
                            itemType === 'chest' ||
                            itemType === 'helmet' ||
                            itemType === 'legs' ||
                            itemType === 'boots'
                        ) {
                            equippedItems[itemType]['Bonus armor'] = 0;
                            equippedItems[itemType]['defense'] = 0;
                        } else if (itemType === 'weapon') {
                            equippedItems[itemType]['Life gain on hit'] = 0;
                            equippedItems[itemType]['Critical chance'] = 0;
                            equippedItems[itemType]['Bonus damage'] = 0;
                            equippedItems[itemType]['MinDamage'] = 0;
                            equippedItems[itemType]['MaxDamage'] = 0;
                        }
                    }
                }
            }
        }
    }
}

// createEquippedItemsObject('all') init call moved to initGame() in src/main.js (Phase 3 ESM)

var playerInventory = [];
// Reassigned primitives (battleTurn, damageTaken, the checkBox* flags,
// checkedShopItem, hardcoreMode) now live on the shared `state` object in
// src/state.js, imported above.

// `number` is the stat-buy / display multiplier, module-local to core.js.

function copyPlayerProperties() {
    var playerDefault = defaultValues.properties;
    var playerProperties = player.properties;
    for (var key in playerProperties) {
        if (playerProperties.hasOwnProperty(key)) {
            playerDefault[key] = playerProperties[key];
        }
    }
}
// copyPlayerProperties() init call moved to initGame() in src/main.js (Phase 3 ESM)

// Phase 3 ESM: player / equippedItems / defaultValues are core game state, never
// reassigned (mutated in place), so they are real exports now. Consumers import
// them instead of reading window globals. Circular imports with the provider
// modules (weaponMastery/skills/gameObjects) are safe: every cross-module use is
// inside a function/method body (runtime), never at module-eval.
// The cross-module (non-onclick) functions are exported here too.
export {
    player,
    equippedItems,
    defaultValues,
    playerInventory,
    currentGameVersion,
    createEquippedItemsObject,
    copyPlayerProperties,
};
