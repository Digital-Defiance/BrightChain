import type { Member } from '@digitaldefiance/node-ecies-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IBrightChainIdentity } from '@brightchain/brightchain-lib';

// Re-export the browser-safe DTO from brightchain-lib so existing consumers of
// @brightchain/brightchain-identity can keep importing IBrightChainIdentity
// from this package. The canonical definition now lives in brightchain-lib
// because the DTO is shared between server (this package) and browser/client
// code that cannot depend on Node-only modules.
export type { IBrightChainIdentity };

/**
 * Server-side bundle pairing the browser-safe descriptor with the unlocked
 * `Member` instance. This bundle MUST NOT cross the network boundary - the
 * `Member` holds live private-key material.
 */
export interface IBrightChainIdentityBundle<TID extends PlatformID = Buffer> {
  identity: IBrightChainIdentity<TID>;
  member: Member<TID>;
}
