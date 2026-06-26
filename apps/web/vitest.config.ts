import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Playwright e2e specs live in ./e2e/ and use the `test`/`expect` exports
    // from @playwright/test. They have no test bodies in the vitest sense
    // (no `it`/`describe` from vitest globals), so vitest tries to parse them
    // and the suite reports a phantom failure. Exclude them — they run via
    // `npm run test:e2e` (playwright) instead.
    exclude: ['node_modules', 'dist', 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
