const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  snapshotSerializers: [
    ...(nxPreset.snapshotSerializers || []),
    require.resolve('./brightchain-lib/bigIntSerializer.ts'),
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
  // Suppress duplicate manual mock warnings that arise when jest-haste-map
  // scans the whole workspace and finds identically-named __mocks__ files
  // in different projects (e.g. brightchain-lib.ts in multiple packages).
  haste: {
    throwOnModuleCollision: false,
  },
  reporters: [
    'default',
    [require.resolve('./tools/custom-jest-reporter.js'), {}]
  ]
};
