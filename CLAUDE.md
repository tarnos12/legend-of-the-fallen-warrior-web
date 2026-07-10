# Legend of the Fallen Warrior — project instructions

Idle/incremental browser RPG. Vanilla ES modules + Vite; Bootstrap 3 + jQuery 1.11
as classic scripts. **Hard rule: refactors must not change gameplay, logic, or
rendered output.**

## Documentation — keep it in sync

**`ARCHITECTURE.md` is the map of the codebase.** Whenever a change alters what that
file describes, update it **in the same commit**. That means:

- adding, moving, renaming, or deleting a module
- changing what a module owns/renders, or its cross-module exports
- adding/removing `window.*` onclick handlers
- changing conventions (state handling, rendering style, folder layout)
- adding npm scripts or test files

Small internal edits (fixing a function body, converting syntax) don't need a doc
update. When in doubt: if a new reader using ARCHITECTURE.md to find something would
be misled, update it.

## Layout (details in ARCHITECTURE.md)

`src/main.js` (entry + initGame) · `src/ui/` (rendering) · `src/core/` (player
state, shared `state`, save) · `src/data/` (game definitions) · `src/systems/`
(battle, drops, quests, stats, professions, potions, intervals).

## Key conventions

- `window.*` is ONLY for inline-onclick handlers; each module registers its own via
  `Object.assign(window, {...})`. Everything else uses real import/export.
- Shared reassigned primitives live in `core/state.js` (`state.x`); shared
  arrays/objects are exported `const` mutated in place — never reassigned.
- Render functions: template literals + `.map().join('')`; output must stay
  byte-identical when refactoring (golden-master jsdom diff technique — see the
  template-rollout commits).
- Save-wipe guard: `player.properties.gameVersion` must equal `currentGameVersion`
  (test-covered). Bump both together.
- Node is at `C:\Program Files\nodejs\`; in Bash, prefix with
  `export PATH="/c/Program Files/nodejs:$PATH"`.

## Verify every change

`npm run build` (catches module-graph errors the dev console misses) · `npm test`
(jsdom) · `npm run lint` (must be completely clean — 0 errors, 0 warnings) ·
live check in the Vite preview (mute `#myAudio` first).

## Always give the user a test link

**Every time work finishes, end the summary with a clickable link to try it.**
In a remote/cloud session that means the live GitHub Pages URL —
https://tarnos12.github.io/legend-of-the-fallen-warrior-web/ — after running
`npm run deploy` so the link reflects the change (localhost is unreachable to
the user there). In a local session the dev-server URL works too (normally
http://localhost:5173 — start it with `npm run dev` if it isn't up).
