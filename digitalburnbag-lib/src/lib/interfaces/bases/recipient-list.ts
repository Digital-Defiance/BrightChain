import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * A single recipient in a distribution list.
 */
export interface IRecipientBase {
  email: string;
  label: string;
  pgpPublicKey?: string;
  /**
   * If the recipient is a platform user, their user ID.
   * Enables pre-positioned ECIES key wrapping at binding creation time.
   */
  platformUserId?: string;
  /**
   * The recipient's ECIES public key (compressed secp256k1, 33 bytes, hex-encoded).
   * If present, the symmetric key can be wrapped directly for this recipient
   * without going through the custodial decrypt path at trigger time.
   */
  eciesPublicKey?: string;
}

/**
 * Named recipient list for canary distribution actions.
 */
export interface IRecipientListBase<TID extends PlatformID> {
  id: TID;
  name: string;
  ownerId: TID;
  recipients: IRecipientBase[];
  createdAt: Date | string;
  updatedAt: Date | string;
}
