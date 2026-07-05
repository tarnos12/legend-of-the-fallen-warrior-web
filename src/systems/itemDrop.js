'use strict';
import {
    itemTypes,
    itemWeaponSubType,
    itemArmorSubType,
    itemAccessorySubType,
    itemPower,
    itemRarity,
} from '../data/gameObjects.js';
import { AFFIX_POOLS, RARITY_AFFIX_BUDGET, rollAffixValue } from '../data/affixes.js';
import { BOSS_UNIQUES, BOSS_UNIQUE_CHANCE, signatureValue } from '../data/bossUniques.js';
import { player, playerInventory } from '../core/core.js';
import { Log, itemDropLog } from '../core/log.js';
import { getNumberMultiplierofFive } from '../core/format.js';
import { CreateInventoryWeaponHtml } from '../ui/inventoryUI.js';
import { itemShopAccessory, itemShopArmor, itemShopWeapon } from '../ui/shopUI.js';
import { state } from '../core/state.js';
import { updateHtml } from './stats.js';
// quiet=true (offline progress) skips the notification and the full inventory
// re-render per kill; the offline loop renders the inventory once at the end.
// shiny=true (sparkling spawns) doubles the drop roll.
export function monsterItemDrop(monster, quiet, shiny) {
    var itemDropNumber = 0;
    var randomItemChance = Math.floor(Math.random() * (1000 - 1) + 1);
    if (randomItemChance * player.functions.dropRate() * (shiny ? 2 : 1) >= 500) {
        // < not <= : pushing at length===cap overfilled the inventory by one
        if (playerInventory.length < player.functions.inventory()) {
            getItemType(monster, true); // Call getItemType(monster); several times, for multiple item drop per monster kill/ random amount of items per kill...
            itemDropNumber += 1;
            if (!quiet) {
                Log(
                    '<span id=\"itemDropNew\" class =\"bold\" style=\"color:orange; display:none;\">You found ' +
                        itemDropNumber +
                        ' items! <br />' +
                        '</span>'
                );
                itemDropLog();
            }
        } else if (!quiet) {
            Log(
                '<span id=\"inventoryFull\" style=\"color:red;\">' +
                    'Your inventory is full.<br />' +
                    '</span>'
            );
        }
    }
    if (!quiet) CreateInventoryWeaponHtml();
}

// Boss unique roll: only area bosses (keyed by name in data/bossUniques.js)
// can drop their signature named item, at BOSS_UNIQUE_CHANCE (doubled for
// shiny bosses). The unique is a forced-Legendary base of the item's slot with
// its normal random affixes PLUS a guaranteed signature affix, a fixed name and
// gold color. Called from battle.js grantKillRewards with the full monster.
export function rollBossUnique(monster, quiet, shiny) {
    var defs = BOSS_UNIQUES[monster.name];
    if (!defs || defs.length === 0) return null;
    if (Math.random() >= BOSS_UNIQUE_CHANCE * (shiny ? 2 : 1)) return null;
    var def = defs[Math.floor(Math.random() * defs.length)];
    var before = playerInventory.length;
    // crafted 'Legendary' base: pushed unconditionally (uniques bypass the sell
    // filters and are always kept) and rolls its own random affixes first
    getItemType(monster.level, false, def.itemType, def.subType, 'Legendary');
    if (playerInventory.length === before) return null;
    var item = playerInventory[playerInventory.length - 1];
    item.name = def.name;
    item.color = '#ff9d1a';
    item.isUnique = true;
    item.lore = def.lore;
    // guarantee the signature affix at (at least) its fixed magnitude
    var sig = signatureValue(def.signature, monster.level);
    item[def.signature.key] = Math.max(item[def.signature.key] || 0, sig);
    item.Value = Math.floor(item.Value * 1.5) + 500;
    if (!quiet) {
        Log(
            '<span class="bold" style="color:#ff9d1a;">✦ ' +
                monster.displayName +
                ' dropped a unique: ' +
                def.name +
                '!<br /></span>'
        );
        CreateInventoryWeaponHtml();
    }
    return item;
}

