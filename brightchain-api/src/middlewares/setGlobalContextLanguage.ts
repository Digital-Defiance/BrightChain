// src/middlewares/injectMongooseContext.ts

import {
  DefaultLanguage,
  getLanguageCode,
  GlobalLanguageContext,
  StringLanguages,
} from '@BrightChain/brightchain-lib';
import { NextFunction, Request, Response } from 'express';

export function setGlobalContextLanguageFromRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // default to req.user.siteLanguage or fall back to default language
  let language: StringLanguages = req.user?.siteLanguage || DefaultLanguage;
  // check for accept-language header and override if present
  if (req.headers['accept-language']) {
    try {
      language = getLanguageCode(req.headers['accept-language']);
    } catch {
      // ignore invalid language header
    }
  }
  GlobalLanguageContext.language = language;
  next();
}
