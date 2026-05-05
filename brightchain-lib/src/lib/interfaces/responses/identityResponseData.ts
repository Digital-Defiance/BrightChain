/**
 * Re-export the browser-safe identity descriptor as a response data interface.
 *
 * `IBrightChainIdentity` is the transport DTO containing only public,
 * non-sensitive fields (id, displayName, email, publicKeyHex). It is used
 * by `api-identity-response.ts` in brightchain-api-lib as the base data
 * shape for the API response wrapper.
 */
export type { IBrightChainIdentity } from '../identity/brightChainIdentity';
