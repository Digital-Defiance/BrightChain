/**
 * Property-Based Tests for Health Endpoints
 *
 * Feature: api-server-operations
 * Property 13: Health Endpoint Response Structure
 * Property 14: Health Endpoint Response Time
 *
 * **Validates: Requirements 6.1, 6.2, 6.4**
 *
 * Property 13: For any server state, GET /api/health SHALL return a response containing
 * status (one of: healthy, degraded, unhealthy, starting), uptime (non-negative number),
 * and timestamp (valid ISO date), and GET /api/health/detailed SHALL additionally include
 * dependency statuses for blockStore, messageService, and webSocketServer.
 *
 * Property 14: For any request to GET /api/health, the response time SHALL be less than 100ms.
 */

import { HealthStatus } from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { IBrightChainApplication } from '../../interfaces';
import {
  IDetailedHealthApiResponse,
  IHealthApiResponse,
} from '../../interfaces/responses';
import { HealthController } from './health';

// Mock application for testing
const createMockApplication = (services: Map<string, unknown> = new Map()) => {
  const mockServices = {
    get: (name: string) => services.get(name),
  };

  return {
    db: {
      connection: {
        readyState: 1,
      },
    },
    environment: {
      mongo: {
        useTransactions: false,
      },
      debug: false,
    },
    constants: {},
    ready: true,
    services: mockServices,
    plugins: {},
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => {},
    start: async () => {},
  } as unknown as IBrightChainApplication;
};

// Type for accessing private handlers
interface HealthControllerHandlers {
  handlers: {
    getHealth: () => Promise<{
      statusCode: number;
      response: IHealthApiResponse;
    }>;
    getDetailedHealth: () => Promise<{
      statusCode: number;
      response: IDetailedHealthApiResponse;
    }>;
  };
}

// Helper to create a controller instance with mocked application
const createTestController = (services: Map<string, unknown> = new Map()) => {
  const mockApp = createMockApplication(services);
  // Reset static state before each test
  HealthController.markReady();
  HealthController.resetStartTime();
  return new HealthController(mockApp as never);
};

