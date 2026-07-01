'use strict';
import { weaponMastery } from './weaponMastery.js';
import { playerPassive, weaponSkillList } from './skills.js';
import {
    secondaryStatInfo,
    primaryStatInfo,
    loadingEquippedItems,
    emptyItemSlotInfo,
    InventoryItemTypes,
    monsterAreas,
    weaponTypeObject,
    characterRaces,
    raceStats,
} from './gameObjects.js';
import { player, equippedItems, playerInventory, getThousands, compare } from './core.js';
import { monsterList } from './monsterList.js';
import { state } from './state.js';
import { updateHtml } from './stats.js';
import { createPotionInventory } from './potionsHotbar.js';
import { getItemType } from './itemDrop.js';
import { pageReload } from './save.js';
import {
    potionStatus,
    mediumPotionStatus,
    superPotionStatus,
    backpackStatus,
    statStatus,
} from './shop.js';
//Create player Weapon skill html
var weaponTabActive = 'swordTest';
function CreateWeaponSkillHtml() {
    let mastery = '';
    for (var itemType in weaponTypeObject) {
        if (weaponTypeObject.hasOwnProperty(itemType)) {
            var item = weaponTypeObject[itemType];
            var itemType3 = item.type2;
            var weaponStat = weaponMastery[item.type];
            let multipliers = '';
            for (var statName in weaponStat) {
                if (weaponStat.hasOwnProperty(statName)) {
                    if (
                        'strength, endurance, agility, dexterity, intelligence, wisdom, luck'.indexOf(
                            statName
                        ) !== -1
                    ) {
                        multipliers += `${statName.capitalizeFirstLetter()}: ${(weaponStat[statName]() * 100).toFixed(0)}%<br />`;
                    }
                }
            }
            mastery +=
                `<div class="col-xs-2 passiveMargin">` +
                `<a class="tooltips">` +
                `<img class="skillBorder" src="images/skills/${item.type}.png">` +
                `<span style="width:300px; bottom:30px; right:-150px;">` +
                `<div class="row">` +
                `<div class="col-xs-12">` +
                `${item.displayName} skill progress:<br />` +
                `Level: ${weaponStat.level}<br />` +
                `<div class="progress">` +
                `<div style="width: ${player.properties[itemType3]}%;" aria-valuemax="100" aria-valuemin="0" aria-valuenow="60" role="progressbar" class="progress-bar" id="${item.type}1">` +
                `<span id="${item.type}">${player.properties[itemType3]}%</span></div></div>` +
                `</div>` +
                `</div>` +
                `Stat Multiplier:<br />` +
                multipliers +
                `</span></a>` +
                `</div>`;
        }
    }

    let skills = '';
    for (var type in weaponSkillList) {
        if (weaponSkillList.hasOwnProperty(type)) {
            var weaponType = weaponSkillList[type];
            let entries = '';
            for (var skill in weaponType) {
                if (weaponType.hasOwnProperty(skill)) {
                    var weaponSkill = weaponType[skill];
                    entries +=
                        `<div class="col-xs-12 passiveMargin">` +
                        `<a class="tooltips">` +
                        `<img class="skillBorder" src="images/skills/${weaponSkill.image}.png">` +
                        `<span style="width:200px; bottom:30px; right:-100px;">` +
                        `${weaponSkill.name}<br />` +
                        `Weapon skill required: ${weaponSkill.levelReq}<br />` +
                        weaponSkill.description() +
                        `</span></a>` +
                        `<div class="row">` +
                        `<div class="col-xs-8 col-xs-offset-2">` +
                        `<img class="skillBorder" src="images/arrow.png">` +
                        `</div>` +
                        `</div>` +
                        `</div>`;
                }
            }
            skills += `<div class="col-xs-2"><div class="row">${entries}</div></div>`;
        }
    }

    document.getElementById('weaponSkill').innerHTML =
        `<div class="row">` +
        `<div class="col-xs-10 col-xs-offset-1">` +
        `<div class="row">${mastery}</div>` +
        `<div class="row">${skills}</div>` +
        `</div>` +
        `</div>`;
}

//String prototype used to capitalize first letter, use it with "string".capitalizeFirstLetter()
String.prototype.capitalizeFirstLetter = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

var monsterTabActiveNum = 0;
function changedTabmonster(index) {
    monsterTabActiveNum = index;
    if (index === 0 || 1 + (index + index * 7) < 10) {
        currentMonster = 'monster00' + (1 + (index + index * 7));
    } else {
        currentMonster = 'monster0' + (1 + (index + index * 7));
    }
    CreateMonsterHtml();
}
var currentMonster = 'monster001'; //Save current monster number, so I can pick it from array.
function CreateMonsterHtml() {
    const tabs = monsterAreas
        .map((areaTab, k) => {
            if (areaTab.isUnlocked !== true) return '';
            const liClass = k === monsterTabActiveNum ? 'monsterNavBar active' : 'monsterNavBar';
            return (
                `<li class="${liClass}" onClick = changedTabmonster(${k})>` +
                `<a href="#tab_${areaTab.type}" data-toggle="tab"><span class="icons ${areaTab.icon}" data-toggle="tooltip" data-placement="right" title="${areaTab.displayName}"></span>` +
                `</a></li>`
            );
        })
        .join('');

    const monster = monsterList[currentMonster];
    const area = monster.area;

    const content = monsterAreas
        .map((areaPane, j) => {
            if (areaPane.isUnlocked !== true) return '';
            const paneClass = j === monsterTabActiveNum ? 'tab-pane active' : 'tab-pane';

            var buttons = '';
            for (var key in monsterList) {
                if (monsterList[key].area === areaPane.type && monsterList[key].isShown === true) {
                    const selected = currentMonster === key ? 'buttonSelected ' : '';
                    buttons += `<button class="${selected}monsterButtonDisable" style="margin-left:8px;" type="button" onclick="changeMonsterPage('${key}')">${monsterList[key].id}</button>`;
                }
            }

            var display = '';
            if (area === areaPane.type) {
                const monsterPercent = (monster.hp / monster.maxHp) * 100;
                const onclickevent = `startBattle('${currentMonster}');`;
                display =
                    `<div class="col-xs-10 col-xs-offset-1">` + //First Div
                    `<div class="row">` + //First Row
                    `<div class="col-xs-12 c3">` + //Second Div
                    `<div id="${monster.id}">` +
                    `<a href="#" class="tooltipA centerText" id="monsterButton">` +
                    `<img style="cursor:help;" src="images/monsters/${monster.name}.png" alt="${monster.displayName}">` +
                    `<span style="bottom:140px; left:-100px; pointer-events:none;">` +
                    getMonsterTooltip(monster) +
                    `</span></a>` +
                    `<div class="progress" style="width:80%; margin-left:10%;">` +
                    `<div style="width:${monsterPercent}%;" aria-valuemax="100" aria-valuemin="0" aria-valuenow="60" role="progressbar" class="progress-bar" id="${monster.name}1">` +
                    `<span style="font-size:13px;">${monster.hp} HP</span>` +
                    `</div></div>` +
                    `<button id="monster${monster.id}"class="monster sell" onclick="${onclickevent} disableButtons();">Fight</button>` +
                    `<div class="col-xs-12 c3">` +
                    `<h4>Killed: ${monster.killCount}</h4>` +
                    `</div>` +
                    `<br /></div>` +
                    `</div>` + //Close second Div
                    `</div>`; //Close first Row / First Div
            }

            return (
                `<div class="${paneClass}" id="tab_${areaPane.type}">` +
                `<div class="panel panel-default">` +
                `<div class="panel-heading" style="background-color:${player.properties.monsterBackground};">` +
                `<h3 class="panel-title c3" >${areaPane.displayName}${player.properties.prestigeSuffix}[${Math.floor(player.properties.prestigeMultiplier - 1)}]</h3>` +
                `</div>` +
                `<div class="panel-body" id="${areaPane.type}" style="background-color:${player.properties.monsterBackground};">` +
                `<div class="row">` +
                `<div class="col-xs-12 c3">${buttons}</div>` +
                display +
                `</div>` +
                `</div>` +
                `</div>` +
                `</div>`
            );
        })
        .join('');

    document.getElementById('monsterTabs').innerHTML =
        `<ul class="nav nav-tabs">${tabs}</ul>` + `<div class="tab-content">${content}</div>`;
    testss();
}
function changeMonsterPage(name) {
    currentMonster = name;
    CreateMonsterHtml();
}

