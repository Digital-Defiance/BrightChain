/**
 * Gateway Observability
 *
 * Provides unified logging, metrics collection, and alerting for all
 * Email Gateway components. Wraps the existing `IMessageLogger`,
 * `IMessageMetricsCollector`, and `AlertMonitor` services to add
 * gateway-specific observability.
 *
 * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 * @module gatewayObservability
 */

import type { IEmailAuthenticationResult } from '@brightchain/brightchain-lib';
import {
  type IMessageLogger,
  type IMessageMetricsCollector,
  AlertMonitor,
} from '@brightchain/brightchain-lib';

/**
 * Gateway-specific metrics snapshot exposed by `GatewayObservability`.
 *
 * @see Requirement 10.3
 */
export interface IGatewayMetricsSnapshot {
  /** Current number of messages in the outbound queue */
  outboundQueueDepth: number;
  /** Total successful deliveries since last reset */
  deliverySuccessCount: number;
  /** Total failed deliveries since last reset */
  deliveryFailureCount: number;
  /** Delivery success rate (0–1) */
  deliverySuccessRate: number;
  /** Delivery failure rate (0–1) */
  deliveryFailureRate: number;
  /** Average delivery latency in milliseconds */
  averageDeliveryLatencyMs: number;
  /** Total spam rejections since last reset */
  spamRejectionCount: number;
  /** Spam rejection rate (0–1, relative to total inbound) */
  spamRejectionRate: number;
  /** Total inbound messages processed since last reset */
  totalInboundProcessed: number;
}

/**
 * Centralised observability for the Email Gateway.
 *
 * Integrates with the existing `IMessageLogger`, `IMessageMetricsCollector`,
 * and `AlertMonitor` services so that all gateway events flow through the
 * same infrastructure used by the rest of BrightChain.
 *
 * @see Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */
export class GatewayObservability {
  // Gateway-specific counters (Req 10.3)
  private _outboundQueueDepth = 0;
  private _deliverySuccessCount = 0;
  private _deliveryFailureCount = 0;
  private _totalDeliveryLatencyMs = 0;
  private _spamRejectionCount = 0;
  private _totalInboundProcessed = 0;

  constructor(
    private readonly logger: IMessageLogger,
    private readonly metrics: IMessageMetricsCollector,
    private readonly alertMonitor: AlertMonitor,
  ) {}

  // ── Outbound delivery logging (Req 10.1) ──────────────────────────

  /**
   * Log an outbound delivery attempt.
   *
   * Delegates to `IMessageLogger.logMessageCreated` for consistent logging
   * and records the attempt in the metrics collector.
   *
   * @see Requirement 10.1
   */
  logOutboundAttempt(
    recipient: string,
    statusCode: number,
    retryCount: number,
    timestamp: Date,
  ): void {
    // Use the existing logger infrastructure (Req 10.4)
    this.logger.logMessageCreated(
      `outbound:${recipient}:${timestamp.toISOString()}`,
      'gateway-outbound',
      1,
    );
    this.logger.logRoutingDecision(
      `outbound:${recipient}`,
      `smtp-status:${statusCode}:retry:${retryCount}`,
      1,
    );

    // Track success/failure in metrics (Req 10.3)
    if (statusCode >= 200 && statusCode < 300) {
      this._deliverySuccessCount++;
      this.metrics.recordMessageDelivered(0);
    } else {
      this._deliveryFailureCount++;
      this.metrics.recordMessageFailed();
    }

    this.metrics.recordMessageSent();
  }

  // ── Inbound processing logging (Req 10.2) ─────────────────────────

  /**
   * Log an inbound email processing event.
   *
   * @see Requirement 10.2
   */
  logInboundProcessing(
    sender: string,
    recipient: string,
    spamScore: number,
    authResults: IEmailAuthenticationResult,
    accepted: boolean,
  ): void {
    this._totalInboundProcessed++;

    const messageId = `inbound:${sender}->${recipient}:${Date.now()}`;

    // Log via existing logger (Req 10.4)
    this.logger.logMessageCreated(messageId, sender, 1);
    this.logger.logRoutingDecision(
      messageId,
      `spam:${spamScore}|spf:${authResults.spf.status}|dkim:${authResults.dkim.status}|dmarc:${authResults.dmarc.status}|${accepted ? 'accepted' : 'rejected'}`,
      1,
    );

    if (!accepted) {
      this.logger.logDeliveryFailure(messageId, recipient, 'rejected');
    }
  }

