import { randomBytes, randomUUID, timingSafeEqual } from 'crypto';

import {
  Checksum,
  ChecksumService,
  DifficultyTier,
  IPoUWConfig,
  IWorkCoordinatorMetrics,
  IWorkResult,
  IWorkUnit,
  WorkUnitOperation,
} from '@brightchain/brightchain-lib';

import { MerkleTreeAssembler } from './merkleTreeAssembler';
import { TokenValidator } from './tokenValidator';
import { WorkQueue } from './workQueue';

/**
 * Tracks an issued work unit that is awaiting verification.
 */
interface IIssuedUnit {
  /** Pre-computed expected result hash (lowercase hex) */
  expectedResult: string;
  /** Whether this unit contributes to a partially-completed tree */
  isPartialTree: boolean;
  /** The full work unit that was issued */
  workUnit: IWorkUnit;
}

/**
 * Default number of synthetic leaves to generate per batch.
 */
const DEFAULT_SYNTHETIC_LEAF_COUNT = 8;

/**
 * Default size of each synthetic leaf data block in bytes.
 */
const DEFAULT_SYNTHETIC_LEAF_SIZE = 256;

/**
 * Manages the lifecycle of work units: generation, issuance, verification,
 * and integration of results into Merkle trees.
 *
 * The coordinator supports two verification strategies:
 * - **Pre-computed answer comparison**: the expected result is computed at
 *   work unit creation time and stored server-side. Verification is a
 *   constant-time comparison (via `crypto.timingSafeEqual`).
 * - **Redundant computation**: the same work unit is issued to multiple
 *   clients and accepted when a quorum of matching results is reached.
 *   (Quorum tracking is handled externally; this class provides the
 *   building blocks.)
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class WorkCoordinator {
  private readonly checksumService: ChecksumService;
  private readonly queue: WorkQueue;
  private readonly assembler: MerkleTreeAssembler;
  private readonly tokenValidator: TokenValidator;
  private readonly config: Pick<
    IPoUWConfig,
    'minQueueDepth' | 'workUnitMaxAgeMs'
  >;

  /** Issued but not yet verified work units, keyed by work unit ID */
  private readonly issuedUnits = new Map<string, IIssuedUnit>();

  /** Metrics counters */
  private treesCompleted = 0;
  private hashesComputedByClients = 0;
  private hashesFailedByClients = 0;

  /**
   * @param checksumService - Service for SHA3-512 hash computation
   * @param queue - Priority queue for pending work units
   * @param assembler - Assembler for partially-constructed Merkle trees
   * @param tokenValidator - Validator for HMAC-signed challenge tokens
   * @param config - Queue configuration (minQueueDepth, workUnitMaxAgeMs)
   */
  constructor(
    checksumService: ChecksumService,
    queue: WorkQueue,
    assembler: MerkleTreeAssembler,
    tokenValidator: TokenValidator,
    config: Pick<IPoUWConfig, 'minQueueDepth' | 'workUnitMaxAgeMs'>,
  ) {
    this.checksumService = checksumService;
    this.queue = queue;
    this.assembler = assembler;
    this.tokenValidator = tokenValidator;
    this.config = config;
  }

  /**
   * Issue a work unit to a client at the given difficulty.
   *
   * 1. Auto-replenish if the queue needs it
   * 2. Dequeue the highest-priority entry
   * 3. Create and encode a challenge token
   * 4. Track the issued unit for later verification
   * 5. Return the work unit with the encoded challenge token
   *
   * @param clientId - The client identifier to bind the challenge to
   * @param difficulty - The difficulty tier for this issuance
   * @returns The issued work unit with an encoded challenge token
   * @throws Error if the queue is empty even after replenishment
   *
   * @see Requirements 2.1, 2.3, 9.1, 9.2
   */
  issueWorkUnit(clientId: string, difficulty: DifficultyTier): IWorkUnit {
    // Auto-replenish when queue depth is low
    if (this.queue.needsReplenishment) {
      this.generateSyntheticWork(this.config.minQueueDepth);
    }

    const entry = this.queue.dequeue();
    if (!entry) {
      throw new Error(
        'Work queue is empty — unable to issue a work unit even after replenishment',
      );
    }

    // Create and encode the challenge token
    const token = this.tokenValidator.createToken(entry.workUnit.id, clientId);
    const encodedToken = this.tokenValidator.encodeToken(token);

    // Build the issued work unit with the challenge token and requested difficulty
    const issuedWorkUnit: IWorkUnit = {
      ...entry.workUnit,
      challengeToken: encodedToken,
      difficulty,
    };

    // Track for verification
    this.issuedUnits.set(entry.workUnit.id, {
      expectedResult: entry.expectedResult,
      isPartialTree: entry.isPartialTree,
      workUnit: issuedWorkUnit,
    });

    return issuedWorkUnit;
  }

  /**
   * Verify a submitted work result using constant-time comparison
   * against the pre-computed expected result.
   *
   * On success the result hash is integrated into the Merkle tree
   * assembler and metrics are updated.
   *
   * @param result - The work result submitted by the client
   * @returns `true` if the result is correct, `false` otherwise
   *
   * @see Requirements 4.1, 4.2, 4.3, 4.5
   */
  verifyResult(result: IWorkResult): boolean {
    const issued = this.issuedUnits.get(result.workUnitId);
    if (!issued) {
      // Unknown work unit — treat as failure
      this.hashesFailedByClients++;
      return false;
    }

    // Constant-time comparison of result hash vs expected result
    const resultBuffer = Buffer.from(result.resultHash, 'hex');
    const expectedBuffer = Buffer.from(issued.expectedResult, 'hex');

    // Guard against length mismatch (timingSafeEqual throws on different lengths)
    if (resultBuffer.length !== expectedBuffer.length) {
      this.hashesFailedByClients++;
      this.issuedUnits.delete(result.workUnitId);
      return false;
    }

    const isMatch = timingSafeEqual(resultBuffer, expectedBuffer);

    if (isMatch) {
      // Integrate the verified result into the Merkle tree assembler
      const workUnit = issued.workUnit;
      try {
        const checksum = Checksum.fromHex(result.resultHash);
        this.assembler.insertNode(
          workUnit.treeId,
          workUnit.treeLevel,
          workUnit.treeIndex,
          checksum,
        );

        // Check if the tree is now complete
        if (this.assembler.isComplete(workUnit.treeId)) {
          this.treesCompleted++;
        }
      } catch {
        // If insertion fails (e.g. tree not found), still count as verified
        // since the hash itself was correct
      }

      this.hashesComputedByClients++;
      this.issuedUnits.delete(result.workUnitId);
      return true;
    }

    // Hash mismatch
    this.hashesFailedByClients++;
    this.issuedUnits.delete(result.workUnitId);
    return false;
  }

  /**
   * Decompose leaf data into independent work units with pre-computed answers.
   *
   * Each leaf is turned into a `LeafHash` work unit whose expected result
   * is the SHA3-512 hash of the leaf data. The work units are enqueued
   * in the work queue and a tree is created in the assembler.
   *
   * @param leafData - Array of raw leaf data buffers
   * @param treeId - Unique identifier for the Merkle tree
   * @returns Array of work units created from the leaf data
   *
   * @see Requirements 2.2, 6.1, 6.2, 6.3
   */
  decomposeTree(leafData: Uint8Array[], treeId: string): IWorkUnit[] {
    // Create the tree in the assembler
    this.assembler.createTree(treeId, leafData.length);

    const workUnits: IWorkUnit[] = [];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.workUnitMaxAgeMs);
    const leafLevel = Math.max(
      0,
      Math.ceil(Math.log2(Math.max(leafData.length, 2))),
    );

    for (let i = 0; i < leafData.length; i++) {
      const leaf = leafData[i];

      // Pre-compute the expected SHA3-512 hash
      const checksum: Checksum = this.checksumService.calculateChecksum(leaf);
      const expectedResult = checksum.toHex();

      const workUnitId = randomUUID();
      const inputDataBase64 = Buffer.from(leaf).toString('base64');

      const workUnit: IWorkUnit = {
        id: workUnitId,
        treeId,
        treeLevel: leafLevel,
        treeIndex: i,
        operation: WorkUnitOperation.LeafHash,
        inputData: inputDataBase64,
        childCount: 0,
        difficulty: DifficultyTier.Low,
        challengeToken: '', // Set when issued to a client
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      workUnits.push(workUnit);

      // Enqueue with the pre-computed expected result
      // New trees are not partial trees yet
      this.queue.enqueue(workUnit, expectedResult, false);
    }

    return workUnits;
  }

  /**
   * Generate synthetic Merkle tree tasks when no real work is available.
   *
   * Creates random leaf data and decomposes it into work units via
   * {@link decomposeTree}. The synthetic trees are still useful for
   * testing the assembly pipeline and keeping the queue populated.
   *
   * @param count - Number of synthetic work units to generate (approximate;
   *   actual count depends on the number of leaves per tree)
   * @returns Array of generated work units
   *
   * @see Requirements 2.5, 9.1, 9.2
   */
  generateSyntheticWork(count: number): IWorkUnit[] {
    const allWorkUnits: IWorkUnit[] = [];
    let generated = 0;

    while (generated < count) {
      const leafCount = Math.min(
        DEFAULT_SYNTHETIC_LEAF_COUNT,
        count - generated,
      );
      if (leafCount <= 0) break;

      const leafData: Uint8Array[] = [];
      for (let i = 0; i < leafCount; i++) {
        leafData.push(randomBytes(DEFAULT_SYNTHETIC_LEAF_SIZE));
      }

      const treeId = `synthetic-${randomUUID()}`;
      const workUnits = this.decomposeTree(leafData, treeId);
      allWorkUnits.push(...workUnits);
      generated += workUnits.length;
    }

    return allWorkUnits;
  }

  /**
   * Get current metrics for the work coordinator.
   *
   * @returns Metrics snapshot including queue depth, tree progress, and
   *   client-computed hash counts
   *
   * @see Requirements 12.1, 12.2
   */
  getMetrics(): IWorkCoordinatorMetrics {
    return {
      queueDepth: this.queue.depth,
      treesInProgress: this.assembler.getPartialTreeIds().length,
      treesCompleted: this.treesCompleted,
      hashesComputedByClients: this.hashesComputedByClients,
    };
  }
}
