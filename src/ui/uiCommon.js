'use strict';

// Shared UI helper extracted from dynamicHtml.js so the focused *UI.js modules
// can import it without depending on the whole render file. (Re)initialises the
// Bootstrap tooltips on every [data-toggle="tooltip"] node. Uses jQuery, matching
// the rest of the legacy UI layer.
export function testss() {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip();
    });
}

// Global String helper used across the UI layer (and professions/itemDrop/etc).
// Lives here — a zero-dependency module imported early — so the prototype is
// installed before any render function that calls it runs. Use as
// "string".capitalizeFirstLetter().
String.prototype.capitalizeFirstLetter = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
