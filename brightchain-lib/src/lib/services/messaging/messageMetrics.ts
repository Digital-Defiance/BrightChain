export interface IMessageMetrics {
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  totalDeliveryLatencyMs: number;
  eventsEmitted: number;
  queriesExecuted: number;
  totalQueryLatencyMs: number;
  storageUtilizationBytes: number;
}

export interface IMessageMetricsCollector {
  recordMessageSent(): void;
  recordMessageDelivered(latencyMs: number): void;
  recordMessageFailed(): void;
  recordEventEmitted(latencyMs: number): void;
  recordQuery(latencyMs: number): void;
  recordStorageUtilization(bytes: number): void;
  getMetrics(): IMessageMetrics;
  reset(): void;
}

export class MessageMetricsCollector implements IMessageMetricsCollector {
  private metrics: IMessageMetrics = {
    messagesSent: 0,
    messagesDelivered: 0,
    messagesFailed: 0,
    totalDeliveryLatencyMs: 0,
    eventsEmitted: 0,
    queriesExecuted: 0,
    totalQueryLatencyMs: 0,
    storageUtilizationBytes: 0,
  };

  recordMessageSent(): void {
    this.metrics.messagesSent++;
  }

  recordMessageDelivered(latencyMs: number): void {
    this.metrics.messagesDelivered++;
    this.metrics.totalDeliveryLatencyMs += latencyMs;
  }

  recordMessageFailed(): void {
    this.metrics.messagesFailed++;
  }

  recordEventEmitted(latencyMs: number): void {
    this.metrics.eventsEmitted++;
  }

  recordQuery(latencyMs: number): void {
    this.metrics.queriesExecuted++;
    this.metrics.totalQueryLatencyMs += latencyMs;
  }

  recordStorageUtilization(bytes: number): void {
    this.metrics.storageUtilizationBytes = bytes;
  }

  getMetrics(): IMessageMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      messagesSent: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      totalDeliveryLatencyMs: 0,
      eventsEmitted: 0,
      queriesExecuted: 0,
      totalQueryLatencyMs: 0,
      storageUtilizationBytes: 0,
    };
  }

  getAverageDeliveryLatency(): number {
    return this.metrics.messagesDelivered > 0
      ? this.metrics.totalDeliveryLatencyMs / this.metrics.messagesDelivered
      : 0;
  }

  getDeliverySuccessRate(): number {
    const total = this.metrics.messagesDelivered + this.metrics.messagesFailed;
    return total > 0 ? this.metrics.messagesDelivered / total : 0;
  }

  getAverageQueryLatency(): number {
    return this.metrics.queriesExecuted > 0
      ? this.metrics.totalQueryLatencyMs / this.metrics.queriesExecuted
      : 0;
  }
}
