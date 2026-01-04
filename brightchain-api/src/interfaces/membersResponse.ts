import { JsonResponse } from '@brightchain/brightchain-api-lib';

export interface MembersResponse {
  success: boolean;
  message?: string;
  memberId?: string;
  blockId?: string;
  publicKey?: string;
  votingPublicKey?: string;
  type?: string;
  name?: string;
  email?: string;
}
