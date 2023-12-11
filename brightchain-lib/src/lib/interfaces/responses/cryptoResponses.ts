/**
 * Cryptocurrency and Git signing API response interfaces.
 *
 * These are the data-shape types that live in brightchain-lib so both
 * frontend and backend can consume them. The Express-specific wrappers
 * (extending Response) live in brightchain-api-lib.
 *
 * Requirements: 6.1-6.10, 7.1-7.10
 */

import { IApiEnvelope } from '../communication';
import { IEthereumWallet } from '../crypto/ethereumWallet';
import {
  IGitPublicKeyExport,
  IGitSignature,
  IGitSignedObject,
  IGitVerificationResult,
} from '../crypto/gitSignature';

// ─── Ethereum wallet responses ──────────────────────────────────────────────

export type IDeriveAddressResponse<TId = string> = IApiEnvelope<
  IEthereumWallet<TId>
>;

export type ISignMessageResponse<TId = string> = IApiEnvelope<{
  memberId: TId;
  message: string;
  signature: string;
  recoveryParam: number;
}>;

export type IVerifySignatureResponse = IApiEnvelope<{
  valid: boolean;
  recoveredAddress: string;
}>;

export type IGetWalletResponse<TId = string> = IApiEnvelope<
  IEthereumWallet<TId>
>;

// ─── Git signing responses ──────────────────────────────────────────────────

export type ISignCommitResponse<TId = string> = IApiEnvelope<
  IGitSignedObject<TId>
>;

export type ISignTagResponse<TId = string> = IApiEnvelope<
  IGitSignedObject<TId>
>;

export type IVerifyGitSignatureResponse<TId = string> = IApiEnvelope<
  IGitVerificationResult<TId>
>;

export type IExportGitPublicKeyResponse<TId = string> = IApiEnvelope<
  IGitPublicKeyExport<TId>
>;

export type IGetGitSigningKeyResponse<TId = string> = IApiEnvelope<
  IGitSignature<TId>
>;
