import Wallet from 'ethereumjs-wallet';
import { SecureBuffer } from '@digitaldefiance/ecies-lib';

export interface IWalletSeed {
  wallet: Wallet;
  seed: SecureBuffer;
}
