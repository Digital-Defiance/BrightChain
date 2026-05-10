import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  resolve: {
    alias: {
      '@brightchain/digitalburnbag-react-components': resolve(
        __dirname,
        '../src/index.ts',
      ),
    },
  },
  server: {
    port: 4400,
    strictPort: true,
  },
});
