# brightchain-lib

This library was generated with [Nx](https://nx.dev).

## Overview

`brightchain-lib` is the core library for BrightChain, providing blockchain and cryptographic functionality. It extends base cryptographic constants from `@digitaldefiance/ecies-lib` and adds BrightChain-specific constants for blockchain operations.

## Constants Architecture

### Base Constants (from @digitaldefiance/ecies-lib)

The library extends base constants from `@digitaldefiance/ecies-lib`, which provides:

- **PBKDF2**: Password-based key derivation configuration
- **ECIES**: Elliptic Curve Integrated Encryption Scheme settings
- **CHECKSUM**: SHA3 checksum configuration
- **ENCRYPTION**: Base encryption settings
- **KEYRING**: Keyring algorithm configuration
- **UINT sizes**: Standard unsigned integer sizes and max values
- **VOTING**: Paillier homomorphic encryption for voting

### BrightChain-Specific Constants

The library defines the following BrightChain-specific constants:

#### CBL (Constituent Block List)
Constants for managing constituent block lists:
```typescript
import { CBL } from 'brightchain-lib';

// File validation
CBL.MAX_FILE_NAME_LENGTH  // 255
CBL.MAX_MIME_TYPE_LENGTH  // 127
CBL.FILE_NAME_PATTERN     // Regex for valid file names
CBL.MIME_TYPE_PATTERN     // Regex for valid MIME types
```

#### FEC (Forward Error Correction)
Constants for forward error correction:
```typescript
import { FEC } from 'brightchain-lib';

FEC.MAX_SHARD_SIZE  // 1048576 (1MB)
```

#### TUPLE
Constants for tuple operations:
```typescript
import { TUPLE } from 'brightchain-lib';

TUPLE.SIZE                    // 3
TUPLE.MIN_SIZE                // 2
TUPLE.MAX_SIZE                // 10
TUPLE.RANDOM_BLOCKS_PER_TUPLE // 2
```

#### SEALING
Constants for sealing operations:
```typescript
import { SEALING } from 'brightchain-lib';

SEALING.MIN_SHARES  // 2
SEALING.MAX_SHARES  // 1048575
```

#### SITE
Site-specific configuration:
```typescript
import { SITE } from 'brightchain-lib';

SITE.EMAIL_FROM      // 'noreply@brightchain.io'
SITE.DOMAIN          // 'localhost:3000'
SITE.CSP_NONCE_SIZE  // 32
```

#### JWT
JWT configuration:
```typescript
import { JWT } from 'brightchain-lib';

JWT.ALGORITHM       // 'HS256'
JWT.EXPIRATION_SEC  // 86400 (24 hours)
```

### Usage Examples

#### Importing All Constants
```typescript
import CONSTANTS from 'brightchain-lib';

// Access base constants (from @digitaldefiance/ecies-lib)
const pbkdf2Iterations = CONSTANTS.PBKDF2.ITERATIONS;
const eciesCurve = CONSTANTS.ECIES.CURVE_NAME;

// Access BrightChain-specific constants
const maxFileSize = CONSTANTS.CBL.MAX_INPUT_FILE_SIZE;
const tupleSize = CONSTANTS.TUPLE.SIZE;
```

#### Importing Specific Constant Groups
```typescript
import { CBL, FEC, TUPLE, SEALING } from 'brightchain-lib';

// Use specific constant groups
const isValidFileName = CBL.FILE_NAME_PATTERN.test(fileName);
const maxShardSize = FEC.MAX_SHARD_SIZE;
```

#### Using ECIES Configuration
```typescript
import { EciesConfig } from 'brightchain-lib';

// EciesConfig provides a ready-to-use ECIES configuration object
const config = EciesConfig;
console.log(config.curveName);  // 'secp256k1'
console.log(config.symmetricAlgorithm);  // 'aes-256-gcm'
```

### Backward Compatibility

The refactored constants maintain full backward compatibility. All previously exported constant names remain accessible:

```typescript
// These all work as before
import CONSTANTS from 'brightchain-lib';

CONSTANTS.PBKDF2.ITERATIONS
CONSTANTS.ECIES.CURVE_NAME
CONSTANTS.CHECKSUM.ALGORITHM
CONSTANTS.CBL.MAX_FILE_NAME_LENGTH
```

## Building

Run `nx build brightchain-lib` to build the library.

## Running unit tests

Run `nx test brightchain-lib` to execute the unit tests via [Jest](https://jestjs.io).

## Migration Guide

If you're updating from a previous version of brightchain-lib, see [MIGRATION.md](./.kiro/specs/constants-refactoring/MIGRATION.md) for detailed migration instructions.
