/* eslint-disable @typescript-eslint/no-explicit-any */
import moment from 'moment-timezone';
import { GlobalActiveContext } from './global-active-context';
import { t } from './i18n';
import { LanguageContext } from './sharedTypes';

export type DEBUG_TYPE = 'error' | 'warn' | 'log';

/**
 * Optionally prints certain debug messages
 * @param debug Whether to print debug messages
 * @param type What type of message to print
 * @param args Any args to print
 */
export function debugLog(
  debug: boolean,
  type: DEBUG_TYPE = 'log',
  ...args: any[]
): void {
  if (debug && type === 'error') {
    console.error(...args);
  } else if (debug && type === 'warn') {
    console.warn(...args);
  } else if (debug && type === 'log') {
    console.log(...args);
  }
}

/**
 * Translates a string and logs it if debug is enabled
 * @param debug Whether to print debug messages
 * @param type What type of message to print
 * @param context The context for the translation
 * @param stringValue The string to translate
 * @param otherVars Additional variables for the translation
 * @param args Additional arguments to log
 */
export function translatedDebugLog(
  debug: boolean,
  type: DEBUG_TYPE = 'log',
  context: LanguageContext = GlobalActiveContext.currentContext,
  stringValue: string,
  otherVars: Record<string, string | number>[] = [],
  ...args: any[]
) {
  const translatedString = t(
    stringValue,
    GlobalActiveContext.adminLanguage,
    context,
    ...otherVars,
  );
  debugLog(debug, type, translatedString, ...args);
}

export function isValidTimezone(timezone: string): boolean {
  return moment.tz.zone(timezone) !== null;
}

/**
 * Omits keys from an object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
