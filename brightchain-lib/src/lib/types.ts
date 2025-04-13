/**
 * Enum language translation type (stub for backward compatibility)
 * @deprecated This type is deprecated
 */
export type EnumLanguageTranslation<_T> = Record<
  string,
  Record<string | number, string>
>;

/**
 * Create translations helper (stub for backward compatibility)
 * @deprecated This function is deprecated
 */
export function createTranslations<T>(translations: T): T {
  return translations;
}
