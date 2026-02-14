/**
 * Browser build verification for brightchain-lib.
 *
 * This script uses esbuild to bundle brightchain-lib with platform: 'browser'
 * to verify that the library can be consumed in a browser environment without
 * Node.js-specific module errors.
 *
 * This is a VERIFICATION build only — it does not produce production output.
 */
import * as esbuild from 'esbuild';

try {
  const result = await esbuild.build({
    entryPoints: ['brightchain-lib/src/browser.ts'],
    bundle: true,
    platform: 'browser',
    outfile: 'dist/browser-verify/brightchain-lib.js',
    write: false,
    external: [
      // Peer / workspace dependencies
      '@digitaldefiance/*',
      '@brightchain/*',
    ],
    logLevel: 'warning',
    // Treat any remaining Node.js built-in imports as errors
    alias: {},
  });

  if (result.errors.length > 0) {
    console.error('Browser build verification FAILED');
    console.error(result.errors);
    process.exit(1);
  }

  console.log('Browser build verification PASSED');
} catch (err) {
  console.error('Browser build verification FAILED');
  console.error(err.message || err);
  process.exit(1);
}
