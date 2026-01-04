import { BrightChainMember } from '../../brightChainMember';
import { SecureString } from '@digitaldefiance/ecies-lib';

export interface IMemberWithMnemonic {
  member: BrightChainMember;
  mnemonic: SecureString;
}
