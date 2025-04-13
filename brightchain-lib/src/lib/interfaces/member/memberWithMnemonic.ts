import { BrightChainMember } from '../../brightChainMember';
import { SecureString } from '../../secureString';

export interface IMemberWithMnemonic {
  member: BrightChainMember;
  mnemonic: SecureString;
}
