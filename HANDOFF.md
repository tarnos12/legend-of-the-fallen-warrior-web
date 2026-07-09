# Handoff — where we left off & the plan

> **Purpose:** session-to-session continuity for Claude Code. `ARCHITECTURE.md` is
> the *code map* (what lives where); this file is the *state + roadmap* (what we
> just did, what's in flight, what's next, and the decisions waiting on the user).
> **Update this in the same commit as every task**, right before committing.

_Last updated: 2026-07-05_

## Current status

**Inventory revamp Stages 1+2 (unified grid) + LIVE DEPLOY: DONE.** User picked: unified grid
+ filter chips, all three interactions, deploy now.
- **Deployed to GitHub Pages** (`gh-pages` @ `4e959b7`, bundle `index-DF_uroWS.js`) — fixes the
  broken-icons report, which matched the stale 2026-07-05 deploy. (The sandbox proxy blocks
  fetching github.io, so the branch content was verified via git instead of HTTP.)
- **Unified grid** (`inventoryUI.js`): one responsive auto-fill grid of all items; type chips
  with counts + min-rarity chips + ⬆ Upgrades-only filter (`headlinePower` vs equipped; empty
  slot = upgrade); REAL capacity rendered as cells; "shown/total" note when filtered; 🧪 Potions
  chip swaps in the hotbar/potion section (`#potionInventory` stays in the DOM — hard contract
  with `createPotionInventory`). Old per-type Bootstrap tabs + `changedTabInventory` removed.
- **Interactions:** Ctrl/Cmd+Click multi-select (blue ring) + "Sell selected (N)"; Shift+Click
  toggles `item.locked` (🔒 badge, persists with the item); drag a cell onto the paper-doll to
  equip (document-level delegation); ⚜ badge on uniques.
- **Sell backend** (Sonnet subagent, `itemSell.js` + `test/item-lock.test.js`): locked items
  can't be sold (single path logs 🔒; bulk paths skip + report), and `sellItemsByIds(ids)` does
  the batch sell with one confirm (count + gold, flags uniques) and one refresh.
- Live-verified end-to-end: 13/13 grid checks, then select-3-with-1-locked → bulk sell sold
  exactly the 2 unlocked (+1835 gold), locked survived. **97/97 tests, build + lint clean.**
- Remaining Stage 3 polish (not started): rarity glow, "NEW" drop badges, paper-doll onto the
  floating tooltip, mobile pass for the chip rows.

