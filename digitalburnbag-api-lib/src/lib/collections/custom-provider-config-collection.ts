import type { Collection } from '@brightchain/db';
import type { ICanaryProviderConfig } from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

/**
 * Stored document shape for a custom provider configuration.
 */
export interface ICustomProviderConfigDoc<TID extends PlatformID = string> {
  /** Document ID */
  id: TID;
  /** Owner user ID */
  userId: TID;
  /** Full provider configuration JSON */
  config: ICanaryProviderConfig<TID>;
  /** Whether other users can see this config */
  isShared: boolean;
  /** Created timestamp */
  createdAt: Date | string;
  /** Updated timestamp */
  updatedAt: Date | string;
}

/**
 * BrightDB repository for the `custom_provider_configs` collection.
 *
 * Stores user-defined provider configurations as JSON documents,
 * supporting shared/private visibility.
 *
 * Requirements: 8.2
 */
export class BrightDBCustomProviderConfigRepository<TID extends PlatformID> {
  constructor(
    private readonly configs: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async getConfigById(
    configId: TID,
  ): Promise<ICustomProviderConfigDoc<TID> | null> {
    const doc = await this.configs.findOne(filter({ _id: configId }, this.ids));
    return doc
      ? fromDoc<TID, ICustomProviderConfigDoc<TID>>(doc, this.ids)
      : null;
  }

  async getConfigsByUser(
    userId: TID,
  ): Promise<ICustomProviderConfigDoc<TID>[]> {
    const docs = await this.configs
      .find(filter({ userId }, this.ids))
      .toArray();
    return docs.map((d) =>
      fromDoc<TID, ICustomProviderConfigDoc<TID>>(d, this.ids),
    );
  }

  async createConfig(configDoc: ICustomProviderConfigDoc<TID>): Promise<void> {
    await this.configs.insertOne(toDoc(configDoc, this.ids));
  }

  async updateConfig(
    configId: TID,
    updates: Partial<ICustomProviderConfigDoc<TID>>,
  ): Promise<void> {
    const serializedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      serializedUpdates[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    serializedUpdates['updatedAt'] = new Date();
    await this.configs.updateOne(filter({ _id: configId }, this.ids), {
      $set: serializedUpdates,
    });
  }

  async deleteConfig(configId: TID): Promise<void> {
    await this.configs.deleteOne(filter({ _id: configId }, this.ids));
  }
}
