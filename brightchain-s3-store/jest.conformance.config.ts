/**
 * Jest config for S3 conformance tests.
 *
 * AWS SDK v3 uses dynamic import() internally for credential resolution.
 * This requires --experimental-vm-modules in Node.js when running under
 * jest's VM sandbox. Set NODE_OPTIONS=--experimental-vm-modules before
 * running this config.
 *
 * This config deliberately avoids extensionsToTreatAsEsm to prevent
 * jest from treating all .ts files as ESM (which breaks CJS requires).
 */
export default {
  displayName: 'brightchain-s3-store-conformance',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          target: 'es2022',
          declaration: false,
          sourceMap: true,
        },
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@noble|@scure|@ethereumjs|uuid)/)',
    '/dist/',
    '<rootDir>/../dist/',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '<rootDir>/../dist/'],
  modulePathIgnorePatterns: ['/dist/', '<rootDir>/../dist/'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  testTimeout: 180000,
  maxWorkers: 1,
  moduleNameMapper: {
    '^@brightchain/brightchain-lib$':
      '<rootDir>/../brightchain-lib/src/index.ts',
    '^@brightchain/brightchain-api-lib$':
      '<rootDir>/../brightchain-api-lib/src/index.ts',
    '^@brightchain/node-express-suite$':
      '<rootDir>/../brightchain-node-express-suite/src/index.ts',
    '^@brightchain/db$': '<rootDir>/../brightchain-db/src/index.ts',
    '^@brightchain/s3-store$': '<rootDir>/src/index.ts',
    '^uuid$': '<rootDir>/../node_modules/uuid/dist/cjs/index.js',
  },
  testMatch: ['**/__tests__/conformance*.spec.ts'],
};
