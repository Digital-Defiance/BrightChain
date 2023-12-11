// Test import of serverIconConfig from built package
const {
  DEFAULT_SERVER_ICON_CONFIG,
  isAllowedIconMimeType,
  isAllowedIconFileSize,
} = require('./dist/brightchain-lib/src/index.js');

console.log('✓ Successfully imported DEFAULT_SERVER_ICON_CONFIG:', DEFAULT_SERVER_ICON_CONFIG);
console.log('✓ Successfully imported isAllowedIconMimeType function');
console.log('✓ Successfully imported isAllowedIconFileSize function');

console.log('\nValidation tests:');
console.log('  isAllowedIconMimeType("image/png"):', isAllowedIconMimeType('image/png'));
console.log('  isAllowedIconMimeType("text/plain"):', isAllowedIconMimeType('text/plain'));
console.log('  isAllowedIconFileSize(1024 * 1024):', isAllowedIconFileSize(1024 * 1024));
console.log('  isAllowedIconFileSize(10 * 1024 * 1024):', isAllowedIconFileSize(10 * 1024 * 1024));
