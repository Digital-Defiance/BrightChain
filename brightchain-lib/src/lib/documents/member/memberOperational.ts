import { BrightChainMember } from '../../brightChainMember';
import { IOperationalFactory } from '../../interfaces/document/base';
import {
  IMemberHydratedData,
  ITestMemberHydratedData,
} from '../../interfaces/member/hydrated';

/**
 * Factory for converting between hydrated data and BrightChainMember instances
 */
export const memberOperationalFactory: IOperationalFactory<
  IMemberHydratedData,
  BrightChainMember
> = {
  create: (hydrated: IMemberHydratedData): BrightChainMember => {
    // Use fromJson to create member synchronously
    const storage = {
      id: hydrated.id.toString(),
      type: hydrated.type,
      name: hydrated.name,
      email: hydrated.email.toString(),
      publicKey: hydrated.publicKey.toString('base64'),
      votingPublicKey: hydrated.votingPublicKey.n.toString(16),
      creatorId: hydrated.creatorId.toString(),
      dateCreated: hydrated.dateCreated.toISOString(),
      dateUpdated: hydrated.dateUpdated.toISOString(),
    };

    return BrightChainMember.fromJson(JSON.stringify(storage));
  },

  extract: (operational: BrightChainMember): IMemberHydratedData => {
    return {
      id: operational.guidId,
      type: operational.type,
      name: operational.name,
      email: operational.email,
      publicKey: operational.publicKey,
      votingPublicKey: operational.votingPublicKey,
      creatorId: operational.guidCreatorId,
      dateCreated: operational.dateCreated,
      dateUpdated: operational.dateUpdated,
    };
  },
};

/**
 * Factory for test members that includes private data
 */
export const testMemberOperationalFactory: IOperationalFactory<
  ITestMemberHydratedData,
  BrightChainMember
> = {
  create: (hydrated: ITestMemberHydratedData): BrightChainMember => {
    const member = memberOperationalFactory.create(hydrated);

    // Set mnemonic if available
    if (hydrated.mnemonic) {
      member.loadWallet(hydrated.mnemonic);
    }

    return member;
  },

  extract: (operational: BrightChainMember): ITestMemberHydratedData => {
    const base = memberOperationalFactory.extract(operational);
    // For test members, we don't extract the mnemonic since it's not stored
    // It should be provided during creation and managed separately
    return {
      ...base,
      mnemonic: undefined,
    };
  },
};
