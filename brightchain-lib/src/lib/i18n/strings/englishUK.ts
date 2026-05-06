import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';
import { AmericanEnglishStrings } from './englishUs';

export const BritishEnglishStrings: ComponentStrings<BrightChainStringKey> = {
  ...AmericanEnglishStrings,
  // Override spelling differences between British and American English

  // Service Provider Errors - "initialized" -> "initialised"
  [BrightChainStrings.Error_ServiceProvider_NotInitialized]:
    'ServiceProvider has not been initialised',

  // Block Service Errors - "initialized" -> "initialised"
  [BrightChainStrings.Error_BlockServiceError_AlreadyInitialized]:
    'BlockService subsystem already initialised',
  [BrightChainStrings.Error_BlockServiceError_Uninitialized]:
    'BlockService subsystem not initialised',

  // BrightTrust Error - "initialized" -> "initialised"
  [BrightChainStrings.Error_BrightTrustError_Uninitialized]:
    'BrightTrust subsystem not initialised',

  // Document Error - "initialized" -> "initialised"
  [BrightChainStrings.Error_DocumentError_AlreadyInitialized]:
    'Document subsystem is already initialised',
  [BrightChainStrings.Error_DocumentError_Uninitialized]:
    'Document subsystem is not initialised',
  // ── DatePage ──
  [BrightChainStrings.DatePage_Title]: 'Date & Time',
  [BrightChainStrings.DatePage_BrightDateEpochLabel]: 'BrightDate (decimal days since J2000.0)',
  [BrightChainStrings.DatePage_HolidaysTitle]: "Today's Holidays & Observances",
  [BrightChainStrings.DatePage_AllFormatsTitle]: 'All Date Formats',
  [BrightChainStrings.DatePage_AboutBrightDateTitle]: 'About BrightDate',
  [BrightChainStrings.DatePage_AboutBrightDate_Epoch]: 'BrightDate counts decimal days since the J2000.0 epoch (January 1, 2000 at 12:00:00 UTC). This is the same epoch used by astronomers worldwide for celestial mechanics.',
  [BrightChainStrings.DatePage_AboutBrightDate_Fraction]: 'The integer part is the day count. The fractional part is the decimal time of day. For example, 0.5 = noon, 0.25 = 06:00, 0.75 = 18:00.',
  [BrightChainStrings.DatePage_AboutBrightDate_NoTimezones]: 'No time zones, no daylight saving, no ambiguity — just one number on one timeline.',
  [BrightChainStrings.DatePage_Format_BrightDateFull]: 'BrightDate (full precision)',
  [BrightChainStrings.DatePage_Format_BrightDateCompact]: 'BrightDate (compact)',
  [BrightChainStrings.DatePage_Format_BrightDateStandard]: 'BrightDate (standard)',
  [BrightChainStrings.DatePage_Format_ISO8601]: 'ISO 8601',
  [BrightChainStrings.DatePage_Format_UTC]: 'UTC',
  [BrightChainStrings.DatePage_Format_LocalDateTime]: 'Local Date & Time',
  [BrightChainStrings.DatePage_Format_LocalDate]: 'Local Date',
  [BrightChainStrings.DatePage_Format_LocalTime]: 'Local Time',
  [BrightChainStrings.DatePage_Format_UnixTimestamp]: 'Unix Timestamp',
  [BrightChainStrings.DatePage_Format_UnixMs]: 'Unix Milliseconds',
  [BrightChainStrings.DatePage_Format_JulianDate]: 'Julian Date',
  [BrightChainStrings.DatePage_Format_ModifiedJulianDate]: 'Modified Julian Date',
  [BrightChainStrings.DatePage_Format_DayOfYear]: 'Day of Year',
  [BrightChainStrings.DatePage_Format_ISOWeek]: 'ISO Week',
  [BrightChainStrings.DatePage_Format_RFC2822]: 'RFC 2822',
  [BrightChainStrings.DatePage_HolidayType_Public]: 'Public Holiday',
  [BrightChainStrings.DatePage_HolidayType_Bank]: 'Bank Holiday',
  [BrightChainStrings.DatePage_HolidayType_Observance]: 'Observance',
  [BrightChainStrings.DatePage_HolidayType_Religious]: 'Religious',
};
