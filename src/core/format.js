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

export { getNumberMultiplierofFive, getTen, getThousands, compare, itemImageName };