describe('Health Endpoint Property Tests', () => {
  beforeEach(() => {
    // Reset static state before each test
    HealthController.markReady();
    HealthController.resetStartTime();
  });

  describe('Property 13: Health Endpoint Response Structure', () => {
    /**
     * Property 13a: Basic health response contains required fields
     *
     * For any server state, GET /api/health SHALL return a response containing
     * status (one of: healthy, degraded, unhealthy, starting), uptime (non-negative number),
     * and timestamp (valid ISO date).
     */
    it('Property 13a: Basic health response contains required fields (status, uptime, timestamp, version)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // isStarting state
          async (isStarting) => {
            // Feature: api-server-operations, Property 13: Health Endpoint Response Structure
            const controller = createTestController();

            if (isStarting) {
              HealthController.markStarting();
            } else {
              HealthController.markReady();
            }

            // Access the handler through reflection
            const handlers = (controller as unknown as HealthControllerHandlers)
              .handlers;
            const result = await handlers.getHealth();

            // Verify status is one of the valid values
            expect([
              HealthStatus.HEALTHY,
              HealthStatus.DEGRADED,
              HealthStatus.UNHEALTHY,
              HealthStatus.STARTING,
            ]).toContain(result.response.status);

            // Verify uptime is a non-negative number
            expect(typeof result.response.uptime).toBe('number');
            expect(result.response.uptime).toBeGreaterThanOrEqual(0);

            // Verify timestamp is a valid ISO date
            expect(typeof result.response.timestamp).toBe('string');
            const timestamp = new Date(result.response.timestamp);
            expect(timestamp.toString()).not.toBe('Invalid Date');
            expect(result.response.timestamp).toMatch(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
            );

            // Verify version is a string
            expect(typeof result.response.version).toBe('string');
            expect(result.response.version.length).toBeGreaterThan(0);

            // Verify status code matches state
            if (isStarting) {
              expect(result.statusCode).toBe(503);
              expect(result.response.status).toBe(HealthStatus.STARTING);
            } else {
              expect(result.statusCode).toBe(200);
              expect(result.response.status).toBe(HealthStatus.HEALTHY);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 13b: Detailed health response includes dependency statuses
     *
     * GET /api/health/detailed SHALL additionally include dependency statuses
     * for blockStore, messageService, and webSocketServer.
     */
    it('Property 13b: Detailed health response includes dependency statuses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // blockStore available
          fc.boolean(), // messageService available
          fc.boolean(), // webSocketServer available
          async (hasBlockStore, hasMessageService, hasWebSocketServer) => {
            // Feature: api-server-operations, Property 13: Health Endpoint Response Structure
            const services = new Map<string, unknown>();
            if (hasBlockStore) services.set('blockStore', {});
            if (hasMessageService) services.set('messageService', {});
            if (hasWebSocketServer) services.set('webSocketServer', {});

            const controller = createTestController(services);
            HealthController.markReady();

            // Access the handler through reflection
            const handlers = (controller as unknown as HealthControllerHandlers)
              .handlers;
            const result = await handlers.getDetailedHealth();

            // Verify dependencies object exists
            expect(result.response.dependencies).toBeDefined();

            // Verify all three dependencies are present
            expect(result.response.dependencies.blockStore).toBeDefined();
            expect(result.response.dependencies.messageService).toBeDefined();
            expect(result.response.dependencies.webSocketServer).toBeDefined();

            // Verify each dependency has required fields
            for (const dep of [
              result.response.dependencies.blockStore,
              result.response.dependencies.messageService,
              result.response.dependencies.webSocketServer,
            ]) {
              expect(typeof dep.name).toBe('string');
              expect([
                HealthStatus.HEALTHY,
                HealthStatus.DEGRADED,
                HealthStatus.UNHEALTHY,
                HealthStatus.STARTING,
              ]).toContain(dep.status);
            }

            // Verify dependency status matches availability
            expect(result.response.dependencies.blockStore.status).toBe(
              hasBlockStore ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
            );
            expect(result.response.dependencies.messageService.status).toBe(
              hasMessageService ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
            );
            expect(result.response.dependencies.webSocketServer.status).toBe(
              hasWebSocketServer
                ? HealthStatus.HEALTHY
                : HealthStatus.UNHEALTHY,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 13c: Starting state returns 503 with starting status
     *
     * When the server is starting, both health endpoints SHALL return
     * 503 status code with "starting" status.
     */
    it('Property 13c: Starting state returns 503 with starting status', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(true), async () => {
          // Feature: api-server-operations, Property 13: Health Endpoint Response Structure
          const controller = createTestController();
          HealthController.markStarting();

          const handlers = (controller as unknown as HealthControllerHandlers)
            .handlers;

          // Test basic health endpoint
          const basicResult = await handlers.getHealth();
          expect(basicResult.statusCode).toBe(503);
          expect(basicResult.response.status).toBe(HealthStatus.STARTING);

          // Test detailed health endpoint
          const detailedResult = await handlers.getDetailedHealth();
          expect(detailedResult.statusCode).toBe(503);
          expect(detailedResult.response.status).toBe(HealthStatus.STARTING);

          // Verify all dependencies show starting status
          expect(detailedResult.response.dependencies.blockStore.status).toBe(
            HealthStatus.STARTING,
          );
          expect(
            detailedResult.response.dependencies.messageService.status,
          ).toBe(HealthStatus.STARTING);
          expect(
            detailedResult.response.dependencies.webSocketServer.status,
          ).toBe(HealthStatus.STARTING);

          return true;
        }),
        { numRuns: 50 },
      );
    });

    /**
     * Property 13d: Critical dependency failure returns 503
     *
     * When blockStore (critical dependency) is unhealthy, the detailed health
     * endpoint SHALL return 503 status code.
     */
    it('Property 13d: Critical dependency failure returns 503', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // messageService available
          fc.boolean(), // webSocketServer available
          async (hasMessageService, hasWebSocketServer) => {
            // Feature: api-server-operations, Property 13: Health Endpoint Response Structure
            // BlockStore is NOT available (critical dependency)
            const services = new Map<string, unknown>();
            if (hasMessageService) services.set('messageService', {});
            if (hasWebSocketServer) services.set('webSocketServer', {});

            const controller = createTestController(services);
            HealthController.markReady();

            const handlers = (controller as unknown as HealthControllerHandlers)
              .handlers;

            const result = await handlers.getDetailedHealth();

            // When blockStore is unhealthy, status code should be 503
            expect(result.statusCode).toBe(503);
            expect(result.response.status).toBe(HealthStatus.UNHEALTHY);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 13e: Non-critical dependency failure returns degraded status
     *
     * When only non-critical dependencies (messageService, webSocketServer) are
     * unhealthy but blockStore is healthy, the status SHALL be degraded with 200.
     */
    it('Property 13e: Non-critical dependency failure returns degraded status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // messageService available
          fc.boolean(), // webSocketServer available
          async (hasMessageService, hasWebSocketServer) => {
            // Feature: api-server-operations, Property 13: Health Endpoint Response Structure
            // BlockStore IS available (critical dependency)
            const services = new Map<string, unknown>();
            services.set('blockStore', {}); // Critical dependency is healthy
            if (hasMessageService) services.set('messageService', {});
            if (hasWebSocketServer) services.set('webSocketServer', {});

            const controller = createTestController(services);
            HealthController.markReady();

            const handlers = (controller as unknown as HealthControllerHandlers)
              .handlers;

            const result = await handlers.getDetailedHealth();

            // Status code should be 200 when critical dependency is healthy
            expect(result.statusCode).toBe(200);

            // Status should be healthy only if all dependencies are healthy
            if (hasMessageService && hasWebSocketServer) {
              expect(result.response.status).toBe(HealthStatus.HEALTHY);
            } else {
              expect(result.response.status).toBe(HealthStatus.DEGRADED);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 14: Health Endpoint Response Time', () => {
    /**
     * Property 14a: Basic health endpoint responds within 100ms
     *
     * For any request to GET /api/health, the response time SHALL be less than 100ms.
     */
    it('Property 14a: Basic health endpoint responds within 100ms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // number of iterations
          async (iterations) => {
            // Feature: api-server-operations, Property 14: Health Endpoint Response Time
            const controller = createTestController();
            HealthController.markReady();

            const handlers = (controller as unknown as HealthControllerHandlers)
              .handlers;

            for (let i = 0; i < iterations; i++) {
              const startTime = Date.now();
              await handlers.getHealth();
              const endTime = Date.now();
              const responseTime = endTime - startTime;

              // Response time should be less than 100ms
              expect(responseTime).toBeLessThan(100);
            }

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 14b: Health endpoint is consistently fast
     *
     * Multiple consecutive calls to the health endpoint SHALL all complete
     * within 100ms, demonstrating consistent performance.
     */
    it('Property 14b: Health endpoint is consistently fast across multiple calls', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(true), async () => {
          // Feature: api-server-operations, Property 14: Health Endpoint Response Time
          const controller = createTestController();
          HealthController.markReady();

          const handlers = (controller as unknown as HealthControllerHandlers)
            .handlers;

          const responseTimes: number[] = [];

          // Make 20 consecutive calls
          for (let i = 0; i < 20; i++) {
            const startTime = Date.now();
            await handlers.getHealth();
            const endTime = Date.now();
            responseTimes.push(endTime - startTime);
          }

          // All response times should be under 100ms
          for (const time of responseTimes) {
            expect(time).toBeLessThan(100);
          }

          // Average response time should be well under 100ms
          const avgTime =
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
          expect(avgTime).toBeLessThan(50);

          return true;
        }),
        { numRuns: 20 },
      );
    });
  });
});
