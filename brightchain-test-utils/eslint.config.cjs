// Flat ESLint config wrapper for this package.
// We reference the repo root legacy .eslintrc.json via the 'extends' bridge key supported by ESLint 9.

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    name: 'brightchain-test-utils/base',
    // Bridge to root config; ESLint 9 supports extends inside flat config objects.
    extends: ['../.eslintrc.json'],
    files: ['**/*.{ts,tsx,js,jsx}'],
  },
  {
    name: 'brightchain-test-utils/json',
    files: ['**/*.json'],
    languageOptions: {
      parser: require('jsonc-eslint-parser'),
    },
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
        },
      ],
    },
  },
];
