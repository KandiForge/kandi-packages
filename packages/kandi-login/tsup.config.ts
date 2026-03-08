import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'index': 'src/index.ts',
      'core/index': 'src/core/index.ts',
      'react/index': 'src/react/index.ts',
      'react/mui/index': 'src/react/mui/index.ts',
      'react/headless/index': 'src/react/headless/index.ts',
      'tailwind/index': 'src/tailwind/index.ts',
      'server/index': 'src/server/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    clean: true,
    external: [
      'react',
      'react-dom',
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      '@tauri-apps/api',
    ],
    treeshake: true,
    sourcemap: true,
  },
  {
    entry: {
      'cli/index': 'src/cli/index.ts',
    },
    format: ['esm'],
    dts: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
    platform: 'node',
    clean: false,
    sourcemap: true,
  },
]);
