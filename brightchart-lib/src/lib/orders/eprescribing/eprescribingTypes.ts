/**
 * E-Prescribing Interface Types
 *
 * Defines interfaces for electronic prescription transmission workflows:
 * - IEPrescribingService: transmit, check status, cancel prescriptions
 * - IEPrescribingResult: transmission outcome
 * - IEPrescribingStatus: prescription transmission status tracking
 * - IPharmacySearchParams / IPharmacyInfo / IPharmacyDirectory: pharmacy lookup
 *
 * These are contract interfaces only — actual NCPDP SCRIPT or Surescripts
 * integration is a backend implementation concern.
 *
 * @see https://build.fhir.org/medicationrequest.html
 * @module orders/eprescribing/eprescribingTypes
 */

import { ICodeableConcept, IReference } from '../../fhir/datatypes';
import { IOperationOutcome } from '../../fhir/operationOutcome';
import { IMedicationRequestResource } from '../medicationRequestResource';

/**
 * Transmission status of an electronic prescription.
 */
export type TransmissionStatus =
  | 'queued'
  | 'transmitted'
  | 'received'
  | 'dispensed'
  | 'cancelled'
  | 'error';

/**
 * Result of an e-prescribing operation (transmit or cancel).
 *
 * @see Requirements 13.2
 */
export interface IEPrescribingResult<_TID = string> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Unique identifier for this transmission */
  transmissionId: string;
  /** Human-readable status description */
  status: string;
  /** Operation outcome errors, if any */
  errors: IOperationOutcome[];
}

/**
 * Current status of a transmitted prescription.
 *
 * @see Requirements 13.3
 */
export interface IEPrescribingStatus {
  /** The prescription being tracked */
  prescriptionId: string;
  /** Current transmission status */
  transmissionStatus: TransmissionStatus;
  /** When the status was last updated */
  lastUpdated: Date;
}

/**
 * Search parameters for pharmacy directory lookup.
 *
 * @see Requirements 13.4
 */
export interface IPharmacySearchParams {
  /** Pharmacy name (partial match) */
  name?: string;
  /** ZIP / postal code */
  zipCode?: string;
  /** National Provider Identifier */
  npi?: string;
}

/**
 * Pharmacy information returned from directory searches.
 *
 * @see Requirements 13.4
 */
export interface IPharmacyInfo {
  /** Unique pharmacy identifier */
  pharmacyId: string;
  /** Pharmacy name */
  name: string;
  /** Pharmacy street address */
  address: string;
  /** Pharmacy phone number */
  phone: string;
  /** National Provider Identifier */
  npi: string;
  /** Pharmacy fax number */
  fax: string;
}

/**
 * Service interface for electronic prescription transmission.
 *
 * @see Requirements 13.1
 */
export interface IEPrescribingService<TID = string> {
  /**
   * Transmit a prescription to a pharmacy electronically.
   * @param prescription - The medication request to transmit
   * @param pharmacyRef - Reference to the target pharmacy
   * @param memberId - ID of the member initiating the transmission
   */
  transmit(
    prescription: IMedicationRequestResource<TID>,
    pharmacyRef: IReference<TID>,
    memberId: TID,
  ): Promise<IEPrescribingResult<TID>>;

  /**
   * Check the current transmission status of a prescription.
   * @param prescriptionId - The prescription to check
   */
  checkStatus(prescriptionId: string): Promise<IEPrescribingStatus>;

  /**
   * Cancel a previously transmitted prescription.
   * @param prescriptionId - The prescription to cancel
   * @param reason - Reason for cancellation
   * @param memberId - ID of the member initiating the cancellation
   */
  cancel(
    prescriptionId: string,
    reason: ICodeableConcept,
    memberId: TID,
  ): Promise<IEPrescribingResult<TID>>;
}

/**
 * Directory service for pharmacy lookup.
 *
 * @see Requirements 13.4
 */
export interface IPharmacyDirectory<_TID = string> {
  /**
   * Search for pharmacies matching the given parameters.
   * @param params - Search criteria
   */
  search(params: IPharmacySearchParams): Promise<IPharmacyInfo[]>;

  /**
   * Retrieve a specific pharmacy by ID.
   * @param pharmacyId - The pharmacy identifier
   */
  getPharmacy(pharmacyId: string): Promise<IPharmacyInfo>;
}
