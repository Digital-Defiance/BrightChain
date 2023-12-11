import { MessageMetricsCollector } from './messageMetrics';

describe('MessageMetricsCollector', () => {
  let collector: MessageMetricsCollector;

  beforeEach(() => {
    collector = new MessageMetricsCollector();
  });

  it('should track messages sent', () => {
    collector.recordMessageSent();
    collector.recordMessageSent();
    expect(collector.getMetrics().messagesSent).toBe(2);
  });

  it('should track messages delivered with latency', () => {
    collector.recordMessageDelivered(100);
    collector.recordMessageDelivered(200);
    expect(collector.getMetrics().messagesDelivered).toBe(2);
    expect(collector.getAverageDeliveryLatency()).toBe(150);
  });

  it('should track failed messages', () => {
    collector.recordMessageFailed();
    expect(collector.getMetrics().messagesFailed).toBe(1);
  });

  it('should calculate delivery success rate', () => {
    collector.recordMessageDelivered(100);
    collector.recordMessageDelivered(100);
    collector.recordMessageFailed();
    expect(collector.getDeliverySuccessRate()).toBeCloseTo(0.667, 2);
  });

  it('should track queries with latency', () => {
    collector.recordQuery(50);
    collector.recordQuery(150);
    expect(collector.getMetrics().queriesExecuted).toBe(2);
    expect(collector.getAverageQueryLatency()).toBe(100);
  });

  it('should track storage utilization', () => {
    collector.recordStorageUtilization(1024);
    expect(collector.getMetrics().storageUtilizationBytes).toBe(1024);
  });

  it('should reset metrics', () => {
    collector.recordMessageSent();
    collector.recordMessageDelivered(100);
    collector.reset();
    const metrics = collector.getMetrics();
    expect(metrics.messagesSent).toBe(0);
    expect(metrics.messagesDelivered).toBe(0);
  });
});
