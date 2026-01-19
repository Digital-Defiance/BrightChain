/* eslint-disable @typescript-eslint/no-unused-vars */
import { DefaultLanguageCode } from '@digitaldefiance/i18n-lib';
import { NextFunction, Request, Response } from 'express';

export function setGlobalContextLanguageFromRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // default to req.user.siteLanguage or fall back to default language
  let language: string =
    (req.user?.siteLanguage as string) || (DefaultLanguageCode as string);
  // check for accept-language header and override if present
  if (req.headers['accept-language']) {
    try {
      const acceptLang = req.headers['accept-language'];
      // Simple language code extraction - take first language code before any semicolon or comma
      const langCode = acceptLang.split(/[;,]/)[0].trim().toLowerCase();
      language = langCode;
    } catch {
      // ignore invalid language header
    }
  }
  // TODO: Set language context when properly implemented
  // LanguageContext.language = language;
  next();
}
