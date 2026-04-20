/**
 * Bug Condition Exploration Property Test — AdminHub Wrong Collection & Missing getStats
 *
 * Feature: brighthub-admin-post-count
 *
 * This test encodes the EXPECTED (correct) behavior:
 *   1. AdminHubController.handleListPosts queries 'brighthub_posts' (not 'posts')
 *   2. AdminHubController.handleDeletePost queries 'brighthub_posts' (not 'posts')
 *   3. PostService has a callable getStats() method returning { totalPosts, activeUsersLast30Days }
 *
 * On UNFIXED code this test MUST FAIL — failure confirms the bugs exist.
 * After the fix is applied, this test should PASS.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

import fc from 'fast-check';
import { AdminHubController } from '../../lib/controllers/api/adminHub';
import { createPostService, PostService } from '../../lib/services/brighthub/postService';
import { createMockApplication } from '../../lib/services/brighthub/postService.test-helpers';

/* ------------------------------------------------------------------ */
/*  Mock helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Tracks which collection names are accessed via brightDb.collection().
 */
function createTrackingBrightDb() {
  const collectionCalls: string[] = [];

  const mockCollection = {
    countDocuments: async () => 0,
    find: () => ({
      skip: () => ({
        limit: () => ({
          toArray: async () => [],
        }),
      }),
    }),
    updateOne: async () => ({ matchedCount: 0 }),
  };

  const brightDb = {
    collection: (name: string) => {
      collectionCalls.push(name);
      return mockCollection;
    },
  };

  return { brightDb, collectionCalls };
}

/**
 * Creates a minimal mock application whose `services` map contains
 * a tracking BrightDb under the key 'db'.
 */
function createMockAdminApp(brightDb: unknown) {
  const services = new Map<string, unknown>();
  services.set('db', brightDb);

  return {
    services,
    // Satisfy BaseController / IBrightChainApplication shape minimally
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    plugins: {},
    db: undefined,
    getModel: () => ({}),
    getController: () => ({}),
    setController: () => { /* noop */ },
  } as unknown;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('Property 1: Bug Condition — Admin Hub Wrong Collection & Missing getStats', () => {

  /**
   * Property 1a: handleListPosts MUST query the 'brighthub_posts' collection.
   *
   * For any valid pagination parameters, the controller should call
   * brightDb.collection('brighthub_posts') — never 'posts'.
   *
   * Validates: Requirements 1.1, 1.2
   */
  it('handleListPosts queries brighthub_posts collection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),   // page
        fc.integer({ min: 1, max: 100 }),   // limit
        async (page, limit) => {
          const { brightDb, collectionCalls } = createTrackingBrightDb();
          const app = createMockAdminApp(brightDb);

          const controller = new AdminHubController(app as never);
          // Trigger route initialization so handlers are bound
          (controller as unknown as { initRouteDefinitions(): void }).initRouteDefinitions();

          const handler = (controller as unknown as { handlers: { listPosts: (req: unknown) => Promise<unknown> } }).handlers.listPosts;
          await handler({
            query: { page: String(page), limit: String(limit) },
          });

          // The controller MUST have called collection('brighthub_posts')
          expect(collectionCalls).toContain('brighthub_posts');
          // It must NOT have called collection('posts')
          expect(collectionCalls).not.toContain('posts');
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 1b: handleDeletePost MUST query the 'brighthub_posts' collection.
   *
   * For any valid postId, the controller should call
   * brightDb.collection('brighthub_posts') — never 'posts'.
   *
   * Validates: Requirements 1.3
   */
  it('handleDeletePost queries brighthub_posts collection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),  // postId
        async (postId) => {
          const { brightDb, collectionCalls } = createTrackingBrightDb();
          const app = createMockAdminApp(brightDb);

          const controller = new AdminHubController(app as never);
          (controller as unknown as { initRouteDefinitions(): void }).initRouteDefinitions();

          const handler = (controller as unknown as { handlers: { deletePost: (req: unknown) => Promise<unknown> } }).handlers.deletePost;
          await handler({
            params: { postId },
          });

          // The controller MUST have called collection('brighthub_posts')
          expect(collectionCalls).toContain('brighthub_posts');
          // It must NOT have called collection('posts')
          expect(collectionCalls).not.toContain('posts');
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property 1c: PostService MUST have a callable getStats() method
   * that returns { totalPosts: number, activeUsersLast30Days: number }.
   *
   * Validates: Requirements 1.4
   */
  it('PostService has a getStats method returning { totalPosts, activeUsersLast30Days }', async () => {
    const mockApp = createMockApplication();
    const service: PostService = createPostService(mockApp);

    // The method must exist
    expect(typeof (service as unknown as Record<string, unknown>).getStats).toBe('function');

    // Call it and verify the shape
    const stats = await (service as unknown as { getStats(): Promise<{ totalPosts: number; activeUsersLast30Days: number }> }).getStats();
    expect(stats).toHaveProperty('totalPosts');
    expect(stats).toHaveProperty('activeUsersLast30Days');
    expect(typeof stats.totalPosts).toBe('number');
    expect(typeof stats.activeUsersLast30Days).toBe('number');
  });
});
