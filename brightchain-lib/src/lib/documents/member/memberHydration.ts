import { EmailString, GuidV4 } from '@digitaldefiance/ecies-lib';
import { PublicKey } from 'paillier-bigint';
import { IHydrationSchema } from '../../interfaces/document/base';
import { IMemberHydratedData } from '../../interfaces/member/hydrated';
import { IMemberStorageData } from '../../interfaces/member/storage';

/**
 * Hydration schema for converting between storage and hydrated member formats
 */
export const memberHydrationSchema: IHydrationSchema<
  IMemberStorageData,
  IMemberHydratedData
> = {
  hydrate: (storage: IMemberStorageData): IMemberHydratedData => {
    // Convert string fields to their proper types
    const id = new GuidV4(storage.id);
    const email = new EmailString(storage.email);
    const creatorId = new GuidV4(storage.creatorId);
    const publicKey = Buffer.from(storage.publicKey, 'base64');

    // Parse voting public key from hex string
    const votingPublicKey = new PublicKey(
      BigInt('0x' + storage.votingPublicKey),
      BigInt('0x' + storage.votingPublicKey) + 1n, // g = n + 1 for Paillier
    );

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

  dehydrate: (hydrated: IMemberHydratedData): IMemberStorageData => {
    // Convert typed fields back to strings
    // Serialize voting public key (n value as hex string)
    const votingPublicKeyHex = hydrated.votingPublicKey.n.toString(16);

    return {
      id: hydrated.id.toString(),
      type: hydrated.type,
      name: hydrated.name,
      email: hydrated.email.toString(),
      publicKey: hydrated.publicKey.toString('base64'),
      votingPublicKey: votingPublicKeyHex,
      creatorId: hydrated.creatorId.toString(),
      dateCreated: hydrated.dateCreated.toISOString(),
      dateUpdated: hydrated.dateUpdated.toISOString(),
    };
  },
};