function checkBoxHtml() {
    const rarities = [
        ['common', 'gray', 'Common', state.checkBoxCommon],
        ['uncommon', 'green', 'Uncommon', state.checkBoxUncommon],
        ['rare', 'blue', 'Rare', state.checkBoxRare],
        ['epic', 'orange', 'Epic', state.checkBoxEpic],
        ['legendary', 'red', 'Legendary', state.checkBoxLegendary],
    ];
    const boxes = rarities
        .map(
            ([id, color, title, on]) =>
                `<label><input style="visibility:visible; position:relative;" type="checkbox" id="${id}" onclick="handleClick();"${on === true ? 'checked' : ''}><span style="background-color:${color}; width:10px;height:10px;" data-toggle="tooltip" data-placement="top" title="${title}">__</span></label>`
        )
        .join('');
    document.getElementById('checkBoxHtml').innerHTML =
        `<div class="row">` +
        `<div class="col-xs-10 col-xs-offset-1">` +
        `<div class="centerText"><br />${boxes}<br /></div>` +
        `<div class="centerText">` +
        `<strong>Sell all items by selected rarity(All tabs)</strong>` +
        `<br /><button type="button" class="sell" onclick=sellAllItems();>Sell all</button>` +
        `</div>` +
        `</div>` +
        `</div>`;
    testss();
}
var inventoryTabActiveNum = 0;
function changedTabInventory(index) {
    inventoryTabActiveNum = index;
}
function CreateInventoryWeaponHtml() {
    const navTabs = InventoryItemTypes.map((t, k) => {
        const li =
            k === inventoryTabActiveNum
                ? `<li class="active" onClick = changedTabInventory(${k})>`
                : `<li onClick = changedTabInventory(${k})>`;
        return (
            li +
            `<a href="#tab_${t.type}" data-toggle="tab"><span class="icons ${t.icon}" data-toggle="tooltip" data-placement="top" title="${t.displayName}"></span></a></li>`
        );
    }).join('');

    const panes = InventoryItemTypes.map((t, j) => {
        const active = j === inventoryTabActiveNum ? ' active' : '';
        const paneOpen =
            t.type === 'other'
                ? `<div class="col-xs-12 tab-pane${active} marginBottom"`
                : `<div class="col-xs-10 col-xs-offset-1 tab-pane${active} marginBottom"`;

        let sortSection = '';
        if (t.type !== 'other') {
            sortSection =
                `<div class="c3">Sort by:</div>` +
                `<button type="button" onclick="sortInventory('Value')">Value</button>` +
                `<button type="button" onclick="sortInventory('Rarity')">Rarity</button>` +
                `<button type="button" onclick="sortInventory('iLvl')">Level</button>` +
                (t.type === 'weapon'
                    ? `<button type="button" onclick="sortInventory('Damage')">Damage</button>`
                    : '');
        }

        let cards = '';
        for (var i = 0; i < playerInventory.length; i++) {
            if (playerInventory[i].itemType === t.type) {
                var itemStat;
                if (playerInventory[i].itemType === 'weapon') {
                    itemStat = equippedItems.weapon;
                } else if (playerInventory[i].subType === 'shield') {
                    itemStat = equippedItems.shield;
                } else if (playerInventory[i].subType === 'chest') {
                    itemStat = equippedItems.chest;
                } else if (playerInventory[i].subType === 'helmet') {
                    itemStat = equippedItems.helmet;
                } else if (playerInventory[i].subType === 'legs') {
                    itemStat = equippedItems.legs;
                } else if (playerInventory[i].subType === 'boots') {
                    itemStat = equippedItems.boots;
                } else if (playerInventory[i].subType === 'ring') {
                    itemStat = equippedItems.ring;
                } else if (playerInventory[i].subType === 'amulet') {
                    itemStat = equippedItems.amulet;
                } else if (playerInventory[i].subType === 'talisman') {
                    itemStat = equippedItems.talisman;
                }
                const item = playerInventory[i];
                const hasType = itemStat.hasOwnProperty('itemType');
                const imgClass = item.itemType === 'weapon' ? item.itemType : item.subType;
                cards +=
                    `<div class="col-xs-6 col-sm-4 col-md-4 col-lg-2 c8" style="margin-top:5px;" id="testingItem${item.id}">` +
                    `<a class="tooltips2" style="cursor:pointer;">` +
                    `<img class="${imgClass}, ${item.itemRarity}"src="images/items/${item.subType}/${item.image}.png"onclick="equipItem(${item.id})"/>` +
                    (hasType
                        ? `<span style="pointer-events:none; left:-100px;right:0; bottom:100px; width:400px;">`
                        : `<span style="width:300px; left:80px;right:0; bottom:100px;">`) +
                    `<div class="row">` +
                    `<div class="col-xs-12">` +
                    (hasType
                        ? `<div class="row">` +
                          `<div class="col-xs-6 borderRight">` +
                          itemTooltipTest(itemStat) +
                          `<strong>Currently equipped</strong>` +
                          `</div>`
                        : '') +
                    (hasType
                        ? `<div class="col-xs-6">`
                        : `<div class="col-xs-10 col-xs-offset-1">`) +
                    itemTooltipTest(item) +
                    `<strong>Left-Click to equip</strong>` +
                    `</div></div>` +
                    `</div>` +
                    (hasType ? `</div>` : '') +
                    `</span>` +
                    `</a>` +
                    `<button type="button" style="margin-top:5px;" class="inventorySell" onclick="itemSell(${item.id})">Sell</button>` +
                    `</div>`;
            }
        }

        let otherBlock = '';
        if (t.type === 'other') {
            const radios = [1, 2, 3, 4, 5, 6, 7, 8]
                .map(
                    (n) =>
                        `<label class="radio-inline"><input class="visibilityLabel" type="radio" name="hotBarValue" value="${n}"${n === 1 ? ' checked="checked"' : ''}>${n}</input></label>`
                )
                .join('');
            otherBlock =
                `<div class="row">` +
                `<div class="col-xs-12">` +
                `Choose hot bar slot, then press a button next to a potion.` +
                `<form role="form">` +
                radios +
                `</form>` +
                `</div>` +
                `</div>` +
                `<div id="potionInventory">`;
        }

        return (
            paneOpen +
            `id="tab_${t.type}" style="height:400px;">` +
            `<div class="row" id="inventorySpace${t.type}">` +
            `<div class="c3" style="margin-bottom:10px;"><h4>Inventory</h4>` +
            sortSection +
            `</div>` +
            cards +
            otherBlock +
            `</div>` +
            `</div>`
        );
    }).join('');

    document.getElementById('inventory').innerHTML =
        `<div class="c3" id="updateInventorySlots">Inventory Slots: ${playerInventory.length}/${player.functions.inventory()}</div>` +
        `<ul class="nav nav-tabs draggable">${navTabs}</ul>` +
        `<div class="tab-content" id="tabControl_Inventory">${panes}</div>`;
    testss();
    createPotionInventory();
}

function unequipItemLoad() {
    // Create a variable inside player.properties which store currently equipped item, for easy access...
    for (var key in loadingEquippedItems) {
        if (loadingEquippedItems.hasOwnProperty(key)) {
            var i = loadingEquippedItems[key].type;
            var itemStat = equippedItems[i];
            if (itemStat.subType !== undefined) {
                const hasType = itemStat.hasOwnProperty('itemType');
                const imgClass =
                    itemStat.itemType === 'weapon' ? itemStat.itemType : itemStat.subType;
                var html =
                    `<div class="col-xs-12 col-lg-6 c8"id="testingItem${itemStat.id}">` +
                    `<a class="tooltips" style="cursor:pointer;">` +
                    `<img class="${imgClass}"src="images/items/${itemStat.subType}/${itemStat.image}.png" onclick="equipItem(${itemStat.id})"/>` +
                    (hasType ? `<span>` : `<span style="width:200px;">`) +
                    `<div class="row">` +
                    `<div class="col-xs-12">` +
                    (hasType
                        ? `<div class="row">` +
                          `<div class="col-xs-6">` +
                          itemTooltipTest(itemStat) +
                          `<strong>Currently equipped</strong>` +
                          `</div>`
                        : '') +
                    (hasType
                        ? `<div class="col-xs-6">`
                        : `<div class="col-xs-10 col-xs-offset-1">`) +
                    itemTooltipTest(itemStat) +
                    `<strong>Left-Click to equip</strong>` +
                    `</div></div>` +
                    `</div>` +
                    (hasType ? `</div>` : '') +
                    `</span>` +
                    `</a>` +
                    `<button type="button" class="equip" onclick="itemSell(${itemStat.id})">Sell</button>` +
                    `</div>`;
                player.functions[i] = $(html);
            }
        }
    }
}

