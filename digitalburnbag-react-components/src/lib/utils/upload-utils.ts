/** Compute DJB2-style checksum for a chunk — must match server's computeChecksum. */
export function computeChunkChecksum(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let hash = 5381;
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) + hash + bytes[i]) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
