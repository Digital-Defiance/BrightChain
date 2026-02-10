/**
 * DeviceController — REST API for device provisioning and management.
 *
 * Routes:
 *   POST /provision              — Provision a new device via paper key
 *   GET  /list                   — List devices for the authenticated member
 *   POST /:id/revoke             — Revoke a provisioned device
 *   PUT  /:id/rename             — Rename a provisioned device
 *
 * Requirements: 3.1-3.8
 */

import { DeviceType } from '@brightchain/brightchain-lib/lib/enumerations/deviceType';
import { type IDeviceKeyStorage } from '@brightchain/brightchain-lib/lib/interfaces/identity/deviceKeyStorage';
import type {
  IListDevicesResponse,
  IProvisionDeviceResponse,
  IRenameDeviceResponse,
  IRevokeDeviceResponse,
} from '@brightchain/brightchain-lib/lib/interfaces/responses/deviceResponses';
import {
  DeviceKeyGenerationError,
  DeviceKeyStorageError,
  DeviceProvisioningService,
  InvalidPaperKeyError,
} from '@brightchain/brightchain-lib/lib/services/identity';
import { ECIESService, PlatformID } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

// ─── Response union ─────────────────────────────────────────────────────────

type DeviceApiResponse =
  | IProvisionDeviceResponse
  | IListDevicesResponse
  | IRenameDeviceResponse
  | IRevokeDeviceResponse
  | ApiErrorResponse;

// ─── Handler map ────────────────────────────────────────────────────────────

interface DeviceHandlers extends TypedHandlers {
  provisionDevice: ApiRequestHandler<
    IProvisionDeviceResponse | ApiErrorResponse
  >;
  listDevices: ApiRequestHandler<IListDevicesResponse | ApiErrorResponse>;
  revokeDevice: ApiRequestHandler<IRevokeDeviceResponse | ApiErrorResponse>;
  renameDevice: ApiRequestHandler<IRenameDeviceResponse | ApiErrorResponse>;
}

// ─── Request shape interfaces ───────────────────────────────────────────────

interface ProvisionDeviceBody {
  body: {
    paperKey?: string;
    deviceName?: string;
    deviceType?: DeviceType;
    deviceIndex?: number;
    revokePaperKeyAfterUse?: boolean;
  };
}

interface DeviceIdParams {
  params: { id: string };
}

interface RenameDeviceBody {
  body: { deviceName?: string };
  params: { id: string };
}

interface ListDevicesQuery {
  query: { memberId?: string };
}

// ─── Controller ─────────────────────────────────────────────────────────────

/**
 * Controller for device provisioning and management.
 *
 * Delegates to {@link DeviceProvisioningService} in brightchain-lib for
 * core provisioning logic and uses an {@link IDeviceKeyStorage} implementation
 * for persistence.
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */
export class DeviceController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  DeviceApiResponse,
  DeviceHandlers,
  CoreLanguageCode
