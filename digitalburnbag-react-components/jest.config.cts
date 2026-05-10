const path = require('path');

// Resolve react-router-dom from the workspace root (follows the hoisted symlink).
// Then resolve react-router from react-router-dom's own dependencies so both
// packages share a single copy — avoids the dual-package hazard where
// LayoutShell and the test file see different React Router contexts.
const reactRouterDomDir = path.dirname(
  require.resolve('react-router-dom/package.json', {
    paths: [path.resolve(__dirname, '..')],
  }),
);

let reactRouterDir: string;
try {
  reactRouterDir = path.dirname(
    require.resolve('react-router/package.json', {
      paths: [reactRouterDomDir],
    }),
  );
} catch {
  // Fallback: react-router may be hoisted alongside react-router-dom
  reactRouterDir = path.dirname(
    require.resolve('react-router/package.json', {
      paths: [path.resolve(__dirname, '..')],
    }),
  );
}

module.exports = {
  displayName: 'digitalburnbag-react-components',
  preset: '../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../coverage/digitalburnbag-react-components',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.e2e\\.spec\\.'],
  moduleNameMapper: {
    '^react-router-dom$': reactRouterDomDir,
    '^react-router$': reactRouterDir,
  },
};
