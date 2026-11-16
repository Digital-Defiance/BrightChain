// ESLint flat config (ESM) - migrated from .eslintrc.json
import js from '@eslint/js';
import nxPlugin from '@nx/eslint-plugin';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import jestPlugin from 'eslint-plugin-jest';
import prettierPlugin from 'eslint-plugin-prettier';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    name: 'root/ignores',
    ignores: [
      'node_modules',
      '**/dist/**',
      '**/out/**',
      '**/tmp/**',
      '**/coverage/**',
      '**/.nx/**',
    ],
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
      prettier: prettierPlugin,
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
      prettier: prettierPlugin,
    },
    rules: {
      ...typescriptEslint.configs['recommended'].rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-extra-semi': 'off',
      // The TypeScript compiler checks undefined names, including type-only
      // globals (React, Express, jest) that core no-undef misreports.
      // typescript-eslint recommends turning it off for TS files.
      'no-undef': 'off',
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
      '**/brightchain-react/**/*.ts',
      '**/brightchain-react/**/*.tsx',
      '**/brightchain-react-components/**/*.ts',
      '**/brightchain-react-components/**/*.tsx',
      '**/brightchain-react-e2e/**/*.ts',
      '**/brightchain-react-e2e/**/*.tsx',
      '**/brightmail-react-components/**/*.ts',
      '**/brightmail-react-components/**/*.tsx',
      '**/brighthub-react-components/**/*.ts',
      '**/brighthub-react-components/**/*.tsx',
      '**/brightpass-react-components/**/*.ts',
      '**/brightpass-react-components/**/*.tsx',
      '**/brightchat-react-components/**/*.ts',
      '**/brightchat-react-components/**/*.tsx',
      '**/digitalburnbag-react-components/**/*.ts',
      '**/digitalburnbag-react-components/**/*.tsx',
      '**/brightledger-assets-react-components/**/*.ts',
      '**/brightledger-assets-react-components/**/*.tsx',
      '**/showcase/**/*.ts',
      '**/showcase/**/*.tsx',
      '**/subspace-lattice-react/**/*.ts',
      '**/subspace-lattice-react/**/*.tsx',
      '**/brightcal-react-components/**/*.ts',
      '**/brightcal-react-components/**/*.tsx',
      '**/brightchart-react-components/**/*.ts',
      '**/brightchart-react-components/**/*.tsx',
      '**/brightnexus-react-components/**/*.ts',
      '**/brightnexus-react-components/**/*.tsx',
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
      '**/brightchain-react-e2e/**/fixtures.ts',
      '**/digitalburnbag-react-components/**/fixtures.ts',
    ],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  // ── Brand vocabulary discipline for brightledger-assets-* packages ────────
  // Forbidden terms signal finance/tokenomics framing that must not appear in
  // identifiers, string literals, or comments in the asset ledger packages.
  // See Requirements 8.1, 8.3.
  {
    name: 'brightledger-assets/vocabulary',
    files: [
      '**/brightledger-assets-lib/**/*.ts',
      '**/brightledger-assets-lib/**/*.tsx',
      '**/brightledger-assets-api-lib/**/*.ts',
      '**/brightledger-assets-api-lib/**/*.tsx',
      '**/brightledger-assets-react-components/**/*.ts',
      '**/brightledger-assets-react-components/**/*.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        // Forbidden identifier names
        {
          selector:
            'Identifier[name=/\\b(coin|holder|tokenomics|airdrop|staking|marketCap)\\b/i]',
          message:
            'Forbidden vocabulary in brightledger-assets-*. Use: issue/transfer/burn/freeze/attest/asset/account/balance/entry/receipt.',
        },
        // Forbidden string literals (catches property access, JSX text, etc.)
        {
          selector:
            'Literal[value=/\\b(coin|holder|tokenomics|airdrop|staking|marketCap)\\b/i]',
          message:
            'Forbidden vocabulary in brightledger-assets-*. Use: issue/transfer/burn/freeze/attest/asset/account/balance/entry/receipt.',
        },
        // Template literal expressions containing forbidden terms
        {
          selector:
            'TemplateLiteral > TemplateElement[value.raw=/\\b(coin|holder|tokenomics|airdrop|staking|marketCap)\\b/i]',
          message:
            'Forbidden vocabulary in brightledger-assets-*. Use: issue/transfer/burn/freeze/attest/asset/account/balance/entry/receipt.',
        },
      ],
    },
  },
  // ── Brand vocabulary discipline for Joule resource-credit components ─────
  // Forbidden terms signal finance/speculation framing that must not appear in
  // Joule UI components.
  // See Requirements 7.6, 10.5.
  {
    name: 'joule/vocabulary',
    files: [
      '**/brightchain-react-components/src/lib/joule/**/*.ts',
      '**/brightchain-react-components/src/lib/joule/**/*.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Identifier[name=/\\b(coin|holder|airdrop|staking|marketCap|tokenomics|hodl|whale)\\b/i]',
          message:
            'Forbidden vocabulary in Joule UI. Use: credit/balance/reserve/consume/earn/spend.',
        },
        {
          selector:
            'Literal[value=/\\b(coin|holder|airdrop|staking|marketCap|tokenomics|hodl|whale)\\b/i]',
          message:
            'Forbidden vocabulary in Joule UI. Use: credit/balance/reserve/consume/earn/spend.',
        },
        {
          selector:
            'TemplateLiteral > TemplateElement[value.raw=/\\b(coin|holder|airdrop|staking|marketCap|tokenomics|hodl|whale)\\b/i]',
          message:
            'Forbidden vocabulary in Joule UI. Use: credit/balance/reserve/consume/earn/spend.',
        },
      ],
    },
  },
  // ── BrightDB reference model independence ─────────────────────────────────
  // The model is a test oracle. If it imported the production matcher, update
  // engine, index encoder, codec, storage or merge, a bug in them would agree
  // with itself and pass. It may import only the shared conformance types and
  // the error registry. See brightdb-v2-5 requirement 17.2.
  {
    name: 'brightdb-model/independence',
    files: ['**/brightchain-db/src/lib/v2/conformance/model/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Any relative import except ../types and ../../ops/errors, and
              // any workspace package.
              regex:
                '^(?!\\.\\./types$|\\.\\./\\.\\./ops/errors$)(\\.\\.?/|@brightchain/)',
              message:
                'The BrightDB reference model must stay independent of production code. Import only ../types and ../../ops/errors.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'test-files',
    files: [
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/jest.setup.ts',
      '**/__tests__/**/*.ts',
    ],
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
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // ts-jest only type-checks the files it transforms (plus their imports),
    // so an ambient declaration such as a custom matcher's typings is only
    // visible to a test that references it. Allow `/// <reference path>` in
    // test files for exactly that; it stays banned in source.
    name: 'test-files/ambient-references',
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/triple-slash-reference': [
        'error',
        { path: 'always', types: 'prefer-import', lib: 'always' },
      ],
    },
  },
  {
    // Shared helpers that live under __tests__/ are imported by test files;
    // exporting from them is their purpose.
    name: 'test-helpers',
    files: ['**/__tests__/helpers/**/*.ts'],
    rules: {
      'jest/no-export': 'off',
    },
  },
];
