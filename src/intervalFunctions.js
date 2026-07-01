// ES module (Phase 3 incremental migration of the former public/js/*.js scripts).
//
// Reads of game state that still lives in classic global scripts (player, Log)
// use bare names: in a module those resolve through the global object, which the
// classic scripts populate, so no change is needed there. This module's own
// public functions, however, are no longer auto-attached to window, so we
// re-expose them explicitly for the remaining classic scripts and inline
// handlers that still call them by name.
import { player } from './core.js';

export function playerRevive() {
    setTimeout(
        function () {
            player.properties.health = player.functions.maxhealth();
            player.properties.isDead = false;
        }, 5000);
}

export function playerReviveCheck() {
    if (player.properties.isDead === true) {
        playerRevive();
        Log("<span class =\"bold\" style=\"color:red\">You have died!</span>");
        Log("You need to wait 5 seconds before you can fight again!");
    }
}

// playerRevive/playerReviveCheck are exported (inline above) and imported by
// their callers (battle.js, save.js); neither is dispatched from inline onclick.
