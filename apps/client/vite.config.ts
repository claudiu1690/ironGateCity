import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Connect, Plugin } from 'vite';

/**
 * The browser only talks to its own origin (ADR 0001): /api is proxied to the API in dev and
 * preview, as the Vercel rewrite does in production. The Host header is kept (no changeOrigin)
 * so Better Auth sees the public origin.
 */
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3001';
const proxy = { '/api': { target: apiTarget, changeOrigin: false, xfwd: true } };

/**
 * ADR 0024 (maps v3 §5.1): the map tiles `pnpm art:tiles` cut into <repo>/.art-cache/tiles are served
 * at /tiles in dev and preview, never copied into the build (hundreds of MB, git-ignored). Production
 * gets them from VITE_TILES_ORIGIN once R2 exists; until then it shows the stills.
 */
const TILES = resolve(dirname(fileURLToPath(import.meta.url)), '../../.art-cache/tiles');
const TYPES: Record<string, string> = { '.webp': 'image/webp', '.dzi': 'application/xml' };
const serveTiles: Connect.NextHandleFunction = (req, res, next) => {
  const url = (req.url ?? '').split('?')[0]!;
  if (!url.startsWith('/tiles/')) return next();
  let path: string;
  try {
    path = resolve(TILES, decodeURIComponent(url.slice('/tiles/'.length)));
  } catch {
    path = '';
  }
  const type = TYPES[extname(path)];
  if (!path.startsWith(TILES + sep) || !type || !existsSync(path) || !statSync(path).isFile()) {
    res.statusCode = 404;
    res.end();
    return;
  }
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Length', statSync(path).size);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  createReadStream(path).pipe(res);
};
const tiles = (): Plugin => ({
  name: 'irongate-tiles',
  configureServer: (server) => void server.middlewares.use(serveTiles),
  configurePreviewServer: (server) => void server.middlewares.use(serveTiles),
});

export default defineConfig({
  plugins: [react(), tailwindcss(), tiles()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
  build: { sourcemap: true },
});
