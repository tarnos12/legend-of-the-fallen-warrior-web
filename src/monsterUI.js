'use strict';

// Monster-panel rendering, extracted from dynamicHtml.js. Owns the monster tab/
// selection state (monsterTabActiveNum, currentMonster). CreateMonsterHtml +
// changedTabmonster are imported cross-module (battle/core/quest/save/stats);
// changeMonsterPage + changedTabmonster are inline-onclick handlers on window.
import { monsterAreas } from './gameObjects.js';
import { player, getThousands } from './core.js';
import { monsterList } from './monsterList.js';
import { testss } from './uiCommon.js';

var monsterTabActiveNum = 0;
var currentMonster = 'monster001'; //Save current monster number, so I can pick it from array.

function changedTabmonster(index) {
    monsterTabActiveNum = index;
    if (index === 0 || 1 + (index + index * 7) < 10) {
        currentMonster = 'monster00' + (1 + (index + index * 7));
    } else {
        currentMonster = 'monster0' + (1 + (index + index * 7));
    }
    CreateMonsterHtml();
}

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

export { CreateMonsterHtml, changedTabmonster, changeMonsterPage };
Object.assign(window, { changeMonsterPage, changedTabmonster });
