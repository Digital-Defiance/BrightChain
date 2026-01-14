import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false, // Disable CSS processing in tests
  },
  resolve: {
    alias: {
      '@brightchain/brightchain-lib': resolve(__dirname, '../brightchain-lib/src/browser.ts'),
    },
  },
  define: {
    global: 'globalThis',
  },
});