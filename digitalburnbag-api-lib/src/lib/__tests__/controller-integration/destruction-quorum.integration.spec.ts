/**
 * E2E: Destruction lifecycle and quorum workflow
 */
import { authenticatedAgent, createTestUser } from './helpers';
import { createTestServer } from './test-server';

describe('E2E: Destruction Lifecycle', () => {
  const user = createTestUser();

  it('should destroy a file and return proof', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent.post('/destroy/file-1').expect(200);

    expect(res.body).toHaveProperty('proof');
    expect(deps.destructionService.destroyFile).toHaveBeenCalled();
  });

  it('should batch destroy files', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .post('/destroy/batch')
      .send({ fileIds: ['file-1', 'file-2'] })
      .expect(200);

    expect(res.body).toHaveProperty('results');
    expect(deps.destructionService.batchDestroy).toHaveBeenCalled();
  });

  it('should schedule destruction', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    await agent
      .post('/destroy/file-1/schedule')
      .send({ scheduledAt: new Date(Date.now() + 86400000).toISOString() })
      .expect(201);

    expect(deps.destructionService.scheduleDestruction).toHaveBeenCalled();
  });

  it('should cancel scheduled destruction', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    await agent.delete('/destroy/file-1/schedule').expect(200);

    expect(
      deps.destructionService.cancelScheduledDestruction,
    ).toHaveBeenCalled();
  });

  it('should verify destruction proof', async () => {
    const { app } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .post('/destroy/file-1/verify')
      .send({ proof: { hash: 'abc' } })
      .expect(200);

    expect(res.body).toHaveProperty('valid', true);
  });
});

describe('E2E: Quorum Workflow', () => {
  const user = createTestUser();

  it('should request quorum approval', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .post('/approval/request')
      .send({
        targetId: 'file-1',
        operationType: 'Destruction',
      })
      .expect(201);

    expect(res.body).toHaveProperty('requestId');
    expect(res.body).toHaveProperty('status', 'pending');
    expect(deps.approvalService.requestApproval).toHaveBeenCalled();
  });

  it('should approve a quorum request', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .post('/approval/qr-1/approve')
      .send({ signature: 'sig-abc' })
      .expect(200);

    expect(res.body).toHaveProperty('status', 'approved');
    expect(deps.approvalService.approve).toHaveBeenCalled();
  });

  it('should reject a quorum request', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .post('/approval/qr-1/reject')
      .send({ reason: 'Not authorized' })
      .expect(200);

    expect(res.body).toHaveProperty('status', 'rejected');
    expect(deps.approvalService.reject).toHaveBeenCalled();
  });
});
