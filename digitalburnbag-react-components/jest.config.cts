module.exports = {
  displayName: 'digitalburnbag-react-components',
  preset: '../jest.preset.js',
  transform: {
    // react-router v8 and its dependencies are ESM-only: see tools/jest-esm-transformer.js
    '/node_modules/.+\\.[cm]?js$': '<rootDir>/../tools/jest-esm-transformer.js',
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.store/)?(?:react-router|@remix-run[-/]route-pattern|cookie-es)[-/])',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../coverage/digitalburnbag-react-components',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.e2e\\.spec\\.'],
};
