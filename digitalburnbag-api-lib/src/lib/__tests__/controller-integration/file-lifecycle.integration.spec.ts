/**
 * E2E: Complete file download and management lifecycle
 */
import { authenticatedAgent, createTestUser } from './helpers';
import { createTestServer } from './test-server';

describe('E2E: File Lifecycle', () => {
  const user = createTestUser();

  it('should get file metadata', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/files/file-1/metadata').expect(200);

    expect(res.body).toHaveProperty('id', 'file-1');
    expect(res.body).toHaveProperty('fileName', 'test.txt');
    expect(res.body).toHaveProperty('mimeType', 'text/plain');
  });

  it('should update file metadata (rename)', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .patch('/files/file-1')
      .send({ fileName: 'renamed.txt' })
      .expect(200);

    expect(res.body.fileName).toBe('renamed.txt');
    expect(deps.fileService.updateFileMetadata).toHaveBeenCalledWith(
      'file-1',
      expect.objectContaining({ fileName: 'renamed.txt' }),
      user.id,
    );
  });

  it('should soft-delete a file', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    await agent.delete('/files/file-1').expect(204);

    expect(deps.fileService.softDelete).toHaveBeenCalledWith('file-1', user.id);
  });

  it('should restore a file from trash', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    await agent.post('/files/file-1/restore').expect(200);

    expect(deps.fileService.restoreFromTrash).toHaveBeenCalledWith(
      'file-1',
      user.id,
    );
  });

  it('should get version history', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/files/file-1/versions').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('versionNumber', 1);
  });

  it('should restore a specific version', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    await agent.post('/files/file-1/versions/v1/restore').expect(200);

    expect(deps.fileService.restoreVersion).toHaveBeenCalled();
  });

  it('should search files', async () => {
    const { app, deps } = createTestServer();
    deps.fileService.search.mockResolvedValueOnce({
      items: [{ id: 'file-1', fileName: 'test.txt' }],
      total: 1,
    });
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/files/search?query=test').expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body.total).toBe(1);
  });

  it('should get non-access proof', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/files/file-1/non-access-proof').expect(200);

    expect(res.body).toHaveProperty('pristine', true);
  });
});
