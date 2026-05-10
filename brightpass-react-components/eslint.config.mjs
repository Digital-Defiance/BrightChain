import baseConfig from '../eslint.config.mjs';
import globals from 'globals';

export default [
  ...baseConfig,
  {
    name: 'brightpass-react-components/browser-globals',
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    name: 'brightpass-react-components/rules',
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
  },
];
