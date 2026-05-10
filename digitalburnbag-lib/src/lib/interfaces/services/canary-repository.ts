import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { ICanaryBindingBase } from '../bases/canary-binding';
import type { IRecipientListBase } from '../bases/recipient-list';

/**
 * Repository interface abstracting BrightDB access for canary operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by BrightDB collections.
 */
export interface ICanaryRepository<TID extends PlatformID> {
  /** Get a canary binding by ID, or null if not found */
  getBinding(bindingId: TID): Promise<ICanaryBindingBase<TID> | null>;

  /** Create a new canary binding */
  createBinding(binding: ICanaryBindingBase<TID>): Promise<void>;

  /** Update a canary binding with partial updates */
  updateBinding(
    bindingId: TID,
    updates: Partial<ICanaryBindingBase<TID>>,
  ): Promise<void>;

  /** Delete a canary binding */
  deleteBinding(bindingId: TID): Promise<void>;

  /** Get all bindings created by a user */
  getBindingsByUser(userId: TID): Promise<ICanaryBindingBase<TID>[]>;

  /** Get all bindings matching a canary condition */
  getBindingsByCondition(condition: string): Promise<ICanaryBindingBase<TID>[]>;

  /** Get a recipient list by ID, or null if not found */
  getRecipientList(listId: TID): Promise<IRecipientListBase<TID> | null>;

  /** Create a new recipient list */
  createRecipientList(list: IRecipientListBase<TID>): Promise<void>;

  /** Update a recipient list with partial updates */
  updateRecipientList(
    listId: TID,
    updates: Partial<IRecipientListBase<TID>>,
  ): Promise<void>;

  /** Get all recipient lists created by a user */
  getRecipientListsByUser(userId: TID): Promise<IRecipientListBase<TID>[]>;

  /** Get all files in folders (for resolving folder bindings to individual files) */
  getFilesInFolders(folderIds: TID[]): Promise<TID[]>;
}