function CreatePlayerSkillsHtml() {
    let tree = '';
    for (var passiveSkill in playerPassive) {
        if (playerPassive.hasOwnProperty(passiveSkill)) {
            var passive = playerPassive[passiveSkill];
            const onclickevent = `upgradePassive('${passiveSkill}');`;
            let skillClass = 'skill ';
            if (passive.levelReq <= player.properties.level) {
                if (passive.level === 0) {
                    skillClass += 'can-add-points ';
                }
                if (passive.level > 0 && passive.level < passive.maxLevel) {
                    skillClass += 'can-add-points has-points ';
                }
                if (passive.level === passive.maxLevel) {
                    skillClass += 'has-points has-max-points';
                }
            }
            tree +=
                (passive.firstRow === true ? `<div class="col-xs-4 col-md-1">` : '') +
                `<div class="col-xs-12">` + //Opening Div for skill image
                `<div class="${skillClass}">` +
                //Icon div's
                `<div class="icon-container">` +
                `<div class="icon">` +
                `<img src="images/passive/${passive.image}.png"">` +
                `</div></div>` +
                //Div Frame
                `<div class="frame" onclick="${onclickevent}">` +
                `<a class="tooltips" style="position:absolute; width:80px; height:80px; z-index:5;">` +
                `<span style="bottom:110px; right:-100px; width:250px;">` +
                `${passive.name}<br />` +
                passive.description() +
                `<br />Level: ${passive.levelReq}` +
                `<br />Level: ${passive.level}/${passive.maxLevel}` +
                `</span></a>` +
                `<div class="skill-points">` +
                `${passive.level}/${passive.maxLevel}` +
                `</div>` +
                `</div>` + //Close frame
                `</div>` + //Close skill div
                `</div>` + //Close skill-image div
                (passive.lastRow === true ? `</div>` : '');
        }
    }
    document.getElementById('playerSkills').innerHTML =
        `<div class="row">` +
        `<div class="col-xs-10 col-xs-offset-1">` +
        `<div class="row">` +
        `<div class="col-xs-6 col-xs-offset-3 c3">` +
        `<button type="button" onclick="resetPassiveSkills();">Reset</button>` +
        `<div class="fontSize">Skill points remaining: ${player.properties.skillPoints}</div>` +
        `</div>` +
        `</div>` +
        `<div class="row">` +
        `<div class="talent-tree">${tree}</div>` +
        `</div>` +
        `</div>` +
        `</div>`;
}

//Adds a logo to the starting screen
function startLogo() {
    var html = '';
    html += '<div class="row">';
    html += '<div class ="col-xs-12">';
    html += '</div></div>';
    document.getElementById('gameLogo').innerHTML = html;
}

//This screen shows up everytime you load a page...
function startingScreen() {
    var html = '';
    var newGame = 'newGameSlot();'; // might pass value to pick a slot for new game
    var loadGame = 'loadGameSlot();'; // later on might need to pass some value when loading, once I add more save slots...
    var reset = 'resetallSavesCheck();';
    var muteSound = 'muteAudio();';
    var myAudio = document.getElementById('myAudio');
    html += '<div class="row">';
    html += '<div class="col-xs-6 col-xs-3">';
    html += '<div class="btn-group-vertical" role="group" aria-label="New game, load game">';
    html +=
        '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="' +
        newGame +
        '">New Game</button>';
    html +=
        '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="' +
        loadGame +
        '">Load</button>';
    html +=
        '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="' +
        reset +
        '">Reset all saves</button>';
    html +=
        '<label><input type="checkbox" id="hardcoreMode" style ="visibility:visible; position:relative;" onclick="hardcoreModeCheck();">Hardcore Mode?</label>';
    html += '</div>';
    html +=
        '<button type="button" class="btn btn-default shopButton" onclick="' +
        muteSound +
        'changeMusicImage();""><span id="musicImage" class="glyphicon glyphicon-volume-up" aria-hidden="true"></span></button>';

    html += '</div>';
    html += '</div>';

    html += '<div class="row" style="position:relative; left:-30%;">';
    html += '<div class="col-xs-8 col-xs-offset-2">';
    html +=
        '<h4>If you are unable to start a game, use button above to reset all saves.' +
        'If you see this message first time, then you should reset your save, since its a new update which change a lot.</h4>';
    html += '</div>';
    html += '</div>';
    document.getElementById('buttonDiv').innerHTML = html;
    myAudio.volume = 0.1;
    myAudio.play();
}
// startingScreen()/startLogo() init calls moved to initGame() in src/main.js (Phase 3 ESM)

function newGameSlot() {
    changeMusicImage();
    characterCreationCreateBackground();
    var html = '';
    var newGameSlot0 = 'newGame(0);';
    var newGameSlot1 = 'newGame(1);';
    var newGameSlot2 = 'newGame(2);';
    var newGameSlot3 = 'newGame(3);';
    var displayInfo0 = '';
    var displayInfo = '';
    var displayInfo2 = '';
    var displayInfo3 = '';
    var saveInfo0 = '';
    var saveInfo1 = '';
    var saveInfo2 = '';
    var saveInfo3 = '';

    if (localStorage['EncodedSave']) {
        saveInfo0 = JSON.parse(atob(localStorage['EncodedSave']));
        if (
            saveInfo0.playerProperties.level === undefined ||
            saveInfo0.playerProperties.heroRace === undefined
        ) {
            localStorage.removeItem('EncodedSave');
            pageReload();
        } else {
            displayInfo0 =
                'Current save: Level - ' +
                saveInfo0.playerProperties.level +
                ' Race: ' +
                saveInfo0.playerProperties.heroRace;
            if (saveInfo0.playerProperties.hardcoreMode === true) {
                displayInfo0 += ' <strong>Hardcore</strong>';
            }
        }
    } else {
        displayInfo0 = 'Empty Slot';
    }

    if (localStorage['EncodedSave1']) {
        saveInfo1 = JSON.parse(atob(localStorage['EncodedSave1']));
        displayInfo =
            'Current save: Level - ' +
            saveInfo1.playerProperties.level +
            ' Race: ' +
            saveInfo1.playerProperties.heroRace;
        if (saveInfo1.playerProperties.hardcoreMode === true) {
            displayInfo += ' <strong>Hardcore</strong>';
        }
    } else {
        displayInfo = 'Empty Slot';
    }
    if (localStorage['EncodedSave2']) {
        saveInfo2 = JSON.parse(atob(localStorage['EncodedSave2']));
        displayInfo2 =
            'Current save: Level - ' +
            saveInfo2.playerProperties.level +
            ' Race: ' +
            saveInfo2.playerProperties.heroRace;
        if (saveInfo2.playerProperties.hardcoreMode === true) {
            displayInfo2 += ' <strong>Hardcore</strong>';
        }
    } else {
        displayInfo2 = 'Empty Slot';
    }
    if (localStorage['EncodedSave3']) {
        saveInfo3 = JSON.parse(atob(localStorage['EncodedSave3']));
        displayInfo3 =
            'Current save: Level - ' +
            saveInfo3.playerProperties.level +
            ' Race: ' +
            saveInfo3.playerProperties.heroRace;
        if (saveInfo3.playerProperties.hardcoreMode === true) {
            displayInfo3 += ' <strong>Hardcore</strong>';
        }
    } else {
        displayInfo3 = 'Empty Slot';
    }

    html += '<div class="row">';
    html += '<div class ="col-xs-12 newGameButton">';
    html += '<div class="btn-group-vertical" role="group" aria-label="New game, load game">';
    html += '<div class="row">';
    html += '<div class ="col-xs-12">';
    html +=
        '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="' +
        newGameSlot1 +
        '">New game 1</button> ' +
        displayInfo;
    html += '</div>';
    html += '<div class ="col-xs-12">';
    html +=
        '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="' +
        newGameSlot2 +
        '">New Game 2</button> ' +
        displayInfo2;
    html += '</div>';
    html += '<div class ="col-xs-12">';
    html +=
        '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="' +
        newGameSlot3 +
        '">New Game 3</button> ' +
        displayInfo3;
    html += '</div>';
    html += '<div class ="col-xs-12">';
    html +=
        '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="' +
        newGameSlot0 +
        '">New game 0</button> ' +
        displayInfo0;
    html += '</div>';
    html += '</div></div>';
    html +=
        '<button type="button" class="btn btn-default border startBackButtonMargin" onclick="backToStartingScreen()">Go Back</button>';
    html += '</div></div>';

    document.getElementById('raceCreation').innerHTML = html;
    //document.getElementById("raceText").innerHTML = html2
}

