/**
 * BSLP privacy modes for self-published BrightSpacetime coordinates.
 * @see Bright Spacetime Location Protocol (BSLP)
 */
export enum BslpPrivacyMode {
  /** Exact coordinates; no intentional temporal fuzz. */
  Exact = 'exact',
  /**
   * Heisenberg node: declares injected delay and fuzz radius so auditors
   * subtract declared latency before light-floor checks.
   */
  Heisenberg = 'heisenberg',
}
