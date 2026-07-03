// Shared helpers for the jsdom test suite (not a test file).
import fs from 'node:fs';
import path from 'node:path';

// Install a chainable jQuery stub: $(fn) runs the fn (DOM-ready), any other
// call returns an object whose every method returns itself (tooltip, empty,
// append, remove, ...). Enough for the render/save paths under test.
export function stubJQuery() {
    const chain = new Proxy(
        {},
        {
            get(_t, prop) {
                if (prop === Symbol.toPrimitive || prop === 'toString') return () => '';
                return () => chain;
            },
        }
    );
    globalThis.$ = (arg) => {
        if (typeof arg === 'function') arg();
        return chain;
    };
    return chain;
}

// Load the real index.html <body> into jsdom so every container id the
// renderers write to exists, exactly like in the browser. Scripts inside
// innerHTML are not executed by jsdom, so only the static DOM comes over.
export function loadGameDom() {
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    const body = html.slice(html.indexOf('<body>') + '<body>'.length, html.indexOf('</body>'));
    document.body.innerHTML = body;
    // The shop pane containers are created dynamically by createShopTabs() in the
    // browser (inside #shopTabs); recreate them so shopOther()/displayShopItems()
    // have their targets like they would mid-game.
    document.getElementById('shopTabs').innerHTML =
        '<div id="shopWeapon"></div><div id="shopArmor"></div>' +
        '<div id="shopAccessory"></div><div id="shopOther"></div>';
}

// Capture the EXACT raw string a render function assigns to el.innerHTML
// (not the jsdom-normalized read-back). Trailing helpers (updateHtml/testss/
// myAudio.play) may throw in jsdom; innerHTML is always set before them.
const rawInnerHTML = Object.getOwnPropertyDescriptor(globalThis.Element.prototype, 'innerHTML');
export function captureRender(fn, id) {
    const el = document.getElementById(id);
    if (!el) throw new Error('missing container #' + id);
    let raw = '';
    Object.defineProperty(el, 'innerHTML', {
        configurable: true,
        get() {
            return rawInnerHTML.get.call(this);
        },
        set(v) {
            raw = v;
            rawInnerHTML.set.call(this, v);
        },
    });
    try {
        fn();
    } catch {
        /* trailing side-effect helpers may throw in a bare jsdom DOM */
    }
    delete el.innerHTML;
    return raw;
}
