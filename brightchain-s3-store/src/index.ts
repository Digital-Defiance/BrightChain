// Import factory registration side effect — registers S3BlockStore
// with BlockStoreFactory at import time.
import './lib/factories/s3BlockStoreFactory';

// Export public API
export { S3BlockStore, IS3BlockStoreConfig } from './lib/stores/s3BlockStore';
