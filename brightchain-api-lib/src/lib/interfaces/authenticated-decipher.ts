/**
 * Extended Decipher type with auth tag support
 */
export interface AuthenticatedDecipher {
  update(data: Buffer): Buffer;
  final(): Buffer;
  setAuthTag(tag: Buffer): void;
}
