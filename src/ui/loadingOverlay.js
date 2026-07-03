'use strict';

// Boot loading overlay: preloads every combat sprite (56 monsters + races)
// behind the full-screen #loadingOverlay in index.html, driving its progress
// bar + percentage, and removes the overlay when everything is in. The game
// underneath isn't interactable until then. Uses the SHARED image cache in
// uiCommon.js, so the combat canvas finds every sprite already complete.
//
// Failsafes: a failed image download still counts as progress (the canvas
// draws its placeholder for genuinely missing files), and a hard timeout
// removes the overlay even if a request hangs — loading may never brick the
// game.
import { monsterList, MakeMonsterList } from '../data/monsterList.js';
import { characterRaces } from '../data/gameObjects.js';
import { getImage } from './uiCommon.js';

const MIN_VISIBLE_MS = 400; // don't flash-blink the overlay on warm caches
const FAILSAFE_MS = 15000;

function assetUrls() {
    // monsterList is only populated by newGame/load; building it at boot is
    // safe (same fixed key set, default player properties) and load()/newGame
    // rebuild it anyway.
    if (Object.keys(monsterList).length === 0) MakeMonsterList();
    const urls = [];
    for (const key in monsterList) {
        urls.push('images/monsters/' + monsterList[key].name + '.png');
    }
    for (const key in characterRaces) {
        try {
            urls.push('images/races/' + characterRaces[key].image() + '.png');
        } catch {
            /* skip a race whose image can't resolve yet */
        }
    }
    return urls;
}

function init() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    const bar = document.getElementById('loadingOverlayBar');
    const pct = document.getElementById('loadingOverlayPct');
    const startedAt = performance.now();

    const urls = assetUrls();
    const total = urls.length;
    let done = 0;

    function finish() {
        const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
        setTimeout(() => overlay.remove(), wait);
    }

    function progressed() {
        done++;
        const percent = Math.floor((done / total) * 100);
        if (bar) bar.style.width = percent + '%';
        if (pct) pct.innerHTML = percent + '%';
        if (done >= total) finish();
    }

    if (total === 0) {
        finish();
        return;
    }
    for (const url of urls) {
        const img = getImage(url);
        if (img.complete) progressed();
        else {
            img.addEventListener('load', progressed, { once: true });
            img.addEventListener('error', progressed, { once: true });
        }
    }
    // belt and braces: never leave the overlay stuck on a hung request
    setTimeout(() => {
        const el = document.getElementById('loadingOverlay');
        if (el) el.remove();
    }, FAILSAFE_MS);
}

init();
