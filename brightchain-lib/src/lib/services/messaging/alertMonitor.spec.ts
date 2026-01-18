import { AlertMonitor, DEFAULT_ALERT_THRESHOLDS, IAlertHandler } from './alertMonitor';

describe('AlertMonitor', () => {
  let monitor: AlertMonitor;
  let handler: IAlertHandler;

  beforeEach(() => {
    handler = {
      onHighFailureRate: jest.fn(),
      onHighLatency: jest.fn(),
      onStorageCapacity: jest.fn(),
      onEventEmissionFailure: jest.fn(),
    };
    monitor = new AlertMonitor(DEFAULT_ALERT_THRESHOLDS, handler);
  });

  it('should alert on high failure rate', () => {
    monitor.checkFailureRate(80, 20); // 20% failure rate
    expect(handler.onHighFailureRate).toHaveBeenCalledWith(0.2);
  });

  it('should not alert on acceptable failure rate', () => {
    monitor.checkFailureRate(95, 5); // 5% failure rate
    expect(handler.onHighFailureRate).not.toHaveBeenCalled();
  });

  it('should alert on high latency', () => {
    monitor.checkDeliveryLatency(6000);
    expect(handler.onHighLatency).toHaveBeenCalledWith(6000);
  });

  it('should not alert on acceptable latency', () => {
    monitor.checkDeliveryLatency(3000);
    expect(handler.onHighLatency).not.toHaveBeenCalled();
  });

  it('should alert on storage capacity', () => {
    monitor.checkStorageUtilization(2000000000); // 2GB
    expect(handler.onStorageCapacity).toHaveBeenCalledWith(2000000000);
  });

  it('should alert on event emission failure', () => {
    monitor.checkEventEmission('Connection lost');
    expect(handler.onEventEmissionFailure).toHaveBeenCalledWith('Connection lost');
  });
});
