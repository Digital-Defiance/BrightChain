/**
 * E2E: Audit trail and canary protocol tests
 */
import { authenticatedAgent, createTestUser } from './helpers';
import { createTestServer } from './test-server';

describe('E2E: Audit Trail', () => {
  const user = createTestUser();

  it('should query audit log with filters', async () => {
    const { app, deps } = createTestServer();
    deps.auditService.queryAuditLog.mockResolvedValueOnce({
      entries: [
        {
          id: 'entry-1',
          operationType: 'FileUpload',
          actorId: user.id,
          targetId: 'file-1',
          timestamp: new Date().toISOString(),
        },
      ],
      total: 1,
    });
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .get('/audit?operationType=FileUpload&actorId=test-user-1')
      .expect(200);

    expect(res.body).toHaveProperty('entries');
    expect(res.body.total).toBe(1);
  });

  it('should export audit log with Merkle proofs', async () => {
    const { app, deps } = createTestServer();
    deps.auditService.exportAuditLog.mockResolvedValueOnce({
      entries: [{ id: 'entry-1' }],
      proofs: [{ entryId: 'entry-1', proof: 'merkle-proof-data' }],
    });
    const agent = authenticatedAgent(app, user);

    const res = await agent.get('/audit/export').expect(200);

    expect(res.body).toHaveProperty('entries');
    expect(res.body).toHaveProperty('proofs');
  });

  it('should generate compliance report', async () => {
    const { app, deps } = createTestServer();
    deps.auditService.generateComplianceReport.mockResolvedValueOnce({
      summary: {
        totalOperations: 100,
        destructionEvents: 5,
        sharingEvents: 20,
      },
    });
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .post('/audit/compliance-report')
      .send({ dateFrom: '2025-01-01', dateTo: '2025-12-31' })
      .expect(200);

    expect(res.body).toHaveProperty('summary');
    expect(deps.auditService.generateComplianceReport).toHaveBeenCalled();
  });
});

describe('E2E: Canary Protocol', () => {
  const user = createTestUser();

  it('should create a canary binding', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .post('/canary/bindings')
      .send({
        condition: 'DEAD_MAN_SWITCH',
        provider: 'internal',
        action: 'DeleteFiles',
        targetIds: ['file-1', 'file-2'],
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(deps.canaryService.createBinding).toHaveBeenCalled();
  });

  it('should update a canary binding', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    await agent
      .patch('/canary/bindings/binding-1')
      .send({ action: 'EmailFilesAsAttachments' })
      .expect(200);

    expect(deps.canaryService.updateBinding).toHaveBeenCalled();
  });

  it('should delete a canary binding', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    await agent.delete('/canary/bindings/binding-1').expect(204);

    expect(deps.canaryService.deleteBinding).toHaveBeenCalled();
  });

  it('should run dry-run simulation', async () => {
    const { app, deps } = createTestServer();
    deps.canaryService.dryRun.mockResolvedValueOnce({
      actions: ['DeleteFiles'],
      filesAffected: ['file-1', 'file-2', 'file-3'],
      foldersAffected: [],
      recipientsNotified: 0,
    });
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .post('/canary/bindings/binding-1/dry-run')
      .expect(200);

    expect(res.body).toHaveProperty('affectedFileCount', 3);
    expect(res.body.filesAffected).toHaveLength(3);
    expect(deps.canaryService.dryRun).toHaveBeenCalled();
  });

  it('should create a recipient list', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    const res = await agent
      .post('/canary/recipients')
      .send({
        name: 'Emergency Contacts',
        recipients: [{ email: 'contact@example.com', label: 'Primary' }],
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(deps.canaryService.createRecipientList).toHaveBeenCalled();
  });

  it('should update a recipient list', async () => {
    const { app, deps } = createTestServer();
    const agent = authenticatedAgent(app, user);

    await agent
      .patch('/canary/recipients/rlist-1')
      .send({
        recipients: [
          { email: 'contact@example.com', label: 'Primary' },
          { email: 'backup@example.com', label: 'Backup' },
        ],
      })
      .expect(200);

    expect(deps.canaryService.updateRecipientList).toHaveBeenCalled();
  });
});
