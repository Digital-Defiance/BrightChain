/**
 * Lightweight shim for @brightchain/brightchain-api-lib used in S3 conformance tests.
 *
 * The full brightchain-api-lib barrel pulls in brightchain-node-express-suite →
 * otplib → @scure-base (ESM-only), which breaks Jest's CJS transform pipeline.
 * This shim re-exports only what the S3 conformance test actually needs:
 * CloudBlockStoreBase (via the stores sub-path, which has no TOTP dependency).
 */
export * from '../../../../brightchain-api-lib/src/lib/stores/cloudBlockStoreBase';
