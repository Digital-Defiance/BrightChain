/**
 * Express middleware – comprehensive REST API tests.
 *
 * Uses lightweight request/response mocks instead of spinning up a real server.
 * Tests all 16 endpoints, collection access control, error handling,
 * and input validation.
 */

import { HeadRegistry } from '../lib/collection';
import { BrightChainDb } from '../lib/database';
import { createDbRouter, DbRouterOptions } from '../lib/expressMiddleware';
import { MockBlockStore } from './helpers/mockBlockStore';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Lightweight Express mock helpers ──

interface MockResponse {
  statusCode: number;
  body: any;
  status(code: number): MockResponse;
  json(data: any): void;
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
    },
  };
  return res;
}

/**
 * Walk an Express router's route stack to find a matching handler and invoke it.
 *
 * This avoids needing express as a test dependency – we just extract handlers
 * from the router's internal stack and call them directly.
 */
async function routerRequest(
  router: any,
  method: string,
  path: string,
  body?: any,
  query?: Record<string, string>,
): Promise<MockResponse> {
  const res = createMockResponse();

  // Build a minimal Express-like request object
  const req: any = {
    method: method.toUpperCase(),
    path,
    body: body ?? {},
    query: query ?? {},
    params: {},
  };

  // Parse path params from the route pattern
  const routeStack = router.stack as any[];
  for (const layer of routeStack) {
    if (!layer.route) continue;
    const route = layer.route;

    // Check HTTP method
    if (!route.methods[method.toLowerCase()]) continue;

    // Try to match the route path against the request path
    const routePath: string = route.path;
    const paramNames: string[] = [];
    const regexStr = routePath.replace(/:(\w+)/g, (_: string, name: string) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexStr}$`);
    const match = path.match(regex);
    if (!match) continue;

    // Extract params
    paramNames.forEach((name, i) => {
      req.params[name] = match[i + 1];
    });

    // Execute the handler(s) on this route
    for (const routeLayer of route.stack) {
      await routeLayer.handle(req, res, () => {});
    }
    return res;
  }

  // No matching route
  res.statusCode = 404;
  res.body = { error: 'No matching route' };
  return res;
}

// ── Test setup ──

function setupRouter(routerOptions?: DbRouterOptions) {
  const store = new MockBlockStore();
  const registry = HeadRegistry.createIsolated();
  const db = new BrightChainDb(store as any, {
    name: 'apitest',
    headRegistry: registry,
  });
  const router = createDbRouter(db, routerOptions);
  return { db, store, registry, router };
}

// ══════════════════════════════════════════════════════════════
// POST /:collection – Insert one
// ══════════════════════════════════════════════════════════════

describe('POST /:collection – insertOne', () => {
  it('should insert a document and return 201', async () => {
    const { router } = setupRouter();
    const res = await routerRequest(router, 'post', '/users', {
      name: 'Alice',
      age: 30,
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.acknowledged).toBe(true);
    expect(res.body.insertedId).toBeDefined();
  });

  it('should return 409 on duplicate key error', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('users');
    await coll.createIndex({ email: 1 }, { unique: true });
    await coll.insertOne({ email: 'a@b.com' });

    const res = await routerRequest(router, 'post', '/users', {
      email: 'a@b.com',
    });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════
// GET /:collection/:id – Find by ID
// ══════════════════════════════════════════════════════════════

describe('GET /:collection/:id – findById', () => {
  it('should return document by id', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('users');
    await coll.insertOne({ _id: 'u1', name: 'Alice' });

    const res = await routerRequest(router, 'get', '/users/u1');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Alice');
    expect(res.body._id).toBe('u1');
  });

  it('should return 404 for non-existent id', async () => {
    const { router } = setupRouter();
    const res = await routerRequest(router, 'get', '/users/nonexistent');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Document not found');
  });
});

// ══════════════════════════════════════════════════════════════
// GET /:collection – Find with query string
// ══════════════════════════════════════════════════════════════

describe('GET /:collection – find', () => {
  it('should return all documents without filter', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);

    const res = await routerRequest(router, 'get', '/items');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it('should filter by query params', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertMany([
      { color: 'red', v: 1 },
      { color: 'blue', v: 2 },
    ]);

    const res = await routerRequest(router, 'get', '/items', undefined, {
      color: 'red',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].color).toBe('red');
  });

  it('should respect maxResults', async () => {
    const { router, db } = setupRouter({ maxResults: 2 });
    const coll = db.collection('items');
    await coll.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);

    const res = await routerRequest(router, 'get', '/items');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ══════════════════════════════════════════════════════════════
// POST /:collection/find – Rich find
// ══════════════════════════════════════════════════════════════

describe('POST /:collection/find – rich find', () => {
  it('should find with filter, sort, limit', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertMany([
      { n: 3, name: 'C' },
      { n: 1, name: 'A' },
      { n: 2, name: 'B' },
    ]);

    const res = await routerRequest(router, 'post', '/items/find', {
      filter: {},
      sort: { n: 1 },
      limit: 2,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('A');
    expect(res.body[1].name).toBe('B');
  });

  it('should handle empty body', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertOne({ v: 1 });

    const res = await routerRequest(router, 'post', '/items/find');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

// ══════════════════════════════════════════════════════════════
// POST /:collection/aggregate
// ══════════════════════════════════════════════════════════════

describe('POST /:collection/aggregate', () => {
  it('should run an aggregation pipeline', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('sales');
    await coll.insertMany([
      { dept: 'eng', amount: 100 },
      { dept: 'eng', amount: 200 },
      { dept: 'sales', amount: 50 },
    ]);

    const res = await routerRequest(router, 'post', '/sales/aggregate', {
      pipeline: [
        { $group: { _id: '$dept', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ],
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]._id).toBe('eng');
    expect(res.body[0].total).toBe(300);
  });

  it('should return 400 if pipeline is not an array', async () => {
    const { router } = setupRouter();
    const res = await routerRequest(router, 'post', '/items/aggregate', {
      pipeline: 'not-an-array',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('array');
  });
});

// ══════════════════════════════════════════════════════════════
// POST /:collection/insertMany
// ══════════════════════════════════════════════════════════════

describe('POST /:collection/insertMany', () => {
  it('should insert multiple documents', async () => {
    const { router } = setupRouter();
    const res = await routerRequest(router, 'post', '/items/insertMany', {
      documents: [{ v: 1 }, { v: 2 }, { v: 3 }],
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.insertedCount).toBe(3);
  });

  it('should return 400 if documents is not an array', async () => {
    const { router } = setupRouter();
    const res = await routerRequest(router, 'post', '/items/insertMany', {
      documents: 'not-an-array',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('array');
  });
});

// ══════════════════════════════════════════════════════════════
// POST /:collection/updateMany
// ══════════════════════════════════════════════════════════════

describe('POST /:collection/updateMany', () => {
  it('should update all matching documents', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertMany([
      { _id: 'a', type: 'x', marked: false },
      { _id: 'b', type: 'x', marked: false },
      { _id: 'c', type: 'y', marked: false },
    ]);

    const res = await routerRequest(router, 'post', '/items/updateMany', {
      filter: { type: 'x' },
      update: { $set: { marked: true } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.matchedCount).toBe(2);
    expect(res.body.modifiedCount).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════
// POST /:collection/deleteMany
// ══════════════════════════════════════════════════════════════

describe('POST /:collection/deleteMany', () => {
  it('should delete matching documents', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertMany([
      { _id: 'a', type: 'keep' },
      { _id: 'b', type: 'remove' },
      { _id: 'c', type: 'remove' },
    ]);

    const res = await routerRequest(router, 'post', '/items/deleteMany', {
      filter: { type: 'remove' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.deletedCount).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════
// POST /:collection/count
// ══════════════════════════════════════════════════════════════

describe('POST /:collection/count', () => {
  it('should count documents', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertMany([{ v: 1 }, { v: 2 }, { v: 3 }]);

    const res = await routerRequest(router, 'post', '/items/count', {
      filter: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(3);
  });

  it('should count with filter', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertMany([{ type: 'a' }, { type: 'a' }, { type: 'b' }]);

    const res = await routerRequest(router, 'post', '/items/count', {
      filter: { type: 'a' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════
// POST /:collection/distinct
// ══════════════════════════════════════════════════════════════

describe('POST /:collection/distinct', () => {
  it('should return distinct values', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertMany([
      { color: 'red' },
      { color: 'blue' },
      { color: 'red' },
    ]);

    const res = await routerRequest(router, 'post', '/items/distinct', {
      field: 'color',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.values).toHaveLength(2);
    expect(new Set(res.body.values)).toEqual(new Set(['red', 'blue']));
  });

  it('should return 400 if field is missing', async () => {
    const { router } = setupRouter();
    const res = await routerRequest(router, 'post', '/items/distinct', {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('field');
  });
});

// ══════════════════════════════════════════════════════════════
// Index endpoints
// ══════════════════════════════════════════════════════════════

describe('Index endpoints', () => {
  it('GET /:collection/indexes – should list indexes', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.createIndex({ name: 1 });

    const res = await routerRequest(router, 'get', '/items/indexes');
    expect(res.statusCode).toBe(200);
    expect(res.body.indexes).toContain('name_1');
  });

  it('POST /:collection/indexes – should create an index', async () => {
    const { router } = setupRouter();
    const res = await routerRequest(router, 'post', '/items/indexes', {
      spec: { name: 1 },
      options: { unique: true },
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('name_1');
  });

  it('POST /:collection/indexes – should return 400 on invalid spec', async () => {
    const { router } = setupRouter();
    const res = await routerRequest(router, 'post', '/items/indexes', {
      spec: null,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('spec');
  });

  it('DELETE /:collection/indexes/:name – should drop index', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.createIndex({ name: 1 });

    const res = await routerRequest(router, 'delete', '/items/indexes/name_1');
    expect(res.statusCode).toBe(200);
    expect(res.body.acknowledged).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// PUT /:collection/:id – Replace document
// ══════════════════════════════════════════════════════════════

describe('PUT /:collection/:id – replaceOne', () => {
  it('should replace an existing document', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertOne({ _id: 'r1', name: 'Old', extra: true });

    const res = await routerRequest(router, 'put', '/items/r1', {
      name: 'New',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.matchedCount).toBe(1);

    const doc = await coll.findById('r1');
    expect(doc!['name']).toBe('New');
    expect(doc!['extra']).toBeUndefined();
  });

  it('should return 404 for non-existent document', async () => {
    const { router } = setupRouter();
    const res = await routerRequest(router, 'put', '/items/nope', {
      name: 'X',
    });
    expect(res.statusCode).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════
// PATCH /:collection/:id – Update document
// ══════════════════════════════════════════════════════════════

describe('PATCH /:collection/:id – updateOne', () => {
  it('should update an existing document', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertOne({ _id: 'p1', name: 'Alice', age: 30 });

    const res = await routerRequest(router, 'patch', '/items/p1', {
      $set: { age: 31 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.matchedCount).toBe(1);

    const doc = await coll.findById('p1');
    expect(doc!['age']).toBe(31);
  });

  it('should return 404 for non-existent document', async () => {
    const { router } = setupRouter();
    const res = await routerRequest(router, 'patch', '/items/nope', {
      $set: { x: 1 },
    });
    expect(res.statusCode).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════
// DELETE /:collection/:id – Delete document
// ══════════════════════════════════════════════════════════════

describe('DELETE /:collection/:id – deleteOne', () => {
  it('should delete an existing document', async () => {
    const { router, db } = setupRouter();
    const coll = db.collection('items');
    await coll.insertOne({ _id: 'del1', name: 'ToDelete' });

    const res = await routerRequest(router, 'delete', '/items/del1');
    expect(res.statusCode).toBe(200);
    expect(res.body.deletedCount).toBe(1);
  });

  it('should return 404 for non-existent document', async () => {
    const { router } = setupRouter();
    const res = await routerRequest(router, 'delete', '/items/nope');
    expect(res.statusCode).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════
// Collection access control
// ══════════════════════════════════════════════════════════════

describe('Collection access control', () => {
  it('should block access to non-allowed collections', async () => {
    const { router } = setupRouter({
      allowedCollections: ['users', 'orders'],
    });

    const res = await routerRequest(router, 'get', '/secrets');
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain('not allowed');
  });

  it('should allow access to allowed collections', async () => {
    const { router, db } = setupRouter({
      allowedCollections: ['users'],
    });
    const coll = db.collection('users');
    await coll.insertOne({ name: 'Alice' });

    const res = await routerRequest(router, 'get', '/users');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('should apply access control across all operations', async () => {
    const { router } = setupRouter({
      allowedCollections: ['users'],
    });

    // POST to blocked collection
    const postRes = await routerRequest(router, 'post', '/forbidden', {
      v: 1,
    });
    expect(postRes.statusCode).toBe(403);

    // GET by ID on blocked collection
    const getRes = await routerRequest(router, 'get', '/forbidden/some-id');
    expect(getRes.statusCode).toBe(403);

    // DELETE on blocked collection
    const delRes = await routerRequest(router, 'delete', '/forbidden/some-id');
    expect(delRes.statusCode).toBe(403);
  });
});
