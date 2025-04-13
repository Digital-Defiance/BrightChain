/**
 * Extended Cipher type with auth tag support
 */
export interface AuthenticatedCipher {
  update(data: Buffer): Buffer;
  final(): Buffer;
  getAuthTag(): Buffer;
  setAutoPadding(autoPadding: boolean): void;
}
