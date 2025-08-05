/* eslint-disable @typescript-eslint/no-explicit-any */
import { CONSTANTS } from './constants';
import { StringLanguages } from './enumerations/stringLanguages';
import { StringNames } from './enumerations/stringNames';
import { GlobalActiveContext } from './global-active-context';
import { LanguageCodes } from './languageCodes';
import {
  CurrencyPosition,
  LanguageContext,
  StringsCollection,
} from './sharedTypes';
import { Strings } from './strings';
import { EnumLanguageTranslation } from './types';
import { debugLog } from './utils';

/**
 * Helper to get enum name from enum object
 */
export function getEnumName<T extends Record<string, string | number>>(
  enumObj: T,
): string {
  // Try to get the constructor name first
  if (enumObj.constructor && enumObj.constructor.name !== 'Object') {
    return enumObj.constructor.name;
  }

  // Fallback: try to find the enum name from the keys pattern
  const keys = Object.keys(enumObj);
  const values = Object.values(enumObj);

  // For numeric enums, keys and values will have different lengths
  if (keys.length !== values.length) {
    // This is likely a numeric enum, use a heuristic to get the name
    return 'UnknownEnum';
  }

  return 'UnknownEnum';
}

/**
 * Enhanced translation registry with better type inference
 */
export class TranslationRegistry {
  private static translations = new Map<
    Record<string, string | number>,
    EnumLanguageTranslation<string | number>
  >();

  static register<T extends string | number>(
    enumObj: Record<string, T>,
    translations: EnumLanguageTranslation<T>,
  ): void {
    this.translations.set(enumObj, translations);
  }

  static get<T extends string | number>(
    enumObj: Record<string, string | number>,
  ): EnumLanguageTranslation<T> | undefined {
    return this.translations.get(enumObj) as
      | EnumLanguageTranslation<T>
      | undefined;
  }

  static translate<T extends string | number>(
    enumObj: Record<string, T>,
    value: T,
    language: StringLanguages,
  ): string {
    const translations = this.get<T>(enumObj);
    const enumName = getEnumName(enumObj);
    if (!translations) {
      throw new Error(
        translate(
          StringNames.Error_NoTranslationsForEnumTemplate,
          {
            enumName,
          },
          language,
        ),
      );
    }

    const langTranslations = translations[language];
    if (!langTranslations) {
      throw new Error(
        translate(
          StringNames.Error_LanguageNotFoundForEnumTemplate,
          {
            lang: language,
            enumName,
          },
          language,
        ),
      );
    }

    // For numeric enums, try both the numeric value and string key
    let result = langTranslations[value];
    if (!result && typeof value === 'number') {
      // Find the string key for this numeric value
      const stringKey = Object.keys(enumObj).find(
        (key) => enumObj[key] === value,
      );
      if (stringKey) {
        result = langTranslations[stringKey as T];
      }
    }

    if (!result) {
      throw new Error(
        translate(
          StringNames.Error_NoTranslationsForEnumLanguageTemplate,
          {
            lang: language,
            enumName,
            value: String(value),
          },
          language,
        ),
      );
    }

    return result;
  }

  static getAll(): Map<
    Record<string, string | number>,
    EnumLanguageTranslation<string | number>
  > {
    return new Map(this.translations);
  }

  static has(enumObj: Record<string, string | number>): boolean {
    return this.translations.has(enumObj);
  }
}

/**
 * Register enum translations using the actual enum object
 */
export function registerTranslation<T extends Record<string, string | number>>(
  enumObj: T,
  translations: EnumLanguageTranslation<T[keyof T]>,
): EnumLanguageTranslation<T[keyof T]> {
  TranslationRegistry.register(
    enumObj as Record<string, string | number>,
    translations as EnumLanguageTranslation<string | number>,
  );
  return translations;
}

/**
 * Generic enum translation function that works with any registered enum
 */
