/**
 * FHIR R4 DiagnosticReport Resource with BrightChain Metadata
 *
 * Defines the `IDiagnosticReportResource<TID>` interface representing a FHIR R4
 * DiagnosticReport resource augmented with BrightChain storage metadata.
 * Supports lab results, radiology reports, and pathology reports that group
 * Observations from Module 2 into a coherent report with interpretation.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see https://build.fhir.org/diagnosticreport.html
 * @module orders/diagnosticReportResource
 */

import { IAttachment } from '../documentation/documentReferenceBackboneElements';
import {
  ICodeableConcept,
  IExtension,
  IIdentifier,
  IMeta,
  INarrative,
  IPeriod,
  IReference,
} from '../fhir/datatypes';
import { IBrightchainMetadata } from '../fhir/patientResource';
import { DiagnosticReportMedia } from './backboneElements';
import { DiagnosticReportStatus } from './enumerations';

/**
 * FHIR R4 DiagnosticReport Resource with BrightChain extensions.
 *
 * Represents the results of a diagnostic service — lab reports, radiology
 * reports, pathology reports. Groups Observation resources from Module 2
 * into a coherent report with interpretation, conclusion, and presented form.
 * The `basedOn` field links back to the originating ServiceRequest or
 * MedicationRequest.
 *
 * @see https://build.fhir.org/diagnosticreport.html
 */
export interface IDiagnosticReportResource<TID = string> {
  /** Fixed value: 'DiagnosticReport' */
  resourceType: 'DiagnosticReport';

  // --- FHIR metadata fields ---

  /** Logical id of this artifact */
  id?: string;

  /** Metadata about the resource */
  meta?: IMeta;

  /** Text summary of the resource */
  text?: INarrative;

  /** Additional content defined by implementations */
  extension?: IExtension[];

  // --- BrightChain metadata ---

  /** BrightChain storage metadata */
  brightchainMetadata: IBrightchainMetadata<TID>;

  // --- FHIR R4 DiagnosticReport fields ---

  /** Business identifiers assigned to this diagnostic report */
  identifier?: IIdentifier<TID>[];

  /** What was requested (references to ServiceRequest/MedicationRequest) */
  basedOn?: IReference<TID>[];

  /** registered | partial | preliminary | final | amended | corrected | appended | cancelled | entered-in-error | unknown (required) */
  status: DiagnosticReportStatus;

  /** Service category (e.g. laboratory, radiology, pathology) */
  category?: ICodeableConcept[];

  /** Name/code for this diagnostic report (required) */
  code: ICodeableConcept;

  /** The subject of the report — usually a patient */
  subject?: IReference<TID>;

  /** Health care event when test ordered */
  encounter?: IReference<TID>;

  /** Clinically relevant time/time-period for report — dateTime */
  effectiveDateTime?: string;

  /** Clinically relevant time/time-period for report — Period */
  effectivePeriod?: IPeriod;

  /** DateTime this version was made (instant) */
  issued?: string;

  /** Responsible diagnostic service (array of references to Practitioner/PractitionerRole/Organization/CareTeam) */
  performer?: IReference<TID>[];

  /** Primary result interpreter (array of references to Practitioner/PractitionerRole/Organization/CareTeam) */
  resultsInterpreter?: IReference<TID>[];

  /** Specimens this report is based on */
  specimen?: IReference<TID>[];

  /** Observations — result references (to Observation from Module 2) */
  result?: IReference<TID>[];

  /** Reference to full details of imaging associated with the diagnostic report */
  imagingStudy?: IReference<TID>[];

  /** Key images associated with this report */
  media?: DiagnosticReportMedia<TID>[];

  /** Clinical conclusion (interpretation) of test results */
  conclusion?: string;

  /** Codes for the clinical conclusion of test results */
  conclusionCode?: ICodeableConcept[];

  /** Entire report as issued (e.g. PDF) */
  presentedForm?: IAttachment[];
}
