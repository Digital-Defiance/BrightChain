export default {
  displayName: 'brightchain-identity',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.spec.json',
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: [
    // Yarn Berry .store: transform ESM-only packages stored under .store/
    '/node_modules/\\.store/(?!.*(@noble|@scure|@ethereumjs|uuid|otplib)-)',
    // Classic node_modules layout
    '/node_modules/(?!(\\.store|@noble|@scure|@ethereumjs|uuid|otplib)/)',
    '/dist/',
    '<rootDir>/../dist/',
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightchain-identity',
  moduleNameMapper: {
    '^uuid$': '<rootDir>/../node_modules/uuid/dist/cjs/index.js',
  },
};
