import type { Collection } from '@brightchain/db';
import type {
  ICertificateOfDestruction,
  ICertificateRepository,
} from '@brightchain/digitalburnbag-lib';

/**
 * BrightDB-backed certificate repository.
 * Collection: burnbag_destruction_certificates
 * Indexes:
 *   - { containerId: 1 } — unique, for retrieval by container ID
 *   - { expiresAt: 1 } — TTL index for automatic certificate expiration
 */
export class BrightDBCertificateRepository implements ICertificateRepository {
  private indexesEnsured = false;

  constructor(private readonly certificates: Collection) {}

  /**
   * Ensure required indexes exist on the collection.
   * Called lazily on first operation to avoid blocking construction.
   */
  async ensureIndexes(certificateRetentionDays?: number): Promise<void> {
    if (this.indexesEnsured) return;

    // Unique index on containerId for fast retrieval
    await this.certificates.createIndex(
      { containerId: 1 },
      { unique: true, name: 'containerId_1_unique' },
    );

    // TTL index on expiresAt for automatic expiration
    const retentionSeconds = (certificateRetentionDays ?? 3650) * 86400;
    await this.certificates.createTTLIndex('expiresAt', retentionSeconds);

    this.indexesEnsured = true;
  }

  async storeCertificate(certificate: ICertificateOfDestruction): Promise<void> {
    const now = new Date().toISOString();
    const doc: Record<string, unknown> = {
      _id: certificate.containerId,
      ...certificate,
      createdAt: now,
      expiresAt: now,
    };
    await this.certificates.insertOne(doc);
  }

  async getCertificateByContainerId(
    containerId: string,
  ): Promise<ICertificateOfDestruction | null> {
    const doc = await this.certificates.findOne({
      containerId,
    } as Record<string, unknown>);
    if (!doc) return null;

    const { _id, createdAt, expiresAt, ...rest } = doc as Record<
      string,
      unknown
    >;
    return rest as unknown as ICertificateOfDestruction;
  }
}
