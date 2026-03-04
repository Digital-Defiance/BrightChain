import nx from '@nx/eslint-plugin';
import baseConfig from '../eslint.config.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  ...baseConfig,
  {
    name: 'brighthub-react-components/react',
    files: ['**/*.tsx', '**/*.jsx'],
    ...nx.configs['flat/react'].find((c) => c.name === 'nx/react'),
  },
  {
    name: 'brighthub-react-components/typescript',
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: [
          path.join(__dirname, 'tsconfig.lib.json'),
          path.join(__dirname, 'tsconfig.spec.json'),
        ],
      },
    },
  },
  {
    name: 'brighthub-react-components/rules',
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
  },
];
