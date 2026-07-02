'use strict';

// Player log console + fade-notification system, extracted from core/core.js.
// Self-contained: no game-state imports. Log() appends to the #logConsole
// ring buffer; fadeLog() is the vanilla replacement for the jQuery
// delay/fadeIn/fadeOut notification animation; the named *Log() helpers fire
// the individual notification elements rendered by Log() callers.

//Player log
function Log(data) {
    var i;
    if (logData.length < maxLogLines) {
        logData[logData.length] = data;
        logData.length++;
    } else {
        for (i = 0; i < logData.length - 1; i++) {
            logData[i] = logData[i + 1];
        }
        logData[logData.length - 1] = data;
    }
    var logTemp = '';
    for (i = logData.length - 1; i >= 0; i--) {
        logTemp += logData[i];
    }
    document.getElementById('logConsole').innerHTML = logTemp;
}
var maxLogLines = 12;
// Genuinely shared mutable state (reassigned and/or read across files: battle.js,
// save.js, itemDrop/itemSell, dynamicHtml). As an ES module a `var` would be
// module-scoped. logData (the console ring-buffer) and playerInventory are
// mutated in place and exported; their few "reset" sites assign .length = 0
// instead of a new object/array, so they never need reassignment across modules.
var logData = {
    length: 0,
};
// Vanilla replacement for the jQuery notification animation
// `$("#id").delay(delayIn).fadeIn().delay(holdMs).fadeOut(fadeOutMs, remove)`.
// The elements are created hidden (style="display:none") via Log(); this fades
// them in (opacity 0->1 over ~400ms, jQuery's fadeIn default), holds, fades out,
// then removes. No-ops safely if the element is absent (matches jQuery, which
// silently skips an empty selector).
function fadeLog(id, delayIn, holdMs, fadeOutMs) {
    var el = document.getElementById(id);
    if (!el) return;
    var FADE_IN = 400;
    setTimeout(function () {
        if (!el.isConnected) return;
        el.style.transition = 'opacity ' + FADE_IN + 'ms';
        el.style.opacity = '0';
        el.style.display = '';
        // Trigger the fade-in on a later tick so the transition runs. Use
        // setTimeout, NOT requestAnimationFrame: rAF is paused in background/
        // hidden tabs (which would leave the notification stuck at opacity 0),
        // whereas setTimeout + CSS transitions keep working.
        setTimeout(function () {
            if (el.isConnected) el.style.opacity = '1';
        }, 20);
        setTimeout(function () {
            if (!el.isConnected) return;
            el.style.transition = 'opacity ' + fadeOutMs + 'ms';
            el.style.opacity = '0';
            setTimeout(function () {
                if (el.isConnected) el.remove();
            }, fadeOutMs);
        }, FADE_IN + holdMs);
    }, delayIn);
}
function potionBuyLog() {
    fadeLog('potionBuy', 200, 3000, 5000);
}
function notEnoughMoneyLog() {
    fadeLog('notEnoughMoney', 200, 3000, 5000);
}
function inventoryBuyLog() {
    fadeLog('inventoryBuy', 200, 3000, 5000);
}
function statBuyLog() {
    fadeLog('statBuy', 200, 3000, 5000);
}
function itemDropLog() {
    fadeLog('itemDropNew', 200, 3000, 5000);
}

function levelUpLog() {
    fadeLog('levelUpLog', 1800, 3000, 5000);
}
function deathLog() {
    fadeLog('playerDead', 200, 3000, 2000);
    fadeLog('playerDead2', 100, 3000, 2000);
    fadeLog('goldLost', 400, 3000, 2000);
    fadeLog('expLost', 400, 3000, 2000);
}

export {
    Log,
    logData,
    fadeLog,
    potionBuyLog,
    notEnoughMoneyLog,
    inventoryBuyLog,
    statBuyLog,
    itemDropLog,
    levelUpLog,
    deathLog,
};
