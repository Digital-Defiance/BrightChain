import type { Collection } from '@brightchain/db';
import type {
  INotification,
  INotificationPreferences,
  INotificationRepository,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { filter, type IdSerializer } from './brightdb-helpers';

export class BrightDBNotificationRepository<TID extends PlatformID>
  implements INotificationRepository<TID>
{
  constructor(
    private readonly notifications: Collection,
    private readonly notificationPreferences: Collection,
    private readonly ids: IdSerializer<TID>,
  ) {}

  async queueNotification(
    userId: TID,
    notification: INotification<TID>,
  ): Promise<void> {
    const { id, ...rest } = notification;
    const serialized: Record<string, unknown> = {
      _id: this.ids.idToString(id as TID),
      userId: this.ids.idToString(userId),
      delivered: false,
    };
    for (const [key, value] of Object.entries(rest)) {
      serialized[key] =
        value instanceof Uint8Array ? this.ids.idToString(value as TID) : value;
    }
    await this.notifications.insertOne(serialized);
  }

  async getQueuedNotifications(userId: TID): Promise<INotification<TID>[]> {
    const docs = await this.notifications
      .find(filter({ userId, delivered: false }, this.ids))
      .toArray();
    return docs.map((d) => {
      const doc = d as Record<string, unknown>;
      const { _id, userId: _u, delivered: _del, ...rest } = doc;
      const result: Record<string, unknown> = {};
      try {
        result['id'] = this.ids.parseId(_id as string);
      } catch {
        result['id'] = _id;
      }
      for (const [key, value] of Object.entries(rest)) {
        if (
          (key === 'targetId' || key === 'actorId') &&
          typeof value === 'string'
        ) {
          try {
            result[key] = this.ids.parseId(value);
          } catch {
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      }
      return result as unknown as INotification<TID>;
    });
  }

  async markDelivered(notificationIds: TID[]): Promise<void> {
    for (const nid of notificationIds) {
      await this.notifications.updateOne(filter({ _id: nid }, this.ids), {
        $set: { delivered: true },
      });
    }
  }

  async getUnreadCount(userId: TID): Promise<number> {
    const docs = await this.notifications
      .find(filter({ userId, read: { $ne: true } }, this.ids))
      .toArray();
    return docs.length;
  }

  async getRecentNotifications(
    userId: TID,
    limit: number,
  ): Promise<INotification<TID>[]> {
    const docs = await this.notifications
      .find(filter({ userId }, this.ids))
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => {
      const doc = d as Record<string, unknown>;
      const { _id, userId: _u, delivered: _del, ...rest } = doc;
      const result: Record<string, unknown> = {};
      try {
        result['id'] = this.ids.parseId(_id as string);
      } catch {
        result['id'] = _id;
      }
      for (const [key, value] of Object.entries(rest)) {
        if (
          (key === 'targetId' || key === 'actorId') &&
          typeof value === 'string'
        ) {
          try {
            result[key] = this.ids.parseId(value);
          } catch {
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      }
      return result as unknown as INotification<TID>;
    });
  }

  async markRead(notificationIds: TID[]): Promise<void> {
    for (const nid of notificationIds) {
      await this.notifications.updateOne(filter({ _id: nid }, this.ids), {
        $set: { read: true },
      });
    }
  }

  async getPreferences(
    targetId: TID,
    ownerId: TID,
  ): Promise<INotificationPreferences | null> {
    const compositeId = `${this.ids.idToString(targetId)}_${this.ids.idToString(ownerId)}`;
    const doc = await this.notificationPreferences.findOne(
      filter({ _id: compositeId }, this.ids),
    );
    if (!doc) return null;
    const d = doc as Record<string, unknown>;
    return {
      enabled: d['enabled'] as boolean,
      accessTypes: d['accessTypes'] as ('view' | 'download' | 'preview')[],
      channels: d['channels'] as ('websocket' | 'email')[],
    };
  }

  async setPreferences(
    targetId: TID,
    ownerId: TID,
    prefs: Partial<INotificationPreferences>,
  ): Promise<void> {
    const compositeId = `${this.ids.idToString(targetId)}_${this.ids.idToString(ownerId)}`;
    const targetIdStr = this.ids.idToString(targetId);
    const ownerIdStr = this.ids.idToString(ownerId);
    const result = await this.notificationPreferences.updateOne(
      filter({ _id: compositeId }, this.ids),
      { $set: { ...prefs, targetId: targetIdStr, ownerId: ownerIdStr } },
    );
    if (result.matchedCount === 0) {
      await this.notificationPreferences.insertOne({
        _id: compositeId,
        targetId: targetIdStr,
        ownerId: ownerIdStr,
        ...prefs,
      });
    }
  }
}
