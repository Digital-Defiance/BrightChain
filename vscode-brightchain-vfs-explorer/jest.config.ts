export default {
  displayName: 'vscode-brightchain-vfs-explorer',
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
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__mocks__/vscode.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/vscode-brightchain-vfs-explorer',
  transformIgnorePatterns: ['/node_modules/(?!fast-check).+\\.js$'],
  extensionsToTreatAsEsm: ['.ts'],
};
