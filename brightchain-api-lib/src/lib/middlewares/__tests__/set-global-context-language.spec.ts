import {
  GlobalActiveContext,
  StringLanguage,
} from '@brightchain/brightchain-lib';
import { setGlobalContextLanguageFromRequest } from '../set-global-context-language';

function makeReq(
  opts: Partial<{
    user: { siteLanguage?: StringLanguage };
    headers: Record<string, string>;
  }>,
) {
  return {
    user: opts.user,
    headers: opts.headers ?? {},
  } as unknown as import('express').Request;
}

function makeRes() {
  return {} as unknown as import('express').Response;
}

describe('setGlobalContextLanguageFromRequest', () => {
  beforeEach(() => {
    GlobalActiveContext.language = StringLanguage.EnglishUS;
    GlobalActiveContext.currentContext = 'admin';
  });

  it('uses user.siteLanguage when no Accept-Language header', () => {
    const req = makeReq({ user: { siteLanguage: StringLanguage.French } });
    const res = makeRes();
    const next = jest.fn();

    setGlobalContextLanguageFromRequest(req, res, next);

    expect(GlobalActiveContext.language).toBe(StringLanguage.French);
    expect(GlobalActiveContext.currentContext).toBe('user');
    expect(next).toHaveBeenCalled();
  });

  it('overrides with Accept-Language header when valid', () => {
    const req = makeReq({
      user: { siteLanguage: StringLanguage.Spanish },
      headers: { 'accept-language': 'en' },
    });
    const res = makeRes();
    const next = jest.fn();

    setGlobalContextLanguageFromRequest(req, res, next);

    expect(GlobalActiveContext.language).toBe(StringLanguage.EnglishUS);
    expect(GlobalActiveContext.currentContext).toBe('user');
    expect(next).toHaveBeenCalled();
  });

  it('ignores invalid Accept-Language and falls back to user or default', () => {
    const req = makeReq({
      user: { siteLanguage: StringLanguage.Spanish },
      headers: { 'accept-language': 'not-a-lang' },
    });
    const res = makeRes();
    const next = jest.fn();

    setGlobalContextLanguageFromRequest(req, res, next);

    expect(GlobalActiveContext.language).toBe(StringLanguage.Spanish);
    expect(GlobalActiveContext.currentContext).toBe('user');
    expect(next).toHaveBeenCalled();
  });
});
