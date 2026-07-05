# Handoff — where we left off & the plan

> **Purpose:** session-to-session continuity for Claude Code. `ARCHITECTURE.md` is
> the *code map* (what lives where); this file is the *state + roadmap* (what we
> just did, what's in flight, what's next, and the decisions waiting on the user).
> **Update this in the same commit as every task**, right before committing.

_Last updated: 2026-07-05_

## Current status

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

- **Item redesign Phase 2 — named boss uniques.** Each area boss drops 1–2 named items
  with a *fixed* signature affix (e.g. Lord Varik's Cleaver = axe, always +1 Extra
  target), boss-only, low odds. This is the payoff for the empty "drops" display slots.
- **Item redesign Phase 3 — surface drops** in the bestiary "mastered" tier and the map
  info panel (the placeholder lines are already there in `bestiaryUI.js` / `mapUI.js`).
- Later polish: real map art (placeholder biome grid today), organic skill-tree node
  layouts, big-number formatting (`1.2M`), accessory offensive-affix wiring (crit/bonus
  damage read off accessories — needs new `core.js` readers).

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
