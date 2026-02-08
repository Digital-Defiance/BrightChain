import { JsonResponse } from '@digitaldefiance/node-express-suite';

export interface MembersResponse extends Record<
  string,
  JsonResponse | undefined | string | boolean
> {
  success: boolean;
  message?: string;
  memberId?: string;
  blockId?: string;
  publicKey?: string;
  votingPublicKey?: string;
  type?: string;
  name?: string;
}
