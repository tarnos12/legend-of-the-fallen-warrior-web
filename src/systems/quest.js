'use strict';
import { monsterAreas } from '../data/gameObjects.js';
import { monsterList } from '../data/monsterList.js';
import { CreateMonsterHtml } from '../ui/monsterUI.js';

// Progression gate: each cleared monster reveals the next (isShown) and every
// area boss unlocks the next area (monsterAreas[i].isUnlocked). Runs on every
// kill (also under quiet offline/headless sims); quiet skips only the final
// progression-panel rerender. (The old per-kill Story-tab narrative writes were
// removed with that tab.)
export function quest(quiet) {
    if (monsterList.monster001.killCount >= 10) {
        monsterList.monster002.isShown = true;
    }
    if (monsterList.monster002.killCount >= 10) {
        monsterList.monster003.isShown = true;
    }
    if (monsterList.monster003.killCount >= 10) {
        monsterList.monster004.isShown = true;
    }
    if (monsterList.monster004.killCount >= 10) {
        monsterList.monster005.isShown = true;
    }
    if (monsterList.monster005.killCount >= 10) {
        monsterList.monster006.isShown = true;
    }
    if (monsterList.monster006.killCount >= 10) {
        monsterList.monster007.isShown = true;
    }
    if (monsterList.monster007.killCount >= 1) {
        monsterList.monster008.isShown = true;
    }
    if (monsterList.monster008.killCount >= 1) {
        monsterList.monster009.isShown = true;
        monsterAreas[1].isUnlocked = true;
    }
    if (monsterList.monster009.killCount >= 10) {
        monsterList.monster010.isShown = true;
    }
    if (monsterList.monster010.killCount >= 10) {
        monsterList.monster011.isShown = true;
    }
    if (monsterList.monster011.killCount >= 10) {
        monsterList.monster012.isShown = true;
    }
    if (monsterList.monster012.killCount >= 10) {
        monsterList.monster013.isShown = true;
    }
    if (monsterList.monster013.killCount >= 10) {
        monsterList.monster014.isShown = true;
    }
    if (monsterList.monster014.killCount >= 10) {
        monsterList.monster015.isShown = true;
    }
    if (monsterList.monster015.killCount >= 1) {
        monsterList.monster016.isShown = true;
    }
    if (monsterList.monster016.killCount >= 1) {
        monsterList.monster017.isShown = true;
        monsterAreas[2].isUnlocked = true;
    }
    if (monsterList.monster017.killCount >= 10) {
        monsterList.monster018.isShown = true;
    }
    if (monsterList.monster018.killCount >= 10) {
        monsterList.monster019.isShown = true;
    }
    if (monsterList.monster019.killCount >= 10) {
        monsterList.monster020.isShown = true;
    }
    if (monsterList.monster020.killCount >= 10) {
        monsterList.monster021.isShown = true;
    }
    if (monsterList.monster021.killCount >= 10) {
        monsterList.monster022.isShown = true;
    }
    if (monsterList.monster022.killCount >= 10) {
        monsterList.monster023.isShown = true;
    }
    if (monsterList.monster023.killCount >= 1) {
        monsterList.monster024.isShown = true;
    }
    if (monsterList.monster024.killCount >= 1) {
        monsterList.monster025.isShown = true;
        monsterAreas[3].isUnlocked = true;
    }
    if (monsterList.monster025.killCount >= 10) {
        monsterList.monster026.isShown = true;
    }
    if (monsterList.monster026.killCount >= 10) {
        monsterList.monster027.isShown = true;
    }
    if (monsterList.monster027.killCount >= 10) {
        monsterList.monster028.isShown = true;
    }
    if (monsterList.monster028.killCount >= 10) {
        monsterList.monster029.isShown = true;
    }
    if (monsterList.monster029.killCount >= 10) {
        monsterList.monster030.isShown = true;
    }
    if (monsterList.monster030.killCount >= 10) {
        monsterList.monster031.isShown = true;
    }
    if (monsterList.monster031.killCount >= 1) {
        monsterList.monster032.isShown = true;
    }
    if (monsterList.monster032.killCount >= 1) {
        monsterList.monster033.isShown = true;
        monsterAreas[4].isUnlocked = true;
    }
    if (monsterList.monster033.killCount >= 10) {
        monsterList.monster034.isShown = true;
    }
    if (monsterList.monster034.killCount >= 10) {
        monsterList.monster035.isShown = true;
    }
    if (monsterList.monster035.killCount >= 10) {
        monsterList.monster036.isShown = true;
    }
    if (monsterList.monster036.killCount >= 10) {
        monsterList.monster037.isShown = true;
    }
    if (monsterList.monster037.killCount >= 10) {
        monsterList.monster038.isShown = true;
    }
    if (monsterList.monster038.killCount >= 10) {
        monsterList.monster039.isShown = true;
    }
    if (monsterList.monster039.killCount >= 1) {
        monsterList.monster040.isShown = true;
    }
    if (monsterList.monster040.killCount >= 1) {
        monsterList.monster041.isShown = true;
        monsterAreas[5].isUnlocked = true;
    }
    if (monsterList.monster041.killCount >= 10) {
        monsterList.monster042.isShown = true;
    }
    if (monsterList.monster042.killCount >= 10) {
        monsterList.monster043.isShown = true;
    }
    if (monsterList.monster043.killCount >= 10) {
        monsterList.monster044.isShown = true;
    }
    if (monsterList.monster044.killCount >= 10) {
        monsterList.monster045.isShown = true;
    }
    if (monsterList.monster045.killCount >= 10) {
        monsterList.monster046.isShown = true;
    }
    if (monsterList.monster046.killCount >= 10) {
        monsterList.monster047.isShown = true;
    }
    if (monsterList.monster047.killCount >= 1) {
        monsterList.monster048.isShown = true;
    }
    if (monsterList.monster048.killCount >= 1) {
        monsterList.monster049.isShown = true;
        monsterAreas[6].isUnlocked = true;
    }
    if (monsterList.monster049.killCount >= 10) {
        monsterList.monster050.isShown = true;
    }
    if (monsterList.monster050.killCount >= 10) {
        monsterList.monster051.isShown = true;
    }
    if (monsterList.monster051.killCount >= 10) {
        monsterList.monster052.isShown = true;
    }
    if (monsterList.monster052.killCount >= 10) {
        monsterList.monster053.isShown = true;
    }
    if (monsterList.monster053.killCount >= 10) {
        monsterList.monster054.isShown = true;
    }
    if (monsterList.monster054.killCount >= 10) {
        monsterList.monster055.isShown = true;
    }
    if (monsterList.monster055.killCount >= 1) {
        monsterList.monster056.isShown = true;
    }
    if (quiet !== true) CreateMonsterHtml();
}

// quest is exported (inline above) and imported by its callers (battle, core,
// save); it is not onclick-dispatched.
