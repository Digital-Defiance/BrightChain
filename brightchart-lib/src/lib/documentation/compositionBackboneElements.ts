/**
 * FHIR R4 Composition Backbone Elements
 *
 * Exported TypeScript interfaces for backbone elements used by the
 * Composition resource: CompositionSection, CompositionAttester,
 * CompositionRelatesTo, and CompositionEvent.
 *
 * Interfaces containing IReference fields are generic on `<TID = string>`
 * to support both frontend (string) and backend (Uint8Array) usage.
 *
 * @see https://build.fhir.org/composition.html
 * @module documentation/compositionBackboneElements
 */

import {
  ICodeableConcept,
  IIdentifier,
  INarrative,
  IPeriod,
  IReference,
} from '../fhir/datatypes';
import { AttestationMode, DocumentRelationshipType } from './enumerations';

/**
 * FHIR R4 Composition.section backbone element
 *
 * A nested, recursive structure representing a section within a clinical
 * document. Each section has a title, LOINC code, narrative text, and
 * optional entry references to clinical resources.
 *
 * @see https://build.fhir.org/composition-definitions.html#Composition.section
 */
export interface CompositionSection<TID = string> {
  /** Label for the section (e.g. "Subjective", "Assessment") */
  title?: string;
  /** Classification of section (recommended: LOINC section code) */
  code?: ICodeableConcept;
  /** Who and/or what authored the section */
  author?: IReference<TID>[];
  /** Who/what the section is about, when not about the subject of composition */
  focus?: IReference<TID>;
  /** Text summary of the section, for human interpretation */
  text?: INarrative;
  /** working | snapshot | changes */
  mode?: string;
  /** Order of section entries */
  orderedBy?: ICodeableConcept;
  /** References to clinical resources that support the section content */
  entry?: IReference<TID>[];
  /** Why the section is empty */
  emptyReason?: ICodeableConcept;
  /** Nested sub-sections (recursive) */
  section?: CompositionSection<TID>[];
}

/**
 * FHIR R4 Composition.attester backbone element
 *
 * A participant who has attested to the accuracy of the composition/document.
 * Records the mode of attestation (personal, professional, legal, official),
 * the time of attestation, and a reference to the attesting party.
 *
 * @see https://build.fhir.org/composition-definitions.html#Composition.attester
 */
export interface CompositionAttester<TID = string> {
  /** personal | professional | legal | official */
  mode: AttestationMode;
  /** When the composition was attested by the party */
  time?: string;
  /** Who attested the composition */
  party?: IReference<TID>;
}

/**
 * FHIR R4 Composition.relatesTo backbone element
 *
 * Describes a relationship this composition has with another composition
 * or document. The target can be an IReference to another Composition or
 * an IIdentifier for external document identification.
 *
 * @see https://build.fhir.org/composition-definitions.html#Composition.relatesTo
 */
export interface CompositionRelatesTo<TID = string> {
  /** replaces | transforms | signs | appends */
  code: DocumentRelationshipType;
  /** Target of the relationship — Reference to a Composition or an Identifier */
  targetReference?: IReference<TID>;
  /** Target of the relationship — Identifier for external documents */
  targetIdentifier?: IIdentifier<TID>;
}

/**
 * FHIR R4 Composition.event backbone element
 *
 * The clinical service(s) being documented. Describes the clinical act(s)
 * that the document is about, including the period and detail references.
 *
 * @see https://build.fhir.org/composition-definitions.html#Composition.event
 */
export interface CompositionEvent<TID = string> {
  /** Code(s) that apply to the event being documented */
  code?: ICodeableConcept[];
  /** The period covered by the documentation */
  period?: IPeriod;
  /** The event(s) being documented */
  detail?: IReference<TID>[];
}
