export default {
  displayName: 'brightchain-api-lib',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@noble|@scure)/)',
    '/dist/',
    '<rootDir>/../dist/',
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightchain-api-lib',
  testTimeout: 180000,
  maxWorkers: 1,
  moduleNameMapper: {
    '^@brightchain/brightchain-lib$':
      '<rootDir>/../brightchain-lib/src/index.ts',
    '^@brightchain/api-lib$': '<rootDir>/src/index.ts',
  },
  extensionsToTreatAsEsm: ['.ts'],
};
