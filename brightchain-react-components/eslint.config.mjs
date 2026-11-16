import nxPlugin from '@nx/eslint-plugin';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import jsoncParser from 'jsonc-eslint-parser';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import baseConfig from '../eslint.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  ...baseConfig,
  {
    // The root config registers this plugin only for .ts/.tsx/.js/.jsx. The
    // Nx React preset also applies @typescript-eslint rules to .cts/.mts/.cjs/
    // .mjs files, so make the plugin available there too.
    name: 'brightchain-react-components/typescript-eslint-plugin',
    files: ['**/*.cts', '**/*.mts', '**/*.cjs', '**/*.mjs'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
  },
  ...nxPlugin.configs['flat/react'],
  {
    name: 'brightchain-react-components/rule-overrides',
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'jsx-a11y/accessible-emoji': 'off',
      'no-useless-rename': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // The Nx React preset resets this rule; keep the workspace's underscore convention.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    name: 'brightchain-react-components/typescript',
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    name: 'brightchain-react-components/dependency-checks',
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
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
          // react-dom is a peer for host apps; this library only imports react.
          ignoredDependencies: [
            'react-dom',
            '@testing-library/jest-dom',
            '@testing-library/react',
            'fast-check',
          ],
        },
      ],
    },
  },
];
