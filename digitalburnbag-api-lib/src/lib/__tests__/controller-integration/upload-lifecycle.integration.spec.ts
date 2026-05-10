/**
 * E2E: Complete file upload lifecycle
 */
import {
  authenticatedAgent,
  createTestFileData,
  createTestUser,
} from './helpers';
import { createTestServer } from './test-server';

describe('E2E: Upload Lifecycle', () => {
  const user = createTestUser();

  it('should complete full upload flow: init → chunk → finalize', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const fileData = createTestFileData();

    // Step 1: Init upload session
    const initRes = await agent
      .post('/upload/init')
      .send({
        fileName: fileData.fileName,
        mimeType: fileData.mimeType,
        totalSizeBytes: fileData.totalSizeBytes,
        targetFolderId: 'root',
        vaultContainerId: 'vault-1',
      })
      .expect(201);

    expect(initRes.body).toHaveProperty('sessionId');
    expect(initRes.body).toHaveProperty('chunkSize');
    expect(initRes.body).toHaveProperty('totalChunks');
    expect(deps.storageQuotaService.checkQuota).toHaveBeenCalled();

    // Step 2: Upload chunk
    const chunkRes = await agent
      .put(`/upload/${initRes.body.sessionId}/chunk/0`)
      .set('x-chunk-checksum', fileData.checksum)
      .send(fileData.data)
      .expect(200);

    expect(chunkRes.body).toHaveProperty('progressPercent');
    expect(deps.uploadService.receiveChunk).toHaveBeenCalled();

    // Step 3: Finalize
    const finalizeRes = await agent
      .post(`/upload/${initRes.body.sessionId}/finalize`)
      .expect(200);

    expect(finalizeRes.body).toHaveProperty('fileId');
    expect(finalizeRes.body).toHaveProperty('metadata');
    expect(deps.uploadService.finalize).toHaveBeenCalled();
  });

  it('should return session status for resume', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/upload/session-1/status').expect(200);

    expect(res.body).toHaveProperty('receivedChunks');
    expect(res.body).toHaveProperty('totalChunks');
  });

  it('should reject upload when quota exceeded', async () => {
    const { app, deps } = createTestServer();
    deps.storageQuotaService.checkQuota.mockRejectedValueOnce(
      new Error('Quota exceeded'),
    );
    const agent = authenticatedAgent(app, user);

    await agent
      .post('/upload/init')
      .send({
        fileName: 'big-file.bin',
        mimeType: 'application/octet-stream',
        totalSizeBytes: 999999999,
        targetFolderId: 'root',
        vaultContainerId: 'vault-1',
      })
      .expect(500); // Error propagates through asyncHandler
  });

  it('should reject chunk with bad checksum', async () => {
    const { app, deps } = createTestServer();
    deps.uploadService.receiveChunk.mockRejectedValueOnce(
      new Error('Checksum mismatch'),
    );
    const agent = authenticatedAgent(app, user);

    await agent
      .put('/upload/session-1/chunk/0')
      .set('x-chunk-checksum', 'bad-checksum')
      .send(Buffer.from('data'))
      .expect(500);
  });
});
