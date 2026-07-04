'use strict';

// Stage-mode panel behavior. The main tab panes (#mainPanels > .tab-pane) are
// overlay panels above the full-screen combat stage, toggled by the Bootstrap
// nav in #hudBar. Bootstrap tabs can only switch, never deselect — this module
// adds "close": an ✕ button injected into every panel, and clicking the
// already-active HUD tab closes its panel (Bootstrap ignores that click, so
// deselecting here doesn't fight it). No pane starts active: the game opens
// on a clear stage.

function panelForNavLink(link) {
    const href = link ? link.getAttribute('href') : null;
    return href && href.charAt(0) === '#' ? document.getElementById(href.slice(1)) : null;
}

function closePanel(pane) {
    if (pane) pane.classList.remove('active');
    const nav = document.getElementById('hudNav');
    if (!nav || !pane) return;
    for (const li of nav.querySelectorAll('li')) {
        const link = li.querySelector('a[data-toggle="tab"]');
        if (panelForNavLink(link) === pane) li.classList.remove('active');
    }
}

function init() {
    const nav = document.getElementById('hudNav');
    const panes = document.querySelectorAll('#mainPanels > .tab-pane');
    for (const pane of panes) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sell panelClose';
        btn.title = 'Close';
        btn.textContent = '✕';
        btn.addEventListener('click', () => closePanel(pane));
        pane.insertBefore(btn, pane.firstChild);
    }
    if (nav) {
        nav.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            // active at click time = Bootstrap will ignore it; we deselect
            // after the (non-)handling so a normal switch is unaffected
            if (li && li.classList.contains('active')) {
                const pane = panelForNavLink(li.querySelector('a[data-toggle="tab"]'));
                setTimeout(() => closePanel(pane), 0);
            }
        });
    }
}

init();
