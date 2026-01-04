import { IRequestUserDTO } from '@brightchain/brightchain-lib';
import { ValidationChain } from 'express-validator';
import { ValidatedBody } from './shared-types';
import { Member } from '@digitaldefiance/ecies-lib';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IRequestUserDTO;
    brightchainUser?: Member;
    validatedBody?: ValidatedBody<string>;
    validate?: {
      body: (field: string) => ValidationChain;
      param: (field: string) => ValidationChain;
      query: (field: string) => ValidationChain;
      header: (field: string) => ValidationChain;
      cookie: (field: string) => ValidationChain;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: IRequestUserDTO;
      brightchainUser?: Member;
      validatedBody?: ValidatedBody<string>;
      validate?: {
        body: (field: string) => ValidationChain;
        param: (field: string) => ValidationChain;
        query: (field: string) => ValidationChain;
        header: (field: string) => ValidationChain;
        cookie: (field: string) => ValidationChain;
      };
    }
  }
}
