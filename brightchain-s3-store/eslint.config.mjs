import nxPlugin from '@nx/eslint-plugin';
import jsoncParser from 'jsonc-eslint-parser';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import baseConfig from '../eslint.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  ...baseConfig,
  {
    name: 'brightchain-s3-store/typescript',
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    name: 'brightchain-s3-store/dependency-checks',
    files: ['**/*.json'],
    plugins: {
      '@nx': nxPlugin,
    },
    languageOptions: {
      parser: jsoncParser,
    },
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            // @brightchain/db is imported only by the conformance specs.
            '{projectRoot}/src/**/__tests__/**',
          ],
        },
      ],
    },
  },
];
