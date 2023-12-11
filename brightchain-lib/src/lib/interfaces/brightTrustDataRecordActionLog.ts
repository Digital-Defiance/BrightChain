import { BrightTrustDataRecordActionEventType } from '../enumerations/actionEvent';
import { BrightTrustDataRecordActionType } from '../enumerations/actionType';
import { IBasicObjectDTO } from './basicObjectDto';

export interface BrightTrustDataRecordActionLog extends IBasicObjectDTO {
  readonly eventId: string;
  readonly eventType: BrightTrustDataRecordActionEventType;
  readonly actionTaken: BrightTrustDataRecordActionType;
  readonly escrowed: boolean;
  readonly dateCreated: Date;
}
