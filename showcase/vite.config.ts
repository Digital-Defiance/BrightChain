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
  // @noble/hashes/_assert: alias to the v1.4.0 copy nested inside
  // ethereum-cryptography. The hoisted v1.8.0 renamed { bool, bytes, number }
  // to { abytes, anumber, aoutput }, breaking ethereum-cryptography@2.x.
  // The v1.4.0 _assert is self-contained (no imports), so this is safe.
  {
    find: '@noble/hashes/_assert',
    replacement: resolve(
      dirname(require.resolve('ethereum-cryptography/sha256')),
      'node_modules/@noble/hashes/_assert.js',
    ),
  },
  {
    find: '@noble/hashes/_assert.js',
    replacement: resolve(
      dirname(require.resolve('ethereum-cryptography/sha256')),
      'node_modules/@noble/hashes/_assert.js',
    ),
  },

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
    // ethereum-cryptography@2.x ships a nested @noble/hashes@1.4.0 whose
    // _assert exports { bool, bytes, number }. The hoisted v1.8.0 removed
    // those. We alias _assert to the v1.4.0 copy (see nobleAliases above)
    // but do NOT dedupe @noble/hashes itself, as that would force ALL
    // sub-paths to v1.8.0 including _assert.
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
    },
  },
  define: {
    // Required for some packages that check for Node.js environment
    global: 'globalThis',
  },
});
