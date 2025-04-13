import { StringLanguages } from '@brightchain/brightchain-lib';
import { DefaultLanguageCode } from '@digitaldefiance/i18n-lib';
import { NextFunction, Request, Response } from 'express';

export function setGlobalContextLanguageFromRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // default to req.user.siteLanguage or fall back to default language
  let language: StringLanguages = (req.user?.siteLanguage as StringLanguages) || (DefaultLanguageCode as StringLanguages);
  // check for accept-language header and override if present
  if (req.headers['accept-language']) {
    try {
      const acceptLang = req.headers['accept-language'];
      // Simple language code extraction - take first language code before any semicolon or comma
      const langCode = acceptLang.split(/[;,]/)[0].trim().toLowerCase();
      if (Object.values(StringLanguages).includes(langCode as StringLanguages)) {
        language = langCode as StringLanguages;
      }
    } catch {
      // ignore invalid language header
    }
  }
  // TODO: Set language context when properly implemented
  // LanguageContext.language = language;
  next();
}
