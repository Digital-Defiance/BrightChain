/// <reference types='vitest' />
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../node_modules/.vite/brighthub-react-components',

  plugins: [
    react(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json'),
      pathsToAliases: false,
    }),
  ],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
  // Configuration for building your library.
  // See: https://vite.dev/guide/build.html#library-mode
  build: {
    outDir: '../dist/brighthub-react-components',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: 'src/index.ts',
      name: 'brighthub-react-components',
      fileName: 'index',
      // Change this to the formats you want to support.
      // Don't forget to update your package.json as well.
      formats: ['es' as const],
    },
    rollupOptions: {
      // External packages that should not be bundled into your library.
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        /^@brightchain\//,
        /^@digitaldefiance\//,
        /^@awesome\.me\//,
        /^@mui\//,
        /^@emotion\//,
        /^@fortawesome\//,
        /^@scure\//,
        /^@noble\//,
        'crypto',
        'fs',
        'path',
      ],
    },
  },
}));
