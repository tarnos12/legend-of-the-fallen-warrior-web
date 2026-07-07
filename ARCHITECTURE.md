# Architecture — Legend of the Fallen Warrior

Idle/incremental browser RPG. No framework — vanilla ES modules bundled by **Vite**,
with Bootstrap 3 + jQuery 1.11 for styling/widgets (loaded as classic scripts from
`index.html`). This file is the map of the code: what lives where, what each module
owns, and the conventions that keep it working.

> **Keep this file updated.** When you add/move/rename a module, change what a module
> owns, or add/remove exports that other modules use, update the matching section here
> in the same commit.

## Top-level layout

| Path | What it is |
|---|---|
| `index.html` | The page. Static DOM skeleton, classic `<script>` tags (jQuery/Bootstrap), and the module entry `<script type="module" src="/src/main.js">`. **Stage layout**: `#stage` (full-viewport combat canvas + `#battleControls` + `#monsterTabs` quest tracker + `#logConsole` + `#stageDock` with buffs/hotbar) sits under everything; `#hudBar` is fixed at the bottom (vitals `#progressBar`/`#progressBar2`, level/exp/gold spans, mute, and `#hudNav` — the Bootstrap tab nav); the main tab panes in `#mainPanels` render as overlay panels above the stage (no pane active at boot). Difficulty buttons + donate live in the Options pane. |
| `src/` | All game code (ES modules), organized by layer — see below. |
| `test/` | Vitest tests (jsdom). `smoke` (import graph), `logic` (helpers/equipment/item-gen), `game-data` (save-wipe guard, saves, monsters, races), `render` (byte-exact snapshots of every deterministic renderer — regenerate deliberately with `vitest run -u` after reviewing the diff), `derived-stats` (player/monster math snapshots), `save-roundtrip` (full save→load through the real functions against the real index.html DOM), `weapon-behavior` (combat profiles + loot affixes), `combat-sim` (the real canvas combat driven deterministically via a stubbed 2D context + `pump()`: wave auto-start/rewards, auto-progress, death step-back, waveUnlocks↔quest consistency), `offline` (away-time grants, caps, banner), `waves` (5-wave grouping invariants + unlock-prefix pools), `item-affixes` (slot-restricted affix pools + compressed power curve), `equip-stats` (equipped sparse items keep player stats finite — no NaN), `boss-uniques` (named boss unique drops + signature affixes), `cards` (collectible card drops, set completion, rate bonuses). `utils.js` holds the shared jsdom helpers (jQuery stub, index.html DOM loader, raw-innerHTML capture). |
| `public/` | Static assets served as-is (jquery/, vendor/, js/bootstrap, sounds/, css/, icons/ + `manifest.webmanifest` — the PWA identity that makes the game installable; icons are generated procedurally, see the commit that added them). `css/theme.css` is the dark-fantasy skin: loaded **last** from `index.html`, it overrides Bootstrap + the legacy css purely with CSS (custom properties in `:root`, a `body.pre-game` rule that hides the in-game chrome until `removeStartingScreen()` drops the class, the stage-mode layout — `#stage` fills the viewport above the fixed `#hudBar` (height in `--hud-h`) and `#mainPanels > .tab-pane` become centered overlay panels — and a `max-width: 767px` block for mobile: two-row HUD, full-bleed panels, hidden stage log, 40px touch targets, tooltip clamping, overflow-x fix). Restyle here, not in render code. |
| `images/` | Game art (items/monsters/races/skills/buffs/stat icons). |
| `vite.config.mjs` | Vite + Vitest config (jsdom test environment lives here under the `test` key). |
| `eslint.config.js`, `.prettierrc.json` | Lint (flat config, `no-undef` is the load-bearing rule) and format config. |

## `src/` layers

```
src/
  main.js        entry point + initGame() bootstrap
  ui/            rendering (writes innerHTML, registers onclick handlers)
  core/          player state, shared mutable state, save/load
  data/          static-ish game definitions (built at import time)
  systems/       gameplay logic (battle, drops, quests, stats, professions...)
```