function loadGameSlot() {
    characterCreationCreateBackground();
    var html = '';
    var loadGameSlot0 = 'loadGame(0);';
    var loadGameSlot1 = 'loadGame(1);';
    var loadGameSlot2 = 'loadGame(2);';
    var loadGameSlot3 = 'loadGame(3);';
    var displayInfo0 = '';
    var displayInfo = '';
    var displayInfo2 = '';
    var displayInfo3 = '';
    var saveInfo0 = '';
    var saveInfo1 = '';
    var saveInfo2 = '';
    var saveInfo3 = '';
    if (localStorage['EncodedSave']) {
        saveInfo0 = JSON.parse(atob(localStorage['EncodedSave']));
        if (
            saveInfo0.playerProperties.level === undefined ||
            saveInfo0.playerProperties.heroRace === undefined
        ) {
            localStorage.removeItem('EncodedSave');
            pageReload();
        }
        displayInfo0 =
            'Level - ' +
            saveInfo0.playerProperties.level +
            ' Race: ' +
            saveInfo0.playerProperties.heroRace;
        if (saveInfo0.playerProperties.hardcoreMode === true) {
            displayInfo0 += ' <strong>Hardcore</strong>';
        }
    } else {
        displayInfo0 = 'Empty Slot';
    }
    if (localStorage['EncodedSave1']) {
        saveInfo1 = JSON.parse(atob(localStorage['EncodedSave1']));
        displayInfo =
            'Level - ' +
            saveInfo1.playerProperties.level +
            ' Race: ' +
            saveInfo1.playerProperties.heroRace;
        if (saveInfo1.playerProperties.hardcoreMode === true) {
            displayInfo += ' <strong>Hardcore</strong>';
        }
    } else {
        displayInfo = 'Empty Slot';
    }
    if (localStorage['EncodedSave2']) {
        saveInfo2 = JSON.parse(atob(localStorage['EncodedSave2']));
        displayInfo2 =
            'Level - ' +
            saveInfo2.playerProperties.level +
            ' Race: ' +
            saveInfo2.playerProperties.heroRace;
        if (saveInfo2.playerProperties.hardcoreMode === true) {
            displayInfo2 += ' <strong>Hardcore</strong>';
        }
    } else {
        displayInfo2 = 'Empty Slot';
    }
    if (localStorage['EncodedSave3']) {
        saveInfo3 = JSON.parse(atob(localStorage['EncodedSave3']));
        displayInfo3 =
            'Level - ' +
            saveInfo3.playerProperties.level +
            ' Race: ' +
            saveInfo3.playerProperties.heroRace;
        if (saveInfo3.playerProperties.hardcoreMode === true) {
            displayInfo3 += ' <strong>Hardcore</strong>';
        }
    } else {
        displayInfo3 = 'Empty Slot';
    }

    html += '<div class="row">';
    html += '<div class ="col-xs-12 newGameButton">';
    html += '<div class="btn-group-vertical" role="group" aria-label="New game, load game">';
    html += '<div class="row">';
    html += '<div class ="col-xs-12">';
    html +=
        '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="' +
        loadGameSlot1 +
        '">Load game 1</button> ' +
        displayInfo;
    html += '</div>';
    html += '<div class ="col-xs-12">';
    html +=
        '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="' +
        loadGameSlot2 +
        '">Load Game 2</button> ' +
        displayInfo2;
    html += '</div>';
    html += '<div class ="col-xs-12">';
    html +=
        '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="' +
        loadGameSlot3 +
        '">Load Game 3</button> ' +
        displayInfo3;
    html += '</div>';
    html += '<div class ="col-xs-12">';
    html +=
        '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="' +
        loadGameSlot0 +
        '">Load Game 0</button> ' +
        displayInfo0;
    html += '</div>';
    html += '</div></div>';
    html +=
        '<button type="button" class="btn btn-default border startBackButtonMargin" onclick="backToStartingScreen()">Go Back</button>';
    html += '</div></div>';

    document.getElementById('raceCreation').innerHTML = html;
}

function backToStartingScreen() {
    var divStyle4 = document.getElementById('raceDiv'); // Race select screen
    divStyle4.style.display = 'none';
    var divStyle3 = document.getElementById('startingScreen'); // Starting buttons: new game/ load game/ sound button etc
    divStyle3.style.display = 'block'; // none = not displayed
    startingScreen();
    changeMusicImage();
}

function characterCreationCreateBackground() {
    var divStyle = document.getElementById('loadingContainer'); // Whole background of starting screen "a container"
    divStyle.style.display = 'block'; //block = display it
    var divStyle3 = document.getElementById('startingScreen'); // Starting buttons: new game/ load game/ sound button etc
    divStyle3.style.display = 'none'; // none = not displayed
    var divStyle4 = document.getElementById('raceDiv'); // Race select screen
    divStyle4.style.display = 'block';
    var divStyle5 = document.getElementById('sliderDivID'); // Race select screen
    divStyle5.style.display = 'none';
    var divStyle6 = document.getElementById('raceText'); // Race select screen
    divStyle6.style.display = 'none';
}
function characterCreationCreateBackground2() {
    var divStyle = document.getElementById('loadingContainer'); // Whole background of starting screen "a container"
    divStyle.style.display = 'block'; //block = display it
    var divStyle3 = document.getElementById('startingScreen'); // Starting buttons: new game/ load game/ sound button etc
    divStyle3.style.display = 'none'; // none = not displayed
    var divStyle4 = document.getElementById('raceDiv'); // Race select screen
    divStyle4.style.display = 'block';
}

