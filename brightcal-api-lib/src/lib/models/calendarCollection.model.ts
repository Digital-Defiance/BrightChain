/**
 * CalendarCollection BrightDb Model
 *
 * Defines the stored/typed interfaces, hydration schema, collection schema,
 * and factory function for the calendar_collections collection.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import {
  CalendarPermissionLevel,
  type ICalendarCollectionDTO,
} from '@brightchain/brightcal-lib';
import type { IHydrationSchema } from '@brightchain/brightchain-lib';
import type { BrightDb, BsonDocument, CollectionSchema } from '@brightchain/db';
import { Model } from '@brightchain/db';

// ─── Collection name ─────────────────────────────────────────────────────────

export const CALENDAR_COLLECTIONS_COLLECTION = 'calendar_collections';

// ─── Stored interface (block storage form — all primitives/strings) ──────────

export interface IStoredCalendarCollection extends BsonDocument {
  _id: string;
  ownerId: string;
  displayName: string;
  color: string;
  description: string;
  isDefault: boolean;
  isSubscription: boolean;
  subscriptionUrl?: string;
  subscriptionRefreshInterval?: number;
  subscriptionLastRefreshed?: string;
  defaultPermission: string;
  /** AES-256-GCM encryption key (64-char hex) for this calendar's event bodies. */
  encryptionKey?: string;
  dateCreated: string;
  dateModified: string;
}

// ─── Typed interface (application form) ──────────────────────────────────────

export interface ITypedCalendarCollection
  extends ICalendarCollectionDTO<string, Date> {
  /** dateModified tracks last update time */
  dateModified: Date;
  /** Last time a subscription feed was refreshed */
  subscriptionLastRefreshed?: Date;
  /** AES-256-GCM encryption key (64-char hex) for this calendar's event bodies. */
  encryptionKey?: string;
}

// ─── Hydration schema ────────────────────────────────────────────────────────

export const calendarCollectionHydration: IHydrationSchema<
  IStoredCalendarCollection,
  ITypedCalendarCollection
> = {
  hydrate: (stored: IStoredCalendarCollection): ITypedCalendarCollection => ({
    id: stored._id as string,
    ownerId: stored.ownerId,
    displayName: stored.displayName,
    color: stored.color,
    description: stored.description,
    isDefault: stored.isDefault,
    isSubscription: stored.isSubscription,
    subscriptionUrl: stored.subscriptionUrl,
    subscriptionRefreshInterval: stored.subscriptionRefreshInterval,
    subscriptionLastRefreshed: stored.subscriptionLastRefreshed
      ? new Date(stored.subscriptionLastRefreshed)
      : undefined,
    defaultPermission: stored.defaultPermission as CalendarPermissionLevel,
    encryptionKey: stored.encryptionKey,
    dateCreated: new Date(stored.dateCreated),
    dateModified: new Date(stored.dateModified),
  }),

  dehydrate: (typed: ITypedCalendarCollection): IStoredCalendarCollection => ({
    _id: typed.id,
    ownerId: typed.ownerId,
    displayName: typed.displayName,
    color: typed.color,
    description: typed.description,
    isDefault: typed.isDefault,
    isSubscription: typed.isSubscription,
    subscriptionUrl: typed.subscriptionUrl,
    subscriptionRefreshInterval: typed.subscriptionRefreshInterval,
    subscriptionLastRefreshed: typed.subscriptionLastRefreshed
      ? typed.subscriptionLastRefreshed.toISOString()
      : undefined,
    defaultPermission: typed.defaultPermission,
    encryptionKey: typed.encryptionKey,
    dateCreated: typed.dateCreated.toISOString(),
    dateModified: typed.dateModified.toISOString(),
  }),
};

// ─── Collection schema (validation + indexes) ────────────────────────────────

export const CALENDAR_COLLECTION_SCHEMA: CollectionSchema = {
  name: CALENDAR_COLLECTIONS_COLLECTION,
  properties: {
    _id: { type: 'string' },
    ownerId: { type: 'string', required: true, minLength: 1 },
    displayName: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 255,
    },
    color: {
      type: 'string',
      required: true,
      pattern: '^#[0-9a-fA-F]{6}$',
    },
    description: { type: 'string', required: true },
    isDefault: { type: 'boolean', required: true },
    isSubscription: { type: 'boolean', required: true },
    subscriptionUrl: { type: 'string' },
    subscriptionRefreshInterval: { type: 'number', minimum: 1 },
    subscriptionLastRefreshed: { type: 'string' },
    encryptionKey: { type: 'string', minLength: 64, maxLength: 64 },
    defaultPermission: {
      type: 'string',
      required: true,
      enum: Object.values(CalendarPermissionLevel),
    },
    dateCreated: { type: 'string', required: true },
    dateModified: { type: 'string', required: true },
  },
  required: [
    'ownerId',
    'displayName',
    'color',
    'description',
    'isDefault',
    'isSubscription',
    'defaultPermission',
    'dateCreated',
    'dateModified',
  ],
  additionalProperties: false,
  validationLevel: 'strict',
  validationAction: 'error',
  indexes: [
    // Query calendars by owner
    { fields: { ownerId: 1 } },
    // Unique default calendar per owner
    { fields: { ownerId: 1, isDefault: 1 } },
    // Subscription calendars for refresh polling
    { fields: { isSubscription: 1, subscriptionLastRefreshed: 1 } },
  ],
};

// ─── Model factory ───────────────────────────────────────────────────────────

/**
 * Create a CalendarCollection Model from a BrightDb instance.
 *
 * @example
 * ```typescript
 * const calendarModel = createCalendarCollectionModel(db);
 * const calendars = await calendarModel.find({ ownerId: userId }).toArray();
 * ```
 */
export function createCalendarCollectionModel(
  db: BrightDb,
): Model<IStoredCalendarCollection, ITypedCalendarCollection> {
  const collection = db.collection<IStoredCalendarCollection>(
    CALENDAR_COLLECTIONS_COLLECTION,
  );
  return new Model(collection, {
    schema: CALENDAR_COLLECTION_SCHEMA,
    hydration: calendarCollectionHydration,
    collectionName: CALENDAR_COLLECTIONS_COLLECTION,
  });
}
