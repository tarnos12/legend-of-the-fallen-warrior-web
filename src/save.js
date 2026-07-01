"use strict";
import { weaponMastery } from './weaponMastery.js';
import { playerPassive } from './skills.js';
import { characterRaces } from './gameObjects.js';
import { playerProfession, unlockMineral, unlockHerb, createAlchemyHtml, playerProfessionHtml, craftingHtml } from './professions.js';
import { player, equippedItems, defaultValues, playerInventory, Log, currentGameVersion } from './core.js';
import { monsterList, MakeMonsterList } from './monsterList.js';
import { state } from './state.js';
import { updateHtml, expPercent, healthPercent, playerHealthBar, manaRegen, loadIsEquipped } from './stats.js';
import { playerReviveCheck } from './intervalFunctions.js';
import { quest } from './quest.js';
import { createPotionInventory, CreatePlayerHotBar } from './potionsHotbar.js';
import { updateBar } from './battle.js';
import { backpackStatus, statStatus } from './shop.js';
import { CreateWeaponSkillHtml, CreateMonsterHtml, checkBoxHtml, unequipItemLoad, CreatePlayerSkillsHtml, removeStartingScreen, characterCreationHtml, primaryStatUpdate, secondaryStatUpdate, EquippedItemsEmpty, checkIfEquippedEmpty, refillShopInterval, shopOther, saveGameSlot } from './dynamicHtml.js';
// Map a save slot (0-3) to its localStorage key. Slot 0 historically uses the
// bare key "EncodedSave"; slots 1-3 append the number.
function saveKeyForSlot(slot) {
    return slot === 0 ? 'EncodedSave' : 'EncodedSave' + slot;
}
function saveGameFunction(saveType, slot) {
    var d = new Date();
    var hour = d.getHours();
    var minute = d.getMinutes();
    var second = d.getSeconds();
    if (hour < 10) {
        hour = "0" + d.getHours();
    };
    if (minute < 10) {
        minute = "0" + d.getMinutes();
    };
    if (second < 10) {
        second = "0" + d.getSeconds();
    };
    document.getElementById("saveTime").innerHTML = "Last saved: " + hour + ":" + minute + ":" + second;
    var saveGame = {
        playerProperties: player.properties,
        //Equipped Items
        inventory: playerInventory,
        //Other
        backpackStatus: backpackStatus,
        statStatus: statStatus,
    };
    for (var key in equippedItems) {
        var item = equippedItems[key];
        saveGame["player" + key] = item;
    }
    for (var key in monsterList) {
        var monsterKills = monsterList[key].killCount;
        saveGame[key] = monsterKills;
    };
    for (var key in playerPassive) {
        var passive = playerPassive[key].level;
        saveGame[key] = passive;
    };
    for (var key in playerProfession) {
        var profession = playerProfession[key];
        var level = profession.level;
        var experience = profession.experience;
        var maxExperience = profession.maxExperience;
        saveGame[key + "Level"] = level;
        saveGame[key + "Exp"] = experience;
        saveGame[key + "MaxExp"] = maxExperience;
    }
    for (var key in weaponMastery) {
        var mastery = weaponMastery[key];
        var level = mastery.level;
        var experience = mastery.experience;
        var maxExperience = mastery.maxExperience;
        saveGame[key + "Level"] = level;
        saveGame[key + "Exp"] = experience;
        saveGame[key + "MaxExp"] = maxExperience;
    }
    for (var key in characterRaces) {
        var race = characterRaces[key];
        var raceAge = race.raceAge;
        saveGame[key + "raceAge"] = raceAge;
    }
    if (saveType === 'manualSave') {
        Log("Game Saved");
    }
    if (saveType === 'autoSave' || saveType === 'manualSave') {
        var saveKey = saveKeyForSlot(slot);
        localStorage[saveKey] = btoa(JSON.stringify(saveGame));
        document.getElementById('saveExport').innerHTML = localStorage[saveKey];
    };
    executeIntervalFunctionsOnce();
};
var executeIntervalFunctionsOnce = (function () {
    var executed = false;
    return function () {
        if (!executed) {
            executed = true;
            var healthPercent2;
            var expPercent2;
            healthPercent2 = setInterval(function () { healthPercent() }, 100);
            expPercent2 = setInterval(function () { expPercent() }, 100);
        };
    };
})();

function loadGame(slot) {
    load(slot);
    refillShopInterval();
};

function autoSave() {
    var slot = player.properties.saveSlot;
    saveGameFunction("autoSave", slot);
    setTimeout(autoSave, 10000);
};


function newGame(slot) {
    if (confirm("Are you sure?") === true) {
        characterCreationHtml();
        player.properties.saveSlot = slot;
        if (state.hardcoreMode === true) {
            player.properties.hardcoreMode = true;
        };
        EquippedItemsEmpty();
        CreatePlayerHotBar();
        CreatePlayerSkillsHtml();
        primaryStatUpdate();
        secondaryStatUpdate();
        saveGameSlot();
        refillShopInterval();
        shopOther();
        CreateInventoryWeaponHtml();
        unlockMineral();
        checkBoxHtml();
        createAlchemyHtml();
        createPotionInventory();
        craftingHtml();
        MakeMonsterList();
        CreateMonsterHtml();
        autoSave();
        playerHealthBar();
        manaRegen();
    };
};

