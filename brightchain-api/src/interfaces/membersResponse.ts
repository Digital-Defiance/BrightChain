import { JsonResponse } from '@brightchain/brightchain-lib';

export interface MembersResponse {
  [key: string]: JsonResponse | undefined;
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
