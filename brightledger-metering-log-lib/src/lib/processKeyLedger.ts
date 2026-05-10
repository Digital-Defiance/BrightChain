import type {
  ProcessKeyCertAction,
  ProcessKeyRevokeAction,
} from './processKeyActions.js';

/**
 * Minimal adapter interface through which the metering shard interacts with
 * the asset ledger for process-key lifecycle operations.
 *
 * Implementations are injected at construction time, enabling:
 *   - Production code to submit actions to the real programmable-asset-ledger.
 *   - Tests to use {@link InMemoryProcessKeyLedger} for immediate confirmation.
 *
 * Requirements 4.1 – 4.4.
 */
export interface IProcessKeyLedger {
  /**
   * Submit a {@link ProcessKeyCertAction} to the asset ledger.
   *
   * The implementation is responsible for serialising and transmitting the
   * action.  It MUST NOT return until the action has been accepted for
   * processing (though not necessarily confirmed — see
   * {@link awaitCertConfirmation}).
   */
  submitCert(action: ProcessKeyCertAction): Promise<void>;

  /**
   * Submit a {@link ProcessKeyRevokeAction} to the asset ledger.
   */
  submitRevoke(action: ProcessKeyRevokeAction): Promise<void>;

  /**
   * Wait until the cert identified by `fingerprint` is confirmed in the
   * asset ledger by at least one finality block.
   *
   * @param fingerprint - 32-byte BLAKE3 fingerprint of the key to await.
   * @param timeoutMs   - Maximum wait in milliseconds.  Defaults to 30 000.
   * @returns `true` if confirmed within the timeout, `false` otherwise.
   */
  awaitCertConfirmation(
    fingerprint: Uint8Array,
    timeoutMs?: number,
  ): Promise<boolean>;
}

// ── Hex helper (local copy to avoid circular import with verifier.ts) ─────

function fingerprintHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * In-memory ledger implementation for unit tests.
 *
 * Certs are confirmed synchronously the moment they are submitted, so
 * `awaitCertConfirmation` always returns `true` immediately.  Revocations
 * are stored and exposed for test assertions via `revocations`.
 */
export class InMemoryProcessKeyLedger implements IProcessKeyLedger {
  private readonly _confirmedCerts = new Set<string>();
  private readonly _revocations: ProcessKeyRevokeAction[] = [];

  /** @inheritdoc */
  async submitCert(action: ProcessKeyCertAction): Promise<void> {
    // Immediately mark as confirmed — simulates a single-block finality.
    this._confirmedCerts.add(fingerprintHex(action.fingerprint));
  }

  /** @inheritdoc */
  async submitRevoke(action: ProcessKeyRevokeAction): Promise<void> {
    this._revocations.push(action);
  }

  /**
   * Always resolves to `true` in this implementation because certs are
   * confirmed synchronously in {@link submitCert}.
   *
   * @inheritdoc
   */
  async awaitCertConfirmation(
    fingerprint: Uint8Array,
    _timeoutMs = 30_000,
  ): Promise<boolean> {
    return this._confirmedCerts.has(fingerprintHex(fingerprint));
  }

  /**
   * Read-only snapshot of submitted revoke actions.
   * Useful for test assertions.
   */
  get revocations(): readonly ProcessKeyRevokeAction[] {
    return [...this._revocations];
  }

  /**
   * Returns `true` if the fingerprint has a confirmed cert.
   * Useful for test assertions.
   */
  hasCert(fingerprint: Uint8Array): boolean {
    return this._confirmedCerts.has(fingerprintHex(fingerprint));
  }
}
