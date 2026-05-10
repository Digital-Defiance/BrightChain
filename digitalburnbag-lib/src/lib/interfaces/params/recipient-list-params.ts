import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IRecipientBase } from '../bases/recipient-list';

/**
 * Parameters for creating a new recipient list.
 */
export interface ICreateRecipientListParams<_TID extends PlatformID> {
  name: string;
  recipients: IRecipientBase[];
}

/**
 * Partial update fields for a recipient list.
 */
export interface IRecipientListUpdate<_TID extends PlatformID> {
  name?: string;
  recipientsToAdd?: IRecipientBase[];
  /** Emails of recipients to remove */
  recipientsToRemove?: string[];
}
