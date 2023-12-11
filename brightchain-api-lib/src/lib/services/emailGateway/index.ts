/**
 * Email Gateway module barrel export.
 *
 * Re-exports all public gateway components so consumers can import from
 * `@brightchain/brightchain-api-lib` (via the services barrel) with a
 * single import path.
 *
 * @see Requirements 11.2, 11.3
 * @module emailGateway
 */

export * from './antiSpamFilter';
export * from './bounceProcessor';
export * from './emailAuthVerifier';
export * from './emailGatewayConfig';
export * from './emailGatewayService';
export * from './gatewayObservability';
export * from './inboundProcessor';
export * from './outboundDeliveryWorker';
export * from './outboundQueue';
export * from './outboundQueueStore';
export * from './recipientLookupService';
export * from './retryBackoff';
export * from './testModeTransports';