function removeStartingScreen() {
    var divStyle = document.getElementById('loadingContainer');
    divStyle.style.display = 'none';
    var divStyle2 = document.getElementById('startingGameContainer');
    divStyle2.style.display = 'none';
}
function characterCreationHtml() {
    characterCreationCreateBackground2();
    if (player.properties.heroRace === '') {
        // If you press "New game" race property will be empty, allowing you to pick a race, otherwise you will load a game with a race already picked :)
        var html = '';
        var html2 = '';
        html2 += '<div class="row">';
        html2 += '<div class="col-xs-6 col-xs-offset-3">';
        html2 +=
            'Press ' +
            '<p class="glyphicon glyphicon-info-sign" style="color:black"></p>' +
            ' for more info about a class.';
        html2 += '</div></div>';
        html += '<div class="row">';
        html += '<div class="col-xs-12 col-xs-offset-1">';
        html += '<div class="row">';
        for (var hero in characterRaces) {
            if (characterRaces.hasOwnProperty(hero)) {
                var heroRace = characterRaces[hero];
                var onclickevent = "changeRace('" + heroRace.name + "', '" + hero + "');";
                html += '<div class="col-xs-6 col-xs-offset-2">';
                html += '<img src="images/races/' + heroRace.image() + '.png">';
                html += heroRace.name + ' ';
                html +=
                    '<a class="tooltips">' +
                    '<p class="glyphicon glyphicon-info-sign" style="color:black"></p>' +
                    '<span style="width:350px; left: 110px; bottom:-30px; text-align:left;">' +
                    '<div class="row">' +
                    '<div class="col-xs-10 col-xs-offset-1">' +
                    heroRace.name +
                    '</div></div>' +
                    '<div class="row">' +
                    '<div class="col-xs-5" style="padding-left:46px;">';
                for (var stat in heroRace) {
                    if (heroRace.hasOwnProperty(stat)) {
                        if (
                            'strength, endurance, agility, dexterity, wisdom, intelligence, luck'.indexOf(
                                stat
                            ) !== -1
                        ) {
                            html += stat.substring(0, 3).capitalizeFirstLetter() + ': ';
                            for (var i = 0; i < heroRace[stat](); i++) {
                                if (heroRace[stat]() >= 6) {
                                    html += '<font color="orange">+</font>';
                                } else if (heroRace[stat]() >= 4) {
                                    html += '<font color="green">+</font>';
                                } else if (heroRace[stat]() === 3) {
                                    html += '<font color="blue">+</font>';
                                } else if (heroRace[stat]() < 3) {
                                    html += '<font color="red">+</font>';
                                }
                            }
                            html += '<br />';
                        }
                    }
                }
                html += '</div>';
                html += '<div class="col-xs-7">';
                html += 'Bonuses:<br />';
                for (stat in heroRace) {
                    // var stat is being declared already, so this one is without a 'var'...
                    if (heroRace.hasOwnProperty(stat)) {
                        if (
                            'raceAllStats, raceGoldDrop, raceExpRate, raceDropRate, raceEvasion, raceDamage, raceHealth, raceAccuracy, raceDefense, raceManaRegen, raceMaxMana, raceCriticalChance, raceSpellPower'.indexOf(
                                stat
                            ) != -1
                        ) {
                            var string = stat.substring('race'.length);
                            if (stat === 'raceAccuracy' && heroRace[stat]() > 111) {
                                html += 'Never Miss<br />';
                            } else if (
                                stat === 'raceEvasion' &&
                                heroRace[stat]() === "Can't evade"
                            ) {
                                html += "Can't Evade";
                            } else {
                                html += string.replace(/([a-z])([A-Z])/g, '$1 $2') + ': '; //remove part of the string which start from lower case "race", and add space before each upper case, changing raceMaxMana to "Max Mana"
                                if (heroRace[stat]() > 0) {
                                    html += '+';
                                }
                                html += heroRace[stat]() + '%' + '<br />';
                            }
                        }
                    }
                }
                html += '<br /><img src="images/races/' + heroRace.image() + '.png">';
                html += '</div>';
                html += '</div>';
                html += '<div class="row">';
                html += '<div class="col-xs-10 col-xs-offset-1">';
                html += '<br /><font color="#CC6633">' + heroRace.lore() + '</font>';
                html += '</div>' + '</div>' + '</span>' + '</a>';
                html += '</div>';
                html += '<div class="col-xs-2">';
                html +=
                    '<button type="button" style="margin-bottom:5px;" class="btn btn-default border" class="' +
                    heroRace.name +
                    '" onclick="' +
                    onclickevent +
                    '">Choose</button>'; //changeRace function ._.
                html += '</div>';
            }
        }
        html += '<div class="row">';
        html += '<div class="col-xs-2 col-xs-offset-5">';
        html +=
            '<button type="button" class="btn btn-default border startBackButtonMargin" onclick="newGameSlot()">Go Back</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        document.getElementById('raceCreation').innerHTML = html;
        document.getElementById('raceText').innerHTML = html2;
    }
    var divStyle2 = document.getElementById('sliderDivID');
    divStyle2.style.display = 'block';
    checkHeroRace();
}
function checkHeroRace() {
    var html = '';
    for (var hero in characterRaces) {
        var heroRace = characterRaces[hero];
        if (player.properties.heroRace === heroRace.name) {
            html +=
                '<a href="#" class="tooltipA">' +
                '<img src="images/races/' +
                heroRace.image() +
                '.png">' +
                '<span style="width:350px; right: 10%; top:10px; text-align:left;">' +
                '<div class="row">' +
                '<div class="col-xs-10 col-xs-offset-1">' +
                heroRace.name +
                '</div></div>' +
                '<div class="row">' +
                '<div class="col-xs-5" style="padding-left:46px;">';
            for (var stat in heroRace) {
                if (
                    'strength, endurance, agility, dexterity, wisdom, intelligence, luck'.indexOf(
                        stat
                    ) != -1
                ) {
                    html += stat.substring(0, 3).capitalizeFirstLetter() + ': ';
                    for (var i = 0; i < heroRace[stat](); i++) {
                        if (heroRace[stat]() >= 6) {
                            html += '<font color="orange">+</font>';
                        } else if (heroRace[stat]() >= 4) {
                            html += '<font color="green">+</font>';
                        } else if (heroRace[stat]() === 3) {
                            html += '<font color="blue">+</font>';
                        } else if (heroRace[stat]() < 3) {
                            html += '<font color="red">+</font>';
                        }
                    }
                    html += '<br />';
                }
            }
            html += '</div>';
            html += '<div class="col-xs-7">';
            html += 'Bonuses:<br />';
            for (var stat in heroRace) {
                if (
                    'raceAllStats, raceGoldDrop, raceExpRate, raceDropRate, raceEvasion, raceDamage, raceHealth, raceAccuracy, raceDefense, raceManaRegen, raceMaxMana, raceCriticalChance, raceSpellPower'.indexOf(
                        stat
                    ) != -1
                ) {
                    var string = stat.substring('race'.length);
                    if (stat === 'raceAccuracy' && heroRace[stat]() > 111) {
                        html += 'Never Miss<br />';
                    } else if (stat === 'raceEvasion' && heroRace[stat]() === "Can't evade") {
                        html += "Can't Evade";
                    } else {
                        html += string.replace(/([a-z])([A-Z])/g, '$1 $2') + ': ';
                        if (heroRace[stat]() > 0) {
                            html += '+';
                        }
                        html += heroRace[stat]() + '%' + '<br />';
                    }
                }
            }
            html += '<br /><img src="images/races/' + heroRace.image() + '.png">';
            html += '</div>';
            html += '</div>';
            html += '<div class="row">';
            html += '<div class="col-xs-10 col-xs-offset-1">';
            html += '<br /><font color="#CC6633">' + heroRace.lore() + '</font>';
            html += '</div>' + '</div>' + '</span>' + '</a>';
        }
    }
    document.getElementById('characterRace').innerHTML = html;
    raceStats(); // Function which add all bonuses from races to player properties.
}

function changeMusicImage() {
    var musicImage = document.getElementById('musicImage');
    var musicImage2 = document.getElementById('musicimage2');
    if (musicImage.className === 'glyphicon glyphicon-volume-off') {
        musicImage.className = 'glyphicon glyphicon-volume-up';
    } else {
        musicImage.className = 'glyphicon glyphicon-volume-off';
    }
    if (musicImage2.className === 'glyphicon glyphicon-volume-off') {
        musicImage2.className = 'glyphicon glyphicon-volume-up';
    } else {
        musicImage2.className = 'glyphicon glyphicon-volume-off';
    }
}

function primaryStatUpdate() {
    let rows = '';
    for (var key in primaryStatInfo) {
        var currentBonus = primaryStatInfo[key];
        var statInfo = currentBonus.info;
        var statDisplay2 = currentBonus.type;
        var shortNameDisplay = currentBonus.shortNameDisplay;
        const typeCap = currentBonus.type.capitalizeFirstLetter();

        const isSimpleSpan =
            currentBonus.type === 'damage' ||
            currentBonus.type === 'Stats' ||
            currentBonus.type === 'mana' ||
            currentBonus.type == 'spellPower';
        const statDisplay = isSimpleSpan
            ? `<span id="${statInfo}"></span>`
            : `<span id="${statInfo}"></span>` +
              `<span id="${typeCap}" style="cursor:pointer" onclick="upgrade${typeCap}(event);" data-toggle="tooltip" data-placement="top" title="Increase ${currentBonus.type}">` +
              `<span class="glyphicon glyphicon-plus unselectable"></span></span>`;

        const isWide =
            currentBonus.type === 'damage' ||
            currentBonus.type === 'mana' ||
            currentBonus.type == 'spellPower';

        const statDisplay3 = statDisplay2.capitalizeFirstLetter();
        let iconBlock = '';
        if (
            'Strength, Endurance, Agility, Dexterity, Wisdom, Intelligence, Luck, Damage, Mana, Stats, SpellPower'.indexOf(
                statDisplay3
            ) != -1
        ) {
            iconBlock =
                `<span data-toggle="tooltip" data-placement="top" title="${currentBonus.tooltip}"><img src="images/stat/${statDisplay2}.png"></span><br />` +
                shortNameDisplay;
        }

        rows +=
            (isWide
                ? `<div class="col-xs-12 primaryStatsMargin border darkBackground"><div class="row"><div class="col-xs-6">`
                : `<div class="col-xs-6 primaryStatsMargin border darkBackground"><div class="row"><div class="col-xs-4">`) +
            iconBlock +
            `</div>` +
            (isWide
                ? `<div class="col-xs-6 rightAlign primaryNumberMargin">`
                : `<div class="col-xs-8 rightAlign primaryNumberMargin darkBackground">`) +
            statDisplay +
            ` ` +
            `</div>` +
            `</div>` +
            `</div>`;
    }
    document.getElementById('primaryStat').innerHTML = `<div class="row">${rows}</div>`;
    updateHtml();
}
function secondaryStatUpdate() {
    let rows = '';
    for (var key in secondaryStatInfo) {
        var currentBonus = secondaryStatInfo[key];
        var statInfo = currentBonus.info;
        var number = currentBonus.number;
        var statDisplay;
        if (currentBonus.type === 'Stats' || currentBonus.type === 'Skill points') {
            statDisplay = player.properties[statInfo];
        } else {
            statDisplay = player.functions[statInfo]();
        }
        var statDisplay2 = currentBonus.displayName;
        var background = '';
        if (number === 1) {
            background = 'darkBackground';
        } else if (number === 2) {
            background = 'background';
        }

        let value;
        if (
            currentBonus.type === 'Magic find' ||
            currentBonus.type === 'Gold drop' ||
            currentBonus.type === 'Experience rate'
        ) {
            value = (statDisplay * 100).toFixed(0);
        } else if (currentBonus.type === 'Accuracy' && player.functions.accuracy() > 111) {
            value = 'Max';
        } else if (currentBonus.type === 'Evasion' && player.functions.evasion() === 0) {
            value = 'None';
        } else if (currentBonus.type === 'Crit damage') {
            value = (statDisplay * 100).toFixed(0);
        } else {
            value = statDisplay.toFixed(0);
        }
        let suffix = '';
        if (
            (currentBonus.type === 'Accuracy' && player.functions.accuracy() < 111) ||
            (currentBonus.type === 'Evasion' && player.functions.evasion() > 0)
        ) {
            suffix += '%';
        }
        if (
            currentBonus.isPercent === true &&
            currentBonus.type !== 'Accuracy' &&
            currentBonus.type !== 'Evasion'
        ) {
            suffix += '%';
        }

        rows +=
            `<div class="col-xs-6 primaryStatsMargin border ${background}" style="height:40px;">` +
            `<div class="row">` +
            `<div class="col-xs-8 secondaryStatMargin">` +
            `<span data-toggle="tooltip" data-placement="right" title="${currentBonus.tooltip()}">` +
            `${statDisplay2}:` +
            `</span>` +
            `</div>` +
            `<div class="col-xs-4 rightAlign secondaryStatMargin">` +
            `<span data-toggle="tooltip" data-placement="right" title="${currentBonus.tooltip()}">` +
            `${value}${suffix}` +
            `</span>` +
            `</div>` +
            `</div>` +
            `</div>`;
    }
    document.getElementById('secondaryStat').innerHTML =
        `<div class="row">` +
        `<div class="centerText"><h4>Secondary Stats</h4></div>` +
        rows +
        `</div>`;
    testss();
}

