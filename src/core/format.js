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

export { getNumberMultiplierofFive, getTen, getThousands, compare };
