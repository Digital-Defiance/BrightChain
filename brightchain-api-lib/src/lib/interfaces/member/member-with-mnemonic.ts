import { SecureString } from '@brightchain/brightchain-lib';
import { BackendMember } from '../../backendMember';

export interface IBackendMemberWithMnemonic {
  member: BackendMember;
  mnemonic: SecureString;
}
