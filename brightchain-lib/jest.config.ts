/* eslint-disable */
export default {
  displayName: 'brightchain-lib',
  preset: '../jest.preset.js',
  testEnvironment: '<rootDir>/src/test/customEnvironment.ts',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        useESM: true,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightchain-lib',
  snapshotSerializers: ['<rootDir>/bigIntSerializer.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts',
    '<rootDir>/jest.setup.ts',
  ],
  transformIgnorePatterns: [
    // Tell Jest to transform node_modules/file-type
    '/node_modules/(?!file-type|strtok3|token-types|@tokenizer|uint8array-extras).+\\.js$',
  ],
  extensionsToTreatAsEsm: ['.ts'],
};
