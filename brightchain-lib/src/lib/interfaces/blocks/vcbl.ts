import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { BrightDateTimestamp } from '../../types/brightDateTimestamp';
import { EntryPropertyRecord } from '../brightpass';
import { IExtendedConstituentBlockListBlock } from './extendedCbl';

export interface IVCBLBlock<TID extends PlatformID = Uint8Array>
  extends IExtendedConstituentBlockListBlock<TID> {
  get vaultName(): string;
  get vaultNameLength(): number;
  get ownerMemberId(): TID;
  get vaultCreatedAt(): BrightDateTimestamp;
  get vaultModifiedAt(): BrightDateTimestamp;
  get sharedMemberCount(): number;
  get sharedMemberIds(): TID[];
  get propertyRecordCount(): number;
  get propertyRecords(): EntryPropertyRecord[];
  getPropertyRecord(index: number): EntryPropertyRecord;
}
