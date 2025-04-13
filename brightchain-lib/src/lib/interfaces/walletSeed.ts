import Wallet from 'ethereumjs-wallet';
import { SecureBuffer } from '../secureBuffer';

export interface IWalletSeed {
  wallet: Wallet;
  seed: SecureBuffer;
}
