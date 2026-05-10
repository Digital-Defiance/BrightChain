/**
 * British English translations for BrightCal.
 *
 * Extends American English with British spelling overrides only.
 * This is the only language file permitted to reference en-US directly.
 */
import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightCalStringKey,
  BrightCalStrings,
} from '../../enumerations/brightCalStrings';
import { AmericanEnglishStrings } from './en-US';

export const BritishEnglishStrings: ComponentStrings<BrightCalStringKey> = {
  ...AmericanEnglishStrings,

  // ── British spelling overrides ──
  [BrightCalStrings.Error_InvalidHexColor]:
    'colour must be a valid hex colour code (e.g., "#FF5733")',
  [BrightCalStrings.Error_NoUpdateFields]:
    'At least one field (displayName, colour, description) must be provided',
};
