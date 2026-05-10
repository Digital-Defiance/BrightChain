/**
 * E2E: ACL enforcement, sharing, and magnet URL tests
 */
import { authenticatedAgent, createTestUser } from './helpers';
import { createTestServer } from './test-server';

describe('E2E: ACL Enforcement', () => {
  const owner = createTestUser({ id: 'owner-1', username: 'owner' });
  const _viewer = createTestUser({ id: 'viewer-1', username: 'viewer' });

  it('should get ACL for a file', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    const res = await agent.get('/acl/file/file-1').expect(200);

    expect(res.body).toHaveProperty('entries');
    expect(res.body).toHaveProperty('source');
  });

  it('should set ACL on a file', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    await agent
      .put('/acl/file/file-1')
      .send({ entries: [{ principalId: 'viewer-1', level: 'Viewer' }] })
      .expect(200);

    expect(deps.aclService.setACL).toHaveBeenCalled();
  });

  it('should get effective permissions for a principal', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    const res = await agent
      .get('/acl/file/file-1/effective/viewer-1')
      .expect(200);

    expect(res.body).toHaveProperty('flags');
  });

  it('should create a custom permission set', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    const res = await agent
      .post('/acl/permission-sets')
      .send({ name: 'ReadOnly', flags: ['Read', 'Preview'] })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(deps.aclService.createPermissionSet).toHaveBeenCalled();
  });

  it('should list permission sets', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    const res = await agent.get('/acl/permission-sets').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('E2E: Internal Sharing', () => {
  const owner = createTestUser({ id: 'owner-1', username: 'owner' });

  it('should share a file with another user', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    await agent
      .post('/share/internal')
      .send({
        targetId: 'file-1',
        targetType: 'file',
        recipientId: 'user-2',
        permissionLevel: 'Viewer',
      })
      .expect(201);

    expect(deps.shareService.shareWithUser).toHaveBeenCalled();
  });

  it('should list items shared with me', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    const res = await agent.get('/share/shared-with-me').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get share audit trail', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    const res = await agent.get('/share/file-1/audit').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('E2E: External Sharing', () => {
  const owner = createTestUser({ id: 'owner-1', username: 'owner' });

  it('should create a share link (server-proxied)', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    const res = await agent
      .post('/share/link')
      .send({
        fileId: 'file-1',
        encryptionMode: 'server_proxied',
        scope: 'anonymous',
      })
      .expect(201);

    expect(res.body).toHaveProperty('token');
    expect(deps.shareService.createShareLink).toHaveBeenCalled();
  });

  it('should access a share link', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    const res = await agent.get('/share/link/abc123').expect(200);

    expect(res.body).toHaveProperty('accessGranted', true);
  });

  it('should revoke a share link', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    await agent.delete('/share/link/link-1').expect(204);

    expect(deps.shareService.revokeShareLink).toHaveBeenCalled();
  });
});

describe('E2E: Magnet URL Sharing', () => {
  const owner = createTestUser({ id: 'owner-1', username: 'owner' });

  it('should get magnet URL for a file', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, owner);

    const res = await agent.get('/share/file-1/magnet').expect(200);

    expect(res.body).toHaveProperty('magnetUrl');
    expect(res.body).toHaveProperty('irrevocable', true);
  });

  it('should reject magnet URL without Download permission', async () => {
    const { app, deps } = createTestServer();
    deps.shareService.getMagnetUrl.mockRejectedValueOnce(
      new Error('Download permission required'),
    );
    const agent = authenticatedAgent(app, owner);

    await agent.get('/share/file-1/magnet').expect(500);
  });
});
