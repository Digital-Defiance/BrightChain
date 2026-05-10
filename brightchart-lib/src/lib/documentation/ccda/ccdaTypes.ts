/**
 * C-CDA Generation and Consumption Interfaces
 *
 * Defines interfaces for generating and consuming Consolidated Clinical
 * Document Architecture (C-CDA) XML documents for interoperability under
 * the 21st Century Cures Act. C-CDA is generated on-demand for export
 * and consumed on-demand for import; it is not a storage format.
 *
 * @module documentation/ccda/ccdaTypes
 */

import type { ClinicalResource } from '../../clinical/resources/index';
import type { IEncounterResource } from '../../encounter/encounterResource';
import type { IPatientResource } from '../../fhir/patientResource';
import type { ICompositionResource } from '../compositionResource';

/**
 * C-CDA document generator interface.
 *
 * Produces a C-CDA XML string from a Composition resource with
 * associated patient, encounter, and clinical resource context.
 */
export interface ICCDAGenerator<TID = string> {
  /**
   * Generate a C-CDA XML document from a Composition and its context.
   *
   * @param composition - The source Composition resource
   * @param patient - The patient the document is about
   * @param encounter - Optional encounter context
   * @param clinicalResources - Optional clinical resources referenced in sections
   * @returns C-CDA XML string
   */
  generate(
    composition: ICompositionResource<TID>,
    patient: IPatientResource<TID>,
    encounter?: IEncounterResource<TID>,
    clinicalResources?: ClinicalResource<TID>[],
  ): Promise<string>;
}

/**
 * Result of consuming (importing) a C-CDA XML document.
 */
export interface ICCDAImportResult<TID = string> {
  /** The parsed Composition resource */
  composition: ICompositionResource<TID>;
  /** The parsed Patient resource (if present in the C-CDA) */
  patient?: IPatientResource<TID>;
  /** The parsed Encounter resource (if present in the C-CDA) */
  encounter?: IEncounterResource<TID>;
  /** Clinical resources extracted from the C-CDA sections */
  clinicalResources: ClinicalResource<TID>[];
  /** Warnings for data that could not be mapped to FHIR resources */
  warnings: string[];
}

/**
 * C-CDA document consumer interface.
 *
 * Parses a C-CDA XML document and produces FHIR resources.
 */
export interface ICCDAConsumer<TID = string> {
  /**
   * Consume a C-CDA XML document and produce FHIR resources.
   *
   * @param ccdaXml - The C-CDA XML string to parse
   * @returns Import result with parsed resources and warnings
   */
  consume(ccdaXml: string): Promise<ICCDAImportResult<TID>>;
}

/**
 * Supported C-CDA document type constants.
 */
export const CCDADocumentType = {
  /** Continuity of Care Document */
  CCD: 'CCD',
  /** Discharge Summary */
  DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
  /** History and Physical */
  HISTORY_AND_PHYSICAL: 'HISTORY_AND_PHYSICAL',
  /** Progress Note */
  PROGRESS_NOTE: 'PROGRESS_NOTE',
  /** Consultation Note */
  CONSULTATION_NOTE: 'CONSULTATION_NOTE',
  /** Procedure Note */
  PROCEDURE_NOTE: 'PROCEDURE_NOTE',
} as const;

/** Type for C-CDA document type values */
export type CCDADocumentTypeValue =
  (typeof CCDADocumentType)[keyof typeof CCDADocumentType];
