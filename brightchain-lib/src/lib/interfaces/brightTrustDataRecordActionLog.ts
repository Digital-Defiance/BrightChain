import { BrightTrustDataRecordActionEventType } from '../enumerations/actionEvent';
import { BrightTrustDataRecordActionType } from '../enumerations/actionType';
import type { BrightDateTimestamp } from '../types/brightDateTimestamp';
import { IBasicObjectDTO } from './basicObjectDto';

export interface BrightTrustDataRecordActionLog extends IBasicObjectDTO<Uint8Array, BrightDateTimestamp> {
  readonly eventId: string;
  readonly eventType: BrightTrustDataRecordActionEventType;
  readonly actionTaken: BrightTrustDataRecordActionType;
  readonly escrowed: boolean;
  readonly dateCreated: BrightDateTimestamp;
}
