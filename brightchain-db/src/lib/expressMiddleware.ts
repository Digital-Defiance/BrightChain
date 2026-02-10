/**
 * Express middleware/router for BrightChainDb.
 *
 * Provides a REST API for interacting with the document database:
 *
 *   GET    /:collection                      - Find documents (query params as filter)
 *   GET    /:collection/:id                  - Find document by ID
 *   POST   /:collection                      - Insert one document (body = document)
 *   POST   /:collection/find                 - Find with rich filter (body = { filter, sort, limit, skip, projection })
 *   POST   /:collection/aggregate            - Aggregation pipeline (body = { pipeline })
 *   PUT    /:collection/:id                  - Replace document
 *   PATCH  /:collection/:id                  - Update document (body = update operators)
 *   DELETE /:collection/:id                  - Delete document by ID
 *   POST   /:collection/insertMany           - Bulk insert (body = { documents })
 *   POST   /:collection/updateMany           - Bulk update (body = { filter, update })
 *   POST   /:collection/deleteMany           - Bulk delete (body = { filter })
 *   POST   /:collection/count                - Count documents (body = { filter })
 *   POST   /:collection/distinct             - Distinct values (body = { field, filter })
 *   POST   /:collection/indexes              - Create index (body = { spec, options })
 *   DELETE /:collection/indexes/:name         - Drop index
 *   GET    /:collection/indexes              - List indexes
 *   POST   /:collection/bulkWrite            - Bulk write operations
 *   POST   /:collection/cursor               - Create a server-side cursor
 *   GET    /cursors/:cursorId                 - Fetch next batch from cursor
 *   DELETE /cursors/:cursorId                 - Close a cursor
 */

import type { Request, Response, Router } from 'express';
import { BrightChainDb } from './database';

/**
 * Options for the DB router.
 */
export interface DbRouterOptions {
  /** Restrict access to specific collection names (default: allow all) */
  allowedCollections?: string[];
  /** Maximum response size for find queries (default: 1000) */
  maxResults?: number;
}

/**
 * Create an Express router that provides REST access to a BrightChainDb instance.
 *
 * @param db - The database instance
 * @param options - Router options
 * @returns Express router
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { BrightChainDb, createDbRouter } from '@brightchain/db';
 *
 * const app = express();
 * app.use(express.json());
 *
 * const db = new BrightChainDb(blockStore);
 * app.use('/api/db', createDbRouter(db));
 * ```
 */