**Bugfix — inventory/shop tooltips clipped by the overlay panel: FIXED.** The overlay panels
(`#mainPanels > .tab-pane`) are `overflow-y:auto` scroll containers, which clipped the old
absolutely-positioned in-cell tooltip spans at the panel edge (reproduced: a top-row cell's
tooltip measured `top:-14px` vs. the panel's `top:32px`). Replaced with a single body-level
`position:fixed` **floating tooltip** (`#floatTip`, z-200): `inventoryUI.showFloatTip` +
`invTipShow`/`hideFloatTip` hover handlers on inventory cells (with the equipped-vs-hovered
two-column compare preserved via the untouched, snapshot-locked `itemTooltipTest`), and
`shopUI.shopTipShow` for shop cells. Viewport-clamped (flips left near the right edge). Also
added an `onerror` → `questionMark.png` fallback on item icons (stale-save insurance). Bonus:
cells no longer embed the full tooltip HTML, shrinking inventory re-render payloads.
Live-verified with a real hover: tooltip fully in-viewport, hides on leave. 92/92, build+lint clean.
- **"Some item icons don't load" — investigated, NO bug in master:** a full browser sweep
  (every slot/rarity/level + uniques + bestiary portraits + shop reroll) logged **zero** failed
  image requests, an exhaustive filename audit (items×rarities×buckets, monsters, passives,
  skills, buffs, stats, races, potions) found **zero** missing files, and the on-load repair
  covers both persisted item collections (equipped + inventory; shop stock isn't persisted).
  The report almost certainly comes from the **stale live gh-pages deploy (2026-07-05)** —
  redeploying master is the fix (awaiting go-ahead; `npm run deploy`).
- Equipped paper-doll (`#equipHtml`) still uses old in-cell tooltips — slated for the
  inventory revamp (plan below).

**Flaky-fix + big-number-finish batch (3 tasks — dynamic Workflow): DONE.** Workflow planned
(Opus, with precise line-level spec validation), delegated to Sonnet/Opus worktree subagents,
Opus-reviewed (all 3 `correct`), manager integrated. 92/92, build+lint clean.
- **Flaky test FIXED**: `item-affixes.test.js "commons have no affixes, legendaries have several"`
  now generates 800 Master swords (was 60) + guards `legendaries.length > 0`, so a zero-Legendary
  RNG round can't fail it. Verified 5/5 stable runs.
- **Combat-log numbers** use `formatBig` (`battle.js` — enemy hit / thorn / counter / block /
  hero damage / lifesteal, display-only; hp/state math untouched).
- **Stat-panel numbers** use `formatBig` (`stats.js` updateHtml — total damage + the 7 stat
  totals + spell power; `primaryStatUpdate` snapshot stayed byte-identical since values <10000
  floor the same). The big-number pass is now comprehensive (gold/exp/souls, health/mana,
  floaters, item badges, shop prices, stat panel, combat log).

**QoL polish batch (5 tasks — dynamic Workflow + 2 standalone agents): DONE.** Ran a dynamic
Workflow that PLANNED (Opus validated specs vs. the codebase), delegated to Sonnet/Opus
worktree subagents by complexity, and REVIEWED (Opus, per task) — plus two standalone worktree
agents in parallel. Manager (me) integrated only review-passed branches, re-verifying after each
merge. 92/92 tests, build+lint clean. Live-verified. Items:
- **Unique sell-protection** (Sonnet): selling any `isUnique` item always `confirm()`s (single +
  bulk paths) so soul-bought uniques survive a stray click (`systems/itemSell.js`).
- **Bestiary soul price** (Sonnet): the mastered-tier signature-drop line now also shows the
  unique's Soul-Shop price (`ui/bestiaryUI.js`).
- **Always-visible set HUD** (Opus): `renderSetHud` → a `⚜ N/4` indicator next to the soul
  counter (hidden below 2 pieces), refreshed via `updateHtml` (`ui/uniqueSetsUI.js` + index.html
  + stats.js + theme.css).
- **Gold-shop price formatting** (Sonnet, standalone): `.invPower` price badges use `formatBig`
  (`ui/shopUI.js`).
- **Boss Souls save test** (Sonnet, standalone): `test/save-roundtrip.test.js` now covers souls
  surviving save→load and backfilling to 0 on old saves.
- Also: `.gitignore` now excludes `.claude/worktrees/` (transient agent worktrees). Noted a
  FLAKY test `item-affixes.test.js "commons have no affixes, legendaries have several"` — now
  FIXED (larger sample + length guard; see the batch above).

**Unique-set + reforge/polish batch (3 tasks, agent-team parallelized): DONE.** Manager built
themed sets on `master`; two worktree subagents did reforge-while-equipped + inventory number
formatting in parallel; integrated serially (tests green after each merge). 90/90, build+lint clean.
- **"Fallen Legends" unique set** (`data/uniqueSets.js` + `core.js` + `ui/uniqueSetsUI.js`):
  wearing 2/3/4 boss uniques grants an escalating live bonus (+dmg%/+def%/+magic-find/+gold),
  computed from `equippedItems` (no persistence). A set-progress panel (pips + active bonus +
  next tier) sits under the Soul Shop, refreshed via `updateHtml`. Live-verified: 3 pieces →
  +12%/+12%/+4%/+4%.
- **Reforge-while-equipped** (subagent): the ♻ Reforge now works when your only copy is EQUIPPED
  (unequips via `window.unequipItem` first, then mints a fresh copy at level into inventory).
  `ownsUnique`/`equippedUniqueId` added. Live-verified: equipped iLvl-40 → fresh iLvl-90.
- **`formatBig` on inventory power badges** (subagent): `.invPower` corner number now compact
  (`1.2M`); tooltip snapshot untouched.

**Soul-Shop Stage 1 + polish batch (3 tasks, agent-team parallelized): DONE.** Ran as an
in-session agent team (manager built reforge on `master`; two worktree-isolated subagents did
the independent polish in parallel; integrated serially, tests green after each merge).
- **Reforge** (`ui/soulShopUI.js` + `systems/bossSouls.js` + `data/bossSouls.js`): a ♻ Reforge
  button in the Soul Shop (shown when you own an inventory copy) spends `reforgePrice` souls
  (≈½ buy price) to consume the old copy and mint a fresh one at your CURRENT level — a
  perpetual soul sink that doesn't clutter the inventory. `reforgeBossUnique`/`ownedUniqueIndex`.
  Live-verified: iLvl 50 copy → fresh iLvl 80, souls deducted, net inventory unchanged.
- **HUD soul counter** (`#soulCount`, prior commit): live ☠ balance next to gold.
- **`formatBig` everywhere** (subagent): combat damage/gold floaters (`battleCanvas.js`) and the
  health & mana readouts (`stats.js`) now use compact `1.2M`-style formatting (display only,
  combat math untouched).
- **Dead-cruft removal** (subagent): the orphaned `#dialogTest` jQuery-UI dialog (`index.html`)
  and the now-unused `.story` CSS (`tooltip.css`/`text.css`).
Working directly on `master` (default branch) per the new rule. 85/85 tests, build + lint clean.

**Boss-unique acquisition rework — Stage 0 (Boss Souls + Soul Shop): DONE.** Removes the old
"20% RNG + slot-gated" acquisition. Area-boss kills now drop a guaranteed **Boss Soul** currency
(`player.properties.bossSouls`; `SOUL_DROP`=1, 2× shiny) via `systems/bossSouls.grantBossSouls`
(wired into `battle.grantKillRewards`). A **Soul Shop** at the top of the Shop tab
(`ui/soulShopUI.js` → `#soulShop`) spends souls to buy ANY unlocked boss's signature unique at
the player's level (`buyBossUnique` → `itemDrop.mintBossUnique`, prices 3→15 by area in
`data/bossSouls.js`). The RNG drop still exists as a lucky bonus. Souls persist automatically
(in `player.properties`, backfilled on old saves — no version bump). Tests: `test/boss-souls.test.js`
(drop amount/shiny/non-boss, purchase deduct+mint, lock/affordability guards). **83/83 pass, build +
lint clean.** Live-verified in Chromium: bought Lord Varik's Cleaver for 3 souls (Legendary, +2
Extra targets), panel renders with locked/affordable states, no console errors.
- **Design note:** this is Stage 0 (prove the loop) per the staged-roadmap rule — chose the
  Souls+Shop direction over themed sets. Since shipped, a live HUD soul counter was added
  (`#soulCount`). Next polish if kept: a "buy at a chosen level" or bulk option; let souls
  reroll/upgrade an owned unique. If you'd rather pivot to sets, the Souls currency +
  `mintBossUnique` foundation still applies.

