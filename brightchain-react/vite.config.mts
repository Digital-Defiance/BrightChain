/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  root: import.meta.dirname,
  cacheDir: '../node_modules/.vite/brightchain-react',

  plugins: [
    react(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
  ],

  build: {
    outDir: '../dist/brightchain-react',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // Stub out server-only packages that get pulled in via brightchain-lib
      external: [
        'express',
        'nat-pmp',
        'nat-upnp',
        /^@digitaldefiance\/node-express-suite/,
        /^@digitaldefiance\/enclave-bridge-client/,
        /^@digitaldefiance\/node-ecies-lib/,
      ],
      output: {
        // Name the entry chunk distinctly so the API's EJS template
        // (which looks for /^index-.*\.js$/) picks the right file.
        entryFileNames: 'assets/app-[hash].js',
        manualChunks(id: string) {
          // Only split out the heaviest, self-contained vendor groups.
          // Everything else stays in its natural chunk to avoid circular deps.

          // React ecosystem (no external deps that leak into other groups)
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // MUI + Emotion (tightly coupled, keep together)
          if (id.includes('node_modules/@mui/') ||
              id.includes('node_modules/@emotion/')) {
            return 'vendor-mui';
          }
        },
      },
    },
    sourcemap: mode === 'development',
  },

  resolve: {
    alias: {
      // Stub out server-only modules
      'file-type': '/dev/null',
      'pg-hstore': '/dev/null',
    },
  },

  define: {
    'process.env': {},
  },

  server: {
    port: 4200,
    host: 'localhost',
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },
}));
