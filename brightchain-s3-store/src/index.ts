// Import factory registration side effect — registers S3BlockStore
// with BlockStoreFactory at import time.
import './lib/factories/s3BlockStoreFactory';

// Export public API
export { IS3BlockStoreConfig, S3BlockStore } from './lib/stores/s3BlockStore';
