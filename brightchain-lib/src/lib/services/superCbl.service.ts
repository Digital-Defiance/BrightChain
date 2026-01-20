import { SuperCBLError } from '../errors/superCbl';
import type {
  CBLData,
  CBLv1,
  RegularCBLv2,
  SubCBL,
  SuperCBL,
  SuperCBLConfig,
  SuperCBLCreationResult,
} from '../interfaces/storage/superCbl';
import { JsonCBLCapacityCalculator } from './jsonCblCapacity.service';

/**
 * Parse CBL data from JSON and detect its type.
 *
 * @param json - JSON string or object containing CBL data
 * @returns Parsed CBL data with type information
 *
 * @see Requirements 5.1, 6.5, 6.6
 */
export function parseCBLData(json: string | object): CBLData {
  const data = typeof json === 'string' ? JSON.parse(json) : json;

  // Check version
  if (data.version === 1) {
    return data as CBLv1;
  }

  if (data.version === 2) {
    if (data.type === 'regular') {
      return data as RegularCBLv2;
    } else if (data.type === 'sub-cbl') {
      return data as SubCBL;
    } else if (data.type === 'super-cbl') {
      return data as SuperCBL;
    }
    throw SuperCBLError.invalidCBLType(data.type);
  }

  throw SuperCBLError.invalidFormat(
    `Unsupported CBL version: ${data.version}`,
    { version: data.version },
  );
}

/**
 * Service for creating and managing hierarchical Super CBL structures.
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2
 */
export class SuperCBLService {
  private readonly capacityCalculator: JsonCBLCapacityCalculator;

  constructor() {
    this.capacityCalculator = new JsonCBLCapacityCalculator();
  }

  /**
   * Create a sub-CBL from a partition of block references.
   *
   * @param blocks - Block references for this sub-CBL
   * @param config - Configuration for the CBL
   * @param subCblIndex - Index of this sub-CBL
   * @param totalSubCbls - Total number of sub-CBLs
   * @returns The created sub-CBL
   *
   * @see Requirements 2.1, 2.2, 2.3
   */
  public createSubCBL(
    blocks: string[],
    config: SuperCBLConfig,
    subCblIndex: number,
    totalSubCbls: number,
  ): SubCBL {
    return {
      version: 2,
      type: 'sub-cbl',
      fileName: config.fileName,
      originalSize: config.originalSize,
      blockSize: config.blockSize,
      blockCount: blocks.length,
      blocks,
      subCblIndex,
      totalSubCbls,
    };
  }

  /**
   * Create a Super CBL that references sub-CBLs via magnet URLs.
   *
   * @param subCblMagnetUrls - Magnet URLs for all sub-CBLs
   * @param config - Configuration for the CBL
   * @param totalBlockCount - Total blocks across all sub-CBLs
   * @param depth - Hierarchy depth
   * @returns The created Super CBL
   *
   * @see Requirements 3.1, 3.2, 3.3
   */
  public createSuperCBL(
    subCblMagnetUrls: string[],
    config: SuperCBLConfig,
    totalBlockCount: number,
    depth: number,
  ): SuperCBL {
    return {
      version: 2,
      type: 'super-cbl',
      fileName: config.fileName,
      originalSize: config.originalSize,
      blockSize: config.blockSize,
      totalBlockCount,
      depth,
      subCblCount: subCblMagnetUrls.length,
      subCblMagnetUrls,
    };
  }

