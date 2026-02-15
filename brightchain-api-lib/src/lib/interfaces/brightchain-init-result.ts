/**
 * @fileoverview Stub init result interface for upstream Application compatibility.
 * BrightChain does not use mongoose init results, so this is a minimal type
 * that satisfies the upstream Application's TInitResults generic parameter.
 * @module interfaces/brightchain-init-result
 */

import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IServerInitResult } from '@digitaldefiance/node-express-suite';

/**
 * Stub init result for BrightChain's App extending upstream Application.
 * Since BrightChain uses DocumentStore/BlockDocumentStore instead of mongoose,
 * this type fully satisfies the upstream IServerInitResult constraint
 * while allowing all fields to be uninitialized at runtime (they are never read).
 * @template TID - Platform ID type
 */
export type IBrightChainInitResult<TID extends PlatformID> =
  IServerInitResult<TID>;
