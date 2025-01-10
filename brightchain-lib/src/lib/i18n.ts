import constants from './constants';
import { MemberTypeTranslations } from './enumeration-translations/memberType';
import { QuorumDataRecordActionTypeTranslations } from './enumeration-translations/quorumDataRecordAction';
import { StringLanguages } from './enumerations/stringLanguages';
import { StringNames } from './enumerations/stringNames';
import { TranslatableEnumType } from './enumerations/translatableEnum';
import { TranslatableEnum, TranslationsMap } from './i18n.types';
import { ILanguageContext } from './interfaces/languageContext';
import { LanguageCodes } from './languageCodes';
import { DefaultLanguage, StringsCollection } from './sharedTypes';
import { Strings } from './strings';

/**
 * Builds a nested object from a flat object.
 * @param strings The flat object to build the nested object from
 * @returns The nested object
 */
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

/**
 * Builds nested I18n object for a specific language
 * @param language The language to build the nested I18n object for
 * @returns The nested I18n object
 */
export const buildNestedI18nForLanguage = (
  language: StringLanguages,
): Record<string, any> => {
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
  otherVars?: Record<string, string>,
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
      replacement = otherVars[varName];
    } else if (varName in constants) {
      replacement = (constants as any)[varName].toString(); // Handle non-string constants
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
  otherVars?: Record<string, string>,
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
    const enumTranslations = translations[lang] as Record<string, string>;
    if (enumTranslations[value]) {
      return enumTranslations[value];
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
