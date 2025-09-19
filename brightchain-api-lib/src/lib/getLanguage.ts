import {
  debugLog,
  GlobalActiveContext,
  setAdminLanguage,
  StringLanguage,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';

export function setGlobalActiveContextAdminLanguageFromProcessArgvOrEnv(): StringLanguage {
  const consoleLanguageEnv = process.env['LANGUAGE'];
  const consoleLanguageArgv = process.argv.find((arg) =>
    arg.startsWith('--language='),
  );

  // Prioritize command-line argument, then environment variable, then existing context
  const rawLanguage =
    (consoleLanguageArgv
      ? consoleLanguageArgv.split('=')[1]
      : consoleLanguageEnv) ?? GlobalActiveContext.adminLanguage;

  if (!rawLanguage) {
    return GlobalActiveContext.adminLanguage;
  }

  const consoleLanguage = rawLanguage.replace(/^['"]|['"]$/g, '');

  if (
    Object.values(StringLanguage).includes(consoleLanguage as StringLanguage)
  ) {
    // Set the global language context and return the new language
    setAdminLanguage(consoleLanguage as StringLanguage);
    return GlobalActiveContext.adminLanguage;
  }

  // If the language is invalid, log a warning and return the unchanged (default) language
  debugLog(
    true,
    'error',
    translate(StringName.Error_InvalidLanguageCodeTemplate, {
      LANGUAGE: consoleLanguage,
      DEFAULT_LANGUAGE: GlobalActiveContext.adminLanguage,
    }),
  );
  return GlobalActiveContext.adminLanguage;
}
