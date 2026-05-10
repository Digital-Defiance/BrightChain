import type { Collection } from '@brightchain/db';
import type { IProviderConnectionExtended } from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IConnectionRepository } from '../services/health-monitor-service';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

/**
 * BrightDB repository for the `provider_connections` collection.
 *
 * Follows the same pattern as BrightDBCanaryRepository: accepts a
 * `Collection` from `@brightchain/db` and an `IdSerializer<TID>`.
 *
 * Requirements: 1.7, 2.4, 4.1
 */
export class BrightDBProviderConnectionRepository<TID extends PlatformID>
  implements IConnectionRepository<TID>
{
  constructor(
    private readonly connections: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async getConnectionById(
    connectionId: TID,
  ): Promise<IProviderConnectionExtended<TID> | null> {
    const doc = await this.connections.findOne(
      filter({ _id: connectionId }, this.ids),
    );
    return doc
      ? fromDoc<TID, IProviderConnectionExtended<TID>>(doc, this.ids)
      : null;
  }

  async getConnectionsByUser(
    userId: TID,
  ): Promise<IProviderConnectionExtended<TID>[]> {
    const docs = await this.connections
      .find(filter({ userId }, this.ids))
      .toArray();
    return docs.map((d) =>
      fromDoc<TID, IProviderConnectionExtended<TID>>(d, this.ids),
    );
  }

  async createConnection(
    connection: IProviderConnectionExtended<TID>,
  ): Promise<void> {
    await this.connections.insertOne(toDoc(connection, this.ids));
  }

  async updateConnection(
    connectionId: TID,
    updates: Partial<IProviderConnectionExtended<TID>>,
  ): Promise<void> {
    const serializedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      serializedUpdates[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.connections.updateOne(filter({ _id: connectionId }, this.ids), {
      $set: serializedUpdates,
    });
  }

  async deleteConnection(connectionId: TID): Promise<void> {
    await this.connections.deleteOne(filter({ _id: connectionId }, this.ids));
  }

  async getConnectionsByStatus(
    status: IProviderConnectionExtended<TID>['status'],
  ): Promise<IProviderConnectionExtended<TID>[]> {
    const docs = await this.connections
      .find(filter({ status }, this.ids))
      .toArray();
    return docs.map((d) =>
      fromDoc<TID, IProviderConnectionExtended<TID>>(d, this.ids),
    );
  }

  // --- IConnectionRepository interface (used by HealthMonitorService) ---

  async getConnection(
    connectionId: TID,
  ): Promise<IProviderConnectionExtended<TID> | null> {
    return this.getConnectionById(connectionId);
  }
}
