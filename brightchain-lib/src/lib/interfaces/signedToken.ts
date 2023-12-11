import { ITokenUser } from './tokenUser';

export interface ISignedToken {
  token: string;
  tokenUser: ITokenUser;
}
