/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);

/**
 * Collect version info from workspace package.json files for the About page.
 * Runs once at config-resolution time (build or dev-server start).
 */
function collectVersionInfo(): Record<string, string> {
  const rootPkg = JSON.parse(
    readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf-8'),
  );

  const versions: Record<string, string> = {
    brightchain: rootPkg.version,
  };

  // Workspace packages (@brightchain/*)
  for (const ws of rootPkg.workspaces ?? []) {
    try {
      const pkg = JSON.parse(
        readFileSync(
          resolve(import.meta.dirname, '..', ws, 'package.json'),
          'utf-8',
        ),
      );
      if (pkg.name) versions[pkg.name] = pkg.version;
    } catch {
      // workspace entry may not have a package.json (e.g. tools)
    }
  }

  // @digitaldefiance/* pinned versions from resolutions
  for (const [name, version] of Object.entries(rootPkg.resolutions ?? {})) {
    if (name.startsWith('@digitaldefiance/')) {
      versions[name] = version as string;
    }
  }

  return versions;
}

const packageVersions = collectVersionInfo();

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
    // Package version info for the About page (baked in at build time)
    __PACKAGE_VERSIONS__: JSON.stringify(packageVersions),
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
