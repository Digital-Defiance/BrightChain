/**
 * Healthcare Role Codes (SNOMED CT)
 *
 * Constants for key SNOMED CT role codes used in the BrightChart
 * healthcare role layer. These codes identify practitioner and
 * patient role types following FHIR PractitionerRole conventions.
 *
 * @see https://browser.ihtsdotools.org/
 * @module roles/healthcareRoleCodes
 */

import { getBrightChainI18nEngine } from '@brightchain/brightchain-lib';
import {
  BrightChartComponentId,
  BrightChartStrings,
} from '../enumerations/BrightChartStrings';

/** SNOMED CT code for Physician (309343006) */
export const PHYSICIAN = '309343006';

/** SNOMED CT code for Registered Nurse (224535009) */
export const REGISTERED_NURSE = '224535009';

/** SNOMED CT code for Medical Assistant (309453006) */
export const MEDICAL_ASSISTANT = '309453006';

/** SNOMED CT code for Patient (116154003) */
export const PATIENT = '116154003';

/** SNOMED CT code for Clinical Administrator (394572006) */
export const ADMIN = '394572006';

/** SNOMED CT code for Dentist (106289002) */
export const DENTIST = '106289002';

/** SNOMED CT code for Veterinarian (106290006) */
export const VETERINARIAN = '106290006';

/**
 * Map of role code constants to their i18n string keys.
 * Used by {@link getRoleCodeDisplay} to resolve translated display names.
 */
const ROLE_CODE_STRING_KEYS: Record<string, string> = {
  [PHYSICIAN]: BrightChartStrings.Role_Physician,
  [REGISTERED_NURSE]: BrightChartStrings.Role_RegisteredNurse,
  [MEDICAL_ASSISTANT]: BrightChartStrings.Role_MedicalAssistant,
  [PATIENT]: BrightChartStrings.Role_Patient,
  [ADMIN]: BrightChartStrings.Role_ClinicalAdministrator,
  [DENTIST]: BrightChartStrings.Role_Dentist,
  [VETERINARIAN]: BrightChartStrings.Role_Veterinarian,
};

/**
 * Fallback English display names for role codes.
 * Used when the i18n engine is not yet initialized.
 */
const ROLE_CODE_FALLBACK: Record<string, string> = {
  [PHYSICIAN]: 'Physician',
  [REGISTERED_NURSE]: 'Registered Nurse',
  [MEDICAL_ASSISTANT]: 'Medical Assistant',
  [PATIENT]: 'Patient',
  [ADMIN]: 'Clinical Administrator',
  [DENTIST]: 'Dentist',
  [VETERINARIAN]: 'Veterinarian',
};

/**
 * Map of role code constants to their human-readable display names.
 *
 * @deprecated Use {@link getRoleCodeDisplay} for i18n-aware display names.
 * This static map is retained for backward compatibility and test fixtures.
 */
export const ROLE_CODE_DISPLAY: Record<string, string> = ROLE_CODE_FALLBACK;

/**
 * Get the i18n-translated display name for a healthcare role code.
 * Falls back to the English name if the i18n engine is not initialized.
 *
 * @param code - SNOMED CT role code constant
 * @returns Translated display name for the current language
 */
export function getRoleCodeDisplay(code: string): string {
  const key = ROLE_CODE_STRING_KEYS[code];
  if (!key) return code;
  try {
    const engine = getBrightChainI18nEngine();
    return engine.translate(BrightChartComponentId, key);
  } catch {
    return ROLE_CODE_FALLBACK[code] ?? code;
  }
}
