import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { IMessageMetadataStore } from '../../interfaces/messaging/messageMetadataStore';
import { DeliveryTimeoutService } from './deliveryTimeoutService';

describe('DeliveryTimeoutService', () => {
  let service: DeliveryTimeoutService;
  let mockStore: jest.Mocked<IMessageMetadataStore>;

  beforeEach(() => {
    mockStore = {
      updateDeliveryStatus: jest.fn(),
    } as unknown as jest.Mocked<IMessageMetadataStore>;

    service = new DeliveryTimeoutService(mockStore, {
      timeoutMs: 100,
      checkIntervalMs: 50,
    });
  });

  afterEach(() => {
    service.stop();
  });

  it('should track delivery attempts', () => {
    service.trackDeliveryAttempt('msg1', 'recipient1');

    expect(service.getAttemptCount('msg1', 'recipient1')).toBe(1);
  });

  it('should increment attempt count on multiple tracks', () => {
    service.trackDeliveryAttempt('msg1', 'recipient1');
    service.trackDeliveryAttempt('msg1', 'recipient1');
    service.trackDeliveryAttempt('msg1', 'recipient1');

    expect(service.getAttemptCount('msg1', 'recipient1')).toBe(3);
  });

  it('should clear delivery attempts', () => {
    service.trackDeliveryAttempt('msg1', 'recipient1');
    expect(service.getAttemptCount('msg1', 'recipient1')).toBe(1);

    service.clearDeliveryAttempt('msg1', 'recipient1');
    expect(service.getAttemptCount('msg1', 'recipient1')).toBe(0);
  });

  it('should mark delivery as FAILED after timeout', async () => {
    service.trackDeliveryAttempt('msg1', 'recipient1');
    service.start();

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockStore.updateDeliveryStatus).toHaveBeenCalledWith(
      'msg1',
      'recipient1',
      MessageDeliveryStatus.FAILED,
    );
  });

  it('should emit failure event on timeout', async () => {
    const failureCallback = jest.fn();
    service.onDeliveryFailure(failureCallback);

    service.trackDeliveryAttempt('msg1', 'recipient1');
    service.start();

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(failureCallback).toHaveBeenCalledWith('msg1', 'recipient1');
  });

  it('should not timeout if cleared before timeout', async () => {
    service.trackDeliveryAttempt('msg1', 'recipient1');
    service.start();

    await new Promise((resolve) => setTimeout(resolve, 50));
    service.clearDeliveryAttempt('msg1', 'recipient1');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockStore.updateDeliveryStatus).not.toHaveBeenCalled();
  });

  it('should track multiple deliveries independently', () => {
    service.trackDeliveryAttempt('msg1', 'recipient1');
    service.trackDeliveryAttempt('msg2', 'recipient2');

    expect(service.getAttemptCount('msg1', 'recipient1')).toBe(1);
    expect(service.getAttemptCount('msg2', 'recipient2')).toBe(1);
  });

  it('should return all tracked attempts', () => {
    service.trackDeliveryAttempt('msg1', 'recipient1');
    service.trackDeliveryAttempt('msg2', 'recipient2');

    const attempts = service.getTrackedAttempts();
    expect(attempts).toHaveLength(2);
    expect(attempts[0].messageId).toBe('msg1');
    expect(attempts[1].messageId).toBe('msg2');
  });

  it('should stop checking when stopped', async () => {
    service.trackDeliveryAttempt('msg1', 'recipient1');
    service.start();
    service.stop();

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(mockStore.updateDeliveryStatus).not.toHaveBeenCalled();
  });
});
