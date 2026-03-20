import { MemberType } from '@digitaldefiance/ecies-lib';

export interface ITokenPayload {
  memberId: string;
  username: string;
  type: MemberType;
  roles?: string[];
  iat: number;
  exp: number;
}
