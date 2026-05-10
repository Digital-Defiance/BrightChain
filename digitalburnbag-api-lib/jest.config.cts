module.exports = {
  displayName: 'digitalburnbag-api-lib',
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
  coverageDirectory: '../coverage/digitalburnbag-api-lib',
  testTimeout: 60000,
  moduleNameMapper: {
    '^@brightchain/digitalburnbag-lib$':
      '<rootDir>/../digitalburnbag-lib/src/index.ts',
    '^@brightchain/digitalburnbag-api-lib$': '<rootDir>/src/index.ts',
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
