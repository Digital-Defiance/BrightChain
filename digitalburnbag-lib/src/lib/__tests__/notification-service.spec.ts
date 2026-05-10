import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import type {
  INotification,
  INotificationPreferences,
} from '../interfaces/bases/notification';
import type { INotificationRepository } from '../interfaces/services/notification-repository';
import {
  INotificationServiceDeps,
  NotificationService,
} from '../services/notification-service';

// ── Helpers ─────────────────────────────────────────────────────────

function makeMockRepository(): jest.Mocked<INotificationRepository<string>> {
  return {
    queueNotification: jest.fn().mockResolvedValue(undefined),
    getQueuedNotifications: jest.fn().mockResolvedValue([]),
    markDelivered: jest.fn().mockResolvedValue(undefined),
    getPreferences: jest.fn().mockResolvedValue(null),
    setPreferences: jest.fn().mockResolvedValue(undefined),
  };
}

function makeMockDeps(): jest.Mocked<INotificationServiceDeps<string>> {
  return {
    sendWebSocket: jest.fn().mockResolvedValue(true),
    onAuditLog: jest.fn().mockResolvedValue(undefined),
  };
}

function makeNotification(
  overrides: Partial<INotification<string>> = {},
): INotification<string> {
  return {
    id: 'notif-1',
    type: 'share_accessed',
    targetId: 'file-1',
    actorId: 'actor-1',
    actorName: 'Alice',
    timestamp: '2024-06-01T00:00:00Z',
    metadata: {},
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('NotificationService', () => {
  let mockRepo: jest.Mocked<INotificationRepository<string>>;
  let mockDeps: jest.Mocked<INotificationServiceDeps<string>>;
  let service: NotificationService<string>;

  beforeEach(() => {
    mockRepo = makeMockRepository();
    mockDeps = makeMockDeps();
    service = new NotificationService(mockRepo, mockDeps);
  });

  // ── notifyUser ──────────────────────────────────────────────────

  describe('notifyUser', () => {
    it('should send via WebSocket when user is online and NOT queue', async () => {
      mockDeps.sendWebSocket.mockResolvedValue(true);
      const notification = makeNotification();

      await service.notifyUser('user-1', notification);

      expect(mockDeps.sendWebSocket).toHaveBeenCalledWith(
        'user-1',
        notification,
      );
      expect(mockRepo.queueNotification).not.toHaveBeenCalled();
    });

    it('should queue notification when user is offline', async () => {
      mockDeps.sendWebSocket.mockResolvedValue(false);
      const notification = makeNotification();

      await service.notifyUser('user-1', notification);

      expect(mockDeps.sendWebSocket).toHaveBeenCalledWith(
        'user-1',
        notification,
      );
      expect(mockRepo.queueNotification).toHaveBeenCalledWith(
        'user-1',
        notification,
      );
    });

    it('should log audit entry when onAuditLog is provided', async () => {
      mockDeps.sendWebSocket.mockResolvedValue(true);
      const notification = makeNotification({ type: 'file_downloaded' });

      await service.notifyUser('user-1', notification);

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.OwnerNotified,
          actorId: 'user-1',
          targetId: notification.targetId,
          targetType: 'file',
          metadata: expect.objectContaining({
            notificationType: 'file_downloaded',
            delivered: true,
          }),
        }),
      );
    });
  });

  // ── queueNotification ───────────────────────────────────────────

  describe('queueNotification', () => {
    it('should store notification via repository', async () => {
      const notification = makeNotification();

      await service.queueNotification('user-1', notification);

      expect(mockRepo.queueNotification).toHaveBeenCalledWith(
        'user-1',
        notification,
      );
    });
  });

  // ── getQueuedNotifications ──────────────────────────────────────

  describe('getQueuedNotifications', () => {
    it('should return queued notifications on reconnect', async () => {
      const queued = [
        makeNotification({ id: 'n-1' }),
        makeNotification({ id: 'n-2' }),
      ];
      mockRepo.getQueuedNotifications.mockResolvedValue(queued);

      const result = await service.getQueuedNotifications('user-1');

      expect(mockRepo.getQueuedNotifications).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(queued);
      expect(result).toHaveLength(2);
    });
  });

  // ── markDelivered ───────────────────────────────────────────────

  describe('markDelivered', () => {
    it('should delegate to repository', async () => {
      await service.markDelivered(['n-1', 'n-2']);

      expect(mockRepo.markDelivered).toHaveBeenCalledWith(['n-1', 'n-2']);
    });
  });

  // ── getPreferences ──────────────────────────────────────────────

  describe('getPreferences', () => {
    it('should return defaults when no preferences are stored', async () => {
      mockRepo.getPreferences.mockResolvedValue(null);

      const prefs = await service.getPreferences('file-1', 'owner-1');

      expect(mockRepo.getPreferences).toHaveBeenCalledWith('file-1', 'owner-1');
      expect(prefs).toEqual({
        enabled: true,
        accessTypes: [],
        channels: ['websocket'],
      });
    });

    it('should return stored preferences when they exist', async () => {
      const stored: INotificationPreferences = {
        enabled: false,
        accessTypes: ['download'],
        channels: ['email'],
      };
      mockRepo.getPreferences.mockResolvedValue(stored);

      const prefs = await service.getPreferences('file-1', 'owner-1');

      expect(prefs).toEqual(stored);
    });
  });

  // ── setPreferences ──────────────────────────────────────────────

  describe('setPreferences', () => {
    it('should store preferences via repository', async () => {
      const update: Partial<INotificationPreferences> = {
        enabled: false,
        channels: ['email'],
      };

      await service.setPreferences('file-1', 'owner-1', update);

      expect(mockRepo.setPreferences).toHaveBeenCalledWith(
        'file-1',
        'owner-1',
        update,
      );
    });
  });
});
