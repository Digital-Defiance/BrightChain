import { Secret, TOTP } from 'otpauth';
import * as QRCode from 'qrcode';

/**
 * Configuration options for TOTP setup
 */
export interface TOTPConfig {
  /** The issuer name (e.g., "BrightChain") */
  issuer: string;
  /** The account label (e.g., user email) */
  label: string;
  /** Hash algorithm - defaults to SHA1 for compatibility */
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  /** Number of digits in the code - defaults to 6 */
  digits?: number;
  /** Time period in seconds - defaults to 30 */
  period?: number;
}

/**
 * Result of a complete TOTP setup operation
 */
export interface TOTPSetupResult {
  /** Base32-encoded secret for storage */
  secret: string;
  /** otpauth:// URI for manual entry */
  uri: string;
  /** QR code as data URL for scanning */
  qrCode: string;
}

/**
 * TOTPEngine - Time-based One-Time Password generation and validation
 *
 * Provides RFC 6238 compliant TOTP operations for two-factor authentication.
 * Uses the otpauth library for TOTP operations and qrcode for QR code generation.
 * Works in both browser and Node.js environments.
 *
 * Requirements:
 * - 2.1: Generate RFC 6238 compliant time-based one-time passwords
 * - 2.2: Validate TOTP codes with configurable time window tolerance
 * - 2.3: Generate base32-encoded secrets for TOTP setup
 * - 2.4: Generate otpauth:// URIs for authenticator app configuration
 * - 2.5: Generate QR codes as data URLs for authenticator app scanning
 * - 2.6: Support SHA1, SHA256, and SHA512 algorithms with configurable digit count and period
 *
 * @example
 * ```typescript
 * // Complete setup flow
 * const { secret, uri, qrCode } = await TOTPEngine.setup({
 *   issuer: 'BrightChain',
 *   label: 'user@example.com'
 * });
 *
 * // Generate a code
 * const code = TOTPEngine.generate(secret);
 *
 * // Validate a code
 * const isValid = TOTPEngine.validate(userInput, secret);
 * ```
 */
export class TOTPEngine {
  /**
   * Create a new random base32-encoded secret for TOTP setup.
   *
   * The secret is generated using cryptographically secure random bytes
   * and encoded in base32 format for compatibility with authenticator apps.
   *
   * **Validates: Requirement 2.3** - Generate base32-encoded secrets for TOTP setup
   *
   * @returns A base32-encoded secret string
   *
   * @example
   * ```typescript
   * const secret = TOTPEngine.createSecret();
   * // Returns something like "JBSWY3DPEHPK3PXP"
   * ```
   */
  public static createSecret(): string {
    const secret = new Secret();
    return secret.base32;
  }

  /**
   * Generate a TOTP code for the given secret.
   *
   * Generates an RFC 6238 compliant time-based one-time password using
   * the provided secret and optional timestamp.
   *
   * **Validates: Requirement 2.1** - Generate RFC 6238 compliant time-based one-time passwords
   *
   * @param secret - Base32-encoded secret
   * @param timestamp - Optional timestamp in milliseconds (defaults to current time)
   * @returns The generated TOTP code as a string
   *
   * @example
   * ```typescript
   * const code = TOTPEngine.generate(secret);
   * // Returns something like "123456"
   *
   * // Generate code for a specific time
   * const pastCode = TOTPEngine.generate(secret, Date.now() - 30000);
   * ```
   */
  public static generate(secret: string, timestamp?: number): string {
    const totp = new TOTP({ secret: Secret.fromBase32(secret) });
    return totp.generate({ timestamp });
  }

  /**
   * Validate a TOTP code against the given secret.
   *
   * Validates the provided token against the secret with a configurable
   * time window tolerance to account for clock drift.
   *
   * **Validates: Requirement 2.2** - Validate TOTP codes with configurable time window tolerance
   *
   * @param token - The TOTP code to validate
   * @param secret - Base32-encoded secret
   * @param window - Number of periods to check before and after current time (default: 1)
   * @returns true if the token is valid within the time window, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = TOTPEngine.validate('123456', secret);
   *
   * // With larger window for more tolerance
   * const isValidLargeWindow = TOTPEngine.validate('123456', secret, 2);
   * ```
   */
  public static validate(token: string, secret: string, window = 1): boolean {
    const totp = new TOTP({ secret: Secret.fromBase32(secret) });
    const delta = totp.validate({ token, window });
    return delta !== null;
  }

  /**
   * Generate an otpauth:// URI for authenticator app configuration.
   *
   * Creates a URI that can be used to configure authenticator apps
   * either manually or via QR code scanning.
   *
   * **Validates: Requirements 2.4, 2.6** - Generate otpauth:// URIs with configurable parameters
   *
   * @param secret - Base32-encoded secret
   * @param config - TOTP configuration options
   * @returns An otpauth:// URI string
   *
   * @example
   * ```typescript
   * const uri = TOTPEngine.generateOtpauthUri(secret, {
   *   issuer: 'BrightChain',
   *   label: 'user@example.com',
   *   algorithm: 'SHA256',
   *   digits: 6,
   *   period: 30
   * });
   * // Returns: "otpauth://totp/BrightChain:user@example.com?secret=...&issuer=BrightChain&algorithm=SHA256&digits=6&period=30"
   * ```
   */
  public static generateOtpauthUri(secret: string, config: TOTPConfig): string {
    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      issuer: config.issuer,
      label: config.label,
      algorithm: config.algorithm || 'SHA1',
      digits: config.digits || 6,
      period: config.period || 30,
    });
    return totp.toString();
  }

  /**
   * Generate a QR code as a data URL from an otpauth:// URI.
   *
   * Creates a QR code image that can be scanned by authenticator apps.
   * The result is a data URL that can be used directly in an img src attribute.
   *
   * **Validates: Requirement 2.5** - Generate QR codes as data URLs for authenticator app scanning
   *
   * @param otpauthUri - The otpauth:// URI to encode
   * @returns A Promise resolving to a data URL string (e.g., "data:image/png;base64,...")
   *
   * @example
   * ```typescript
   * const uri = TOTPEngine.generateOtpauthUri(secret, config);
   * const qrCode = await TOTPEngine.generateQRCode(uri);
   * // Use in HTML: <img src={qrCode} />
   * ```
   */
  public static async generateQRCode(otpauthUri: string): Promise<string> {
    return QRCode.toDataURL(otpauthUri);
  }

  /**
   * Complete TOTP setup: create secret, generate URI and QR code.
   *
   * Convenience method that performs all setup steps in one call:
   * 1. Generates a new random secret
   * 2. Creates the otpauth:// URI
   * 3. Generates the QR code
   *
   * **Validates: Requirements 2.1, 2.3, 2.4, 2.5, 2.6** - Complete TOTP setup flow
   *
   * @param config - TOTP configuration options
   * @returns A Promise resolving to an object containing secret, URI, and QR code
   *
   * @example
   * ```typescript
   * const { secret, uri, qrCode } = await TOTPEngine.setup({
   *   issuer: 'BrightChain',
   *   label: 'user@example.com',
   *   algorithm: 'SHA256'
   * });
   *
   * // Store secret securely
   * // Display qrCode to user for scanning
   * // Optionally show uri for manual entry
   * ```
   */
  public static async setup(config: TOTPConfig): Promise<TOTPSetupResult> {
    const secret = this.createSecret();
    const uri = this.generateOtpauthUri(secret, config);
    const qrCode = await this.generateQRCode(uri);
    return { secret, uri, qrCode };
  }
}
