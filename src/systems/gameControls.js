'use strict';

// Player-facing game controls, extracted from core/core.js: monster-button
// lockout (disableButtons), sell-filter checkboxes, hardcore toggle, race
// pick, audio controls, passive-skill reset, shop sorting + the shop radio
// change listener, difficulty change and rebirth. All inline-onclick handlers,
// registered on window below.
import { player } from '../core/core.js';
import { state } from '../core/state.js';
import { playerPassive } from '../data/skills.js';
import { characterRaces, monsterAreas } from '../data/gameObjects.js';
import { monsterList, MakeMonsterList } from '../data/monsterList.js';
import { quest } from './quest.js';
import { getStartingItem } from './equip.js';
import { CreateMonsterHtml, changedTabmonster } from '../ui/monsterUI.js';
import { CreatePlayerSkillsHtml, primaryStatUpdate, secondaryStatUpdate } from '../ui/panelsUI.js';
import {
    ShopBuyButtons,
    displayShopItems,
    itemShopAccessory,
    itemShopArmor,
    itemShopWeapon,
} from '../ui/shopUI.js';
import { checkHeroRace, removeStartingScreen } from '../ui/characterUI.js';

var number = 1;
function disableButtons() {
    // The class toggles are identical in both branches; only the cursor differs.
    var cursor = number === 1 ? 'not-allowed' : 'pointer';
    document.querySelectorAll('a#monsterButton').forEach(function (el) {
        el.style.cursor = cursor;
    });
    document.querySelectorAll('img.monster').forEach(function (el) {
        el.classList.toggle('buttonDisable');
    });
    document.querySelectorAll('button.monsterButtonDisable').forEach(function (el) {
        el.classList.toggle('buttonDisable');
        el.classList.toggle('backgroundRed');
    });
    document.querySelectorAll('li.monsterNavBar').forEach(function (el) {
        el.classList.toggle('buttonDisable');
    });
    document.querySelectorAll('li.monsterNavBar > a').forEach(function (el) {
        el.classList.toggle('backgroundRed');
    });
    number = number === 1 ? 2 : 1;
}
// checkBox* drop/sell-filter flags and hardcoreMode are shared mutable primitives
// on the `state` object (src/state.js).
function handleClick() {
    state.checkBoxCommon = document.getElementById('common').checked;
    state.checkBoxUncommon = document.getElementById('uncommon').checked;
    state.checkBoxRare = document.getElementById('rare').checked;
    state.checkBoxEpic = document.getElementById('epic').checked;
    state.checkBoxLegendary = document.getElementById('legendary').checked;
}
function hardcoreModeCheck() {
    state.hardcoreMode = document.getElementById('hardcoreMode').checked;
}

function changeRace(raceName, race) {
    var characterRace = '';
    var itemType = characterRaces[race].startingItem;
    characterRace = raceName;
    player.properties.heroRace = characterRace;
    removeStartingScreen();
    checkHeroRace();
    getStartingItem(itemType);
}
//Set audio starting volume...
function myAudio(sound) {
    var myAudio = document.getElementById('myAudio');
    myAudio.volume = 0.1;
    if (player.properties.sound === 'on' || sound === 'off') {
        myAudio.play();
        player.properties.sound = 'on';
    }
    if (player.properties.sound === 'off') {
        myAudio.pause();
        player.properties.sound = 'off';
    }
}

function muteAudio() {
    var audio = document.getElementById('myAudio');
    if (audio.muted === true) {
        audio.muted = false;
    } else if (audio.muted === false) {
        audio.muted = true;
    }
}
function selectText(containerid) {
    if (document.selection) {
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById(containerid));
        range.select();
    } else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(document.getElementById(containerid));
        window.getSelection().addRange(range);
    }
}
function resetPassiveSkills() {
    for (var key in playerPassive) {
        if (playerPassive.hasOwnProperty(key)) {
            playerPassive[key].level = 0;
        }
    }
    player.properties.skillPoints = player.properties.level - 1;
    CreatePlayerSkillsHtml();
    primaryStatUpdate();
    secondaryStatUpdate();
}
// Delegated change handler for the shop radio buttons (vanilla equivalent of
// jQuery's $(document).on('change', 'input[name="shopItem"]', ...)).
document.addEventListener('change', function (e) {
    if (e.target && e.target.matches && e.target.matches('input[name="shopItem"]')) {
        state.checkedShopItem = parseInt(e.target.value, 10);
        ShopBuyButtons();
    }
});

function sortShop(type, itemType) {
    var itemSort = [];
    if (itemType === 'Weapon') {
        itemSort = itemShopWeapon;
    } else if (itemType === 'Armor') {
        itemSort = itemShopArmor;
    } else if (itemType === 'Accessory') {
        itemSort = itemShopAccessory;
    }
    if (type === 'Value') {
        itemSort.sort(function (a, b) {
            return b.shopPrice - a.shopPrice;
        });
    } else if (type === 'Rarity') {
        itemSort.sort(function (a, b) {
            return b.rarityValue - a.rarityValue;
        });
    }
    displayShopItems(itemShopWeapon);
    displayShopItems(itemShopArmor);
    displayShopItems(itemShopAccessory);
}
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
            var monsterNumber = monster.id - 1;
            monster.killCount = monsterKillCount[monsterNumber];
        }
    }
    monsterKillCount = [];
    CreateMonsterHtml();
    quest();
    document.getElementById('gameDifficulty').innerHTML = 'Current Difficulty: ' + type;
}

function rebirth(level) {
    player.properties.prestigeMultiplier += 1.2;
    player.properties.prestigeSuffix = '(Warped)';
    player.properties.monsterLevel = level;
    player.properties.monsterBackground = '#DD4747';
    for (var i = 1; i < monsterAreas.length; i++) {
        //Starts with i = 1, so it wont change first array value, which is needed to display first area.
        monsterAreas[i].isUnlocked = false;
    }
    changeDifficulty('Hero', true);
    changedTabmonster(0);
}

Object.assign(window, {
    disableButtons,
    handleClick,
    hardcoreModeCheck,
    changeRace,
    muteAudio,
    selectText,
    resetPassiveSkills,
    changeDifficulty,
    rebirth,
    sortShop,
    myAudio,
});
