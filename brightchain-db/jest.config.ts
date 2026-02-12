module.exports = {
  displayName: 'brightchain-db',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightchain-db',
  moduleNameMapper: {
    '^@brightchain/brightchain-lib$':
      '<rootDir>/../brightchain-lib/src/index.ts',
    '^@brightchain/brightchain-lib/(.*)$':
      '<rootDir>/../brightchain-lib/src/$1',
  },
};
