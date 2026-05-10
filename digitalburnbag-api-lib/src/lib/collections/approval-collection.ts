import type { Collection } from '@brightchain/db';
import type {
  IApprovalPolicy,
  IApprovalRepository,
  IApprovalRequestBase,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, fromDoc, toDoc, type IdSerializer } from './brightdb-helpers';

export class BrightDBApprovalRepository<TID extends PlatformID>
  implements IApprovalRepository<TID>
{
  constructor(
    private readonly quorumRequests: Collection,
    private readonly quorumPolicies: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async getApprovalRequest(
    requestId: TID,
  ): Promise<IApprovalRequestBase<TID> | null> {
    const doc = await this.quorumRequests.findOne(
      filter({ _id: requestId }, this.ids),
    );
    return doc ? fromDoc<TID, IApprovalRequestBase<TID>>(doc, this.ids) : null;
  }

  async createApprovalRequest(
    request: IApprovalRequestBase<TID>,
  ): Promise<void> {
    await this.quorumRequests.insertOne(toDoc(request, this.ids));
  }

  async updateApprovalRequest(
    requestId: TID,
    updates: Partial<IApprovalRequestBase<TID>>,
  ): Promise<void> {
    const serializedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      serializedUpdates[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.quorumRequests.updateOne(filter({ _id: requestId }, this.ids), {
      $set: serializedUpdates,
    });
  }

  async getApprovalPolicy(
    targetId: TID,
    operationType: string,
  ): Promise<IApprovalPolicy<TID> | null> {
    const doc = await this.quorumPolicies.findOne(
      filter({ targetId, operationType }, this.ids),
    );
    return doc ? fromDoc<TID, IApprovalPolicy<TID>>(doc, this.ids) : null;
  }

  async getExpiredRequests(before: Date): Promise<IApprovalRequestBase<TID>[]> {
    const docs = await this.quorumRequests
      .find(filter({ expiresAt: { $lt: before }, status: 'pending' }, this.ids))
      .toArray();
    return docs.map((d) =>
      fromDoc<TID, IApprovalRequestBase<TID>>(d, this.ids),
    );
  }

  async isApprovalGoverned(targetId: TID): Promise<boolean> {
    const count = await this.quorumPolicies.countDocuments(
      filter({ targetId }, this.ids),
    );
    return count > 0;
  }

  async getRubberStampConfig(
    operationType: string,
    targetId: TID,
  ): Promise<boolean> {
    const doc = await this.quorumPolicies.findOne(
      filter({ targetId, operationType }, this.ids),
    );
    if (!doc) return false;
    return (doc as Record<string, unknown>)['policyType'] === 'rubber_stamp';
  }
}
