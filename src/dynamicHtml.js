'use strict';
import { characterRaces, raceStats } from './gameObjects.js';
import { player, playerInventory } from './core.js';
import { state } from './state.js';
import { getItemType } from './itemDrop.js';
import { pageReload } from './save.js';
import {
    potionStatus,
    mediumPotionStatus,
    superPotionStatus,
    backpackStatus,
    statStatus,
} from './shop.js';
import { testss } from './uiCommon.js';
// Shop renderers below still call these inventory helpers; imported from the
// extracted inventoryUI.js. (Move to shopUI.js in the next split step.)
import { itemTooltipTest, CreateInventoryWeaponHtml } from './inventoryUI.js';

//Adds a logo to the starting screen
function startLogo() {
    document.getElementById('gameLogo').innerHTML =
        `<div class="row"><div class ="col-xs-12"></div></div>`;
}

//This screen shows up everytime you load a page...
function startingScreen() {
    var myAudio = document.getElementById('myAudio');
    document.getElementById('buttonDiv').innerHTML =
        `<div class="row">` +
        `<div class="col-xs-6 col-xs-3">` +
        `<div class="btn-group-vertical" role="group" aria-label="New game, load game">` +
        `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="newGameSlot();">New Game</button>` +
        `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="loadGameSlot();">Load</button>` +
        `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="resetallSavesCheck();">Reset all saves</button>` +
        `<label><input type="checkbox" id="hardcoreMode" style ="visibility:visible; position:relative;" onclick="hardcoreModeCheck();">Hardcore Mode?</label>` +
        `</div>` +
        `<button type="button" class="btn btn-default shopButton" onclick="muteAudio();changeMusicImage();""><span id="musicImage" class="glyphicon glyphicon-volume-up" aria-hidden="true"></span></button>` +
        `</div>` +
        `</div>` +
        `<div class="row" style="position:relative; left:-30%;">` +
        `<div class="col-xs-8 col-xs-offset-2">` +
        `<h4>If you are unable to start a game, use button above to reset all saves.If you see this message first time, then you should reset your save, since its a new update which change a lot.</h4>` +
        `</div>` +
        `</div>`;
    myAudio.volume = 0.1;
    myAudio.play();
}
// startingScreen()/startLogo() init calls moved to initGame() in src/main.js (Phase 3 ESM)

function newGameSlot() {
    changeMusicImage();
    characterCreationCreateBackground();
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

    document.getElementById('raceCreation').innerHTML =
        `<div class="row">` +
        `<div class ="col-xs-12 newGameButton">` +
        `<div class="btn-group-vertical" role="group" aria-label="New game, load game">` +
        `<div class="row">` +
        `<div class ="col-xs-12">` +
        `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="newGame(1);">New game 1</button> ${displayInfo}` +
        `</div>` +
        `<div class ="col-xs-12">` +
        `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="newGame(2);">New Game 2</button> ${displayInfo2}` +
        `</div>` +
        `<div class ="col-xs-12">` +
        `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="newGame(3);">New Game 3</button> ${displayInfo3}` +
        `</div>` +
        `<div class ="col-xs-12">` +
        `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="newGame(0);">New game 0</button> ${displayInfo0}` +
        `</div>` +
        `</div></div>` +
        `<button type="button" class="btn btn-default border startBackButtonMargin" onclick="backToStartingScreen()">Go Back</button>` +
        `</div></div>`;
    //document.getElementById("raceText").innerHTML = html2
}

function loadGameSlot() {
    characterCreationCreateBackground();
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

    document.getElementById('raceCreation').innerHTML =
        `<div class="row">` +
        `<div class ="col-xs-12 newGameButton">` +
        `<div class="btn-group-vertical" role="group" aria-label="New game, load game">` +
        `<div class="row">` +
        `<div class ="col-xs-12">` +
        `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="loadGame(1);">Load game 1</button> ${displayInfo}` +
        `</div>` +
        `<div class ="col-xs-12">` +
        `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="loadGame(2);">Load Game 2</button> ${displayInfo2}` +
        `</div>` +
        `<div class ="col-xs-12">` +
        `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="loadGame(3);">Load Game 3</button> ${displayInfo3}` +
        `</div>` +
        `<div class ="col-xs-12">` +
        `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" onclick="loadGame(0);">Load Game 0</button> ${displayInfo0}` +
        `</div>` +
        `</div></div>` +
        `<button type="button" class="btn btn-default border startBackButtonMargin" onclick="backToStartingScreen()">Go Back</button>` +
        `</div></div>`;
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

function saveGameSlot() {
    const slot = player.properties.saveSlot;
    document.getElementById('saveGameSlot').innerHTML =
        `<button type="button" class="btn btn-sm btn-default"onclick="saveGameFunction('manualSave', ${slot})">save</button>` +
        `<button type="button" class="btn btn-sm btn-default"onclick="load(${slot})">load</button>` +
        `<button type="button" class="btn btn-sm btn-default" onclick="resetCheck()">reset</button><br /><br />`;
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
    startLogo,
    startingScreen,
    removeStartingScreen,
    characterCreationHtml,
    checkHeroRace,
    displayShopItems,
    ShopBuyButtons,
    refillShopInterval,
    shopOther,
    testss,
    saveGameSlot,
};
// Renderers now living in focused modules, re-exported here so existing importers
// (battle/core/quest/save/stats/gameObjects/potionsHotbar) keep importing from
// dynamicHtml.js. The UI modules self-register their onclick handlers on window.
export { CreateMonsterHtml, changedTabmonster } from './monsterUI.js';
export {
    CreateWeaponSkillHtml,
    checkBoxHtml,
    CreatePlayerSkillsHtml,
    primaryStatUpdate,
    secondaryStatUpdate,
    activeBuffsHtml,
} from './panelsUI.js';
export {
    CreateInventoryWeaponHtml,
    unequipItemLoad,
    EquippedItemsEmpty,
    checkIfEquippedEmpty,
} from './inventoryUI.js';
Object.assign(window, {
    newGameSlot,
    loadGameSlot,
    backToStartingScreen,
    changeMusicImage,
    itemBuy,
    rerollShopItems,
    getAgeButton,
    getAge,
});
