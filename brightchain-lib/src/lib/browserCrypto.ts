/**
 * Browser-compatible crypto utilities using Web Crypto API
 */

/**
 * Generate cryptographically secure random bytes using Web Crypto API
 * Handles the 65,536 byte limit by chunking large requests
 */
export function randomBytes(size: number): Uint8Array {
  if (size <= 0) {
    return new Uint8Array(0);
  }
  
  // Web Crypto API has a limit of 65,536 bytes per call
  const MAX_BYTES = 65536;
  
  if (size <= MAX_BYTES) {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return bytes;
  }
  
  // For larger sizes, chunk the requests
  const result = new Uint8Array(size);
  let offset = 0;
  
  while (offset < size) {
    const chunkSize = Math.min(MAX_BYTES, size - offset);
    const chunk = new Uint8Array(chunkSize);
    crypto.getRandomValues(chunk);
    result.set(chunk, offset);
    offset += chunkSize;
  }
  
  return result;
}