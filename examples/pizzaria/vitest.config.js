import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['tests/design-system.test.js', 'jsdom'],
      ['tests/*-ui.test.js', 'jsdom'],
    ],
    include: ['tests/**/*.test.js'],
  },
});
