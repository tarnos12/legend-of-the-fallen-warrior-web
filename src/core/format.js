'use strict';

// Pure number/display formatters, extracted from core/core.js. No imports.
// compare() renders a green/red "+N"/"-N" delta (used by the item tooltips).

function getNumberMultiplierofFive(n) {
    if (n > 100) {
        return 100;
    } else if (n > 4) return Math.ceil(n / 5.0) * 5;
    else if (n < 0) return Math.floor(n / 5.0) * 5;
    else return 1;
}

function getTen(n) {
    if (n > 8) return Math.ceil(n / 8.0) * 10;
    else if (n < 0) return Math.floor(n / 8.0) * 10;
    else return 10;
}
function getThousands(n) {
    if (n > 9999 && n < 1000000) {
        return Math.floor(n / 1000) + 'K';
    } else if (n > 999999) {
        return Math.floor(n / 1000000) + 'M';
    } else {
        return Math.floor(n);
    }
}
// Compact big-number display (`1.2M`, `3.4B`, `150M`) for the HUD counters that
// climb into the millions in idle play. Numbers below 10000 stay exact (so a
// freshly loaded 1234-gold save still reads "1234"); above that we truncate
// (never round up — gold/exp shouldn't look bigger than it is) to one decimal,
// trimmed, and tag K/M/B/T/Qa. Accepts a string or number (gold arrives as a
// toFixed'd string). getThousands (older, integer-only, capped at M) is kept for
// its existing callers/tests.
function formatBig(n) {
    n = Number(n);
    if (!isFinite(n)) return 0;
    const abs = Math.abs(n);
    if (abs < 10000) return Math.floor(n);
    const units = [
        { v: 1e15, s: 'Qa' },
        { v: 1e12, s: 'T' },
        { v: 1e9, s: 'B' },
        { v: 1e6, s: 'M' },
        { v: 1e3, s: 'K' },
    ];
    const sign = n < 0 ? '-' : '';
    for (const u of units) {
        if (abs >= u.v) {
            const scaled = abs / u.v;
            // >=100 of a unit: drop the decimal (150M, not 150.0M)
            const str =
                scaled >= 100
                    ? String(Math.floor(scaled))
                    : String(Math.floor(scaled * 10) / 10);
            return sign + str + u.s;
        }
    }
    return Math.floor(n);
}

function compare(z, x, other) {
    //Other such as %...
    if (z > x) {
        return '<font color="#50bd27">+ ' + Math.floor(z - x) + other + '</font>';
    } else if (z < x) {
        return '<font color="red">' + Math.floor(z - x) + other + '</font>';
    } else {
        return Math.floor(z) + other;
    }
}

// Single source of truth for an item's art filename (relative to
// images/items/<subType>/). Weapons and shields append a level-bucket number
// (swordLegendary25.png); armor and accessories don't (helmetLegendary.png).
// Used by itemDrop generation and by save.js's on-load repair — keeping them in
// sync (they drifted once, which broke every weapon/shield icon after a load).
function itemImageName(item) {
    var name = item.subType + item.itemRarity;
    if (item.itemType === 'weapon' || item.subType === 'shield') {
        name += getNumberMultiplierofFive(item.iLvl);
    }
    return name;
}

export { getNumberMultiplierofFive, getTen, getThousands, formatBig, compare, itemImageName };
