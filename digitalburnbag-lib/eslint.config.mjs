import baseConfig from '../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    name: 'digitalburnbag-lib/rules',
    files: ['**/*.ts', '**/*.js'],
    rules: {},
  },
];
