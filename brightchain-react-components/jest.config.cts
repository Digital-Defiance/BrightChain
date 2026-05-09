module.exports = {
  displayName: 'brightchain-react-components',
  preset: '../jest.preset.js',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: require('path').join(__dirname, 'tsconfig.spec.json') }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../coverage/brightchain-react-components',
  moduleNameMapper: {
    '^@brightchain/brightchain-lib$':
      '<rootDir>/src/__mocks__/brightchain-lib.ts',
  },
};
