import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'index': 'src/index.ts',
      'core/index': 'src/core/index.ts',
      'react/index': 'src/react/index.ts',
      'react/headless/index': 'src/react/headless/index.ts',
      'server/index': 'src/server/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    clean: true,
    external: [
      'react',
      'react-dom',
      'kandi-login',
      'ai',
      '@ai-sdk/openai',
      '@ai-sdk/anthropic',
      '@ai-sdk/google',
    ],
    treeshake: true,
    sourcemap: true,
  },
]);
