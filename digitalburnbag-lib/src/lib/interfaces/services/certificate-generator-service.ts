import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IDestructionCertificateBase } from '../bases/destruction-certificate';
import type { IDestructionProof } from '../vault';

/**
 * Options for `ICertificateGeneratorService.generate`.
 * All fields optional; omit to use defaults.
 */
export interface ICertificateGenerationOptions {
  /**
   * When `true`, per-file non-access proofs are gathered and embedded.
   * Defaults to `true`.
   */
  includeFileProofs?: boolean;
}

/**
 * Result of `ICertificateGeneratorService.verify`.
 */
export interface ICertificateVerificationResult {
  /** `true` if every check passed. */
  valid: boolean;
  /** Low-level destruction signature check. */
  signatureValid: boolean;
  /** Merkle chain integrity check. */
  chainValid: boolean;
  /** Destruction timestamp is within the accepted drift window. */
  timestampValid: boolean;
  /** Issuer HMAC integrity check. */
  issuerSignatureValid: boolean;
  /** Human-readable reason when `valid === false`. */
  error?: string;
}

/**
 * Generates and verifies `IDestructionCertificateBase` documents.
 *
 * The certificate service is the only component allowed to produce
 * a certificate; callers must not construct them directly.
 *
 * Typical usage:
 * ```
 * const certificate = await certService.generate(vaultId, proof, options);
 * const result      = certService.verify(certificate);
 * ```
 */
export interface ICertificateGeneratorService<TID extends PlatformID> {
  /**
   * Generate a Certificate of Destruction for the given vault.
   *
   * @param vaultContainerId  ID of the vault container that was destroyed.
   * @param proof             Raw cryptographic destruction proof (treeSeed,
   *                          nonce, timestamp, signature, creatorPublicKey).
   * @param issuerId          ID of the verifier node generating this certificate.
   * @param options           Optional generation flags.
   *
   * @returns A fully populated `IDestructionCertificateBase` with `valid`
   *          reflecting the outcome of both verification channels.
   */
  generate(
    vaultContainerId: TID,
    proof: IDestructionProof,
    issuerId: TID,
    options?: ICertificateGenerationOptions,
  ): Promise<IDestructionCertificateBase<TID>>;

  /**
   * Verify an existing certificate.
   *
   * Re-runs every cryptographic check over the certificate fields and
   * returns a structured result without modifying the certificate.
   *
   * @param certificate  A previously generated certificate.
   */
  verify(
    certificate: IDestructionCertificateBase<TID>,
  ): ICertificateVerificationResult;
}
