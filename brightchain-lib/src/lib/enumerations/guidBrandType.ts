export enum GuidBrandType {
  Unknown = 'Unknown',
  /**
   * Full hex guid, 36 characters
   * 00000000-0000-0000-0000-000000000000
   */
  FullHexGuid = 'FullHexGuid',
  /**
   * Short hex guid, 32 characters
   * 0000000000000000000000000000000
   */
  ShortHexGuid = 'ShortHexGuid',
  /**
   * Base64 guid, 24 characters
   * AAAA/AAAAAA==
   */
  Base64Guid = 'Base64Guid',
  /**
   * BigInt, variable width
   */
  BigIntGuid = 'BigIntGuid',
  /**
   * Raw Guid, in a buffer, 16 bytes
   */
  RawGuidBuffer = 'RawGuidBuffer',
}