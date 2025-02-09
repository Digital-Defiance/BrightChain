const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  snapshotSerializers: [
    ...(nxPreset.snapshotSerializers || []),
    require.resolve('./brightchain-lib/bigIntSerializer'),
  ],
};
