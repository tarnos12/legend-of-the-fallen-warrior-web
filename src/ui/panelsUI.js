'use strict';

// Stat/skill panel rendering, extracted from dynamicHtml.js. All four are
// imported cross-module (battle/core/save/stats/potionsHotbar). Pure render
// functions — no inline-onclick handlers, so nothing to register on window.
// (The old hidden weapon/passive skill renderers were removed once the visible
// canvas trees in ui/skillTreeUI.js became the sole presentation.)
import { primaryStatInfo, secondaryStatInfo } from '../data/gameObjects.js';
import { player } from '../core/core.js';
import { state } from '../core/state.js';
import { updateHtml } from '../systems/stats.js';
import { testss } from './uiCommon.js';

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
        // short names (Str/End/...) — two rows share a narrow column; the
        // full name + description live in the icon tooltip
        const label = currentBonus.shortNameDisplay;
        const fullName = currentBonus.type === 'spellPower' ? 'Spell Power' : typeCap;
        const plusSpan = isSimpleSpan
            ? ''
            : `<span id="${typeCap}" class="statPlus" style="cursor:pointer" onclick="upgrade${typeCap}(event);" data-toggle="tooltip" data-placement="top" title="Increase ${currentBonus.type} (Ctrl/Alt+Click: +10, Shift+Click: +100)">` +
              `<span class="glyphicon glyphicon-plus unselectable"></span></span>`;

        rows +=
            `<div class="statRow darkBackground">` +
            `<span data-toggle="tooltip" data-placement="top" title="${fullName} — ${currentBonus.tooltip}"><img class="statIcon" src="images/stat/${statDisplay2}.png"></span>` +
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
        var statDisplay;
        if (currentBonus.type === 'Stats' || currentBonus.type === 'Skill points') {
            statDisplay = player.properties[statInfo];
        } else {
            statDisplay = player.functions[statInfo]();
        }
        var statDisplay2 = currentBonus.displayName;

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

        // same compact flat rows as the primary panel (.statList/.statRow)
        rows +=
            `<div class="statRow darkBackground">` +
            `<span class="statName" data-toggle="tooltip" data-placement="right" title="${currentBonus.tooltip()}">${statDisplay2}</span>` +
            `<span class="statValue">${value}${suffix}</span>` +
            `</div>`;
    }
    document.getElementById('secondaryStat').innerHTML = `<div class="statList">${rows}</div>`;
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

export { checkBoxHtml, primaryStatUpdate, secondaryStatUpdate, activeBuffsHtml };
