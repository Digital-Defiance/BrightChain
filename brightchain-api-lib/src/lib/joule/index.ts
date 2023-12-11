/**
 * @fileoverview Public API for the `joule` sub-module of `brightchain-api-lib`.
 *
 * Exports all Joule-related services, middleware, decorators, and types used
 * by the BrightChain API layer.
 *
 * @see joule-resource-credits spec
 */

// Phase 1 — Rate table
export * from './rateTableCache';

// Phase 2 — Capture
export * from './captureMiddleware';
export * from './costDecorator';
export * from './requestCostAccumulator';

// Phase 3 — Authorization
export * from './authorizedRouteWrapper';
export * from './debitAuthorization';
export * from './jouleEarnService';
export * from './jouleMetrics';
export * from './jouleTransferGuard';
export * from './reservationReaper';
