import { IRequestUserDTO } from '@brightchain/brightchain-lib';
import { ValidationChain } from 'express-validator';
import { BurnbagMember } from '../burnbag-member';
import { ValidatedBody } from './shared-types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IRequestUserDTO;
    burnbagUser?: BurnbagMember;
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
      burnbagUser?: BurnbagMember;
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
