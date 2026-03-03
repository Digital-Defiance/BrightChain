module.exports = {
  displayName: 'brightpass-react-components',
  preset: '../jest.preset.js',
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../coverage/brightpass-react-components',
  moduleNameMapper: {
    '^@brightchain/brightchain-react/services/(.*)$':
      '<rootDir>/../brightchain-react/src/services/$1',
    '^@brightchain/brightchain-lib$':
      '<rootDir>/../brightchain-lib/src/index.ts',
    '^@brightchain/brightchain-lib/(.*)$':
      '<rootDir>/../brightchain-lib/src/$1',
  },
};
