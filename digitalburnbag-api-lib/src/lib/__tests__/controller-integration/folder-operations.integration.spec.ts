/**
 * Controller Integration: Folder operations
 *
 * NOTE: These test controller routing with mocked services.
 * Real e2e tests are in brightchain-api-e2e/src/burnbag/
 */
import { authenticatedAgent, createTestUser } from './helpers';
import { createTestServer } from './test-server';

describe('Controller Integration: Folder Operations', () => {
  const user = createTestUser();

  it('should create a folder', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .post('/folders')
      .send({
        name: 'New Folder',
        parentFolderId: 'root',
        vaultContainerId: 'vault-1',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name', 'New Folder');
    expect(deps.folderService.createFolder).toHaveBeenCalled();
  });

  it('should reject duplicate folder name in same parent', async () => {
    const { app, deps } = createTestServer();
    deps.folderService.createFolder.mockRejectedValueOnce(
      new Error('Duplicate folder name'),
    );
    const agent = authenticatedAgent(app, user);

    await agent
      .post('/folders')
      .send({
        name: 'Existing',
        parentFolderId: 'root',
        vaultContainerId: 'vault-1',
      })
      .expect(500);
  });

  it('should get folder contents with sort', async () => {
    const { app, deps } = createTestServer();
    deps.folderService.getFolderContents.mockResolvedValueOnce({
      files: [{ id: 'f1', fileName: 'a.txt' }],
      folders: [{ id: 'sub1', name: 'SubFolder' }],
    });
    deps.folderService.getFolderPath.mockResolvedValueOnce([
      { id: 'root', name: 'Root' },
      { id: 'folder-1', name: 'Documents' },
    ]);
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .get('/folders/folder-1?sort=name&order=asc')
      .expect(200);

    expect(res.body).toHaveProperty('files');
    expect(res.body).toHaveProperty('subfolders');
    expect(res.body).toHaveProperty('folder');
  });

  it('should move a file between folders', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    await agent
      .post('/folders/folder-2/move')
      .send({ itemType: 'file', newParentId: 'folder-2' })
      .expect(200);

    expect(deps.folderService.move).toHaveBeenCalled();
  });

  it('should get root folder', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/folders/root').expect(200);

    expect(res.body).toHaveProperty('folder');
    expect(res.body.folder).toHaveProperty('id');
    expect(res.body).toHaveProperty('files');
    expect(res.body).toHaveProperty('subfolders');
  });

  it('should get breadcrumb path', async () => {
    const { app, deps } = createTestServer();
    deps.folderService.getFolderPath.mockResolvedValueOnce([
      { id: 'root', name: 'Root' },
      { id: 'folder-1', name: 'Documents' },
    ]);
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/folders/folder-1/path').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });
});
