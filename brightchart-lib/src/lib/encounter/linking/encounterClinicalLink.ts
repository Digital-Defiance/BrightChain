/**
 * Encounter-Clinical Resource Linking Interfaces
 *
 * Provides bidirectional linking between encounters and clinical resources
 * (Observation, Condition, AllergyIntolerance, Medication, MedicationStatement,
 * Procedure). Resolves the forward-compatible encounter references stubbed
 * in Module 2 (Clinical Data Foundation).
 *
 * @module encounter/linking/encounterClinicalLink
 */

import type { ClinicalResourceType } from '../../clinical/resources/index';

/**
 * Represents a link between an encounter and a clinical resource.
 *
 * @see Requirements 8.1, 8.4
 */
export interface IEncounterClinicalLink<TID = string> {
  /** The encounter this link belongs to */
  encounterId: string;
  /** The clinical resource linked to the encounter */
  clinicalResourceId: string;
  /** The FHIR resource type of the linked clinical resource */
  clinicalResourceType: ClinicalResourceType;
  /** When the link was created */
  linkedAt: Date;
  /** The member who created the link */
  linkedBy: TID;
}

/**
 * Store interface for managing encounter-to-clinical-resource links.
 *
 * Supports both directions:
 * - encounter → clinical resources (getLinkedResources)
 * - clinical resource → encounter (getEncounterForResource)
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */
export interface IEncounterClinicalLinkStore<TID = string> {
  /** Link a clinical resource to an encounter */
  linkResource(
    encounterId: string,
    clinicalResourceId: string,
    clinicalResourceType: ClinicalResourceType,
    memberId: TID,
  ): Promise<void>;

  /** Remove a link between an encounter and a clinical resource */
  unlinkResource(
    encounterId: string,
    clinicalResourceId: string,
    memberId: TID,
  ): Promise<void>;

  /** Get all clinical resources linked to an encounter, optionally filtered by type */
  getLinkedResources(
    encounterId: string,
    resourceType?: ClinicalResourceType,
  ): Promise<IEncounterClinicalLink<TID>[]>;

  /** Get the encounter ID for a given clinical resource, or null if not linked */
  getEncounterForResource(clinicalResourceId: string): Promise<string | null>;
}
