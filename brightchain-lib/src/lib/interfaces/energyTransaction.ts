import { OperationType } from '../enumerations/operationType';
import { ChecksumBuffer } from '../types';

export interface EnergyTransaction {
  readonly amount: number; // Joules
  readonly source: ChecksumBuffer;
  readonly destination: ChecksumBuffer;
  readonly operationType: OperationType;
  readonly timestamp: number;
}
