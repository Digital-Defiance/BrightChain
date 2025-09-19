import { SecureString } from '@brightchain/brightchain-lib';
import { BrightChainMember } from '../../backendMember';

export interface IBackendMemberWithMnemonic {
  member: BrightChainMember;
  mnemonic: SecureString;
}
