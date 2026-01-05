import { SecureString } from '@digitaldefiance/ecies-lib';
import { BrightChainMember } from '../../brightChainMember';

export interface IMemberWithMnemonic {
  member: BrightChainMember;
  mnemonic: SecureString;
}
