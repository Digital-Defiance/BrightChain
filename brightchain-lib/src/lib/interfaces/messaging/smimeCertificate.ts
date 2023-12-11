/**
 * S/MIME certificate interfaces for BrightMail encryption.
 *
 * These interfaces define the data structures for S/MIME X.509 certificate
 * management, CMS encryption results, signature results, and verification
 * results used throughout the messaging system.
 *
 * @see Requirements 6.1, 6.3, 7.1, 8.1, 9.2
 */

/**
 * Metadata for an S/MIME X.509 certificate.
 *
 * Contains identifying information extracted from an X.509 certificate,
 * including the subject, issuer, serial number, validity period,
 * associated email addresses, fingerprint, and expiration status.
 *
 * @see Requirement 6.3 — Certificate metadata display (subject, issuer, serial number, validity period, email addresses)
 */
export interface ISmimeCertificateMetadata {
  /** Certificate subject distinguished name (e.g., "CN=John Doe, O=Example Corp") */
  subject: string;

  /** Certificate issuer distinguished name */
  issuer: string;

  /** Certificate serial number (hex string) */
  serialNumber: string;

  /** Date the certificate becomes valid */
  validFrom: Date;

  /** Date the certificate expires */
  validTo: Date;

  /** Email addresses associated with the certificate (from Subject Alternative Name) */
  emailAddresses: string[];

  /** Certificate fingerprint (SHA-256 hash, hex string) */
  fingerprint: string;

  /** Whether the certificate has expired based on the current date */
  isExpired: boolean;
}

/**
 * An S/MIME certificate bundle consisting of a PEM-encoded certificate,
 * an optional PEM-encoded private key, and associated metadata.
 *
 * @remarks
 * The private key, when present, should be encrypted at rest before
 * persistence to the key store.
 *
 * @see Requirement 6.2 — S/MIME certificate with private key (PKCS#12) import
 */
export interface ISmimeCertificateBundle {
  /** PEM-encoded X.509 certificate */
  certificatePem: string;

  /** PEM-encoded private key (encrypted at rest before storage); undefined for public-only certificates */
  privateKeyPem?: string;

  /** Metadata extracted from the certificate */
  metadata: ISmimeCertificateMetadata;
}

/**
 * Result of an S/MIME CMS encryption operation.
 *
 * Contains the encrypted content as a DER-encoded CMS/PKCS#7 enveloped-data
 * structure conforming to RFC 5751.
 *
 * @see Requirement 7.1 — CMS/PKCS#7 encryption per RFC 5751
 */
export interface ISmimeEncryptionResult {
  /** DER-encoded CMS/PKCS#7 enveloped-data content */
  encryptedContent: Uint8Array;

  /** MIME content type for the encrypted content */
  contentType: 'application/pkcs7-mime; smime-type=enveloped-data';
}

/**
 * Result of an S/MIME CMS signing operation.
 *
 * Contains the detached CMS signature and the subject of the
 * signer's certificate.
 *
 * @see Requirement 8.1 — CMS detached signature production
 */
export interface ISmimeSignatureResult {
  /** Detached CMS signature (DER-encoded) */
  signature: Uint8Array;

  /** Subject distinguished name of the signer's certificate */
  signerCertSubject: string;
}

/**
 * Result of an S/MIME CMS signature verification operation.
 *
 * Indicates whether the signature is valid, and optionally provides
 * the signer's certificate subject and a reason string for failures.
 *
 * @see Requirement 9.2 — Verification result with signer subject and valid status
 */
export interface ISmimeVerificationResult {
  /** Whether the signature is valid */
  valid: boolean;

  /** Subject distinguished name of the signer's certificate, if identified */
  signerSubject?: string;

  /** Human-readable reason for verification failure */
  reason?: string;
}
