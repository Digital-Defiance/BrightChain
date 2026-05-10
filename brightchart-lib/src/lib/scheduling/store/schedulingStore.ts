/**
 * Scheduling Store Interface
 *
 * Defines the ISchedulingStore interface for CRUD operations on Schedule,
 * Slot, and Appointment resources stored as encrypted blocks in a dedicated
 * BrightChain scheduling pool.
 *
 * Follows the IOrderStore / IBillingStore pattern from other modules,
 * with per-resource-type methods and patient reference validation on
 * Appointment creation.
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.4
 * @module scheduling/store/schedulingStore
 */

import type { IAppointmentResource } from '../appointmentResource';
import type { IScheduleResource } from '../scheduleResource';
import type { ISlotResource } from '../slotResource';

/**
 * Scheduling data store interface for Schedule, Slot, and Appointment
 * resources.
 *
 * Uses a dedicated BrightChain pool for scheduling blocks, separate from
 * the Patient, Clinical, Encounter, Document, Order, and Billing pools.
 * Validates patient references on Appointment store operations.
 *
 * @typeParam TID - Identifier type (string for frontend, Uint8Array for backend)
 * @see Requirement 8.1 — CRUD + version history + pool ID for all three resource types
 * @see Requirement 8.2 — Dedicated BrightChain pool for scheduling blocks
 * @see Requirement 8.3 — Patient reference validation on Appointment creation
 * @see Requirement 8.4 — Generic on TID
 */
export interface ISchedulingStore<TID = string> {
  // --- Schedule ---

  /**
   * Encrypt and store a Schedule resource.
   *
   * @param resource - The Schedule resource to store
   * @param memberId - The BrightChain member performing the operation
   * @returns The stored resource (with assigned ID / metadata)
   */
  storeSchedule(
    resource: IScheduleResource<TID>,
    memberId: TID,
  ): Promise<IScheduleResource<TID>>;

  /** Retrieve a Schedule resource by ID */
  retrieveSchedule(id: string, memberId: TID): Promise<IScheduleResource<TID>>;

  /** Update an existing Schedule resource */
  updateSchedule(
    resource: IScheduleResource<TID>,
    memberId: TID,
  ): Promise<IScheduleResource<TID>>;

  /** Delete a Schedule resource by ID */
  deleteSchedule(id: string, memberId: TID): Promise<void>;

  /** Get version history for a Schedule resource */
  getScheduleVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<IScheduleResource<TID>[]>;

  // --- Slot ---

  /**
   * Encrypt and store a Slot resource.
   *
   * @param resource - The Slot resource to store
   * @param memberId - The BrightChain member performing the operation
   * @returns The stored resource (with assigned ID / metadata)
   */
  storeSlot(
    resource: ISlotResource<TID>,
    memberId: TID,
  ): Promise<ISlotResource<TID>>;

  /** Retrieve a Slot resource by ID */
  retrieveSlot(id: string, memberId: TID): Promise<ISlotResource<TID>>;

  /** Update an existing Slot resource */
  updateSlot(
    resource: ISlotResource<TID>,
    memberId: TID,
  ): Promise<ISlotResource<TID>>;

  /** Delete a Slot resource by ID */
  deleteSlot(id: string, memberId: TID): Promise<void>;

  /** Get version history for a Slot resource */
  getSlotVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<ISlotResource<TID>[]>;

  // --- Appointment ---

  /**
   * Encrypt and store an Appointment resource.
   *
   * Validates that the patient participant reference resolves to an
   * existing patient resource before storing. Returns a FHIR
   * OperationOutcome with severity "error" and code "not-found" if the
   * patient reference is invalid.
   *
   * @param resource - The Appointment resource to store
   * @param memberId - The BrightChain member performing the operation
   * @returns The stored resource (with assigned ID / metadata)
   */
  storeAppointment(
    resource: IAppointmentResource<TID>,
    memberId: TID,
  ): Promise<IAppointmentResource<TID>>;

  /** Retrieve an Appointment resource by ID */
  retrieveAppointment(
    id: string,
    memberId: TID,
  ): Promise<IAppointmentResource<TID>>;

  /** Update an existing Appointment resource */
  updateAppointment(
    resource: IAppointmentResource<TID>,
    memberId: TID,
  ): Promise<IAppointmentResource<TID>>;

  /** Delete an Appointment resource by ID */
  deleteAppointment(id: string, memberId: TID): Promise<void>;

  /** Get version history for an Appointment resource */
  getAppointmentVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<IAppointmentResource<TID>[]>;

  // --- Pool ---

  /**
   * Get the dedicated BrightChain pool identifier for scheduling data.
   * @returns The pool identifier
   */
  getPoolId(): TID;
}
