import { Member, SecureString } from '@digitaldefiance/ecies-lib';

export interface IBackendMemberWithMnemonic {
  member: Member;
  mnemonic: SecureString;
}
