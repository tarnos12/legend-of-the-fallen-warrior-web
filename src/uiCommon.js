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
