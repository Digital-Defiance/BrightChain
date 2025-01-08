import type { Config } from '@jest/types';

/* eslint-disable */
const config: Config.InitialOptions = {
  displayName: 'brightchain-lib',
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightchain-lib',
  snapshotSerializers: ['<rootDir>/bigIntSerializer.ts'],
};

export default config;
