import { ValidatedBody } from '@brightchain/brightchain-api-lib';
import { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';
import { ValidationChain } from 'express-validator';
declare module 'express-serve-static-core' {
  interface Request {
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
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IRequestUserDTO;
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

export {};