function EquippedItemsEmpty() {
    var html = '';
    html += '<div class="row" style="padding-top: 5px; padding-bottom: 10px;">';
    html += '<div class="centerText"><h4>Equipped Items</h4></div>';
    for (var itemType in emptyItemSlotInfo) {
        if (emptyItemSlotInfo.hasOwnProperty(itemType)) {
            var item = emptyItemSlotInfo[itemType].type;
            var itemEmpty = item + 'Empty';
            if (item === 'talisman' || item === 'helmet' || item === 'amulet') {
                if (item === 'talisman') {
                    html += '<div class="col-xs-10 col-xs-offset-1">';
                    html += '<div class="row">';
                }
                html += '<div class="col-xs-4 marginTest"' + 'id="' + itemEmpty + '">';
                html += '<img src=images/' + itemEmpty + '.png>';
                html += '</div>';
                if (item === 'amulet') {
                    html += '</div>';
                    html += '</div>';
                }
            } else if (item === 'weapon' || item === 'chest' || item === 'shield') {
                if (item === 'weapon') {
                    html += '<div class="col-xs-10 col-xs-offset-1">';
                    html += '<div class="row">';
                }
                html += '<div class="col-xs-4 marginTest"' + 'id="' + itemEmpty + '">';
                html += '<img src=images/' + itemEmpty + '.png>';
                html += '</div>';
                if (item === 'shield') {
                    html += '</div>';
                    html += '</div>';
                }
            } else if (item === 'legs' || item === 'ring') {
                if (item === 'legs') {
                    html += '<div class="col-xs-10 col-xs-offset-1">';
                    html += '<div class="row">';
                    html += '<div class="col-xs-4 marginTest">';
                    html += '</div>';
                }
                html += '<div class="col-xs-4 marginTest"' + 'id="' + itemEmpty + '">';
                html += '<img src=images/' + itemEmpty + '.png>';
                html += '</div>';
                if (item === 'ring') {
                    html += '</div>';
                    html += '</div>';
                }
            } else if (item === 'boots') {
                html += '<div class="col-xs-10 col-xs-offset-1">';
                html += '<div class="row">';
                html += '<div class="col-xs-4 col-xs-offset-4"' + 'id="' + itemEmpty + '">';
                html += '<img src=images/' + itemEmpty + '.png>';
                html += '</div>';
                html += '</div>';
                html += '</div>';
            }
        }
    }
    html += '</div>';
    document.getElementById('equipHtml').innerHTML = html;
}

function checkIfEquippedEmpty() {
    var html = '';
    for (var item in equippedItems) {
        var itemType = equippedItems[item];
        if (itemType.isEquipped === true) {
            var testItem = checkEquippedItemType(item);
            document.getElementById(item + 'Empty').innerHTML = testItem;
        } else if (itemType.isEquipped === false) {
            var currentItem = '<img src=images/' + item + 'Empty' + '.png>';
            document.getElementById(item + 'Empty').innerHTML = currentItem;
        }
    }
}

function checkEquippedItemType(newItem, check) {
    var html = '';
    var item = equippedItems[newItem];
    var itemType = item;
    if (itemType.hasOwnProperty('itemType')) {
        html += '<div id="equippedItem' + itemType.id + '"' + '>';
        html += '<a class="tooltips" style="cursor:pointer;">';
        if (itemType.itemType === 'weapon') {
            html += '<img class="' + itemType.itemType;
        } else {
            html += '<img class="' + itemType.subType;
        }
        html +=
            '"' +
            'src="images/items/' +
            itemType.subType +
            '/' +
            itemType.image +
            '.png" onclick="unequipItem' +
            '(' +
            itemType.id +
            ', ' +
            "'solo'" +
            ')' +
            '" />';
        html += '<span style="width:200px; left:50px; right:0px; bottom:50px;">';
        html += '<div class="row">';
        html += '<div class="col-xs-12">';

        if (itemType.hasOwnProperty('itemType')) {
            var equippedItemDisplay = itemType;
            html += itemTooltipTest(equippedItemDisplay);
            html += '<strong>Currently equipped</strong>';
            html += '</div>';
            html += '</div>';
            html += '</span></a>';
        }
        html += '</div>';
    }
    return html;
}

function saveGameSlot() {
    var html = '';

    var onclickevent =
        'onclick="saveGameFunction' +
        '(' +
        "'manualSave', " +
        player.properties.saveSlot +
        ')' +
        '">';
    var onclickevent2 = 'onclick="load' + '(' + player.properties.saveSlot + ')' + '">';
    html += '<button type="button" class="btn btn-sm btn-default"' + onclickevent;
    html += 'save';
    html += '</button>';
    html += '<button type="button" class="btn btn-sm btn-default"' + onclickevent2;
    html += 'load';
    html += '</button>';
    html += '<button type="button" class="btn btn-sm btn-default" onclick="resetCheck()">';
    html += 'reset';
    html += '</button><br /><br />';
    document.getElementById('saveGameSlot').innerHTML = html;
}

// Shop stock arrays: exported and mutated in place (rerollShopItems clears them
// with .length = 0 instead of reassigning), read by core.js (sortShop) and
// itemDrop.js. The *Amount counters are reassigned primitives -> src/state.js.
export const itemShopWeapon = [];
export const itemShopArmor = [];
export const itemShopAccessory = [];
// weaponAmount/armorAmount/accessoryAmount are reassigned primitives -> state.js
function getShopItem() {
    var shopItemAmount = 100;
    var shopItemLevel = player.properties.level;
    var weaponLevelBonus = 5;
    var armorLevelBonus = 5;
    for (var i = 0; i < shopItemAmount; i++) {
        if (
            itemShopWeapon.length < 20 ||
            itemShopArmor.length < 20 ||
            itemShopAccessory.length < 20
        ) {
            getItemType(shopItemLevel, false);
        } else {
            break;
        }
    }
    createShopTabs();
    displayShopItems(itemShopWeapon);
    displayShopItems(itemShopArmor);
    displayShopItems(itemShopAccessory);
    shopOther();
}
var shopItemTabs = [
    {
        name: 'shopWeapon',
        type: 'weapon',
    },
    {
        name: 'shopArmor',
        type: 'armor',
    },
    {
        name: 'shopAccessory',
        type: 'accessory',
    },
    {
        name: 'shopOther',
        type: 'items',
    },
];

