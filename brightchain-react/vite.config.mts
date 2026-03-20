/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);

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
        // Name the entry chunk distinctly so the API server can
        // identify the correct entry point in the dist directory.
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
    // Force Vite to resolve these packages from a single physical copy.
    // Each workspace component library (brightchain-react-components,
    // brighthub-react-components, etc.) has its own node_modules with a
    // separate copy of express-suite-react-components. Without dedup,
    // each copy creates its own React context, so the I18nProvider from
    // the app doesn't satisfy useI18n() in the component libraries.
    dedupe: [
      'react',
      'react-dom',
      'react-router-dom',
      '@digitaldefiance/express-suite-react-components',
      '@digitaldefiance/i18n-lib',
      '@digitaldefiance/ecies-lib',
      '@digitaldefiance/suite-core-lib',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
    ],
    alias: {
      // Stub out server-only modules
      'file-type': '/dev/null',
      'pg-hstore': '/dev/null',
      // Provide Buffer polyfill for browser (used by bloom-filters).
      // Must resolve to the actual package path so Vite doesn't use
      // its built-in browser-external stub.
      buffer: require.resolve('buffer/'),
      // Provide EventEmitter polyfill for browser.
      // @ethereumjs/util's AsyncEventEmitter extends Node's EventEmitter;
      // without this alias Vite replaces it with a throwing proxy stub,
      // causing "Class extends value undefined" at runtime.
      events: resolve(import.meta.dirname, 'src/shims/events.ts'),
    },
  },

  define: {
    'process.env': {},
    // Some CJS packages reference `global` instead of `globalThis`
    global: 'globalThis',
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
