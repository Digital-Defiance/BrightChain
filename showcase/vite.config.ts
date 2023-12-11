import alias from '@rollup/plugin-alias';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Canonical ESM paths for @noble packages ──────────────────────────
// Every sub-path gets TWO entries: bare specifier AND .js-suffixed specifier.
// This is critical because:
//   - CJS code (ecies-lib) does require('@noble/hashes/sha2')  → bare
//   - ESM code (@noble/curves) does import '@noble/hashes/sha2.js' → .js
// Without both, Vite resolves them to different module instances and
// crypto operations (sign vs verify) silently break.

// Use createRequire to find the actual package location regardless of hoisting.
// Hardcoding `__dirname + '/node_modules/...'` breaks in CI when yarn hoists
// packages to the workspace root instead of nesting them in showcase/node_modules/.
// We resolve an exported subpath (e.g. '@noble/hashes/utils') to find the
// package root, then derive the esm directory from it. This avoids resolving
// './package.json' which isn't in the exports map.
const require = createRequire(import.meta.url);
const nobleHashesEsmDir = resolve(
  dirname(require.resolve('@noble/hashes/utils')),
  'esm',
);
const nobleCurvesEsmDir = resolve(
  dirname(require.resolve('@noble/curves/secp256k1')),
  'esm',
);

function nobleHashAlias(subpath: string, esmFile: string) {
  const full = resolve(nobleHashesEsmDir, esmFile);
  return [
    { find: `@noble/hashes/${subpath}`, replacement: full },
    { find: `@noble/hashes/${subpath}.js`, replacement: full },
  ];
}

function nobleCurveAlias(subpath: string, esmFile: string) {
  const full = resolve(nobleCurvesEsmDir, esmFile);
  return [
    { find: `@noble/curves/${subpath}`, replacement: full },
    { find: `@noble/curves/${subpath}.js`, replacement: full },
  ];
}

const nobleAliases = [
  // @noble/hashes sub-paths
  ...nobleHashAlias('utils', 'utils.js'),
  ...nobleHashAlias('sha2', 'sha2.js'),
  ...nobleHashAlias('sha256', 'sha2.js'),
  ...nobleHashAlias('sha512', 'sha2.js'),
  ...nobleHashAlias('sha3', 'sha3.js'),
  ...nobleHashAlias('hmac', 'hmac.js'),
  ...nobleHashAlias('hkdf', 'hkdf.js'),
  ...nobleHashAlias('pbkdf2', 'pbkdf2.js'),
  ...nobleHashAlias('scrypt', 'scrypt.js'),
  ...nobleHashAlias('ripemd160', 'legacy.js'),
  ...nobleHashAlias('legacy', 'legacy.js'),
  ...nobleHashAlias('crypto', 'crypto.js'),
  // @noble/hashes/_assert is intentionally NOT aliased here.
  // ethereum-cryptography@2.2.1 depends on @noble/hashes@1.4.0 whose _assert
  // exports { bool, bytes, number, ... }. The hoisted v1.8.0 _assert has a
  // completely different API (abytes, anumber, aexists, aoutput) — aliasing to
  // it causes "Cannot read properties of undefined (reading 'bool')".
  // Leaving _assert unaliased lets each package resolve its own compatible copy.

  // @noble/curves sub-paths
  ...nobleCurveAlias('secp256k1', 'secp256k1.js'),
  ...nobleCurveAlias('ed25519', 'ed25519.js'),
  ...nobleCurveAlias('abstract/utils', 'abstract/utils.js'),
  ...nobleCurveAlias('abstract/modular', 'abstract/modular.js'),
  ...nobleCurveAlias('abstract/weierstrass', 'abstract/weierstrass.js'),
];

// Build a flat object from the alias array for resolve.alias
const nobleResolveAliases: Record<string, string> = {};
for (const entry of nobleAliases) {
  nobleResolveAliases[entry.find] = entry.replacement;
}

