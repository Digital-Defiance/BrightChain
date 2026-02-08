/* eslint-disable @typescript-eslint/no-explicit-any */
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  IApiMessageResponse,
  IStatusCodeResponse,
  OpenAPIBuilder,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
// Import to trigger schema registration
import '../../openapi/schemas';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

/**
 * OpenAPI specification response
 */
export interface IOpenAPIResponse extends IApiMessageResponse {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  [key: string]: unknown;
}

type DocsApiResponse = IOpenAPIResponse | ApiErrorResponse;

interface DocsHandlers extends TypedHandlers {
  getDocs: ApiRequestHandler<IOpenAPIResponse | ApiErrorResponse>;
}

/**
 * Controller for API documentation endpoint.
 *
 * Provides the OpenAPI specification for the BrightChain API.
 * The specification is built dynamically from registered controllers
 * using their route definitions and OpenAPI metadata.
 *
 * ## Endpoints
 *
 * ### GET /api/docs
 * Returns the OpenAPI specification in JSON format.
 *
 * **Response:**
 * - OpenAPI 3.0.3 specification with all endpoints
 * - Request/response schemas for each endpoint
 * - Authentication requirements per endpoint
 * - Example requests and responses
 *
 * @requirements 10.1, 10.2, 10.3, 10.4
 */
export class DocsController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<TID, DocsApiResponse, DocsHandlers, CoreLanguageCode> {
  private static readonly API_VERSION = '0.13.0';
  private readonly builder: OpenAPIBuilder;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);

    this.builder = new OpenAPIBuilder({
      title: 'BrightChain API',
      version: DocsController.API_VERSION,
      description:
        'REST API for BrightChain distributed storage and messaging system',
      servers: [{ url: '/api', description: 'API server' }],
    });
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        handlerKey: 'getDocs',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Get OpenAPI specification',
          description: 'Returns the OpenAPI specification in JSON format.',
          tags: ['Documentation'],
          responses: {
            200: {
              schema: 'OpenAPISpec',
              description: 'OpenAPI specification',
            },
          },
        },
      }),
    ];

    // Register this controller
    ControllerRegistry.register(
      '/docs',
      'DocsController',
      this.routeDefinitions,
    );

    this.handlers = {
      getDocs: this.handleGetDocs.bind(this),
    };
  }

  /**
   * GET /api/docs
   * Returns the OpenAPI specification in JSON format.
   *
   * @requirements 10.1, 10.2, 10.3, 10.4
   */
  private async handleGetDocs(): Promise<
    IStatusCodeResponse<IOpenAPIResponse | ApiErrorResponse>
  > {
    const spec = this.builder.build();

    return {
      statusCode: 200,
      response: {
        message: 'OpenAPI specification',
        openapi: spec.openapi,
        info: spec.info,
        servers: spec.servers,
        paths: spec.paths,
        components: spec.components,
      },
    };
  }
}
