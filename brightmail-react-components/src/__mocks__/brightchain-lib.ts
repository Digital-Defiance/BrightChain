/**
 * Shared mock for @brightchain/brightchain-lib used by babel-jest projects.
 *
 * babel-jest cannot handle TypeScript enums from source files, so this mock
 * provides the commonly needed exports as plain objects/functions.
 *
 * Individual test files can override this with jest.mock() for more specific mocking.
 */

export const BrightDateDisplayMode = {
  Dual: 'dual',
  BrightDateOnly: 'brightDateOnly',
  LocaleOnly: 'localeOnly',
  Hover: 'hover',
  HoverReverse: 'hoverReverse',
};

export function toBrightDateString(
  date: Date | string,
  precision?: number,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const daysSinceJ2000 = (d.getTime() - 946684800000) / 86400000;
  return daysSinceJ2000.toFixed(precision ?? 5);
}

export function formatDateByMode(
  _date: Date | string,
  localeStr: string,
): string {
  return localeStr;
}

export function getDateTooltip(): string {
  return '';
}

export const BrightChainStrings = new Proxy(
  {},
  { get: (_target, prop) => String(prop) },
);

export const BrightChainComponentId = 'brightchain';

export const MessageEncryptionScheme = {
  NONE: 'none',
  SHARED_KEY: 'shared_key',
  RECIPIENT_KEYS: 'recipient_keys',
  S_MIME: 's_mime',
  GPG: 'gpg',
};

export const CONSTANTS = {
  THEME_COLORS: {
    CHAIN_BLUE: '#1976d2',
    CHAIN_BLUE_LIGHT: '#42a5f5',
    CHAIN_BLUE_DARK: '#1565c0',
    BRIGHT_CYAN: '#00bcd4',
    BRIGHT_CYAN_LIGHT: '#4dd0e1',
    BRIGHT_CYAN_DARK: '#0097a7',
    ERROR_RED: '#d32f2f',
    ALERT_ORANGE: '#ed6c02',
    SECURE_GREEN: '#2e7d32',
  },
};

export const THEME_COLORS = CONSTANTS.THEME_COLORS;

export function getBrightChainI18nEngine() {
  return {
    translate: (_componentId: string, key: string) => key,
    translateEnum: (_enumType: unknown, value: unknown) => String(value),
    registerIfNotExists: () => undefined,
    registerStringKeyEnum: () => undefined,
    registerConstants: () => undefined,
    hasInstance: () => true,
  };
}

export function registerI18nComponentPackage() {
  return undefined;
}

export const EmailEncryptionService = class {
  decryptEmailBody = async (_metadata: unknown, body: string) => body;
  encryptEmailBody = async (_metadata: unknown, body: string) => body;
};

export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

export function validateAttachmentSize(size: number, max: number): boolean {
  return size <= max;
}

export function validateTotalAttachmentSize(
  sizes: number[],
  max: number,
): boolean {
  return sizes.reduce((a, b) => a + b, 0) <= max;
}
