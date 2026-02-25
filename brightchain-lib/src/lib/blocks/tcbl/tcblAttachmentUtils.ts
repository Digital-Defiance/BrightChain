/**
 * @fileoverview Utility functions for working with TCBL attachments
 * in the context of quorum proposals.
 *
 * Provides a unified way to enumerate entries from an attachment
 * that may be either a plain CBL or a TCBL archive. This allows
 * proposal consumers to handle both formats transparently.
 *
 * @see Requirement 9.2 — enumerate entries from TCBL attachments
 * @see Requirement 9.3 — handle plain CBL attachments as single-entry
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import { TcblErrorType } from '../../enumerations/tcblErrorType';
import { TcblError } from '../../errors/tcblError';
import { ICBLServices } from '../../interfaces/services/cblServices';
import { IBlockStore } from '../../interfaces/storage/blockStore';
import { ITcblEntryDescriptor } from '../../interfaces/tcbl/tcblEntryDescriptor';
import { isTarballCblData } from '../../services/blockFormatService';
import { getGlobalServiceProvider } from '../../services/globalServiceProvider';
import { Checksum } from '../../types/checksum';
import { TcblManifestSerializer } from './manifestSerializer';

/**
 * Enumerate the entries contained in a proposal attachment.
 *
 * If the attachment is a TCBL archive, this function retrieves the
 * payload, parses the manifest, and returns all entry descriptors.
 *
 * If the attachment is a plain CBL, this function returns a single-entry
 * list with a generic descriptor (fileName: 'attachment', mimeType:
 * 'application/octet-stream').
 *
 * @typeParam TID - Platform ID type for frontend/backend DTO compatibility
 * @param attachmentCblId - The CBL/TCBL checksum identifying the attachment
 * @param blockStore - The block store to retrieve block data from
 * @param services - Optional CBL services for dependency injection
 * @returns Array of entry descriptors for the attachment contents
 *
 * @example
 * ```typescript
 * const entries = await enumerateAttachmentEntries(
 *   proposal.attachmentCblId,
 *   blockStore,
 * );
 * for (const entry of entries) {
 *   console.log(`${entry.fileName} (${entry.mimeType}, ${entry.originalDataLength} bytes)`);
 * }
 * ```
 *
 * @see Requirement 9.1 — attachmentCblId accepts both CBL and TCBL
 * @see Requirement 9.2 — TCBL attachments enumerate all entries
 * @see Requirement 9.3 — plain CBL attachments return single entry
 */
export async function enumerateAttachmentEntries<
  TID extends PlatformID = Uint8Array,
>(
  attachmentCblId: Checksum,
  blockStore: IBlockStore,
  services?: ICBLServices<TID>,
): Promise<ITcblEntryDescriptor[]> {
  // Retrieve the raw block data for the attachment
  const rawBlock = await blockStore.getData(attachmentCblId);
  const data = rawBlock.data;

  // Check if the data has a TCBL header (0xBC + TarballCBL type byte)
  if (isTarballCblData(data)) {
    return enumerateTcblEntries<TID>(data, blockStore, services);
  }

  // Plain CBL — return a single-entry descriptor with generic metadata
  return [
    {
      fileName: 'attachment',
      mimeType: 'application/octet-stream',
      originalDataLength: data.length,
      cblAddress: attachmentCblId,
    },
  ];
}

/**
 * Parse a TCBL block's addresses and extract manifest entries.
 *
 * Uses the CBL service to parse addresses from the raw TCBL data,
 * retrieves the payload block (last address), handles decompression,
 * and parses the manifest.
 *
 * @param data - Raw TCBL block data (header + addresses)
 * @param blockStore - Block store for retrieving the payload block
 * @param services - Optional CBL services for dependency injection
 * @returns Array of entry descriptors from the TCBL manifest
 */
async function enumerateTcblEntries<TID extends PlatformID = Uint8Array>(
  data: Uint8Array,
  blockStore: IBlockStore,
  services?: ICBLServices<TID>,
): Promise<ITcblEntryDescriptor[]> {
  const cblService =
    services?.cblService ?? getGlobalServiceProvider<TID>().cblService;

  // Parse addresses from the CBL data
  const addresses = cblService.addressDataToAddresses(data);
  if (addresses.length === 0) {
    return [];
  }

  // The payload block is the last address in the CBL
  const payloadAddress = addresses[addresses.length - 1];
  const payloadBlock = await blockStore.getData(payloadAddress);
  const rawPayload = payloadBlock.data;

  if (rawPayload.length < 1) {
    throw new TcblError(
      TcblErrorType.InvalidHeader,
      new Map([['reason', 'payload block is empty']]),
    );
  }

  // Check compression flag (byte 0)
  const compressionFlag = rawPayload[0];
  let manifestData: Uint8Array;

  if (compressionFlag === 0x01) {
    // Compressed payload: [0x01][uncompressedLength(4 bytes BE)][bzip2 data]
    if (rawPayload.length < 5) {
      throw new TcblError(
        TcblErrorType.DecompressionFailed,
        new Map([['reason', 'compressed payload too short']]),
      );
    }
    try {
      const view = new DataView(
        rawPayload.buffer,
        rawPayload.byteOffset,
        rawPayload.byteLength,
      );
      const uncompressedLength = view.getUint32(1, false);
      const compressedData = rawPayload.subarray(5);

      const BZip2Module = await import('bzip2-wasm');
      const BZip2 = BZip2Module.default;
      const bzip2 = new BZip2();
      await bzip2.init();
      manifestData = bzip2.decompress(compressedData, uncompressedLength);
    } catch (e) {
      if (e instanceof TcblError) throw e;
      throw new TcblError(
        TcblErrorType.DecompressionFailed,
        new Map([['reason', String(e)]]),
      );
    }
  } else {
    // Uncompressed: skip the compression flag byte
    manifestData = rawPayload.subarray(1);
  }

  const manifest = TcblManifestSerializer.deserialize(manifestData);
  return manifest.entries;
}
