import type { Collection } from '@brightchain/db';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import type {
  EncryptedCredentialData,
  ICredentialRepository,
} from '../services/credential-service';
import { filter, type IdSerializer } from './brightdb-helpers';

/**
 * BrightDB repository for the `provider_credentials` collection.
 *
 * Encrypted fields (encryptedAccessToken, encryptedRefreshToken,
 * encryptedApiKey) are stored as base64-encoded strings alongside
 * their encryption metadata (iv, authTag).
 *
 * Requirements: 10.1
 */
export class BrightDBProviderCredentialRepository<TID extends PlatformID>
  implements ICredentialRepository
{
  constructor(
    private readonly credentials: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async store(
    connectionId: string,
    data: EncryptedCredentialData,
  ): Promise<void> {
    const { connectionId: _cid, ...rest } = data;
    // Upsert: update if exists, insert if not
    const result = await this.credentials.updateOne(
      filter({ _id: connectionId }, this.ids),
      { $set: { ...rest, updatedAt: new Date().toISOString() } },
    );
    if (result.matchedCount === 0) {
      await this.credentials.insertOne({
        _id: connectionId,
        ...rest,
      });
    }
  }

  async get(connectionId: string): Promise<EncryptedCredentialData | null> {
    const doc = await this.credentials.findOne(
      filter({ _id: connectionId }, this.ids),
    );
    if (!doc) return null;

    const d = doc as Record<string, unknown>;
    const { _id, ...rest } = d;
    return {
      connectionId: _id as string,
      ...rest,
    } as EncryptedCredentialData;
  }

  async delete(connectionId: string): Promise<void> {
    await this.credentials.deleteOne(filter({ _id: connectionId }, this.ids));
  }

  /**
   * Update the validity status of stored credentials.
   * Used when token validation or refresh changes the validity state.
   */
  async updateCredentialValidity(
    connectionId: string,
    updates: {
      isValid: boolean;
      validationError?: string;
      lastValidatedAt?: string;
      tokenExpiresAt?: string;
    },
  ): Promise<void> {
    await this.credentials.updateOne(filter({ _id: connectionId }, this.ids), {
      $set: {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    });
  }
}
