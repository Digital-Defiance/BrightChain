import { JsonResponse } from '@digitaldefiance/node-express-suite';

export interface MembersResponse extends Record<
  string,
  JsonResponse | undefined | string | boolean
> {
  memberId?: string;
  blockId?: string;
  publicKey?: string;
  votingPublicKey?: string;
  success: boolean;
  message?: string;
}
