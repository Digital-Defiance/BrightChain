/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BlockSize,
  CBLService,
  CBLStorageResult,
  ChecksumService,
  DurabilityLevel,
  DurabilityMap,
  RetrieveSCBLResponse,
  ServiceProvider,
  StoreError,
  StoreSCBLResponse,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode, HandleableError } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { RouteConfig } from '@digitaldefiance/node-express-suite';
import { Request } from 'express';
import { body, query } from 'express-validator';
import {
  IBrightChainApplication,
  StoreSCBLRequestBody,
} from '../../interfaces';
import { DefaultBackendIdType } from '../../shared-types';
import { DiskBlockAsyncStore } from '../../stores';
import { BaseController } from '../base';

/**
 * Type guard for StoreSCBLRequest
 */
function isStoreSCBLRequest(
  body: Record<string, unknown>,
): body is StoreSCBLRequestBody {
  return (
    typeof body['data'] === 'string' &&
    (body['durabilityLevel'] === undefined ||
      typeof body['durabilityLevel'] === 'string') &&
    (body['isEncrypted'] === undefined ||
      typeof body['isEncrypted'] === 'boolean')
  );
}

/**
 * Handler keys for the SCBL controller
 */
interface SCBLHandlers {
  storeSCBL: string;
  retrieveSCBL: string;
}

