'use strict';

// Stat/skill panel rendering, extracted from dynamicHtml.js. All six are imported
// cross-module (battle/core/save/stats/gameObjects/potionsHotbar) and re-exported
// via dynamicHtml.js for backward compatibility. Pure render functions — no
// inline-onclick handlers, so nothing to register on window.
import { weaponMastery } from '../data/weaponMastery.js';
import { playerPassive, weaponSkillList } from '../data/skills.js';
import { primaryStatInfo, secondaryStatInfo, weaponTypeObject } from '../data/gameObjects.js';
import { player } from '../core/core.js';
import { state } from '../core/state.js';
import { updateHtml } from '../systems/stats.js';
import { testss } from './uiCommon.js';

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

function primaryStatUpdate() {
    // compact flat rows: [icon] [name] ......... [value] [+]
    // The span ids must stay (updateHtml writes the values into #statInfo and
    // the upgrade handlers hang off #TypeCap); updateHtml also shows/hides
    // .statPlus depending on unspent stat points.
    let rows = '';
    for (var key in primaryStatInfo) {
        var currentBonus = primaryStatInfo[key];
        var statInfo = currentBonus.info;
        var statDisplay2 = currentBonus.type;
        const typeCap = currentBonus.type.capitalizeFirstLetter();

        const isSimpleSpan =
            currentBonus.type === 'damage' ||
            currentBonus.type === 'Stats' ||
            currentBonus.type === 'mana' ||
            currentBonus.type == 'spellPower';
        const label = currentBonus.type === 'spellPower' ? 'Spell Power' : typeCap;
        const plusSpan = isSimpleSpan
            ? ''
            : `<span id="${typeCap}" class="statPlus" style="cursor:pointer" onclick="upgrade${typeCap}(event);" data-toggle="tooltip" data-placement="top" title="Increase ${currentBonus.type} (Ctrl/Alt+Click: +10, Shift+Click: +100)">` +
              `<span class="glyphicon glyphicon-plus unselectable"></span></span>`;

        rows +=
            `<div class="statRow darkBackground">` +
            `<span data-toggle="tooltip" data-placement="top" title="${currentBonus.tooltip}"><img class="statIcon" src="images/stat/${statDisplay2}.png"></span>` +
            `<span class="statName">${label}</span>` +
            `<span class="statValue"><span id="${statInfo}"></span></span>` +
            plusSpan +
            `</div>`;
    }
    document.getElementById('primaryStat').innerHTML = `<div class="statList">${rows}</div>`;
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

export {
    CreateWeaponSkillHtml,
    checkBoxHtml,
    CreatePlayerSkillsHtml,
    primaryStatUpdate,
    secondaryStatUpdate,
    activeBuffsHtml,
};
