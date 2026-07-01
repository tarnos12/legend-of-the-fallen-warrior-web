"use strict";
import { weaponMastery } from './weaponMastery.js';
import { playerPassive, weaponSkillList } from './skills.js';
import { loadingEquippedItems, monsterAreas, characterRaces } from './gameObjects.js';
import { monsterList, MakeMonsterList } from './monsterList.js';
import { itemShopWeapon, itemShopArmor, itemShopAccessory } from './dynamicHtml.js';
import { state } from './state.js';
import { updateHtml, manaRegen } from './stats.js';

//Player log
function Log(data) {
    var i;
    if (logData.length < maxLogLines) {
        logData[logData.length] = data;
        logData.length++;
    } else {
        for (i = 0; i < logData.length - 1; i++) {
            logData[i] = logData[i + 1];
        }
        logData[logData.length - 1] = data;
    }
    var logTemp = "";
    for (i = logData.length - 1; i >= 0; i--) {
        logTemp += logData[i];
    }
    document.getElementById('logConsole').innerHTML = logTemp;
};

var currentGameVersion = 1.8;
var defaultValues = {
    properties: {
    }
};

// Equipment slots that contribute attribute/bonus stats, in a fixed order.
// Used by the player.functions.total*Bonus() helpers below.
var equipmentSlots = ['weapon', 'shield', 'chest', 'helmet', 'legs', 'boots', 'ring', 'amulet', 'talisman'];
// Slots that contribute to armor/defense (excludes weapon and accessories).
var armorSlots = ['shield', 'chest', 'helmet', 'legs', 'boots'];
// Sum a single stat key across the given equipped slots. Order-independent for
// integer stats, so the result is identical to the original unrolled sums.
function sumEquippedStat(statKey, slots) {
    var total = 0;
    for (var i = 0; i < slots.length; i++) {
        total += equippedItems[slots[i]][statKey];
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
        monsterBackground: "green",
        prestigeMultiplier: 1,
        prestigeSuffix: "",
        difficulty: 'Hero',
        lastEnemyLevel: 1, // Used for crafting, it will change based on highest enemy level killed.
        monsterLevel: 0, //Used when reset game i.e. prestige ( It will be set for highest monster which will determine first monster level after prestige)
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
        swordSkill: 0,
        axeSkill: 0,
        maceSkill: 0,
        staffSkill: 0,
        rangedSkill: 0,
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
        mana: 10
    },
    functions: {
        maxBattleTurns: function(){
            return Math.floor(10 + (player.functions.totalEndurance() / 100) + (player.functions.totalAgility() / 100) + (player.functions.totalDexterity() / 100))
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
            return sumEquippedStat('Strength', equipmentSlots) + player.functions.totalAllAttributesBonus();
        },
        totalEnduranceBonus: function(){
            return sumEquippedStat('Endurance', equipmentSlots) + player.functions.totalAllAttributesBonus();
        },
        totalAgilityBonus: function(){
            return sumEquippedStat('Agility', equipmentSlots) + player.functions.totalAllAttributesBonus();
        },
        totalDexterityBonus: function(){
            return sumEquippedStat('Dexterity', equipmentSlots) + player.functions.totalAllAttributesBonus();
        },
        totalWisdomBonus: function(){
            return sumEquippedStat('Wisdom', equipmentSlots) + player.functions.totalAllAttributesBonus();
        },
        totalIntelligenceBonus: function(){
            return sumEquippedStat('Intelligence', equipmentSlots) + player.functions.totalAllAttributesBonus();
        },
        totalLuckBonus: function(){
            return sumEquippedStat('Luck', equipmentSlots) + player.functions.totalAllAttributesBonus();
        },
        totalBlockChance: function () {
            return (equippedItems.shield['Block chance']);
        },
        totalBlockAmount: function () {
            return (equippedItems.shield['Block amount']);
        },
        totalLifeGainOnHit: function () {
            return (equippedItems.weapon['Life gain on hit']);
        },
        totalCriticalChance: function () {
            return (equippedItems.weapon['Critical chance']);
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
        bonusDamage: function () {
            var damage = 0;
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
        bonusCriticalChance: function(){
            var criticalChance = 0;
            if (playerPassive.reflex.level > 0) {
                criticalChance += playerPassive.reflex.bonusTotal();
            };
            return criticalChance;
        },
        bonusCriticalDamage: function(){
            var criticalDamage = 0;
            if (playerPassive.masterofArms.level > 0) {
                criticalDamage += playerPassive.masterofArms.bonusTotal();
            };
            if (playerPassive.fierceImpact.level > 0) {
                criticalDamage += playerPassive.fierceImpact.bonusTotal();
            };
            return criticalDamage;
        },
        bonusStrength: function () {
            var strength = 0;
            if (playerPassive.physicalExercise.level > 0) {
                strength += playerPassive.physicalExercise.bonusTotal();
            };
            return strength;
        },
        bonusEndurance: function () {
            var endurance = 0;
            if (playerPassive.constitution.level > 0) {
                endurance += playerPassive.constitution.bonusTotal();
            };
            return endurance;
        },
        bonusAgility: function(){
            var agility = 0;
            if (playerPassive.sixthSense.level > 0) {
                agility += playerPassive.sixthSense.bonusTotal();
            };
            return agility;
        },
        bonusSpellPower: function(){
            var spellPower = 0;
            if (playerPassive.elementalMastery.level > 0) {
                spellPower += playerPassive.elementalMastery.bonusTotal();
            };
            if (playerPassive.magicTraining.level > 0) {
                spellPower += playerPassive.magicTraining.bonusTotal();
            };
            if (playerPassive.mentalMastery.level > 0) {
                spellPower += playerPassive.mentalMastery.bonusTotal();
            };
            if (playerPassive.spiritualAttunement.level > 0) {
                spellPower += playerPassive.spiritualAttunement.bonusTotal();
            };
            spellPower = weaponSkillList.staff.spellSimulacrum.damage() + ((spellPower + player.properties.raceSpellPower) / 100);
            return spellPower.toFixed(2);
        },
        bonusMana: function(){
            var mana = 0;
            if (playerPassive.manaEnchant.level > 0){
                mana += playerPassive.manaEnchant.bonusTotal();
            };
            return mana;
        },
        bonusManaRegen: function () {
            var manaRegen = 0;
            if (playerPassive.quickMeditation.level > 0) {
                manaRegen += playerPassive.quickMeditation.bonusTotal();
            };
            return manaRegen;
        },
        bonusDefense: function(){
            var defense = 0;
            if (playerPassive.armorProficiency.level > 0) {
                defense += playerPassive.armorProficiency.bonusTotal();
            };
            if (playerPassive.ironSkin.level > 0) {
                defense += playerPassive.ironSkin.bonusTotal();
            };
            return defense;
        },
        bonusHealthRegen: function(){
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
        bonusEvasion: function(){
            var evasion = 0;
            if (playerPassive.evasion.level > 0){
                evasion += playerPassive.evasion.bonusTotal();
            };
            return evasion;
        },
        dropRate: function () {
            return (1 + (((player.functions.totalLuck() / 5) + player.functions.totalMagicFind() + player.properties.raceDropRate + player.buffs.ItemDrop.amount) / 100));
        },
        expRate: function () {
            return (1 + ((player.functions.totalExperienceRate() + player.properties.raceExpRate + player.buffs.ExpGain.amount) / 100));
        },
        goldRate: function () {
            return (1 + ((player.functions.totalGoldDrop() + player.properties.raceGoldDrop + player.buffs.GoldDrop.amount) / 100));
        },
        inventory: function () {
            return Math.floor(30 + (player.functions.totalStrength() / 10) + player.properties.backpackUpgrade); //Add backpacks "new item type"
        },
        masteryStrength: function () {
            return (weaponMastery.axe.axeStrength() *
                weaponMastery.ranged.rangedStrength() *
                weaponMastery.sword.swordStrength() + (player.functions.bonusStrength() / 100))
        },
        totalStrength: function () {
            return Math.floor(
                (player.properties.baseStrength +
                player.functions.totalStrengthBonus()) *
                (player.functions.masteryStrength() + (player.properties.raceAllStats / 100) + ((player.buffs.Strength.amount + player.buffs.AllStats.amount))));
        },
        masteryEndurance: function () {
            return (weaponMastery.mace.maceEndurance() *
            weaponMastery.axe.axeEndurance() + (player.functions.bonusEndurance() / 100));
        },
        totalEndurance: function () {
            return Math.floor((
                player.properties.baseEndurance +
                player.functions.totalEnduranceBonus()) *
                (player.functions.masteryEndurance() + (player.properties.raceAllStats / 100) + ((player.buffs.Endurance.amount + player.buffs.AllStats.amount))));
        },
        masteryAgility: function () {
            return (weaponMastery.sword.swordAgility() + (player.functions.bonusAgility() / 100));
        },
        totalAgility: function () {
            return Math.floor((
                player.properties.baseAgility +
                player.functions.totalAgilityBonus()) *
                (player.functions.masteryAgility() + (player.properties.raceAllStats / 100) + ((player.buffs.Agility.amount + player.buffs.AllStats.amount))));
        },
        masteryDexterity: function () {
            return (weaponMastery.ranged.rangedDexterity());
        },
        totalDexterity: function () {
            return Math.floor((
                player.properties.baseDexterity +
                player.functions.totalDexterityBonus()) *
                (player.functions.masteryDexterity() + (player.properties.raceAllStats / 100) + ((player.buffs.Dexterity.amount + player.buffs.AllStats.amount))));
        },
        masteryIntelligence: function () {
            return (weaponMastery.staff.staffIntelligence());
        },
        totalIntelligence: function () {
            return Math.floor(((
                (player.properties.baseIntelligence +
                player.functions.totalIntelligenceBonus()) *
                (player.functions.masteryIntelligence() + (player.properties.raceAllStats / 100) + ((player.buffs.Intelligence.amount + player.buffs.AllStats.amount))))));
        },
        masteryWisdom: function () {
            return (weaponMastery.staff.staffWisdom() *
                weaponMastery.mace.maceWisdom());
        },
        totalWisdom: function () {
            return Math.floor(((
                player.properties.baseWisdom +
                player.functions.totalWisdomBonus()) *
                (player.functions.masteryWisdom() + (player.properties.raceAllStats / 100) + ((player.buffs.Wisdom.amount + player.buffs.AllStats.amount)))));
        },
        totalLuck: function () {
            return Math.floor((
                player.properties.baseLuck +
                player.functions.totalLuckBonus()) * (1 + (player.properties.raceAllStats / 100) + ((player.buffs.Luck.amount + player.buffs.AllStats.amount))));
        },
        maxhealth: function () {
            return Math.floor((((475 + player.functions.totalLifeBonus() + (player.functions.totalEndurance() * 5)) * (1 + (player.functions.bonusHealth() / 100)))) * (1 + (player.properties.raceHealth / 100)));
        },
        hpregen: function () {
            return Math.floor((2 + (player.functions.totalEndurance() / 10)) * (1 + (player.functions.bonusHealthRegen() / 100)));
        },
        //Mana
        maxMana: function () {
            return Math.floor(((7 +
                player.functions.totalManaBonus() +
                player.functions.totalWisdom() * 5 +
                player.functions.totalIntelligence() * 0.1) * (1 + (player.functions.bonusMana() / 100))) * (1 + (player.properties.raceMaxMana / 100)));
        },
        manaRegen: function () {
            return (((((player.functions.totalWisdom() / 10))) * (1 + (player.properties.raceManaRegen + player.functions.bonusManaRegen()) / 100)));
        },
        //Damage
        minDamage: function () {
            return Math.floor((((
                7 + (player.functions.totalStrength() * 0.6) +
                equippedItems.weapon.MinDamage + weaponSkillList.sword.swordFinesse.damage()) * (1 + (player.functions.bonusDamage() / 100)))) * (1 + (player.properties.raceDamage / 100)));
        },
        maxDamage: function () {
            return Math.floor((((
                10 + (player.functions.totalStrength() * 0.6) +
                equippedItems.weapon.MinDamage + weaponSkillList.sword.swordFinesse.damage()) * (1 + (player.functions.bonusDamage() / 100)))) * (1 + (player.properties.raceDamage / 100)));
        },
        //Secondary
        accuracy: function () {
            if (player.properties.raceAccuracy === 100) {
                return 200;
            }
            else {
                return Math.floor((90 + player.properties.raceAccuracy + playerPassive.preciseAttack.bonusTotal()) + (player.functions.totalAgility() * 0.02));
            }
        },
        defense: function () {
            return ((
                (player.functions.totalAgility() * 0.1) +
                player.functions.totalArmorBonus()) * (1 + ((player.properties.raceDefense + player.functions.bonusDefense()) / 100)));
        },
        evasion: function () {
            if (player.properties.raceEvasion === "Can't evade") {
                return 0;
            }
            else {
                if (((5 + player.functions.bonusEvasion() + (player.properties.raceEvasion) + (player.functions.totalAgility() * 0.03 + player.functions.totalLuck() * 0.01))) >= 75) {
                    return 75;
                }
                else {
                    return ((5 + player.functions.bonusEvasion() + (player.properties.raceEvasion) + (player.functions.totalAgility() * 0.03 + player.functions.totalLuck() * 0.01)));
                }
            };
        },
        criticalChance: function () {
            if (((10 + player.functions.totalCriticalChance() + (player.properties.raceCriticalChance + player.functions.bonusCriticalChance()) + (player.functions.totalDexterity() * 0.03 + player.functions.totalLuck() * 0.01))) > 75) {
                return 75 + weaponSkillList.ranged.archerFocus.damage();
            }
            else {
                return ((10 + weaponSkillList.ranged.archerFocus.damage() + player.functions.totalCriticalChance() + (player.properties.raceCriticalChance + player.functions.bonusCriticalChance()) + (player.functions.totalDexterity() * 0.03 + player.functions.totalLuck() * 0.01)));
            }
        },
        criticalDamage: function () {
            return ((1.1 + (player.functions.totalDexterity()) * 0.005) + ((weaponSkillList.axe.butchersInsight.damage() + player.functions.bonusCriticalDamage()) / 100));
        },
        blockChance: function () {
            if (Math.floor(weaponSkillList.sword.parryAndRiposte.blockChance() + player.functions.totalBlockChance()) >= 40) {
                return 40;
            }
            else {
                return Math.floor(weaponSkillList.sword.parryAndRiposte.blockChance() + player.functions.totalBlockChance());
            }
        },
        blockAmount: function () {
            return Math.floor(weaponSkillList.sword.parryAndRiposte.blockAmount() + player.functions.totalBlockAmount());
        },
        counterChance: function () {
            return Math.floor(weaponSkillList.sword.parryAndRiposte.counterChance());
        },
        counterDamage: function () {
            return Math.floor(weaponSkillList.sword.parryAndRiposte.counterDamage());
        },
        lifeSteal: function () {
            return Math.floor(weaponSkillList.sword.savageStrike.lifeStealAmount() + player.functions.totalLifeGainOnHit());
        },
        baseSpellPower: function(){
            return Math.floor((player.functions.totalIntelligence() * 2) + (player.functions.totalWisdom() * 0.5))
        },
        spellPower: function () {
            return Math.floor(player.functions.baseSpellPower() * player.functions.bonusSpellPower());
        },
        ignoreDefense: function () {
            var ignore = 1;
            if (playerPassive.piercingAttack.level > 0) {
                ignore -= (playerPassive.piercingAttack.bonusTotal() / 100);
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
    }
};

//Equipped items object, storing 0 values, so all player stats will work at the beginning of the game
var equippedItems = {};
function createEquippedItemsObject(typeOfTheItem) {
    for (var key in loadingEquippedItems) {
        if (loadingEquippedItems.hasOwnProperty(key)) {
            var itemKey = loadingEquippedItems[key];
            if (itemKey.hasOwnProperty("type")) {
                if (typeOfTheItem === itemKey.type || typeOfTheItem === "all") {
                    var itemType = itemKey.type;
                    if (equippedItems[itemType] === undefined || equippedItems[itemType].isEquipped === false) {
                        equippedItems[itemType] = {};
                        equippedItems[itemType]["All attributes"] = 0;
                        equippedItems[itemType]["Strength"] = 0;
                        equippedItems[itemType]["Endurance"] = 0;
                        equippedItems[itemType]["Agility"] = 0;
                        equippedItems[itemType]["Dexterity"] = 0;
                        equippedItems[itemType]["Wisdom"] = 0;
                        equippedItems[itemType]["Intelligence"] = 0;
                        equippedItems[itemType]["Luck"] = 0;
                        equippedItems[itemType]["Bonus life"] = 0;
                        equippedItems[itemType]["Bonus mana"] = 0;
                        equippedItems[itemType]["Magic find"] = 0;
                        equippedItems[itemType]["Gold drop"] = 0;
                        equippedItems[itemType]["Experience rate"] = 0;
                        equippedItems[itemType]["isEquipped"] = false;
                        if (itemType === "shield") {
                            equippedItems[itemType]["Block chance"] = 0;
                            equippedItems[itemType]["Block amount"] = 0;
                            equippedItems[itemType]["Bonus armor"] = 0;
                            equippedItems[itemType]["defense"] = 0;
                        } else if (itemType === "chest" || itemType === "helmet" || itemType === "legs" || itemType === "boots") {
                            equippedItems[itemType]["Bonus armor"] = 0;
                            equippedItems[itemType]["defense"] = 0;
                        } else if (itemType === "weapon") {
                            equippedItems[itemType]["Life gain on hit"] = 0;
                            equippedItems[itemType]["Critical chance"] = 0;
                            equippedItems[itemType]["Bonus damage"] = 0;
                            equippedItems[itemType]["MinDamage"] = 0;
                            equippedItems[itemType]["MaxDamage"] = 0;
                        };
                    };
                };
            };
        };
    };
};

// createEquippedItemsObject('all') init call moved to initGame() in src/main.js (Phase 3 ESM)

var maxLogLines = 12;
// Genuinely shared mutable state (reassigned and/or read across files: battle.js,
// save.js, itemDrop/itemSell, dynamicHtml). As an ES module a `var` would be
// module-scoped. logData (the console ring-buffer) and playerInventory are
// mutated in place and exported; their few "reset" sites assign .length = 0
// instead of a new object/array, so they never need reassignment across modules.
var logData = {
    length: 0
};
var playerInventory = [];
// Reassigned primitives (battleTurn, damageTaken, the checkBox* flags,
// checkedShopItem, hardcoreMode) now live on the shared `state` object in
// src/state.js, imported above.

// These scratch/multiplier vars are only used within core.js (the apparent
// cross-file hits are unrelated .method names / .number data props / locals), so
// they are plain module-local vars now — no window, no sharing.
var damageDealt = 0;
var magicDamage = 0;
var blockRate = 0;
var counterDamage = 0;
var lifeStealAmount = 0;
var magicDamageDealt = 0;
var criticalRate = 0;
var enemyBlock = 0;
var accuracyRate = 0;
var monsterDamage = 0;
var number = 1;
function disableButtons() {
    if (number === 1) {
        $('a#monsterButton').css('cursor', 'not-allowed');
        $("img.monster").toggleClass("buttonDisable");
        $("button.monsterButtonDisable").toggleClass("buttonDisable").toggleClass("backgroundRed");
        $("li.monsterNavBar").toggleClass("buttonDisable");
        $("li.monsterNavBar > a").toggleClass("backgroundRed");
        number = 2;
    }
    else {
        $('a#monsterButton').css('cursor', 'pointer');
        $("img.monster").toggleClass("buttonDisable");
        $("button.monsterButtonDisable").toggleClass("buttonDisable").toggleClass("backgroundRed");
        $("li.monsterNavBar").toggleClass("buttonDisable");
        $("li.monsterNavBar > a").toggleClass("backgroundRed");
        number = 1;
    }
};

function potionBuyLog() {
    $("#potionBuy").delay(200).fadeIn().delay(3000).fadeOut(5000, function () { $(this).remove(); });
}
function notEnoughMoneyLog() {
    $("#notEnoughMoney").delay(200).fadeIn().delay(3000).fadeOut(5000, function () { $(this).remove(); });
}
function inventoryBuyLog() {
    $("#inventoryBuy").delay(200).fadeIn().delay(3000).fadeOut(5000, function () { $(this).remove(); });
}
function statBuyLog() {
    $("#statBuy").delay(200).fadeIn().delay(3000).fadeOut(5000, function () { $(this).remove(); });
}
function itemDropLog() {
    $("#itemDropNew").delay(200).fadeIn().delay(3000).fadeOut(5000, function () { $(this).remove(); });
};

function levelUpLog() {
    $("#levelUpLog").delay(1800).fadeIn().delay(3000).fadeOut(5000, function () { $(this).remove(); });
};
function mainLog() {
    if (player.properties.isDead === false) {
        $(document).ready(function () {
            $("#test1").delay(1600).fadeIn().delay(3000).fadeOut(5000, function () { $(this).remove(); });
            $("#test2").delay(1400).fadeIn().delay(3000).fadeOut(5200, function () { $(this).remove(); });
            $("#test3").delay(1200).fadeIn().delay(3000).fadeOut(5400, function () { $(this).remove(); });
            $("#test4").delay(1000).fadeIn().delay(3000).fadeOut(5600, function () { $(this).remove(); });
            $("#test5").delay(800).fadeIn().delay(3000).fadeOut(5800, function () { $(this).remove(); });
        })
       
    };
    logData.length = 0;
};
function deathLog() {
    $(document).ready(function () {
        $("#playerDead").delay(200)
           .fadeIn().delay(3000).fadeOut(2000, function () { $(this).remove(); });
        $("#playerDead2").delay(100)
        .fadeIn().delay(3000).fadeOut(2000, function () { $(this).remove(); });
        $("#goldLost").delay(400)
        .fadeIn().delay(3000).fadeOut(2000, function () { $(this).remove(); });
        $("#expLost").delay(400)
        .fadeIn().delay(3000).fadeOut(2000, function () { $(this).remove(); });
    })

};
function drawLog() {
    $("#draw").delay(100).fadeIn().delay(3000).fadeOut(2000, function () { $(this).remove(); });
};
function isDeadLog() {
    $("#isDead").delay(100).fadeIn().delay(3000).fadeOut(2000, function () { $(this).remove(); });
};
function masteryLog() {

};
function dropLog() {
    $(document).ready(function () {
        $("#goldDrop").delay(200)
                .fadeIn().delay(3000).fadeOut(2000, function () { $(this).remove(); });
        $("#expGain").delay(200)
                .fadeIn().delay(3000).fadeOut(2000, function () { $(this).remove(); });
    })
};

//Equip item function
// Armor/accessory sub-types whose equip path is identical apart from the slot
// name. (weapon is keyed off itemType and also toggles a weapon-type flag;
// backpack is a separate legacy path.)
var equipSlotSubTypes = ['shield', 'chest', 'helmet', 'legs', 'boots', 'ring', 'amulet', 'talisman'];

// Maps a weapon sub-type to the player.properties flag the game uses to track
// which weapon class is equipped (for mastery/skills).
var weaponTypeFlags = {
    sword: 'isSword',
    axe: 'isAxe',
    mace: 'isMace',
    staff: 'isStaff',
    ranged: 'isRanged'
};
function setWeaponTypeFlag(subType, value) {
    var flag = weaponTypeFlags[subType];
    if (flag !== undefined) {
        player.properties[flag] = value;
    }
}

// The DOM container an unequipped item returns to, per slot.
var slotInventorySpace = {
    weapon: 'inventorySpaceweapon',
    shield: 'inventorySpacearmor',
    chest: 'inventorySpacearmor',
    helmet: 'inventorySpacearmor',
    legs: 'inventorySpacearmor',
    boots: 'inventorySpacearmor',
    ring: 'inventorySpaceaccessory',
    amulet: 'inventorySpaceaccessory',
    talisman: 'inventorySpaceaccessory'
};

// Slots checked (in order) when unequipping by item id.
var unequipSlots = ['weapon', 'shield', 'chest', 'helmet', 'legs', 'boots', 'ring', 'amulet', 'talisman'];

// Shared equip logic for a given slot: swap out anything already there, move the
// item from the inventory into the slot, and update the UI. (item.id === id is
// always true here since item was looked up by id, so that guard is dropped.)
function equipSlot(slot, item, id) {
    if (equippedItems[slot].isEquipped === true) {
        unequipItem(equippedItems[slot].id, 'duo'); // duo = swapping while another item is equipped
    }
    equippedItems[slot] = item;
    equippedItems[slot].isEquipped = true;
    if (slot === 'weapon') {
        // Set the weapon-type flag here (after the old weapon's unequip cleared
        // it) so swapping two weapons of the same sub-type ends up enabled.
        setWeaponTypeFlag(item.subType, true);
    }
    var index = playerInventory.indexOf(item, 0);
    if (index > -1) {
        playerInventory.splice(index, 1);
    }
    player.functions[slot] = $("#testingItem" + id);
    $("#testingItem" + id).remove();
    updateHtml();
}

function equipItem(id) {
    var item = playerInventory.filter(function (obj) {
        return obj.id === id;
    })[0];
    if (item !== undefined) {
        if (item.itemType === "weapon") {
            equipSlot('weapon', item, id);
        }
        else if (equipSlotSubTypes.indexOf(item.subType) > -1) {
            equipSlot(item.subType, item, id);
        }
        else if (item.itemType === "BackPack") {
            if (equippedItems.backpack.isEquipped === true) {
                var typeItem = 'duo'; // It means that we equip item while another item is already equipped
                unequipItem(typeItem);
            };
            if (item.id === id) {
                equippedItems.backpack = item;
                equippedItems.backpack.isEquipped = true;
                var item = playerInventory.filter(function (obj) {
                    return obj.id === id;
                })[0];
                var index = playerInventory.indexOf(item, 0);
                if (index > -1) {
                    playerInventory.splice(index, 1);
                };
            };
            player.functions.backpack = $("#testingItem" + id);
            $("#testingItem" + id).remove();
            updateHtml();
        };
    };
    CreateWeaponSkillHtml();
    updateHtml();
    CreatePlayerSkillsHtml();
    CreatePlayerHotBar();
    updateBar();
    checkIfEquippedEmpty();
    CreateInventoryWeaponHtml();
};

//Unequip item function
function unequipItem(id, type) {
    for (var i = 0; i < unequipSlots.length; i++) {
        var slot = unequipSlots[i];
        if (id === equippedItems[slot].id) {
            equippedItems[slot].isEquipped = false;
            playerInventory.push(equippedItems[slot]);
            if (slot === "weapon") {
                setWeaponTypeFlag(equippedItems.weapon.subType, false);
            }
            $("#" + slotInventorySpace[slot]).append(player.functions[slot]);
            $("#equippedItem" + id).remove();
            if (type === "solo") {
                createEquippedItemsObject(slot);
            }
            updateHtml();
            break;
        }
    }
    CreateWeaponSkillHtml();
    updateHtml();
    CreatePlayerSkillsHtml();
    CreatePlayerHotBar();
    checkIfEquippedEmpty();
    if (type === "solo") {
        CreateInventoryWeaponHtml();
    };
};





// checkBox* drop/sell-filter flags and hardcoreMode are shared mutable primitives
// on the `state` object (src/state.js).
function handleClick() {
    state.checkBoxCommon = document.getElementById("common").checked;
    state.checkBoxUncommon = document.getElementById("uncommon").checked;
    state.checkBoxRare = document.getElementById("rare").checked;
    state.checkBoxEpic = document.getElementById("epic").checked;
    state.checkBoxLegendary = document.getElementById("legendary").checked;
};
function hardcoreModeCheck() {
    state.hardcoreMode = document.getElementById("hardcoreMode").checked;
};

function changeRace(raceName, race) {
    var characterRace = '';
    var itemType = characterRaces[race].startingItem;
    characterRace = raceName;
    player.properties.heroRace = characterRace;
    removeStartingScreen();
    checkHeroRace();
    getStartingItem(itemType);
};
//Set audio starting volume...
function myAudio(sound) {
    var myAudio = document.getElementById('myAudio');
    myAudio.volume = 0.1;
    if (player.properties.sound === "on" || sound === "off") {
        myAudio.play();
        player.properties.sound = "on";
    }
    if (player.properties.sound === "off") {
        myAudio.pause();
        player.properties.sound = "off";
    };

};

function muteAudio() {
    var audio = document.getElementById("myAudio");
    if (audio.muted === true) {
        audio.muted = false;
    }
    else if (audio.muted === false) {
        audio.muted = true;
    };
};
function selectText(containerid) {
    if (document.selection) {
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById(containerid));
        range.select();
    } else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(document.getElementById(containerid));
        window.getSelection().addRange(range);
    };
};

//Will show a number on a tab like inventory, displaying amount of NEW items, player have not seen yet.
function showNumber() {
    var number = playerInventory.length;
    document.getElementById('playerInventory').innerHTML = "<p>" + number + "</p>";
};

function sortInventory(type) {
    if (type === "Value") {
        playerInventory.sort(function(a, b) {
            return b.Value - a.Value
        });
    }
    else if (type === "Rarity") {
        playerInventory.sort(function(a, b) {
            return b.rarityValue - a.rarityValue
        });
    }
    else if (type === "Damage") {
        playerInventory.sort(function(a, b) {
            return b.AverageDamage - a.AverageDamage;
        });
    }
    else if (type === "iLvl") {
        playerInventory.sort(function(a, b) {
            return b.iLvl - a.iLvl;
        });
    };
    CreateInventoryWeaponHtml();
};

function resetPassiveSkills() {
        for (var key in playerPassive) {
            if (playerPassive.hasOwnProperty(key)) {
                playerPassive[key].level = 0;
            }
        };
        player.properties.skillPoints = player.properties.level - 1;
        CreatePlayerSkillsHtml();
        primaryStatUpdate();
        secondaryStatUpdate();
};
$(document).on('change', 'input[name="shopItem"]', function () {
    var checkedShopItemInteger = $(this).val();
    state.checkedShopItem = parseInt(checkedShopItemInteger, 10);
    ShopBuyButtons();
});

function sortShop(type, itemType) {
    var itemSort = [];
    if (itemType === "Weapon") {
        itemSort = itemShopWeapon;
    }
    else if (itemType === "Armor") {
        itemSort = itemShopArmor;
    }
    else if (itemType === "Accessory") {
        itemSort = itemShopAccessory;
    };
    if (type === "Value") {
        itemSort.sort(function(a, b) {
            return b.shopPrice - a.shopPrice;
        });
    }
    else if (type === "Rarity") {
        itemSort.sort(function(a, b) {
            return b.rarityValue - a.rarityValue;
        });
    };
    displayShopItems(itemShopWeapon);
    displayShopItems(itemShopArmor);
    displayShopItems(itemShopAccessory);
};


function copyPlayerProperties() {
    var playerDefault = defaultValues.properties;
    var playerProperties = player.properties;
    for (var key in playerProperties) {
        if (playerProperties.hasOwnProperty(key)) {
            playerDefault[key] = playerProperties[key];
        };
    };
};
// copyPlayerProperties() init call moved to initGame() in src/main.js (Phase 3 ESM)

function changeGameStyling(style) {
    if (style === "basic") {
        $("div.c4").css("background-color", "#EDD26E");
        $(".background").css("background-color", "#EEDFA6");
        $(".darkBackground").css("background-color", "#baa65a");
        $(".border").css("border", "1px solid black");
        $(".borderBottom").css("border-bottom", "1px solid black");
        $(".borderTop").css("border-top", "1px solid black");
    }
    else if (style === 2) {
        $("div.c4").css("background-color", "red");
        $(".background").css("background-color", "green");
        $(".darkBackground").css("background-color", "blue");
        $(".border").css("border", "1px solid purple");
        $(".borderBottom").css("border-bottom", "1px solid purple");
        $(".borderTop").css("border-top", "1px solid purple");
    }
    else if (style === 3) {

    }
};

function getNumberMultiplierofFive(n) {
    if (n > 100) {
        return 100;
    }
    else if (n > 4)
        return Math.ceil(n / 5.0) * 5;
    else if (n < 0)
        return Math.floor(n / 5.0) * 5;
    else
        return 1;
};

function getTen(n) {
    if (n > 8)
        return Math.ceil(n / 8.0) * 10;
    else if (n < 0)
        return Math.floor(n / 8.0) * 10;
    else
        return 10;
};
function getThousands(n) {
    if (n > 9999 && n < 1000000) {
        return (Math.floor(n / 1000) + "K");
    }
    else if (n > 999999) {
        return (Math.floor(n / 1000000) + "M");
    }
    else {
        return Math.floor(n);
    };
};
var monsterKillCount = []; // core.js-only
function changeDifficulty(type, rebirth) {
    for (var key in monsterList) {
        var monster = monsterList[key];
        monsterKillCount.push(monster.killCount);
    }
    player.properties.difficulty = type;
    MakeMonsterList();
    if (rebirth === undefined) {
        for (var key in monsterList) {
            var monster = monsterList[key];
            var monsterNumber = (monster.id - 1)
            monster.killCount = monsterKillCount[monsterNumber];
        };
    };
    monsterKillCount = [];
    CreateMonsterHtml();
    quest();
    document.getElementById('gameDifficulty').innerHTML = "Current Difficulty: " + type;
};

function rebirth(level) {
    player.properties.prestigeMultiplier += 1.2;
    player.properties.prestigeSuffix = "(Warped)";
    player.properties.monsterLevel = level;
    player.properties.monsterBackground = "#DD4747";
    for (var i = 1; i < monsterAreas.length; i++) { //Starts with i = 1, so it wont change first array value, which is needed to display first area.
        monsterAreas[i].isUnlocked = false;
    };
    changeDifficulty("Hero", true);
    changedTabmonster(0);
};

function compare(z, x, other) { //Other such as %...
    if (z > x) {
        return '<font color="#50bd27">+ ' + Math.floor(z - x) + other + '</font>';
    }
    else if (z < x) {
        return '<font color="red">' + Math.floor(z - x) + other + '</font>';
    }
    else {
        return Math.floor(z) + other;
    };
};

function getStartingItem(itemType) {
    getItemType(1, false, "weapon", itemType, "Common");
    var itemID = player.properties.itemIdNumber - 1;// -1 because "getItemType function finish before it changes ID of the item, so equip function is called, before item drop finishes I guess...not sure -_-
    equipItem(itemID);
};

// Re-expose this file's top-level functions and stable data objects on window.
// As a classic <script> they were auto-globals; still-classic files
// (dynamicHtml/professions), converted modules, inline onclick handlers, and
// initGame() resolve them by bare name. The reassigned mutable state above is
// already on window directly (so reassignments from other modules stay in sync);
// the objects below are only ever mutated in place, so sharing the reference via
// the bridge is safe. (Phase 3 ESM transition bridge.)
Object.assign(window, {
    // functions
    Log, sumEquippedStat, createEquippedItemsObject, disableButtons,
    potionBuyLog, notEnoughMoneyLog, inventoryBuyLog, statBuyLog, itemDropLog,
    levelUpLog, mainLog, deathLog, drawLog, isDeadLog, masteryLog, dropLog,
    setWeaponTypeFlag, equipSlot, equipItem, unequipItem, handleClick,
    hardcoreModeCheck, changeRace, myAudio, muteAudio, selectText, showNumber,
    sortInventory, resetPassiveSkills, sortShop, copyPlayerProperties,
    changeGameStyling, getNumberMultiplierofFive, getTen, getThousands,
    changeDifficulty, rebirth, compare, getStartingItem,
    // stable data objects / constants (mutated in place or read-only)
    currentGameVersion, equipmentSlots, armorSlots,
    maxLogLines, equipSlotSubTypes, weaponTypeFlags,
    slotInventorySpace, unequipSlots,
});

// Phase 3 ESM: player / equippedItems / defaultValues are core game state, never
// reassigned (mutated in place), so they are real exports now. Consumers import
// them instead of reading window globals. Circular imports with the provider
// modules (weaponMastery/skills/gameObjects) are safe: every cross-module use is
// inside a function/method body (runtime), never at module-eval.
export { player, equippedItems, defaultValues, playerInventory, logData };