function createShopTabs() {
    const tabs = shopItemTabs.slice(0, 4);
    const navTabs = tabs
        .map(
            (tab, i) =>
                `<li${i === 0 ? ' class="active"' : ''}>` +
                `<a href="#tab_${tab.name}" data-toggle="tab"><span class="icons ${tab.type}" data-toggle="tooltip" data-placement="top" title="${tab.name.capitalizeFirstLetter()}"></span>` +
                `</li>`
        )
        .join('');
    const panes = tabs
        .map(
            (tab, i) =>
                `<div class="tab-pane ${i === 0 ? 'active' : ''}" id="tab_${tab.name}">` +
                `<div id="${tab.name}"></div>` +
                `</div>`
        )
        .join('');

    document.getElementById('shopTabs').innerHTML =
        `<ul class="nav nav-tabs">${navTabs}</ul><div class="tab-content">${panes}</div>`;
}

function displayShopItems(type) {
    // The sort buttons need the category name in their onclick; the target
    // container is chosen from the same three arrays.
    let category = '';
    let containerId = '';
    if (type === itemShopWeapon) [category, containerId] = ['Weapon', 'shopWeapon'];
    else if (type === itemShopArmor) [category, containerId] = ['Armor', 'shopArmor'];
    else if (type === itemShopAccessory) [category, containerId] = ['Accessory', 'shopAccessory'];

    const items = type
        .map((item) => {
            const imgClass = item.itemType === 'weapon' ? item.itemType : item.subType;
            return (
                `<div class="col-xs-3">` +
                `<a class="tooltips" style="cursor:pointer;">` +
                `<label> <input type="radio" name="shopItem" value=${item.id}>` +
                `<img class="${imgClass}, ${item.itemRarity}" src="images/items/${item.subType}/${item.image}.png"/>` +
                `</label>` +
                `<span style="width:300px;left:10px; bottom:40px;">` +
                `<div class="row"><div class="col-xs-10 col-xs-offset-1">` +
                itemTooltipTest(item) +
                `<strong>Left-Click to equip</strong>` +
                `</div></div></span></a>` +
                `<br />${item.shopPrice} Gold` +
                `</div>`
            );
        })
        .join('');

    const html =
        `<div class="row"><div class="col-xs-10 col-xs-offset-1">` +
        `<div class="shopItemBuy"></div>` +
        `<div class="c3">Sort by:<br />` +
        `<button type="button" onclick="sortShop('Value', '${category}')">Value</button>` +
        `<button type="button" onclick="sortShop('Rarity', '${category}')">Rarity</button>` +
        `</div>` +
        `<div class="row"><div class="col-xs-12">` +
        `<div class="c3"><h3>Item Shop</h3></div></div>` +
        items +
        `</div></div></div>`;

    if (containerId) document.getElementById(containerId).innerHTML = html;
    ShopBuyButtons();
}

function ShopBuyButtons() {
    const html =
        `<div class="row"><div class="col-xs-4 col-xs-offset-4">` +
        `<button type="button" class="shopButton" onclick="itemBuy(${state.checkedShopItem})">Buy</button>` +
        `<button type="button" class="shopButton" onclick="rerollShopItems()">Refresh</button>` +
        `</div></div>`;
    $('.shopItemBuy').empty().append(html);
}

function itemBuy(id) {
    var item = itemShopWeapon.filter(function (obj) {
        return obj.id === id;
    })[0];
    if (item !== undefined) {
        if (player.properties.gold - item.shopPrice >= 0) {
            var index = itemShopWeapon.indexOf(item, 0);
            playerInventory.push(item);
            if (index > -1) {
                itemShopWeapon.splice(index, 1);
            }
            displayShopItems(itemShopWeapon);
            state.weaponAmount--;
        }
    }

    if (item === undefined) {
        item = itemShopArmor.filter(function (obj) {
            return obj.id === id;
        })[0];
        if (item !== undefined) {
            if (player.properties.gold - item.shopPrice >= 0) {
                index = itemShopArmor.indexOf(item, 0);
                playerInventory.push(item);

                if (index > -1) {
                    itemShopArmor.splice(index, 1);
                }
                displayShopItems(itemShopArmor);
                state.armorAmount--;
            }
        }
        if (item === undefined) {
            item = itemShopAccessory.filter(function (obj) {
                return obj.id === id;
            })[0];
            if (item !== undefined) {
                if (player.properties.gold - item.shopPrice >= 0) {
                    index = itemShopAccessory.indexOf(item, 0);
                    playerInventory.push(item);

                    if (index > -1) {
                        itemShopAccessory.splice(index, 1);
                    }
                    displayShopItems(itemShopAccessory);
                    state.accessoryAmount--;
                }
            }
        }
    }
    if (item !== undefined && player.properties.gold - item.shopPrice >= 0) {
        player.properties.gold -= item.shopPrice;
        document.getElementById('gold').innerHTML = player.properties.gold;
    }
    CreateInventoryWeaponHtml();
}

function refillShopInterval() {
    if (itemShopArmor.length + itemShopAccessory.length + itemShopWeapon.length < 30) {
        getShopItem();
    }
    setTimeout(refillShopInterval, 10000);
}

function rerollShopItems() {
    itemShopWeapon.length = 0;
    itemShopArmor.length = 0;
    itemShopAccessory.length = 0;
    state.weaponAmount = 0;
    state.armorAmount = 0;
    state.accessoryAmount = 0;
    getShopItem();
}

function shopOther() {
    // Resolve item.type3 (e.g. "backpackStatus") to its status object. Built at
    // runtime (not module scope) so the circular shop<->dynamicHtml imports are
    // initialised. Replaces the former window[item.type3] dynamic global lookup.
    const shopStatusByName = {
        potionStatus,
        mediumPotionStatus,
        superPotionStatus,
        backpackStatus,
        statStatus,
    };
    const buyButton = (type2, amount, label) =>
        `<button type="button" class="buy" onclick="${type2}(${amount})">${label}</button>`;

    const rows = Object.values(shopOtherList)
        .map(
            (item) =>
                `<div class="col-xs-12"><div class="c3">` +
                `<img src=${item.image} alt="Buy"><br />` +
                `${item.type} - ${shopStatusByName[item.type3].price} Gold<br />` +
                buyButton(item.type2, 1, 'Buy') +
                buyButton(item.type2, 10, 'Buy 10') +
                buyButton(item.type2, 100, 'Buy 100') +
                `</div></div>`
        )
        .join('');

    document.getElementById('shopOther').innerHTML =
        `<div class="row"><div class="col-xs-12"><div class="row">${rows}</div></div></div>`;
}

var shopOtherList = [
    {
        type: 'Stat Points',
        image: 'images/stat.png',
        type2: 'buyStat',
        type3: 'statStatus',
    },
    {
        type: 'Backpack',
        image: 'images/bag.png',
        type2: 'buyBackpack',
        type3: 'backpackStatus',
    },
    {
        type: 'Small Potion',
        image: 'images/smallPotion.png',
        type2: 'buySmallPotion',
        type3: 'potionStatus',
    },
    {
        type: 'Medium Potion',
        image: 'images/mediumPotion.png',
        type2: 'buyMediumPotion',
        type3: 'mediumPotionStatus',
    },
    {
        type: 'Super Potion',
        image: 'images/superPotion.png',
        type2: 'buySuperPotion',
        type3: 'superPotionStatus',
    },
];
// setTimeout(testss, 3000) init call moved to initGame() in src/main.js (Phase 3 ESM)
function testss() {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip();
    });
}

function getAgeButton() {
    var raceSelect = 'Adulthood';
    if (document.getElementById('Adulthood').checked === true) {
        raceSelect = 'Adulthood';
    } else if (document.getElementById('Middle Age').checked === true) {
        raceSelect = 'Middle Age';
    } else if (document.getElementById('Old').checked === true) {
        raceSelect = 'Old';
    } else if (document.getElementById('Venerable').checked === true) {
        raceSelect = 'Venerable';
    }
    getAge(raceSelect);
    characterCreationHtml();
}
function getAge(raceSelect) {
    characterRaces.human.raceAge = raceSelect;
    characterRaces.halfElf.raceAge = raceSelect;
    characterRaces.dwarf.raceAge = raceSelect;
    characterRaces.orc.raceAge = raceSelect;
    characterRaces.elf.raceAge = raceSelect;
    characterRaces.halfing.raceAge = raceSelect;
    characterRaces.sylph.raceAge = raceSelect;
    characterRaces.giant.raceAge = raceSelect;
}

