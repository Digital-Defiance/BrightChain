import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { ICanaryBindingBase } from '../bases/canary-binding';
import type { IRecipientListBase } from '../bases/recipient-list';
import type {
  ICanaryBindingUpdate,
  ICascadeResult,
  ICreateCanaryBindingParams,
  IDryRunReport,
  IPrepareBindingKeysResult,
  IProtocolExecutionResult,
  ITriggerContext,
} from '../params/canary-service-params';
import type {
  ICreateRecipientListParams,
  IRecipientListUpdate,
} from '../params/recipient-list-params';

/**
 * Service interface for canary protocol operations.
 * Manages canary bindings, recipient lists, protocol execution,
 * cascading triggers, duress handling, and dry-run simulation.
 */
export interface ICanaryService<TID extends PlatformID> {
  /** Create a new canary binding */
  createBinding(
    params: ICreateCanaryBindingParams<TID>,
    requesterId: TID,
  ): Promise<ICanaryBindingBase<TID>>;

  /** Update an existing canary binding */
  updateBinding(
    bindingId: TID,
    updates: Partial<ICanaryBindingUpdate<TID>>,
    requesterId: TID,
  ): Promise<ICanaryBindingBase<TID>>;

  /** Delete a canary binding */
  deleteBinding(bindingId: TID, requesterId: TID): Promise<void>;

  /** Execute the protocol action for a binding */
  executeProtocolAction(
    bindingId: TID,
    triggerContext: ITriggerContext,
  ): Promise<IProtocolExecutionResult<TID>>;

  /** Simulate a protocol execution without performing any actions */
  dryRun(bindingId: TID, requesterId: TID): Promise<IDryRunReport<TID>>;

  /** Create a new recipient list */
  createRecipientList(
    params: ICreateRecipientListParams<TID>,
    requesterId: TID,
  ): Promise<IRecipientListBase<TID>>;

  /** Update an existing recipient list */
  updateRecipientList(
    listId: TID,
    updates: Partial<IRecipientListUpdate<TID>>,
    requesterId: TID,
  ): Promise<IRecipientListBase<TID>>;

  /** Handle a duress trigger for a user */
  handleDuressTrigger(userId: TID): Promise<void>;

  /** Execute a cascading protocol: primary + delayed secondaries */
  executeCascade(
    primaryBindingId: TID,
    triggerContext: ITriggerContext,
  ): Promise<ICascadeResult<TID>>;

  /** Cancel a scheduled cascade action */
  cancelCascade(cascadeId: TID, requesterId: TID): Promise<void>;

  /** Get all bindings for a user */
  getBindings(requesterId: TID): Promise<ICanaryBindingBase<TID>[]>;

  /** Get all recipient lists for a user */
  getRecipientLists(requesterId: TID): Promise<IRecipientListBase<TID>[]>;

  /**
   * Pre-position decryption keys for a binding's files and recipients.
   *
   * For each file bound to the binding, reads the vault symmetric key and:
   * - For platform recipients (those with `platformUserId`): wraps the key
   *   under their ECIES public key via `wrapKeyForMember`.
   * - For external recipients (no platform account): creates an ephemeral
   *   share link so the recipient gets a passphrase-protected URL instead
   *   of plaintext over email.
   *
   * Returns the created key wrapping entry IDs (to be stored on the binding
   * via `updateBinding`) and any ephemeral share details.
   */
  prepareBindingKeys(
    bindingId: TID,
    requesterId: TID,
  ): Promise<IPrepareBindingKeysResult<TID>>;
}
