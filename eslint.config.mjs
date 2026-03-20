// ESLint flat config (ESM) - migrated from .eslintrc.json
import nxPlugin from '@nx/eslint-plugin';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jestPlugin from 'eslint-plugin-jest';
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    name: 'root/ignores',
    ignores: ['node_modules', '**/dist/**', '**/tmp/**', '**/coverage/**', '**/.nx/**'],
  },
  {
    name: 'root/base',
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
        NodeJS: 'readonly',
        BufferEncoding: 'readonly',
      },
    },
    plugins: {
      '@nx': nxPlugin,
      '@typescript-eslint': typescriptEslint,
      'prettier': prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  js.configs.recommended,
  {
    name: 'typescript',
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        projectService: true,
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
        NodeJS: 'readonly',
        BufferEncoding: 'readonly',
        window: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'prettier': prettierPlugin,
    },
    rules: {
      ...typescriptEslint.configs['recommended'].rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-extra-semi': 'off',
    },
  },
  {
    name: 'javascript',
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-extra-semi': 'off',
    },
  },
  {
    name: 'react-files',
    files: [
      '**/brightchain-react/**/*.ts', '**/brightchain-react/**/*.tsx',
      '**/brightchain-react-components/**/*.ts', '**/brightchain-react-components/**/*.tsx',
      '**/brightchain-react-e2e/**/*.ts', '**/brightchain-react-e2e/**/*.tsx',
      '**/brightmail-react-components/**/*.ts', '**/brightmail-react-components/**/*.tsx',
      '**/brighthub-react-components/**/*.ts', '**/brighthub-react-components/**/*.tsx',
      '**/brightpass-react-components/**/*.ts', '**/brightpass-react-components/**/*.tsx',
      '**/brightchat-react-components/**/*.ts', '**/brightchat-react-components/**/*.tsx',
      '**/showcase/**/*.ts', '**/showcase/**/*.tsx',
    ],
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        React: 'readonly',
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    name: 'playwright-fixtures',
    files: [
      '**/brightchain-react-e2e/**/fixtures.ts'
    ],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    name: 'test-files',
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.spec.js', '**/*.spec.jsx', '**/*.test.ts', '**/*.test.tsx', '**/jest.setup.ts', '**/__tests__/**/*.ts'],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.es2021,
        fail: 'readonly',
        BufferEncoding: 'readonly',
      },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
      'jest/no-conditional-expect': 'off',
      'jest/no-jasmine-globals': 'warn',
      'jest/expect-expect': 'off',
      'jest/no-standalone-expect': 'off',
      'jest/no-done-callback': 'warn',
      'jest/valid-title': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