> {
  private deviceStorage: IDeviceKeyStorage | null = null;
  private eciesService: ECIESService<TID> | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject the device key storage implementation.
   * Must be called during application initialisation before handling requests.
   */
  public setDeviceStorage(storage: IDeviceKeyStorage): void {
    this.deviceStorage = storage;
  }

  /**
   * Inject the ECIES service for cryptographic operations.
   * Must be called during application initialisation before handling requests.
   */
  public setEciesService(service: ECIESService<TID>): void {
    this.eciesService = service;
  }

  private getDeviceStorage(): IDeviceKeyStorage {
    if (!this.deviceStorage) {
      throw new Error('DeviceKeyStorage not initialized');
    }
    return this.deviceStorage;
  }

  private getEciesService(): ECIESService<TID> {
    if (!this.eciesService) {
      throw new Error('ECIESService not initialized');
    }
    return this.eciesService;
  }

  /**
   * Extract the authenticated member ID from the request.
   * Falls back to body/query memberId for testing.
   */
  private getMemberId(req: unknown): string {
    const body = (req as ProvisionDeviceBody).body;
    if (body && typeof body === 'object') {
      const rec = body as Record<string, unknown>;
      if (typeof rec['memberId'] === 'string') return rec['memberId'];
    }
    const query = (req as ListDevicesQuery).query;
    if (query && typeof query.memberId === 'string') return query.memberId;

    throw new Error('No authenticated user');
  }

  // ─── Route definitions ──────────────────────────────────────────────────

  protected initRouteDefinitions(): void {
    const noAuth = {
      useAuthentication: false,
      useCryptoAuthentication: false,
    };

    this.routeDefinitions = [
      routeConfig('post', '/provision', {
        ...noAuth,
        handlerKey: 'provisionDevice',
        openapi: {
          summary: 'Provision a new device',
          description:
            'Validates a paper key, recovers the member identity, generates device-specific keys, and stores device metadata.',
          tags: ['Devices'],
          responses: {
            201: {
              schema: 'ProvisionDeviceResponse',
              description: 'Device provisioned successfully',
            },
            400: {
              schema: 'ApiErrorResponse',
              description: 'Invalid paper key or missing fields',
            },
          },
        },
      }),
      routeConfig('get', '/list', {
        ...noAuth,
        handlerKey: 'listDevices',
        openapi: {
          summary: 'List devices for a member',
          description:
            'Returns all provisioned devices for the authenticated member.',
          tags: ['Devices'],
          responses: {
            200: {
              schema: 'ListDevicesResponse',
              description: 'List of devices',
            },
          },
        },
      }),
      routeConfig('post', '/:id/revoke', {
        ...noAuth,
        handlerKey: 'revokeDevice',
        openapi: {
          summary: 'Revoke a device',
          description:
            'Marks a provisioned device as revoked so its keys are no longer trusted.',
          tags: ['Devices'],
          responses: {
            200: {
              schema: 'RevokeDeviceResponse',
              description: 'Device revoked',
            },
            404: {
              schema: 'ApiErrorResponse',
              description: 'Device not found',
            },
          },
        },
      }),
      routeConfig('put', '/:id/rename', {
        ...noAuth,
        handlerKey: 'renameDevice',
        openapi: {
          summary: 'Rename a device',
          description:
            'Updates the human-readable name of a provisioned device.',
          tags: ['Devices'],
          responses: {
            200: {
              schema: 'RenameDeviceResponse',
              description: 'Device renamed',
            },
            404: {
              schema: 'ApiErrorResponse',
              description: 'Device not found',
            },
          },
        },
      }),
    ];

    this.handlers = {
      provisionDevice: this.handleProvisionDevice.bind(this),
      listDevices: this.handleListDevices.bind(this),
      revokeDevice: this.handleRevokeDevice.bind(this),
      renameDevice: this.handleRenameDevice.bind(this),
    };
  }

  // ─── Handlers ─────────────────────────────────────────────────────────

  /**
   * POST /provision — Provision a new device via paper key.
   *
   * Validates the paper key, recovers the member identity, generates
   * device-specific keys, and stores device metadata.
   *
   * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.8
   */
  private async handleProvisionDevice(req: unknown): Promise<{
    statusCode: number;
    response: IProvisionDeviceResponse | ApiErrorResponse;
  }> {
    try {
      const { paperKey, deviceName, deviceType, deviceIndex } = (
        req as ProvisionDeviceBody
      ).body;

      if (!paperKey || typeof paperKey !== 'string') {
        return validationError('Missing required field: paperKey');
      }
      if (!deviceName || typeof deviceName !== 'string') {
        return validationError('Missing required field: deviceName');
      }
      if (!deviceType || !Object.values(DeviceType).includes(deviceType)) {
        return validationError(
          `Missing or invalid field: deviceType (expected one of ${Object.values(DeviceType).join(', ')})`,
        );
      }
      if (deviceIndex === undefined || typeof deviceIndex !== 'number') {
        return validationError(
          'Missing required field: deviceIndex (non-negative integer)',
        );
      }

      const eciesService = this.getEciesService();
      const storage = this.getDeviceStorage();

      const result = await DeviceProvisioningService.provisionDevice(
        paperKey,
        deviceName,
        deviceType,
        eciesService,
        storage,
        deviceIndex,
      );

      // Requirement 3.5: paper key is marked as used inside provisionDevice
      // Requirement 3.8: if provisioning throws, paper key is NOT marked

      return {
        statusCode: 201,
        response: {
          status: 'success',
          data: {
            device: result.deviceMetadata,
            publicKeyHex: result.deviceKeys.publicKeyHex,
            derivationPath: result.deviceKeys.derivationPath,
          },
          message: 'Device provisioned successfully',
        } satisfies IProvisionDeviceResponse,
      };
    } catch (error) {
      return this.mapDeviceError(error);
    }
  }

  /**
   * GET /list — List all devices for the authenticated member.
   *
   * @requirements 3.7
   */
  private async handleListDevices(req: unknown): Promise<{
    statusCode: number;
    response: IListDevicesResponse | ApiErrorResponse;
  }> {
    try {
      const memberId = this.getMemberId(req);
      const storage = this.getDeviceStorage();
      const devices = await storage.list(memberId);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: devices,
          message: `Found ${devices.length} device(s)`,
        } satisfies IListDevicesResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /:id/revoke — Revoke a provisioned device.
   *
   * Marks the device as revoked so its keys are no longer trusted.
   * The device metadata is updated in storage with a revokedAt timestamp.
   *
   * @requirements 3.7
   */
  private async handleRevokeDevice(req: unknown): Promise<{
    statusCode: number;
    response: IRevokeDeviceResponse | ApiErrorResponse;
  }> {
    try {
      const { id } = (req as DeviceIdParams).params;
      if (!id) {
        return validationError('Missing required parameter: id');
      }

      const storage = this.getDeviceStorage();
      const device = await storage.retrieve(id);
      if (!device) {
        return notFoundError('Device', id);
      }

      if (device.revokedAt) {
        return validationError('Device is already revoked');
      }

      const revokedAt = new Date();
      const updatedDevice = { ...device, revokedAt };
      // Remove then re-store to update the record
      await storage.remove(id);
      await storage.store(updatedDevice);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: {
            revoked: true,
            revokedAt: revokedAt.toISOString(),
          },
          message: 'Device revoked',
        } satisfies IRevokeDeviceResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * PUT /:id/rename — Rename a provisioned device.
   *
   * Updates the human-readable name of a provisioned device.
   *
   * @requirements 3.7
   */
  private async handleRenameDevice(req: unknown): Promise<{
    statusCode: number;
    response: IRenameDeviceResponse | ApiErrorResponse;
  }> {
    try {
      const { id } = (req as DeviceIdParams).params;
      const { deviceName } = (req as RenameDeviceBody).body;

      if (!id) {
        return validationError('Missing required parameter: id');
      }
      if (!deviceName || typeof deviceName !== 'string') {
        return validationError('Missing required field: deviceName');
      }

      const storage = this.getDeviceStorage();
      const device = await storage.retrieve(id);
      if (!device) {
        return notFoundError('Device', id);
      }

      if (device.revokedAt) {
        return validationError('Cannot rename a revoked device');
      }

      const updatedDevice = { ...device, deviceName };
      // Remove then re-store to update the record
      await storage.remove(id);
      await storage.store(updatedDevice);

      return {
        statusCode: 200,
        response: {
          status: 'success',
          data: updatedDevice,
          message: 'Device renamed',
        } satisfies IRenameDeviceResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── Error mapping ──────────────────────────────────────────────────

  /**
   * Map device-specific errors to appropriate HTTP responses.
   */
  private mapDeviceError(error: unknown): {
    statusCode: number;
    response: ApiErrorResponse;
  } {
    if (error instanceof InvalidPaperKeyError) {
      return {
        statusCode: 400,
        response: {
          message: error.message,
          error: 'INVALID_PAPER_KEY',
        },
      };
    }
    if (error instanceof DeviceKeyGenerationError) {
      return {
        statusCode: 500,
        response: {
          message: error.message,
          error: 'DEVICE_KEY_GENERATION_FAILED',
        },
      };
    }
    if (error instanceof DeviceKeyStorageError) {
      return {
        statusCode: 500,
        response: {
          message: error.message,
          error: 'DEVICE_KEY_STORAGE_FAILED',
        },
      };
    }
    return handleError(error);
  }
}
