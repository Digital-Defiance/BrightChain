export default {
  displayName: 'brightchain-azure-store',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.spec.json',
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
    '/node_modules/\\.store/(?!.*(@noble|@scure|@ethereumjs|uuid|@otplib|otplib)-)',
    '/node_modules/(?!(\\.store|@noble|@scure|@ethereumjs|uuid|@otplib|otplib)/)',
    '<rootDir>/../dist/',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '<rootDir>/../dist/'],
  modulePathIgnorePatterns: ['/dist/', '<rootDir>/../dist/'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightchain-azure-store',
  testTimeout: 180000,
  maxWorkers: 4,
  moduleNameMapper: {
    '^@brightchain/brightchain-lib$':
      '<rootDir>/../brightchain-lib/src/index.ts',
    '^@brightchain/brightchain-api-lib$':
      '<rootDir>/../brightchain-api-lib/src/index.ts',
    '^@brightchain/node-express-suite$':
      '<rootDir>/../brightchain-node-express-suite/src/index.ts',
    '^@brightchain/db$': '<rootDir>/../brightchain-db/src/index.ts',
    '^@brightchain/azure-store$': '<rootDir>/src/index.ts',
    '^uuid$': '<rootDir>/../node_modules/uuid/dist/cjs/index.js',
  },
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: [
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.test.ts',
    '**/*.spec.ts',
    '**/*.test.ts',
  ],
};
