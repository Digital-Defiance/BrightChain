import baseConfig from '../eslint.config.mjs';

export default [
  {
    name: 'digitalburnbag-react-components/ignores',
    ignores: [
      'e2e-app/**',
      '**/e2e-app/**',
      'playwright.config.ts',
      '**/playwright.config.ts',
    ],
  },
  ...baseConfig,
  {
    name: 'digitalburnbag-react-components/e2e-fixtures',
    files: ['**/e2e/fixtures.ts', '**/e2e/**/*.spec.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    name: 'digitalburnbag-react-components/rules',
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
  },
];