export function translateEnumValue<T extends string | number>(
  enumObj: Record<string, string | number>,
  value: T,
  language?: StringLanguages,
): string {
  const lang = language ?? GlobalActiveContext.language;
  const translations = TranslationRegistry.get<T>(enumObj);
  const enumName = getEnumName(enumObj);

  if (!translations) {
    throw new Error(
      translate(
        StringNames.Error_NoTranslationsForEnumTemplate,
        {
          enumName,
        },
        lang,
      ),
    );
  }

  if (!translations[lang]) {
    console.warn(
      translate(
        StringNames.Error_LanguageNotFoundForEnumTemplate,
        {
          lang,
          enumName,
        },
        lang,
      ),
    );
    return String(value);
  }

  const enumTranslations = translations[lang] as Record<string, string>;
  if (enumTranslations[value as string]) {
    return enumTranslations[value as string];
  }

  throw new Error(
    translate(
      StringNames.Error_UnknownEnumValueForEnumTemplate,
      {
        value: String(value),
        enumName,
      },
      lang,
    ),
  );
}

export const buildNestedI18n = (
  strings: StringsCollection,
): Record<string, any> => {
  const result: Record<string, any> = {};

  Object.entries(strings).forEach(([key, value]) => {
    const keys = key.split('_');
    let current = result;

    keys.forEach((k, index) => {
      if (index === keys.length - 1) {
        // Assign the value at the deepest level
        if (typeof current[k] === 'object' && current[k] !== null) {
          throw new Error(
            `Key conflict detected: Cannot assign string to key '${k}' because it's already used as an object.`,
          );
        }
        current[k] = value;
      } else {
        // Create nested objects if they don't exist
        if (!(k in current)) {
          current[k] = {};
        } else if (typeof current[k] !== 'object' || current[k] === null) {
          // Conflict detected
          throw new Error(
            `Key conflict detected: Key '${k}' is assigned both a value and an object.`,
          );
        }
        current = current[k];
      }
    });
  });

  return result;
};

export const buildNestedI18nForLanguage = (language: StringLanguages) => {
  if (!Strings[language]) {
    throw new Error(`Strings not found for language: ${language}`);
  }

  return buildNestedI18n(Strings[language]);
};

export function getNestedValue(obj: any, path: string[]): any {
  return path.reduce(
    (current, key) =>
      current && typeof current === 'object' ? current[key] : undefined,
    obj,
  );
}

/**
 * Replaces variables in a string with their corresponding values from the provided variables
 * @param str The string with variables to replace
 * @param currentLanguage The current language
 * @param currentContext The current context
 * @param otherVars Additional variables to replace
 * @param visitedStringNames Set to track visited StringNames to prevent infinite loops
 * @returns The string with variables replaced
 */
export function replaceVariables(
  str: string,
  currentLanguage: StringLanguages,
  currentContext: LanguageContext,
  otherVars?: Record<string, string | number>,
  visitedStringNames?: Set<StringNames>,
): string {
  const variables = str.match(/\{(.+?)\}/g);
  if (!variables) {
    return str; // No placeholders, return original string
  }

  let result = str; // Start with the original string
  const visited = visitedStringNames ?? new Set<StringNames>();

  for (const variable of variables) {
    const varName = variable.slice(1, -1); // Extract variable name
    let replacement = '';

    // First check if we have a variable in otherVars
    if (otherVars && varName in otherVars) {
      const varValue = otherVars[varName];
      const stringNameValue = Object.values(StringNames).find(
        (value) => value === varValue,
      );
      if (stringNameValue) {
        if (visited.has(stringNameValue)) {
          // Circular reference detected, leave the variable unchanged
          continue;
        }
        visited.add(stringNameValue);
        replacement = translate(
          stringNameValue,
          otherVars,
          currentLanguage,
          currentContext,
          visited,
        );
        visited.delete(stringNameValue);
      } else {
        replacement =
          typeof varValue === 'string' ? varValue : varValue.toString();
      }
    } else if (varName in CONSTANTS) {
      // Access the constant directly
      const value = CONSTANTS[varName as keyof typeof CONSTANTS];
      replacement = typeof value === 'string' ? value : String(value);
    }

    // Replace the variable if a replacement was found
    if (replacement) {
      result = result.replace(variable, replacement);
    }
    // If the variable is not found in either source, leave it unchanged
  }

  return result;
}

/**
 * Translates a string
 * @param name The string name
 * @param otherVars Additional variables for template replacement
 * @param language The language to translate the string to
 * @param context The context (admin/user)
 * @param visitedStringNames Set to track visited StringNames to prevent infinite loops
 * @returns The translated string
 */
