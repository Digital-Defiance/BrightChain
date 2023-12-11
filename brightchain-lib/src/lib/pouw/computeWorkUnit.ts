/**
 * @fileoverview Browser-safe client-side computation of PoUW work units.
 *
 * Accepts an IWorkUnit payload, performs the requested SHA3-512 hash operation
 * (LeafHash or InteriorHash), and returns an IWorkResult with the computed
 * hash, timing metadata, and the original challenge token.
 *
 * Uses `@noble/hashes/sha3` directly for browser compatibility.
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import { IWorkResult } from '../interfaces/pouw/workResult';
import { IWorkUnit, WorkUnitOperation } from '../interfaces/pouw/workUnit';

/**
 * Callback invoked to report computation progress.
 *
 * @param completed - Number of steps completed so far.
 * @param total     - Total number of steps in this work unit.
 */
export type ProgressCallback = (completed: number, total: number) => void;

/**
 * Browser-safe base64 decoder.
 *
 * Uses `atob` (available in browsers and Node ≥ 16 via global) with a
 * manual Uint8Array conversion so we avoid depending on Node's `Buffer`.
 */
function decodeBase64(base64: string): Uint8Array {
  // Validate that the string is plausible base64
  // Allow standard base64 characters plus padding
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_PoUW_ComputeWorkUnit_InvalidBase64Input,
    );
  }

  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_PoUW_ComputeWorkUnit_InvalidBase64Input,
    );
  }
}

/**
 * Compute a single PoUW work unit and return the result.
 *
 * For **LeafHash**: decodes the base64 `inputData`, computes SHA3-512, and
 * returns the 128-character lowercase hex digest.
 *
 * For **InteriorHash**: decodes the base64 `inputData` (concatenated child
 * hashes), computes SHA3-512 over the concatenation, and returns the hex
 * digest.
 *
 * @param workUnit - The work unit to compute.
 * @param onProgress - Optional callback for progress reporting.
 * @returns A promise resolving to the computed IWorkResult.
 *
 * @throws {TranslatableBrightChainError} if the operation type is unsupported
 *   or the input data is not valid base64.
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
export async function computeWorkUnit(
  workUnit: IWorkUnit,
  onProgress?: ProgressCallback,
): Promise<IWorkResult> {
  const total = 1;

  // Signal start of computation
  onProgress?.(0, total);

  const startTime = Date.now();

  let resultHash: string;

  switch (workUnit.operation) {
    case WorkUnitOperation.LeafHash:
    case WorkUnitOperation.InteriorHash: {
      // Both operations follow the same pattern: decode base64 → SHA3-512 → hex
      const inputBytes = decodeBase64(workUnit.inputData);
      const hashBytes = sha3_512(inputBytes);
      resultHash = uint8ArrayToHex(hashBytes);
      break;
    }
    default:
      throw new TranslatableBrightChainError(
        BrightChainStrings.Error_PoUW_ComputeWorkUnit_InvalidOperationTemplate,
        { OPERATION: String(workUnit.operation) },
      );
  }

  const computeTimeMs = Date.now() - startTime;

  // Signal completion
  onProgress?.(total, total);

  return {
    workUnitId: workUnit.id,
    resultHash,
    challengeToken: workUnit.challengeToken,
    computeTimeMs,
    completedAt: new Date().toISOString(),
  };
}
