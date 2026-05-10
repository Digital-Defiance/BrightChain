module.exports = {
  displayName: 'brightledger-assets-api-lib',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.spec.json',
        useESM: true,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightledger-assets-api-lib',
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@noble|@scure|cbor-x|msgpackr-extract|cbor-extract)).+\\.js$',
  ],
};
