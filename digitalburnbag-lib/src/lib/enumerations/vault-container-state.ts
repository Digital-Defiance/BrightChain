/**
 * @enum VaultContainerState
 * @description The lifecycle states of a Vault Container.
 *
 * Active → Sealed → Destroyed  (sealed path)
 * Active → Locked → Destroyed  (locked path)
 * Active → Destroyed            (direct destruction)
 * Active → PendingDeletion → Destroyed  (public vault cool-down path)
 * Active → Disowned             (public vault disown path)
 *
 * Sealed is distinct from Locked:
 *   - Locked  : read-only for modifications; no pristine guarantee
 *   - Sealed  : pristine guarantee is active; any read breaks the seal
 */
export enum VaultContainerState {
  /** Normal operation — files can be read, written, shared */
  Active = 'active',
  /**
   * Pristine guarantee is active. A cryptographic seal hash was recorded
   * at seal time. Any subsequent read of file content breaks the seal and
   * transitions the container to SealBroken (tracked via sealStatus).
   * Writes are not allowed while sealed.
   */
  Sealed = 'sealed',
  /** No modifications allowed; reads still work but break seals */
  Locked = 'locked',
  /** All file vaults destroyed; container is a tombstone with proofs */
  Destroyed = 'destroyed',
  /**
   * Public vault disowned — the owner has relinquished ownership.
   * The vault is read-only, archived in the discovery feed, and the
   * ownerId is set to the DISOWNED_OWNER_SENTINEL. Terminal state;
   * only burnbag:admin may destroy a disowned vault.
   */
  Disowned = 'disowned',
  /**
   * Public vault awaiting cool-down expiry before permanent destruction.
   * The vault remains readable but not writable. After the cool-down
   * period elapses, a background job executes the destruction cascade.
   */
  PendingDeletion = 'pending-deletion',
}
