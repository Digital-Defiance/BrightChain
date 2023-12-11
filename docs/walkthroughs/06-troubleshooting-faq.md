---
title: "Troubleshooting & FAQ"
parent: "Walkthroughs"
nav_order: 7
permalink: /walkthroughs/06-troubleshooting-faq/
---
# Troubleshooting & FAQ

| Field          | Value                                                        |
|----------------|--------------------------------------------------------------|
| Prerequisites  | None — use this guide whenever you encounter an issue        |
| Estimated Time | 5–10 minutes per issue                                       |
| Difficulty     | Beginner                                                     |

## Introduction

This is the centralized troubleshooting guide for the BrightChain walkthrough series. It covers common installation failures, runtime errors, and diagnostic commands that apply across all guides. Each walkthrough links here from its own Troubleshooting section — if you arrived from another guide, use the table of contents below to jump to the relevant category.

## Prerequisites

- Access to a terminal in the BrightChain repository root
- Node.js 20+ and Yarn installed (for installation issues, see the first section below)

## Steps

### Step 1: Resolve Installation Failures

#### Node.js Version Mismatch

BrightChain requires Node.js 20 or later. If you see errors about unsupported syntax, missing APIs, or unexpected token failures, check your version:

```bash
node --version
# Expected: v20.x.x or higher
```

If the version is too old:

1. Upgrade via [nodejs.org](https://nodejs.org/) or a version manager like [nvm](https://github.com/nvm-sh/nvm).
2. After upgrading, delete `node_modules` and reinstall:

```bash
rm -rf node_modules
yarn install
```

1. Verify the upgrade:

```bash
node --version
```

#### Yarn Dependency Resolution Failures

If `yarn install` fails with dependency conflicts or resolution errors:

1. Delete `node_modules` and any stale lock file artifacts:

```bash
rm -rf node_modules
```

1. Run `yarn install` again.
2. If the issue persists, check for conflicting global packages:

```bash
yarn --version
```

1. Ensure you are using a compatible Yarn version. The workspace expects Yarn Classic (1.x) or Yarn Berry — check the `packageManager` field in `package.json` for the expected version.
2. As a last resort, delete the lock file and regenerate it:

```bash
rm yarn.lock
yarn install
```

#### Nx Cache Issues

Stale Nx cache entries can cause builds, tests, or generators to behave unexpectedly. Symptoms include:

- Tests passing locally but failing in CI (or vice versa)
- Build output not reflecting recent code changes
- Generator errors referencing files that no longer exist

To reset the Nx cache:

```bash
npx nx reset
```

This clears all cached computation results. After resetting, re-run your command:

```bash
npx nx test brightchain-lib
```

If cache issues recur frequently, check that your Nx version matches the workspace lockfile and that no other process is writing to the `.nx/cache` directory.

### Step 2: Resolve Runtime Errors

#### Block Store Initialization Failures

If BrightDB fails to connect or throws errors during block store setup:

1. Verify the block store path exists and is writable:

```bash
ls -la /path/to/block-store
```

1. Check that the directory has sufficient disk space:

```bash
df -h /path/to/block-store
```

1. If using `InMemoryDatabase` for development, ensure you are not exceeding available memory. In-memory stores are suitable for testing but not for production workloads.

2. For persistent block stores, confirm the storage adapter is correctly configured:

```typescript
import { BrightDb } from '@brightchain/db';

// Ensure the adapter is initialized before passing it to BrightDb
const adapter = await createBlockStoreAdapter('/path/to/block-store');
const db = new BrightDb(adapter);
await db.connect();
```

1. Check the error message for specific causes:
   - `ENOENT` — The block store directory does not exist. Create it first.
   - `EACCES` — Permission denied. Check file ownership and permissions.
   - `ENOSPC` — Disk full. Free up space or point to a larger volume.

#### Pool Authentication Errors

If you receive authentication errors when connecting to a Storage Pool on another node:

1. Verify your ECDSA key pair is correctly loaded:

```typescript
// Check that the key pair is valid
console.log('Public key:', member.publicKey.toString('hex'));
```

1. Confirm your node's public key is in the pool's Access Control List (ACL) with the required permissions (Read, Write, Replicate, or Admin).

2. Check that the pool ID matches exactly — pool IDs are case-sensitive.

3. If using `PoolShared` encryption mode, ensure the pool encryption key has been distributed to your node via ECIES key wrapping. See [Storage Pools](/docs/walkthroughs/03-storage-pools) for the key distribution workflow.

4. Verify network connectivity to the remote node:

```bash
# Check if the remote node's port is reachable
nc -zv <remote-host> <port>
```

1. Ensure clocks are synchronized between nodes. Authentication tokens may include timestamps, and significant clock skew can cause verification failures.

#### Transaction Conflicts

If transactions abort unexpectedly or you see conflict errors during multi-document operations:

1. Understand the conflict model: BrightDB uses optimistic concurrency. If two transactions modify the same document, the second to commit will fail.

2. Implement retry logic for transient conflicts:

```typescript
import { BrightDb } from '@brightchain/db';

async function withRetry(db: BrightDb, operation: (session: any) => Promise<void>, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = db.startSession();
    try {
      session.startTransaction();
      await operation(session);
      await session.commitTransaction();
      return; // Success
    } catch (err: any) {
      await session.abortTransaction();
      if (attempt === maxRetries) throw err;
      // Brief backoff before retry
      await new Promise(r => setTimeout(r, 100 * attempt));
    }
  }
}
```

1. Keep transactions short. Long-running transactions increase the window for conflicts.

2. Avoid modifying the same documents from multiple concurrent transactions when possible. Design your data model to minimize contention.

3. Check for deadlocks: if two transactions each hold a lock the other needs, both will eventually time out. Restructure operations to acquire locks in a consistent order.

### Step 3: Run Diagnostic Commands

#### Node Health Checks

Verify that your BrightChain node is running and healthy:

```bash
# Check if the node process is running
ps aux | grep brightchain

# Verify the node is listening on the expected port
lsof -i :<node-port>
```

From within your application code, you can check node status programmatically:

```typescript
const status = await node.getStatus();
console.log('Node state:', status.state);
// Expected: 'ONLINE'
console.log('Uptime:', status.uptimeSeconds, 'seconds');
console.log('Connected peers:', status.peerCount);
```

If the node is not in the `ONLINE` state, check the lifecycle state:

- `OFFLINE` — The node has not been started. Call `node.start()`.
- `SCHEDULED_SHUTDOWN` — The node is draining. Wait for it to finish or cancel the shutdown.
- `EMERGENCY_SHUTDOWN` — The node shut down due to an error. Check logs for the root cause.
- `PERMANENTLY_OFFLINE` — The node has been decommissioned. It cannot be restarted.

See [Node Setup](/docs/walkthroughs/02-node-setup) for details on lifecycle states and transitions.

#### Pool Status

Check the health and statistics of a Storage Pool:

```typescript
const stats = await pooledBlockStore.getPoolStats('my-pool');
console.log('Pool ID:', stats.poolId);
console.log('Block count:', stats.blockCount);
console.log('Total size:', stats.totalSizeBytes, 'bytes');
console.log('Encryption mode:', stats.encryptionMode);
console.log('Replication factor:', stats.replicationFactor);
```

Common pool issues:

- **Pool not found** — The pool ID does not exist. Verify the ID is correct and that the pool was created on this node.
- **Replication behind** — The pool has fewer replicas than configured. Run reconciliation to catch up:

```typescript
await reconciliationService.reconcileWithPeer(peerId, {
  poolId: 'my-pool',
  fullSync: false,
});
```

- **Encryption key missing** — The node does not have the pool's shared encryption key. Request key distribution from a pool admin node.

See [Storage Pools](/docs/walkthroughs/03-storage-pools) for pool management details.

#### Block Store Integrity

Verify the integrity of the block store to detect corruption or missing blocks:

```typescript
const integrityReport = await blockStore.verifyIntegrity();
console.log('Total blocks:', integrityReport.totalBlocks);
console.log('Valid blocks:', integrityReport.validBlocks);
console.log('Corrupted blocks:', integrityReport.corruptedBlocks);
console.log('Missing blocks:', integrityReport.missingBlocks);
```

If corrupted or missing blocks are detected:

1. For replicated pools, trigger a full sync from a healthy peer:

```typescript
await reconciliationService.reconcileWithPeer(peerId, {
  poolId: 'affected-pool',
  fullSync: true, // Full sync to replace corrupted blocks
});
```

1. For non-replicated data, check if backups exist. Corrupted blocks in a non-replicated store cannot be recovered without a backup.

2. Investigate the root cause — common causes include:
   - Disk errors (check `dmesg` or system logs)
   - Incomplete writes due to power loss
   - File system corruption

```bash
# Check system logs for disk errors
dmesg | grep -i error

# Verify file system health (unmount first if possible)
fsck /dev/sdX
```

## Troubleshooting

This is the troubleshooting guide itself. If your issue is not covered above, try these general steps:

1. **Check the logs** — Most BrightChain components log to stdout/stderr. Run your process with verbose logging enabled.
2. **Reset the Nx cache** — Many build and test issues are resolved by `npx nx reset`.
3. **Update dependencies** — Run `yarn install` to ensure all packages are up to date with the lockfile.
4. **Search existing issues** — Check the [BrightChain GitHub Issues](https://github.com/Digital-Defiance/BrightChain/issues) for known problems and solutions.
5. **File a new issue** — If none of the above helps, open a GitHub issue with your error message, Node.js version, OS, and steps to reproduce.

## Next Steps

- [Architecture Overview](/docs/walkthroughs/00-architecture-overview) — Understand how BrightChain's layers fit together.
- [Quickstart](/docs/walkthroughs/01-quickstart) — Get a working development environment in 15 minutes.
- [Node Setup](/docs/walkthroughs/02-node-setup) — Configure and start a BrightChain node.
- [Storage Pools](/docs/walkthroughs/03-storage-pools) — Create and manage Storage Pools.
- [BrightDB Usage](/docs/walkthroughs/04-brightdb-usage) — Deep dive into the document database API.
- [Building a dApp](/docs/walkthroughs/05-building-a-dapp) — Build a full-stack decentralized application on BrightStack.