function load(slot) {
    var saveKey = saveKeyForSlot(slot);
    if (localStorage[saveKey]) {
        var savegame = JSON.parse(atob(localStorage[saveKey]));
        if (typeof savegame.playerProperties.saveslot !== "undefined") player.properties.saveSlot = slot;
    };
    if (savegame !== undefined) {
        if (typeof savegame.playerProperties !== "undefined") player.properties = savegame.playerProperties;
        //Check if player object is missing any properties. It will add them with default values if they are missing(In case of an old save which didnt have certain properties)
        var playerDefault = defaultValues.properties;
        for (var key in playerDefault) {
            if (playerDefault.hasOwnProperty(key)) {
                if (savegame.playerProperties[key] === undefined) {
                    savegame.playerProperties[key] = playerDefault[key];
                };
            };
        };

        // mutate the exported objects in place (imported read-only bindings)
        if (typeof savegame.backpackStatus !== "undefined") Object.assign(backpackStatus, savegame.backpackStatus);
        if (typeof savegame.statStatus !== "undefined") Object.assign(statStatus, savegame.statStatus);
        if (typeof savegame.inventory !== "undefined") {
            // mutate the exported array in place (it's an imported read-only binding)
            playerInventory.length = 0;
            playerInventory.push.apply(playerInventory, savegame.inventory);
        }

        document.getElementById("gold").innerHTML = player.properties.gold;
        MakeMonsterList();
        for (var key in equippedItems) {
            if (typeof savegame["player" + key] !== "undefined") equippedItems[key] = savegame["player" + key];
        }
        for (var key in monsterList) {
            if (typeof savegame[key] !== "undefined") monsterList[key].killCount = savegame[key];
        };
        for (var key in playerPassive) {
            if (typeof savegame[key] !== "undefined") playerPassive[key].level = savegame[key];
        }

        for (var key in playerProfession) {
            if (typeof savegame[key + "Level"] !== "undefined") playerProfession[key].level = savegame[key + "Level"];
            if (typeof savegame[key + "Exp"] !== "undefined") playerProfession[key].experience = savegame[key + "Exp"];
            if (typeof savegame[key + "MaxExp"] !== "undefined") playerProfession[key].maxExperience = savegame[key + "MaxExp"];
        }
        for (var key in weaponMastery) {
            if (typeof savegame[key + "Level"] !== "undefined") weaponMastery[key].level = savegame[key + "Level"];
            if (typeof savegame[key + "Exp"] !== "undefined") weaponMastery[key].experience = savegame[key + "Exp"];
            if (typeof savegame[key + "MaxExp"] !== "undefined") weaponMastery[key].maxExperience = savegame[key + "MaxExp"];
        }
        for (var key in characterRaces) {
            if (typeof savegame[key + "raceAge"] !== "undefined") characterRaces[key].raceAge = savegame[key + "raceAge"];
        }
        loadIsEquipped();
        CreateWeaponSkillHtml();
        quest();
        CreateMonsterHtml();
        CreatePlayerSkillsHtml();
        updateBar();
        characterCreationHtml();
        playerReviveCheck();
        removeStartingScreen();
        unequipItemLoad();
        CreateInventoryWeaponHtml();
        primaryStatUpdate();
        secondaryStatUpdate();
        EquippedItemsEmpty();
        checkIfEquippedEmpty();
        updateHtml();
        CreatePlayerHotBar();
        saveGameSlot();
        shopOther();
        createPotionInventory();
        unlockMineral();
        unlockHerb();
        checkBoxHtml();
        playerProfessionHtml();
        createAlchemyHtml();
        craftingHtml();
        playerHealthBar();
        manaRegen();
    }
    else {
        if (confirm("Do you want to start a new game?") === true) {
            newGame(slot);
        };
    };
    autoSave(slot);
    versionCheck(slot);
};

function resetCheck() {
    var slot = player.properties.saveSlot;
    if (confirm("Are you sure?") === true) {
        reset(slot);
    };
};
function resetallSavesCheck() {
    if (confirm("Do you want to remove all saves? Do it if your game breaks etc.") === true) {
        reset(0)
        reset(1)
        reset(2)
        reset(3)
    };
};
function reset(slot) {
    localStorage.removeItem(saveKeyForSlot(slot));
    console.log('test')
    pageReload();
};//test

export function pageReload() {
    location.reload();
};
function versionCheck(slot) {
    if (player.properties.gameVersion !== currentGameVersion) {
        reset(slot);
    };
};

function importSave() {
    var slot = player.properties.saveSlot;
    var importSave = document.getElementById('saveImport').value;
    var savegame = JSON.parse(atob(importSave));
    savegame.playerProperties.saveSlot = slot;
    localStorage[saveKeyForSlot(slot)] = btoa(JSON.stringify(savegame));
    load(slot);
};
// ES module (Phase 3): expose public functions on window for inline handlers and
// other scripts. Bare reads/reassignments of globals (player, playerInventory,
// backpackStatus, statStatus, monsterList, ...) resolve through the global object.
// Inline-onclick handlers stay on window: saveGameFunction (onclickevent),
// newGame/load/reset/resetCheck/resetallSavesCheck (generated slot/reset buttons),
// importSave (index.html), loadGame (start-screen Load). pageReload is exported
// (imported by battle/dynamicHtml). saveKeyForSlot, autoSave, and versionCheck are
// internal-only.
window.saveGameFunction = saveGameFunction;
window.loadGame = loadGame;
window.newGame = newGame;
window.load = load;
window.resetCheck = resetCheck;
window.resetallSavesCheck = resetallSavesCheck;
window.reset = reset;
window.importSave = importSave;
