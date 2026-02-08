import {
  HealthStatus,
  IDependencyStatus,
  IDetailedHealthResponse,
  IHealthResponse,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  IStatusCodeResponse,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

type HealthApiResponse =
  | IHealthResponse
  | IDetailedHealthResponse
  | ApiErrorResponse;

interface IHealthHandlers extends TypedHandlers {
  getHealth: ApiRequestHandler<IHealthResponse | ApiErrorResponse>;
  getDetailedHealth: ApiRequestHandler<
    IDetailedHealthResponse | ApiErrorResponse
  >;
}

/**
 * Controller for health check and status endpoints.
 *
 * Provides REST API endpoints for monitoring the API server health
 * and checking the status of dependencies.
 *
 * ## Endpoints
 *
 * ### GET /api/health
 * Basic health check returning server status, uptime, and version.
 * Response time should be under 100ms.
 *
 * **Response:**
 * - `status` (string): 'healthy' | 'degraded' | 'unhealthy' | 'starting'
 * - `uptime` (number): Server uptime in seconds
 * - `timestamp` (string): ISO timestamp of the response
 * - `version` (string): API version
 *
 * ### GET /api/health/detailed
 * Detailed health check with dependency status.
 * Returns 503 when critical dependencies are unhealthy.
 *
 * **Response:**
 * - All fields from basic health check
 * - `dependencies` (object): Status of each dependency
 *   - `blockStore`: Block storage service status
 *   - `messageService`: Message passing service status
 *   - `webSocketServer`: WebSocket server status
 *
 * @requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class HealthController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  HealthApiResponse,
  IHealthHandlers,
  CoreLanguageCode
> {
  private static readonly VERSION = '0.13.0';
  private static startTime: number = Date.now();
  private static isStarting: boolean = true;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    // Mark as no longer starting after a brief initialization period
    // In production, this would be set when all services are ready
    setTimeout(() => {
      HealthController.isStarting = false;
    }, 100);
  }

  /**
   * Mark the server as fully initialized (no longer starting)
   */
  public static markReady(): void {
    HealthController.isStarting = false;
  }

  /**
   * Mark the server as starting (for testing or restart scenarios)
   */
  public static markStarting(): void {
    HealthController.isStarting = true;
  }

  /**
   * Check if the server is in starting state
   */
  public static isInStartingState(): boolean {
    return HealthController.isStarting;
  }

  /**
   * Reset the start time (for testing)
   */
  public static resetStartTime(): void {
    HealthController.startTime = Date.now();
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        handlerKey: 'getHealth',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Basic health check',
          description:
            'Returns server status, uptime, and version. Response time under 100ms.',
          tags: ['Health'],
          responses: {
            200: {
              schema: 'HealthResponse',
              description: 'Server is healthy',
              example: {
                message: 'OK',
                status: 'healthy',
                uptime: 3600,
                timestamp: '2025-01-16T10:00:00.000Z',
                version: '0.13.0',
              },
            },
            503: {
              schema: 'HealthResponse',
              description: 'Server is starting or unhealthy',
            },
          },
        },
      }),
      routeConfig('get', '/detailed', {
        handlerKey: 'getDetailedHealth',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Detailed health check with dependencies',
          description:
            'Returns status of all dependencies. Returns 503 when critical dependencies are unhealthy.',
          tags: ['Health'],
          responses: {
            200: {
              schema: 'DetailedHealthResponse',
              description: 'Health check completed',
            },
            503: {
              schema: 'DetailedHealthResponse',
              description: 'Critical dependency unhealthy',
            },
          },
        },
      }),
    ];

    // Register with OpenAPI registry
    ControllerRegistry.register(
      '/health',
      'HealthController',
      this.routeDefinitions,
    );

    this.handlers = {
      getHealth: this.handleGetHealth.bind(this),
      getDetailedHealth: this.handleGetDetailedHealth.bind(this),
    };
  }

  /**
   * Calculate server uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - HealthController.startTime) / 1000);
  }

  /**
   * GET /api/health
   * Basic health check returning server status, uptime, timestamp, and version.
   *
   * Returns 503 with "starting" status during initialization.
   * Response time should be under 100ms.
   *
   * @requirements 6.1, 6.4, 6.5
   */
  private async handleGetHealth(): Promise<
    IStatusCodeResponse<IHealthResponse | ApiErrorResponse>
  > {
    // Check if server is still starting
    if (HealthController.isStarting) {
      return {
        statusCode: 503,
        response: {
          message: 'Server is starting',
          status: HealthStatus.STARTING,
          uptime: this.getUptime(),
          timestamp: new Date().toISOString(),
          version: HealthController.VERSION,
        },
      };
    }

    return {
      statusCode: 200,
      response: {
        message: 'OK',
        status: HealthStatus.HEALTHY,
        uptime: this.getUptime(),
        timestamp: new Date().toISOString(),
        version: HealthController.VERSION,
      },
    };
  }

  /**
   * Check the health of a dependency
   */
  private async checkDependencyHealth(
    name: string,
    checkFn: () => Promise<boolean>,
  ): Promise<IDependencyStatus> {
    const startTime = Date.now();
    try {
      const isHealthy = await checkFn();
      const latencyMs = Date.now() - startTime;
      return {
        name,
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        name,
        status: HealthStatus.UNHEALTHY,
        latencyMs,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * GET /api/health/detailed
   * Detailed health check with dependency status.
   *
   * Returns 503 when critical dependencies are unhealthy.
   *
   * @requirements 6.2, 6.3, 6.5
   */
  private async handleGetDetailedHealth(): Promise<
    IStatusCodeResponse<IDetailedHealthResponse | ApiErrorResponse>
  > {
    // Check if server is still starting
    if (HealthController.isStarting) {
      return {
        statusCode: 503,
        response: {
          message: 'Server is starting',
          status: HealthStatus.STARTING,
          uptime: this.getUptime(),
          timestamp: new Date().toISOString(),
          version: HealthController.VERSION,
          dependencies: {
            blockStore: {
              name: 'blockStore',
              status: HealthStatus.STARTING,
              message: 'Server is starting',
            },
            messageService: {
              name: 'messageService',
              status: HealthStatus.STARTING,
              message: 'Server is starting',
            },
            webSocketServer: {
              name: 'webSocketServer',
              status: HealthStatus.STARTING,
              message: 'Server is starting',
            },
          },
        },
      };
    }

    // Check each dependency
    const [blockStoreHealth, messageServiceHealth, webSocketServerHealth] =
      await Promise.all([
        this.checkDependencyHealth('blockStore', async () => {
          // Check if block store service is available
          try {
            const blockStore = this.application.services.get('blockStore');
            return blockStore !== undefined;
          } catch {
            return false;
          }
        }),
        this.checkDependencyHealth('messageService', async () => {
          // Check if message service is available
          try {
            const messageService =
              this.application.services.get('messageService');
            return messageService !== undefined;
          } catch {
            // Message service may not be registered yet, treat as degraded
            return false;
          }
        }),
        this.checkDependencyHealth('webSocketServer', async () => {
          // Check if WebSocket server is available
          try {
            const wsServer = this.application.services.get('webSocketServer');
            return wsServer !== undefined;
          } catch {
            // WebSocket server may not be registered yet, treat as degraded
            return false;
          }
        }),
      ]);

    // Determine overall status based on dependencies
    const allHealthy =
      blockStoreHealth.status === HealthStatus.HEALTHY &&
      messageServiceHealth.status === HealthStatus.HEALTHY &&
      webSocketServerHealth.status === HealthStatus.HEALTHY;

    const anyUnhealthy =
      blockStoreHealth.status === HealthStatus.UNHEALTHY ||
      messageServiceHealth.status === HealthStatus.UNHEALTHY ||
      webSocketServerHealth.status === HealthStatus.UNHEALTHY;

    // Block store is critical - if it's unhealthy, the whole system is unhealthy
    const blockStoreUnhealthy =
      blockStoreHealth.status === HealthStatus.UNHEALTHY;

    let overallStatus: HealthStatus;
    let statusCode: number;
    let statusMessage: string;

    if (blockStoreUnhealthy) {
      overallStatus = HealthStatus.UNHEALTHY;
      statusCode = 503;
      statusMessage = 'Critical dependency unhealthy';
    } else if (anyUnhealthy) {
      overallStatus = HealthStatus.DEGRADED;
      statusCode = 200;
      statusMessage = 'Some dependencies unhealthy';
    } else if (allHealthy) {
      overallStatus = HealthStatus.HEALTHY;
      statusCode = 200;
      statusMessage = 'OK';
    } else {
      overallStatus = HealthStatus.DEGRADED;
      statusCode = 200;
      statusMessage = 'Some dependencies unavailable';
    }

    return {
      statusCode,
      response: {
        message: statusMessage,
        status: overallStatus,
        uptime: this.getUptime(),
        timestamp: new Date().toISOString(),
        version: HealthController.VERSION,
        dependencies: {
          blockStore: blockStoreHealth,
          messageService: messageServiceHealth,
          webSocketServer: webSocketServerHealth,
        },
      },
    };
  }
}
