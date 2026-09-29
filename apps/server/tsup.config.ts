import { defineConfig } from 'tsup';

/**
 * Bundle the API and the worker. Workspace packages are TypeScript source, so they are bundled in;
 * npm dependencies stay external and are installed in the runtime image.
 */
export default defineConfig({
  entry: { index: 'src/index.ts', worker: 'src/worker.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@irongate\//],
  // Dev/test only (DB_MODE=memory); loaded with a dynamic import, never in production.
  external: ['mongodb-memory-server'],
});
