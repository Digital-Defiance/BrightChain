module.exports = {
  displayName: 'brightcal-api-lib',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: require('path').join(__dirname, 'tsconfig.spec.json'),
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
    '<rootDir>/../dist/',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '<rootDir>/../dist/'],
  modulePathIgnorePatterns: ['/dist/', '<rootDir>/../dist/'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightcal-api-lib',
  testTimeout: 180000,
  maxWorkers: 4,
  moduleNameMapper: {
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
