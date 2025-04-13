import { ChecksumUint8Array } from '@digitaldefiance/ecies-lib';
import { OperationType } from '../enumerations/operationType';

export interface EnergyTransaction {
  readonly amount: number; // Joules
  readonly source: ChecksumUint8Array;
  readonly destination: ChecksumUint8Array;
  readonly operationType: OperationType;
  readonly timestamp: number;
}
