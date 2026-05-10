/**
 * Medical Documentation Specialty Extension
 *
 * Standard LOINC document types and medical note templates (SOAP, H&P,
 * Discharge Summary, Procedure Note) for the medical specialty.
 *
 * @module documentation/specialty/medicalDocProfile
 */

import {
  CONSULTATION_NOTE,
  DISCHARGE_SUMMARY,
  HISTORY_AND_PHYSICAL,
  NURSE_NOTE,
  OPERATIVE_NOTE,
  PROCEDURE_NOTE,
  PROGRESS_NOTE,
  REFERRAL_NOTE,
  TRANSFER_SUMMARY,
} from '../enumerations';
import {
  DISCHARGE_SUMMARY_TEMPLATE,
  HISTORY_AND_PHYSICAL_TEMPLATE,
  PROCEDURE_NOTE_TEMPLATE,
  SOAP_NOTE_TEMPLATE,
} from '../templates/predefinedTemplates';
import type { IDocumentationSpecialtyExtension } from './documentationSpecialtyTypes';

/**
 * Medical documentation specialty extension.
 *
 * Includes standard LOINC document types and the four predefined
 * medical note templates.
 */
export const MEDICAL_DOCUMENTATION_EXTENSION: IDocumentationSpecialtyExtension =
  {
    specialtyCode: 'medical',
    noteTemplates: [
      SOAP_NOTE_TEMPLATE,
      HISTORY_AND_PHYSICAL_TEMPLATE,
      DISCHARGE_SUMMARY_TEMPLATE,
      PROCEDURE_NOTE_TEMPLATE,
    ],
    documentTypeExtensions: [
      CONSULTATION_NOTE,
      DISCHARGE_SUMMARY,
      HISTORY_AND_PHYSICAL,
      PROGRESS_NOTE,
      PROCEDURE_NOTE,
      OPERATIVE_NOTE,
      NURSE_NOTE,
      REFERRAL_NOTE,
      TRANSFER_SUMMARY,
    ],
    sectionExtensions: [],
    validationRules: [],
  };
