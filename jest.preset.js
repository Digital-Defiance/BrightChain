const nxPreset = require('@nx/jest/preset').default;
const path = require('path');

// Absolute paths work in both CJS and ESM jest.config.ts files,
// unlike require.resolve() which fails when the config is loaded as ESM.
const WORKSPACE_ROOT = __dirname;

// When BRIGHTCHAIN_PROGRESS_FILE is set (i.e. launched via test-with-progress.mjs
// or e2e-with-progress.mjs), inject the custom reporter that emits per-test-case
// JSONL events for the live ETA progress bar and error log.
// This avoids the need to pass --jest-config which would replace per-project configs.
const progressReporters = process.env.BRIGHTCHAIN_PROGRESS_FILE
  ? [
      'default',
      [path.join(WORKSPACE_ROOT, 'tools/custom-jest-reporter.js'), {}],
    ]
  : undefined;

module.exports = {
  ...nxPreset,
  snapshotSerializers: [
    ...(nxPreset.snapshotSerializers || []),
    path.join(WORKSPACE_ROOT, 'brightchain-lib/bigIntSerializer.ts'),
  ],
  testPathIgnorePatterns: [
    ...(nxPreset.testPathIgnorePatterns || []),
    '/node_modules/',
    '/dist/',
    '<rootDir>/dist/',
  ],
  modulePathIgnorePatterns: [
    ...(nxPreset.modulePathIgnorePatterns || []),
    '/dist/',
    '<rootDir>/dist/',
  ],
  // Only set reporters when the progress file env var is present
  ...(progressReporters ? { reporters: progressReporters } : {}),
};
