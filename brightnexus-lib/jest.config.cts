module.exports = {
  displayName: 'brightnexus-lib',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      { tsconfig: require('path').join(__dirname, 'tsconfig.spec.json') },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/brightnexus-lib',
};
