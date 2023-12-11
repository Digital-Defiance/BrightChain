# @brightchain/s3-store

Amazon S3 block store driver for BrightChain. Implements `IBlockStore` and `IPooledBlockStore` backed by S3.

## Usage

```typescript
import '@brightchain/s3-store'; // registers factory
import { BlockStoreFactory } from '@brightchain/brightchain-lib';

const store = BlockStoreFactory.createS3Store({
  region: 'us-east-1',
  containerOrBucketName: 'my-brightchain-bucket',
  blockSize: BlockSize.Small,
  accessKeyId: '...',
  secretAccessKey: '...',
});
```
