export interface IAlertThresholds {
  maxFailureRate: number;
  maxDeliveryLatencyMs: number;
  maxStorageUtilizationBytes: number;
  maxEventEmissionLatencyMs: number;
}

export const DEFAULT_ALERT_THRESHOLDS: IAlertThresholds = {
  maxFailureRate: 0.1, // 10%
  maxDeliveryLatencyMs: 5000,
  maxStorageUtilizationBytes: 1073741824, // 1GB
  maxEventEmissionLatencyMs: 1000,
};

export interface IAlertHandler {
  onHighFailureRate(rate: number): void;
  onHighLatency(latencyMs: number): void;
  onStorageCapacity(utilizationBytes: number): void;
  onEventEmissionFailure(error: string): void;
}

export class AlertMonitor {
  constructor(
    private readonly thresholds: IAlertThresholds = DEFAULT_ALERT_THRESHOLDS,
    private readonly handler?: IAlertHandler
  ) {}

  checkFailureRate(delivered: number, failed: number): void {
    const total = delivered + failed;
    if (total > 0) {
      const rate = failed / total;
      if (rate > this.thresholds.maxFailureRate) {
        this.handler?.onHighFailureRate(rate);
      }
    }
  }

  checkDeliveryLatency(latencyMs: number): void {
    if (latencyMs > this.thresholds.maxDeliveryLatencyMs) {
      this.handler?.onHighLatency(latencyMs);
    }
  }

  checkStorageUtilization(bytes: number): void {
    if (bytes > this.thresholds.maxStorageUtilizationBytes) {
      this.handler?.onStorageCapacity(bytes);
    }
  }

  checkEventEmission(error: string): void {
    this.handler?.onEventEmissionFailure(error);
  }
}
