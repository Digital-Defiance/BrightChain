/**
 * Waitlist Management Types
 *
 * Defines the `IWaitlistEntry<TID>` interface representing a patient waiting
 * for an appointment slot, and the `IWaitlistService<TID>` interface for
 * managing waitlist operations including adding, removing, offering slots,
 * and expiring stale entries.
 *
 * The waitlist is a BrightChart-specific concept (not a FHIR resource).
 * When a slot becomes free, the waitlist service supports matching waiting
 * patients by service type, practitioner preference, and date preference.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see Requirements 13.1, 13.2, 13.3, 13.4
 * @module scheduling/waitlist/waitlistTypes
 */

import type {
  ICodeableConcept,
  IPeriod,
  IReference,
} from '../../fhir/datatypes';
import type { IAppointmentResource } from '../appointmentResource';
import type { WaitlistEntryStatus } from '../enumerations';

/**
 * A patient waiting for an appointment slot to become available.
 *
 * Entries are prioritised by `priority` (lower = higher priority) then
 * `createdAt` (earlier = higher priority).
 */
export interface IWaitlistEntry<TID = string> {
  /** Unique identifier for this waitlist entry */
  entryId: string;

  /** The patient who is waiting */
  patientId: string;

  /** The type of service the patient is requesting */
  requestedServiceType: ICodeableConcept;

  /** Preferred practitioner, if any */
  preferredPractitioner?: IReference<TID>;

  /** Preferred date/time range, if any */
  preferredDateRange?: IPeriod;

  /** Priority of this entry (lower number = higher priority) */
  priority: number;

  /** Free-text notes about the waitlist request */
  notes: string;

  /** When this entry was created */
  createdAt: Date;

  /** Current status of the waitlist entry */
  status: WaitlistEntryStatus;
}

/**
 * Service interface for managing the patient waitlist.
 *
 * When a slot becomes free the service supports matching waiting patients
 * by service type, practitioner preference, and date preference via
 * `offerSlot`, which marks the entry as "offered" and creates a proposed
 * Appointment.
 */
export interface IWaitlistService<TID = string> {
  /**
   * Add a new patient to the waitlist.
   * `entryId`, `createdAt`, and `status` are assigned by the service.
   */
  addToWaitlist(
    entry: Omit<IWaitlistEntry<TID>, 'entryId' | 'createdAt' | 'status'>,
  ): Promise<IWaitlistEntry<TID>>;

  /** Remove an entry from the waitlist. */
  removeFromWaitlist(entryId: string): Promise<void>;

  /**
   * Retrieve waitlist entries with optional filtering and sorting.
   *
   * @param filter - Optional filter criteria
   * @param sort   - Optional sort specification
   */
  getWaitlist(
    filter?: {
      serviceType?: ICodeableConcept;
      practitionerId?: string;
      status?: WaitlistEntryStatus;
    },
    sort?: {
      field: keyof IWaitlistEntry<TID>;
      direction: 'asc' | 'desc';
    },
  ): Promise<IWaitlistEntry<TID>[]>;

  /**
   * Offer a freed slot to a waitlisted patient.
   * Marks the entry status as "offered" and creates a proposed Appointment.
   */
  offerSlot(
    entryId: string,
    slotId: string,
  ): Promise<IAppointmentResource<TID>>;

  /**
   * Expire waitlist entries older than the given date.
   * @returns The number of entries expired.
   */
  expireStaleEntries(olderThan: Date): Promise<number>;
}
