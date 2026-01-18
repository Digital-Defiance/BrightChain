import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { uint8ArrayToBase64 } from '../../bufferUtils';
import { IOperationalFactory } from '../../interfaces/document/base';
import {
  IMemberHydratedData,
  ITestMemberHydratedData,
} from '../../interfaces/member/hydrated';
import { ServiceProvider } from '../../services/service.provider';

/**
 * Factory for converting between hydrated data and Member instances
 */
export const memberOperationalFactory = <
  TID extends PlatformID = Uint8Array,
>(): IOperationalFactory<IMemberHydratedData<TID>, Member<TID>> => ({
  create: (hydrated: IMemberHydratedData<TID>): Member<TID> => {
    // Use fromJson to create member synchronously
    const provider = ServiceProvider.getInstance<TID>().idProvider;
    const storage = {
      id: provider.idToString(hydrated.id),
      type: hydrated.type,
      name: hydrated.name,
      email: hydrated.email.toString(),
      publicKey: uint8ArrayToBase64(hydrated.publicKey),
      votingPublicKey:
        hydrated.votingPublicKey && hydrated.votingPublicKey.n.toString(16),
      creatorId: provider.idToString(hydrated.creatorId),
      dateCreated: hydrated.dateCreated.toISOString(),
      dateUpdated: hydrated.dateUpdated.toISOString(),
    };

    const eciesService = ServiceProvider.getInstance<TID>().eciesService;
    return Member.fromJson<TID>(JSON.stringify(storage), eciesService);
  },

  extract: (operational: Member<TID>): IMemberHydratedData<TID> => {
    // For the extract method, we need to return the IDs in the format expected by the hydrated data
    // The operational.id is already in the correct format from Member.newMember
    return {
      id: operational.id,
      type: operational.type,
      name: operational.name,
      email: operational.email,
      publicKey: operational.publicKey,
      votingPublicKey: operational.votingPublicKey!,
      creatorId: operational.id, // Use the same ID as creator for now
      dateCreated: operational.dateCreated,
      dateUpdated: operational.dateUpdated,
    };
  },
});

/**
 * Factory for test members that includes private data
 */
export const testMemberOperationalFactory = <
  TID extends PlatformID = Uint8Array,
>(): IOperationalFactory<ITestMemberHydratedData, Member<TID>> => ({
  create: (hydrated: ITestMemberHydratedData): Member<TID> => {
    const member = memberOperationalFactory<TID>().create(
      hydrated as IMemberHydratedData<TID>,
    );

    // Set mnemonic if available
    if (hydrated.mnemonic) {
      member.loadWallet(hydrated.mnemonic);
    }

    return member;
  },

  extract: (operational: Member<TID>): ITestMemberHydratedData => {
    const base = memberOperationalFactory<TID>().extract(
      operational,
    ) as IMemberHydratedData<Uint8Array>;
    // For test members, we don't extract the mnemonic since it's not stored
    // It should be provided during creation and managed separately
    return {
      ...base,
      mnemonic: undefined,
    } as ITestMemberHydratedData;
  },
});
