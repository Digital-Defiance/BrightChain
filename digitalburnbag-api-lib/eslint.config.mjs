import baseConfig from '../eslint.config.mjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  ...baseConfig,
  {
    name: 'digitalburnbag-api-lib/typescript',
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        projectService: true,
      },
    },
  },
  {
    name: 'digitalburnbag-api-lib/rules',
    files: ['**/*.ts', '**/*.js'],
    rules: {},
  },
];