Dependency direction (roughly): `ui/` and `systems/` depend on `core/` and `data/`;
`main.js` imports everything in the original classic-script load order and then runs
`initGame()`. A few circular imports exist (e.g. `shopUI ↔ core`, `shop ↔ shopUI`);
they are safe because the cross-module references are inside function bodies, never at
module-evaluation time. Keep it that way.

### `src/main.js` — entry
Imports every module (side-effect imports register inline-onclick handlers on
`window`), then `initGame()`: startingScreen, startLogo, delayed `testss()`,
`createEquippedItemsObject`, `copyPlayerProperties`, herbs/minerals/professions HTML.
Also mutes `#myAudio` under the dev server only (`import.meta.env.DEV`).

### `src/ui/` — rendering
Each module renders one area of the screen, owns its own tab/selection state, and
self-registers its inline-onclick handlers via `Object.assign(window, {...})`.

| File | Renders / owns | Key exports (imported elsewhere) | window handlers |
|---|---|---|---|
| `uiCommon.js` | Bootstrap tooltip re-init; installs `String.prototype.capitalizeFirstLetter`; the shared image cache | `testss`, `getImage`, `imageCache` | — |
| `loadingOverlay.js` | Boot loading screen: preloads all combat sprites behind the static `#loadingOverlay` (index.html) with a progress bar + %, removes it at 100%. Failed downloads count as progress and a 15 s failsafe removes it regardless — loading can never brick startup. Shares the `uiCommon` image cache with the combat canvas. | — | — |
| `stageUI.js` | Stage-mode panel close behavior: injects an ✕ (`.panelClose`) into every `#mainPanels > .tab-pane` overlay and deselects a panel when its already-active `#hudNav` tab is clicked again (Bootstrap tabs can switch but never deselect). Pure DOM, no game state. | — | — |
| `skillTreeUI.js` | Canvas skill trees (Skills panel, Nodebuster-style): `#passiveTreeCanvas` — the passive grid as connected node columns (Offensive/Defensive/Utility; glow = affordable, click spends a point via `window.upgradePassive`), `#weaponTreeCanvas` — one column per weapon (mastery node + its skills, lit at mastery level ≥ requirement; informational). Nodes get a deterministic sideways drift (`swayX`) and are joined by bezier "vine" connectors (`drawVine`) so chains read organically, not as ramrod columns — purely visual, hit boxes use the same drifted positions. Hover fills `#passiveTreeInfo`/`#weaponTreeInfo`. These canvases are the sole presentation of the skill trees (the old hidden DOM renderers `CreateWeaponSkillHtml`/`CreatePlayerSkillsHtml` + `updateBar` were removed). | — | `renderSkillTrees` (HUD nav onclick) |
| `mapUI.js` | World-map panel (`#tab_mainMap`): the 7 areas as clickable canvas nodes (`#mapCanvas`) over a fully procedural painted continent — a deterministic sine-perturbed coastline (`coastPath`/`coastM`/`isOcean`), per-area biome tints + terrain glyphs (trees/mountains/dunes/towers), ocean waves, and a compass, all pure functions of position so they're stable across redraws (helpers: `drawBasemap`, `makeRng`, `hexA`) — plus a dotted travel trail, 🔒 for locked, and an outlined "you are here" marker. Clicking a node fills `#mapInfo` (level range, bestiary-aware enemy list, drops summary + the area boss's signature unique name from `data/bossUniques.js`, Travel button → `battleCanvas.travelTo`, restarting at wave 1). | — | `renderWorldMap` (HUD nav onclick) |
| `bestiaryUI.js` | Bestiary panel (`#tab_mainBestiary`): one card per monster grouped by area, driven by persisted `killCount`. Knowledge tiers: 0 = ???, 1+ name/portrait/level, 10+ combat stats, 25+ rewards, 100 = mastered (drops summary; for area bosses also names the boss's signature unique from `data/bossUniques.js`). Also shows collectible-card status per monster + per-area set progress/bonus (from `systems/cards.js`). | `BESTIARY_MASTERY_KILLS` | `renderBestiary` (HUD nav onclick) |
| `monsterUI.js` | On-stage quest tracker (`#monsterTabs`, always visible on `#stage`): the current area's single active objective — next locked wave's live unlock requirement (from `data/waveUnlocks.js`), else the area boss, else "cleared / Warp available". Refreshed per kill via `quest()`. | `CreateMonsterHtml`, `changedTabmonster` (area select by index, used by rebirth) | — |
| `panelsUI.js` | Stat panels: `#checkBoxHtml`, `#primaryStat`, `#secondaryStat`, `#activeBuffs` | `checkBoxHtml`, `primaryStatUpdate`, `secondaryStatUpdate`, `activeBuffsHtml` | — |
| `inventoryUI.js` | Inventory tabs (`#inventory`): a fixed 5-wide `.invGrid` of 64px icon cells (min 4 rows, empty slots rendered) — rarity = outline color, headline number (avg dmg / defense / iLvl) as a corner `.invPower` badge, detail in the hover tooltip. Click equips; RIGHT-click sells (Epic/Legendary singles confirm — itemSell.js); the 💰 Sell-mode toggle (module-local, like the tab index) makes left-click sell too (the touch path). Also equipped-item slots (`#equipHtml`), item tooltips; inventory tab state | `CreateInventoryWeaponHtml`, `unequipItemLoad`, `EquippedItemsEmpty`, `checkIfEquippedEmpty`, `itemTooltipTest` (reused by shopUI) | `CreateInventoryWeaponHtml`, `toggleSellMode`, `invCellClick` |
| `shopUI.js` | Item shop (`#shopTabs`, `#shop*` panes, `#shopOther`); **owns the shop stock arrays** `itemShopWeapon/Armor/Accessory` (mutated in place, never reassigned). Wares render as the same `.invGrid` slot cells as the inventory (`.shopCell`: hidden selection radio, gold ring via `:has(input:checked)`, price as the corner badge) | stock arrays, `displayShopItems`, `ShopBuyButtons`, `refillShopInterval`, `shopOther` | `itemBuy`, `rerollShopItems` |
| `characterUI.js` | Starting screen (`#buttonDiv`, `#gameLogo`), new/load save-slot grids (`#raceCreation`), race pick + race tooltip (`#characterRace`), save/load/reset buttons (`#saveGameSlot`) | `startLogo`, `startingScreen`, `removeStartingScreen`, `characterCreationHtml`, `checkHeroRace`, `saveGameSlot` | `newGameSlot`, `loadGameSlot`, `backToStartingScreen`, `changeMusicImage`, `getAgeButton`, `getAge` |
| `battleCanvas.js` | **THE combat system — idle** (`#battleCanvas` arena + `#battleControls` bar in index.html). Waves run continuously: the loop auto-starts the selected wave 1.2 s after each one ends. Control bar: area `<select>`, wave ◀ x/5 ▶ nav (5 wave groups per area — `data/waves.js`; clamped to the unlocked prefix), "Auto progress" checkbox — a cleared wave advances to the next unlocked wave; a death steps one wave back (never stuck idle). Selection persists on `player.properties.combatArea/combatWave/combatAutoProgress`; `travelTo(areaType)` exported for mapUI. Waves: 1–5 enemies picked semi-randomly from the wave group's UNLOCKED members (boss wave = a solo duel); each enemy carries its own monster/sprite/rewards, and ~5% spawn **shiny** (golden aura, ✨) for triple exp/gold + doubled drop roll (`SHINY_CHANCE`; multipliers in battle.js/itemDrop.js). Enemies bounce-attack round-robin (stunned enemies skip turns); hero auto-attacks per its `weaponBehavior` profile (sword fast+crit+parry, axe cleave, mace heavy+stun, bow pierce, staff splash) and auto-casts the strongest affordable spell. All rules from `systems/battle.js`; per-kill classic rewards + full-heal cadence; only enemy hp pools are local clones. setTimeout sim loop, fixed 50 ms substeps (rAF pauses in hidden tabs). Old Fight buttons still work as manual wave selection. **Rendering**: combat runs in a fixed 700x280 logical world (`WORLD_W/H` — balance is viewport-independent and jsdom sims are untouched); `resizeCanvas()` sizes the bitmap to the full-screen `#stage` (DPR-aware, self-healing every 32 frames) and `draw()` maps world→screen via `viewTransform()` (fit, clamp zoom 0.85–2.6, center, anchor bottom; ground band drawn full-width in screen space). | — | wraps `startBattle`; dev-only `__battleCanvasDebug` (incl. `pump(secs)`, `giveWeapon`, `setQuiet`) |

### `src/core/` — state & persistence

| File | Owns | Notes |
|---|---|---|
| `core.js` | `player` (properties/functions/buffs), `equippedItems` + `createEquippedItemsObject`, `playerInventory`, `defaultValues` + `copyPlayerProperties`, `currentGameVersion` | Pure player state — no handlers, no rendering. Only imports its three data providers (weaponMastery, skills, gameObjects). Offensive accessory readers: `totalCriticalChance` sums weapon + accessory-slot crit, and `totalBonusDamage` sums accessory-slot `Bonus damage` (weapon's is folded into MinDamage at generation, so excluded) into the `bonusDamage()` multiplier. |
| `log.js` | `Log` + `logData` ring buffer (`#logConsole`), `fadeLog` fade animation, the named notification helpers (`potionBuyLog`, `deathLog`, `levelUpLog`, ...) | Self-contained (no game-state imports). |
| `format.js` | Pure number/display formatters: `formatBig` (compact `1.2M`/`3.4B` HUD counters — exact below 10000, else truncated 1-decimal K/M/B/T/Qa; used for gold + exp), `getThousands` (legacy integer K/M), `getTen`, `getNumberMultiplierofFive`, `compare` (green/red delta markup) | No imports. |
| `state.js` | `state` object holding shared **reassigned primitives** (battleTurn, damageTaken, hardcoreMode, checkedShopItem, checkBox\*, weapon/armor/accessoryAmount) | Primitives can't be live-rebound across modules, hence one shared object. Add new shared reassigned scalars here. |
| `save.js` | Save/load/reset to `localStorage` (base64 `EncodedSave`, `EncodedSave1..3`), `pageReload`, version check | **Save-wipe guard:** `player.properties.gameVersion` must equal `currentGameVersion` or loads wipe. Covered by a test. |

### `src/data/` — game definitions (built at import time)

| File | Owns |
|---|---|
| `gameObjects.js` | Stat panel definitions (`primaryStatInfo`, `secondaryStatInfo`), item type/subtype/rarity/modifier tables, `monsterAreas`, `weaponTypeObject`, `characterRaces` + `raceStats`, equipment slot info (`loadingEquippedItems`, `emptyItemSlotInfo`, `InventoryItemTypes`), crafting (`itemToCraft`). |
| `monsterList.js` | `monsterList` (mutate-in-place) + `MakeMonsterList()` (56 monsters). |
| `waveUnlocks.js` | Display table of the wave-unlock kill thresholds, derived 1:1 from quest.js (which remains the source of truth; `test/combat-sim.test.js` asserts consistency). |
| `cards.js` | Collectible-card data (2026-07): `CARD_DROP_CHANCE` (0.03, 2× shiny) and `CARD_SET_BONUS` — per-area set bonus (gold/drop/exp %) granted when every monster card in that area is owned. Logic in `systems/cards.js`. |
| `bossUniques.js` | Named boss uniques (2026-07 redesign, Phase 2): `BOSS_UNIQUES` keyed by each area boss's monster `name` → a signature named item (fixed slot + guaranteed signature affix + lore). `BOSS_UNIQUE_CHANCE` (0.2, doubled for shiny) and `signatureValue(sig, level)`. Consumed by `itemDrop.rollBossUnique`, called from `battle.grantKillRewards`. Signature affix keys follow the same slot-applies rule as `affixes.js`. Tests: `test/boss-uniques.test.js`. |
| `affixes.js` | Curated item affix pools (2026-07 redesign): per-slot `AFFIX_POOLS` (prefix = power, suffix = utility) where every affix `key` matches a stat the player actually reads for that slot (so no crit on shields, no armor on swords). Accessories (ring/amulet) carry LIVE offensive affixes — direct crit (`flatCrit`) and % bonus damage (`flatDamage`, a modest accessory-only version of Bonus damage that core reads instead of folding into weapon damage); weaponBehavior specials + Life-on-hit stay weapon-only. `RARITY_AFFIX_BUDGET` (how many prefix/suffix slots each rarity rolls — Common 0, up to Legendary 3+3), and `rollAffixValue`. Consumed by `systems/itemDrop.js`. The compressed rarity power curve (Legendary ≈1.8× Common) lives in `gameObjects.js` itemRarity.power. Invariants in `test/item-affixes.test.js`. |
| `waves.js` | 5-wave grouping per area over the monster chain: `waveGroups` (solo opener / 3 middle pools / solo boss), `unlockedWaveMembers` (a wave's spawn pool = its `isShown` members), `unlockedWaveCount` (prefix), `isBossWave`. Used by battleCanvas (spawning/progression), offline, mapUI, bestiaryUI. Invariants in `test/waves.test.js`. |
| `skills.js` | `playerPassive` (35 passives), `weaponSkillList`. |
| `weaponMastery.js` | `weaponMastery` per-weapon stat multipliers. |
| `shop.js` | Shop "other" price/status objects (`potionStatus`, `mediumPotionStatus`, `superPotionStatus`, `backpackStatus`, `statStatus`) + buy handlers (buyStat, buyBackpack, buy\*Potion) on window. |

### `src/systems/` — gameplay logic

| File | Owns |
|---|---|
| `battle.js` | Combat rules engine (the classic 1v1 button combat was deleted; `battleCanvas.js` is the only consumer). Canvas-combat API: `heroStrikeRoll`/`heroSpellRoll` (hit/instakill/crit/defense/lifesteal/mastery/mana), `monsterAttack(monster, target)` (evasion/parry/thorn/counter/block vs real player health, `playerDead`), `grantKillRewards(monster, quiet)` (exp/level-up, gold, drop, kill count, quest, Warp), `displayLogInfo(quiet)` (per-kill heal + buff tick + panel rerender). `quiet=true` (offline progress, balance harness) always runs the game logic — including `quest(quiet)` unlocks and the heal/buff tick — and skips only the per-kill DOM rerenders. |
| `equip.js` | Equip/unequip/sort logic + slot lookup tables; `getStartingItem` (used by changeRace). `equipItem`/`unequipItem`/`sortInventory` on window. |
| `weaponBehavior.js` | `weaponCombatProfile(weapon?)`: how each weapon class behaves in canvas combat — sword fast+crit+parry, axe cleave, mace heavy+stun, staff splash, bow pierce — plus the item special-stat modifiers (`Attack speed`, `Extra targets`, `Stun chance`) so future item affixes change battle behavior with no combat-code changes. Unit-tested in `test/weapon-behavior.test.js`. |
| `gameControls.js` | Player-facing controls: `disableButtons` (monster-button lockout), sell-filter checkboxes (`handleClick`), hardcore toggle, `changeRace`, audio (`myAudio`/`muteAudio`), `selectText`, `resetPassiveSkills`, shop-radio listener + `sortShop`, `changeDifficulty`, `rebirth` — all on window. |
| `itemDrop.js` | Procedural item generation `getItemType`, monster drops `monsterItemDrop` (quiet mode for offline bulk grants). Fills `playerInventory` or the shopUI stock arrays. **Affixes** (2026-07 redesign): base stats (weapon damage / armor defense / shield block / weapon-subtype crit) are set first, then `rollAffixes` draws prefixes+suffixes from the slot's `data/affixes.js` pool by the rarity budget — folding `Bonus damage`→MinDamage (weapons) / storing it as a live key (accessories, `flatDamage`), `Bonus armor`→defense, adding crit (weapons + accessories), setting attributes/utility. Item quality (Superior/Inferior) is a ±10% power multiplier now, not additive. Behavior affixes (`Attack speed`/`Stun chance`/`Extra targets`) are just weapon prefixes in the pool. **Boss uniques**: `rollBossUnique(monster, quiet, shiny)` (called from `battle.grantKillRewards`) — area bosses roll a forced-`Legendary` base of the unique's slot (via `getItemType(..., 'Legendary')`, which now forces the top rarity) then stamp the fixed name/gold color/`isUnique` + guaranteed signature affix. |
| `offline.js` | Offline progress: converts time since the save's `savedAt` stamp into real kills of the saved wave (grantKillRewards in quiet mode; caps 8h / 300 kills / 60s minimum), renders once, shows the "While you were away" banner. Called from `save.js` `load()` after versionCheck. |
| `cards.js` | Collectible-card system: `rollCard(monster, quiet, shiny)` (called from `battle.grantKillRewards`) grants a monster's card at `CARD_DROP_CHANCE` if not owned (persisted in `player.properties.cardsOwned`). `recomputeCardBonuses()` (on card gain + `save.js` load) sums COMPLETED per-area set bonuses into `player.properties.cardGoldBonus/cardDropBonus/cardExpBonus`, read by `core.js` drop/exp/goldRate. `ownsCard`/`areaCardProgress`/`isAreaSetComplete` for `bestiaryUI`. |
| `itemSell.js` | Sell single/all items (`itemSell`, `sellAllItems` on window). |
| `stats.js` | `updateHtml` (the everything-refresher), level/exp/health/mana bars, stat upgrade handlers (`upgrade*` on window). |
| `professions.js` | Gathering/alchemy/crafting (`playerProfession`, herbs/minerals, crafting HTML). |
| `quest.js` | Area/monster progression gate (`quest`): each cleared monster reveals the next and each area boss unlocks the next area. (The old per-kill Story-tab narrative was removed with that tab.) |
| `potionsHotbar.js` | `potionList` (14 potions), potion inventory + hotbar rendering, `usePotion`/`addHotBarPotion` on window. |
| `intervalFunctions.js` | Timed loops (health regen / revive: `playerRevive`, `playerReviveCheck`). |

## Conventions (read before changing things)

- **No gameplay/logic changes** during refactors. UI conversions must produce
  byte-identical HTML (verified with golden-master jsdom diffs — see the git history
  of the template-literal rollout for the technique).
- **`window.*` is only for inline-onclick handlers** (the generated HTML is full of
  `onclick="..."`). Everything else moves via real `import`/`export`. When you add a
  render function with an inline onclick, register the handler in that module's
  `Object.assign(window, {...})` block.
- **Shared mutable state:** reassigned primitives go in `core/state.js`; shared
  arrays/objects are exported `const` and mutated in place (`.length = 0`,
  `Object.assign`, `.splice`) — never reassigned.
- **Rendering style:** template literals + `.map().join('')`, assembled with
  `+`-joined backtick segments. All render functions follow this.
- **jQuery stays** for Bootstrap tooltips/tabs and a couple of `$()`-stored equip
  fragments; don't try to remove it wholesale (see memory/jquery notes).
- Data files build their objects at import time; deferred startup work belongs in
  `initGame()` in `main.js`, not at module scope.

## Commands

```
npm run dev       # Vite dev server (port 5173, or PORT env)
npm run build     # production build to dist/ (self-contained; verified via vite preview)
npm test          # vitest run (jsdom)
npm run lint      # eslint src test (no-undef + no-unused-vars = error; must be clean)
npm run format    # prettier
npm run balance   # scripts/balance-report.sim.js: simulates 30 min of idle play per
                  # weapon class, 5 runs each (stubbed canvas + pump, setQuiet(true)),
                  # and writes the averaged table to balance-report.txt (~6 min)
                  # (gitignored) — the tuning evidence table. ~2 min, on demand only.
npm run deploy    # build + force-push dist/ as the gh-pages branch — publishes to
                  # https://tarnos12.github.io/legend-of-the-fallen-warrior-web/
                  # (source repo: github.com/tarnos12/legend-of-the-fallen-warrior-web)
```

Builds use a relative base (`./`) so the bundle works from the Pages subpath; the
dev server keeps `/`.