function itemTooltipTest(item) {
    var html = '';
    var equippedItemStat = equippedItems[item.subType];
    if (item.itemType === 'weapon') {
        equippedItemStat = equippedItems[item.itemType];
    }
    html += '<font color="' + item.color + '"><strong>' + item.name + '</strong></font>' + '<br />';
    if (item.itemType === 'weapon') {
        html +=
            '<div class="borderBottom borderTop">Weapon class: ' +
            item.subType.capitalizeFirstLetter() +
            '<br />';
        if (item['Bonus damage'] > 0) {
            html +=
                '<strong><font color="#2175D9">' +
                'Damage: ' +
                item.MinDamage +
                ' to ' +
                item.MaxDamage +
                '</font></strong>' +
                '</div>';
        } else {
            html += 'Damage: ' + item.MinDamage + ' to ' + item.MaxDamage + '</div>';
        }
        html +=
            'Average Damage: ' + compare(item.AverageDamage, equippedItemStat.AverageDamage, '');
        html +=
            '<div class="borderBottom borderTop">Critical Chance: ' +
            compare(item['Critical chance'], equippedItemStat['Critical chance'], '%') +
            '</div>';
    }
    if (item.itemType === 'armor') {
        if (item['Bonus armor'] > 0) {
            html +=
                '<div class="borderBottom borderTop"><strong><font color="#1e69c3">Defense: ' +
                compare(item.defense.toFixed(0), equippedItemStat.defense.toFixed(0), '') +
                '</font></strong></div>';
        } else {
            html +=
                '<div class="borderBottom borderTop">Defense: ' +
                compare(item.defense, equippedItemStat.defense, '') +
                ' </div>';
        }
        if (item.subType === 'shield') {
            html +=
                '<div class="borderBottom borderTop">Chance to Block: ' +
                item['Block chance'] +
                '%' +
                ' </div>';
        }
        if (item['Bonus armor'] > 0) {
            html +=
                '<strong><font color="#7FCC7F">' +
                'Bonus armor' +
                ': ' +
                compare(item['Bonus armor'], equippedItemStat['Bonus armor'], '%') +
                '</font></strong>' +
                '<br />';
        }
        html +=
            'Damage reduction: ' +
            (
                100 -
                ((player.properties.prestigeMultiplier * 500) /
                    (player.properties.prestigeMultiplier * 500 +
                        (player.functions.defense() +
                            (item.defense - equippedItems[item.subType].defense)))) *
                    100 -
                (100 -
                    ((player.properties.prestigeMultiplier * 500) /
                        (player.properties.prestigeMultiplier * 500 + player.functions.defense())) *
                        100)
            ).toFixed(2) +
            '%' +
            '<br />';
    }
    for (var statName in item) {
        //Here stat will become the word Defense
        if (item.hasOwnProperty(statName)) {
            if (
                'All attributes, Strength, Endurance, Agility, Dexterity, Wisdom, Intelligence, Luck, Evasion, Bonus damage, Bonus life, Bonus mana, Health regen, Mana regen, Magic find, Gold drop, Experience rate, Life gain on hit, Critical damage'.indexOf(
                    statName
                ) !== -1
            ) {
                //Getting the actual stat object from the word.
                var selectedStat = item[statName];
                var equippedItemTest = equippedItemStat[statName];
                if (
                    statName === 'Bonus damage' ||
                    statName === 'Magic find' ||
                    statName === 'Gold drop' ||
                    statName === 'Experience rate'
                ) {
                    if (selectedStat > 0) {
                        html +=
                            '<strong><font color="#0066FF">' +
                            statName +
                            ': ' +
                            compare(selectedStat, equippedItemTest, '%') +
                            '</font></strong>' +
                            '<br />';
                    }
                    if (selectedStat === 0 && equippedItemTest > 0) {
                        html +=
                            '<strong><font color="#0066FF">' +
                            statName +
                            ': ' +
                            compare(selectedStat, equippedItemTest, '%') +
                            '</font></strong>' +
                            '<br />';
                    }
                } else {
                    if (selectedStat > 0) {
                        html +=
                            '<strong><font color="#0066FF">' +
                            statName +
                            ': ' +
                            compare(selectedStat, equippedItemTest, '') +
                            '</font></strong>' +
                            '<br />';
                    }
                    if (selectedStat === 0 && equippedItemTest > 0) {
                        html +=
                            '<strong><font color="#0066FF">' +
                            statName +
                            ': ' +
                            compare(selectedStat, equippedItemTest, '') +
                            '</font></strong>' +
                            '<br />';
                    }
                }
            }
        }
    }
    html += '<div class="borderBottom borderTop">';
    html += 'Value: ' + item.Value + ' gold<br />';
    html += 'Item level: ' + item.iLvl + '<br />';
    html += '<font color="#CC6633">' + item.lore + '</font>';
    html += '</div>';
    return html;
}

function activeBuffsHtml() {
    let buffs = '';
    for (var key in player.buffs) {
        if (player.buffs.hasOwnProperty(key)) {
            if (player.buffs[key].timer > 0) {
                var buff = player.buffs[key];
                buffs +=
                    `<div class="col-xs-2">` +
                    (buff.amount > 0
                        ? `<img src="images/buffs/${key}.png" data-toggle="tooltip" data-placement="right" title="${key} ${buff.amount * 100}%">` +
                          ` <br /> ${buff.timer} turns`
                        : '') +
                    `</div>`;
            }
        }
    }
    document.getElementById('activeBuffs').innerHTML =
        `<div class="row"><div class="col-xs-10 col-xs-offset-1"><div class="row">${buffs}</div></div></div>`;
    updateHtml();
}

function getMonsterTooltip(monster) {
    let html =
        `<b>${monster.displayName}</b>` +
        `<br />` +
        `Level: ${monster.level}` +
        `<br />` +
        `Dmg: ${getThousands(monster.minDmg())} - ${getThousands(monster.maxDmg())}` +
        `<br />` +
        `Def: ${getThousands(monster.def() * player.functions.ignoreDefense())}`;
    if (player.functions.ignoreDefense() < 1) {
        html += `(Ignored ${100 - 100 * player.functions.ignoreDefense()}%)`;
    }
    return html;
}

// Re-expose all top-level render/UI functions on window: these were auto-globals
// as a classic <script> and are called by hundreds of inline onclick handlers in
// the generated HTML, by initGame() (startingScreen/startLogo/testss), and by
// other modules (core.js, save.js, gameObjects.js call primaryStatUpdate/
// secondaryStatUpdate/CreateInventoryWeaponHtml/EquippedItemsEmpty/saveGameSlot/
// CreateMonsterHtml/...). String.prototype.capitalizeFirstLetter is a prototype
// method (already global) and the shop-stock arrays are shared via window above.
// (Phase 3 ESM transition bridge.)
// Cross-module (non-onclick) render functions are exported and imported by their
// callers. Only inline-onclick handlers stay on window: changeMonsterPage,
// CreateInventoryWeaponHtml, newGameSlot, loadGameSlot, backToStartingScreen,
// changeMusicImage, itemBuy, rerollShopItems, getAgeButton, getAge, and
// changedTabmonster (generated onClick). The internal-only helpers
// (changeTabWeapon, changedTabInventory, characterCreationCreateBackground(2),
// checkEquippedItemType, getShopItem, createShopTabs, itemTooltipTest(2),
// getMonsterTooltip) are no longer exposed.
export {
    CreateWeaponSkillHtml,
    CreateMonsterHtml,
    checkBoxHtml,
    unequipItemLoad,
    CreatePlayerSkillsHtml,
    startLogo,
    startingScreen,
    removeStartingScreen,
    characterCreationHtml,
    checkHeroRace,
    primaryStatUpdate,
    secondaryStatUpdate,
    EquippedItemsEmpty,
    checkIfEquippedEmpty,
    displayShopItems,
    ShopBuyButtons,
    refillShopInterval,
    shopOther,
    testss,
    activeBuffsHtml,
    saveGameSlot,
    // Also exported (kept on window below too for their inline onclick) because
    // they are additionally called cross-module by bare name:
    CreateInventoryWeaponHtml,
    changedTabmonster,
};
Object.assign(window, {
    changeMonsterPage,
    CreateInventoryWeaponHtml,
    newGameSlot,
    loadGameSlot,
    backToStartingScreen,
    changeMusicImage,
    itemBuy,
    rerollShopItems,
    getAgeButton,
    getAge,
    changedTabmonster,
});
