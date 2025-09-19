// Flat ESLint config for brightchain-test-utils (ESM)
import jsonc from 'jsonc-eslint-parser';
import rootFlat from '../eslint.config.mjs';

export default [
  // Include the repo root flat config
  ...rootFlat,
  // Plus package-specific JSON rules
  {
    name: 'brightchain-test-utils/json',
    files: ['**/*.json'],
    languageOptions: {
      parser: jsonc,
    },
    rules: {},
  },
];