export function getItemType(monster, isDrop, craftItemType, craftitemSubType, craftItemQuality) {
    //isDrop will check if generated item is monster drop or item sold in shop/crafted
    var monsterStats = monster;
    var dropItem = {};
    var totalChance = 0;
    var randomNumber = 0;
    var itemLevel = monsterStats;
    var itemChanceTotal = itemTypes[itemTypes.length - 1]; // Gets the value "chance" of last index in my object array. I wont need to edit functions in the future if I add more stuff.
    if (craftItemType !== undefined) {
        dropItem['isCrafted'] = true;
    }
    totalChance = itemChanceTotal.chance;
    randomNumber = Math.floor(Math.random() * (totalChance - 1) + 1);
    dropItem['iLvl'] = itemLevel;
    dropItem['id'] = player.properties.itemIdNumber;
    if (craftItemType === undefined) {
        for (var itemType in itemTypes) {
            if (itemTypes.hasOwnProperty(itemType)) {
                var itemChance = itemTypes[itemType].chance; // Get item type: weapon/armor/accessory/ other in the future...
                var dropItemType = itemTypes[itemType].type;
                if (randomNumber <= itemChance) {
                    dropItem['itemType'] = dropItemType;
                    break;
                }
            }
        }
    } else {
        dropItem['itemType'] = craftItemType;
    }
    getItemSubType(monster, dropItem, isDrop, craftitemSubType, craftItemQuality);
}

function getItemSubType(monster, dropItem, isDrop, craftitemSubType, craftItemQuality) {
    var totalChance = 0;
    var randomNumber = 0;
    var itemChanceTotal = '';
    var itemType = '';
    var itemChance = 0;
    var itemType2 = '';
    var randomLoreArray = '';
    var randomLore = '';
    if (dropItem.itemType === 'weapon') {
        if (dropItem.isCrafted === true) {
            for (var i = 0; i < itemWeaponSubType.length; i++) {
                if (itemWeaponSubType[i].type === craftitemSubType) {
                    dropItem['subType'] = itemWeaponSubType[i].type;
                    randomLoreArray = itemWeaponSubType[i].lore;
                    randomLore =
                        randomLoreArray[Math.floor(Math.random() * randomLoreArray.length)];
                    dropItem['lore'] = randomLore.text;
                    break;
                }
            }
        } else {
            itemChanceTotal = itemWeaponSubType[itemWeaponSubType.length - 1];
            totalChance = itemChanceTotal.chance;
            randomNumber = Math.floor(Math.random() * (totalChance - 1) + 1);
            for (itemType in itemWeaponSubType) {
                if (itemWeaponSubType.hasOwnProperty(itemType)) {
                    itemChance = itemWeaponSubType[itemType].chance;
                    itemType2 = itemWeaponSubType[itemType].type;
                    if (randomNumber <= itemChance) {
                        randomLoreArray = itemWeaponSubType[itemType].lore;
                        randomLore =
                            randomLoreArray[Math.floor(Math.random() * randomLoreArray.length)];
                        dropItem['lore'] = randomLore.text;
                        dropItem['subType'] = itemType2;
                        break;
                    }
                }
            }
        }
    } else if (dropItem.itemType === 'armor') {
        if (dropItem.isCrafted === true) {
            for (var i = 0; i < itemArmorSubType.length; i++) {
                if (itemArmorSubType[i].type === craftitemSubType) {
                    dropItem['subType'] = itemArmorSubType[i].type;
                    randomLoreArray = itemArmorSubType[i].lore;
                    randomLore =
                        randomLoreArray[Math.floor(Math.random() * randomLoreArray.length)];
                    dropItem['lore'] = randomLore.text;
                    break;
                }
            }
        } else {
            itemChanceTotal = itemArmorSubType[itemArmorSubType.length - 1];
            totalChance = itemChanceTotal.chance;
            randomNumber = Math.floor(Math.random() * (totalChance - 1) + 1);
            for (itemType in itemArmorSubType) {
                if (itemArmorSubType.hasOwnProperty(itemType)) {
                    itemChance = itemArmorSubType[itemType].chance;
                    itemType2 = itemArmorSubType[itemType].type;
                    if (randomNumber <= itemChance) {
                        randomLoreArray = itemArmorSubType[itemType].lore;
                        randomLore =
                            randomLoreArray[Math.floor(Math.random() * randomLoreArray.length)];
                        dropItem['lore'] = randomLore.text;
                        dropItem['subType'] = itemType2;
                        break;
                    }
                }
            }
        }
    } else if (dropItem.itemType === 'accessory') {
        if (dropItem.isCrafted === true) {
            for (var i = 0; i < itemAccessorySubType.length; i++) {
                if (itemAccessorySubType[i].type === craftitemSubType) {
                    dropItem['subType'] = itemAccessorySubType[i].type;
                    randomLoreArray = itemAccessorySubType[i].lore;
                    randomLore =
                        randomLoreArray[Math.floor(Math.random() * randomLoreArray.length)];
                    dropItem['lore'] = randomLore.text;
                    break;
                }
            }
        } else {
            itemChanceTotal = itemAccessorySubType[itemAccessorySubType.length - 1];
            totalChance = itemChanceTotal.chance;
            randomNumber = Math.floor(Math.random() * (totalChance - 1) + 1);
            for (itemType in itemAccessorySubType) {
                if (itemAccessorySubType.hasOwnProperty(itemType)) {
                    itemChance = itemAccessorySubType[itemType].chance;
                    itemType2 = itemAccessorySubType[itemType].type;
                    if (randomNumber <= itemChance) {
                        randomLoreArray = itemAccessorySubType[itemType].lore;
                        randomLore =
                            randomLoreArray[Math.floor(Math.random() * randomLoreArray.length)];
                        dropItem['lore'] = randomLore.text;
                        dropItem['subType'] = itemType2;
                        break;
                    }
                }
            }
        }
    }
    getItemRarity(monster, dropItem, isDrop, craftItemQuality);
}

