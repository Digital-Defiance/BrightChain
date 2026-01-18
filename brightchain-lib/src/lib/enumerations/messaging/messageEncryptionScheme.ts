/**
 * Message encryption schemes for different message types.
 * 
 * @remarks
 * - NONE: Unencrypted messages (broadcast only)
 * - SHARED_KEY: Network-wide shared key encryption
 * - RECIPIENT_KEYS: Per-recipient public key encryption
 * 
 * @see Requirements 3.1, 3.2, 3.3
 */
export enum MessageEncryptionScheme {
  NONE = 'none',
  SHARED_KEY = 'shared_key',
  RECIPIENT_KEYS = 'recipient_keys',
}
