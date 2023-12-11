import { OperationType } from '../enumerations/operationType';
import { Checksum } from '../types/checksum';

/**
 * Metadata for energy transaction
 */
export interface IEnergyTransactionMetadata {
  dataSize?: number;
  duration?: number;
  redundancy?: number;
  proofOfWork?: number;
}

/**
 * Energy transaction record
 */
export interface EnergyTransaction {
  readonly id: Checksum;
  readonly timestamp: Date;
  readonly source: Checksum;
  readonly destination: Checksum;
  readonly amount: number;
  readonly operationType: OperationType;
  readonly blockId?: Checksum;
  readonly metadata: IEnergyTransactionMetadata;
  readonly signature: Uint8Array;
}
