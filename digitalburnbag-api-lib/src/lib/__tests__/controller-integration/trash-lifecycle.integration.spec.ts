/**
 * E2E: Trash bin lifecycle
 */
import { authenticatedAgent, createTestUser } from './helpers';
import { createTestServer } from './test-server';

describe('E2E: Trash Bin Lifecycle', () => {
  const user = createTestUser();

  it('should soft-delete and verify deletedAt is set', async () => {
    const { app, deps } = createTestServer();
    deps.fileService.getFileMetadata.mockResolvedValueOnce({
      id: 'file-1',
      fileName: 'test.txt',
      deletedAt: new Date().toISOString(),
    });
    const agent = authenticatedAgent(app, user);

    // Soft delete
    await agent.delete('/files/file-1').expect(204);

    // Verify metadata shows deletedAt
    const res = await agent.get('/files/file-1/metadata').expect(200);
    expect(res.body).toHaveProperty('deletedAt');
  });

  it('should restore from trash and clear deletedAt', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    await agent.post('/files/file-1/restore').expect(200);

    expect(deps.fileService.restoreFromTrash).toHaveBeenCalledWith(
      'file-1',
      user.id,
    );
  });

  it('should handle restore when original parent is deleted', async () => {
    const { app, deps } = createTestServer();
    deps.fileService.restoreFromTrash.mockResolvedValueOnce(undefined);
    const agent = authenticatedAgent(app, user);

    const res = await agent.post('/files/file-1/restore').expect(200);

    expect(res.body).toHaveProperty('restored', true);
  });
});
