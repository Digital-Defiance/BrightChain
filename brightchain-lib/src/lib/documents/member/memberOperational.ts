import { BrightChainMember } from '../../brightChainMember';
import { EmailString } from '../../emailString';
import { IOperationalFactory } from '../../interfaces/document/base';
import {
  IMemberHydratedData,
  ITestMemberHydratedData,
} from '../../interfaces/member/hydrated';
import { ECIESService } from '../../services/ecies.service';
import { VotingService } from '../../services/voting.service';

/**
 * Factory for converting between hydrated data and BrightChainMember instances
 */
export const memberOperationalFactory: IOperationalFactory<
  IMemberHydratedData,
  BrightChainMember
> = {
  create: (hydrated: IMemberHydratedData): BrightChainMember => {
    // Instantiate required services
    const eciesService = new ECIESService();
    const votingService = new VotingService(eciesService); // Pass eciesService

    // Ensure email is an EmailString instance if it's not already
    const email =
      hydrated.email instanceof EmailString
        ? hydrated.email
        : new EmailString(hydrated.email);

    const member = new BrightChainMember(
      eciesService,
      votingService,
      hydrated.type,
      hydrated.name,
      email, // Use the ensured EmailString instance
      hydrated.publicKey,
      hydrated.votingPublicKey,
      undefined, // privateKey - not available in standard hydrated data
      undefined, // wallet - loaded separately if needed
      hydrated.id,
      hydrated.dateCreated,
      hydrated.dateUpdated,
      hydrated.creatorId,
    );

    return member;
  },

  extract: (operational: BrightChainMember): IMemberHydratedData => {
    return {
      id: operational.id,
      type: operational.type,
      name: operational.name,
      email: operational.email,
      publicKey: operational.publicKey,
      votingPublicKey: operational.votingPublicKey,
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
