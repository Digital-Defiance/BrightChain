import alias from '@rollup/plugin-alias';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

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
  {
    find: '@noble/hashes/_assert',
    replacement: resolve(
      __dirname,
      'node_modules/@noble/hashes/esm/_assert.js',
    ),
  },
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
  plugins: [
    alias({ entries: nobleAliases }),
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
      // Whether to polyfill these globals.
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill these modules.
      include: [
        'buffer',
        'process',
        'util',
      ],
    }),
  ],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      // Transform CommonJS modules to ES modules
      transformMixedEsModules: true,
      // Ensure named exports are properly detected
      requireReturnsDefault: 'auto',
      // Ignore dynamic requires that can't be resolved
      ignoreDynamicRequires: true,
    },
    rollupOptions: {
      plugins: [
        // Apply aliases during rollup build phase too
        alias({ entries: nobleAliases }),
      ],
    },
  },
  optimizeDeps: {
    include: [
      'tslib',
      '@digitaldefiance/ecies-lib',
      '@digitaldefiance/i18n-lib',
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
    dedupe: ['tslib', '@noble/hashes', '@noble/curves'],
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      // Local workspace alias - use browser-specific entry point
      '@brightchain/brightchain-lib': resolve(__dirname, '../brightchain-lib/src/browser.ts'),
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
      '@noble/hashes/_assert': resolve(
        __dirname,
        'node_modules/@noble/hashes/esm/_assert.js',
      ),
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
    },
  },
  define: {
    // Required for some packages that check for Node.js environment
    global: 'globalThis',
    // Polyfill process for Node.js compatibility
    'process.env': '{}',
    'process.env.NODE_ENV': '"production"',
  },
});
