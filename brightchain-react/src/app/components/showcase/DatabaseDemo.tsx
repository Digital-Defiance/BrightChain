import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Simulated brightchain-db document database.
//
// The real brightchain-db is a Node.js-only document database built on top of
// the block store.  Documents are stored as BSON blocks using copy-on-write:
// updates create new blocks rather than modifying existing ones.  The
// HeadRegistry tracks the latest block for each collection.
//
// Because the browser cannot import Node.js-specific packages we simulate the
// core semantics here so the demo runs entirely client-side.
// ---------------------------------------------------------------------------

/** Simple SHA-256 hex hash using the Web Crypto API. */
async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const copy = new Uint8Array(encoded).buffer as ArrayBuffer;
  const digest = await crypto.subtle.digest('SHA-256', copy);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Simulated document type
// ---------------------------------------------------------------------------

interface SimulatedDocument {
  _id: string;
  _blockId: string;
  _version: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Simulated collection with copy-on-write semantics
// ---------------------------------------------------------------------------

class SimulatedCollection {
  /** Current documents keyed by _id */
  private docs = new Map<string, SimulatedDocument>();
  /** Block history: every write creates a new "block" (copy-on-write) */
  private blockHistory: Array<{
    blockId: string;
    docId: string;
    data: SimulatedDocument;
  }> = [];

  async insert(doc: Record<string, unknown>): Promise<SimulatedDocument> {
    const id =
      (doc['_id'] as string | undefined) ?? crypto.randomUUID().slice(0, 8);
    if (this.docs.has(id)) {
      throw new Error(`Document with _id "${id}" already exists`);
    }
    const blockId = await sha256Hex(
      JSON.stringify({ ...doc, _id: id, _ts: Date.now() }),
    );
    const stored: SimulatedDocument = {
      ...doc,
      _id: id,
      _blockId: blockId.slice(0, 16),
      _version: 1,
    };
    this.docs.set(id, stored);
    this.blockHistory.push({
      blockId: blockId.slice(0, 16),
      docId: id,
      data: { ...stored },
    });
    return stored;
  }

  async update(
    id: string,
    updates: Record<string, unknown>,
  ): Promise<SimulatedDocument> {
    const existing = this.docs.get(id);
    if (!existing) throw new Error(`Document "${id}" not found`);
    const newVersion = existing._version + 1;
    const blockId = await sha256Hex(
      JSON.stringify({
        ...existing,
        ...updates,
        _version: newVersion,
        _ts: Date.now(),
      }),
    );
    const updated: SimulatedDocument = {
      ...existing,
      ...updates,
      _id: id,
      _blockId: blockId.slice(0, 16),
      _version: newVersion,
    };
    // Copy-on-write: old block remains in history, new block is created
    this.docs.set(id, updated);
    this.blockHistory.push({
      blockId: blockId.slice(0, 16),
      docId: id,
      data: { ...updated },
    });
    return updated;
  }

  find(filter?: Record<string, unknown>): SimulatedDocument[] {
    const results: SimulatedDocument[] = [];
    for (const doc of this.docs.values()) {
      if (!filter || matchesFilter(doc, filter)) {
        results.push({ ...doc });
      }
    }
    return results;
  }

  getBlockHistory(): Array<{
    blockId: string;
    docId: string;
    data: SimulatedDocument;
  }> {
    return [...this.blockHistory];
  }

  getDoc(id: string): SimulatedDocument | undefined {
    const doc = this.docs.get(id);
    return doc ? { ...doc } : undefined;
  }