/**
 * Controller for Super CBL (Hierarchical Constituent Block List) operations.
 *
 * Super CBLs enable storage of files larger than a single CBL can reference
 * through recursive sub-CBL structures. This controller provides endpoints
 * for storing and retrieving large files using the Super CBL hierarchy.
 *
 * ## Endpoints
 *
 * ### POST /api/scbl/store
 * Store a large file as a Super CBL hierarchy.
 *
 * **Request Body:**
 * - `data` (string, required): Base64 encoded file data
 * - `durabilityLevel` (string, optional): 'ephemeral', 'standard', 'enhanced', 'maximum'
 * - `isEncrypted` (boolean, optional): Flag indicating data is already encrypted
 *
 * **Response:** magnetUrl and metadata (hierarchyDepth, subCblCount)
 *
 * ### GET /api/scbl/retrieve
 * Retrieve and reconstruct a file from its Super CBL hierarchy.
 *
 * **Query Parameters:**
 * - `magnetUrl` (string, required): Full magnet URL from store response
 *
 * **Response:** Reconstructed file data (base64 encoded)
 *
 * @requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
export class SCBLController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<TID, any, SCBLHandlers, CoreLanguageCode> {
  private readonly blockStore: DiskBlockAsyncStore;
  private readonly cblService: CBLService<TID>;
  private readonly checksumService: ChecksumService;

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
    this.checksumService = new ChecksumService();

    // Initialize CBL service using ServiceProvider
    const serviceProvider = ServiceProvider.getInstance<TID>();
    this.cblService = new CBLService<TID>(
      this.checksumService,
      serviceProvider.eciesService,
      serviceProvider.idProvider,
    );
  }

  /**
   * Initialize route definitions
   */
  protected initRouteDefinitions(): void {
    // Bind handler methods to this instance
    this.handlers = {
      storeSCBL: this.storeSCBL.bind(this),
      retrieveSCBL: this.retrieveSCBL.bind(this),
    } as any;

    this.routeDefinitions = [
      {
        method: 'post',
        path: '/store',
        handlerKey: 'storeSCBL' as keyof SCBLHandlers,
        useAuthentication: false,
        validation: [
          body('data')
            .isString()
            .notEmpty()
            .withMessage('data is required and must be a non-empty string'),
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
      } as RouteConfig<SCBLHandlers, CoreLanguageCode>,
      {
        method: 'get',
        path: '/retrieve',
        handlerKey: 'retrieveSCBL' as keyof SCBLHandlers,
        useAuthentication: false,
        validation: [
          query('magnetUrl')
            .isString()
            .notEmpty()
            .withMessage(
              'magnetUrl is required and must be a non-empty string',
            ),
        ],
      } as RouteConfig<SCBLHandlers, CoreLanguageCode>,
    ];
  }

  /**
   * Calculate the maximum data size that can fit in a single CBL
   * based on the block size and CBL header overhead.
   */
  private getCblThreshold(): number {
    // A CBL can reference multiple blocks, but the CBL itself must fit in a block
    // The threshold is approximately the block size minus header overhead
    // For simplicity, we use a conservative estimate
    const blockSize = this.blockStore.blockSize;
    // CBL header is approximately 200 bytes, each address is 64 bytes
    // A single CBL can reference (blockSize - 200) / 64 blocks
    // Each block can hold blockSize bytes of data
    const maxAddresses = Math.floor((blockSize - 200) / 64);
    return maxAddresses * blockSize;
  }

  /**
   * Store a large file as a Super CBL hierarchy.
   * POST /api/scbl/store
   *
   * @requirements 2.1, 2.3, 2.5
   */
  public async storeSCBL(_req: Request): Promise<{
    statusCode: number;
    response: StoreSCBLResponse;
  }> {
    const body = this.validatedBody;

    if (!isStoreSCBLRequest(body)) {
      throw new HandleableError(new Error('Invalid request body format'), {
        statusCode: 400,
      });
    }

    try {
      // Decode file data from base64
      const fileData = Buffer.from(body.data, 'base64');
      const totalSize = fileData.length;

      // Get durability level
      const durabilityLevel = body.durabilityLevel
        ? DurabilityMap[body.durabilityLevel]
        : DurabilityLevel.Standard;

      // Calculate CBL threshold to determine if we need Super CBL
      const cblThreshold = this.getCblThreshold();

      // If data fits in a single CBL, store it directly
      if (totalSize <= cblThreshold) {
        // Store as a regular CBL with whitening
        const result = await this.blockStore.storeCBLWithWhitening(
          new Uint8Array(fileData),
          {
            durabilityLevel,
            isEncrypted: body.isEncrypted,
          },
        );

        return {
          statusCode: 200,
          response: {
            success: true,
            message: 'File stored successfully as CBL',
            magnetUrl: result.magnetUrl,
            metadata: {
              hierarchyDepth: 0, // No hierarchy, just a single CBL
              subCblCount: 0,
              totalSize,
              rootBlockIds: [result.blockId1, result.blockId2],
            },
          },
        };
      }

      // For larger files, we need to create a Super CBL hierarchy
      // Split data into chunks that fit in individual CBLs
      const chunkSize = cblThreshold;
      const chunks: Buffer[] = [];
      for (let i = 0; i < totalSize; i += chunkSize) {
        chunks.push(fileData.subarray(i, Math.min(i + chunkSize, totalSize)));
      }

      // Store each chunk as a CBL and collect their magnet URLs
      const subCblResults: CBLStorageResult[] = [];
      for (const chunk of chunks) {
        const result = await this.blockStore.storeCBLWithWhitening(
          new Uint8Array(chunk),
          {
            durabilityLevel, // Propagate durability level to sub-CBLs (Requirement 2.5)
            isEncrypted: body.isEncrypted,
          },
        );
        subCblResults.push(result);
      }

      // Create the Super CBL header data containing references to sub-CBLs
      // For now, we store the sub-CBL references as a JSON structure
      // and whitened like a regular CBL
      const superCblData = {
        type: 'super-cbl',
        version: 1,
        subCblCount: subCblResults.length,
        hierarchyDepth: 1,
        totalSize,
        isEncrypted: body.isEncrypted ?? false,
        subCbls: subCblResults.map((r) => ({
          magnetUrl: r.magnetUrl,
          blockId1: r.blockId1,
          blockId2: r.blockId2,
        })),
      };

      const superCblBytes = new TextEncoder().encode(
        JSON.stringify(superCblData),
      );

      // Store the Super CBL manifest with the same durability level
      const rootResult = await this.blockStore.storeCBLWithWhitening(
        superCblBytes,
        {
          durabilityLevel, // Propagate durability level (Requirement 2.5)
          isEncrypted: false, // The manifest itself is not encrypted
        },
      );

      return {
        statusCode: 200,
        response: {
          success: true,
          message: 'File stored successfully as Super CBL',
          magnetUrl: rootResult.magnetUrl,
          metadata: {
            hierarchyDepth: 1,
            subCblCount: subCblResults.length,
            totalSize,
            rootBlockIds: [rootResult.blockId1, rootResult.blockId2],
          },
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
   * Retrieve and reconstruct a file from its Super CBL hierarchy.
   * GET /api/scbl/retrieve
   *
   * @requirements 2.2, 2.4
   */
  public async retrieveSCBL(req: Request): Promise<{
    statusCode: number;
    response: RetrieveSCBLResponse;
  }> {
    const { magnetUrl } = req.query as { magnetUrl: string };

    if (!magnetUrl) {
      throw new HandleableError(
        new Error('magnetUrl query parameter is required'),
        { statusCode: 400 },
      );
    }

    try {
      // Parse the magnet URL to get block IDs
      const components = this.blockStore.parseCBLMagnetUrl(magnetUrl);

      // Retrieve the root CBL data
      const rootData = await this.blockStore.retrieveCBL(
        components.blockId1,
        components.blockId2,
        components.block1ParityIds,
        components.block2ParityIds,
      );

      // Try to parse as Super CBL manifest
      let superCblManifest: {
        type: string;
        version: number;
        subCblCount: number;
        hierarchyDepth: number;
        totalSize: number;
        isEncrypted: boolean;
        subCbls: Array<{
          magnetUrl: string;
          blockId1: string;
          blockId2: string;
        }>;
      } | null = null;

      try {
        const decoded = new TextDecoder().decode(rootData);
        const parsed = JSON.parse(decoded);
        if (parsed.type === 'super-cbl') {
          superCblManifest = parsed;
        }
      } catch {
        // Not a Super CBL manifest, treat as regular CBL data
      }

      // If it's a regular CBL (not a Super CBL), return the data directly
      if (!superCblManifest) {
        return {
          statusCode: 200,
          response: {
            success: true,
            message: 'File retrieved successfully',
            data: Buffer.from(rootData).toString('base64'),
            isEncrypted: components.isEncrypted,
          },
        };
      }

      // Recursively reconstruct file from sub-CBLs
      const chunks: Uint8Array[] = [];

      for (let i = 0; i < superCblManifest.subCbls.length; i++) {
        const subCbl = superCblManifest.subCbls[i];

        try {
          // Parse sub-CBL magnet URL
          const subComponents = this.blockStore.parseCBLMagnetUrl(
            subCbl.magnetUrl,
          );

          // Retrieve sub-CBL data
          const chunkData = await this.blockStore.retrieveCBL(
            subComponents.blockId1,
            subComponents.blockId2,
            subComponents.block1ParityIds,
            subComponents.block2ParityIds,
          );

          chunks.push(chunkData);
        } catch (error) {
          // Handle missing sub-CBL (Requirement 2.4)
          if (
            error instanceof StoreError &&
            error.message.includes('not found')
          ) {
            throw new HandleableError(
              new Error(
                `Sub-CBL ${i + 1} of ${superCblManifest.subCblCount} not found: ${subCbl.magnetUrl}`,
              ),
              { statusCode: 404 },
            );
          }
          throw error;
        }
      }

      // Concatenate all chunks to reconstruct the original file
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const reconstructedData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        reconstructedData.set(chunk, offset);
        offset += chunk.length;
      }

      return {
        statusCode: 200,
        response: {
          success: true,
          message: 'File retrieved successfully from Super CBL',
          data: Buffer.from(reconstructedData).toString('base64'),
          isEncrypted: superCblManifest.isEncrypted,
        },
      };
    } catch (error) {
      if (error instanceof HandleableError) {
        throw error;
      }
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
