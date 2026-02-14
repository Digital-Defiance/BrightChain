import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// In-memory simulation of a pooled block store.
// The real IPooledBlockStore lives in brightchain-lib and is backed by disk
// (brightchain-db) or memory on the server side.  Because the browser cannot
// import Node.js-specific packages we simulate the core semantics here so the
// demo runs entirely client-side.
// ---------------------------------------------------------------------------

/** Simple SHA-256 hex hash using the Web Crypto API. */
async function sha256Hex(data: Uint8Array): Promise<string> {
  // Copy into a plain ArrayBuffer to satisfy the Web Crypto API's BufferSource type.
  const copy = new Uint8Array(data).buffer as ArrayBuffer;
  const digest = await crypto.subtle.digest('SHA-256', copy);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Minimal in-browser simulation of an IPooledBlockStore.
 *
 * Real pools use namespace-prefixed keys (`${poolId}:${hash}`) so that
 * blocks in different pools are logically isolated even though they share
 * the same physical storage layer.  This simulation mirrors that behaviour
 * with a nested Map<poolId, Map<hash, data>>.
 */
class SimulatedPooledBlockStore {
  private pools = new Map<string, Map<string, Uint8Array>>();

  /** Create a pool (no-op if it already exists). */
  createPool(poolId: string): void {
    if (!this.pools.has(poolId)) {
      this.pools.set(poolId, new Map());
    }
  }

  /** Delete a pool and all its blocks. */
  deletePool(poolId: string): void {
    this.pools.delete(poolId);
  }

  /** Store data in a specific pool, returns the block hash. */
  async putInPool(poolId: string, data: Uint8Array): Promise<string> {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool "${poolId}" does not exist`);
    const hash = await sha256Hex(data);
    pool.set(hash, new Uint8Array(data));
    return hash;
  }

  /** Retrieve block data from a specific pool. */
  getFromPool(poolId: string, hash: string): Uint8Array {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool "${poolId}" does not exist`);
    const data = pool.get(hash);
    if (!data)
      throw new Error(
        `Block ${hash.slice(0, 12)}… not found in pool "${poolId}"`,
      );
    return data;
  }

  /** Check whether a block exists in a specific pool. */
  hasInPool(poolId: string, hash: string): boolean {
    return this.pools.get(poolId)?.has(hash) ?? false;
  }

  /** List all pool IDs. */
  listPools(): string[] {
    return Array.from(this.pools.keys());
  }

  /** List block hashes in a pool. */
  listBlocksInPool(poolId: string): string[] {
    return Array.from(this.pools.get(poolId)?.keys() ?? []);
  }
}

