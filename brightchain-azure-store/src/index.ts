// Import factory registration side effect — registers AzureBlobBlockStore
// with BlockStoreFactory at import time.
import './lib/factories/azureBlockStoreFactory';

// Export public API
export {
  AzureBlobBlockStore,
  IAzureBlobBlockStoreConfig,
} from './lib/stores/azureBlobBlockStore';