function getItemRarity(monster, dropItem, isDrop, craftItemQuality) {
    var totalChance = 0;
    var randomNumber = 0;
    var itemRarityArray = 1;
    if (craftItemQuality === 'Beginner') {
        itemRarityArray = 1;
    } else if (craftItemQuality === 'Intermediate') {
        itemRarityArray = 2;
    } else if (craftItemQuality === 'Master') {
        itemRarityArray = 3;
    } else if (craftItemQuality === 'Legendary') {
        // force the top tier (boss uniques). itemRarity[0] = Legendary, so the
        // roll window collapses to just its chance and always picks Legendary.
        itemRarityArray = itemRarity.length;
    }
    var itemChanceTotal = itemRarity[itemRarity.length - itemRarityArray]; // last array element
    totalChance = itemChanceTotal.chance;
    randomNumber = Math.floor(Math.random() * (totalChance - 1) + 1);
    for (var itemType in itemRarity) {
        var itemChance = itemRarity[itemType].chance;
        var itemType2 = itemRarity[itemType];
        var itemColor = itemRarity[itemType].color;
        var rarityValue = itemRarity[itemType].rarityValue;
        if (randomNumber <= itemChance) {
            if (craftItemQuality === 'Common') {
                dropItem['itemRarity'] = 'Common';
            } else {
                dropItem['itemRarity'] = itemType2.type;
            }
            dropItem['minMods'] = itemType2.minMods;
            dropItem['maxMods'] = itemType2.maxMods;
            dropItem['image'] = dropItem.subType + dropItem.itemRarity;
            dropItem['color'] = itemColor;
            dropItem['power'] = itemType2.power;
            dropItem['rarityValue'] = rarityValue;
            break;
        }
    }
    getItemPower(monster, dropItem, isDrop, craftItemQuality);
}
function getItemPower(monster, dropItem, isDrop, craftItemQuality) {
    // Item quality is now a small MULTIPLIER on the compressed rarity power
    // (was a large additive that would dwarf the new 2.0-3.6 base). It gives
    // two same-rarity items a ±10% spread and a name prefix.
    for (var key in itemPower) {
        if (itemPower.hasOwnProperty(key)) {
            var randomNumber = Math.floor(Math.random() * (100 - 1) + 1);
            var itemPowerChance = itemPower[key].chance;
            var itemPowerType = itemPower[key].type;
            if (randomNumber <= itemPowerChance) {
                dropItem['itemQuality'] = itemPowerType;
                if (itemPowerType === 'Inferior') dropItem.power *= 0.95;
                else if (itemPowerType === 'Superior') dropItem.power *= 1.1;
                break; //Break here so it will stop once it rolls an item quality...
            }
        }
    }
    getItemBaseStats(monster, dropItem, isDrop, craftItemQuality);
}

function getItemBaseStats(monster, dropItem, isDrop, craftItemQuality) {
    dropItem['name'] = '';
    if (dropItem.isCrafted === true) {
        if (craftItemQuality !== 'Common') {
            dropItem.name = 'Crafted ';
            dropItem.color = '#FF00FF';
        }
    }
    var minDmg = dropItem.iLvl * dropItem.power;
    var maxDmg = Math.floor(dropItem.iLvl * 1.1 * dropItem.power);
    var randomNumber = 0;
    dropItem['Value'] = 0;
    if (dropItem.itemType === 'weapon') {
        dropItem['MinDamage'] = minDmg;
        dropItem['MaxDamage'] = maxDmg;
        dropItem.Value += Math.floor((dropItem.MinDamage + dropItem.MaxDamage) * 5);
    } else if (dropItem.itemType === 'armor') {
        var minDefense = 5 + dropItem.iLvl * 0.3;
        var maxDefense = 10 + dropItem.iLvl * 0.7;
        randomNumber = Math.floor(Math.random() * (maxDefense - minDefense + 1) + minDefense);
        dropItem['defense'] = randomNumber;
        dropItem.Value += Math.floor(dropItem.defense * 10);
    } else if (dropItem.itemType === 'accessory') {
        // accessories have no base damage/defense; give them a value floor so a
        // 0-affix Common still passes the Value>0 push guard and prices sanely
        dropItem.Value += Math.floor(10 + dropItem.iLvl * dropItem.rarityValue * 2);
    }
    if (dropItem.itemQuality !== 'Normal') {
        dropItem.name +=
            dropItem.itemQuality +
            ' ' +
            dropItem.itemRarity +
            ' ' +
            dropItem.subType.capitalizeFirstLetter();
    } else {
        dropItem.name += dropItem.itemRarity + ' ' + dropItem.subType.capitalizeFirstLetter();
    }
    getBaseItemMod(monster, dropItem, isDrop);
}

