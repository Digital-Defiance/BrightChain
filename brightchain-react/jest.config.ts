export default {
  displayName: 'brightchain-react',
  preset: '../jest.preset.js',
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../coverage/brightchain-react',
  moduleNameMapper: {
    '^@brightchain/brightmail-react-components$':
      '<rootDir>/../brightmail-react-components/src/index.ts',
    '^@brightchain/brightpass-react-components$':
      '<rootDir>/../brightpass-react-components/src/index.ts',
    // Mock the environment module to avoid import.meta.env in Jest
    '^\\.\\./environments/environment$':
      '<rootDir>/src/environments/__mocks__/environment.ts',
  },
};
