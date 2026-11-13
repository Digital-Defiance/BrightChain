module.exports = {
  displayName: 'brightchain-db',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  // Disk-backed v2 specs fsync many blocks; 5s is too tight when suites fsync in parallel.
  testTimeout: 120000,
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: './tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightchain-db',
  moduleNameMapper: {
    '^@brightchain/brightchain-lib$':
      '<rootDir>/../brightchain-lib/src/index.ts',
    '^@brightchain/brightchain-lib/(.*)$':
      '<rootDir>/../brightchain-lib/src/$1',
  },
};