// ── esbuild plugin for optimizeDeps pre-bundling ─────────────────────
// Rollup/Vite aliases (resolve.alias, @rollup/plugin-alias) do NOT apply
// during esbuild's optimizeDeps pre-bundling phase. Without this plugin,
// esbuild resolves @noble/hashes/sha2 and @noble/hashes/sha2.js to
// different module instances, breaking sign/verify in the browser.
function nobleEsbuildAliasPlugin() {
  // Build a map from specifier → absolute path
  const aliasMap = new Map<string, string>();
  for (const entry of nobleAliases) {
    aliasMap.set(entry.find, entry.replacement);
  }

  return {
    name: 'noble-alias',
    setup(build: {
      onResolve: (
        opts: { filter: RegExp },
        cb: (args: { path: string }) => { path: string } | undefined,
      ) => void;
    }) {
      build.onResolve({ filter: /^@noble\// }, (args: { path: string }) => {
        const resolved = aliasMap.get(args.path);
        if (resolved) {
          return { path: resolved };
        }
        return undefined;
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [alias({ entries: nobleAliases }), react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: process.env['GENERATE_SOURCEMAP'] !== 'false',
    commonjsOptions: {
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto',
      ignoreDynamicRequires: true,
    },
    rollupOptions: {
      external: (id) => {
        // Externalize Node.js built-ins to prevent bundling attempts
        // Note: 'crypto' is NOT externalized - we use browser-compatible alternatives
        return ['fs', 'path', 'stream', 'util', 'os'].some(
          (mod) => id === mod || id.startsWith(`node:${mod}`),
        );
      },
      plugins: [alias({ entries: nobleAliases })],
    },
  },
  optimizeDeps: {
    include: [
      'events',
      'tslib',
      '@digitaldefiance/ecies-lib',
      '@digitaldefiance/i18n-lib',
      '@digitaldefiance/secrets',
      '@ethereumjs/wallet',
      '@scure/bip32',
      '@scure/bip39',
      '@noble/hashes/utils',
      '@noble/hashes/sha2',
      '@noble/hashes/sha256',
      '@noble/hashes/sha512',
      '@noble/hashes/hmac',
      '@noble/hashes/hkdf',
      '@noble/hashes/pbkdf2',
      '@noble/hashes/ripemd160',
      '@noble/curves',
      '@noble/curves/secp256k1',
      'paillier-bigint',
      'bson',
      'uuid',
    ],

    esbuildOptions: {
      mainFields: ['module', 'main'],
      plugins: [nobleEsbuildAliasPlugin()],
    },
    force: true,
  },
  resolve: {
    // NOTE: @noble/hashes is intentionally NOT deduped.
    // ethereum-cryptography@2.2.1 depends on @noble/hashes@1.4.0 whose _assert
    // has a different API than v1.8.0. We intentionally leave _assert unaliased
    // (see nobleAliases above) so each package resolves its own compatible copy.
    dedupe: [
      'tslib',
      '@noble/curves',
      '@digitaldefiance/ecies-lib',
      '@digitaldefiance/i18n-lib',
      '@digitaldefiance/suite-core-lib',
    ],
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      // Local workspace alias - use browser entry point for browser compatibility
      '@brightchain/brightchain-lib': resolve(
        __dirname,
        '../brightchain-lib/src/browser.ts',
      ),
      // Local workspace alias - resolve from source to avoid needing a build
      '@brightchain/digitalburnbag-react-components': resolve(
        __dirname,
        '../digitalburnbag-react-components/src/index.ts',
      ),
      // Replace js-sha3 with @noble/hashes for browser compatibility
      'js-sha3': resolve(nobleHashesEsmDir, 'sha3.js'),
      // Spread all noble aliases into resolve.alias
      ...nobleResolveAliases,
      // Use browser build of reed-solomon-erasure.wasm (no fs dependency)
      '@digitaldefiance/reed-solomon-erasure.wasm': resolve(
        dirname(
          createRequire(import.meta.url).resolve(
            '@digitaldefiance/reed-solomon-erasure.wasm',
          ),
        ),
        'browser.js',
      ),
      // Force uuid to use browser-compatible version (uses Web Crypto API instead of Node crypto)
      uuid: resolve(
        dirname(require.resolve('uuid/package.json')),
        'dist/esm-browser/index.js',
      ),
      // Polyfill Node.js 'events' module for browser (needed by @ethereumjs/util AsyncEventEmitter)
      events: require.resolve('events/'),
    },
  },
  define: {
    // Required for some packages that check for Node.js environment
    global: 'globalThis',
  },
});
