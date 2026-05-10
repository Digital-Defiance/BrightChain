/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for BrightDBCertificateRepository — Task 10.3
 */
import type { ICertificateOfDestruction } from '@brightchain/digitalburnbag-lib';
import { BrightDBCertificateRepository } from '../collections/certificate-collection';
import { createMockCollection } from './collections/mock-collection';

describe('BrightDBCertificateRepository', () => {
  const makeCertificate = (
    overrides?: Partial<ICertificateOfDestruction>,
  ): ICertificateOfDestruction => ({
    version: 1,
    containerId: 'container-abc-123',
    containerName: 'My Sealed Vault',
    sealHash: 'deadbeef'.repeat(8),
    sealedAt: '2024-01-15T10:00:00.000Z',
    destroyedAt: '2024-06-01T14:30:00.000Z',
    nonAccessVerification: {
      containerId: 'container-abc-123',
      nonAccessConfirmed: true,
      accessedFileIds: [],
      inconsistentFileIds: [],
      totalFilesChecked: 3,
    },
    fileDestructionProofs: [
      {
        fileId: 'file-1',
        destructionHash: 'aabb'.repeat(16),
        ledgerEntryHash: 'ccdd'.repeat(16),
        timestamp: '2024-06-01T14:30:01.000Z',
      },
    ],
    containerLedgerEntryHash: 'eeff'.repeat(16),
    operatorPublicKey: '02' + 'ab'.repeat(32),
    signature: 'c2lnbmF0dXJlLWJhc2U2NA==',
    ...overrides,
  });

  const createRepo = () => {
    const collection = createMockCollection();
    const repo = new BrightDBCertificateRepository(collection as any);
    return { repo, collection };
  };

  describe('storeCertificate', () => {
    it('should insert a certificate document with _id set to containerId', async () => {
      const { repo, collection } = createRepo();
      const cert = makeCertificate();

      await repo.storeCertificate(cert);

      expect(collection.insertOne).toHaveBeenCalledTimes(1);
      const insertedDoc = collection.insertOne.mock.calls[0][0];
      expect(insertedDoc._id).toBe('container-abc-123');
      expect(insertedDoc.containerId).toBe('container-abc-123');
      expect(insertedDoc.containerName).toBe('My Sealed Vault');
      expect(insertedDoc.version).toBe(1);
      expect(insertedDoc.signature).toBe('c2lnbmF0dXJlLWJhc2U2NA==');
    });

    it('should include createdAt and expiresAt timestamps', async () => {
      const { repo, collection } = createRepo();
      const cert = makeCertificate();

      await repo.storeCertificate(cert);

      const insertedDoc = collection.insertOne.mock.calls[0][0];
      expect(insertedDoc.createdAt).toBeDefined();
      expect(insertedDoc.expiresAt).toBeDefined();
      // Both should be valid ISO strings
      expect(() => new Date(insertedDoc.createdAt as string)).not.toThrow();
      expect(() => new Date(insertedDoc.expiresAt as string)).not.toThrow();
    });

    it('should store the full certificate payload including nested objects', async () => {
      const { repo, collection } = createRepo();
      const cert = makeCertificate({
        fileDestructionProofs: [
          {
            fileId: 'file-a',
            destructionHash: '1111'.repeat(16),
            ledgerEntryHash: '2222'.repeat(16),
            timestamp: '2024-06-01T14:30:01.000Z',
          },
          {
            fileId: 'file-b',
            destructionHash: '3333'.repeat(16),
            ledgerEntryHash: '4444'.repeat(16),
            timestamp: '2024-06-01T14:30:02.000Z',
          },
        ],
      });

      await repo.storeCertificate(cert);

      const insertedDoc = collection.insertOne.mock.calls[0][0];
      expect(insertedDoc.fileDestructionProofs).toHaveLength(2);
      expect(insertedDoc.nonAccessVerification.totalFilesChecked).toBe(3);
    });
  });

  describe('getCertificateByContainerId', () => {
    it('should return the certificate when found', async () => {
      const { repo, collection } = createRepo();
      const cert = makeCertificate();
      collection.findOne.mockResolvedValueOnce({
        _id: 'container-abc-123',
        ...cert,
        createdAt: '2024-06-01T14:30:00.000Z',
        expiresAt: '2034-06-01T14:30:00.000Z',
      });

      const result = await repo.getCertificateByContainerId('container-abc-123');

      expect(result).not.toBeNull();
      expect(result!.containerId).toBe('container-abc-123');
      expect(result!.containerName).toBe('My Sealed Vault');
      expect(result!.version).toBe(1);
      expect(result!.signature).toBe('c2lnbmF0dXJlLWJhc2U2NA==');
    });

    it('should return null when no certificate exists', async () => {
      const { repo, collection } = createRepo();
      collection.findOne.mockResolvedValueOnce(null);

      const result =
        await repo.getCertificateByContainerId('nonexistent-container');

      expect(result).toBeNull();
    });

    it('should strip internal fields (_id, createdAt, expiresAt) from the result', async () => {
      const { repo, collection } = createRepo();
      const cert = makeCertificate();
      collection.findOne.mockResolvedValueOnce({
        _id: 'container-abc-123',
        ...cert,
        createdAt: '2024-06-01T14:30:00.000Z',
        expiresAt: '2034-06-01T14:30:00.000Z',
      });

      const result = await repo.getCertificateByContainerId('container-abc-123');

      expect(result).not.toBeNull();
      expect((result as any)._id).toBeUndefined();
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).expiresAt).toBeUndefined();
    });

    it('should query by containerId field', async () => {
      const { repo, collection } = createRepo();
      collection.findOne.mockResolvedValueOnce(null);

      await repo.getCertificateByContainerId('target-container');

      expect(collection.findOne).toHaveBeenCalledWith({
        containerId: 'target-container',
      });
    });
  });

  describe('ensureIndexes', () => {
    it('should create a unique index on containerId', async () => {
      const { repo, collection } = createRepo();
      // Mock createIndex and createTTLIndex on the collection
      (collection as any).createIndex = jest.fn().mockResolvedValue('containerId_1_unique');
      (collection as any).createTTLIndex = jest.fn().mockResolvedValue('ttl_expiresAt');

      await repo.ensureIndexes();

      expect((collection as any).createIndex).toHaveBeenCalledWith(
        { containerId: 1 },
        { unique: true, name: 'containerId_1_unique' },
      );
    });

    it('should create a TTL index on expiresAt', async () => {
      const { repo, collection } = createRepo();
      (collection as any).createIndex = jest.fn().mockResolvedValue('containerId_1_unique');
      (collection as any).createTTLIndex = jest.fn().mockResolvedValue('ttl_expiresAt');

      await repo.ensureIndexes(3650);

      expect((collection as any).createTTLIndex).toHaveBeenCalledWith(
        'expiresAt',
        3650 * 86400,
      );
    });

    it('should only create indexes once (idempotent)', async () => {
      const { repo, collection } = createRepo();
      (collection as any).createIndex = jest.fn().mockResolvedValue('containerId_1_unique');
      (collection as any).createTTLIndex = jest.fn().mockResolvedValue('ttl_expiresAt');

      await repo.ensureIndexes();
      await repo.ensureIndexes();

      expect((collection as any).createIndex).toHaveBeenCalledTimes(1);
      expect((collection as any).createTTLIndex).toHaveBeenCalledTimes(1);
    });

    it('should use default retention of 3650 days when not specified', async () => {
      const { repo, collection } = createRepo();
      (collection as any).createIndex = jest.fn().mockResolvedValue('containerId_1_unique');
      (collection as any).createTTLIndex = jest.fn().mockResolvedValue('ttl_expiresAt');

      await repo.ensureIndexes();

      expect((collection as any).createTTLIndex).toHaveBeenCalledWith(
        'expiresAt',
        3650 * 86400,
      );
    });
  });
});
