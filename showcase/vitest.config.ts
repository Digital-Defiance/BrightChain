import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react() as any],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false, // Disable CSS processing in tests
  },
  resolve: {
    alias: {
      '@brightchain/brightchain-lib': resolve(
        __dirname,
        '../brightchain-lib/src/browser.ts',
      ),
      'framer-motion': resolve(__dirname, './src/test/mocks/framer-motion.ts'),
    },
  },
  define: {
    global: 'globalThis',
  },
});
