/**
 * Integration tests for:
 * - Notification routes (GET /notifications, POST /notifications/read)
 * - Storage quota route (GET /quota)
 * - Canary GET routes (GET /canary/bindings, GET /canary/recipients)
 */
import { authenticatedAgent, createTestUser } from './helpers';
import { createTestServer } from './test-server';

describe('Notifications', () => {
  const user = createTestUser();

  it('should get queued notifications', async () => {
    const { app, deps } = createTestServer();
    deps.notificationService.getQueuedNotifications.mockResolvedValueOnce([
      { id: 'n-1', type: 'FileShared', message: 'A file was shared with you' },
    ]);
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/notifications').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('id', 'n-1');
    expect(deps.notificationService.getQueuedNotifications).toHaveBeenCalled();
  });

  it('should return empty array when no notifications', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/notifications').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it('should mark notifications as read', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    await agent
      .post('/notifications/read')
      .send({ ids: ['n-1', 'n-2'] })
      .expect(204);

    expect(deps.notificationService.markDelivered).toHaveBeenCalledWith([
      'n-1',
      'n-2',
    ]);
  });
});

describe('Storage Quota', () => {
  const user = createTestUser();

  it('should get storage usage', async () => {
    const { app, deps } = createTestServer();
    deps.storageQuotaService.getUsage.mockResolvedValueOnce({
      usedBytes: 512000,
      quotaBytes: 1073741824,
    });
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/quota').expect(200);

    expect(res.body).toHaveProperty('usedBytes', 512000);
    expect(res.body).toHaveProperty('quotaBytes', 1073741824);
    expect(deps.storageQuotaService.getUsage).toHaveBeenCalledWith(user.id);
  });
});

describe('Canary GET routes', () => {
  const user = createTestUser();

  it('should list canary bindings', async () => {
    const { app, deps } = createTestServer();
    deps.canaryService.getBindings.mockResolvedValueOnce([
      { id: 'binding-1', condition: 'DEAD_MAN_SWITCH', action: 'DeleteFiles' },
    ]);
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/canary/bindings').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('id', 'binding-1');
    expect(deps.canaryService.getBindings).toHaveBeenCalledWith(user.id);
  });

  it('should return empty array when no bindings', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/canary/bindings').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it('should list recipient lists', async () => {
    const { app, deps } = createTestServer();
    deps.canaryService.getRecipientLists.mockResolvedValueOnce([
      { id: 'rlist-1', name: 'Emergency Contacts' },
    ]);
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/canary/recipients').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('name', 'Emergency Contacts');
    expect(deps.canaryService.getRecipientLists).toHaveBeenCalledWith(user.id);
  });

  it('should return empty array when no recipient lists', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/canary/recipients').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });
});
