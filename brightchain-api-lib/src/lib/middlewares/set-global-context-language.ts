// src/middlewares/injectMongooseContext.ts

import {
  DefaultLanguage,
  getLanguageCode,
  GlobalActiveContext,
  StringLanguage,
} from '@brightchain/brightchain-lib';
import { NextFunction, Request, Response } from 'express';

export function setGlobalContextLanguageFromRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // default to req.user.siteLanguage or fall back to default language
  let language: StringLanguage =
    (req.user?.siteLanguage as StringLanguage) || DefaultLanguage;
  // check for accept-language header and override if present
  if (req.headers['accept-language']) {
    try {
      language = getLanguageCode(req.headers['accept-language'] as string);
    } catch {
      // ignore invalid language header
    }
  }
  GlobalActiveContext.language = language;
  GlobalActiveContext.currentContext = 'user';
  next();
}
