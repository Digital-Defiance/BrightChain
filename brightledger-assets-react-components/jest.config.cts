module.exports = {
  displayName: 'brightledger-assets-react-components',
  preset: '../jest.preset.js',
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../coverage/brightledger-assets-react-components',
  moduleNameMapper: {
    '^@brightchain/brightchain-lib$':
      '<rootDir>/../brightchain-lib/src/index.ts',
    '^@brightchain/brightchain-lib/(.*)$':
      '<rootDir>/../brightchain-lib/src/$1',
    '^@brightchain/brightledger-assets-lib$':
      '<rootDir>/../brightledger-assets-lib/src/index.ts',
    '^@brightchain/brightledger-assets-lib/(.*)$':
      '<rootDir>/../brightledger-assets-lib/src/$1',
    '^@brightchain/brightledger-assets-api-lib$':
      '<rootDir>/../brightledger-assets-api-lib/src/index.ts',
    '^@brightchain/brightledger-assets-api-lib/(.*)$':
      '<rootDir>/../brightledger-assets-api-lib/src/$1',
  },
};
