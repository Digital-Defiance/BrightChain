/**
 * Request body for storing a Super CBL
 */
export interface StoreSCBLRequestBody extends Record<string, unknown> {
  data: string; // Base64 encoded file data
  durabilityLevel?: string; // Optional: 'ephemeral', 'standard', 'enhanced', 'maximum'
  isEncrypted?: boolean; // Optional: flag indicating data is encrypted
}