  /**
   * Create a hierarchical CBL structure for the given block references.
   * Automatically determines whether to use regular CBL or Super CBL.
   *
   * @param blocks - All block references for the file
   * @param config - Configuration for the CBL
   * @param storeSubCBL - Callback to store a sub-CBL and get its magnet URL
   * @param currentDepth - Current recursion depth (internal use)
   * @returns Result containing the root CBL and all sub-CBLs
   *
   * @see Requirements 2.4, 3.4, 4.1, 4.2
   */
  public async createHierarchicalCBL(
    blocks: string[],
    config: SuperCBLConfig,
    storeSubCBL: (subCbl: SubCBL | SuperCBL) => Promise<string>,
    currentDepth: number = 1,
  ): Promise<SuperCBLCreationResult> {
    const maxDepth = config.maxDepth ?? 10;

    // Check depth limit
    if (currentDepth > maxDepth) {
      throw SuperCBLError.maxDepthExceeded(currentDepth, maxDepth);
    }

    // Check if Super CBL is needed
    const requiresSuperCBL = this.capacityCalculator.requiresSuperCBL(
      blocks.length,
      config.blockSize,
      config.fileName,
      config.originalSize,
    );

    // If regular CBL fits, return it
    if (!requiresSuperCBL) {
      const regularCbl: RegularCBLv2 = {
        version: 2,
        type: 'regular',
        fileName: config.fileName,
        originalSize: config.originalSize,
        blockSize: config.blockSize,
        blockCount: blocks.length,
        blocks,
      };

      return {
        rootCbl: regularCbl,
        subCbls: [],
        depth: 1,
        isSuperCbl: false,
      };
    }

    // Calculate max blocks per sub-CBL
    const maxBlocksPerSubCbl =
      this.capacityCalculator.calculateMaxBlockReferences(
        config.blockSize,
        config.fileName,
        config.originalSize,
        'sub-cbl',
        { subCblIndex: 0, totalSubCbls: 1 },
      );

    // Partition blocks into sub-CBLs
    const subCblCount = Math.ceil(blocks.length / maxBlocksPerSubCbl);
    const subCbls: SubCBL[] = [];
    const subCblMagnetUrls: string[] = [];

    for (let i = 0; i < subCblCount; i++) {
      const start = i * maxBlocksPerSubCbl;
      const end = Math.min(start + maxBlocksPerSubCbl, blocks.length);
      const subCblBlocks = blocks.slice(start, end);

      const subCbl = this.createSubCBL(subCblBlocks, config, i, subCblCount);

      subCbls.push(subCbl);
      const magnetUrl = await storeSubCBL(subCbl);
      subCblMagnetUrls.push(magnetUrl);
    }

    // Check if Super CBL itself fits
    const superCbl = this.createSuperCBL(
      subCblMagnetUrls,
      config,
      blocks.length,
      currentDepth + 1,
    );

    const superCblSize = this.capacityCalculator.calculateCBLSize(superCbl);

    // If Super CBL fits, return it
    if (superCblSize <= config.blockSize) {
      return {
        rootCbl: superCbl,
        subCbls,
        depth: currentDepth + 1,
        isSuperCbl: true,
      };
    }

    // Super CBL doesn't fit - need recursive hierarchy
    // Treat magnet URLs as "blocks" and create another level
    const recursiveResult = await this.createHierarchicalCBL(
      subCblMagnetUrls,
      config,
      storeSubCBL,
      currentDepth + 1,
    );

    return {
      rootCbl: recursiveResult.rootCbl,
      subCbls: [...subCbls, ...recursiveResult.subCbls],
      depth: recursiveResult.depth,
      isSuperCbl: true,
    };
  }

  /**
   * Reconstruct block references from a hierarchical CBL structure.
   * Recursively retrieves sub-CBLs and reassembles block references.
   *
   * @param cblData - The root CBL data
   * @param retrieveSubCBL - Callback to retrieve a sub-CBL by magnet URL
   * @returns Array of all block references in correct order
   *
   * @see Requirements 5.2, 5.3, 5.4, 5.5
   */
  public async reconstructBlockReferences(
    cblData: CBLData,
    retrieveSubCBL: (magnetUrl: string) => Promise<CBLData>,
  ): Promise<string[]> {
    // Handle v1 CBL (backward compatibility)
    if (cblData.version === 1) {
      return cblData.blocks;
    }

    // Handle regular v2 CBL
    if (cblData.type === 'regular') {
      return cblData.blocks;
    }

    // Handle sub-CBL (shouldn't be root, but handle it)
    if (cblData.type === 'sub-cbl') {
      return cblData.blocks;
    }

    // Handle Super CBL - recursively retrieve sub-CBLs
    if (cblData.type === 'super-cbl') {
      const allBlocks: string[] = [];

      for (const magnetUrl of cblData.subCblMagnetUrls) {
        try {
          const subCblData = await retrieveSubCBL(magnetUrl);
          const subBlocks = await this.reconstructBlockReferences(
            subCblData,
            retrieveSubCBL,
          );
          allBlocks.push(...subBlocks);
        } catch (error) {
          throw SuperCBLError.missingSubCBL(
            magnetUrl,
            error instanceof Error ? error : undefined,
          );
        }
      }

      // Validate block count
      if (allBlocks.length !== cblData.totalBlockCount) {
        throw SuperCBLError.blockCountMismatch(
          cblData.totalBlockCount,
          allBlocks.length,
        );
      }

      return allBlocks;
    }

    throw SuperCBLError.invalidCBLType(
      (cblData as { type?: string }).type || 'unknown',
    );
  }
}