**Dead-code + unpolished-feature removal pass: DONE.** Cut cruft and a half-finished tab
(surveyed via two explore agents), bundle dropped ~35 KB (244→209 KB):
- **Dead code:** the ~310-line commented `itemDropRandom` block + dead `materia` refs
  (`itemDrop.js`), the unreachable `BackPack` equip branch (`equip.js`).
- **Hidden legacy skill renderers:** removed `CreateWeaponSkillHtml`, `CreatePlayerSkillsHtml`,
  and `updateBar` (they rendered into invisible `.legacyHidden` divs, superseded by the canvas
  trees) — plus their ~15 call sites, the dead `player.properties.*Skill` props, the
  `weaponTypeObject.type2` fields, the `#weaponSkill`/`#playerSkills` divs, the `.legacyHidden`
  CSS, and 2 render snapshot tests. Live weapon-mastery XP (in `battle.weaponSkill`) untouched.
- **Story tab removed:** it was half-finished (only areas 1–3 had lore, an empty Twisted Marrow
  tab, areas 5–7 missing, a typo). Deleted the nav item + pane in `index.html` and regenerated
  `quest.js` (787→188 lines) keeping ONLY progression (isShown / area unlocks) — the narrative
  writes + `monsterUnlock` gating are gone. `test/combat-sim.test.js` verifies unlock consistency.
- **Professions polished (not removed):** dropped the debug `console.log`s, fixed the herb
  progress-bar id bug (`displayMineral.name`→`displayHerb.name`), and de-duplicated the gather
  progress-bar ids (prefixed `gatherBar_`) so `getElementById(name)` cleanly targets the count span.

