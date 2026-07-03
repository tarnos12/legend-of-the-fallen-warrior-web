'use strict';
import { weaponMastery } from '../data/weaponMastery.js';
import { weaponSkillList } from '../data/skills.js';
import { characterRaces } from '../data/gameObjects.js';
import { equippedItems, player } from '../core/core.js';
import { Log, deathLog, levelUpLog, logData } from '../core/log.js';
import { getTen, getThousands } from '../core/format.js';
import { monsterList } from '../data/monsterList.js';
import { state } from '../core/state.js';
import { updateHtml, manaRegen, levelUp } from './stats.js';
import { playerRevive } from './intervalFunctions.js';
import { quest } from './quest.js';
import { monsterItemDrop } from './itemDrop.js';
import { pageReload, reset } from '../core/save.js';
import { testss } from '../ui/uiCommon.js';
import { CreateMonsterHtml } from '../ui/monsterUI.js';
import { CreateWeaponSkillHtml, activeBuffsHtml } from '../ui/panelsUI.js';
function startBattle(monster) {
    //Add buttons <Attack><Defense><Spell><Item><Run?> -->"Spell" change name based on character class later on: Spell/Skill/Runes/Combo/etc...
    //Display enemy at the top/or left/ AND  player at the bottom/or right side
    var monsterStats = monsterList[monster];
    for (var hero in characterRaces) {
        if (characterRaces.hasOwnProperty(hero)) {
            var heroRace = characterRaces[hero];
            if (player.properties.heroRace === heroRace.name) {
                var image = heroRace.image();
            }
        }
    }
    var area = monsterStats.area;
    var html = '';
    html += '<div class="row">';
    html += '<div id="monsterImage" class="col-xs-12 c3">';
    html += '<div class="progress" style="width:50%; margin-left:25%;">';
    html +=
        '<div style="width:' +
        '100%' +
        ';" aria-valuemax="100" aria-valuemin="0" aria-valuenow="60" role="progressbar" class="progress-bar" id="' +
        monsterStats.name +
        '1' +
        '">';
    html +=
        '<span style="font-size:13px;">' +
        getThousands(monsterStats.hp) +
        ' HP</span>' +
        '</div></div>';
    html +=
        '<img src="images/monsters/' +
        monsterStats.name +
        '.png" style="position:absolute; left:45%; top:50%;">';
    html += '</div>';
    html += '<div class="col-xs-12 c3" style="height:100px;">';
    html +=
        '<img id="playerAnimation" src="images/races/' +
        image +
        '.png" style="position:absolute; left:45%; bottom:10%;">';
    html += '</div>';
    html += '</div>';
    html += '<div class="row">';
    html += '<div class="col-xs-12 c3" id="battleButtons">';
    html += '</div>';
    html += '</div>';
    html += '<div class="row">';
    html += '<div class="col-xs-4 col-xs-offset-4" id="spellButtons">';
    html += '</div>';
    html += '<div class="col-xs-10 col-xs-offset-1">';
    html += '<div class="collapse" id="spellCollapse"></div>';
    html += '</div>';
    html += '</div>';
    var oldMonster = document.getElementById('monster' + monsterStats.id);
    if (oldMonster) oldMonster.remove();
    document.getElementById(area).innerHTML = html;
    var battleButtons = document.getElementById('battleButtons');
    battleButtons.insertAdjacentHTML(
        'beforeend',
        '<button class="sell c3 marginRight" data-toggle="tooltip" data-placement="top" title="Attack with equipped weapon" onclick="playerAttack(' +
            "'" +
            monster +
            "'" +
            ');">Attack</button>'
    );
    battleButtons.insertAdjacentHTML(
        'beforeend',
        '<button class="sell c3" data-toggle="tooltip" data-placement="top" title="Choose your spell" onclick="playerSpellDiv(' +
            "'" +
            monster +
            "'" +
            ');">Spells</button>'
    );
    logData.length = 0;
    document.getElementById('logConsole').innerHTML = '';
    testss();
    playerSpellDiv(monster);
    $('.collapse').collapse('show');
}
function playerSpellDiv(monster) {
    var html = '';
    html += '<div class="c3">';
    html += '<h3>Spells</h3>';
    html += '</div>';
    var skillAmount = 0;
    var weapon = equippedItems.weapon.subType; //get item subtype to match player weapon skills
    if (weapon !== undefined) {
        for (var skillKey in weaponSkillList[weapon]) {
            var skill = weaponSkillList[weapon][skillKey];
            if (skill.type === 'damage') {
                if (weaponSkillList[weapon][skillKey].levelReq <= weaponMastery[weapon].level) {
                    skillAmount++;
                    var skillName = skill.name.replace(/'/g, "\\'");
                    var name = "' " + skillName + ".'";
                    var type = "' " + skill.type2 + " damage'";
                    var displayName = skill.name; //add onclick + spell used
                    html += '<button class="sell marginRight" style="width:auto;';
                    if (player.properties.mana <= skill.manaCost) {
                        html += 'cursor:not-allowed;" disabled';
                    } else {
                        html += '"';
                    }
                    html +=
                        ' onclick="playerSpellDamage(' +
                        "'" +
                        monster +
                        "'" +
                        ', ' +
                        "'" +
                        weapon +
                        "'" +
                        ', ' +
                        name +
                        ', ' +
                        type +
                        ', ' +
                        "'" +
                        skillKey +
                        "'" +
                        ');">' +
                        displayName +
                        '</button>';
                    html += 'Mana cost: ' + skill.manaCost + '<br />';
                }
            }
        }
    }

    if (skillAmount === 0) {
        html +=
            "<div class='c3'>Unlock some skills first! Using a weapon, will level up your proficiency, and unlock skills with it.</div>";
    }
    document.getElementById('spellCollapse').innerHTML = html;
    $('.collapse').collapse('toggle');
}
function playerAttack(monster) {
    logData.length = 0;
    document.getElementById('logConsole').innerHTML = '';
    var animationSrc = 'src="images/animations/slashAnimation.gif"';
    var monsterImage = document.getElementById('monsterImage');
    if (monsterImage)
        monsterImage.insertAdjacentHTML(
            'beforeend',
            '<img id="animation"' + animationSrc + 'style="position:absolute; left:45%; top:50%;">'
        );
    setTimeout(function () {
        var anim = document.getElementById('animation');
        if (anim) anim.remove();
    }, 350);
    var monsterStats = monsterList[monster];
    //Hit/Miss/Crit/Damage + possible on hit bonuses + lifesteal
    document.getElementById('health').innerHTML =
        player.properties.health + '/' + player.functions.maxhealth();
    var playerHitChance = (player.functions.accuracy() - monsterStats.eva) / 100;
    var randomHitChance = Math.random();
    var instantKillChance = Math.floor(Math.random() * 100 + 1);
    if (playerHitChance > randomHitChance) {
        if (player.functions.instantKillChance() >= instantKillChance) {
            monsterKilled(monsterStats);
            Log(
                '<span class ="bold" style="color:red;">Instant Killed enemy!' +
                    '<br />' +
                    '</span>'
            );
        } else {
            playerCritCheck(monster);
        }
    } else {
        Log('<span class ="bold" style="color:gray;">You missed!' + '<br />' + '</span>');
        monsterAttack(monsterStats);
    }
}

function playerCritCheck(monster) {
    var monsterStats = monsterList[monster];
    var playerCriticalChance = player.functions.criticalChance() / 100;
    var randomCritChance = Math.random();
    var criticalDamage = 1; // Crit damage Multiplier
    var damageType = '';
    if (playerCriticalChance > randomCritChance) {
        criticalDamage = player.functions.criticalDamage();
        damageType = ' physical damage(Critical Hit)';
    } else {
        damageType = ' physical damage';
    }
    var damage =
        Math.floor(
            Math.random() * (player.functions.maxDamage() - player.functions.minDamage() + 1)
        ) + player.functions.minDamage();
    damage = Math.floor(
        damage *
            criticalDamage *
            ((player.properties.prestigeMultiplier * 500) /
                (player.properties.prestigeMultiplier * 500 +
                    monsterStats.def() * player.functions.ignoreDefense()))
    );
    playerDamage(monster, damage, 'basic attack.', damageType);
}
function playerSpellDamage(monster, weapon, name, type, skillKey) {
    logData.length = 0;
    document.getElementById('logConsole').innerHTML = '';
    if (player.properties.mana >= weaponSkillList[weapon][skillKey].manaCost) {
        var bonusDamage = 0;
        for (var skillKey2 in weaponSkillList[weapon]) {
            var skill2 = weaponSkillList[weapon][skillKey2];
            if (
                skill2.type === 'magicDamageBuff' &&
                skill2.type2 === 'magical' &&
                weapon === 'staff'
            ) {
                var randomNumber = Math.floor(Math.random() * 100 + 1);
                if (randomNumber <= skill2.chance()) {
                    bonusDamage = skill2.damage();
                    type += ' (' + skill2.name + ') ';
                }
            }
        }

        var animationSrc =
            'src="images/animations/' + weaponSkillList[weapon][skillKey].animation() + '.gif"';
        var monsterImageSpell = document.getElementById('monsterImage');
        if (monsterImageSpell)
            monsterImageSpell.insertAdjacentHTML(
                'beforeend',
                '<img id="animation"' +
                    animationSrc +
                    'style="position:absolute; left:45%; top:50%;">'
            );
        setTimeout(function () {
            var anim = document.getElementById('animation');
            if (anim) anim.remove();
        }, 350);
        var monsterStats = monsterList[monster];
        var playerHitChance = (player.functions.accuracy() - monsterStats.eva) / 100;
        var randomHitChance = Math.random();
        if (playerHitChance > randomHitChance) {
            var skill = weaponSkillList[weapon][skillKey];
            var damage = skill.damageDisplay() + bonusDamage;
            playerDamage(monster, damage, name, type);
        } else {
            Log('<span class ="bold" style="color:gray;">You missed!' + '<br />' + '</span>');
            Log(
                '<span class ="bold" style="color:black; border-top:1px solid; border-bottom:1px solid;">Player turn' +
                    '<br />' +
                    '</span>'
            );
            monsterAttack(monsterStats);
            Log(
                '<span class ="bold" style="color:black; border-top:1px solid; border-bottom:1px solid;">Enemy turn' +
                    '<br />' +
                    '</span>'
            );
        }
        player.properties.mana -= weaponSkillList[weapon][skillKey].manaCost;
        updateHtml();
    } else {
        Log('<span class="bold" style="color:red;">You need more mana.' + '<br />' + '</span>');
    }
}
function playerDamage(monster, damage, name, type) {
    //damage can be from melee/spell
    var monsterStats = monsterList[monster];
    var playerAnim = document.getElementById('playerAnimation');
    if (playerAnim) playerAnim.style.bottom = '30%';
    setTimeout(function () {
        var pa = document.getElementById('playerAnimation');
        if (pa) pa.style.bottom = '10%';
    }, 200);
    Log(
        '<span class ="bold" style="color:red;">You deal ' +
            damage +
            type +
            ' with ' +
            name +
            '<br />' +
            '</span>'
    );
    if (player.functions.lifeSteal() > 0) {
        var lifeSteal = player.functions.lifeSteal();
        player.properties.health += lifeSteal;
        if (player.properties.health > player.functions.maxhealth()) {
            player.properties.health = player.functions.maxhealth();
        }
        Log(
            '<span class ="bold" style="color:green;">You life steal for ' +
                lifeSteal +
                ' health.<br />' +
                '</span>'
        );
    }
    monsterStats.hp -= damage;
    weaponSkill(monsterStats, monster);
    var monsterPercent = (monsterStats.hp / monsterStats.maxHp) * 100;
    var monsterBar = document.getElementById(monsterStats.name + '1');
    if (monsterBar) monsterBar.style.width = monsterPercent + '%';
    var monsterBarSpan = document.querySelector('#' + monsterStats.name + '1 span');
    if (monsterBarSpan) monsterBarSpan.innerHTML = monsterStats.hp + ' HP';
    Log(
        '<span class ="bold" style="color:black; border-top:1px solid; border-bottom:1px solid;">Player turn' +
            '<br />' +
            '</span>'
    );
    if (monsterStats.hp <= 0) {
        Log('<span class ="bold" style="color:black;">Enemy killed!' + '<br />' + '</span>');
        monsterKilled(monsterStats);
    } else {
        monsterAttack(monsterStats);
        Log(
            '<span class ="bold" style="color:black; border-top:1px solid; border-bottom:1px solid;">Enemy turn' +
                '<br />' +
                '</span>'
        );
    }
}
// `target` carries the hp pool the retaliation effects (thorn/counter) hit and
// whose death ends the fight. The classic button combat passes the shared
// monsterList entry itself; the canvas combat passes a per-enemy clone (its
// death/rewards are handled by the caller, so monsterKilled is skipped then).
// `mods` (optional): parryBonus from the weapon behavior profile (sword).
export function monsterAttack(monsterStats, target, mods) {
    if (target === undefined) target = monsterStats;
    var parryBonus = mods && mods.parryBonus ? mods.parryBonus : 0;
    if (player.properties.health < player.functions.maxhealth()) {
        var regen = player.functions.hpregen();
        player.properties.health += regen;
        if (player.properties.health > player.functions.maxhealth()) {
            regen -= player.properties.health - player.functions.maxhealth();
            player.properties.health = player.functions.maxhealth();
        }
    }
    manaRegen(); //Mana regen
    updateHtml();
    var monsterHitChance = (monsterStats.acc - player.functions.evasion()) / 100;
    var randomHitChance = Math.random();
    if (monsterHitChance > randomHitChance) {
        var randomNumber = Math.floor(Math.random() * 100 + 1);
        if (player.functions.parryChance() + parryBonus > randomNumber) {
            Log(
                '<span class ="bold" style="color:purple;">You parry enemy attack!' +
                    '<br />' +
                    '</span>'
            );
        } else {
            monsterDmg(monsterStats, target);
        }
    } else {
        Log('<span class ="bold" style="color:purple;">Enemy miss!' + '<br />' + '</span>');
    }
}
function monsterDmg(monsterStats, target) {
    var monsterDamage =
        Math.floor(Math.random() * (monsterStats.maxDmg() - monsterStats.minDmg() + 1)) +
        monsterStats.minDmg();
    var thornDamage = Math.floor(monsterDamage * (player.functions.thornAura() / 100));
    if (thornDamage > 0) {
        Log(
            '<span class ="bold" style="color:green;">You deal ' +
                thornDamage +
                ' thorn damage' +
                '<br />' +
                '</span>'
        );
    }
    target.hp -= thornDamage;
    monsterDamage = Math.floor(
        monsterDamage *
            ((player.properties.prestigeMultiplier * 500) /
                (player.properties.prestigeMultiplier * 500 + player.functions.defense())) -
            player.functions.ignoreDamage()
    );
    if (monsterDamage >= 1) {
        monsterDamageDeal(monsterDamage, monsterStats, target);
    } else {
        Log(
            '<span class ="bold" style="color:green;">Enemy deal 0 damage. A Legends power flows through you.' +
                '<br />' +
                '</span>'
        );
    }
}
function monsterDamageDeal(monsterDamage, monsterStats, target) {
    var randomCounterNumber = Math.floor(Math.random() * 100 + 1);
    var randomBlockNumber = Math.floor(Math.random() * 100 + 1);
    var randomReflectNumber = Math.floor(Math.random() * 100 + 1);
    var text = ' damage';
    if (randomCounterNumber <= player.functions.counterChance()) {
        var counterDamageDealt = Math.floor(
            monsterDamage * (player.functions.counterDamage() / 100)
        );
        target.hp -= counterDamageDealt;
        Log(
            '<span class ="bold" style="color:purple;">You counter enemy for ' +
                counterDamageDealt +
                '<br />' +
                '</span>'
        );
    }
    if (randomReflectNumber <= player.functions.reflect()) {
        monsterDamage *= 0.5;
        text += '(reflected 50% damage)';
    }
    if (randomBlockNumber <= player.functions.blockChance()) {
        Log(
            '<span class ="bold" style="color:blue;">You block ' +
                player.functions.blockAmount() +
                ' damage!' +
                '<br />' +
                '</span>'
        );
        if (monsterDamage >= player.functions.blockAmount()) {
            monsterDamage -= player.functions.blockAmount();
        } else if (monsterDamage < player.functions.blockAmount()) {
            monsterDamage = 0;
        }
    }
    player.properties.health = player.properties.health - monsterDamage;
    state.damageTaken += monsterDamage;

    Log(
        '<span class ="bold" style="color:purple;">Enemy hits you for ' +
            monsterDamage +
            text +
            '.' +
            '<br />' +
            '</span>'
    );
    document.getElementById('health').innerHTML =
        player.properties.health + '/' + player.functions.maxhealth();
    if (player.properties.health < 1) {
        playerDead(monsterStats);
    }
    // Clone deaths (canvas combat) are detected and rewarded by the caller.
    if (target === monsterStats && monsterStats.hp < 1) {
        monsterKilled(monsterStats);
    }
}
export function playerDead(monsterStats) {
    if (player.properties.hardcoreMode === false) {
        var goldLost = player.properties.goldLost;
        var expLost = player.properties.expLost;
        player.properties.isDead = true;
        player.properties.health = 0;
        playerRevive();
        goldLost = Math.floor(player.properties.gold - player.properties.gold / 1.2);
        player.properties.gold = Math.floor(player.properties.gold / 1.2);
        expLost = Math.floor(player.properties.experience - player.properties.experience / 1.2);
        player.properties.experience = Math.floor(player.properties.experience / 1.2);
        document.getElementById('health').innerHTML = player.properties.health;
        document.getElementById('gold').innerHTML = player.properties.gold;
        document.getElementById('experience').innerHTML = player.properties.experience;
        Log(
            '<span id="goldLost" class ="bold" style="color:red;">You lost ' +
                goldLost +
                ' gold.' +
                '<br />' +
                '</span>'
        );
        Log(
            '<span id="expLost" class ="bold" style="color:red;">You lost ' +
                expLost +
                ' experience.' +
                '<br />' +
                '</span>'
        );
        Log(
            '<span id="playerDead" class ="bold" style="color:red;">You have died.' +
                '<br />' +
                '</span>'
        );
        Log(
            '<span id="playerDead2" class ="bold" style="color:red;">You need to wait 5 seconds before you can fight again.' +
                '<br />' +
                '</span>'
        );
        state.battleTurn = -1;
        displayLogInfo();
        deathLog();
        updateHtml();
        player.properties.goldLost = goldLost;
        player.properties.expLost = expLost;
    } else {
        reset();
        pageReload();
    }
}
function monsterKilled(monsterStats) {
    grantKillRewards(monsterStats);
    displayLogInfo();
}
// The per-kill rewards (exp/levelup, gold, item drop, kill count, quest check,
// Warp unlock) without the end-of-battle cleanup, so the canvas combat can
// grant them once per enemy in a multi-enemy wave and run the cleanup
// (displayLogInfo) once when the wave ends.
// quiet=true (offline progress) skips the per-kill DOM work (log lines, gold
// counter, updateHtml, quest re-render); the caller renders once afterwards.
export function grantKillRewards(monsterStats, quiet) {
    monsterStats.hp = monsterStats.maxHp;
    monsterExperience(monsterStats, quiet);
    monsterStats.killCount++;
    if (!quiet) quest();
    // (The prestige Warp button lives in the combat control bar now, shown
    // whenever an area boss — lastEnemy — has been killed.)
    player.properties.lastEnemyLevel = monsterStats.level;
}
//Weapon skill experience
function weaponSkill(monsterStats, monster) {
    // if (monsterStats.type === boss){ give x5 experience} else if normal {x1 exp}
    if (monsterStats.level > player.properties.level) {
        var expgain = 3;
    } else if (monsterStats.level === player.properties.level) {
        var expgain = 2;
    } else {
        var expgain = 1;
    }
    var subType = equippedItems.weapon.subType;
    var itemStat = weaponMastery[subType];
    if (itemStat !== undefined) {
        if (itemStat['experience'] < itemStat['maxExperience']) {
            itemStat['experience'] = Math.floor(itemStat['experience'] + expgain);
        }
        if (itemStat['experience'] >= itemStat['maxExperience']) {
            itemStat['level'] += 1;
            itemStat['experience'] -= itemStat['maxExperience'];
            itemStat['maxExperience'] = Math.floor(itemStat['maxExperience'] * 1.2);
            Log(
                '<span id="weaponMastery" class ="bold" style="color:green;">You gained level in ' +
                    itemStat.name +
                    ' Mastery!' +
                    '<br />' +
                    '</span>'
            );
            CreateWeaponSkillHtml();
        }
    }
    updateBar();
}
export function updateBar() {
    if (equippedItems.weapon.isEquipped === true) {
        var subType = equippedItems.weapon.subType;
        var itemStat = weaponMastery[subType];
        var weaponExp = Math.floor((itemStat.experience / itemStat.maxExperience) * 100);
        var divArray = document.getElementById(subType + '1'); //Doing + 1 so I can use "subType" for a span, which let me center progress bar value.
        divArray.style.width = weaponExp + '%';
        if (subType === 'sword') {
            document.getElementById('sword').innerHTML = weaponExp + '%';
            player.properties.swordSkill = weaponExp;
        }
        if (subType === 'axe') {
            document.getElementById('axe').innerHTML = weaponExp + '%';
            player.properties.axeSkill = weaponExp;
        }
        if (subType === 'mace') {
            document.getElementById('mace').innerHTML = weaponExp + '%';
            player.properties.maceSkill = weaponExp;
        }
        if (subType === 'staff') {
            document.getElementById('staff').innerHTML = weaponExp + '%';
            player.properties.staffSkill = weaponExp;
        }
        if (subType === 'ranged') {
            document.getElementById('ranged').innerHTML = weaponExp + '%';
            player.properties.rangedSkill = weaponExp;
        }
    }
}
//experience gained from killing a monster
function monsterExperience(monsterStats, quiet) {
    var expGain = monsterStats.baseExp() * player.functions.expRate();
    var level = player.properties.level;
    if (player.properties.experience < player.properties.maxExperience) {
        player.properties.experience = Math.floor(player.properties.experience + expGain);
    }
    if (player.properties.experience >= player.properties.maxExperience) {
        player.properties.level += 1;
        levelUp();
        player.properties.stats += 10;
        player.properties.experience =
            player.properties.experience - player.properties.maxExperience;
        var maxExp = getTen(level);
        player.properties.maxExperience += maxExp * 10;
        Log(
            '<span id=\"levelUpLog\" style=\"color:blue;\" class =\"bold\">Level up!' +
                '<br />' +
                '</span>'
        );
        levelUpLog();
    } else if (!quiet) {
        Log(
            '<span id=\"expGain\" class =\"bold\">You gain:' +
                Math.floor(expGain) +
                ' experience!' +
                '<br />' +
                '</span>'
        );
    }
    monsterGold(monsterStats, quiet);
}

//gold gained from killing a monster
function monsterGold(monsterStats, quiet) {
    var goldDrop = player.properties.goldDrop;
    var monsterLvl = monsterStats.level;
    goldDrop = 0;
    var randomGold = Math.floor(
        Math.random() * (monsterStats.level + 5 - monsterStats.level + 1) + monsterStats.level
    );
    goldDrop = Math.floor(randomGold * player.functions.goldRate());
    player.properties.gold += goldDrop;
    if (!quiet) document.getElementById('gold').innerHTML = player.properties.gold;
    player.properties.goldDrop = goldDrop;
    monsterItemDrop(monsterLvl, quiet); // Call item drop function with monster level.
    if (!quiet) updateHtml();
}

// ---- Canvas combat API -----------------------------------------------------
// One hero basic attack against `monsterStats`, using the exact hit/instakill/
// crit/defense/lifesteal/mastery pipeline of playerAttack+playerCritCheck+
// playerDamage, but without the turn exchange or hp mutation: the caller owns
// the target hp pool (a per-enemy clone) and applies the returned damage.
// `mods` (optional) carries the weapon-behavior modifiers from
// systems/weaponBehavior.js: damageMult (mace heavy hits) and critBonus
// (sword finesse), both defaulting to neutral.
export function heroStrikeRoll(monsterStats, mods) {
    var damageMult = mods && mods.damageMult ? mods.damageMult : 1;
    var critBonus = mods && mods.critBonus ? mods.critBonus : 0;
    var playerHitChance = (player.functions.accuracy() - monsterStats.eva) / 100;
    if (playerHitChance <= Math.random()) {
        Log('<span class ="bold" style="color:gray;">You missed!' + '<br />' + '</span>');
        return { result: 'miss' };
    }
    var instantKillChance = Math.floor(Math.random() * 100 + 1);
    if (player.functions.instantKillChance() >= instantKillChance) {
        Log('<span class ="bold" style="color:red;">Instant Killed enemy!' + '<br />' + '</span>');
        return { result: 'instakill' };
    }
    var playerCriticalChance = (player.functions.criticalChance() + critBonus) / 100;
    var criticalDamage = 1;
    var damageType = ' physical damage';
    if (playerCriticalChance > Math.random()) {
        criticalDamage = player.functions.criticalDamage();
        damageType = ' physical damage(Critical Hit)';
    }
    var damage =
        Math.floor(
            Math.random() * (player.functions.maxDamage() - player.functions.minDamage() + 1)
        ) + player.functions.minDamage();
    damage = Math.floor(
        damage *
            criticalDamage *
            damageMult *
            ((player.properties.prestigeMultiplier * 500) /
                (player.properties.prestigeMultiplier * 500 +
                    monsterStats.def() * player.functions.ignoreDefense()))
    );
    heroHitLanded(monsterStats, damage, 'basic attack.', damageType);
    return { result: 'hit', damage: damage, crit: criticalDamage > 1 };
}

// One automatic spell cast: picks the strongest unlocked damage skill of the
// equipped weapon the player can afford, spends the mana, and rolls hit +
// damage exactly like playerSpellDamage. Returns null when no spell is
// castable (nothing unlocked, no weapon, or not enough mana).
export function heroSpellRoll(monsterStats) {
    var weapon = equippedItems.weapon.subType;
    if (weapon === undefined || weaponSkillList[weapon] === undefined) return null;
    var best = null;
    for (var skillKey in weaponSkillList[weapon]) {
        var skill = weaponSkillList[weapon][skillKey];
        if (
            skill.type === 'damage' &&
            skill.levelReq <= weaponMastery[weapon].level &&
            player.properties.mana >= skill.manaCost &&
            (best === null || skill.damageDisplay() > best.damageDisplay())
        ) {
            best = skill;
        }
    }
    if (best === null) return null;
    player.properties.mana -= best.manaCost;
    var type = ' ' + best.type2 + ' damage';
    var bonusDamage = 0;
    for (var skillKey2 in weaponSkillList[weapon]) {
        var skill2 = weaponSkillList[weapon][skillKey2];
        if (skill2.type === 'magicDamageBuff' && skill2.type2 === 'magical' && weapon === 'staff') {
            var randomNumber = Math.floor(Math.random() * 100 + 1);
            if (randomNumber <= skill2.chance()) {
                bonusDamage = skill2.damage();
                type += ' (' + skill2.name + ') ';
            }
        }
    }
    updateHtml();
    var playerHitChance = (player.functions.accuracy() - monsterStats.eva) / 100;
    if (playerHitChance <= Math.random()) {
        Log('<span class ="bold" style="color:gray;">You missed!' + '<br />' + '</span>');
        return { result: 'miss', name: best.name };
    }
    var damage = best.damageDisplay() + bonusDamage;
    heroHitLanded(monsterStats, damage, ' ' + best.name + '.', type);
    return { result: 'hit', name: best.name, damage: damage };
}

// The on-hit side effects a landed hit has in playerDamage: log line,
// life steal, weapon-mastery experience.
function heroHitLanded(monsterStats, damage, name, type) {
    Log(
        '<span class ="bold" style="color:red;">You deal ' +
            damage +
            type +
            ' with ' +
            name +
            '<br />' +
            '</span>'
    );
    if (player.functions.lifeSteal() > 0) {
        var lifeSteal = player.functions.lifeSteal();
        player.properties.health += lifeSteal;
        if (player.properties.health > player.functions.maxhealth()) {
            player.properties.health = player.functions.maxhealth();
        }
        Log(
            '<span class ="bold" style="color:green;">You life steal for ' +
                lifeSteal +
                ' health.<br />' +
                '</span>'
        );
    }
    weaponSkill(monsterStats);
}

export function displayLogInfo() {
    player.properties.health = player.functions.maxhealth();
    player.properties.mana = player.functions.maxMana();
    document.getElementById('health').innerHTML =
        player.properties.health + '/' + player.functions.maxhealth();
    for (var key in player.buffs) {
        if (player.buffs.hasOwnProperty(key)) {
            var buff = player.buffs[key];
            if (buff.timer > 0) {
                buff.timer--;
                if (buff.timer === 0) {
                    buff.amount = 0;
                }
            }
        }
    }
    activeBuffsHtml();
    CreateMonsterHtml();
}
// Only the inline-onclick battle handlers stay on window: startBattle (generated
// onclickevent — intercepted by ui/battleCanvas.js, which runs combat now),
// playerAttack/playerSpellDiv/playerSpellDamage (the classic button combat,
// kept intact as reference/fallback). Exported: playerDead + updateBar
// (core/save) and the canvas combat API (monsterAttack, heroStrikeRoll,
// heroSpellRoll, grantKillRewards, displayLogInfo). The rest is internal.
window.startBattle = startBattle;
window.playerSpellDiv = playerSpellDiv;
window.playerAttack = playerAttack;
window.playerSpellDamage = playerSpellDamage;