  count(): number {
    return this.docs.size;
  }
}

function matchesFilter(
  doc: SimulatedDocument,
  filter: Record<string, unknown>,
): boolean {
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$gt' || key === '$lt' || key === '$gte' || key === '$lte')
      continue;
    const docVal = doc[key];
    if (typeof value === 'object' && value !== null) {
      const cond = value as Record<string, number>;
      if (typeof docVal !== 'number') return false;
      if (cond['$gt'] !== undefined && docVal <= cond['$gt']) return false;
      if (cond['$lt'] !== undefined && docVal >= cond['$lt']) return false;
      if (cond['$gte'] !== undefined && docVal < cond['$gte']) return false;
      if (cond['$lte'] !== undefined && docVal > cond['$lte']) return false;
    } else if (docVal !== value) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Simulated database with pool isolation
// ---------------------------------------------------------------------------

class SimulatedDatabase {
  private collections = new Map<string, SimulatedCollection>();
  readonly poolId: string;
  readonly dbName: string;

  constructor(dbName: string, poolId: string) {
    this.dbName = dbName;
    this.poolId = poolId;
  }

  collection(name: string): SimulatedCollection {
    if (!this.collections.has(name)) {
      this.collections.set(name, new SimulatedCollection());
    }
    return this.collections.get(name) as SimulatedCollection;
  }

  listCollections(): string[] {
    return Array.from(this.collections.keys());
  }
}

// ---------------------------------------------------------------------------
// Simulated aggregation pipeline
// ---------------------------------------------------------------------------

interface AggregationStage {
  type: '$match' | '$group' | '$sort' | '$project';
  params: Record<string, unknown>;
}

function runAggregation(
  docs: SimulatedDocument[],
  stages: AggregationStage[],
): Record<string, unknown>[] {
  let results: Record<string, unknown>[] = docs.map((d) => ({ ...d }));

  for (const stage of stages) {
    switch (stage.type) {
      case '$match':
        results = results.filter((doc) =>
          matchesFilter(doc as SimulatedDocument, stage.params),
        );
        break;
      case '$group': {
        const groupKey = stage.params['_id'] as string;
        const groups = new Map<string, Record<string, unknown>[]>();
        for (const doc of results) {
          const key = String(doc[groupKey.replace('$', '')] ?? 'null');
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)?.push(doc);
        }
        results = [];
        for (const [key, groupDocs] of groups) {
          const grouped: Record<string, unknown> = { _id: key };
          for (const [field, op] of Object.entries(stage.params)) {
            if (field === '_id') continue;
            const opObj = op as Record<string, string>;
            if (opObj['$sum']) {
              const sumField = opObj['$sum'].replace('$', '');
              grouped[field] = groupDocs.reduce(
                (acc, d) => acc + (Number(d[sumField]) || 0),
                0,
              );
            }
            if (opObj['$avg']) {
              const avgField = opObj['$avg'].replace('$', '');
              const sum = groupDocs.reduce(
                (acc, d) => acc + (Number(d[avgField]) || 0),
                0,
              );
              grouped[field] =
                groupDocs.length > 0 ? sum / groupDocs.length : 0;
            }
            if (opObj['$count']) {
              grouped[field] = groupDocs.length;
            }
          }
          results.push(grouped);
        }
        break;
      }
      case '$sort': {
        const sortField = Object.keys(stage.params)[0];
        const sortDir = stage.params[sortField] === 1 ? 1 : -1;
        results.sort((a, b) => {
          const aVal = a[sortField];
          const bVal = b[sortField];
          if (typeof aVal === 'number' && typeof bVal === 'number')
            return (aVal - bVal) * sortDir;
          return String(aVal).localeCompare(String(bVal)) * sortDir;
        });
        break;
      }
      case '$project': {
        results = results.map((doc) => {
          const projected: Record<string, unknown> = {};
          for (const [field, include] of Object.entries(stage.params)) {
            if (include) projected[field] = doc[field];
          }
          return projected;
        });
        break;
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Log entry type
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

export const DatabaseDemo: React.FC = () => {
  const [db] = useState(() => new SimulatedDatabase('demo-db', 'default-pool'));
  const [log, setLog] = useState<LogEntry[]>([]);
  const [nextId, setNextId] = useState(1);
  const [insertJson, setInsertJson] = useState(
    '{"name": "Alice", "age": 30, "department": "Engineering"}',
  );
  const [queryFilter, setQueryFilter] = useState(
    '{"department": "Engineering"}',
  );
  const [docCount, setDocCount] = useState(0);

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

  const refreshCount = useCallback(() => {
    setDocCount(db.collection('employees').count());
  }, [db]);

  // Actions ----------------------------------------------------------------

  const handlePoolIsolationDemo = useCallback(async () => {
    const dbA = new SimulatedDatabase('hr-db', 'pool-alpha');
    const dbB = new SimulatedDatabase('hr-db', 'pool-beta');

    const colA = dbA.collection('employees');
    const colB = dbB.collection('employees');

    await colA.insert({
      _id: 'emp-1',
      name: 'Alice',
      department: 'Engineering',
    });
    await colB.insert({ _id: 'emp-2', name: 'Bob', department: 'Marketing' });

    addLog('--- Pool Isolation Demo ---', 'info');
    addLog(
      `Created database "hr-db" in pool "pool-alpha" and "pool-beta"`,
      'info',
    );
    addLog(`Inserted Alice into pool-alpha's employees collection`, 'success');
    addLog(`Inserted Bob into pool-beta's employees collection`, 'success');

    const alphaResults = colA.find();
    const betaResults = colB.find();

    addLog(
      `Query pool-alpha employees: ${alphaResults.length} doc(s) → ${alphaResults.map((d) => d['name']).join(', ')}`,
      'success',
    );
    addLog(
      `Query pool-beta employees: ${betaResults.length} doc(s) → ${betaResults.map((d) => d['name']).join(', ')}`,
      'success',
    );
    addLog(
      alphaResults.length === 1 && betaResults.length === 1
        ? "✅ Pool isolation confirmed: each database only sees its own pool's data."
        : '❌ Unexpected: pool isolation may be broken.',
      alphaResults.length === 1 && betaResults.length === 1
        ? 'success'
        : 'error',
    );
  }, [addLog]);

  const handleInsertDocument = useCallback(async () => {
    try {
      const parsed = JSON.parse(insertJson);
      const col = db.collection('employees');
      const doc = await col.insert(parsed);
      addLog(
        `Inserted document _id="${doc._id}" → block ${doc._blockId}… (v${doc._version})`,
        'success',
      );
      refreshCount();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Insert failed: ${msg}`, 'error');
    }
  }, [insertJson, db, addLog, refreshCount]);

  const handleQueryDocuments = useCallback(() => {
    try {
      const filter = queryFilter.trim() ? JSON.parse(queryFilter) : undefined;
      const col = db.collection('employees');
      const results = col.find(filter);
      addLog(`Query returned ${results.length} document(s):`, 'info');
      for (const doc of results) {
        const { _id, _blockId, _version, ...fields } = doc;
        addLog(
          `  _id="${_id}" block=${_blockId}… v${_version} → ${JSON.stringify(fields)}`,
          'success',
        );
      }
      if (results.length === 0) {
        addLog('  No documents matched the filter.', 'warning');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Query failed: ${msg}`, 'error');
    }
  }, [queryFilter, db, addLog]);

  const handleTransactionDemo = useCallback(async () => {
    const col = db.collection('employees');

    // Seed a document if collection is empty
    if (col.count() === 0) {
      await col.insert({
        _id: 'txn-demo',
        name: 'Charlie',
        age: 25,
        department: 'Sales',
      });
    }

    const before = col.getDoc('txn-demo');
    if (!before) {
      addLog(
        'Transaction demo requires a document with _id "txn-demo". Insert one first.',
        'warning',
      );
      return;
    }

    addLog('--- Transaction Demo (Optimistic Concurrency) ---', 'info');
    addLog(
      `Read snapshot: _id="${before._id}" age=${before['age']} block=${before._blockId}… v${before._version}`,
      'info',
    );

    // Simulate optimistic concurrency: read → modify → commit
    const newAge = (Number(before['age']) || 0) + 1;
    addLog(`Applying change: age ${before['age']} → ${newAge}`, 'info');

    const after = await col.update('txn-demo', { age: newAge });
    addLog(
      `Committed: _id="${after._id}" age=${after['age']} → NEW block ${after._blockId}… v${after._version}`,
      'success',
    );
    addLog(
      `Old block ${before._blockId}… remains in history (copy-on-write). New block ${after._blockId}… is now the head.`,
      'success',
    );

    const history = col.getBlockHistory().filter((h) => h.docId === 'txn-demo');
    addLog(
      `Block history for "txn-demo": ${history.length} version(s)`,
      'info',
    );
    for (const h of history) {
      addLog(
        `  block=${h.blockId}… v${h.data._version} age=${h.data['age']}`,
        'info',
      );
    }
    refreshCount();
  }, [db, addLog, refreshCount]);

  const handleAggregationDemo = useCallback(async () => {
    const col = db.collection('employees');

    // Seed sample data if empty
    if (col.count() === 0) {
      await col.insert({
        name: 'Alice',
        age: 30,
        department: 'Engineering',
        salary: 120000,
      });
      await col.insert({
        name: 'Bob',
        age: 28,
        department: 'Engineering',
        salary: 110000,
      });
      await col.insert({
        name: 'Charlie',
        age: 35,
        department: 'Sales',
        salary: 95000,
      });
      await col.insert({
        name: 'Diana',
        age: 32,
        department: 'Sales',
        salary: 98000,
      });
      await col.insert({
        name: 'Eve',
        age: 27,
        department: 'Marketing',
        salary: 85000,
      });
      refreshCount();
    }

    const allDocs = col.find();
    addLog('--- Aggregation Pipeline Demo ---', 'info');
    addLog(
      `Starting with ${allDocs.length} documents in "employees" collection`,
      'info',
    );

    // Pipeline: $match → $group → $sort
    const stages: AggregationStage[] = [
      { type: '$match', params: { salary: { $gte: 90000 } } },
      {
        type: '$group',
        params: {
          _id: '$department',
          avgSalary: { $avg: '$salary' },
          count: { $count: '1' },
          totalSalary: { $sum: '$salary' },
        },
      },
      { type: '$sort', params: { avgSalary: -1 } },
    ];

    addLog('Pipeline stages:', 'info');
    addLog('  1. $match: { salary: { $gte: 90000 } }', 'info');
    addLog(
      '  2. $group: { _id: "$department", avgSalary: { $avg: "$salary" }, count, totalSalary }',
      'info',
    );
    addLog('  3. $sort: { avgSalary: -1 }', 'info');

    const results = runAggregation(allDocs, stages);
    addLog(`Pipeline returned ${results.length} group(s):`, 'success');
    for (const r of results) {
      addLog(
        `  Department: ${r['_id']} | Avg Salary: $${Number(r['avgSalary']).toLocaleString()} | Count: ${r['count']} | Total: $${Number(r['totalSalary']).toLocaleString()}`,
        'success',
      );
    }
  }, [db, addLog, refreshCount]);

  // Render -----------------------------------------------------------------

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Database Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        <strong>brightchain-db</strong> is a document database built on top of
        the block store. Documents are stored as BSON blocks using a{' '}
        <strong>copy-on-write</strong> model: updates create new blocks rather
        than modifying existing ones. The <strong>HeadRegistry</strong> tracks
        the latest block for each collection, and all data is content-addressed
        (block ID = SHA-256 of content).
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        This demo simulates database operations in the browser. In production,{' '}
        <code>brightchain-db</code> runs on Node.js with disk-backed storage via{' '}
        <code>DiskBlockAsyncStore</code>.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* ---- Section 1: Pool Isolation ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          1. Database with Pool Isolation
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Each database can be scoped to a <strong>pool</strong>, providing
          namespace isolation. Two databases with the same name but different
          pool IDs are completely independent — their collections, documents,
          and block storage are isolated. In the real system, pool isolation is
          enforced by <code>PooledStoreAdapter</code> which prefixes all block
          keys with the pool ID.
        </Typography>
        <Button variant="outlined" onClick={handlePoolIsolationDemo}>
          Run Pool Isolation Demo
        </Button>
      </Paper>

      {/* ---- Section 2: Insert Documents ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          2. Insert Documents
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Documents are JSON objects stored as BSON blocks. Each insert creates
          a new content-addressed block (block ID = SHA-256 of the serialized
          document). The collection's head pointer in the HeadRegistry is
          updated to reference the new metadata block. Enter a JSON object below
          to insert it into the "employees" collection.
        </Typography>
        <Stack spacing={1}>
          <TextField
            size="small"
            label="Document JSON"
            value={insertJson}
            onChange={(e) => setInsertJson(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            inputProps={{
              'aria-label': 'Document JSON to insert',
              style: { fontFamily: 'monospace' },
            }}
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="contained" onClick={handleInsertDocument}>
              Insert Document
            </Button>
            {docCount > 0 && (
              <Chip
                label={`${docCount} document(s) in collection`}
                size="small"
                color="primary"
              />
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* ---- Section 3: Query Documents ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          3. Query Documents
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Collections support queries with filtering. In the real system,
          queries can filter by any document field, support comparison operators
          (<code>$gt</code>, <code>$lt</code>, <code>$gte</code>,{' '}
          <code>$lte</code>), and return paginated results. Enter a JSON filter
          below or leave empty to return all documents.
        </Typography>
        <Stack spacing={1}>
          <TextField
            size="small"
            label="Query filter (JSON)"
            value={queryFilter}
            onChange={(e) => setQueryFilter(e.target.value)}
            fullWidth
            inputProps={{
              'aria-label': 'Query filter JSON',
              style: { fontFamily: 'monospace' },
            }}
          />
          <Box>
            <Button variant="contained" onClick={handleQueryDocuments}>
              Run Query
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* ---- Section 4: Transactions ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          4. Transactions (Optimistic Concurrency)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Transactions in brightchain-db use{' '}
          <strong>optimistic concurrency</strong>: read a snapshot of the
          document, apply changes locally, then commit atomically. If another
          writer modified the document between your read and commit, the
          transaction is retried. Because of the copy-on-write model, the old
          version's block remains in the block store — only the HeadRegistry
          pointer advances to the new block.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Click below to simulate a read-modify-write transaction that
          increments an employee's age. Watch the block history grow as each
          update creates a new block.
        </Typography>
        <Button variant="outlined" onClick={handleTransactionDemo}>
          Run Transaction Demo
        </Button>
      </Paper>

      {/* ---- Section 5: Aggregation Pipeline ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          5. Aggregation Pipeline
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          The aggregation pipeline supports operations like <code>$match</code>,{' '}
          <code>$group</code>, <code>$sort</code>, and <code>$project</code>.
          Stages are applied sequentially: each stage transforms the document
          set and passes results to the next stage. This is similar to MongoDB's
          aggregation framework but operates on content-addressed BSON blocks.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Click below to run a sample pipeline that filters employees by salary
          ≥ $90,000, groups by department, computes average salary and count,
          then sorts by average salary descending. Sample data will be seeded if
          the collection is empty.
        </Typography>
        <Button variant="outlined" onClick={handleAggregationDemo}>
          Run Aggregation Pipeline
        </Button>
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
          How brightchain-db Works
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Copy-on-Write Storage:</strong> Every document mutation
          creates a new content-addressed block (block ID = SHA-256 of the
          serialized data). The previous block is never modified or deleted — it
          remains in the block store as an immutable historical record. The
          HeadRegistry simply updates its pointer to the latest block.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>HeadRegistry:</strong> A lightweight registry that maps{' '}
          <code>(dbName, collectionName)</code> pairs to the block ID of the
          latest metadata block. It persists to disk as a JSON file with
          write-through caching and file-level locking for concurrent access
          safety.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Content Addressing:</strong> All data is content-addressed —
          the block ID is the SHA-256 hash of the block's content. This means
          identical data always produces the same block ID, enabling
          deduplication and integrity verification without additional metadata.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Pool Isolation:</strong> Each database can be scoped to a
          storage pool. Pools provide namespace isolation: blocks in different
          pools never collide, and queries are always scoped to a single pool.
          This enables multi-tenant deployments where each tenant's data is
          logically separated.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Transactions:</strong> Optimistic concurrency control reads a
          snapshot, applies changes, and commits atomically. If a conflict is
          detected (another writer modified the same document), the transaction
          is retried. The copy-on-write model makes this natural — the old
          version is never lost.
        </Typography>
        <Typography variant="body2">
          <strong>Aggregation Pipeline:</strong> Supports <code>$match</code>{' '}
          (filter), <code>$group</code> (aggregate by key with <code>$sum</code>
          , <code>$avg</code>, <code>$count</code>), <code>$sort</code> (order
          results), and <code>$project</code> (select fields). Stages are
          composable and executed sequentially, enabling complex analytics on
          document collections.
        </Typography>
      </Paper>

      {/* ---- Copy-on-Write Explainer ---- */}
      <Paper
        elevation={0}
        sx={{ p: 3, mt: 3, bgcolor: 'action.hover', borderRadius: 2 }}
      >
        <Typography variant="h6" gutterBottom>
          The Copy-on-Write Storage Model
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          This is the fundamental storage principle underlying all of
          brightchain-db.
        </Alert>
        <Typography variant="body2" paragraph>
          Traditional databases modify data in place: an UPDATE statement
          overwrites the existing row or document. brightchain-db takes a
          different approach inspired by immutable data structures and
          content-addressed storage.
        </Typography>
        <Typography variant="body2" paragraph>
          When a document is updated, the original block remains untouched in
          the block store. A <em>new</em> block is created containing the
          updated document, and the HeadRegistry pointer advances to this new
          block. The old block is still retrievable by its content hash,
          providing a built-in version history at no extra cost.
        </Typography>
        <Typography variant="body2" paragraph>
          This model provides several benefits: (1){' '}
          <strong>Immutability</strong> — blocks are never modified, eliminating
          corruption from partial writes. (2) <strong>Auditability</strong> —
          the full history of every document is preserved in the block store.
          (3) <strong>Concurrent safety</strong> — readers always see a
          consistent snapshot because they reference a specific block ID. (4){' '}
          <strong>Deduplication</strong> — identical content always maps to the
          same block ID.
        </Typography>
        <Typography variant="body2">
          The trade-off is storage growth: each mutation adds a new block. In
          practice, BrightChain's XOR whitening and FEC (Forward Error
          Correction) mechanisms help manage storage efficiency while
          maintaining the immutability guarantees.
        </Typography>
      </Paper>
    </Container>
  );
};
