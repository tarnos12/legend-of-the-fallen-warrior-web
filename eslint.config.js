import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['dist/**', 'node_modules/**', 'public/js/bootstrap*.js'],
    },
    js.configs.recommended,
    {
        // Game source: ES modules running in the browser.
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                // jQuery + jQuery UI (still used for widgets/dialogs) is loaded globally.
                $: 'readonly',
                jQuery: 'readonly',
            },
        },
        rules: {
            // The signal we care about: bare references to things that aren't
            // imported/declared — i.e. a missing import after the ESM refactor.
            'no-undef': 'error',
            // Legacy code has some dead locals; surface them as warnings, not errors.
            'no-unused-vars': ['warn', { args: 'none' }],
            // Deliberately relaxed for this legacy codebase (these are pervasive style
            // patterns, not bugs, and rewriting them risks gameplay changes):
            eqeqeq: 'off', // loose == used throughout
            'no-empty': 'off',
            'no-redeclare': 'off', // repeated `for (var key in ...)` in one function scope
            'no-prototype-builtins': 'off', // obj.hasOwnProperty(...) used throughout
            'no-useless-escape': 'off', // harmless \' in string literals
            'no-useless-assignment': 'off',
            'no-cond-assign': 'off',
        },
    },
    {
        // Vitest tests.
        files: ['test/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            'no-unused-vars': 'warn',
        },
    },
    {
        // Build/config files run in Node.
        files: ['vite.config.mjs', 'eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.node },
        },
    },
];
