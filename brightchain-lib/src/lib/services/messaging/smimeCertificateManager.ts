// @peculiar/x509 is loaded dynamically to avoid pulling in tsyringe
// at import time, which breaks Jest environments without reflect-metadata.
// All methods that need x509 use `await import('@peculiar/x509')` internally.
// Type-only import for signatures — does not trigger runtime loading.
import type * as x509Types from '@peculiar/x509';
import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { EmailError } from '../../errors/messaging/emailError';
import type {
  ISmimeCertificateBundle,
  ISmimeCertificateMetadata,
  ISmimeEncryptionResult,
  ISmimeSignatureResult,
  ISmimeVerificationResult,
} from '../../interfaces/messaging/smimeCertificate';

/**
 * Manages S/MIME X.509 certificate lifecycle: import, export, validation,
 * and CMS encryption/signing operations.
 *
 * Wraps @peculiar/x509 for certificate parsing and pkijs for CMS operations.
 *
 * @see Requirements 6.1, 6.2, 6.4, 6.5, 6.7, 7.1, 8.1, 9.2
 */
export class SmimeCertificateManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _x509: any;

  private async x509() {
    if (!this._x509) {
      this._x509 = await import('@peculiar/x509');
    }
    return this._x509 as typeof import('@peculiar/x509');
  }
  /**
   * Import a PEM or DER X.509 certificate, validate structure, and extract metadata.
   *
   * @param content - PEM string or DER Uint8Array certificate data
   * @param format - Certificate format: 'pem' or 'der'
   * @returns Metadata extracted from the imported certificate
   * @throws EmailError with SMIME_INVALID_CERT if the certificate is malformed
   *
   * @see Requirement 6.1 — Validate well-formed X.509 certificate in PEM or DER format
   * @see Requirement 6.7 — Import S/MIME certificate from another user or CA
   */
  async importCertificate(
    content: string | Uint8Array,
    format: 'pem' | 'der',
  ): Promise<ISmimeCertificateMetadata> {
    try {
      let cert: x509Types.X509Certificate;

      if (format === 'pem') {
        if (typeof content !== 'string') {
          throw new Error('PEM format requires string content');
        }
        cert = new (await this.x509()).X509Certificate(content);
      } else {
        if (!(content instanceof Uint8Array)) {
          throw new Error('DER format requires Uint8Array content');
        }
        // @peculiar/x509 accepts ArrayBuffer for DER data
        cert = new (await this.x509()).X509Certificate(
          content.buffer.slice(
            content.byteOffset,
            content.byteOffset + content.byteLength,
          ) as ArrayBuffer,
        );
      }

      return this.extractMetadata(cert);
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.SMIME_INVALID_CERT,
        `Failed to import S/MIME certificate: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Import a PKCS#12 bundle (.p12/.pfx), extract certificate and private key.
   *
   * @param data - Raw PKCS#12 binary data
   * @param password - Password to decrypt the PKCS#12 bundle
   * @returns Certificate bundle with PEM certificate, optional PEM private key, and metadata
   * @throws EmailError with SMIME_PKCS12_FAILED on extraction failure
   *
   * @see Requirement 6.2 — Extract and store certificate and private key from PKCS#12
   */
  async importPkcs12(
    data: Uint8Array,
    password: string,
  ): Promise<ISmimeCertificateBundle> {
    try {
      const pkijs = await import('pkijs');

      const dataBuffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      ) as ArrayBuffer;

      // PFX.fromBER parses the ASN.1 structure directly
      const pfx = pkijs.PFX.fromBER(dataBuffer);

      // Convert password string to ArrayBuffer for pkijs
      const passwordBuffer =
        SmimeCertificateManager.stringToArrayBuffer(password);

      // Parse the PFX to extract bags
      await pfx.parseInternalValues({
        password: passwordBuffer,
        checkIntegrity: true,
      });

      if (!pfx.parsedValue) {
        throw new Error('Failed to parse PKCS#12 internal values');
      }

      let certificatePem: string | undefined;
      let privateKeyPem: string | undefined;

      // Iterate through authenticated safe contents to find certs and keys
      for (const safeContent of pfx.parsedValue.authenticatedSafe?.parsedValue
        ?.safeContents ?? []) {
        for (const safeBag of safeContent.value?.safeBags ?? []) {
          // Certificate bag (OID 1.2.840.113549.1.12.10.1.3)
          if (safeBag.bagId === '1.2.840.113549.1.12.10.1.3') {
            const certBag = safeBag.bagValue;
            if (
              certBag &&
              'parsedValue' in certBag &&
              (certBag as { parsedValue?: unknown }).parsedValue &&
              typeof (
                (certBag as { parsedValue: { toSchema?: unknown } })
                  .parsedValue as {
                  toSchema?: () => {
                    toBER: (sizeOnly: boolean) => ArrayBuffer;
                  };
                }
              ).toSchema === 'function'
            ) {
              const parsedValue = (
                certBag as {
                  parsedValue: {
                    toSchema: () => {
                      toBER: (sizeOnly: boolean) => ArrayBuffer;
                    };
                  };
                }
              ).parsedValue;
              const certDer = parsedValue.toSchema().toBER(false);
              const certX509 = new (await this.x509()).X509Certificate(
                certDer as ArrayBuffer,
              );
              certificatePem = certX509.toString('pem');
            }
          }
          // PKCS8 shrouded key bag (OID 1.2.840.113549.1.12.10.1.2)
          if (safeBag.bagId === '1.2.840.113549.1.12.10.1.2') {
            const shroudedBag = safeBag.bagValue;
            if (shroudedBag && 'parseInternalValues' in shroudedBag) {
              const keyInfo = await (
                shroudedBag as {
                  parseInternalValues: (params: {
                    password: ArrayBuffer;
                  }) => Promise<{
                    toSchema: () => {
                      toBER: (sizeOnly: boolean) => ArrayBuffer;
                    };
                  }>;
                }
              ).parseInternalValues({
                password: passwordBuffer,
              });
              const keyDer = keyInfo.toSchema().toBER(false);
              privateKeyPem = SmimeCertificateManager.derToPem(
                new Uint8Array(keyDer),
                'PRIVATE KEY',
              );
            }
          }
          // Plain key bag (OID 1.2.840.113549.1.12.10.1.1)
          if (safeBag.bagId === '1.2.840.113549.1.12.10.1.1') {
            const keyBag = safeBag.bagValue;
            if (keyBag && 'toSchema' in keyBag) {
              const keyDer = (
                keyBag as {
                  toSchema: () => { toBER: (sizeOnly: boolean) => ArrayBuffer };
                }
              )
                .toSchema()
                .toBER(false);
              privateKeyPem = SmimeCertificateManager.derToPem(
                new Uint8Array(keyDer),
                'PRIVATE KEY',
              );
            }
          }
        }
      }

      if (!certificatePem) {
        throw new Error('No certificate found in PKCS#12 bundle');
      }

      const cert = new (await this.x509()).X509Certificate(certificatePem);
      const metadata = await this.extractMetadata(cert);

      return {
        certificatePem,
        privateKeyPem,
        metadata,
      };
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.SMIME_PKCS12_FAILED,
        `Failed to import PKCS#12 bundle: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Export a certificate as PEM, validating it first.
   *
   * @param certificatePem - PEM-encoded X.509 certificate to export
   * @returns The validated PEM-encoded certificate string
   * @throws EmailError with SMIME_INVALID_CERT if the certificate is malformed
   *
   * @see Requirement 15.2 — PEM round-trip property
   */
  async exportCertificatePem(certificatePem: string): Promise<string> {
    try {
      const cert = new (await this.x509()).X509Certificate(certificatePem);
      return cert.toString('pem');
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.SMIME_INVALID_CERT,
        `Failed to export S/MIME certificate: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Validate that content is a well-formed X.509 certificate.
   *
   * @param content - PEM string or DER Uint8Array certificate data
   * @param format - Certificate format: 'pem' or 'der'
   * @returns true if the content is a valid X.509 certificate
   *
   * @see Requirement 6.5 — Reject invalid X.509 certificates
   */
  async validateCertificate(
    content: string | Uint8Array,
    format: 'pem' | 'der',
  ): Promise<boolean> {
    try {
      if (format === 'pem') {
        if (typeof content !== 'string') {
          return false;
        }
        const trimmed = content.trim();
        if (
          !trimmed.includes('-----BEGIN CERTIFICATE-----') ||
          !trimmed.includes('-----END CERTIFICATE-----')
        ) {
          return false;
        }
        // Attempt to parse — will throw if malformed
        new (await this.x509()).X509Certificate(content);
        return true;
      } else {
        if (!(content instanceof Uint8Array)) {
          return false;
        }
        if (content.length === 0) {
          return false;
        }
        // Attempt to parse — will throw if malformed
        new (await this.x509()).X509Certificate(
          content.buffer.slice(
            content.byteOffset,
            content.byteOffset + content.byteLength,
          ) as ArrayBuffer,
        );
        return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * Encrypt content using CMS/PKCS#7 enveloped-data for one or more recipients.
   *
   * Uses pkijs EnvelopedData with AES-256-CBC content encryption and
   * RSA-OAEP (SHA-256) key transport per RFC 5751.
   *
   * @param content - Plaintext content to encrypt
   * @param recipientCertificatesPem - PEM-encoded X.509 certificates of recipients
   * @returns CMS enveloped-data result with DER-encoded content and MIME content type
   * @throws EmailError with SMIME_ENCRYPT_FAILED on any failure
   *
   * @see Requirement 7.1 — CMS/PKCS#7 encryption per RFC 5751
   * @see Requirement 7.3 — S/MIME encrypted message output (application/pkcs7-mime)
   * @see Requirement 7.4 — Error on invalid/expired certificate
   */
  async encrypt(
    content: Uint8Array,
    recipientCertificatesPem: string[],
  ): Promise<ISmimeEncryptionResult> {
    try {
      const pkijs = await import('pkijs');
      const asn1js = await import('asn1js');

      // Set up the pkijs crypto engine
      SmimeCertificateManager.ensureCryptoEngine(pkijs);

      if (recipientCertificatesPem.length === 0) {
        throw new Error('At least one recipient certificate is required');
      }

      // Parse each recipient PEM certificate into a pkijs Certificate
      const recipientCerts = recipientCertificatesPem.map((pem, index) => {
        try {
          return SmimeCertificateManager.pemToPkijsCertificate(
            pem,
            asn1js,
            pkijs,
          );
        } catch (err) {
          throw new Error(
            `Failed to parse recipient certificate at index ${index}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      });

      // Create the EnvelopedData structure
      const envelopedData = new pkijs.EnvelopedData();

      // Add each recipient
      for (const cert of recipientCerts) {
        envelopedData.addRecipientByCertificate(cert, {
          oaepHashAlgorithm: 'SHA-256',
        });
      }

      // Encrypt the content with AES-256-CBC
      await envelopedData.encrypt(
        { name: 'AES-CBC', length: 256 } as unknown as Algorithm,
        content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength,
        ) as ArrayBuffer,
      );

      // Wrap in ContentInfo (OID 1.2.840.113549.1.7.3 = enveloped-data)
      const contentInfo = new pkijs.ContentInfo({
        contentType: '1.2.840.113549.1.7.3',
        content: envelopedData.toSchema(),
      });

      // Serialize to DER
      const derBuffer = contentInfo.toSchema().toBER(false);
      const encryptedContent = new Uint8Array(derBuffer);

      return {
        encryptedContent,
        contentType: 'application/pkcs7-mime; smime-type=enveloped-data',
      };
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.SMIME_ENCRYPT_FAILED,
        `S/MIME CMS encryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Decrypt CMS/PKCS#7 enveloped-data content using a recipient's certificate and private key.
   *
   * Parses the DER-encoded ContentInfo, extracts the EnvelopedData, and decrypts
   * using the provided certificate and private key.
   *
   * @param encryptedContent - DER-encoded CMS/PKCS#7 enveloped-data
   * @param certificatePem - PEM-encoded X.509 certificate of the recipient
   * @param privateKeyPem - PEM-encoded PKCS#8 private key of the recipient
   * @returns Decrypted plaintext content
   * @throws EmailError with SMIME_DECRYPT_FAILED on any failure
   *
   * @see Requirement 9.1 — S/MIME decryption with private key
   * @see Requirement 9.5 — Error when private key is missing/invalid
   */
  async decrypt(
    encryptedContent: Uint8Array,
    certificatePem: string,
    privateKeyPem: string,
  ): Promise<Uint8Array> {
    try {
      const pkijs = await import('pkijs');
      const asn1js = await import('asn1js');

      // Set up the pkijs crypto engine
      SmimeCertificateManager.ensureCryptoEngine(pkijs);

      // Parse the DER content into ContentInfo
      const contentBuffer = encryptedContent.buffer.slice(
        encryptedContent.byteOffset,
        encryptedContent.byteOffset + encryptedContent.byteLength,
      ) as ArrayBuffer;

      const asn1Result = asn1js.fromBER(contentBuffer);
      if (asn1Result.offset === -1) {
        throw new Error(
          'Failed to parse ASN.1 structure from encrypted content',
        );
      }

      const contentInfo = new pkijs.ContentInfo({ schema: asn1Result.result });
      const envelopedData = new pkijs.EnvelopedData({
        schema: contentInfo.content,
      });

      // Parse the recipient's certificate
      const recipientCert = SmimeCertificateManager.pemToPkijsCertificate(
        certificatePem,
        asn1js,
        pkijs,
      );

      // Import the recipient's private key
      const privateKey =
        await SmimeCertificateManager.pemToPrivateKey(privateKeyPem);

      // Find the matching recipient index
      const recipientIndex = SmimeCertificateManager.findRecipientIndex(
        envelopedData,
        recipientCert,
      );

      // Decrypt the content
      const decryptedBuffer = await envelopedData.decrypt(recipientIndex, {
        recipientCertificate: recipientCert,
        recipientPrivateKey: privateKey,
      });

      return new Uint8Array(decryptedBuffer);
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.SMIME_DECRYPT_FAILED,
        `S/MIME CMS decryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a CMS detached signature over the given content.
   *
   * Uses pkijs SignedData with RSASSA-PKCS1-v1_5 / SHA-256 to produce
   * a DER-encoded CMS detached signature conforming to RFC 5751.
   *
   * @param content - The content to sign
   * @param certificatePem - PEM-encoded X.509 certificate of the signer
   * @param privateKeyPem - PEM-encoded PKCS#8 private key of the signer
   * @returns Signature result with DER-encoded CMS signature and signer subject
   * @throws EmailError with SMIME_VERIFY_FAILED on any failure
   *
   * @see Requirement 8.1 — CMS detached signature production
   * @see Requirement 8.2 — Sign before encrypt ordering
   */
  async sign(
    content: Uint8Array,
    certificatePem: string,
    privateKeyPem: string,
  ): Promise<ISmimeSignatureResult> {
    try {
      const pkijs = await import('pkijs');
      const asn1js = await import('asn1js');

      // Set up the pkijs crypto engine
      SmimeCertificateManager.ensureCryptoEngine(pkijs);

      // Parse the signer's PEM certificate into a pkijs Certificate
      const signerCert = SmimeCertificateManager.pemToPkijsCertificate(
        certificatePem,
        asn1js,
        pkijs,
      );

      // Import the private key for signing (RSASSA-PKCS1-v1_5 with SHA-256)
      const privateKey =
        await SmimeCertificateManager.pemToSigningKey(privateKeyPem);

      // Create the SignedData structure with detached content
      const signedData = new pkijs.SignedData({
        encapContentInfo: new pkijs.EncapsulatedContentInfo({
          eContentType: '1.2.840.113549.1.7.1', // id-data
        }),
        certificates: [signerCert],
        signerInfos: [
          new pkijs.SignerInfo({
            sid: new pkijs.IssuerAndSerialNumber({
              issuer: signerCert.issuer,
              serialNumber: signerCert.serialNumber,
            }),
          }),
        ],
      });

      // Sign the content (detached — content is passed as data parameter, not embedded)
      const contentBuffer = content.buffer.slice(
        content.byteOffset,
        content.byteOffset + content.byteLength,
      ) as ArrayBuffer;

      await signedData.sign(privateKey, 0, 'SHA-256', contentBuffer);

      // Wrap in ContentInfo (OID 1.2.840.113549.1.7.2 = signed-data)
      const contentInfo = new pkijs.ContentInfo({
        contentType: '1.2.840.113549.1.7.2',
        content: signedData.toSchema(true),
      });

      // Serialize to DER
      const derBuffer = contentInfo.toSchema().toBER(false);
      const signature = new Uint8Array(derBuffer);

      // Extract the signer's subject from the certificate
      const signerCertSubject =
        SmimeCertificateManager.extractPkijsCertSubject(signerCert);

      return {
        signature,
        signerCertSubject,
      };
    } catch (error) {
      if (error instanceof EmailError) {
        throw error;
      }
      throw new EmailError(
        EmailErrorType.SMIME_VERIFY_FAILED,
        `S/MIME CMS signing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Verify a CMS detached signature against the given content and signer certificate.
   *
   * Parses the DER-encoded CMS signature, extracts the SignedData, and verifies
   * using the provided signer certificate as a trusted certificate.
   *
   * @param content - The original content that was signed
   * @param signature - DER-encoded CMS detached signature
   * @param signerCertificatePem - PEM-encoded X.509 certificate of the expected signer
   * @returns Verification result with valid status, signer subject, and optional reason
   *
   * @see Requirement 9.2 — S/MIME signature verification
   * @see Requirement 9.3 — Verification result with signer subject and valid status
   * @see Requirement 9.4 — Verification failure with reason
   */
  async verify(
    content: Uint8Array,
    signature: Uint8Array,
    signerCertificatePem: string,
  ): Promise<ISmimeVerificationResult> {
    try {
      const pkijs = await import('pkijs');
      const asn1js = await import('asn1js');

      // Set up the pkijs crypto engine
      SmimeCertificateManager.ensureCryptoEngine(pkijs);

      // Parse the DER signature into ContentInfo
      const sigBuffer = signature.buffer.slice(
        signature.byteOffset,
        signature.byteOffset + signature.byteLength,
      ) as ArrayBuffer;

      const asn1Result = asn1js.fromBER(sigBuffer);
      if (asn1Result.offset === -1) {
        return {
          valid: false,
          reason: 'Failed to parse ASN.1 structure from signature',
        };
      }

      const contentInfo = new pkijs.ContentInfo({ schema: asn1Result.result });
      const signedData = new pkijs.SignedData({ schema: contentInfo.content });

      // Parse the signer's PEM certificate
      const signerCert = SmimeCertificateManager.pemToPkijsCertificate(
        signerCertificatePem,
        asn1js,
        pkijs,
      );

      // Prepare the content buffer for verification
      const contentBuffer = content.buffer.slice(
        content.byteOffset,
        content.byteOffset + content.byteLength,
      ) as ArrayBuffer;

      // Verify the signature
      const verifyResult = await signedData.verify({
        signer: 0,
        data: contentBuffer,
        trustedCerts: [signerCert],
      });

      const signerSubject =
        SmimeCertificateManager.extractPkijsCertSubject(signerCert);

      if (verifyResult) {
        return {
          valid: true,
          signerSubject,
        };
      } else {
        return {
          valid: false,
          signerSubject,
          reason: 'CMS signature verification returned false',
        };
      }
    } catch (error) {
      // Verification failures should return a result, not throw
      const reason = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        reason: `CMS signature verification failed: ${reason}`,
      };
    }
  }

  /**
   * Extract metadata from an X.509 certificate.
   *
   * @param cert - The parsed X.509 certificate
   * @returns Certificate metadata
   */
  private async extractMetadata(
    cert: x509Types.X509Certificate,
  ): Promise<ISmimeCertificateMetadata> {
    const subject = cert.subject;
    const issuer = cert.issuer;
    const serialNumber = cert.serialNumber;
    const validFrom = cert.notBefore;
    const validTo = cert.notAfter;
    const isExpired = validTo < new Date();

    // Extract email addresses from Subject Alternative Name extension
    const emailAddresses = await this.extractEmailAddresses(cert);

    // Compute SHA-256 fingerprint
    const fingerprint = await this.computeFingerprint(cert);

    return {
      subject,
      issuer,
      serialNumber,
      validFrom,
      validTo,
      emailAddresses,
      fingerprint,
      isExpired,
    };
  }

  /**
   * Extract email addresses from the Subject Alternative Name extension.
   *
   * @param cert - The parsed X.509 certificate
   * @returns Array of email addresses found in the SAN extension
   */
  private async extractEmailAddresses(
    cert: x509Types.X509Certificate,
  ): Promise<string[]> {
    const emails: string[] = [];

    try {
      const x509Mod = await this.x509();
      const sanExt =
        cert.getExtension<x509Types.SubjectAlternativeNameExtension>(
          x509Mod.SubjectAlternativeNameExtension,
        );
      if (sanExt) {
        for (const name of sanExt.names.items) {
          if (name.type === 'email') {
            emails.push(name.value);
          }
        }
      }
    } catch {
      // SAN extension not present or malformed — return empty array
    }

    return emails;
  }

  /**
   * Compute SHA-256 fingerprint of a certificate.
   *
   * @param cert - The parsed X.509 certificate
   * @returns Hex-encoded SHA-256 fingerprint
   */
  private async computeFingerprint(
    cert: x509Types.X509Certificate,
  ): Promise<string> {
    const thumbprint = await cert.getThumbprint('SHA-256');
    return Array.from(new Uint8Array(thumbprint))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert a string to ArrayBuffer (UTF-16 encoding as expected by pkijs).
   *
   * @param str - The string to convert
   * @returns ArrayBuffer with UTF-16 encoded string
   */
  private static stringToArrayBuffer(str: string): ArrayBuffer {
    const buf = new ArrayBuffer(str.length * 2);
    const view = new Uint16Array(buf);
    for (let i = 0; i < str.length; i++) {
      view[i] = str.charCodeAt(i);
    }
    return buf;
  }

  /**
   * Convert DER-encoded data to PEM format.
   *
   * @param der - DER-encoded binary data
   * @param tag - PEM tag (e.g., 'CERTIFICATE', 'PRIVATE KEY')
   * @returns PEM-encoded string
   */
  private static derToPem(der: Uint8Array, tag: string): string {
    const base64 = Buffer.from(der).toString('base64');
    const lines: string[] = [];
    for (let i = 0; i < base64.length; i += 64) {
      lines.push(base64.substring(i, i + 64));
    }
    return `-----BEGIN ${tag}-----\n${lines.join('\n')}\n-----END ${tag}-----`;
  }

  /**
   * Ensure the pkijs crypto engine is initialized with WebCrypto.
   *
   * @param pkijs - The pkijs module
   */
  private static ensureCryptoEngine(pkijs: typeof import('pkijs')): void {
    const crypto = globalThis.crypto;
    pkijs.setEngine(
      'webcrypto',
      new pkijs.CryptoEngine({ name: 'webcrypto', crypto }),
    );
  }

  /**
   * Parse a PEM-encoded X.509 certificate into a pkijs Certificate object.
   *
   * @param pem - PEM-encoded certificate string
   * @param asn1js - The asn1js module
   * @param pkijs - The pkijs module
   * @returns pkijs Certificate instance
   */
  private static pemToPkijsCertificate(
    pem: string,
    asn1js: typeof import('asn1js'),
    pkijs: typeof import('pkijs'),
  ): InstanceType<typeof pkijs.Certificate> {
    // Strip PEM headers and decode base64
    const b64 = pem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');
    const derBuffer = Buffer.from(b64, 'base64');
    const arrayBuffer = derBuffer.buffer.slice(
      derBuffer.byteOffset,
      derBuffer.byteOffset + derBuffer.byteLength,
    ) as ArrayBuffer;

    const asn1Result = asn1js.fromBER(arrayBuffer);
    if (asn1Result.offset === -1) {
      throw new Error('Failed to parse certificate ASN.1 structure');
    }

    return new pkijs.Certificate({ schema: asn1Result.result });
  }

  /**
   * Import a PEM-encoded PKCS#8 private key as a CryptoKey for signing.
   *
   * Uses RSASSA-PKCS1-v1_5 with SHA-256, which is the standard algorithm
   * for CMS/S/MIME digital signatures.
   *
   * @param pem - PEM-encoded PKCS#8 private key
   * @returns CryptoKey suitable for signing
   */
  private static async pemToSigningKey(pem: string): Promise<CryptoKey> {
    const b64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\s/g, '');
    const derBuffer = Buffer.from(b64, 'base64');
    const arrayBuffer = derBuffer.buffer.slice(
      derBuffer.byteOffset,
      derBuffer.byteOffset + derBuffer.byteLength,
    ) as ArrayBuffer;

    return globalThis.crypto.subtle.importKey(
      'pkcs8',
      arrayBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      true,
      ['sign'],
    );
  }

  /**
   * Extract the subject distinguished name string from a pkijs Certificate.
   *
   * @param cert - pkijs Certificate instance
   * @returns Subject DN string (e.g., "CN=John Doe, O=Example Corp")
   */
  private static extractPkijsCertSubject(
    cert: InstanceType<typeof import('pkijs').Certificate>,
  ): string {
    try {
      return cert.subject.typesAndValues
        .map(
          (tv: { type: string; value: { valueBlock: { value: string } } }) => {
            const oid = tv.type;
            const value = tv.value.valueBlock.value;
            // Map common OIDs to readable names
            const oidMap: Record<string, string> = {
              '2.5.4.3': 'CN',
              '2.5.4.6': 'C',
              '2.5.4.7': 'L',
              '2.5.4.8': 'ST',
              '2.5.4.10': 'O',
              '2.5.4.11': 'OU',
              '1.2.840.113549.1.9.1': 'E',
            };
            const name = oidMap[oid] || oid;
            return `${name}=${value}`;
          },
        )
        .join(', ');
    } catch {
      return 'Unknown Subject';
    }
  }

  /**
   * Import a PEM-encoded PKCS#8 private key as a CryptoKey for decryption.
   *
   * Tries RSA-OAEP first, then falls back to ECDH if RSA import fails.
   *
   * @param pem - PEM-encoded PKCS#8 private key
   * @returns CryptoKey suitable for decryption
   */
  private static async pemToPrivateKey(pem: string): Promise<CryptoKey> {
    const b64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\s/g, '');
    const derBuffer = Buffer.from(b64, 'base64');
    const arrayBuffer = derBuffer.buffer.slice(
      derBuffer.byteOffset,
      derBuffer.byteOffset + derBuffer.byteLength,
    ) as ArrayBuffer;

    // Try RSA-OAEP first (most common for S/MIME)
    try {
      return await globalThis.crypto.subtle.importKey(
        'pkcs8',
        arrayBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt'],
      );
    } catch {
      // Fall back to RSA-OAEP with SHA-1 (legacy)
      try {
        return await globalThis.crypto.subtle.importKey(
          'pkcs8',
          arrayBuffer,
          { name: 'RSA-OAEP', hash: 'SHA-1' },
          true,
          ['decrypt'],
        );
      } catch {
        throw new Error(
          'Failed to import private key: unsupported key algorithm',
        );
      }
    }
  }

  /**
   * Find the recipient index in an EnvelopedData structure that matches
   * the given certificate.
   *
   * @param envelopedData - The pkijs EnvelopedData structure
   * @param recipientCert - The pkijs Certificate to match
   * @returns The zero-based index of the matching recipient
   */
  private static findRecipientIndex(
    envelopedData: InstanceType<typeof import('pkijs').EnvelopedData>,
    recipientCert: InstanceType<typeof import('pkijs').Certificate>,
  ): number {
    // Try each recipient index — pkijs will match internally
    // For KeyTransRecipientInfo, match by issuer+serialNumber
    const recipientInfos = envelopedData.recipientInfos;
    if (recipientInfos.length === 0) {
      throw new Error('No recipient info found in enveloped data');
    }

    // Get the recipient cert's serial number for matching
    const certSerial = recipientCert.serialNumber.valueBlock.toString();
    const certIssuer = recipientCert.issuer.typesAndValues
      .map(
        (tv: { type: string; value: { valueBlock: { value: string } } }) =>
          `${tv.type}=${tv.value.valueBlock.value}`,
      )
      .join(',');

    for (let i = 0; i < recipientInfos.length; i++) {
      const ri = recipientInfos[i];
      // KeyTransRecipientInfo has rid (RecipientIdentifier)
      if (ri.value && 'rid' in ri.value) {
        const rid = (
          ri.value as {
            rid: {
              issuer?: {
                typesAndValues: Array<{
                  type: string;
                  value: { valueBlock: { value: string } };
                }>;
              };
              serialNumber?: { valueBlock: { toString: () => string } };
            };
          }
        ).rid;
        if (rid.issuer && rid.serialNumber) {
          const riSerial = rid.serialNumber.valueBlock.toString();
          const riIssuer = rid.issuer.typesAndValues
            .map(
              (tv: {
                type: string;
                value: { valueBlock: { value: string } };
              }) => `${tv.type}=${tv.value.valueBlock.value}`,
            )
            .join(',');
          if (riSerial === certSerial && riIssuer === certIssuer) {
            return i;
          }
        }
      }
    }

    // If no exact match found, default to index 0 (single recipient case)
    // pkijs decrypt will validate the match internally
    return 0;
  }
}
