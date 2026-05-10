/**
 * Scheduling Search and Query Interfaces
 *
 * Defines search parameter, result, and engine interfaces for querying
 * FHIR R4 Schedule, Slot, and Appointment resources stored on BrightChain.
 *
 * Follows the IOrderSearchEngine / IEncounterSearchEngine hashed index
 * pattern from earlier modules. Results are ordered by start time and
 * filtered by the requesting member's ACL permissions.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 * @module scheduling/search/schedulingSearch
 */

import type { ICodeableConcept } from '../../fhir/datatypes';
import type { IAppointmentResource } from '../appointmentResource';
import type { AppointmentStatus, SlotStatus } from '../enumerations';
import type { IScheduleResource } from '../scheduleResource';
import type { ISlotResource } from '../slotResource';

/**
 * Search parameters for querying Slot resources.
 *
 * `dateRange` is required; all other fields are optional filters.
 *
 * @see Requirement 9.1
 */
export interface ISlotSearchParams {
  /** Filter by parent Schedule identifier */
  scheduleId?: string;

  /** Filter by one or more slot statuses */
  status?: SlotStatus | SlotStatus[];

  /** Date range filter (required) — inclusive start/end as ISO 8601 strings */
  dateRange: {
    /** Inclusive start date/time (ISO 8601) */
    start: string;
    /** Inclusive end date/time (ISO 8601) */
    end: string;
  };

  /** Filter by service type */
  serviceType?: ICodeableConcept;

  /** Filter by specialty */
  specialty?: ICodeableConcept;

  /** Filter by actor (provider or location) identifier */
  actorId?: string;
}

/**
 * Search parameters for querying Appointment resources.
 *
 * All fields are optional. Supports pagination via `offset` and `count`.
 *
 * @see Requirement 9.2
 */
export interface IAppointmentSearchParams {
  /** Filter by patient identifier */
  patientId?: string;

  /** Filter by practitioner identifier */
  practitionerId?: string;

  /** Filter by location identifier */
  locationId?: string;

  /** Filter by one or more appointment statuses */
  status?: AppointmentStatus | AppointmentStatus[];

  /** Filter by date range — inclusive start/end as ISO 8601 strings */
  dateRange?: {
    /** Inclusive start date/time (ISO 8601) */
    start: string;
    /** Inclusive end date/time (ISO 8601) */
    end: string;
  };

  /** Filter by service type */
  serviceType?: ICodeableConcept;

  /** Pagination offset (zero-based) */
  offset?: number;

  /** Maximum number of results to return */
  count?: number;
}

/**
 * Paginated search result set for Slot queries.
 *
 * Results are ordered by start time (earliest first).
 *
 * @typeParam TID - Identifier type (string for frontend, Uint8Array for backend)
 * @see Requirement 9.5
 */
export interface ISlotSearchResult<TID = string> {
  /** Matching Slot resources, ordered by start time */
  slots: ISlotResource<TID>[];

  /** Total number of matching Slot resources across all pages */
  total: number;
}

/**
 * Paginated search result set for Appointment queries.
 *
 * Results are ordered by start time (earliest first).
 *
 * @typeParam TID - Identifier type (string for frontend, Uint8Array for backend)
 * @see Requirement 9.5
 */
export interface IAppointmentSearchResult<TID = string> {
  /** Matching Appointment resources for the current page, ordered by start time */
  appointments: IAppointmentResource<TID>[];

  /** Total number of matching Appointment resources across all pages */
  total: number;

  /** Current page offset */
  offset: number;

  /** Page size */
  count: number;
}

/**
 * Search engine interface for indexing and querying scheduling resources.
 *
 * Implementations maintain hashed search indexes for efficient lookup
 * while keeping scheduling data encrypted at rest. Results are ordered
 * by start time and filtered by the requesting member's read permissions
 * (ACL).
 *
 * @typeParam TID - Identifier type (string for frontend, Uint8Array for backend)
 * @see Requirements 9.1–9.5
 */
export interface ISchedulingSearchEngine<TID = string> {
  /**
   * Search for Slot resources matching the given parameters.
   *
   * Results are ordered by start time (earliest first) and filtered
   * by the requesting member's read permissions.
   *
   * @param params - Slot search parameters (dateRange required)
   * @param memberId - The requesting BrightChain member (for ACL filtering)
   * @returns Search results with matching slots and total count
   */
  searchSlots(
    params: ISlotSearchParams,
    memberId: TID,
  ): Promise<ISlotSearchResult<TID>>;

  /**
   * Search for Appointment resources matching the given parameters.
   *
   * Results are ordered by start time (earliest first) and filtered
   * by the requesting member's read permissions.
   *
   * @param params - Appointment search parameters
   * @param memberId - The requesting BrightChain member (for ACL filtering)
   * @returns Paginated search results with matching appointments
   */
  searchAppointments(
    params: IAppointmentSearchParams,
    memberId: TID,
  ): Promise<IAppointmentSearchResult<TID>>;

  /**
   * Add or update the search index for a Schedule resource.
   *
   * @param schedule - The Schedule resource to index
   */
  indexSchedule(schedule: IScheduleResource<TID>): Promise<void>;

  /**
   * Add or update the search index for a Slot resource.
   *
   * @param slot - The Slot resource to index
   */
  indexSlot(slot: ISlotResource<TID>): Promise<void>;

  /**
   * Add or update the search index for an Appointment resource.
   *
   * @param appointment - The Appointment resource to index
   */
  indexAppointment(appointment: IAppointmentResource<TID>): Promise<void>;

  /**
   * Remove the search index entries for a scheduling resource.
   *
   * @param resourceType - The FHIR resource type being removed
   * @param id - The resource id to remove from the index
   */
  removeIndex(
    resourceType: 'Schedule' | 'Slot' | 'Appointment',
    id: string,
  ): Promise<void>;
}
