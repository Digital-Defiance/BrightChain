import type { IBrightChainIdentity } from '@brightchain/brightchain-lib';
import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response carrying a browser-safe BrightChain identity descriptor.
 *
 * `IBrightChainIdentity` is the transport DTO – it contains only the public,
 * non-sensitive fields (id, displayName, email, publicKeyHex). The server-side
 * `IBrightChainIdentityBundle` (which holds live private-key material) MUST
 * NOT be included in any response sent over the network.
 *
 * The `id` field is serialized as a hex string so the payload is JSON-safe
 * across the network boundary (Buffer is not browser-compatible).
 */
export interface IApiIdentityResponse
  extends IApiMessageResponse,
    Omit<IBrightChainIdentity, 'id'> {
  /** Member ID serialized as a hex string for JSON transport. */
  id: string;
}