export function createDbRouter(
  db: BrightChainDb,
  options?: DbRouterOptions,
): Router {
  // Dynamic import to avoid hard dependency on express at module level
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require('express');
  const router: Router = express.Router();
  const maxResults = options?.maxResults ?? 1000;

  function checkCollection(collectionName: string, res: Response): boolean {
    if (
      options?.allowedCollections &&
      !options.allowedCollections.includes(collectionName)
    ) {
      res
        .status(403)
        .json({ error: `Collection "${collectionName}" is not allowed` });
      return false;
    }
    return true;
  }

  /**
   * Extract a route param as a plain string.
   * Express 5 types declare params values as `string | string[]`;
   * for our named `:param` routes the value is always a string.
   */
  function param(req: Request, name: string): string {
    const v = req.params[name];
    return Array.isArray(v) ? v[0] : v;
  }

  // ── Get next batch from cursor ──
  // (Must be before /:collection/:id to avoid matching 'cursors' as a collection)
  router.get('/cursors/:cursorId', async (req: Request, res: Response) => {
    const cursorId = param(req, 'cursorId');

    try {
      const batch = db.getNextBatch(cursorId);
      if (batch === null) {
        res.status(404).json({ error: 'Cursor not found or expired' });
        return;
      }

      const cursor = db.getCursorSession(cursorId)!;
      const coll = db.collection(cursor.collection);
      const docs = [];
      for (const id of batch) {
        const doc = await coll.findById(id);
        if (doc) docs.push(doc);
      }

      res.json({
        cursorId,
        nextBatch: docs,
        hasMore: cursor.position < cursor.documentIds.length,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Close cursor ──
  // (Must be before /:collection/:id to avoid matching 'cursors' as a collection)
  router.delete('/cursors/:cursorId', (req: Request, res: Response) => {
    const cursorId = param(req, 'cursorId');
    const closed = db.closeCursorSession(cursorId);
    if (!closed) {
      res.status(404).json({ error: 'Cursor not found' });
      return;
    }
    res.json({ acknowledged: true });
  });

  // ── List indexes ──
  router.get('/:collection/indexes', (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const indexes = coll.listIndexes();
      res.json({ indexes });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Find by ID ──
  router.get('/:collection/:id', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    const id = param(req, 'id');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const doc = await coll.findById(id);
      if (!doc) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Find documents (query string filter) ──
  router.get('/:collection', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const filter = parseQueryFilter(req.query as Record<string, string>);
      const docs = await coll.find(filter).limit(maxResults).toArray();
      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Insert one ──
  router.post('/:collection', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const result = await coll.insertOne(req.body);
      res.status(201).json(result);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        res.status(409).json({ error: String(err) });
        return;
      }
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Find with rich filter ──
  router.post('/:collection/find', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const { filter, sort, limit, skip, projection } = req.body ?? {};
      let cursor = coll.find(filter ?? {});
      if (sort) cursor = cursor.sort(sort);
      if (skip) cursor = cursor.skip(skip);
      cursor = cursor.limit(Math.min(limit ?? maxResults, maxResults));
      if (projection) cursor = cursor.project(projection);
      const docs = await cursor.toArray();
      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Aggregation ──
  router.post('/:collection/aggregate', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const { pipeline } = req.body ?? {};
      if (!Array.isArray(pipeline)) {
        res.status(400).json({ error: 'pipeline must be an array' });
        return;
      }
      const result = await coll.aggregate(pipeline);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Insert many ──
  router.post(
    '/:collection/insertMany',
    async (req: Request, res: Response) => {
      const collection = param(req, 'collection');
      if (!checkCollection(collection, res)) return;

      try {
        const coll = db.collection(collection);
        const { documents } = req.body ?? {};
        if (!Array.isArray(documents)) {
          res.status(400).json({ error: 'documents must be an array' });
          return;
        }
        const result = await coll.insertMany(documents);
        res.status(201).json(result);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    },
  );

  // ── Update many ──
  router.post(
    '/:collection/updateMany',
    async (req: Request, res: Response) => {
      const collection = param(req, 'collection');
      if (!checkCollection(collection, res)) return;

      try {
        const coll = db.collection(collection);
        const { filter, update } = req.body ?? {};
        const result = await coll.updateMany(filter ?? {}, update ?? {});
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    },
  );

  // ── Delete many ──
  router.post(
    '/:collection/deleteMany',
    async (req: Request, res: Response) => {
      const collection = param(req, 'collection');
      if (!checkCollection(collection, res)) return;

      try {
        const coll = db.collection(collection);
        const { filter } = req.body ?? {};
        const result = await coll.deleteMany(filter ?? {});
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    },
  );

  // ── Count ──
  router.post('/:collection/count', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const { filter } = req.body ?? {};
      const count = await coll.countDocuments(filter ?? {});
      res.json({ count });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Distinct ──
  router.post('/:collection/distinct', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const { field, filter } = req.body ?? {};
      if (!field) {
        res.status(400).json({ error: 'field is required' });
        return;
      }
      const values = await coll.distinct(field, filter ?? {});
      res.json({ values });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Create index ──
  router.post('/:collection/indexes', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const { spec, options: indexOptions } = req.body ?? {};
      if (!spec || typeof spec !== 'object') {
        res
          .status(400)
          .json({ error: 'spec is required and must be an object' });
        return;
      }
      const name = await coll.createIndex(spec, indexOptions ?? {});
      res.status(201).json({ name });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Drop index ──
  router.delete(
    '/:collection/indexes/:name',
    async (req: Request, res: Response) => {
      const collection = param(req, 'collection');
      const name = param(req, 'name');
      if (!checkCollection(collection, res)) return;

      try {
        const coll = db.collection(collection);
        await coll.dropIndex(name);
        res.json({ acknowledged: true });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    },
  );

  // ── Replace document ──
  router.put('/:collection/:id', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    const id = param(req, 'id');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const result = await coll.replaceOne(
        { _id: id } as unknown as Record<string, unknown>,
        req.body,
      );
      if (result.matchedCount === 0) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Update document ──
  router.patch('/:collection/:id', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    const id = param(req, 'id');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const result = await coll.updateOne(
        { _id: id } as unknown as Record<string, unknown>,
        req.body,
      );
      if (result.matchedCount === 0) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Delete document ──
  router.delete('/:collection/:id', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    const id = param(req, 'id');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const result = await coll.deleteOne({ _id: id } as unknown as Record<
        string,
        unknown
      >);
      if (result.deletedCount === 0) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Bulk write ──
  router.post('/:collection/bulkWrite', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const { operations, ordered } = req.body ?? {};
      if (!Array.isArray(operations)) {
        res.status(400).json({ error: 'operations must be an array' });
        return;
      }
      const result = await coll.bulkWrite(operations, {
        ordered: ordered ?? true,
      });
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.name === 'BulkWriteError') {
        res.status(400).json({
          error: String(err),
          details: (err as Error & { writeErrors?: unknown }).writeErrors,
        });
        return;
      }
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Create server-side cursor ──
  router.post('/:collection/cursor', async (req: Request, res: Response) => {
    const collection = param(req, 'collection');
    if (!checkCollection(collection, res)) return;

    try {
      const coll = db.collection(collection);
      const { filter, sort, projection, batchSize } = req.body ?? {};
      const docs = await coll
        .find(filter ?? {}, { sort, projection })
        .toArray();
      const docIds = docs
        .map((d: { _id?: string }) => d._id)
        .filter((id): id is string => Boolean(id));

      const cursor = db.createCursorSession({
        collection,
        documentIds: docIds,
        position: 0,
        batchSize: Math.min(batchSize ?? 100, maxResults),
        filter: filter ?? {},
        sort,
        projection,
      });

      // Return first batch
      const firstBatch = docIds.slice(0, cursor.batchSize);
      const batchDocs = [];
      for (const id of firstBatch) {
        const doc = await coll.findById(id);
        if (doc) batchDocs.push(doc);
      }
      cursor.position = firstBatch.length;

      res.status(201).json({
        cursorId: cursor.id,
        firstBatch: batchDocs,
        hasMore: cursor.position < docIds.length,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}

// ── Helpers ──

function parseQueryFilter(
  query: Record<string, string>,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    // Skip reserved query params
    if (['limit', 'skip', 'sort', 'projection'].includes(key)) continue;

    // Try to parse JSON values
    try {
      filter[key] = JSON.parse(value);
    } catch {
      filter[key] = value;
    }
  }
  return filter;
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'DuplicateKeyError' || err.message.includes('E11000'))
  );
}