  // ── Metrics recording (Req 10.3) ──────────────────────────────────

  /**
   * Record the current outbound queue depth.
   *
   * @see Requirement 10.3
   */
  recordQueueDepth(depth: number): void {
    this._outboundQueueDepth = depth;
    this.metrics.recordStorageUtilization(depth);
  }

  /**
   * Record a successful delivery and its latency.
   *
   * @see Requirement 10.3
   */
  recordDeliverySuccess(latencyMs?: number): void {
    this._deliverySuccessCount++;
    if (latencyMs !== undefined) {
      this._totalDeliveryLatencyMs += latencyMs;
      this.metrics.recordMessageDelivered(latencyMs);
    } else {
      this.metrics.recordMessageDelivered(0);
    }
  }

  /**
   * Record a delivery failure.
   *
   * @see Requirement 10.3
   */
  recordDeliveryFailure(): void {
    this._deliveryFailureCount++;
    this.metrics.recordMessageFailed();
  }

  /**
   * Record delivery latency in milliseconds.
   *
   * @see Requirement 10.3
   */
  recordDeliveryLatency(ms: number): void {
    this._totalDeliveryLatencyMs += ms;
    this.metrics.recordMessageDelivered(ms);
  }

  /**
   * Record a spam rejection.
   *
   * @see Requirement 10.3
   */
  recordSpamRejection(): void {
    this._spamRejectionCount++;
    this._totalInboundProcessed++;
    this.metrics.recordMessageFailed();
  }

  // ── Alert emission (Req 10.5) ─────────────────────────────────────

  /**
   * Emit an alert when delivery fails after all retries are exhausted.
   *
   * Delegates to the existing `AlertMonitor` for consistent alerting.
   *
   * @see Requirement 10.5
   */
  alertDeliveryExhausted(
    messageId: string,
    recipient: string,
    retryCount: number,
  ): void {
    // Use AlertMonitor's failure rate check to trigger handler (Req 10.5)
    this.alertMonitor.checkFailureRate(
      this._deliverySuccessCount,
      this._deliveryFailureCount,
    );
    // Also emit a specific event-emission alert with context
    this.alertMonitor.checkEventEmission(
      `Delivery exhausted: messageId=${messageId}, recipient=${recipient}, retries=${retryCount}`,
    );

    // Log via existing logger
    this.logger.logDeliveryFailure(
      messageId,
      recipient,
      `retries exhausted after ${retryCount} attempts`,
    );
  }

  // ── Metrics snapshot (Req 10.3) ───────────────────────────────────

  /**
   * Return a point-in-time snapshot of all gateway-specific metrics.
   *
   * @see Requirement 10.3
   */
  getMetricsSnapshot(): IGatewayMetricsSnapshot {
    const totalDeliveries =
      this._deliverySuccessCount + this._deliveryFailureCount;
    const deliveredCount = this._deliverySuccessCount;

    return {
      outboundQueueDepth: this._outboundQueueDepth,
      deliverySuccessCount: this._deliverySuccessCount,
      deliveryFailureCount: this._deliveryFailureCount,
      deliverySuccessRate:
        totalDeliveries > 0 ? deliveredCount / totalDeliveries : 0,
      deliveryFailureRate:
        totalDeliveries > 0 ? this._deliveryFailureCount / totalDeliveries : 0,
      averageDeliveryLatencyMs:
        deliveredCount > 0 ? this._totalDeliveryLatencyMs / deliveredCount : 0,
      spamRejectionCount: this._spamRejectionCount,
      spamRejectionRate:
        this._totalInboundProcessed > 0
          ? this._spamRejectionCount / this._totalInboundProcessed
          : 0,
      totalInboundProcessed: this._totalInboundProcessed,
    };
  }

  /**
   * Reset all gateway-specific counters.
   */
  reset(): void {
    this._outboundQueueDepth = 0;
    this._deliverySuccessCount = 0;
    this._deliveryFailureCount = 0;
    this._totalDeliveryLatencyMs = 0;
    this._spamRejectionCount = 0;
    this._totalInboundProcessed = 0;
    this.metrics.reset();
  }
}
