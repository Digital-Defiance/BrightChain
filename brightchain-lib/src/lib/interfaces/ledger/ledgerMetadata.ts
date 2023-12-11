/**
 * @fileoverview ILedgerMetadata interface.
 *
 * Stored as a metadata block in the IBlockStore to enable cold-start
 * reconstruction of the ledger's in-memory index.
 *
 * @see Design: Block Chain Ledger — ILedgerMetadata
 * @see Requirements 7.2
 */

import { Checksum } from '../../types/checksum';

/** Metadata describing the current state of a ledger, persisted in the BlockStore. */
export interface ILedgerMetadata {
  /** Unique identifier for this ledger instance. */
  readonly ledgerId: string;
  /** EntryHash of the most recent entry, or null if the ledger is empty. */
  readonly headChecksum: Checksum | null;
  /** Current number of entries in the chain. */
  readonly length: number;
}
