module.exports = {
  displayName: 'brightchain-node-express-suite',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: [
    // Yarn Berry .store: transform ESM-only packages stored under .store/
    '/node_modules/\\.store/(?!.*(@noble|@scure|@ethereumjs|uuid|otplib)-)',
    // Classic node_modules layout
    '/node_modules/(?!(\\.store|@noble|@scure|@ethereumjs|uuid|otplib)/)',
    '/dist/',
    '<rootDir>/../dist/',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '<rootDir>/../dist/'],
  modulePathIgnorePatterns: ['/dist/', '<rootDir>/../dist/'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightchain-node-express-suite',
  testTimeout: 180000,
  moduleNameMapper: {
    '^@brightchain/brightchain-lib$':
      '<rootDir>/../brightchain-lib/src/index.ts',
    '^@brightchain/node-express-suite$': '<rootDir>/src/index.ts',
    '^uuid$': '<rootDir>/../node_modules/uuid/dist/cjs/index.js',
  },
};
