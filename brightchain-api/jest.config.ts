import nxPreset from '../jest.preset.js';

interface NxPreset {
  moduleNameMapper?: Record<string, string>;
}

export default {
  ...nxPreset,
  displayName: 'brightchain-api',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightchain-api',
  moduleNameMapper: {
    ...(nxPreset as NxPreset).moduleNameMapper,
    '^@brightchain/brightchain-lib$': '<rootDir>/../dist/brightchain-lib/src',
    '^@brightchain/brightchain-lib/(.*)$':
      '<rootDir>/../dist/brightchain-lib/src/$1',
    '^@brightchain/brightchain-api-lib$':
      '<rootDir>/../dist/brightchain-api-lib/src',
    '^@brightchain/brightchain-api-lib/(.*)$':
      '<rootDir>/../dist/brightchain-api-lib/src/$1',
  },
};
