import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { MessageErrorType } from '../../enumerations/messaging/messageErrorType';
import { MessageError } from '../../errors/messaging/messageError';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { MessageRouter } from './messageRouter';

describe('MessageRouter Error Handling', () => {
  let router: MessageRouter;
  let metadataStore: MemoryMessageMetadataStore;

  beforeEach(() => {
    metadataStore = new MemoryMessageMetadataStore();
    router = new MessageRouter(metadataStore, 'local-node', {
      routingTimeoutMs: 100,
    });
  });

  it('should handle routing timeout', async () => {
    jest
      .spyOn(metadataStore, 'updateDeliveryStatus')
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200)),
      );

    try {
      await router.routeMessage('msg1', ['recipient1']);
      fail('Should have thrown MessageError');
    } catch (error) {
      expect(error).toBeInstanceOf(MessageError);
      expect((error as MessageError).errorType).toBe(
        MessageErrorType.DELIVERY_FAILED,
      );
    }
  });

  it('should throw when all recipients fail', async () => {
    jest
      .spyOn(metadataStore, 'updateDeliveryStatus')
      .mockRejectedValue(new Error('Network error'));

    await expect(
      router.routeMessage('msg1', ['recipient1', 'recipient2']),
    ).rejects.toThrow(MessageError);
    await expect(
      router.routeMessage('msg1', ['recipient1', 'recipient2']),
    ).rejects.toMatchObject({
      errorType: MessageErrorType.DELIVERY_FAILED,
    });
  });

  it('should mark failed recipients as FAILED', async () => {
    const updateSpy = jest.spyOn(metadataStore, 'updateDeliveryStatus');
    updateSpy.mockRejectedValueOnce(new Error('Network error'));
    updateSpy.mockResolvedValueOnce(undefined);

    try {
      await router.routeMessage('msg1', ['recipient1']);
      fail('Should have thrown MessageError');
    } catch (error) {
      expect(error).toBeInstanceOf(MessageError);
      expect(updateSpy).toHaveBeenCalledWith(
        'msg1',
        'recipient1',
        MessageDeliveryStatus.FAILED,
      );
    }
  });

  it('should succeed with partial failures', async () => {
    const updateSpy = jest.spyOn(metadataStore, 'updateDeliveryStatus');
    updateSpy.mockResolvedValueOnce(undefined);
    updateSpy.mockRejectedValueOnce(new Error('Network error'));
    updateSpy.mockResolvedValueOnce(undefined);

    const result = await router.routeMessage('msg1', [
      'recipient1',
      'recipient2',
    ]);
    expect(result.successfulRecipients).toContain('recipient1');
    expect(result.failedRecipients).toContain('recipient2');
  });
});
