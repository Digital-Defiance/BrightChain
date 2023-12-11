/**
 * Error types for TCBL (Tarball CBL) operations.
 *
 * Used by {@link TcblError} to classify the nature of a TCBL failure.
 *
 * @see Requirement 10 (Validation and Error Handling)
 */
export enum TcblErrorType {
  /** The structured block header is missing or has an incorrect magic prefix or type byte. */
  InvalidHeader = 'InvalidHeader',
  /** The manifest checksum does not match the computed checksum of the manifest data. */
  ManifestChecksumMismatch = 'ManifestChecksumMismatch',
  /** The manifest entry count does not match the actual number of entry descriptors. */
  ManifestCountMismatch = 'ManifestCountMismatch',
  /** The manifest binary data is structurally invalid or contains non-UTF-8 strings. */
  ManifestCorrupted = 'ManifestCorrupted',
  /** The manifest binary data is shorter than expected for the declared entry count. */
  ManifestTruncated = 'ManifestTruncated',
  /** A requested entry index or file name does not exist in the manifest. */
  EntryNotFound = 'EntryNotFound',
  /** An entry file name exceeds the maximum allowed length (255 characters). */
  FileNameTooLong = 'FileNameTooLong',
  /** An entry MIME type exceeds the maximum allowed length (127 characters). */
  MimeTypeTooLong = 'MimeTypeTooLong',
  /** An entry file name contains path traversal sequences or is an absolute path. */
  PathTraversal = 'PathTraversal',
  /** Bzip2 decompression of the archive payload failed. */
  DecompressionFailed = 'DecompressionFailed',
  /** Decryption of the EncryptedBlock wrapper failed. */
  DecryptionFailed = 'DecryptionFailed',
  /** The manifest version is not supported by this implementation. */
  InvalidManifestVersion = 'InvalidManifestVersion',
}
