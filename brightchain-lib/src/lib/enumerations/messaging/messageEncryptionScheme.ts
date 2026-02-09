/**
 * Message encryption schemes for different message types.
 *
 * @remarks
 * - NONE: Unencrypted messages (broadcast only)
 * - SHARED_KEY: Network-wide shared key encryption
 * - RECIPIENT_KEYS: Per-recipient public key encryption
 * - S_MIME: S/MIME encryption with signing (per RFC 5751)
 *
 * @see Requirements 3.1, 3.2, 3.3, 16.6
 */
export enum MessageEncryptionScheme {
  NONE = 'none',
  SHARED_KEY = 'shared_key',
  RECIPIENT_KEYS = 'recipient_keys',
  S_MIME = 's_mime',
}
