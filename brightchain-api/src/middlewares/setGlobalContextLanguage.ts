import {
  DefaultLanguage,
  getLanguageCode,
  StringLanguages,
} from '@brightchain/brightchain-lib';
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
  // TODO: Set language context when properly implemented
  // LanguageContext.language = language;
  next();
}
