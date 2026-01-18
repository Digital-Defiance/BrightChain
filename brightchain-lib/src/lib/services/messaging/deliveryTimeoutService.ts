import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { IMessageMetadata } from '../../interfaces/messaging/messageMetadata';

/**
 * Delivery timeout configuration
 */
export interface DeliveryTimeoutConfig {
  /** Timeout duration in milliseconds (default: 30000 = 30 seconds) */
  timeoutMs: number;
  /** Check interval in milliseconds (default: 5000 = 5 seconds) */
  checkIntervalMs: number;
}

/**
 * Delivery attempt tracking
 */
interface DeliveryAttempt {
  messageId: string;
  recipientId: string;
  timestamp: Date;
  attempts: number;
}

/**
 * Service for handling message delivery timeouts
 * Tracks delivery attempts and marks messages as FAILED after timeout
 */
export class DeliveryTimeoutService {
  private deliveryAttempts = new Map<string, DeliveryAttempt>();
  private checkInterval?: NodeJS.Timeout;
  private readonly config: DeliveryTimeoutConfig;
  private failureCallback?: (messageId: string, recipientId: string) => void;

  constructor(
    private readonly metadataStore: IMessageMetadataStore,
    config?: Partial<DeliveryTimeoutConfig>
  ) {
    this.config = {
      timeoutMs: config?.timeoutMs ?? 30000,
      checkIntervalMs: config?.checkIntervalMs ?? 5000,
    };
  }

  /**
   * Track delivery attempt for a message
   */
  trackDeliveryAttempt(messageId: string, recipientId: string): void {
    const key = `${messageId}:${recipientId}`;
    const existing = this.deliveryAttempts.get(key);

    if (existing) {
      existing.attempts++;
      existing.timestamp = new Date();
    } else {
      this.deliveryAttempts.set(key, {
        messageId,
        recipientId,
        timestamp: new Date(),
        attempts: 1,
      });
    }
  }

  /**
   * Clear delivery attempt tracking for a message
   */
  clearDeliveryAttempt(messageId: string, recipientId: string): void {
    const key = `${messageId}:${recipientId}`;
    this.deliveryAttempts.delete(key);
  }

  /**
   * Register callback for delivery failures
   */
  onDeliveryFailure(callback: (messageId: string, recipientId: string) => void): void {
    this.failureCallback = callback;
  }

  /**
   * Start monitoring for delivery timeouts
   */
  start(): void {
    if (this.checkInterval) {
      return;
    }

    this.checkInterval = setInterval(() => {
      this.checkTimeouts();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop monitoring for delivery timeouts
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  /**
   * Check for timed out deliveries
   */
  private async checkTimeouts(): Promise<void> {
    const now = new Date();
    const timedOut: Array<{ messageId: string; recipientId: string }> = [];

    for (const [key, attempt] of this.deliveryAttempts.entries()) {
      const elapsed = now.getTime() - attempt.timestamp.getTime();
      
      if (elapsed > this.config.timeoutMs) {
        timedOut.push({
          messageId: attempt.messageId,
          recipientId: attempt.recipientId,
        });
      }
    }

    for (const { messageId, recipientId } of timedOut) {
      await this.handleTimeout(messageId, recipientId);
    }
  }

  /**
   * Handle delivery timeout
   */
  private async handleTimeout(messageId: string, recipientId: string): Promise<void> {
    try {
      await this.metadataStore.updateDeliveryStatus(
        messageId,
        recipientId,
        MessageDeliveryStatus.FAILED
      );

      this.clearDeliveryAttempt(messageId, recipientId);

      if (this.failureCallback) {
        this.failureCallback(messageId, recipientId);
      }
    } catch (error) {
      // Log error but don't throw to avoid stopping the check loop
      console.error(`Failed to handle timeout for ${messageId}:${recipientId}`, error);
    }
  }

  /**
   * Get current delivery attempts count
   */
  getAttemptCount(messageId: string, recipientId: string): number {
    const key = `${messageId}:${recipientId}`;
    return this.deliveryAttempts.get(key)?.attempts ?? 0;
  }

  /**
   * Get all tracked delivery attempts
   */
  getTrackedAttempts(): Array<{ messageId: string; recipientId: string; attempts: number; timestamp: Date }> {
    return Array.from(this.deliveryAttempts.values()).map(attempt => ({
      messageId: attempt.messageId,
      recipientId: attempt.recipientId,
      attempts: attempt.attempts,
      timestamp: attempt.timestamp,
    }));
  }
}
