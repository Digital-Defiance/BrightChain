import type { IEmailAuthenticationResult } from '@brightchain/brightchain-lib';
import {
  AlertMonitor,
  DEFAULT_ALERT_THRESHOLDS,
  type IAlertHandler,
  type IMessageLogger,
  type IMessageMetricsCollector,
  MessageLogger,
  MessageLogLevel,
  MessageMetricsCollector,
} from '@brightchain/brightchain-lib';
import { GatewayObservability } from './gatewayObservability';

function makeAuthResult(
  overrides?: Partial<IEmailAuthenticationResult>,
): IEmailAuthenticationResult {
  return {
    spf: { status: 'pass' },
    dkim: { status: 'pass' },
    dmarc: { status: 'pass' },
    ...overrides,
  };
}

describe('GatewayObservability', () => {
  let logger: IMessageLogger;
  let metrics: IMessageMetricsCollector;
  let alertHandler: IAlertHandler;
  let alertMonitor: AlertMonitor;
  let obs: GatewayObservability;

  beforeEach(() => {
    const logSpy = jest.fn();
    logger = new MessageLogger(MessageLogLevel.DEBUG, logSpy);
    jest.spyOn(logger, 'logMessageCreated');
    jest.spyOn(logger, 'logRoutingDecision');
    jest.spyOn(logger, 'logDeliveryFailure');

    metrics = new MessageMetricsCollector();
    jest.spyOn(metrics, 'recordMessageSent');
    jest.spyOn(metrics, 'recordMessageDelivered');
    jest.spyOn(metrics, 'recordMessageFailed');
    jest.spyOn(metrics, 'recordStorageUtilization');
    jest.spyOn(metrics, 'reset');

    alertHandler = {
      onHighFailureRate: jest.fn(),
      onHighLatency: jest.fn(),
      onStorageCapacity: jest.fn(),
      onEventEmissionFailure: jest.fn(),
    };
    alertMonitor = new AlertMonitor(DEFAULT_ALERT_THRESHOLDS, alertHandler);

    obs = new GatewayObservability(logger, metrics, alertMonitor);
  });

  // ── Req 10.1: Outbound delivery logging ───────────────────────────

  describe('logOutboundAttempt', () => {
    it('should log via MessageLogger for a successful delivery', () => {
      obs.logOutboundAttempt('alice@example.com', 250, 0, new Date());

      expect(logger.logMessageCreated).toHaveBeenCalled();
      expect(logger.logRoutingDecision).toHaveBeenCalled();
    });

    it('should record success metrics for 2xx status codes', () => {
      obs.logOutboundAttempt('alice@example.com', 250, 0, new Date());

      expect(metrics.recordMessageDelivered).toHaveBeenCalled();
      expect(metrics.recordMessageSent).toHaveBeenCalled();
    });

    it('should record failure metrics for non-2xx status codes', () => {
      obs.logOutboundAttempt('alice@example.com', 450, 1, new Date());

      expect(metrics.recordMessageFailed).toHaveBeenCalled();
      expect(metrics.recordMessageSent).toHaveBeenCalled();
    });

    it('should record failure metrics for 5xx status codes', () => {
      obs.logOutboundAttempt('alice@example.com', 550, 0, new Date());

      expect(metrics.recordMessageFailed).toHaveBeenCalled();
    });
  });

  // ── Req 10.2: Inbound processing logging ──────────────────────────

  describe('logInboundProcessing', () => {
    it('should log accepted inbound email via MessageLogger', () => {
      obs.logInboundProcessing(
        'bob@external.com',
        'alice@brightchain.org',
        1.2,
        makeAuthResult(),
        true,
      );

      expect(logger.logMessageCreated).toHaveBeenCalled();
      expect(logger.logRoutingDecision).toHaveBeenCalled();
      expect(logger.logDeliveryFailure).not.toHaveBeenCalled();
    });

    it('should log rejected inbound email with delivery failure', () => {
      obs.logInboundProcessing(
        'spammer@evil.com',
        'alice@brightchain.org',
        15.0,
        makeAuthResult({ dmarc: { status: 'fail' } }),
        false,
      );

      expect(logger.logDeliveryFailure).toHaveBeenCalled();
    });

    it('should increment totalInboundProcessed counter', () => {
      obs.logInboundProcessing(
        'bob@external.com',
        'alice@brightchain.org',
        0.5,
        makeAuthResult(),
        true,
      );

      const snap = obs.getMetricsSnapshot();
      expect(snap.totalInboundProcessed).toBe(1);
    });
  });

  // ── Req 10.3: Metrics exposure ────────────────────────────────────

  describe('metrics recording', () => {
    it('should track outbound queue depth', () => {
      obs.recordQueueDepth(42);

      const snap = obs.getMetricsSnapshot();
      expect(snap.outboundQueueDepth).toBe(42);
      expect(metrics.recordStorageUtilization).toHaveBeenCalledWith(42);
    });

    it('should track delivery success with latency', () => {
      obs.recordDeliverySuccess(150);
      obs.recordDeliverySuccess(250);

      const snap = obs.getMetricsSnapshot();
      expect(snap.deliverySuccessCount).toBe(2);
      expect(snap.averageDeliveryLatencyMs).toBe(200);
    });

    it('should track delivery failure', () => {
      obs.recordDeliveryFailure();

      const snap = obs.getMetricsSnapshot();
      expect(snap.deliveryFailureCount).toBe(1);
      expect(metrics.recordMessageFailed).toHaveBeenCalled();
    });

    it('should record delivery latency', () => {
      obs.recordDeliveryLatency(300);

      expect(metrics.recordMessageDelivered).toHaveBeenCalledWith(300);
    });

    it('should track spam rejections', () => {
      obs.recordSpamRejection();
      obs.recordSpamRejection();

      const snap = obs.getMetricsSnapshot();
      expect(snap.spamRejectionCount).toBe(2);
      expect(snap.totalInboundProcessed).toBe(2);
    });

    it('should compute correct rates', () => {
      obs.recordDeliverySuccess(100);
      obs.recordDeliverySuccess(200);
      obs.recordDeliveryFailure();

      const snap = obs.getMetricsSnapshot();
      expect(snap.deliverySuccessRate).toBeCloseTo(2 / 3);
      expect(snap.deliveryFailureRate).toBeCloseTo(1 / 3);
    });

    it('should compute spam rejection rate', () => {
      obs.logInboundProcessing(
        'a@b.com',
        'c@d.com',
        0.5,
        makeAuthResult(),
        true,
      );
      obs.recordSpamRejection();

      const snap = obs.getMetricsSnapshot();
      // 1 spam rejection out of 2 total inbound (1 logged + 1 rejection)
      expect(snap.spamRejectionRate).toBeCloseTo(0.5);
    });

    it('should return zero rates when no data', () => {
      const snap = obs.getMetricsSnapshot();
      expect(snap.deliverySuccessRate).toBe(0);
      expect(snap.deliveryFailureRate).toBe(0);
      expect(snap.averageDeliveryLatencyMs).toBe(0);
      expect(snap.spamRejectionRate).toBe(0);
    });
  });

  // ── Req 10.5: Alert emission ──────────────────────────────────────

  describe('alertDeliveryExhausted', () => {
    it('should emit alert via AlertMonitor', () => {
      obs.alertDeliveryExhausted('msg-123', 'alice@example.com', 5);

      expect(alertHandler.onEventEmissionFailure).toHaveBeenCalledWith(
        expect.stringContaining('msg-123'),
      );
      expect(alertHandler.onEventEmissionFailure).toHaveBeenCalledWith(
        expect.stringContaining('alice@example.com'),
      );
    });

    it('should log delivery failure via MessageLogger', () => {
      obs.alertDeliveryExhausted('msg-456', 'bob@example.com', 3);

      expect(logger.logDeliveryFailure).toHaveBeenCalledWith(
        'msg-456',
        'bob@example.com',
        expect.stringContaining('retries exhausted'),
      );
    });

    it('should check failure rate on AlertMonitor', () => {
      jest.spyOn(alertMonitor, 'checkFailureRate');
      obs.alertDeliveryExhausted('msg-789', 'carol@example.com', 5);

      expect(alertMonitor.checkFailureRate).toHaveBeenCalled();
    });
  });

  // ── Reset ─────────────────────────────────────────────────────────

  describe('reset', () => {
    it('should reset all gateway counters and underlying metrics', () => {
      obs.recordDeliverySuccess(100);
      obs.recordDeliveryFailure();
      obs.recordSpamRejection();
      obs.recordQueueDepth(10);

      obs.reset();

      const snap = obs.getMetricsSnapshot();
      expect(snap.outboundQueueDepth).toBe(0);
      expect(snap.deliverySuccessCount).toBe(0);
      expect(snap.deliveryFailureCount).toBe(0);
      expect(snap.spamRejectionCount).toBe(0);
      expect(snap.totalInboundProcessed).toBe(0);
      expect(metrics.reset).toHaveBeenCalled();
    });
  });
});
