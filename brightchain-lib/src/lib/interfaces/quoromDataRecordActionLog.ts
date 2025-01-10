import { QuorumDataRecordActionEventType } from '../enumerations/actionEvent';
import { QuorumDataRecordActionType } from '../enumerations/actionType';
import { IBasicObjectDTO } from './basicObjectDto';

export interface QuorumDataRecordActionLog extends IBasicObjectDTO {
  readonly eventId: string;
  readonly eventType: QuorumDataRecordActionEventType;
  readonly actionTaken: QuorumDataRecordActionType;
  readonly escrowed: boolean;
  readonly dateCreated: Date;
}