function getBaseItemMod(monster, dropItem, isDrop) {
    // The old physical/spell "base mod" (itemBaseMod) was never read by the
    // player, so it's dropped; affix rolling happens in getBonusItemMod.
    getBonusItemMod(monster, dropItem, isDrop);
}

// ---- Affix rolling (curated per-slot prefix/suffix pools) -------------------
function affixRandInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Apply one rolled affix onto the item, folding into the right base stat by
// kind and accumulating the gold Value. Keys match what the player reads.
function applyAffix(dropItem, affix, legendary) {
    var v = rollAffixValue(affix, dropItem.iLvl, legendary);
    if (v <= 0 && affix.kind !== 'targets') return;
    if (affix.kind === 'foldDamage') {
        v = Math.min(1000, v);
        dropItem['Bonus damage'] = v;
        dropItem.MinDamage = Math.floor(dropItem.MinDamage * (1 + v / 100));
        dropItem.MaxDamage = Math.floor(dropItem.MaxDamage * (1 + v / 100));
    } else if (affix.kind === 'foldArmor') {
        dropItem['Bonus armor'] = v;
        dropItem.defense = Math.floor(dropItem.defense * (1 + v / 100));
    } else if (affix.kind === 'flatCrit') {
        dropItem['Critical chance'] = (dropItem['Critical chance'] || 0) + v;
    } else {
        // attributes / utility / behavior / extra targets: additive on the key
        dropItem[affix.key] = (dropItem[affix.key] || 0) + v;
    }
    dropItem.Value += Math.floor((affix.baseValue || 5) * v);
}

function rollAffixList(dropItem, list, range, legendary) {
    var count = affixRandInt(range[0], range[1]);
    var available = list.slice();
    for (var i = 0; i < count && available.length > 0; i++) {
        var pick = available.splice(Math.floor(Math.random() * available.length), 1)[0];
        applyAffix(dropItem, pick, legendary);
    }
}

// Roll the item's prefixes then suffixes from its slot pool, by the rarity's
// affix-slot budget. Runs AFTER base stats (damage/defense/subtype crit/shield
// block) are finalized, so folds land on the final numbers.
function rollAffixes(dropItem) {
    var pool =
        dropItem.itemType === 'weapon' ? AFFIX_POOLS.weapon : AFFIX_POOLS[dropItem.subType];
    if (!pool) return;
    var budget = RARITY_AFFIX_BUDGET[dropItem.itemRarity] || RARITY_AFFIX_BUDGET.Common;
    var legendary = dropItem.itemRarity === 'Legendary';
    rollAffixList(dropItem, pool.prefixes, budget.prefix, legendary);
    rollAffixList(dropItem, pool.suffixes, budget.suffix, legendary);
}

