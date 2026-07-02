'use strict';

// Starting screen / save-slot / character-creation rendering, extracted from
// dynamicHtml.js. startLogo/startingScreen/removeStartingScreen/characterCreationHtml/
// checkHeroRace/saveGameSlot are imported cross-module (main/core/save) and
// re-exported via dynamicHtml.js. The inline-onclick handlers (newGameSlot,
// loadGameSlot, backToStartingScreen, changeMusicImage, getAgeButton, getAge)
// self-register on window. characterCreationHtml/checkHeroRace still use
// string-concatenation on purpose (imperative per-stat glyph builders).
import { characterRaces, raceStats } from './gameObjects.js';
import { player } from './core.js';
import { pageReload } from './save.js';

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
        let html = '';
        const html2 =
            `<div class="row">` +
            `<div class="col-xs-6 col-xs-offset-3">` +
            `Press <p class="glyphicon glyphicon-info-sign" style="color:black"></p> for more info about a class.` +
            `</div></div>`;
        html += `<div class="row">`;
        html += `<div class="col-xs-12 col-xs-offset-1">`;
        html += `<div class="row">`;
        for (var hero in characterRaces) {
            if (characterRaces.hasOwnProperty(hero)) {
                var heroRace = characterRaces[hero];
                var onclickevent = `changeRace('${heroRace.name}', '${hero}');`;
                html += `<div class="col-xs-6 col-xs-offset-2">`;
                html += `<img src="images/races/${heroRace.image()}.png">`;
                html += `${heroRace.name} `;
                html +=
                    `<a class="tooltips">` +
                    `<p class="glyphicon glyphicon-info-sign" style="color:black"></p>` +
                    `<span style="width:350px; left: 110px; bottom:-30px; text-align:left;">` +
                    `<div class="row">` +
                    `<div class="col-xs-10 col-xs-offset-1">${heroRace.name}</div></div>` +
                    `<div class="row">` +
                    `<div class="col-xs-5" style="padding-left:46px;">`;
                for (var stat in heroRace) {
                    if (heroRace.hasOwnProperty(stat)) {
                        if (
                            'strength, endurance, agility, dexterity, wisdom, intelligence, luck'.indexOf(
                                stat
                            ) !== -1
                        ) {
                            const count = heroRace[stat]();
                            html += `${stat.substring(0, 3).capitalizeFirstLetter()}: `;
                            for (var i = 0; i < count; i++) {
                                if (count >= 6) {
                                    html += `<font color="orange">+</font>`;
                                } else if (count >= 4) {
                                    html += `<font color="green">+</font>`;
                                } else if (count === 3) {
                                    html += `<font color="blue">+</font>`;
                                } else if (count < 3) {
                                    html += `<font color="red">+</font>`;
                                }
                            }
                            html += `<br />`;
                        }
                    }
                }
                html += `</div>`;
                html += `<div class="col-xs-7">`;
                html += `Bonuses:<br />`;
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
                                html += `Never Miss<br />`;
                            } else if (
                                stat === 'raceEvasion' &&
                                heroRace[stat]() === "Can't evade"
                            ) {
                                html += `Can't Evade`;
                            } else {
                                html += `${string.replace(/([a-z])([A-Z])/g, '$1 $2')}: `; //remove part of the string which start from lower case "race", and add space before each upper case, changing raceMaxMana to "Max Mana"
                                if (heroRace[stat]() > 0) {
                                    html += `+`;
                                }
                                html += `${heroRace[stat]()}%<br />`;
                            }
                        }
                    }
                }
                html += `<br /><img src="images/races/${heroRace.image()}.png">`;
                html += `</div>`;
                html += `</div>`;
                html += `<div class="row">`;
                html += `<div class="col-xs-10 col-xs-offset-1">`;
                html += `<br /><font color="#CC6633">${heroRace.lore()}</font>`;
                html += `</div></div></span></a>`;
                html += `</div>`;
                html += `<div class="col-xs-2">`;
                html += `<button type="button" style="margin-bottom:5px;" class="btn btn-default border" class="${heroRace.name}" onclick="${onclickevent}">Choose</button>`; //changeRace function ._.
                html += `</div>`;
            }
        }
        html += `<div class="row">`;
        html += `<div class="col-xs-2 col-xs-offset-5">`;
        html += `<button type="button" class="btn btn-default border startBackButtonMargin" onclick="newGameSlot()">Go Back</button>`;
        html += `</div>`;
        html += `</div>`;
        html += `</div>`;
        html += `</div>`;
        html += `</div>`;
        document.getElementById('raceCreation').innerHTML = html;
        document.getElementById('raceText').innerHTML = html2;
    }
    var divStyle2 = document.getElementById('sliderDivID');
    divStyle2.style.display = 'block';
    checkHeroRace();
}
function checkHeroRace() {
    let html = '';
    for (var hero in characterRaces) {
        var heroRace = characterRaces[hero];
        if (player.properties.heroRace === heroRace.name) {
            html +=
                `<a href="#" class="tooltipA">` +
                `<img src="images/races/${heroRace.image()}.png">` +
                `<span style="width:350px; right: 10%; top:10px; text-align:left;">` +
                `<div class="row">` +
                `<div class="col-xs-10 col-xs-offset-1">${heroRace.name}</div></div>` +
                `<div class="row">` +
                `<div class="col-xs-5" style="padding-left:46px;">`;
            for (var stat in heroRace) {
                if (
                    'strength, endurance, agility, dexterity, wisdom, intelligence, luck'.indexOf(
                        stat
                    ) != -1
                ) {
                    const count = heroRace[stat]();
                    html += `${stat.substring(0, 3).capitalizeFirstLetter()}: `;
                    for (var i = 0; i < count; i++) {
                        if (count >= 6) {
                            html += `<font color="orange">+</font>`;
                        } else if (count >= 4) {
                            html += `<font color="green">+</font>`;
                        } else if (count === 3) {
                            html += `<font color="blue">+</font>`;
                        } else if (count < 3) {
                            html += `<font color="red">+</font>`;
                        }
                    }
                    html += `<br />`;
                }
            }
            html += `</div>`;
            html += `<div class="col-xs-7">`;
            html += `Bonuses:<br />`;
            for (var stat in heroRace) {
                if (
                    'raceAllStats, raceGoldDrop, raceExpRate, raceDropRate, raceEvasion, raceDamage, raceHealth, raceAccuracy, raceDefense, raceManaRegen, raceMaxMana, raceCriticalChance, raceSpellPower'.indexOf(
                        stat
                    ) != -1
                ) {
                    var string = stat.substring('race'.length);
                    if (stat === 'raceAccuracy' && heroRace[stat]() > 111) {
                        html += `Never Miss<br />`;
                    } else if (stat === 'raceEvasion' && heroRace[stat]() === "Can't evade") {
                        html += `Can't Evade`;
                    } else {
                        html += `${string.replace(/([a-z])([A-Z])/g, '$1 $2')}: `;
                        if (heroRace[stat]() > 0) {
                            html += `+`;
                        }
                        html += `${heroRace[stat]()}%<br />`;
                    }
                }
            }
            html += `<br /><img src="images/races/${heroRace.image()}.png">`;
            html += `</div>`;
            html += `</div>`;
            html += `<div class="row">`;
            html += `<div class="col-xs-10 col-xs-offset-1">`;
            html += `<br /><font color="#CC6633">${heroRace.lore()}</font>`;
            html += `</div></div></span></a>`;
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

export {
    startLogo,
    startingScreen,
    removeStartingScreen,
    characterCreationHtml,
    checkHeroRace,
    saveGameSlot,
};
Object.assign(window, {
    newGameSlot,
    loadGameSlot,
    backToStartingScreen,
    changeMusicImage,
    getAgeButton,
    getAge,
});
