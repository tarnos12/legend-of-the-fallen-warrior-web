import { defineConfig } from 'vitest/config';

// Config for the on-demand balance simulation report (npm run balance).
// Kept out of the normal test suite: it simulates ~half an hour of game time
// per weapon class and exists to print a tuning table, not to gate commits.
export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['scripts/**/*.sim.js'],
        testTimeout: 120000,
    },
});
