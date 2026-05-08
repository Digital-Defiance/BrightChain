import {
  hexToUint8Array,
  PlatformID,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { MemberStatusType } from '../../enumerations/memberStatusType';
import { IHydrationSchema } from '../../interfaces/document/base';
import {
  IPrivateMemberProfileHydratedData,
  IPrivateMemberProfileStorageData,
  IPublicMemberProfileHydratedData,
  IPublicMemberProfileStorageData,
} from '../../interfaces/member/profileStorage';
import { ServiceProvider } from '../../services/service.provider';
import { brightDateToISO, normalizeToBrightDate } from '../../utils/brightDateConversions';

/**
 * Hydration schema for converting between storage and hydrated public member profile formats
 */
export const publicMemberProfileHydrationSchema = <
  TID extends PlatformID = Uint8Array,
>(): IHydrationSchema<
  IPublicMemberProfileStorageData,
  IPublicMemberProfileHydratedData<TID>
> => ({
  hydrate: (
    storage: IPublicMemberProfileStorageData,
  ): IPublicMemberProfileHydratedData<TID> => {
    const provider = ServiceProvider.getInstance<TID>().idProvider;
    const rawBytes =
      typeof storage.id === 'string' ? hexToUint8Array(storage.id) : storage.id;
    // Use a plain Uint8Array copy to avoid cross-realm TypedArray issues in Jest
    // and ensure .buffer points to an isolated ArrayBuffer of the correct size.
    const idBytes = new Uint8Array(rawBytes);
    const id = provider.fromBytes(idBytes);

    return {
      id,
      status: storage.status as MemberStatusType,
      lastActive: normalizeToBrightDate(storage.lastActive),
      reputation: storage.reputation,
      storageQuota: BigInt(storage.storageQuota),
      storageUsed: BigInt(storage.storageUsed),
      dateCreated: normalizeToBrightDate(storage.dateCreated),
      dateUpdated: normalizeToBrightDate(storage.dateUpdated),
    };
  },

  dehydrate: (
    hydrated: IPublicMemberProfileHydratedData<TID>,
  ): IPublicMemberProfileStorageData => {
    const provider = ServiceProvider.getInstance<TID>().idProvider;

    // Handle ID conversion - convert to hex string for JSON serialization
    const idHex = (() => {
      if (typeof hydrated.id === 'string') {
        return hydrated.id;
      }
      if (hydrated.id instanceof Uint8Array) {
        return uint8ArrayToHex(hydrated.id);
      }
      return provider.toString(hydrated.id, 'hex');
    })();

    return {
      id: idHex,
      status: hydrated.status,
      lastActive: brightDateToISO(hydrated.lastActive),
      reputation: hydrated.reputation,
      storageQuota: hydrated.storageQuota.toString(),
      storageUsed: hydrated.storageUsed.toString(),
      dateCreated: brightDateToISO(hydrated.dateCreated),
      dateUpdated: brightDateToISO(hydrated.dateUpdated),
    };
  },
});

/**
 * Hydration schema for converting between storage and hydrated private member profile formats
 */
export const privateMemberProfileHydrationSchema = <
  TID extends PlatformID = Uint8Array,
>(): IHydrationSchema<
  IPrivateMemberProfileStorageData,
  IPrivateMemberProfileHydratedData<TID>
> => ({
  hydrate: (
    storage: IPrivateMemberProfileStorageData,
  ): IPrivateMemberProfileHydratedData<TID> => {
    const provider = ServiceProvider.getInstance<TID>().idProvider;
    const rawBytes =
      typeof storage.id === 'string' ? hexToUint8Array(storage.id) : storage.id;
    // Use a plain Uint8Array copy to avoid cross-realm TypedArray issues in Jest
    const idBytes = new Uint8Array(rawBytes);
    const id = provider.fromBytes(idBytes);

    return {
      id,
      trustedPeers: storage.trustedPeers.map((hex) => {
        const bytes = typeof hex === 'string' ? hexToUint8Array(hex) : hex;
        return provider.fromBytes(bytes);
      }),
      blockedPeers: storage.blockedPeers.map((hex) => {
        const bytes = typeof hex === 'string' ? hexToUint8Array(hex) : hex;
        return provider.fromBytes(bytes);
      }),
      ...(storage.passwordHash !== undefined
        ? { passwordHash: storage.passwordHash }
        : {}),
      ...(storage.backupCodes !== undefined
        ? { backupCodes: storage.backupCodes.map((c) => ({ ...c })) }
        : {}),
      ...(storage.passwordWrappedPrivateKey !== undefined
        ? {
            passwordWrappedPrivateKey: { ...storage.passwordWrappedPrivateKey },
          }
        : {}),
      ...(storage.mnemonicRecovery !== undefined
        ? { mnemonicRecovery: storage.mnemonicRecovery }
        : {}),
      settings: (() => {
        const { autoReplication, minRedundancy, preferredRegions, ...rest } =
          storage.settings ?? {};
        return {
          autoReplication,
          minRedundancy,
          preferredRegions: preferredRegions
            ? [...preferredRegions]
            : undefined,
          ...rest,
        };
      })(),
      activityLog: storage.activityLog.map((entry) => ({
        timestamp: normalizeToBrightDate(entry.timestamp),
        action: entry.action,
        details: entry.details ? { ...entry.details } : {},
        metadata: entry.metadata ? { ...entry.metadata } : undefined,
      })),
      dateCreated: normalizeToBrightDate(storage.dateCreated),
      dateUpdated: normalizeToBrightDate(storage.dateUpdated),
    };
  },

  dehydrate: (
    hydrated: IPrivateMemberProfileHydratedData<TID>,
  ): IPrivateMemberProfileStorageData => {
    const provider = ServiceProvider.getInstance<TID>().idProvider;

    // Handle ID conversion - convert to hex string for JSON serialization
    const idHex = (() => {
      if (typeof hydrated.id === 'string') {
        return hydrated.id;
      }
      if (hydrated.id instanceof Uint8Array) {
        return uint8ArrayToHex(hydrated.id);
      }
      return provider.toString(hydrated.id, 'hex');
    })();

    // Convert peer IDs to hex strings for JSON serialization
    const trustedPeersHex = hydrated.trustedPeers.map((peerId) => {
      if (typeof peerId === 'string') {
        return peerId;
      }
      if (peerId instanceof Uint8Array) {
        return uint8ArrayToHex(peerId);
      }
      return provider.toString(peerId, 'hex');
    });

    const blockedPeersHex = hydrated.blockedPeers.map((peerId) => {
      if (typeof peerId === 'string') {
        return peerId;
      }
      if (peerId instanceof Uint8Array) {
        return uint8ArrayToHex(peerId);
      }
      return provider.toString(peerId, 'hex');
    });

    const {
      autoReplication,
      minRedundancy,
      preferredRegions,
      ...extraSettings
    } = hydrated.settings ?? {};

    return {
      id: idHex,
      trustedPeers: trustedPeersHex,
      blockedPeers: blockedPeersHex,
      ...(hydrated.passwordHash !== undefined
        ? { passwordHash: hydrated.passwordHash }
        : {}),
      ...(hydrated.backupCodes !== undefined
        ? { backupCodes: hydrated.backupCodes.map((c) => ({ ...c })) }
        : {}),
      ...(hydrated.passwordWrappedPrivateKey !== undefined
        ? {
            passwordWrappedPrivateKey: {
              ...hydrated.passwordWrappedPrivateKey,
            },
          }
        : {}),
      ...(hydrated.mnemonicRecovery !== undefined
        ? { mnemonicRecovery: hydrated.mnemonicRecovery }
        : {}),
      settings: {
        autoReplication,
        minRedundancy,
        preferredRegions: preferredRegions ? [...preferredRegions] : undefined,
        ...extraSettings,
      },
      activityLog: hydrated.activityLog.map((entry) => ({
        timestamp: brightDateToISO(entry.timestamp),
        action: entry.action,
        details: entry.details ? { ...entry.details } : {},
        metadata: entry.metadata ? { ...entry.metadata } : undefined,
      })),
      dateCreated: brightDateToISO(hydrated.dateCreated),
      dateUpdated: brightDateToISO(hydrated.dateUpdated),
    };
  },
});
