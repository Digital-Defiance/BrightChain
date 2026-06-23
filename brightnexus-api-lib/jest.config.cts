module.exports = {
  displayName: 'brightnexus-api-lib',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.spec.json',
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
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/\\.store/(?!.*(@faker-js|@scure|@otplib|otplib|@noble)-)',
    '/node_modules/(?!(\\.store|@faker-js|@scure|@otplib|otplib|@noble)/)',
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightnexus-api-lib',
  testTimeout: 60000,
  moduleNameMapper: {
    '^@brightchain/brightnexus-lib$':
      '<rootDir>/../brightnexus-lib/src/index.ts',
    '^@brightchain/brightnexus-api-lib$': '<rootDir>/src/index.ts',
    '^@brightchain/db$': '<rootDir>/../brightchain-db/src/index.ts',
    '^@brightchain/brightchain-lib$':
      '<rootDir>/../brightchain-lib/src/index.ts',
    '^uuid$': '<rootDir>/../node_modules/uuid/dist/cjs/index.js',
    '^@digitaldefiance/i18n-lib$':
      '<rootDir>/../node_modules/@digitaldefiance/i18n-lib/src/index.js',
  },
  testMatch: [
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.test.ts',
    '**/*.spec.ts',
    '**/*.test.ts',
  ],
};
