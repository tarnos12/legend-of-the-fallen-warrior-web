'use strict';

// Collectible enemy cards (2026-07). EVERY monster has a card; a small chance
// on each kill drops the card you don't own yet. Completing all the cards in an
// AREA activates that area's set bonus (a small permanent % to gold / drop /
// exp). The set bonuses key off `data/gameObjects.js` monsterAreas types.
//
// Bonuses use only the three rate channels the player already exposes cleanly
// (gold/drop/exp — see core.js), so applying a completed set is a plain number
// on `player.properties.cardGoldBonus/cardDropBonus/cardExpBonus`.

export const CARD_DROP_CHANCE = 0.03; // per kill, doubled for shiny enemies

// area type -> { channel: 'gold'|'drop'|'exp', value: percent, label }
export const CARD_SET_BONUS = {
    BanditHideout: { channel: 'gold', value: 5, label: '+5% Gold' },
    ForestofNarsus: { channel: 'drop', value: 5, label: '+5% Item Find' },
    OzJotnar: { channel: 'exp', value: 5, label: '+5% Experience' },
    TwistedMarrow: { channel: 'gold', value: 5, label: '+5% Gold' },
    KharmSheath: { channel: 'drop', value: 5, label: '+5% Item Find' },
    FrigidAberration: { channel: 'exp', value: 5, label: '+5% Experience' },
    Zyzx: { channel: 'gold', value: 10, label: '+10% Gold' },
};
