import { EmailString } from '../../emailString';
import { GuidV4 } from '../../guid';
import { IHydrationSchema } from '../../interfaces/document/base';
import { IMemberHydratedData } from '../../interfaces/member/hydrated';
import { IMemberStorageData } from '../../interfaces/member/storage';
import { ServiceProvider } from '../../services/service.provider';

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
    const votingPublicKey =
      ServiceProvider.getInstance().votingService.bufferToVotingPublicKey(
        Buffer.from(storage.votingPublicKey, 'base64'),
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
    const votingPublicKeyBuffer =
      ServiceProvider.getInstance().votingService.votingPublicKeyToBuffer(
        hydrated.votingPublicKey,
      );

    return {
      id: hydrated.id.toString(),
      type: hydrated.type,
      name: hydrated.name,
      email: hydrated.email.toString(),
      publicKey: hydrated.publicKey.toString('base64'),
      votingPublicKey: votingPublicKeyBuffer.toString('base64'),
      creatorId: hydrated.creatorId.toString(),
      dateCreated: hydrated.dateCreated.toISOString(),
      dateUpdated: hydrated.dateUpdated.toISOString(),
    };
  },
};
