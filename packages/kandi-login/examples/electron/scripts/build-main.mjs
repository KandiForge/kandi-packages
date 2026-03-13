/**
 * Build the Electron main and preload scripts from TypeScript to CJS.
 * Uses esbuild for fast bundling.
 */

import { build } from 'esbuild';

const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
  target: 'node20',
  sourcemap: true,
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ['main.ts'],
    outfile: 'dist/main.cjs',
  }),
  build({
    ...shared,
    entryPoints: ['preload.ts'],
    outfile: 'dist/preload.cjs',
  }),
]);

console.log('Main and preload scripts built successfully.');
