import { defineConfig } from 'vite';

// Phase 3 step 1: the legacy game is served unchanged.
// index.html stays at the project root (Vite's entry point) and every asset it
// references (js/, css/, jquery/, images/, fonts/) lives under /public, so the
// relative URLs in index.html resolve exactly as before with no code changes.
// As files are converted to ES modules they will move out of /public into /src
// and join Vite's module pipeline.
export default defineConfig(({ command }) => ({
    // Relative base for builds so the bundle works from ANY path — the site is
    // hosted at github.io/<repo>/, not the domain root. Dev keeps '/' (Vite
    // doesn't support './' for the dev server).
    base: command === 'build' ? './' : '/',
    server: {
        open: false,
        // Honour the PORT assigned by the preview harness (autoPort) so multiple
        // sessions don't collide on 5173; falls back to 5173 for plain `npm run dev`.
        port: Number(process.env.PORT) || 5173,
    },
    // Vitest config. The game modules touch document/window at import time, so tests
    // run in a jsdom environment. See test/*.test.js.
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['test/**/*.test.js'],
    },
}));