Verified live in headless Chromium (skills/map/bestiary render, professions panel populates,
Story tab gone, no console errors). 80/80 tests, build + lint clean.

**Real world-map art: DONE.** The map panel (`ui/mapUI.js`) no longer draws a placeholder
grid — it paints a full procedural continent on `#mapCanvas`: a deterministic sine-perturbed
coastline (`coastPath`/`coastM`, with `isOcean` as the shared land/water test), per-area biome
tints, terrain glyphs (pines/peaks/snow-peaks/dunes/towers keyed off each node's biome), ocean
waves, a compass rose, an inner frame, a dotted travel trail, and outlined node labels for
legibility. Everything is a pure function of position (a small seeded PRNG scatters decor), so
it's rock-steady across the frequent hover/click redraws — no external art assets (CSP-safe).
Node positions/hit-testing unchanged. Verified live in headless Chromium (`canvas.toDataURL`).
82/82 tests, build + lint clean; canvas draws aren't snapshot-tested.

**Organic skill-tree layouts: DONE.** The passive + weapon canvas trees (`ui/skillTreeUI.js`)
no longer render as ramrod columns: each node gets a deterministic sideways drift (`swayX`,
±14px, a pure `sin` of column/row so it's stable across the frequent hover/click redraws) and
consecutive nodes are joined by smooth bezier "vine" connectors (`drawVine`) instead of a
straight spine. Purely visual — node grid order, hit-testing (hits use the drifted x), and the
info panels are unchanged. Verified node x-extents stay in-bounds (passive 29–696 in 740, weapon
29–564 in 640). Canvas draws aren't snapshot-tested; 82/82 tests, build + lint clean.

**Accessory offensive-affix wiring: DONE.** Rings/amulets now carry LIVE offensive
affixes instead of only attributes. New `core.js` readers: `totalCriticalChance` sums
weapon + accessory-slot crit, and `totalBonusDamage` sums accessory `Bonus damage` (weapon's
stays folded into MinDamage at generation, excluded to avoid double-count) into the
`bonusDamage()` damage multiplier. `data/affixes.js`: ring prefixes gained `Crit Chance %`
(`flatCrit`) + `Bonus Damage %` (new `flatDamage` kind — modest live %, min3/max6 + iLvl/10);
amulet gained crit; talisman stays defensive. `itemDrop.applyAffix` stores `flatDamage` as a
live key (not folded). Tooltip shows accessory crit (`inventoryUI.js`; weapon/shield snapshots
unchanged). Magnitudes at iLvl50: ~13-18% crit (capped 75% overall) / ~8-11% dmg per affix,
one of each max per ring — a real upgrade path, not a balance breaker. Tests: `item-affixes`
(pool membership + still-forbidden keys) + `equip-stats` (readers reflect an equipped offensive
ring). 82/82 pass, build + lint clean. No save-wipe (item stats self-contained).

**Big-number formatting: DONE.** New `formatBig` in `core/format.js` renders the HUD gold +
experience counters compactly (`1.2M`, `3.4B`, `150M`): exact below 10000 (so a loaded
1234-gold save still reads "1234"), else truncated (never rounded up) to one decimal + K/M/B/T/Qa.
Applied in `systems/stats.js` (gold + experience + maxExperience). The legacy `getThousands`
(integer K/M, its own test) is untouched. Covered by `test/logic.test.js`. Display-only, no
gameplay change. 80/80 tests, build + lint clean.

**Item redesign — Phase 3 (surface boss uniques): DONE.** The bestiary "mastered" tier
(`bestiaryUI.js`) and the map info panel (`mapUI.js`) now name each area boss's signature
unique (from `data/bossUniques.js`) instead of the generic "drops ... gear" placeholder, so
players can see what to hunt. Bestiary: a `☠ Signature drop: <name>` line under the mastered
block for boss monsters (keyed by monster `name` ∈ `BOSS_UNIQUES`; non-bosses unchanged). Map:
a `Boss drop: ☠ <name>` line under the area's drops line (not kill-gated — advertises the hunt).
Gold-italic styling via new `.beastUnique`/`.mapUnique` in `theme.css`. Display-only, no new
save data, no gameplay change. 79/79 tests, build + lint clean.

**Bugfix — weapon/shield icons broke after loading a save: FIXED.** The on-load self-heal
(`save.js` `repairItemImage`, from commit 766e922) re-derived art as `subType+rarity`,
dropping the level-number suffix that weapons/shields need (`swordLegendary.png` has no
file; only `swordLegendary5..100`). Now uses a single shared `itemImageName(item)` helper
(`core/format.js`) used by BOTH generation and repair, so they can't drift again.
Locked by `test/item-images.test.js` (every slot/level filename exists + matches generation).
Verified live: load a save, all 27 icons resolve. 79/79 tests.

**Collectible enemy cards: DONE.** (User chose: keep boss uniques as-is for now, add cards
for every enemy.)
- `data/cards.js` (`CARD_DROP_CHANCE` 0.03/kill, 2× shiny; `CARD_SET_BONUS` per area =
  +5-10% gold/drop/exp) + `systems/cards.js` (`rollCard`, `recomputeCardBonuses`,
  `ownsCard`/`areaCardProgress`/`isAreaSetComplete`).
- Every kill can drop that monster's card (persisted in `player.properties.cardsOwned`,
  backfilled for old saves). Completing an AREA's full card set adds its bonus to
  `player.properties.cardGold/Drop/ExpBonus`, read by `core.js` drop/exp/goldRate.
- Bestiary shows per-monster card status + per-area set progress/bonus.
- Tests: `test/cards.test.js` (drop/dedupe, set completion, bonus applies, progress).
  **77/77 pass, build + lint clean.** No version bump (self-contained backfill).
- NOTE: acquisition reworked since — Boss Souls + Soul Shop shipped (see Current status);
  the Phase-2 RNG drop remains as a lucky bonus on top.

**Item redesign — Phase 2 (named boss uniques): DONE.**
- `src/data/bossUniques.js` — one signature named item per area boss (7 bosses; keyed
  by boss monster `name`): fixed slot + guaranteed signature affix + lore. e.g. Lord
  Varik's Cleaver (axe, +2 Extra targets), Tar Nuk's Reckoning (mace, 30% Stun),
  The Keeper's Aegis (shield, +Bonus life), The Beholder's Eye (amulet, +Magic find).
- `itemDrop.rollBossUnique(monster, quiet, shiny)` — 20% per boss kill (2× shiny);
  forced-Legendary base of the slot (new `'Legendary'` craft quality forces top tier)
  + normal random affixes + the stamped name/gold color/`isUnique`/signature. Called
  from `battle.grantKillRewards` (no-op for non-bosses).
- Tests: `test/boss-uniques.test.js` (drop shape, signature magnitude, non-bosses never
  drop, level scaling). **72/72 pass, build + lint clean.** Live-verified all bosses.

**Item redesign — Phase 1 (affix pools + compressed power curve + budget model): DONE.**
- New `src/data/affixes.js` — curated per-slot prefix/suffix pools. Every affix key
  is a stat the player actually reads for that slot, so a shield can't roll crit and
  a sword can't roll armor. `RARITY_AFFIX_BUDGET` = how many prefix/suffix slots each
  rarity rolls (Common 0 → Legendary 3+3).
- `gameObjects.js` `itemRarity.power` compressed to 2.4/2.75/3.1/3.7/4.3 (Legendary
  ≈ 1.8× Common; Common floor preserved so combat pacing is unchanged). Item quality
  (Superior/Inferior) is now a ±10% multiplier, not the old additive.
- `itemDrop.js` rewritten: base stats → then `rollAffixes` from the slot pool. Dead
  physical/spell base mod removed; accessories got a Value floor (0-affix Commons
  would otherwise fail the `Value > 0` push guard and never drop).
- **Critical bug found + fixed via the balance harness:** items now carry ONLY rolled
  keys (no more zero-filling), and `core.js` `sumEquippedStat` + 4 direct reads did
  `+= undefined` → NaN → hero dealt NaN damage → silent combat stalemate (harness
  showed 0 kills for all armed weapons). Fixed with `|| 0` on all item-stat reads;
  locked by `test/equip-stats.test.js` (verified it fails when the fix is reverted).
- Tests: `test/item-affixes.test.js` (pool restriction + curve) + `test/equip-stats.test.js`
  (finite stats); updated weapon-behavior "at most one affix" assertion.
  **69/69 pass, build + lint clean.**
- Live-verified: crafted one of each slot, pools hold, gold values sane.
- No save-wipe: item stats are self-contained, old items keep working. No version bump.
- **Balance CONFIRMED** post-fix: sword 128 / axe 120 / mace 117 / staff 117 / ranged 129
  / fists 75 kills per 30 min — within ~5% of the pre-redesign baseline, floor intact.

## In flight / next steps

- **Inventory revamp (PLANNED — awaiting layout decision).** Goal: a proper grid-based
  inventory view. Staged plan:
  - *Stage 1 — Grid foundation:* responsive `.invGrid` (auto-fill columns, not fixed 5);
    real capacity visualization (render exactly `player.functions.inventory()` cells — used,
    free, and a "buy backpack" hint on the last row); move the equipped paper-doll to the
    shared floating tooltip; unified filter bar (rarity + subtype chips + an "upgrades only"
    filter comparing vs. equipped) — layout fork: single all-items grid with filter chips
    vs. keeping the per-type tabs.
  - *Stage 2 — Interactions:* item lock/favorite (🔒 protect from sell-all/sell-mode,
    persisted on the item); multi-select bulk sell (ctrl-click); drag-to-equip onto the
    paper-doll; persistent sort preference.
  - *Stage 3 — Polish:* rarity glow, ⚜ marker on Fallen Legends pieces, "NEW" badge on fresh
    drops, compact empty-cell footer.
  Groundwork already in place: floating tooltip layer, `formatBig` badges, unique sell-confirms.

- **Boss-unique acquisition rework — Stage 0 shipped** (Boss Souls + Soul Shop; see Current
  status), plus a live **HUD soul counter** (`#soulCount`, purple ☠ next to gold — updated by
  `stats.updateHtml` + `refreshSoulUi` on gain/spend), in-place **reforge** (inventory OR
  equipped), and the **"Fallen Legends" set** (see the batches above). Open follow-ups:
  buy-at-chosen-level / bulk; per-slot or multiple named sets instead of one collection set;
  a HUD/character-panel set indicator (currently only in the Shop). Revisit after playtesting.
- Polish backlog is cleared (big-number formatting, accessory offensive-affix wiring, organic
  skill-tree layouts, and the painted world map all shipped — see Current status). Optional
  follow-ups if wanted: extend `formatBig` to combat damage floaters / health-mana readouts;
  give talismans a dedicated defensive-special affix once combat readers exist; swap the
  procedural map for bespoke raster art (would need actual image assets); per-area map
  ambience (e.g. animated waves) if a render loop is ever added to the map panel.
- Leftover minor cruft (low priority, not yet removed): the orphaned `#dialogTest` jQuery-UI
  dialog + its inline init in `index.html` (was only opened by the deleted story code); the now
  unused `.story` CSS in `public/css/tooltip.css`/`text.css`; and a few vestigial bits in
  `professions.js` (a dead `craftingHtml2` comment ref, a commented "LEGEND" block).

## Decisions waiting on the user (blockers for content work)

1. **Offline auto-progress** — offline kills unlock monsters but never advance the wave.
   Should offline honor the auto-progress checkbox? (design lever, not a bug)
2. **Death cadence** — ~20 deaths/30min early game; keep, or soften?

## Recently shipped (for context)

Full-screen stage layout (canvas + bottom HUD + overlay panels) · world map travel +
bestiary + shiny enemies + 5-wave mixed-spawn combat (`data/waves.js`) · canvas skill
trees · sell rework (right-click + sell mode) + shop on the slot grid · PWA (installable)
· compact stat panels + inventory slot grid.

## Workflow notes

- `npm run build` · `npm test` · `npm run lint` (must be 0/0) before every commit.
- `npm run deploy` pushes `dist/` to the `gh-pages` branch. **Gotcha:** the Pages build
  can get stuck in "building" and serve 404s — requeue with
  `gh api -X POST repos/tarnos12/legend-of-the-fallen-warrior-web/pages/builds`.
- Live: https://tarnos12.github.io/legend-of-the-fallen-warrior-web/ · local `npm run dev`.
- `npm run balance` (~6 min) = averaged combat sim; writes `balance-report.txt`
  (gitignored). Uses Common-quality weapons, so it measures the *floor*.
