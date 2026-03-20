export default {
  displayName: 'brightchain-api-lib',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        useESM: true,
        diagnostics: false,
      },
    ],
    '.*@faker-js.*\\.js$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'node',
        },
        useESM: true,
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/../dist/',
    'node_modules/\\.store/(?!.*(noble|scure|ethereumjs|faker-js|uuid))',
    'node_modules/(?!\\.store)(?!(@noble|@scure|@ethereumjs|uuid|@faker-js)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '<rootDir>/../dist/'],
  modulePathIgnorePatterns: ['/dist/', '<rootDir>/../dist/'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightchain-api-lib',
  testTimeout: 180000,
  maxWorkers: 4,
  moduleNameMapper: {
    '^@brightchain/brightchain-lib$':
      '<rootDir>/../brightchain-lib/src/index.ts',
    '^@brightchain/node-express-suite$':
      '<rootDir>/../brightchain-node-express-suite/src/index.ts',
    '^@brightchain/api-lib$': '<rootDir>/src/index.ts',
    // Redirect uuid imports to the CJS version to avoid ESM issues
    '^uuid$': '<rootDir>/../node_modules/uuid/dist/cjs/index.js',
  },
  extensionsToTreatAsEsm: ['.ts'],
  // Only match actual test files, not mocks/fixtures/helpers
  testMatch: [
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.test.ts',
    '**/*.spec.ts',
    '**/*.test.ts',
  ],
};
