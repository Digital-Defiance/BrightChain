module.exports = {
  displayName: 'brightchart-react-components',
  preset: '../jest.preset.js',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  transform: {
    // react-router v8 and its dependencies are ESM-only: see tools/jest-esm-transformer.js
    '/node_modules/.+\\.[cm]?js$': '<rootDir>/../tools/jest-esm-transformer.js',
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      { tsconfig: require('path').join(__dirname, 'tsconfig.spec.json') },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.store/)?(?:react-router|@remix-run[-/]route-pattern|cookie-es)[-/])',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../coverage/brightchart-react-components',
};
