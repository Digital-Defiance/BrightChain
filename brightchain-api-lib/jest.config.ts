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
    '^.+\\.js$': [
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
    '/node_modules/\\.store/(?!.*(@faker-js|@noble|@scure|@ethereumjs|uuid)-)',
    '/node_modules/(?!(\\.store|@noble|@scure|@ethereumjs|uuid|@faker-js)/)',
    // Only ignore workspace dist output, not dist/ inside node_modules packages
    '<rootDir>/../dist/',
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
    // Force a single copy of i18n-lib so the test-setup bootstrap and the
    // node-express-suite middleware share the same LanguageRegistry singleton.
    '^@digitaldefiance/i18n-lib$':
      '<rootDir>/../node_modules/@digitaldefiance/i18n-lib/src/index.js',
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
