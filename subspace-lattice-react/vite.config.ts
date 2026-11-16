import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  // Resolve paths from this project, not the workspace root, so the output
  // lands in <workspace>/dist/subspace-lattice-react (the Nx outputPath)
  // rather than one level above the repository.
  root: __dirname,
  cacheDir: '../node_modules/.vite/subspace-lattice-react',
  plugins: [react()],
  build: {
    outDir: '../dist/subspace-lattice-react',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      // Peers and workspace/suite packages are external so the host app's
      // single copy is used. A bundled react-router in particular would give
      // this library its own router context, separate from the app's.
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-router',
        'subspace-lattice',
        /^@brightchain\//,
        /^@digitaldefiance\//,
        /^@mui\//,
        /^@emotion\//,
        'axios',
      ],
    },
  },
});
