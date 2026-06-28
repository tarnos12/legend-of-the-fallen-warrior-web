// ES module entry point (Phase 3).
//
// The game is being migrated from ~16 classic global <script> files to ES
// modules one file at a time. Converted files live in /src and are imported
// here in their original load order; files not yet converted remain as classic
// <script> tags in index.html and execute before this module runs (module
// scripts are deferred). As each file is converted, its <script> tag is removed
// from index.html and an import is added below.
import './battle.js';
import './quest.js';
import './intervalFunctions.js';
import './itemDrop.js';
import './itemSell.js';
import './potionsHotbar.js';