export const translate = (
  name: StringNames,
  otherVars?: Record<string, string | number>,
  language?: StringLanguages,
  context: LanguageContext = GlobalActiveContext.currentContext,
  visitedStringNames?: Set<StringNames>,
): string => {
  const lang =
    language ??
    (context === 'admin'
      ? GlobalActiveContext.adminLanguage
      : GlobalActiveContext.language);
  if (!Strings[lang]) {
    const stringValue =
      Strings[lang][StringNames.Error_LanguageNotFoundInStringsTemplate];
    debugLog(
      true,
      'warn',
      replaceVariables(
        stringValue,
        lang,
        context,
        {
          LANG: lang,
        },
        visitedStringNames,
      ),
    );
    return name; // Fallback to the string name itself
  }
  const stringValue = Strings[lang][name];
  if (stringValue === undefined) {
    const warnValue =
      Strings[lang][StringNames.Admin_StringNotFoundForLanguageTemplate];
    debugLog(
      true,
      'warn',
      replaceVariables(
        warnValue,
        lang,
        context,
        {
          NAME: name,
          LANG: lang,
        },
        visitedStringNames,
      ),
    );
    return name; // Fallback to the string name itself
  }
  return (name as string).toLowerCase().endsWith('template')
    ? replaceVariables(
        stringValue,
        lang,
        context,
        otherVars,
        visitedStringNames,
      )
    : stringValue;
};

export type StringNameKeys = keyof typeof StringNames;

// Helper type to check if a string contains only valid StringName patterns
export type IsValidStringNameTemplate<T extends string> =
  T extends `${string}{{StringName.${infer Key}}}${infer Rest}`
    ? Key extends StringNameKeys
      ? IsValidStringNameTemplate<Rest>
      : false
    : true;

export function t<T extends string>(
  str: IsValidStringNameTemplate<T> extends true ? T : never,
  language?: StringLanguages,
  context: LanguageContext = 'admin',
  ...otherVars: Record<string, string | number>[]
): string {
  let varIndex = 0;
  const lang =
    language ??
    (context === 'admin'
      ? GlobalActiveContext.adminLanguage
      : GlobalActiveContext.language);

  // First replace StringName patterns
  let result = str.replace(/\{\{StringName\.(\w+)\}\}/g, (match, enumKey) => {
    const stringName = StringNames[enumKey as keyof typeof StringNames];
    const stringValue = Strings[lang]?.[stringName];
    const needsVars =
      (stringName as string).toLowerCase().endsWith('template') &&
      stringValue &&
      /\{.+\}/.test(stringValue);

    const vars = needsVars ? (otherVars[varIndex++] ?? {}) : {};
    return translate(stringName, vars, language, context);
  });

  // Then replace any remaining variables from all otherVars
  const allVars = otherVars.reduce((acc, vars) => ({ ...acc, ...vars }), {});
  result = replaceVariables(result, lang, context, allVars);

  return result;
}

export function getCurrencyFormat(locale: string, currencyCode: string) {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  });

  const parts = formatter.formatToParts(123.45);
  const symbol = parts.find((part) => part.type === 'currency')?.value || '';
  const symbolIndex = parts.findIndex((part) => part.type === 'currency');
  const decimalIndex = parts.findIndex((part) => part.type === 'decimal');

  let position: CurrencyPosition;
  if (symbolIndex < decimalIndex && symbolIndex === 0) {
    position = 'prefix';
  } else if (symbolIndex > decimalIndex) {
    position = 'postfix';
  } else {
    position = 'infix';
  }

  return {
    symbol,
    position,
    groupSeparator: parts.find((part) => part.type === 'group')?.value || ',',
    decimalSeparator:
      parts.find((part) => part.type === 'decimal')?.value || '.',
  };
}

export function formatCurrency(
  amount: number,
  currencyCode: string = GlobalActiveContext.currencyCode.value,
  language: string = LanguageCodes[GlobalActiveContext.language],
): string {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseCurrency(value: string | number): number {
  if (typeof value === 'string') {
    const numericValue = value.replace(/[^0-9.-]+/g, '');
    return parseFloat(numericValue);
  }
  return value;
}

export function getLanguageCode(language: string): StringLanguages {
  for (const [key, value] of Object.entries(LanguageCodes)) {
    if (value === language) {
      return key as StringLanguages;
    }
  }
  throw new Error(`Unknown language code: ${language}`);
}
