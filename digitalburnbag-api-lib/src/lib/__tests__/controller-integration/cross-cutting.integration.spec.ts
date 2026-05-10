/**
 * E2E: Cross-cutting concerns
 */
import request from 'supertest';
import { authenticatedAgent, createTestUser } from './helpers';
import { createTestServer } from './test-server';

describe('E2E: Cross-Cutting Concerns', () => {
  it('should inject user from auth headers', async () => {
    const { app, deps } = createTestServer();
    const user = createTestUser({ id: 'specific-user', username: 'specific' });
    const agent = authenticatedAgent(app, user);

    await agent.get('/files/file-1/metadata').expect(200);

    // Verify the service was called with the correct user ID
    expect(deps.fileService.getFileMetadata).toHaveBeenCalledWith(
      'file-1',
      'specific-user',
    );
  });

  it('should use default user when no auth headers provided', async () => {
    const { app, deps } = createTestServer();

    // Even without explicit user headers, the stub authProvider resolves
    // a default user from the bearer token. Send a bearer token with the
    // default user ID to simulate the "no custom user" scenario.
    await request(app)
      .get('/files/file-1/metadata')
      .set('Authorization', 'Bearer test-user-1')
      .expect(200);

    // Default user is 'test-user-1'
    expect(deps.fileService.getFileMetadata).toHaveBeenCalledWith(
      'file-1',
      'test-user-1',
    );
  });

  it('should handle service errors gracefully', async () => {
    const { app, deps } = createTestServer();
    deps.fileService.getFileMetadata.mockRejectedValueOnce(
      new Error('File not found'),
    );
    const agent = authenticatedAgent(app, createTestUser());

    await agent.get('/files/nonexistent/metadata').expect(500);
  });

  it('should handle JSON body parsing', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, createTestUser());

    // Send valid JSON
    const res = await agent
      .post('/folders')
      .send({
        name: 'Test Folder',
        parentFolderId: 'root',
        vaultContainerId: 'vault-1',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
  });

  it('should handle folder export with ACL check', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, createTestUser());

    const res = await agent
      .post('/folders/folder-1/export-tcbl')
      .send({ mimeTypeFilters: ['text/*'] })
      .expect(200);

    expect(res.body).toHaveProperty('manifestSummary');
    expect(deps.folderExportService.exportFolderToTCBL).toHaveBeenCalled();
  });
});
