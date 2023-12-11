/**
 * Identity proof API response interfaces.
 *
 * These are the data-shape types that live in brightchain-lib so both
 * frontend and backend can consume them. The Express-specific wrappers
 * (extending Response) live in brightchain-api-lib.
 *
 * Requirements: 4.1-4.10
 */

import { IApiEnvelope } from '../communication';
import { IIdentityProof } from '../identity/identityProof';

// ─── Identity proof responses ───────────────────────────────────────────────

export type ICreateProofResponse<TId = string> = IApiEnvelope<{
  proof: IIdentityProof<TId>;
  instructions: string;
}>;

export type IVerifyProofResponse = IApiEnvelope<{
  verified: boolean;
  proofId: string;
}>;

export type ICheckProofUrlResponse = IApiEnvelope<{
  valid: boolean;
  proofId: string;
}>;

export type IRevokeProofResponse = IApiEnvelope<{
  revoked: boolean;
  revokedAt: string;
}>;

export type IGetInstructionsResponse = IApiEnvelope<{
  platform: string;
  instructions: string;
}>;

export type IListProofsResponse<TId = string> = IApiEnvelope<
  ReadonlyArray<IIdentityProof<TId>>
>;
