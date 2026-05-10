/**
 * Configuration for WCAP signing on file-serving responses.
 * Shared between frontend and backend — no Node.js dependencies.
 */
export interface IWcapConfig {
  /** Algorithm suite identifier. Default: 'dd-ecies-secp256k1-sha256' */
  algorithmSuite: string;
  /** Relative URI path to the public key endpoint. Default: '/.well-known/wcap-public-key-secp256k1.pem' */
  keyUriPath: string;
  /** Optional key ID for signers with multiple keys */
  kid?: string;
  /**
   * Optional signing policy token to include in the Content-Signature header.
   * MUST be a registered token from the WCAP Signing Policy Registry (Section 13).
   * When set, the Signer declares it performed the verifications described by the
   * policy before signing. Default: undefined (no policy claim).
   * For the Burnbag, use 'decryption-verified'.
   */
  policy?: string;
  /** Whether WCAP signing is enabled. Default: true */
  enabled: boolean;
}

/** Default WCAP configuration values.
 * Validates: Requirements 4.1, 10.1
 */
export const WCAP_DEFAULTS: Readonly<IWcapConfig> = Object.freeze({
  algorithmSuite: 'dd-ecies-secp256k1-sha256',
  keyUriPath: '/.well-known/wcap-public-key-secp256k1.pem',
  enabled: true,
});
