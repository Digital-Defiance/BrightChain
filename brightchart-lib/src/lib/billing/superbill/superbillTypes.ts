/**
 * Superbill / Encounter Charge Capture Interfaces
 *
 * Defines the superbill line item, superbill resource, and superbill
 * service interface for encounter-level charge capture.
 *
 * @see Requirements 11.1, 11.2, 11.3
 * @module billing/superbill
 */

import type { ICodeableConcept } from '../../fhir/datatypes';
import type { IClaimResource } from '../claimResource';
import type { SuperbillStatus } from '../enumerations';
import type { IMoney } from '../moneyType';

/**
 * A single line item on a superbill representing a billable
 * procedure or service performed during an encounter.
 *
 * @see Requirement 11.2
 */
export interface ISuperbillLineItem {
  /** Line item sequence number */
  sequence: number;
  /** Procedure/service code (CPT or CDT) */
  procedureCode: ICodeableConcept;
  /** Procedure modifiers */
  modifiers: ICodeableConcept[];
  /** Quantity of the procedure/service */
  quantity: number;
  /** Charge per unit */
  unitCharge: IMoney;
  /** Total charge for this line item (quantity × unitCharge) */
  totalCharge: IMoney;
  /** Indexes into the superbill diagnoses array linking diagnoses to this line item */
  diagnosisPointers: number[];
  /** Body site (e.g. tooth number for dental) */
  bodySite?: ICodeableConcept;
  /** Sub-site (e.g. tooth surface codes for dental) */
  subSite?: ICodeableConcept[];
}

/**
 * An encounter-level charge capture form listing all billable
 * services performed during a visit.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 11.1
 */
export interface ISuperbill<_TID = string> {
  /** Unique identifier for this superbill */
  superbillId: string;
  /** Associated encounter identifier */
  encounterId: string;
  /** Patient identifier */
  patientId: string;
  /** Rendering provider identifier */
  providerId: string;
  /** Date of service */
  dateOfService: Date;
  /** Diagnoses (ICD-10 codes) for this encounter */
  diagnoses: ICodeableConcept[];
  /** Billable line items */
  lineItems: ISuperbillLineItem[];
  /** Superbill status */
  status: SuperbillStatus;
  /** Total charge for all line items */
  totalCharge: IMoney;
}

/**
 * Service interface for superbill management and claim generation.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 11.3
 */
export interface ISuperbillService<TID = string> {
  /**
   * Create a superbill from an encounter, auto-populating diagnoses
   * and procedures from encounter data.
   * @param encounterId - Encounter to create superbill from
   * @param memberId - Member performing the action
   * @returns The created superbill
   */
  createFromEncounter(
    encounterId: string,
    memberId: TID,
  ): Promise<ISuperbill<TID>>;

  /**
   * Add a line item to an existing superbill.
   * @param superbillId - Superbill to add the line item to
   * @param lineItem - Line item to add
   * @param memberId - Member performing the action
   * @returns The updated superbill
   */
  addLineItem(
    superbillId: string,
    lineItem: ISuperbillLineItem,
    memberId: TID,
  ): Promise<ISuperbill<TID>>;

  /**
   * Remove a line item from an existing superbill.
   * @param superbillId - Superbill to remove the line item from
   * @param sequence - Sequence number of the line item to remove
   * @param memberId - Member performing the action
   * @returns The updated superbill
   */
  removeLineItem(
    superbillId: string,
    sequence: number,
    memberId: TID,
  ): Promise<ISuperbill<TID>>;

  /**
   * Finalize a superbill, locking it for claim generation.
   * @param superbillId - Superbill to finalize
   * @param memberId - Member performing the action
   * @returns The finalized superbill
   */
  finalize(superbillId: string, memberId: TID): Promise<ISuperbill<TID>>;

  /**
   * Generate a FHIR R4 Claim from a finalized superbill.
   * @param superbillId - Superbill to generate claim from
   * @param coverageId - Coverage to use for the claim
   * @param memberId - Member performing the action
   * @returns The generated claim resource
   */
  generateClaim(
    superbillId: string,
    coverageId: string,
    memberId: TID,
  ): Promise<IClaimResource<TID>>;
}
