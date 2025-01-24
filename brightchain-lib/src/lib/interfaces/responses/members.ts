import { JsonResponse } from '../../sharedTypes';

export interface MembersResponse {
  [key: string]: JsonResponse | undefined;
  memberId?: string;
  blockId?: string;
  publicKey?: string;
  votingPublicKey?: string;
  success: boolean;
  message?: string;
}