// ---------------------------------------------------------------------------
// Log entry type used by the demo to show a running activity log.
// ---------------------------------------------------------------------------

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StoragePoolsDemo: React.FC = () => {
  const [store] = useState(() => new SimulatedPooledBlockStore());
  const [pools, setPools] = useState<string[]>([]);
  const [newPoolName, setNewPoolName] = useState('');
  const [selectedPool, setSelectedPool] = useState('');
  const [dataInput, setDataInput] = useState('');
  const [queryHash, setQueryHash] = useState('');
  const [queryPool, setQueryPool] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [nextId, setNextId] = useState(1);

  // Helpers ----------------------------------------------------------------

  const addLog = useCallback(
    (message: string, type: LogEntry['type'] = 'info') => {
      setLog((prev) => [
        { id: nextId, timestamp: new Date(), message, type },
        ...prev,
      ]);
      setNextId((n) => n + 1);
    },
    [nextId],
  );

  const refreshPools = useCallback(() => {
    setPools(store.listPools());
  }, [store]);

  // Actions ----------------------------------------------------------------

  const handleCreatePool = useCallback(() => {
    const name = newPoolName.trim();
    if (!name) return;
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name)) {
      addLog(
        `Invalid pool ID "${name}". Must match /^[a-zA-Z0-9_-]{1,64}$/.`,
        'error',
      );
      return;
    }
    if (store.listPools().includes(name)) {
      addLog(`Pool "${name}" already exists.`, 'warning');
      return;
    }
    store.createPool(name);
    addLog(`Created pool "${name}".`, 'success');
    setNewPoolName('');
    refreshPools();
  }, [newPoolName, store, addLog, refreshPools]);

  const handleStoreData = useCallback(async () => {
    if (!selectedPool) {
      addLog('Select a pool first.', 'warning');
      return;
    }
    if (!dataInput.trim()) {
      addLog('Enter some data to store.', 'warning');
      return;
    }
    try {
      const encoded = new TextEncoder().encode(dataInput);
      const hash = await store.putInPool(selectedPool, encoded);
      addLog(
        `Stored "${dataInput}" in pool "${selectedPool}" → hash ${hash.slice(0, 16)}…`,
        'success',
      );
      setDataInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(msg, 'error');
    }
  }, [selectedPool, dataInput, store, addLog]);

  const handleQueryBlock = useCallback(() => {
    if (!queryPool) {
      addLog('Select a pool to query from.', 'warning');
      return;
    }
    if (!queryHash.trim()) {
      addLog('Enter a block hash to query.', 'warning');
      return;
    }
    const hash = queryHash.trim();
    const found = store.hasInPool(queryPool, hash);
    if (found) {
      const data = store.getFromPool(queryPool, hash);
      const text = new TextDecoder().decode(data);
      addLog(
        `✅ Block ${hash.slice(0, 16)}… found in pool "${queryPool}" → "${text}"`,
        'success',
      );
    } else {
      addLog(
        `❌ Block ${hash.slice(0, 16)}… NOT found in pool "${queryPool}". ` +
          'This demonstrates pool isolation — data stored in one pool is invisible from another.',
        'warning',
      );
    }
  }, [queryPool, queryHash, store, addLog]);

  const handleIsolationDemo = useCallback(async () => {
    // Reset for a clean demo
    store.createPool('demo-pool-A');
    store.createPool('demo-pool-B');

    const dataA = new TextEncoder().encode('Secret data in Pool A');
    const hashA = await store.putInPool('demo-pool-A', dataA);

    const dataB = new TextEncoder().encode('Different data in Pool B');
    const hashB = await store.putInPool('demo-pool-B', dataB);

    addLog('--- Pool Isolation Demo ---', 'info');
    addLog(
      `Stored "Secret data in Pool A" in demo-pool-A → ${hashA.slice(0, 16)}…`,
      'success',
    );
    addLog(
      `Stored "Different data in Pool B" in demo-pool-B → ${hashB.slice(0, 16)}…`,
      'success',
    );

    // Cross-query: look for A's data in B
    const foundInB = store.hasInPool('demo-pool-B', hashA);
    addLog(
      `Query demo-pool-B for Pool A's block: ${foundInB ? 'FOUND (unexpected!)' : 'NOT FOUND ✅'}`,
      foundInB ? 'error' : 'success',
    );

    // Cross-query: look for B's data in A
    const foundInA = store.hasInPool('demo-pool-A', hashB);
    addLog(
      `Query demo-pool-A for Pool B's block: ${foundInA ? 'FOUND (unexpected!)' : 'NOT FOUND ✅'}`,
      foundInA ? 'error' : 'success',
    );

    addLog(
      'Isolation confirmed: blocks in one pool are invisible from another pool.',
      'info',
    );
    refreshPools();
  }, [store, addLog, refreshPools]);

  const handleDeletePool = useCallback(
    (poolId: string) => {
      const blocks = store.listBlocksInPool(poolId);
      store.deletePool(poolId);
      addLog(
        `Deleted pool "${poolId}" (${blocks.length} block${blocks.length === 1 ? '' : 's'} removed).`,
        'success',
      );
      if (selectedPool === poolId) setSelectedPool('');
      if (queryPool === poolId) setQueryPool('');
      refreshPools();
    },
    [store, addLog, refreshPools, selectedPool, queryPool],
  );

  // Render -----------------------------------------------------------------

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Storage Pools Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        BrightChain organises blocks into <strong>pools</strong> — lightweight
        namespace prefixes that provide logical isolation without separate
        physical storage. Each pool ID follows the pattern{' '}
        <code>/^[a-zA-Z0-9_-]&#123;1,64&#125;$/</code>. Internally, storage keys
        are formatted as <code>poolId:blockHash</code>, so blocks in different
        pools never collide even though they share the same underlying store.
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        This demo simulates pool operations in the browser using an in-memory
        store. In production, the <code>IPooledBlockStore</code> interface
        (defined in <code>brightchain-lib</code>) is implemented by disk-backed
        stores in <code>brightchain-db</code>.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* ---- Section 1: Pool Creation ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          1. Pool Creation
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Creating a pool registers a new namespace. In the real system this
          calls <code>IPooledBlockStore.bootstrapPool()</code> which also seeds
          the pool with random whitening blocks used for XOR-based Owner Free
          Storage (OFFS).
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Pool ID"
            value={newPoolName}
            onChange={(e) => setNewPoolName(e.target.value)}
            placeholder="my-pool"
            inputProps={{ 'aria-label': 'New pool name' }}
          />
          <Button variant="contained" onClick={handleCreatePool}>
            Create Pool
          </Button>
        </Stack>

        {pools.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Active Pools
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {pools.map((p) => (
                <Chip
                  key={p}
                  label={`${p} (${store.listBlocksInPool(p).length} blocks)`}
                  onDelete={() => handleDeletePool(p)}
                  color={selectedPool === p ? 'primary' : 'default'}
                  onClick={() => setSelectedPool(p)}
                  aria-label={`Select pool ${p}`}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* ---- Section 2: Store Data ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          2. Store Data in a Pool
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Data is stored via <code>putInPool(poolId, data)</code>. The block
          hash (SHA-256 of the content) becomes the block ID, prefixed with the
          pool namespace internally. In production, CBL whitening would XOR the
          data with random blocks from the same pool, ensuring whitening
          material never crosses pool boundaries.
        </Typography>
        {selectedPool ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`Pool: ${selectedPool}`}
              color="primary"
              size="small"
            />
            <TextField
              size="small"
              label="Data to store"
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              placeholder="Hello from this pool!"
              inputProps={{ 'aria-label': 'Data to store in pool' }}
            />
            <Button variant="contained" onClick={handleStoreData}>
              Store
            </Button>
          </Stack>
        ) : (
          <Alert severity="info">
            Create and select a pool above to store data.
          </Alert>
        )}
      </Paper>

      {/* ---- Section 3: Pool Isolation ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          3. Pool Isolation Demo
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Pool isolation means that a block stored in Pool A is <em>not</em>{' '}
          visible when querying Pool B, even if the underlying data is
          identical. This is enforced by the <code>makeStorageKey()</code>{' '}
          function which prefixes every hash with the pool ID. Click below to
          run an automated isolation test.
        </Typography>
        <Button variant="outlined" onClick={handleIsolationDemo}>
          Run Isolation Demo
        </Button>
      </Paper>

      {/* ---- Section 4: Query with Isolation ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          4. Query Data (with Pool Scoping)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Queries are always scoped to a single pool via{' '}
          <code>getFromPool(poolId, hash)</code>. Attempting to retrieve a block
          using a hash that belongs to a different pool will fail — this is the
          core isolation guarantee. Copy a block hash from the log below and try
          querying it from a different pool to see isolation in action.
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <TextField
            size="small"
            label="Pool to query"
            value={queryPool}
            onChange={(e) => setQueryPool(e.target.value)}
            placeholder="demo-pool-A"
            inputProps={{ 'aria-label': 'Pool to query' }}
          />
          <TextField
            size="small"
            label="Block hash"
            value={queryHash}
            onChange={(e) => setQueryHash(e.target.value)}
            placeholder="abc123…"
            sx={{ minWidth: 260 }}
            inputProps={{ 'aria-label': 'Block hash to query' }}
          />
          <Button variant="contained" onClick={handleQueryBlock}>
            Query
          </Button>
        </Stack>
      </Paper>

      {/* ---- Section 5: Pool Deletion ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          5. Pool Deletion
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Deleting a pool removes the namespace and all blocks within it. In
          production, <code>validatePoolDeletion()</code> first checks for
          cross-pool CBL dependencies — if a whitened CBL has XOR components
          spanning multiple pools, the pool cannot be safely deleted until those
          dependencies are resolved. Click the ✕ on any pool chip above to
          delete it.
        </Typography>
        {pools.length === 0 && (
          <Alert severity="info">No pools to delete. Create one above.</Alert>
        )}
        {pools.length > 0 && (
          <List dense>
            {pools.map((p) => {
              const blockCount = store.listBlocksInPool(p).length;
              return (
                <ListItem
                  key={p}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label={`Delete pool ${p}`}
                      onClick={() => handleDeletePool(p)}
                      size="small"
                    >
                      🗑️
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={p}
                    secondary={`${blockCount} block${blockCount === 1 ? '' : 's'}`}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* ---- Activity Log ---- */}
      <Typography variant="h6" gutterBottom>
        Activity Log
      </Typography>
      <Card variant="outlined" sx={{ maxHeight: 320, overflow: 'auto' }}>
        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
          {log.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Perform an action above to see results here.
            </Typography>
          )}
          {log.map((entry) => (
            <Typography
              key={entry.id}
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color:
                  entry.type === 'error'
                    ? 'error.main'
                    : entry.type === 'success'
                      ? 'success.main'
                      : entry.type === 'warning'
                        ? 'warning.main'
                        : 'text.secondary',
                py: 0.25,
              }}
            >
              [{entry.timestamp.toLocaleTimeString()}] {entry.message}
            </Typography>
          ))}
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      {/* ---- How It Works ---- */}
      <Paper
        elevation={0}
        sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}
      >
        <Typography variant="h6" gutterBottom>
          How Storage Pools Work in BrightChain
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Namespace Isolation:</strong> Every block hash is prefixed
          with its pool ID (<code>poolId:hash</code>). Two pools can store
          identical data without collision because the composite key differs.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Pool-Scoped Whitening:</strong> When a CBL (Constituent Block
          List) is stored with XOR whitening, both component blocks are placed
          in the same pool. This is enforced by{' '}
          <code>storeCBLWithWhiteningInPool()</code> on the{' '}
          <code>IPooledBlockStore</code> interface.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Cross-Node Coordination:</strong> Pool events (creation,
          deletion, ACL changes) are propagated via the Gossip Service. The
          Reconciliation Service synchronises block manifests per-pool after
          network partitions heal.
        </Typography>
        <Typography variant="body2">
          <strong>Access Control:</strong> Each pool has an ACL (
          <code>IPoolACL</code>) stored as a signed block. Permissions (Read,
          Write, Replicate, Admin) are checked before every operation. Quorum
          approval from existing admins is required for ACL changes.
        </Typography>
      </Paper>
    </Container>
  );
};
