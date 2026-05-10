module.exports = {
  displayName: 'digitalburnbag-sync-client',
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
      'babel-jest',
      {
        presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chokidar|readdirp|@noble|@scure|@ethereumjs)/)',
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/digitalburnbag-sync-client',
  testTimeout: 60000,
  moduleNameMapper: {
    '^@brightchain/digitalburnbag-lib$':
      '<rootDir>/../digitalburnbag-lib/src/index.ts',
    '^@brightchain/digitalburnbag-sync-client$': '<rootDir>/src/index.ts',
    '^uuid$': '<rootDir>/../node_modules/uuid/dist/cjs/index.js',
  },
  testMatch: [
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.test.ts',
    '**/*.spec.ts',
    '**/*.test.ts',
  ],
};
