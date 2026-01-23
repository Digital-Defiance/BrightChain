# TUPLE Storage Architecture

## Overview

BrightChain implements **complete Owner-Free Filesystem (OFF) compliance** by storing ALL data as TUPLEs. A TUPLE consists of 3 blocks:
- 1 data block (XORed with randomizers)
- 2 randomizer blocks (cryptographically random)

This ensures **plausible deniability** - no single block contains identifiable data, and all three blocks are required for reconstruction.

## Why TUPLEs?

### Legal Protection
The OFF System provides legal protection through plausible deniability. If any party (node operator, storage provider) is compelled to produce data, they can only provide meaningless random-looking blocks. Without all three blocks of the TUPLE, the original data cannot be reconstructed.

### Brokered Anonymity
BrightChain's "Brokered Anonymity" feature requires complete OFF compliance. Identity information is sealed using Shamir's Secret Sharing and stored as TUPLEs, ensuring it can only be reconstructed through majority quorum consensus (e.g., in response to legal warrants).

### Consistency
Having ALL data stored as TUPLEs eliminates a two-tier system where some data is traceable and some isn't. This consistency is crucial for legal defensibility.

## Storage Hierarchy

### 1. Raw Data Blocks
**Every** data block is stored as a TUPLE:
```
Data Block: D ⊕ R1 ⊕ R2
Randomizer 1: R1
Randomizer 2: R2
```

### 2. CBL (Constituent Block List) Metadata
CBLs are stored as TUPLEs (not just whitened with a single randomizer):
```
CBL TUPLE: 3 blocks
- CBL data ⊕ R1 ⊕ R2
- R1
- R2
```

### 3. Message Content
Each message is stored as a TUPLE:
```
Message TUPLE: 3 blocks
- Message data ⊕ R1 ⊕ R2
- R1
- R2
```

### 4. Participant Data
Each participant (sender/recipient) has their own TUPLE:
```
Sender TUPLE: 3 blocks
Recipient TUPLE: 3 blocks (per recipient)
```

### 5. Super CBL Structures
Super CBLs (hierarchical CBLs) are also stored as TUPLEs:
```
Super CBL TUPLE: 3 blocks
Sub-CBL 1 TUPLE: 3 blocks
Sub-CBL 2 TUPLE: 3 blocks
...
```

## Storage Cost Example

### Simple Message (1 block of content)
**Old "cheating" approach:** ~3 blocks
- 1 message block
- 1 sender block
- 1 recipient block

**Full TUPLE approach:** 15 blocks
- Message TUPLE: 3 blocks
- Sender TUPLE: 3 blocks
- Recipient TUPLE: 3 blocks
- CBL TUPLE: 3 blocks
- Metadata TUPLE: 3 blocks

**Multiplier:** 5x storage

### Multi-Recipient Message (1 block, 3 recipients)
**Full TUPLE approach:** 21 blocks
- Message TUPLE: 3 blocks
- Sender TUPLE: 3 blocks
- Recipient 1 TUPLE: 3 blocks
- Recipient 2 TUPLE: 3 blocks
- Recipient 3 TUPLE: 3 blocks
- CBL TUPLE: 3 blocks
- Metadata TUPLE: 3 blocks

## Magnet URL Format

### TUPLE Magnet URL
```
magnet:?xt=urn:brightchain:tuple
  &bs=<block_size>
  &d=<data_block_id>
  &r1=<randomizer1_id>
  &r2=<randomizer2_id>
  [&pd=<data_parity_ids>]
  [&pr1=<rand1_parity_ids>]
  [&pr2=<rand2_parity_ids>]
```

### Example
```
magnet:?xt=urn:brightchain:tuple&bs=1024&d=abc123...&r1=def456...&r2=ghi789...
```

## Reconstruction

To reconstruct original data from a TUPLE:
```typescript
// Retrieve all three blocks
const dataBlock = await blockStore.getData(dataBlockId);
const rand1Block = await blockStore.getData(rand1BlockId);
const rand2Block = await blockStore.getData(rand2BlockId);

// XOR to reconstruct
const original = new Uint8Array(blockSize);
for (let i = 0; i < blockSize; i++) {
  original[i] = dataBlock[i] ^ rand1Block[i] ^ rand2Block[i];
}
```

## Forward Error Correction (FEC)

Each block in a TUPLE can have its own parity blocks for durability:
- Data block: N parity blocks
- Randomizer 1: N parity blocks
- Randomizer 2: N parity blocks

This allows recovery even if some blocks are lost or corrupted.

## Migration Path

### Phase 1: New Code (Current)
- All new storage operations use `TupleStorageService`
- Old `storeCBLWithWhitening` methods marked as `@deprecated`
- Existing data remains accessible via old methods

### Phase 2: Gradual Migration
- Background job to re-store old data as TUPLEs
- Dual-read support (try TUPLE first, fall back to old format)
- Metrics tracking migration progress

### Phase 3: Complete Migration
- Remove deprecated methods
- All data stored as TUPLEs
- Full OFF compliance achieved

## Usage

### Storing Data
```typescript
import { TupleStorageService } from '@brightchain/brightchain-lib';

const tupleService = new TupleStorageService(blockStore);

// Store any data as a TUPLE
const result = await tupleService.storeTuple(data, {
  durabilityLevel: DurabilityLevel.High,
  expiresAt: new Date(Date.now() + 86400000), // 24 hours
});

console.log('Magnet URL:', result.magnetUrl);
console.log('Data Block:', result.dataBlockId);
console.log('Randomizers:', result.randomizerBlockIds);
```

### Retrieving Data
```typescript
// Parse magnet URL
const components = tupleService.parseTupleMagnetUrl(magnetUrl);

// Retrieve original data
const originalData = await tupleService.retrieveTuple(
  components.dataBlockId,
  components.randomizerBlockIds,
  components.parityBlockIds,
);
```

## Performance Considerations

### Storage
- **5x storage overhead** for typical operations
- Mitigated by: deduplication, compression, efficient encoding
- Benefit: True owner-free storage with legal protection

### Retrieval
- **3x network requests** (one per block)
- Mitigated by: parallel fetching, caching, prefetching
- Benefit: Plausible deniability, distributed storage

### URL Size
- **3 block IDs** per TUPLE (vs 2 for old whitening)
- Mitigated by: URL shorteners, DHT lookups, compact encoding
- Benefit: Complete OFF compliance

## Security Properties

### Plausible Deniability
✅ No single block contains identifiable data
✅ All three blocks required for reconstruction
✅ Each block appears as random data

### Legal Protection
✅ Node operators cannot be compelled to produce meaningful data
✅ Storage providers hold only random-looking blocks
✅ Reconstruction requires cooperation of multiple parties

### Brokered Anonymity
✅ Identity information sealed with Shamir's Secret Sharing
✅ Stored as TUPLEs for additional protection
✅ Requires quorum consensus for reconstruction

## Conclusion

Full TUPLE storage is essential for BrightChain's legal defensibility and "government in a box" vision. While it increases storage costs by 5x, the benefits of complete OFF compliance, plausible deniability, and legal protection far outweigh the costs. Storage is cheap and getting cheaper, while legal liability is expensive and getting more complex.

**All new code MUST use `TupleStorageService` for storage operations.**
