import type { Collection } from '@brightchain/db';
import type { IWebhookEndpointBase } from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

/**
 * BrightDB repository for the `webhook_endpoints` collection.
 *
 * Stores webhook endpoint configurations for push-based canary provider
 * connections. Each endpoint has a unique URL path, cryptographically random
 * secret, signature verification method, optional IP allowlist, rate limiting,
 * and delivery statistics tracking.
 *
 * Follows the same pattern as BrightDBProviderConnectionRepository: accepts a
 * `Collection` from `@brightchain/db` and an `IdSerializer<TID>`.
 *
 * Requirements: 10.1, 10.7
 */
export class BrightDBWebhookEndpointRepository<TID extends PlatformID> {
  constructor(
    private readonly endpoints: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  /**
   * Retrieve a single webhook endpoint by its ID.
   */
  async getEndpointById(
    endpointId: TID,
  ): Promise<IWebhookEndpointBase<TID> | null> {
    const doc = await this.endpoints.findOne(
      filter({ _id: endpointId }, this.ids),
    );
    return doc
      ? fromDoc<TID, IWebhookEndpointBase<TID>>(doc, this.ids)
      : null;
  }

  /**
   * Retrieve the webhook endpoint associated with a specific provider connection.
   * Each connection has at most one active webhook endpoint.
   */
  async getEndpointByConnectionId(
    connectionId: TID,
  ): Promise<IWebhookEndpointBase<TID> | null> {
    const doc = await this.endpoints.findOne(
      filter({ connectionId }, this.ids),
    );
    return doc
      ? fromDoc<TID, IWebhookEndpointBase<TID>>(doc, this.ids)
      : null;
  }

  /**
   * Retrieve all webhook endpoints belonging to a user.
   */
  async getEndpointsForUser(
    userId: TID,
  ): Promise<IWebhookEndpointBase<TID>[]> {
    const docs = await this.endpoints
      .find(filter({ userId }, this.ids))
      .toArray();
    return docs.map((d) =>
      fromDoc<TID, IWebhookEndpointBase<TID>>(d, this.ids),
    );
  }

  /**
   * Retrieve a webhook endpoint by its URL path segment.
   * Used during inbound webhook processing to look up the endpoint
   * without exposing internal IDs.
   */
  async getEndpointByUrlPath(
    urlPath: string,
  ): Promise<IWebhookEndpointBase<TID> | null> {
    const doc = await this.endpoints.findOne(
      filter({ urlPath }, this.ids),
    );
    return doc
      ? fromDoc<TID, IWebhookEndpointBase<TID>>(doc, this.ids)
      : null;
  }

  /**
   * Persist a new webhook endpoint.
   */
  async createEndpoint(endpoint: IWebhookEndpointBase<TID>): Promise<void> {
    await this.endpoints.insertOne(toDoc(endpoint, this.ids));
  }

  /**
   * Apply partial updates to an existing webhook endpoint.
   * Automatically sets `updatedAt` to the current timestamp.
   */
  async updateEndpoint(
    endpointId: TID,
    updates: Partial<IWebhookEndpointBase<TID>>,
  ): Promise<void> {
    const serializedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      serializedUpdates[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    serializedUpdates['updatedAt'] = new Date();
    await this.endpoints.updateOne(filter({ _id: endpointId }, this.ids), {
      $set: serializedUpdates,
    });
  }
}