function getBonusItemMod(monster, dropItem, isDrop) {
    var itemLevel = dropItem.iLvl;
    if (dropItem.subType === 'shield' || dropItem.itemType === 'weapon') {
        var number = getNumberMultiplierofFive(itemLevel);
        dropItem.image += number;
    }
    // shield block is innate (scales with power/rarity/level)
    if (dropItem.subType === 'shield') {
        dropItem['Block chance'] = Math.floor(
            10 + (dropItem.power + dropItem.rarityValue) / 2 + dropItem.iLvl / 20
        );
        dropItem['Block amount'] =
            30 + (dropItem.power + dropItem.rarityValue) * 5 + dropItem.iLvl * 2;
        if (dropItem['Block chance'] >= 40) {
            dropItem['Block chance'] = 40;
        }
        dropItem.Value += Math.floor(dropItem['Block chance'] * 5 + dropItem['Block amount'] * 5);
    }
    // weapon subtype identity: innate crit + the class damage multiplier. Runs
    // before affixes so a crit prefix stacks on top and Bonus damage folds last.
    if (dropItem.itemType === 'weapon') {
        var criticalValue = dropItem.power;
        var weaponBonusDamage = 1;
        if (dropItem.subType === 'axe') {
            weaponBonusDamage = 1.4;
            var axeCrit = Math.floor(Math.random() * (15 - 10 + 1) + 10); // Crit 10-15%
            dropItem['Critical chance'] = Math.floor(criticalValue + axeCrit + dropItem.iLvl / 5);
        } else if (dropItem.subType === 'ranged') {
            weaponBonusDamage = 1.2;
            var rangedCrit = Math.floor(Math.random() * (10 - 5 + 1) + 5); // Crit 5-10%
            dropItem['Critical chance'] = Math.floor(
                criticalValue + rangedCrit + dropItem.iLvl / 5
            );
        } else if (dropItem.subType === 'sword') {
            weaponBonusDamage = 1;
            var swordCrit = Math.floor(Math.random() * (10 - 5 + 1) + 5); // Crit 5-10%
            dropItem['Critical chance'] = Math.floor(criticalValue + swordCrit + dropItem.iLvl / 5);
        } else if (dropItem.subType === 'mace') {
            weaponBonusDamage = 0.8;
            var maceCrit = Math.floor(Math.random() * (5 - 1 + 1) + 1); // Crit 5-10%
            dropItem['Critical chance'] = Math.floor(criticalValue + maceCrit + dropItem.iLvl / 5);
        } else if (dropItem.subType === 'staff') {
            weaponBonusDamage = 0.6;
            var staffCrit = Math.floor(Math.random() * (5 - 1 + 1) + 1); // Crit 1-5%
            dropItem['Critical chance'] = Math.floor(criticalValue + staffCrit + dropItem.iLvl / 5);
        }
        dropItem.MinDamage = Math.floor(1 + dropItem.MinDamage * weaponBonusDamage);
        dropItem.MaxDamage = Math.floor(2 + dropItem.MaxDamage * weaponBonusDamage);
    }
    // curated prefix/suffix affixes from the slot pool (folds Bonus damage into
    // MinDamage, Bonus armor into defense, adds crit, sets attributes/utility)
    rollAffixes(dropItem);
    if (dropItem.itemType === 'weapon') {
        dropItem['AverageDamage'] = (dropItem.MinDamage + dropItem.MaxDamage) / 2;
    }
    if (dropItem.Value > 0) {
        var itemHolder = [];
        if (dropItem.isCrafted === undefined) {
            if (isDrop === true) {
                if (
                    (dropItem.itemRarity === 'Common' && state.checkBoxCommon === false) ||
                    (dropItem.itemRarity === 'Uncommon' && state.checkBoxUncommon === false) ||
                    (dropItem.itemRarity === 'Rare' && state.checkBoxRare === false) ||
                    (dropItem.itemRarity === 'Epic' && state.checkBoxEpic === false) ||
                    dropItem.itemRarity === 'Legendary'
                ) {
                    itemHolder = [];
                    itemHolder.push(dropItem);
                    playerInventory.push.apply(
                        playerInventory,
                        JSON.parse(JSON.stringify(itemHolder))
                    );
                    player.properties.itemIdNumber += 1;
                } else {
                    player.properties.gold += Math.floor(dropItem.Value * 0.2);
                    updateHtml();
                }
            } else {
                if (
                    (state.accessoryAmount < 20 && dropItem.itemType === 'accessory') ||
                    (state.weaponAmount < 20 && dropItem.itemType === 'weapon') ||
                    (state.armorAmount < 20 && dropItem.itemType === 'armor')
                ) {
                    if (dropItem.itemType === 'accessory') {
                        state.accessoryAmount += 1;
                        dropItem['shopPrice'] = Math.floor(dropItem.Value * 10);
                        itemHolder = [];
                        itemHolder.push(dropItem);
                        itemShopAccessory.push.apply(
                            itemShopAccessory,
                            JSON.parse(JSON.stringify(itemHolder))
                        );
                        player.properties.itemIdNumber += 1;
                    } else if (dropItem.itemType === 'weapon') {
                        state.weaponAmount += 1;
                        dropItem['shopPrice'] = Math.floor(dropItem.Value * 10);
                        itemHolder = [];
                        itemHolder.push(dropItem);
                        itemShopWeapon.push.apply(
                            itemShopWeapon,
                            JSON.parse(JSON.stringify(itemHolder))
                        );
                        player.properties.itemIdNumber += 1;
                    } else if (dropItem.itemType === 'armor') {
                        state.armorAmount += 1;
                        dropItem['shopPrice'] = Math.floor(dropItem.Value * 10);
                        itemHolder = [];
                        itemHolder.push(dropItem);
                        itemShopArmor.push.apply(
                            itemShopArmor,
                            JSON.parse(JSON.stringify(itemHolder))
                        );
                        player.properties.itemIdNumber += 1;
                    }
                }
            }
        } else {
            itemHolder = [];
            itemHolder.push(dropItem);
            playerInventory.push.apply(playerInventory, JSON.parse(JSON.stringify(itemHolder)));
            player.properties.itemIdNumber += 1;
        }
    }
}

