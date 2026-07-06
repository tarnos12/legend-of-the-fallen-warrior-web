# Handoff — where we left off & the plan

> **Purpose:** session-to-session continuity for Claude Code. `ARCHITECTURE.md` is
> the *code map* (what lives where); this file is the *state + roadmap* (what we
> just did, what's in flight, what's next, and the decisions waiting on the user).
> **Update this in the same commit as every task**, right before committing.

_Last updated: 2026-07-05_

## Current status

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
- NOTE: acquisition of boss uniques is deliberately still the Phase-2 RNG drop — user
  wants to playtest before deciding on Souls/Soul-Shop/sets (see "later ideas" below).

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

- **Boss-unique acquisition rework (after playtesting).** Current = 20% RNG drop, and a
  slot is gated behind reaching its boss's area. User is weighing: Boss Souls (guaranteed
  currency) + a Soul Shop (buy any unique, scaled to your level) to fix both the RNG and
  the slot-gating; and/or themed multi-piece sets. Revisit with fresh ideas post-playtest.
- Later polish: real map art (placeholder biome grid today), organic skill-tree node
  layouts. (Big-number formatting + accessory offensive-affix wiring shipped — see Current
  status. Possible follow-ups: extend `formatBig` to combat damage floaters / health-mana
  readouts; give talismans a dedicated defensive-special affix once combat readers exist.)

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
