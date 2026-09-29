import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The browser only talks to its own origin (ADR 0001): /api is proxied to the API in dev and
 * preview, as the Vercel rewrite does in production. The Host header is kept (no changeOrigin)
 * so Better Auth sees the public origin.
 */
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3001';
const proxy = { '/api': { target: apiTarget, changeOrigin: false, xfwd: true } };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
  build: { sourcemap: true },
});
