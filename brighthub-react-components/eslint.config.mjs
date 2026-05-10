import baseConfig from '../eslint.config.mjs';
import globals from 'globals';

export default [
  ...baseConfig,
  {
    name: 'brighthub-react-components/browser-globals',
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
