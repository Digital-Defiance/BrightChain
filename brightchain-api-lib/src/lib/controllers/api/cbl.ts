/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BlockSize,
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
  DurabilityLevel,
  StoreError,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode, HandleableError } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { RouteConfig } from '@digitaldefiance/node-express-suite';
import { Request } from 'express';
import { body, query } from 'express-validator';
import { IBrightChainApplication } from '../../interfaces';
import { DefaultBackendIdType } from '../../shared-types';
import { DiskBlockAsyncStore } from '../../stores';
import { BaseController } from '../base';

/**
 * Request body for storing a CBL with whitening
 */
interface StoreCBLRequest extends Record<string, unknown> {
  cblData: string; // Base64 encoded CBL
  durabilityLevel?: string; // Optional: 'ephemeral', 'standard', 'enhanced', 'maximum'
  isEncrypted?: boolean; // Optional: flag indicating CBL is encrypted
}

/**
 * Type guard for StoreCBLRequest
 */
function isStoreCBLRequest(
  body: Record<string, unknown>,
): body is StoreCBLRequest {
  return (
    typeof body['cblData'] === 'string' &&
    (body['durabilityLevel'] === undefined ||
      typeof body['durabilityLevel'] === 'string') &&
    (body['isEncrypted'] === undefined ||
      typeof body['isEncrypted'] === 'boolean')
  );
}

/**
 * Response for storing a CBL with whitening
 */
interface StoreCBLResponse {
  success: boolean;
  message: string;
  data: CBLStorageResult;
}

/**
 * Response for retrieving a CBL
 */
interface RetrieveCBLResponse {
  success: boolean;
  message: string;
  data: {
    cblData: string; // Base64 encoded CBL
    isEncrypted: boolean;
  };
}

/**
 * Handler keys for the CBL controller
 */
interface CBLHandlers {
  storeCBL: string;
  retrieveCBL: string;
}

/**
 * Controller for CBL (Constituent Block List) whitening operations.
 *
 * Implements the OFFS (Owner-Free File System) model for storing and retrieving
 * CBLs with XOR whitening. CBLs are stored by splitting them into two blocks,
 * XORing each with random whitener blocks, and generating a magnet URL for retrieval.
 *
 * ## Endpoints
 *
 * ### POST /api/cbl/store
 * Store a CBL with XOR whitening.
 *
 * **Request Body:**
 * - `cblData` (string, required): Base64 encoded CBL data
 * - `durabilityLevel` (string, optional): 'ephemeral', 'standard', 'enhanced', 'maximum'
 * - `isEncrypted` (boolean, optional): Flag indicating CBL is already encrypted
 *
 * **Response:** Block IDs, magnet URL, and storage metadata
 *
 * ### GET /api/cbl/retrieve
 * Retrieve and reconstruct a CBL from its whitened blocks.
 *
 * **Query Parameters:**
 * - `magnetUrl` (string, optional): Full magnet URL from store response
 * - `b1`, `b2` (string, optional): Block IDs (alternative to magnetUrl)
 * - `p1`, `p2` (string, optional): Parity block IDs for recovery
 *
 * **Response:** Reconstructed CBL data (base64 encoded)
 */
