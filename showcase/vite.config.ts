import alias from '@rollup/plugin-alias';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Noble ESM aliases for production build
const nobleAliases = [
  {
    find: '@noble/hashes/utils',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/utils.js'),
  },
  {
    find: '@noble/hashes/sha2',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/sha2.js'),
  },
  {
    find: '@noble/hashes/sha256',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/sha2.js'),
  },
  {
    find: '@noble/hashes/sha512',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/sha2.js'),
  },
  {
    find: '@noble/hashes/sha3',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/sha3.js'),
  },
  {
    find: '@noble/hashes/hmac',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/hmac.js'),
  },
  {
    find: '@noble/hashes/hkdf',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/hkdf.js'),
  },
  {
    find: '@noble/hashes/pbkdf2',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/pbkdf2.js'),
  },
  {
    find: '@noble/hashes/scrypt',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/scrypt.js'),
  },
  {
    find: '@noble/hashes/ripemd160',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/legacy.js'),
  },
  {
    find: '@noble/hashes/legacy',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/legacy.js'),
  },
  {
    find: '@noble/hashes/crypto',
    replacement: resolve(__dirname, 'node_modules/@noble/hashes/esm/crypto.js'),
  },
  // NOTE: @noble/hashes/_assert is intentionally NOT aliased here.
  // ethereum-cryptography@2.x depends on @noble/hashes@1.4.0 whose _assert
  // exports { bool, bytes, number }. The hoisted v1.8.0 removed those in
  // favor of { abytes, anumber, aoutput }. Aliasing _assert would break
  // ethereum-cryptography at runtime.
  {
    find: '@noble/curves/secp256k1',
    replacement: resolve(
      __dirname,
      'node_modules/@noble/curves/esm/secp256k1.js',
    ),
  },
  {
    find: '@noble/curves/ed25519',
    replacement: resolve(
      __dirname,
      'node_modules/@noble/curves/esm/ed25519.js',
    ),
  },
  {
    find: '@noble/curves/abstract/utils',
    replacement: resolve(
      __dirname,
      'node_modules/@noble/curves/esm/abstract/utils.js',
    ),
  },
  {
    find: '@noble/curves/abstract/modular',
    replacement: resolve(
      __dirname,
      'node_modules/@noble/curves/esm/abstract/modular.js',
    ),
  },
  {
    find: '@noble/curves/abstract/weierstrass',
    replacement: resolve(
      __dirname,
      'node_modules/@noble/curves/esm/abstract/weierstrass.js',
    ),
  },
];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [alias({ entries: nobleAliases }), react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
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
      '@noble/hashes',
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
    },
    force: true,
  },
  resolve: {
    // NOTE: @noble/hashes is intentionally NOT deduped.
    // ethereum-cryptography@2.x ships a nested @noble/hashes@1.4.0 with a
    // different _assert API. Deduping would force it to use the hoisted
    // v1.8.0, breaking the 'bool' import in ethereum-cryptography/utils.js.
    dedupe: ['tslib', '@noble/curves', '@digitaldefiance/ecies-lib', '@digitaldefiance/i18n-lib', '@digitaldefiance/suite-core-lib'],
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      // Local workspace alias - use browser entry point for browser compatibility
      '@brightchain/brightchain-lib': resolve(
        __dirname,
        '../brightchain-lib/src/browser.ts',
      ),
      // Replace js-sha3 with @noble/hashes for browser compatibility
      'js-sha3': resolve(__dirname, 'node_modules/@noble/hashes/esm/sha3.js'),
      // Map to ESM versions of @noble packages for proper browser bundling
      '@noble/hashes/sha2': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/sha2.js',
      ),
      '@noble/hashes/sha256': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/sha2.js',
      ),
      '@noble/hashes/sha512': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/sha2.js',
      ),
      '@noble/hashes/sha3': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/sha3.js',
      ),
      '@noble/hashes/utils': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/utils.js',
      ),
      '@noble/hashes/hmac': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/hmac.js',
      ),
      '@noble/hashes/hkdf': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/hkdf.js',
      ),
      '@noble/hashes/pbkdf2': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/pbkdf2.js',
      ),
      '@noble/hashes/scrypt': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/scrypt.js',
      ),
      '@noble/hashes/ripemd160': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/legacy.js',
      ),
      '@noble/hashes/legacy': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/legacy.js',
      ),
      // NOTE: @noble/hashes/_assert is intentionally NOT aliased.
      // ethereum-cryptography@2.x needs @noble/hashes@1.4.0's _assert API
      // which exports { bool, bytes, number } — incompatible with v1.8.0.
      '@noble/hashes/crypto': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/crypto.js',
      ),
      '@noble/curves/secp256k1': resolve(
        __dirname,
        'node_modules/@noble/curves/esm/secp256k1.js',
      ),
      '@noble/curves/ed25519': resolve(
        __dirname,
        'node_modules/@noble/curves/esm/ed25519.js',
      ),
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
      uuid: resolve(__dirname, 'node_modules/uuid/dist/esm-browser/index.js'),
    },
  },
  define: {
    // Required for some packages that check for Node.js environment
    global: 'globalThis',
  },
});
