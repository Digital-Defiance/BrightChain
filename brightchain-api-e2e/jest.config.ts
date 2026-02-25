export default {
  displayName: 'brightchain-api-e2e',
  preset: '../jest.preset.js',
  globalSetup: '<rootDir>/src/support/global-setup.ts',
  globalTeardown: '<rootDir>/src/support/global-teardown.ts',
  setupFiles: ['<rootDir>/src/support/test-setup.ts'],
  testEnvironment: 'node',
  testTimeout: 60_000,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@noble|@scure|uuid)/)',
    '/dist/',
    '<rootDir>/../dist/',
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightchain-api-e2e',
  moduleNameMapper: {
    '^@brightchain/brightchain-api-lib$':
      '<rootDir>/../brightchain-api-lib/src/index.ts',
    '^@brightchain/brightchain-api-lib/(.*)$':
      '<rootDir>/../brightchain-api-lib/src/$1',
    '^@brightchain/brightchain-lib$':
      '<rootDir>/../brightchain-lib/src/index.ts',
    '^@brightchain/brightchain-lib/(.*)$':
      '<rootDir>/../brightchain-lib/src/$1',
    '^@brightchain/db$': '<rootDir>/../brightchain-db/src/index.ts',
    '^@brightchain/db/(.*)$': '<rootDir>/../brightchain-db/src/$1',
    '^@brightchain/test-utils$':
      '<rootDir>/../brightchain-test-utils/src/index.ts',
    '^@brightchain/test-utils/(.*)$':
      '<rootDir>/../brightchain-test-utils/src/$1',
    '^uuid$': '<rootDir>/../node_modules/uuid/dist/cjs/index.js',
  },
};
