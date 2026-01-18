import { OperationType } from '../enumerations/operationType';
import { Checksum } from '../types/checksum';

export interface EnergyTransaction {
  readonly amount: number; // Joules
  readonly source: Checksum;
  readonly destination: Checksum;
  readonly operationType: OperationType;
  readonly timestamp: number;
}
