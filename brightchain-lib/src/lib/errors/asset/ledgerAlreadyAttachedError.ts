/**
 * Thrown by `AssetAccountStore.attachLedger()` if a ledger writer has
 * already been attached. The hook is a one-shot setter so the operational
 * tier never silently switches its system-of-record mid-lifetime.
 *
 * @see asset-account-store-generalization spec, Requirement 5.3.
 */
export class LedgerAlreadyAttachedError extends Error {
  constructor(message = 'A ledger writer is already attached to this store.') {
    super(message);
    this.name = 'LedgerAlreadyAttachedError';
    Object.setPrototypeOf(this, LedgerAlreadyAttachedError.prototype);
  }
}
