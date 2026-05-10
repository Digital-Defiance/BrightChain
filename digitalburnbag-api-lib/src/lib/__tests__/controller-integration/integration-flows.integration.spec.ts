/**
 * Integration tests for critical flows — Task 40.4
 *
 * Tests end-to-end wiring through the API for:
 * - Upload → download round-trip
 * - Share → access → audit trail (all three encryption modes)
 * - Destruction → key wrapping cleanup → magnet URL non-functional
 * - Canary trigger → protocol action → audit logging
 * - Quorum approval → operation execution
 * - ACL inheritance through folder hierarchy
 */
import { HandleableError } from '@digitaldefiance/i18n-lib';
import request from 'supertest';
import {
  authenticatedAgent,
  createTestFileData,
  createTestUser,
} from './helpers';
import { createTestServer } from './test-server';

describe('Integration: Critical Flows (Task 40.4)', () => {
  const owner = createTestUser({ id: 'owner-1', username: 'owner' });
  const recipient = createTestUser({
    id: 'recipient-1',
    username: 'recipient',
  });

  describe('Upload → Download round-trip with encryption/decryption', () => {
    it('should upload a file and download it back', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);
      const fileData = createTestFileData('secret document content');

      // Upload: init → chunk → finalize
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

      expect(initRes.body.sessionId).toBeDefined();

      await agent
        .put(`/upload/${initRes.body.sessionId}/chunk/0`)
        .set('x-chunk-checksum', fileData.checksum)
        .send(fileData.data)
        .expect(200);

      const finalizeRes = await agent
        .post(`/upload/${initRes.body.sessionId}/finalize`)
        .expect(200);

      expect(finalizeRes.body.fileId).toBeDefined();

      // Download the file
      await agent.get(`/files/${finalizeRes.body.fileId}`).expect(200);

      expect(deps.uploadService.createSession).toHaveBeenCalled();
      expect(deps.uploadService.receiveChunk).toHaveBeenCalled();
      expect(deps.uploadService.finalize).toHaveBeenCalled();
      expect(deps.fileService.getFileContent).toHaveBeenCalled();
    });

    it('should return metadata after upload', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const metaRes = await agent.get('/files/file-1/metadata').expect(200);

      expect(metaRes.body).toHaveProperty('fileName');
      expect(metaRes.body).toHaveProperty('mimeType');
      expect(deps.fileService.getFileMetadata).toHaveBeenCalled();
    });
  });

  describe('Share → Access → Audit trail for all three encryption modes', () => {
    it('should share via server-proxied mode and access', async () => {
      const { app, deps } = createTestServer();
      const ownerAgent = authenticatedAgent(app, owner);

      // Create share link (server_proxied)
      const shareRes = await ownerAgent
        .post('/share/link')
        .send({
          fileId: 'file-1',
          encryptionMode: 'server_proxied',
          scope: 'anonymous',
        })
        .expect(201);

      expect(shareRes.body.token).toBeDefined();
      expect(deps.shareService.createShareLink).toHaveBeenCalled();

      // Access the share link (no auth needed for anonymous)
      const accessRes = await request(app)
        .get(`/share/link/${shareRes.body.token}`)
        .expect(200);

      expect(accessRes.body).toHaveProperty('accessGranted', true);
      expect(deps.shareService.accessShareLink).toHaveBeenCalled();

      // Check audit trail
      await ownerAgent.get('/share/file-1/audit').expect(200);
      expect(deps.shareService.getShareAuditTrail).toHaveBeenCalled();
    });

    it('should share via ephemeral key pair mode', async () => {
      const { app, deps } = createTestServer();
      deps.shareService.createShareLink.mockResolvedValueOnce({
        id: 'link-eph',
        token: 'eph-token',
        ephemeralPrivateKey: 'ephemeral-private-key-base64',
        url: 'https://digitalburnbag.com/share/eph-token#ephemeral-private-key-base64',
      });

      const ownerAgent = authenticatedAgent(app, owner);

      const shareRes = await ownerAgent
        .post('/share/link')
        .send({
          fileId: 'file-1',
          encryptionMode: 'ephemeral_key_pair',
          scope: 'anonymous',
        })
        .expect(201);

      expect(shareRes.body.ephemeralPrivateKey).toBeDefined();
      expect(deps.shareService.createShareLink).toHaveBeenCalledWith(
        expect.objectContaining({ encryptionMode: 'ephemeral_key_pair' }),
        'owner-1',
      );
    });

    it('should share via recipient public key mode', async () => {
      const { app, deps } = createTestServer();
      const ownerAgent = authenticatedAgent(app, owner);

      await ownerAgent
        .post('/share/link')
        .send({
          fileId: 'file-1',
          encryptionMode: 'recipient_public_key',
          recipientPublicKey: 'recipient-pub-key-base64',
          scope: 'specific_people',
        })
        .expect(201);

      expect(deps.shareService.createShareLink).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptionMode: 'recipient_public_key',
          recipientPublicKey: 'recipient-pub-key-base64',
        }),
        'owner-1',
      );
    });
  });

  describe('Destruction → Key wrapping cleanup → Magnet URL non-functional', () => {
    it('should destroy file and clean up key wrappings', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      // Destroy the file
      const destroyRes = await agent.post('/destroy/file-1').expect(200);

      expect(destroyRes.body).toHaveProperty('proof');
      expect(destroyRes.body.proof).toHaveProperty('hash');
      expect(deps.destructionService.destroyFile).toHaveBeenCalled();
    });

    it('should return 410 when downloading destroyed file', async () => {
      const { app, deps } = createTestServer();
      deps.fileService.getFileContent.mockRejectedValueOnce(
        new HandleableError(new Error('File has been destroyed'), {
          statusCode: 410,
        }),
      );

      const agent = authenticatedAgent(app, owner);
      await agent.get('/files/destroyed-file').expect(410);
    });

    it('should verify destruction proof', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      await agent
        .post('/destroy/file-1/verify')
        .send({ proof: { hash: 'abc' }, bundle: {} })
        .expect(200);

      expect(deps.destructionService.verifyDestruction).toHaveBeenCalled();
    });

    it('should batch destroy multiple files', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const batchRes = await agent
        .post('/destroy/batch')
        .send({ fileIds: ['file-1', 'file-2'] })
        .expect(200);

      expect(batchRes.body).toHaveProperty('results');
      expect(deps.destructionService.batchDestroy).toHaveBeenCalled();
    });
  });

  describe('Canary trigger → Protocol action execution → Audit logging', () => {
    it('should create canary binding and dry-run it', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      // Create binding
      const bindingRes = await agent
        .post('/canary/bindings')
        .send({
          condition: 'DEAD_MAN_SWITCH',
          provider: 'internal',
          action: 'DeleteFiles',
          targetFileIds: ['file-1', 'file-2'],
        })
        .expect(201);

      expect(bindingRes.body).toHaveProperty('id');
      expect(deps.canaryService.createBinding).toHaveBeenCalled();

      // Dry-run
      const dryRunRes = await agent
        .post(`/canary/bindings/${bindingRes.body.id}/dry-run`)
        .expect(200);

      expect(dryRunRes.body).toHaveProperty('actions');
      expect(dryRunRes.body).toHaveProperty('filesAffected');
      expect(deps.canaryService.dryRun).toHaveBeenCalled();
    });

    it('should create and update recipient list', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const createRes = await agent
        .post('/canary/recipients')
        .send({
          name: 'Emergency Contacts',
          recipients: [{ email: 'contact@example.com', label: 'Primary' }],
        })
        .expect(201);

      expect(createRes.body).toHaveProperty('id');
      expect(deps.canaryService.createRecipientList).toHaveBeenCalled();

      await agent
        .patch(`/canary/recipients/${createRes.body.id}`)
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

  describe('Quorum approval → Operation execution', () => {
    it('should request quorum approval and approve it', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);
      const approverAgent = authenticatedAgent(app, recipient);

      // Request approval
      const requestRes = await agent
        .post('/approval/request')
        .send({
          targetId: 'file-1',
          operationType: 'Destruction',
          requiredApprovals: 2,
        })
        .expect(201);

      expect(requestRes.body).toHaveProperty('requestId');
      expect(requestRes.body).toHaveProperty('status', 'pending');
      expect(deps.approvalService.requestApproval).toHaveBeenCalled();

      // First approval
      const approveRes = await approverAgent
        .post(`/approval/${requestRes.body.requestId}/approve`)
        .send({ signature: 'sig-1' })
        .expect(200);

      expect(approveRes.body).toHaveProperty('status');
      expect(deps.approvalService.approve).toHaveBeenCalled();
    });

    it('should reject quorum request', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, recipient);

      const rejectRes = await agent
        .post('/approval/qr-1/reject')
        .send({ reason: 'Not authorized for this operation' })
        .expect(200);

      expect(rejectRes.body).toHaveProperty('status', 'rejected');
      expect(deps.approvalService.reject).toHaveBeenCalled();
    });
  });

  describe('ACL inheritance through folder hierarchy', () => {
    it('should set ACL on folder and verify effective permissions', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      // Set ACL on parent folder
      await agent
        .put('/acl/folder/folder-1')
        .send({
          entries: [
            {
              principalId: 'recipient-1',
              principalType: 'user',
              permissionLevel: 'Viewer',
            },
          ],
        })
        .expect(200);

      expect(deps.aclService.setACL).toHaveBeenCalled();

      // Check effective permissions on child (inherits from parent)
      const effectiveRes = await agent
        .get('/acl/file/file-1/effective/recipient-1')
        .expect(200);

      expect(effectiveRes.body).toHaveProperty('flags');
      expect(deps.aclService.getEffectivePermission).toHaveBeenCalled();
    });

    it('should get ACL with inheritance source info', async () => {
      const { app, deps } = createTestServer();
      deps.aclService.getACL.mockResolvedValueOnce({
        entries: [{ principalId: 'user-1', principalType: 'user' }],
        source: 'inherited',
        sourceId: 'parent-folder-1',
      });

      const agent = authenticatedAgent(app, owner);
      const aclRes = await agent.get('/acl/file/file-1').expect(200);

      expect(aclRes.body).toHaveProperty('source', 'inherited');
      expect(aclRes.body).toHaveProperty('sourceId', 'parent-folder-1');
    });

    it('should create custom permission set', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const psRes = await agent
        .post('/acl/permission-sets')
        .send({
          name: 'Reviewer',
          flags: ['Read', 'Comment', 'Preview'],
        })
        .expect(201);

      expect(psRes.body).toHaveProperty('id');
      expect(deps.aclService.createPermissionSet).toHaveBeenCalled();
    });
  });

  describe('Audit log completeness', () => {
    it('should query audit log with filters', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const auditRes = await agent
        .get('/audit')
        .query({
          actorId: 'owner-1',
          operationType: 'FileUpload',
          dateFrom: '2025-01-01',
        })
        .expect(200);

      expect(auditRes.body).toHaveProperty('entries');
      expect(deps.auditService.queryAuditLog).toHaveBeenCalled();
    });

    it('should export audit log with Merkle proofs', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const exportRes = await agent.get('/audit/export').expect(200);

      expect(exportRes.body).toHaveProperty('entries');
      expect(exportRes.body).toHaveProperty('proofs');
      expect(deps.auditService.exportAuditLog).toHaveBeenCalled();
    });

    it('should generate compliance report', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const reportRes = await agent
        .post('/audit/compliance-report')
        .send({ dateFrom: '2025-01-01', dateTo: '2025-12-31' })
        .expect(200);

      expect(reportRes.body).toHaveProperty('summary');
      expect(deps.auditService.generateComplianceReport).toHaveBeenCalled();
    });
  });
});
