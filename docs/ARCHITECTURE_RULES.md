# BrightChain Architecture Rules

## Dependency Direction Rules

### RULE 1: Blocks NEVER import Services directly
**Blocks** (data layer) must NEVER import from **Services** (business logic layer).

❌ **FORBIDDEN:**
```typescript
import { ServiceProvider } from '../services/service.provider';
import { ChecksumService } from '../services/checksum.service';
```

✅ **ALLOWED:**
```typescript
import { ServiceLocator } from '../services/serviceLocator';
// Then use: ServiceLocator.getServiceProvider().checksumService
```

### RULE 2: Services CAN import Blocks
Services operate on blocks, so this direction is allowed.

✅ **ALLOWED:**
```typescript
import { RawDataBlock } from '../blocks/rawData';
import { CBL } from '../blocks/cbl';
```

### RULE 3: Use ServiceLocator for cross-layer access
When blocks need services (rare), use ServiceLocator pattern.

### RULE 4: Interfaces should not create cycles
If Interface A extends Interface B, then B cannot reference A.

## Current Status
- **Started with:** 53 circular dependencies (brightchain-lib)
- **Current:** 45 circular dependencies (brightchain-lib), 29 (brightchain-api-lib)
- **Target:** <10 circular dependencies per package
- **Progress:** 15.1% reduction in brightchain-lib

## Fixes Applied
1. Replaced `ServiceProvider.getInstance()` with `ServiceLocator.getServiceProvider()` in all blocks
2. Used `import type` for type-only imports (Document, IQuorumDocument)
3. Removed self-referencing export in metadata/index.ts
4. Established one-way dependency: Services → Blocks

## Violations to Fix
Run `npx madge --circular --extensions ts brightchain-lib/src` to find remaining cycles.
