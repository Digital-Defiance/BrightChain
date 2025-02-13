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
    const member = new BrightChainMember(
      hydrated.type,
      hydrated.name,
      hydrated.email,
      hydrated.publicKey,
      hydrated.votingPublicKey,
      hydrated.privateKey,
      undefined, // wallet - loaded separately with mnemonic if needed
      hydrated.id,
      hydrated.dateCreated,
      hydrated.dateUpdated,
      hydrated.creatorId,
    );

    // Set voting private key if available
    if (hydrated.votingPrivateKey) {
      member['_votingPrivateKey'] = hydrated.votingPrivateKey;
    }

    return member;
  },

  extract: (operational: BrightChainMember): IMemberHydratedData => {
    return {
      id: operational.id,
      type: operational.type,
      name: operational.name,
      email: operational.email,
      publicKey: operational.publicKey,
      privateKey: operational.privateKey,
      votingPublicKey: operational.votingPublicKey,
      votingPrivateKey: operational.votingPrivateKey,
      creatorId: operational.creatorId,
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
