import { SecureBuffer } from '@brightchain/brightchain-lib';
import { Wallet } from '@ethereumjs/wallet';

export interface IWalletSeed {
  wallet: Wallet;
  seed: SecureBuffer;
}
