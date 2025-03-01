import constants from './constants';
import { BlockSizeTranslations } from './enumeration-translations/blockSize';
import { BlockTypeTranslations } from './enumeration-translations/blockType';
import { MemberTypeTranslations } from './enumeration-translations/memberType';
import { QuorumDataRecordActionTypeTranslations } from './enumeration-translations/quorumDataRecordAction';
import { StringLanguages } from './enumerations/stringLanguages';
import { StringNames } from './enumerations/stringNames';
import { TranslatableEnumType } from './enumerations/translatableEnum';
import {
  StringOrObject,
  TranslatableEnum,
  TranslationsMap,
} from './i18n.types';
import { ILanguageContext } from './interfaces/languageContext';
import { LanguageCodes } from './languageCodes';
import { DefaultLanguage, StringsCollection } from './sharedTypes';
import { Strings } from './strings';

/**
 * Helper function to set a nested value in an object
 */
function setNestedValue(
  obj: { [key: string]: StringOrObject },
  path: string[],
  value: string,
): void {
  let current = obj;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = {};
    } else if (typeof current[key] === 'string') {
      throw new Error(
        `Key conflict detected: Key '${key}' is assigned both a value and an object.`,
      );
    }
    current = current[key] as { [key: string]: StringOrObject };
  }

  const lastKey = path[path.length - 1];
  if (typeof current[lastKey] === 'object') {
    throw new Error(
      `Key conflict detected: Cannot assign string to key '${lastKey}' because it's already used as an object.`,
    );
  }
  current[lastKey] = value;
}

function getNestedValue(obj: any, path: string[]): any {
  return path.reduce(
    (current, key) =>
      current && typeof current === 'object' ? current[key] : undefined,
    obj,
  );
}

/**
 * Builds a nested object from a flat object.
 * @param strings The flat object to build the nested object from
 * @returns The nested object
 */
export const buildNestedI18n = (
  strings: StringsCollection,
): Record<string, StringOrObject> => {
  const result: { [key: string]: StringOrObject } = {};

  Object.entries(strings).forEach(([key, value]) => {
    const keys = key.split('_');
    setNestedValue(result, keys, value);
  });

  return result as Record<string, StringOrObject>;
};

/**
 * Builds nested I18n object for a specific language
 * @param language The language to build the nested I18n object for
 * @returns The nested I18n object
 */
export const buildNestedI18nForLanguage = (
  language: StringLanguages,
): Record<string, StringOrObject> => {
  if (!Strings[language]) {
    throw new Error(`Strings not found for language: ${language}`);
  }

  return buildNestedI18n(Strings[language]);
};

/**
 * Replaces underscores with dots
 * @param name The string name
 * @returns The string name with underscores replaced with dots
 */
export const stringNameToI18nKey = (name: StringNames) =>
  name.replace('_', '.'); // only replace the first underscore

/**
 * Replaces variables in a string with their corresponding values from the constants object
 * @param str The string with variables to replace
 * @returns The string with variables replaced
 */
export function replaceVariables(
  str: string,
  otherVars?: Record<string, string | number>,
): string {
  const variables = str.match(/\{(.+?)\}/g);
  if (!variables) {
    return str; // No placeholders, return original string
  }

  let result = str; // Start with the original string

  for (const variable of variables) {
    const varName = variable.slice(1, -1); // Extract variable name
    let replacement = '';

    if (otherVars && varName in otherVars) {
      replacement =
        typeof otherVars[varName] === 'string'
          ? otherVars[varName]
          : otherVars[varName].toString();
    } else if (varName in constants) {
      const constantValue = constants[varName as keyof typeof constants];
      replacement = constantValue?.toString() ?? '';
    } else {
      const path = varName.split('.');
      const value = getNestedValue(constants, path);
      if (value !== undefined) {
        replacement = value.toString();
      }
    }
    //If the variable is not found in constants or otherVars, leave it unchanged
    result = result.replace(variable, replacement);
  }

  return result;
}

/**
 * Translates a string
 * @param name The string name
 * @param language The language to translate the string to
 * @returns The translated string
 */
export const translate = (
  name: StringNames,
  language?: StringLanguages,
  otherVars?: Record<string, string | number>,
): string => {
  const lang = language ?? GlobalLanguageContext.language;
  if (!Strings[lang]) {
    console.warn(`Language ${lang} not found in Strings`);
    return name; // Fallback to the string name itself
  }
  const stringValue = Strings[lang][name];
  if (stringValue === undefined) {
    console.warn(`String ${name} not found for language ${lang}`);
    return name; // Fallback to the string name itself
  }
  return (name as string).toLowerCase().endsWith('template')
    ? replaceVariables(stringValue, otherVars)
    : stringValue;
};

/**
 * Translation map
 */
export const translationsMap: TranslationsMap = {
  [TranslatableEnumType.BlockSize]: BlockSizeTranslations,
  [TranslatableEnumType.BlockType]: BlockTypeTranslations,
  [TranslatableEnumType.MemberType]: MemberTypeTranslations,
  [TranslatableEnumType.QuorumDataRecordAction]:
    QuorumDataRecordActionTypeTranslations,
};

/**
 * Translates an enum value
 * @param param0 A translatable enum
 * @param language The language to translate to
 * @returns The translated enum value
 */
export const translateEnum = (
  { type, value }: TranslatableEnum,
  language?: StringLanguages,
): string => {
  const lang = language ?? GlobalLanguageContext.language;
  const translations = translationsMap[type];
  if (translations && translations[lang]) {
    const enumTranslations = translations[lang];
    // value is already the correct string literal type from the enum
    if (value in enumTranslations) {
      return enumTranslations[value as keyof typeof enumTranslations];
    }
  }
  throw new Error(
    `Unknown enum value: ${value} for type: ${type} and language: ${lang}`,
  );
};

/**
 * Global language context
 */
export const GlobalLanguageContext: ILanguageContext = {
  language: DefaultLanguage,
};

/**
 * Gets the language code from a language name
 * @param language The language name
 * @returns The language code
 */
export function getLanguageCode(language: string): StringLanguages {
  for (const [key, value] of Object.entries(LanguageCodes)) {
    if (value === language) {
      return key as StringLanguages;
    }
  }
  throw new Error(`Unknown language code: ${language}`);
}

export default {
  buildNestedI18n,
  buildNestedI18nForLanguage,
  stringNameToI18nKey,
  translate,
  translateEnum,
  GlobalLanguageContext,
  getLanguageCode,
  replaceVariables,
  translationsMap,
  TranslatableEnumType,
};
