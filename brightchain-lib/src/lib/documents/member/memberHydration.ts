import {
  EmailString,
  hexToUint8Array,
  PlatformID,
  uint8ArrayToBase64,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { PublicKey } from 'paillier-bigint';
import { base64ToUint8Array } from '../../bufferUtils';
import { IHydrationSchema } from '../../interfaces/document/base';
import { IMemberHydratedData } from '../../interfaces/member/hydrated';
import { IMemberStorageData } from '../../interfaces/member/storage';
import { ServiceProvider } from '../../services/service.provider';

/**
 * Hydration schema for converting between storage and hydrated member formats
 */
export const memberHydrationSchema = <
  TID extends PlatformID = Uint8Array,
>(): IHydrationSchema<IMemberStorageData, IMemberHydratedData<TID>> => ({
  hydrate: (storage: IMemberStorageData): IMemberHydratedData<TID> => {
    // Convert string fields to their proper types using ID provider
    const provider = ServiceProvider.getInstance<TID>().idProvider;
    const id = provider.fromBytes(hexToUint8Array(storage.id));
    const email = new EmailString(storage.email);
    const creatorId = provider.fromBytes(hexToUint8Array(storage.creatorId));
    const publicKey = base64ToUint8Array(storage.publicKey);

    // Parse voting public key from hex string (if present)
    const votingPublicKey =
      storage.votingPublicKey && storage.votingPublicKey !== '0'
        ? new PublicKey(
            BigInt('0x' + storage.votingPublicKey),
            BigInt('0x' + storage.votingPublicKey) + 1n, // g = n + 1 for Paillier
          )
        : undefined;

    return {
      id,
      type: storage.type,
      name: storage.name,
      email,
      publicKey,
      votingPublicKey,
      creatorId,
      dateCreated: new Date(storage.dateCreated),
      dateUpdated: new Date(storage.dateUpdated),
    };
  },

  dehydrate: (hydrated: IMemberHydratedData<TID>): IMemberStorageData => {
    // Convert typed fields back to strings
    // Serialize voting public key (n value as hex string)
    const votingPublicKeyHex = hydrated.votingPublicKey?.n?.toString(16) || '0';
    const provider = ServiceProvider.getInstance<TID>().idProvider;

    // Handle ID conversion - if it's already a string, use it; if it's Uint8Array, convert to hex
    let idString: string;
    if (typeof hydrated.id === 'string') {
      idString = hydrated.id;
    } else if (hydrated.id instanceof Uint8Array) {
      idString = uint8ArrayToHex(hydrated.id);
    } else {
      try {
        idString = uint8ArrayToHex(provider.toBytes(hydrated.id));
      } catch {
        // Fallback to hex if provider method fails
        idString = uint8ArrayToHex(hydrated.id as unknown as Uint8Array);
      }
    }

    let creatorIdString: string;
    if (!hydrated.creatorId) {
      creatorIdString = idString;
    } else if (typeof hydrated.creatorId === 'string') {
      creatorIdString = hydrated.creatorId;
    } else if (hydrated.creatorId instanceof Uint8Array) {
      creatorIdString = uint8ArrayToHex(hydrated.creatorId);
    } else {
      try {
        creatorIdString = uint8ArrayToHex(provider.toBytes(hydrated.creatorId));
      } catch {
        // Fallback to hex if provider method fails
        creatorIdString = uint8ArrayToHex(
          hydrated.creatorId as unknown as Uint8Array,
        );
      }
    }

    return {
      id: idString,
      type: hydrated.type,
      name: hydrated.name,
      email: hydrated.email.toString(),
      publicKey: uint8ArrayToBase64(hydrated.publicKey),
      votingPublicKey: votingPublicKeyHex,
      creatorId: creatorIdString,
      dateCreated: hydrated.dateCreated.toISOString(),
      dateUpdated: hydrated.dateUpdated.toISOString(),
    };
  },
});