/*function itemDropRandom(monster) {

    var monsterDrop = monster.Drops;
    var monsterStats = monster.Stats;

    var dropItem;
    var chance = 0;
    var monsterLength = monsterDrop.length;
    for (var i = 0; i < monsterLength; i++) {
        itemDropChance = monsterDrop[i].chance;
        var randomItemChance = Math.floor(Math.random() * (20000 - 1) + 1);
        if (randomItemChance <= (itemDropChance * player.functions.dropRate())) {
            var dropItem = monsterDrop[i].item;
            //test

            //Checks if player used checkbox to auto remove items by quality. Also this code add "id" property to each created item
                dropItem["id"] = player.properties.itemIdNumber;

                if (dropItem.baseStrength > 0) {
                    var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                    bonusStrength = dropItem.baseStrength;
                    dropItem["strength"] = returnNum + bonusStrength;
                }
                else {
                    dropItem["strength"] = 0;
                };
                if (dropItem.baseEndurance > 0) {
                    var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                    bonusEndurance = dropItem.baseEndurance;
                    dropItem["endurance"] = returnNum + bonusEndurance;
                }
                else {
                    dropItem["endurance"] = 0;
                };
                if (dropItem.baseAgility > 0) {
                    var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                    bonusAgility = dropItem.baseAgility;
                    dropItem["agility"] = returnNum + bonusAgility;
                }
                else {
                    dropItem["agility"] = 0;
                };
                if (dropItem.baseDexterity > 0) {
                    var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                    bonusDexterity = dropItem.baseDexterity;
                    dropItem["dexterity"] = returnNum + bonusDexterity;
                }
                else {
                    dropItem["dexterity"] = 0;
                };
                if (dropItem.baseWisdom > 0) {
                    var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                    bonusWisdom = dropItem.baseWisdom;
                    dropItem["wisdom"] = returnNum + bonusWisdom;
                }
                else {
                    dropItem["wisdom"] = 0;
                };
                if (dropItem.baseIntelligence > 0) {
                    var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                    bonusIntelligence = dropItem.baseIntelligence;
                    dropItem["intelligence"] = returnNum + bonusIntelligence;
                }
                else {
                    dropItem["intelligence"] = 0;
                };
                if (dropItem.baseLuck > 0) {
                    var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                    bonusLuck = dropItem.baseLuck;
                    dropItem["luck"] = returnNum + bonusLuck;
                }
                else {
                    dropItem["luck"] = 0;
                };
                if (dropItem.baseMinDamage > 0) {
                    var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                    bonusMinDamage = dropItem.baseMinDamage;
                    dropItem["minDamage"] = returnNum + bonusMinDamage;
                };
                if (dropItem.baseMaxDamage > 0) {
                    var returnNum = getNum((dropItem.iLvl * 2) + (monsterStats.level * 2), (dropItem.iLvl * 3) + (monsterStats.level * 3));
                    bonusMaxDamage = dropItem.baseMaxDamage;
                    dropItem["maxDamage"] = returnNum + bonusMaxDamage;
                };
                if (dropItem.baseDefense > 0) {
                    var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                    bonusDefense = dropItem.baseDefense;
                    dropItem["defense"] = returnNum + bonusDefense;
                }
                else {
                    dropItem["defense"] = 0;
                };

                 //Add item level up etc
                if (dropItem.itemQuality == "Common") {
                    var randomNumber = Math.floor((Math.random() * 100) + 1);
                    if (dropItem.itemType === "weapon") {
                        if (randomNumber >= 30) dropItem["materiaSlot_1"] = 'empty';
                        if (randomNumber >= 50) dropItem["materiaSlot_2"] = 'empty';
                        if (randomNumber >= 70) dropItem["materiaSlot_3"] = 'empty';
                    };
                    dropItem["level"] = 0;
                    dropItem["maxLevel"] = 5;
                    dropItem["exp"] = 0;
                    dropItem["maxExp"] = 10;
                    dropItem["power"] = 1; //This is used when item level up to determine stat gain, higher quality items give better bonuses.
                    if (dropItem.baseDropRate > 0) {
                        var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                        bonusDropRate = dropItem.baseDropRate;
                        dropItem["dropRate"] = returnNum + bonusDropRate;
                    }
                    else {
                        dropItem["dropRate"] = 0;
                    };
                    if (dropItem.baseExpRate > 0) {
                        var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                        bonusExpRate = dropItem.baseExpRate;
                        dropItem["expRate"] = returnNum + bonusExpRate;
                    }
                    else {
                        dropItem["expRate"] = 0;
                    };
                    if (dropItem.baseGoldRate > 0) {
                        var returnNum = getNum((dropItem.iLvl) + (monsterStats.level), (dropItem.iLvl * 2) + (monsterStats.level * 2));
                        bonusGoldRate = dropItem.baseGoldRate;
                        dropItem["goldRate"] = returnNum + bonusGoldRate;
                    }
                    else {
                        dropItem["goldRate"] = 0;
                    };
                };
                if (dropItem.itemQuality == "Uncommon") {
                    var randomNumber = Math.floor((Math.random() * 100) + 1);
                    if (dropItem.itemType === "weapon") {
                        if (randomNumber >= 25) dropItem["materiaSlot_1"] = 'empty';
                        if (randomNumber >= 40) dropItem["materiaSlot_2"] = 'empty';
                        if (randomNumber >= 60) dropItem["materiaSlot_3"] = 'empty';
                        if (randomNumber >= 80) dropItem["materiaSlot_4"] = 'empty';
                    };
                    dropItem["level"] = 0;
                    dropItem["maxLevel"] = 5;
                    dropItem["exp"] = 0;
                    dropItem["maxExp"] = 10;
                    dropItem["power"] = 2; //This is used when item level up to determine stat gain, higher quality items give better bonuses.
                    if (dropItem.baseDropRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 2) + (monsterStats.level * 2), (dropItem.iLvl * 3) + (monsterStats.level * 3));
                        bonusDropRate = dropItem.baseDropRate;
                        dropItem["dropRate"] = returnNum + bonusDropRate;
                    }
                    else {
                        dropItem["dropRate"] = 0;
                    };
                    if (dropItem.baseExpRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 2) + (monsterStats.level * 2), (dropItem.iLvl * 3) + (monsterStats.level * 3));
                        bonusExpRate = dropItem.baseExpRate;
                        dropItem["expRate"] = returnNum + bonusExpRate;
                    }
                    else {
                        dropItem["expRate"] = 0;
                    };
                    if (dropItem.baseGoldRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 2) + (monsterStats.level * 2), (dropItem.iLvl * 3) + (monsterStats.level * 3));
                        bonusGoldRate = dropItem.baseGoldRate;
                        dropItem["goldRate"] = returnNum + bonusGoldRate;
                    }
                    else {
                        dropItem["goldRate"] = 0;
                    };
                };
                if (dropItem.itemQuality == "Rare") {
                    var randomNumber = Math.floor((Math.random() * 100) + 1);
                    if (dropItem.itemType === "weapon") {
                        if (randomNumber >= 20) dropItem["materiaSlot_1"] = 'empty';
                        if (randomNumber >= 35) dropItem["materiaSlot_2"] = 'empty';
                        if (randomNumber >= 50) dropItem["materiaSlot_3"] = 'empty';
                        if (randomNumber >= 70) dropItem["materiaSlot_4"] = 'empty';
                        if (randomNumber >= 90) dropItem["materiaSlot_5"] = 'empty';
                    };
                    dropItem["level"] = 0;
                    dropItem["maxLevel"] = 5;
                    dropItem["exp"] = 0;
                    dropItem["maxExp"] = 10;
                    dropItem["power"] = 3; //This is used when item level up to determine stat gain, higher quality items give better bonuses.
                    if (dropItem.baseDropRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 3) + (monsterStats.level * 3), (dropItem.iLvl * 4) + (monsterStats.level * 4));
                        bonusDropRate = dropItem.baseDropRate;
                        dropItem["dropRate"] = returnNum + bonusDropRate;
                    }
                    else {
                        dropItem["dropRate"] = 0;
                    };
                    if (dropItem.baseExpRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 3) + (monsterStats.level * 3), (dropItem.iLvl * 4) + (monsterStats.level * 4));
                        bonusExpRate = dropItem.baseExpRate;
                        dropItem["expRate"] = returnNum + bonusExpRate;
                    }
                    else {
                        dropItem["expRate"] = 0;
                    };
                    if (dropItem.baseGoldRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 3) + (monsterStats.level * 3), (dropItem.iLvl * 4) + (monsterStats.level * 4));
                        bonusGoldRate = dropItem.baseGoldRate;
                        dropItem["goldRate"] = returnNum + bonusGoldRate;
                    }
                    else {
                        dropItem["goldRate"] = 0;
                    };
                };
                if (dropItem.itemQuality == "Epic") {
                    var randomNumber = Math.floor((Math.random() * 100) + 1);
                    if (dropItem.itemType === "weapon") {
                        if (randomNumber >= 10) dropItem["materiaSlot_1"] = 'empty';
                        if (randomNumber >= 20) dropItem["materiaSlot_2"] = 'empty';
                        if (randomNumber >= 40) dropItem["materiaSlot_3"] = 'empty';
                        if (randomNumber >= 60) dropItem["materiaSlot_4"] = 'empty';
                        if (randomNumber >= 85) dropItem["materiaSlot_5"] = 'empty';
                    };
                    dropItem["level"] = 0;
                    dropItem["maxLevel"] = 5;
                    dropItem["exp"] = 0;
                    dropItem["maxExp"] = 10;
                    dropItem["power"] = 4; //This is used when item level up to determine stat gain, higher quality items give better bonuses.
                    if (dropItem.baseDropRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 4) + (monsterStats.level * 4), (dropItem.iLvl * 5) + (monsterStats.level * 5));
                        bonusDropRate = dropItem.baseDropRate;
                        dropItem["dropRate"] = returnNum + bonusDropRate;
                    }
                    else {
                        dropItem["dropRate"] = 0;
                    };
                    if (dropItem.baseExpRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 4) + (monsterStats.level * 4), (dropItem.iLvl * 5) + (monsterStats.level * 5));
                        bonusExpRate = dropItem.baseExpRate;
                        dropItem["expRate"] = returnNum + bonusExpRate;
                    }
                    else {
                        dropItem["expRate"] = 0;
                    };
                    if (dropItem.baseGoldRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 4) + (monsterStats.level * 4), (dropItem.iLvl * 5) + (monsterStats.level * 5));
                        bonusGoldRate = dropItem.baseGoldRate;
                        dropItem["goldRate"] = returnNum + bonusGoldRate;
                    }
                    else {
                        dropItem["goldRate"] = 0;
                    };
                };
                if (dropItem.itemQuality == "Legendary") {
                    var randomNumber = Math.floor((Math.random() * 100) + 1);
                    if (dropItem.itemType === "weapon") {
                        if (randomNumber >= 5) dropItem["materiaSlot_1"] = 'empty';
                        if (randomNumber >= 10) dropItem["materiaSlot_2"] = 'empty';
                        if (randomNumber >= 30) dropItem["materiaSlot_3"] = 'empty';
                        if (randomNumber >= 50) dropItem["materiaSlot_4"] = 'empty';
                        if (randomNumber >= 80) dropItem["materiaSlot_5"] = 'empty';
                    };
                    dropItem["level"] = 0;
                    dropItem["maxLevel"] = 5;
                    dropItem["exp"] = 0;
                    dropItem["maxExp"] = 10;
                    dropItem["power"] = 5; //This is used when item level up to determine stat gain, higher quality items give better bonuses.
                    if (dropItem.baseDropRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 5) + (monsterStats.level * 5), (dropItem.iLvl * 6) + (monsterStats.level * 6));
                        bonusDropRate = dropItem.baseDropRate;
                        dropItem["dropRate"] = returnNum + bonusDropRate;
                    }
                    else {
                        dropItem["dropRate"] = 0;
                    };
                    if (dropItem.baseExpRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 5) + (monsterStats.level * 5), (dropItem.iLvl * 6) + (monsterStats.level * 6));
                        bonusExpRate = dropItem.baseExpRate;
                        dropItem["expRate"] = returnNum + bonusExpRate;
                    }
                    else {
                        dropItem["expRate"] = 0;
                    };
                    if (dropItem.baseGoldRate > 0) {
                        var returnNum = getNum((dropItem.iLvl * 5) + (monsterStats.level * 5), (dropItem.iLvl * 6) + (monsterStats.level * 6));
                        bonusGoldRate = dropItem.baseGoldRate;
                        dropItem["goldRate"] = returnNum + bonusGoldRate;
                    }
                    else {
                        dropItem["goldRate"] = 0;
                    };
                };
                dropItem["value"] = getItemValue(dropItem); //Get item value function.
                if (dropItem.itemQuality === 'Common' && state.checkBoxCommon === false ||
                    dropItem.itemQuality === 'Uncommon' && state.checkBoxUncommon === false ||
                    dropItem.itemQuality === 'Rare' && state.checkBoxRare === false ||
                    dropItem.itemQuality === 'Epic' && state.checkBoxEpic === false ||
                    dropItem.itemQuality === 'Legendary') {

                    var itemHolder = [];
                    itemHolder.push(dropItem);
                    playerInventory.push.apply(
                        playerInventory,
                        JSON.parse(JSON.stringify(itemHolder))
                        );
                    player.properties.itemIdNumber += 1;
                    Log("<span style=\"color:orange\">You found an item! <br /> </span>");
                }
                else {
                    player.properties.gold += Math.floor(dropItem.value * 0.2);
                    updateHtml();
                };
        };
    };
};*/

// monsterItemDrop (battle) and getItemType (core, dynamicHtml, professions) are
// exported (inline above) and imported by their callers. The rest of the
// item-generation pipeline (getItemSubType/getItemRarity/getItemPower/
// getItemBaseStats/getBaseItemMod/getBonusItemMod/getNum/getItemValue) is called
// only internally here and is no longer exposed. None are onclick-dispatched.
