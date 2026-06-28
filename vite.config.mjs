import { defineConfig } from 'vite';

// Phase 3 step 1: the legacy game is served unchanged.
// index.html stays at the project root (Vite's entry point) and every asset it
// references (js/, css/, jquery/, images/, fonts/) lives under /public, so the
// relative URLs in index.html resolve exactly as before with no code changes.
// As files are converted to ES modules they will move out of /public into /src
// and join Vite's module pipeline.
export default defineConfig({
  server: {
    open: false,
    port: 5173,
  },
});