export class CBLController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<TID, any, CBLHandlers, CoreLanguageCode> {
  private readonly blockStore: DiskBlockAsyncStore;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);

    // Initialize block store from application environment
    const storePath =
      this.application.environment.blockStorePath ?? 'tmp/blockstore';
    const blockSize = (
      this.application.environment.blockStoreBlockSize
        ? this.application.environment.blockStoreBlockSize
        : BlockSize.Medium
    ) as BlockSize;

    this.blockStore = new DiskBlockAsyncStore({ storePath, blockSize });
  }

  /**
   * Initialize route definitions
   */
  protected initRouteDefinitions(): void {
    // Bind handler methods to this instance
    this.handlers = {
      storeCBL: this.storeCBL.bind(this),
      retrieveCBL: this.retrieveCBL.bind(this),
    } as any;

    this.routeDefinitions = [
      {
        method: 'post',
        path: '/store',
        handlerKey: 'storeCBL' as keyof CBLHandlers,
        useAuthentication: false,
        validation: [
          body('cblData')
            .isString()
            .notEmpty()
            .withMessage('cblData is required and must be a non-empty string'),
          body('durabilityLevel')
            .optional()
            .isIn(['ephemeral', 'standard', 'enhanced', 'maximum'])
            .withMessage(
              'durabilityLevel must be one of: ephemeral, standard, enhanced, maximum',
            ),
          body('isEncrypted')
            .optional()
            .isBoolean()
            .withMessage('isEncrypted must be a boolean'),
        ],
      } as RouteConfig<CBLHandlers, CoreLanguageCode>,
      {
        method: 'get',
        path: '/retrieve',
        handlerKey: 'retrieveCBL' as keyof CBLHandlers,
        useAuthentication: false,
        validation: [
          query('magnetUrl')
            .optional()
            .isString()
            .withMessage('magnetUrl must be a string'),
          query('b1').optional().isString().withMessage('b1 must be a string'),
          query('b2').optional().isString().withMessage('b2 must be a string'),
          query('p1').optional().isString().withMessage('p1 must be a string'),
          query('p2').optional().isString().withMessage('p2 must be a string'),
        ],
      } as RouteConfig<CBLHandlers, CoreLanguageCode>,
    ];
  }

  /**
   * Store a CBL with XOR whitening
   * POST /api/cbl/store
   */
  public async storeCBL(_req: Request): Promise<{
    statusCode: number;
    response: StoreCBLResponse;
  }> {
    const body = this.validatedBody;

    if (!isStoreCBLRequest(body)) {
      throw new HandleableError(new Error('Invalid request body format'), {
        statusCode: 400,
      });
    }

    try {
      // Decode CBL data from base64
      const cblBytes = Buffer.from(body.cblData, 'base64');

      // Validate CBL format (must be valid JSON, unless encrypted)
      if (!body.isEncrypted) {
        try {
          JSON.parse(new TextDecoder().decode(cblBytes));
        } catch {
          throw new HandleableError(
            new Error(
              'Invalid CBL format: must be valid JSON (or set isEncrypted=true)',
            ),
            { statusCode: 400 },
          );
        }
      }

      // Build storage options
      const options: CBLWhiteningOptions = {
        isEncrypted: body.isEncrypted,
      };

      if (body.durabilityLevel) {
        const durabilityMap: Record<string, DurabilityLevel> = {
          ephemeral: DurabilityLevel.Ephemeral,
          standard: DurabilityLevel.Standard,
          enhanced: DurabilityLevel.HighDurability,
          maximum: DurabilityLevel.HighDurability,
        };
        options.durabilityLevel = durabilityMap[body.durabilityLevel];
      }

      // Store with whitening
      const result = await this.blockStore.storeCBLWithWhitening(
        new Uint8Array(cblBytes),
        options,
      );

      return {
        statusCode: 200,
        response: {
          success: true,
          message: 'CBL stored successfully with whitening',
          data: result,
        },
      };
    } catch (error) {
      if (error instanceof StoreError) {
        throw new HandleableError(error, {
          statusCode: error.message.includes('too large') ? 413 : 500,
        });
      }
      throw error;
    }
  }

  /**
   * Retrieve and reconstruct a CBL
   * GET /api/cbl/retrieve
   */
  public async retrieveCBL(req: Request): Promise<{
    statusCode: number;
    response: RetrieveCBLResponse;
  }> {
    const { magnetUrl, b1, b2, p1, p2 } = req.query as {
      magnetUrl?: string;
      b1?: string;
      b2?: string;
      p1?: string;
      p2?: string;
    };

    let blockId1: string;
    let blockId2: string;
    let block1ParityIds: string[] | undefined;
    let block2ParityIds: string[] | undefined;
    let isEncrypted = false;

    try {
      if (magnetUrl) {
        // Parse magnet URL (includes block size, parity IDs and encryption flag)
        const components: CBLMagnetComponents =
          this.blockStore.parseCBLMagnetUrl(magnetUrl);
        blockId1 = components.blockId1;
        blockId2 = components.blockId2;
        block1ParityIds = components.block1ParityIds;
        block2ParityIds = components.block2ParityIds;
        isEncrypted = components.isEncrypted;
      } else if (b1 && b2) {
        blockId1 = b1;
        blockId2 = b2;
        block1ParityIds = p1?.split(',').filter((id) => id);
        block2ParityIds = p2?.split(',').filter((id) => id);
      } else {
        throw new HandleableError(
          new Error(
            'Either magnetUrl or both b1 and b2 parameters are required',
          ),
          { statusCode: 400 },
        );
      }

      // Retrieve and reconstruct CBL (with parity recovery support)
      const cblData = await this.blockStore.retrieveCBL(
        blockId1,
        blockId2,
        block1ParityIds,
        block2ParityIds,
      );

      return {
        statusCode: 200,
        response: {
          success: true,
          message: 'CBL retrieved successfully',
          data: {
            cblData: Buffer.from(cblData).toString('base64'),
            isEncrypted,
          },
        },
      };
    } catch (error) {
      if (error instanceof StoreError) {
        throw new HandleableError(error, {
          statusCode: error.message.includes('not found') ? 404 : 500,
        });
      }
      if (
        error instanceof Error &&
        error.message.includes('Invalid magnet URL')
      ) {
        throw new HandleableError(error, { statusCode: 400 });
      }
      throw error;
    }
  }
}
