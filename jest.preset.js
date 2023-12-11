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
};
