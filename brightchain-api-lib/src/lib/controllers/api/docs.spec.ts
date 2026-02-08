/**
 * @fileoverview Unit and integration tests for DocsController
 */

import {
  ControllerRegistry,
  OpenAPISchemaRegistry,
} from '@digitaldefiance/node-express-suite';
import express, { Express } from 'express';
import request from 'supertest';
import { IBrightChainApplication } from '../../interfaces/application';
import { DocsController } from './docs';

// Mock application factory
const createMockApplication = (): IBrightChainApplication<Buffer> => {
  return {
    environment: {
      mongo: { useTransactions: false },
    },
    db: {
      connection: {},
    },
    services: new Map(),
    constants: {},
  } as unknown as IBrightChainApplication<Buffer>;
};

describe('DocsController', () => {
  let app: Express;
  let mockApplication: IBrightChainApplication<Buffer>;
  let controller: DocsController<Buffer>;

  beforeEach(() => {
    ControllerRegistry.clear();
    OpenAPISchemaRegistry.clear();
    mockApplication = createMockApplication();
    app = express();
    app.use(express.json());
  });

  describe('constructor', () => {
    it('should create controller instance', () => {
      controller = new DocsController(mockApplication);
      expect(controller).toBeDefined();
      expect(controller.router).toBeDefined();
    });

    it('should register itself with ControllerRegistry', () => {
      controller = new DocsController(mockApplication);
      expect(ControllerRegistry.has('DocsController')).toBe(true);
    });
  });

  describe('GET /api/docs', () => {
    beforeEach(() => {
      controller = new DocsController(mockApplication);
      app.use('/api/docs', controller.router);
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return OpenAPI 3.0.3 specification', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.openapi).toBe('3.0.3');
    });

    it('should return correct API info', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.info.title).toBe('BrightChain API');
      expect(response.body.info.version).toBe('0.13.0');
      expect(response.body.info.description).toContain('BrightChain');
    });

    it('should return server configuration', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.servers).toBeDefined();
      expect(response.body.servers).toHaveLength(1);
      expect(response.body.servers[0].url).toBe('/api');
    });

    it('should return paths object', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.paths).toBeDefined();
      expect(typeof response.body.paths).toBe('object');
    });

    it('should return components with schemas', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.components).toBeDefined();
      expect(response.body.components.schemas).toBeDefined();
    });

    it('should return components with securitySchemes', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.components.securitySchemes).toBeDefined();
    });

    it('should include message field', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.message).toBe('OpenAPI specification');
    });
  });

  describe('integration with other controllers', () => {
    beforeEach(() => {
      // Register some mock controllers before creating DocsController
      ControllerRegistry.register('/blocks', 'BlocksController', [
        {
          method: 'post',
          path: '/',
          handlerKey: 'storeBlock',
          useAuthentication: true,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Store a block',
            tags: ['Blocks'],
            requestBody: { schema: 'StoreBlockRequest' },
            responses: {
              200: { schema: 'StoreBlockResponse' },
            },
          },
        },
        {
          method: 'get',
          path: '/:blockId',
          handlerKey: 'getBlock',
          useAuthentication: true,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Get block by ID',
            tags: ['Blocks'],
            responses: {
              200: { schema: 'GetBlockResponse' },
              404: { schema: 'ErrorResponse' },
            },
          },
        },
      ]);

      ControllerRegistry.register('/health', 'HealthController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'getHealth',
          useAuthentication: false,
          useCryptoAuthentication: false,
          openapi: {
            summary: 'Basic health check',
            tags: ['Health'],
            responses: {
              200: { schema: 'HealthResponse' },
            },
          },
        },
      ]);

      controller = new DocsController(mockApplication);
      app.use('/api/docs', controller.router);
    });

    it('should include paths from registered controllers', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.paths['/blocks']).toBeDefined();
      expect(response.body.paths['/blocks/{blockId}']).toBeDefined();
      expect(response.body.paths['/health']).toBeDefined();
    });

    it('should include correct HTTP methods', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.paths['/blocks'].post).toBeDefined();
      expect(response.body.paths['/blocks/{blockId}'].get).toBeDefined();
      expect(response.body.paths['/health'].get).toBeDefined();
    });

    it('should include operation summaries', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.paths['/blocks'].post.summary).toBe('Store a block');
      expect(response.body.paths['/blocks/{blockId}'].get.summary).toBe(
        'Get block by ID',
      );
    });

    it('should include tags', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.paths['/blocks'].post.tags).toContain('Blocks');
      expect(response.body.paths['/health'].get.tags).toContain('Health');
    });

    it('should include security for authenticated routes', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.paths['/blocks'].post.security).toEqual([
        { bearerAuth: [] },
      ]);
    });

    it('should have empty security for unauthenticated routes', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.paths['/health'].get.security).toEqual([]);
    });

    it('should convert path parameters to OpenAPI format', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      const params = response.body.paths['/blocks/{blockId}'].get.parameters;
      expect(params).toBeDefined();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      expect(params.find((p: any) => p.name === 'blockId')).toBeDefined();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      expect(params.find((p: any) => p.name === 'blockId').in).toBe('path');
    });

    it('should include request body references', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      const requestBody = response.body.paths['/blocks'].post.requestBody;
      expect(requestBody).toBeDefined();
      expect(requestBody.content['application/json'].schema.$ref).toBe(
        '#/components/schemas/StoreBlockRequest',
      );
    });

    it('should include response references', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      const responses = response.body.paths['/blocks'].post.responses;
      expect(responses['200'].content['application/json'].schema.$ref).toBe(
        '#/components/schemas/StoreBlockResponse',
      );
    });

    it('should auto-add 401 response for authenticated routes', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      const responses = response.body.paths['/blocks'].post.responses;
      expect(responses['401']).toBeDefined();
      expect(responses['401'].description).toBe('Unauthorized');
    });
  });

  describe('schema registration', () => {
    beforeEach(() => {
      // Register schemas
      OpenAPISchemaRegistry.registerSchemas({
        StoreBlockRequest: {
          type: 'object',
          properties: { data: { type: 'string' } },
          required: ['data'],
        },
        StoreBlockResponse: {
          type: 'object',
          properties: { blockId: { type: 'string' } },
        },
      });

      OpenAPISchemaRegistry.registerSecurityScheme('bearerAuth', {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });

      controller = new DocsController(mockApplication);
      app.use('/api/docs', controller.router);
    });

    it('should include registered schemas in components', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.components.schemas.StoreBlockRequest).toBeDefined();
      expect(response.body.components.schemas.StoreBlockResponse).toBeDefined();
    });

    it('should include registered security schemes', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(response.body.components.securitySchemes.bearerAuth).toBeDefined();
      expect(response.body.components.securitySchemes.bearerAuth.type).toBe(
        'http',
      );
    });
  });

  describe('OpenAPI spec validation', () => {
    beforeEach(() => {
      controller = new DocsController(mockApplication);
      app.use('/api/docs', controller.router);
    });

    it('should return valid JSON', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    it('should have required OpenAPI fields', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      // Required by OpenAPI 3.0.3
      expect(response.body.openapi).toBeDefined();
      expect(response.body.info).toBeDefined();
      expect(response.body.info.title).toBeDefined();
      expect(response.body.info.version).toBeDefined();
      expect(response.body.paths).toBeDefined();
    });

    it('should have valid version format', async () => {
      const response = await request(app).get('/api/docs').expect(200);

      // OpenAPI version should be semver-like
      expect(response.body.openapi).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
