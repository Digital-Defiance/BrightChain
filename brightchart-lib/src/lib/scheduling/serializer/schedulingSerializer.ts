/**
 * Scheduling Serializer Interfaces
 *
 * Serializer interfaces for Schedule, Slot, Appointment, and the
 * scheduling export bundle. Guarantees round-trip fidelity:
 * serialize → deserialize → serialize produces byte-identical JSON
 * output. Undefined/null fields are omitted; dates follow FHIR R4
 * formatting.
 *
 * @see Requirements 10.1, 10.2, 10.3, 16.3
 * @module scheduling/serializer/schedulingSerializer
 */

import type { IOrderExportBundle } from '../../orders/serializer/orderSerializer';
import type { IAppointmentResource } from '../appointmentResource';
import type { IScheduleResource } from '../scheduleResource';
import type { ISlotResource } from '../slotResource';
import type { IWaitlistEntry } from '../waitlist/waitlistTypes';

/**
 * Serializer for Schedule resources.
 * Guarantees round-trip fidelity: serialize → deserialize → serialize
 * produces byte-identical JSON output.
 *
 * - Omits undefined/null fields from serialized output
 * - Dates follow FHIR R4 dateTime formatting
 *
 * @see Requirements 10.1, 10.2, 10.3
 */
export interface IScheduleSerializer<TID = string> {
  /** Serialize a Schedule resource to FHIR R4 JSON */
  serialize(resource: IScheduleResource<TID>): string;
  /** Deserialize FHIR R4 JSON to a Schedule resource */
  deserialize(json: string): IScheduleResource<TID>;
}

/**
 * Serializer for Slot resources.
 * Guarantees round-trip fidelity: serialize → deserialize → serialize
 * produces byte-identical JSON output.
 *
 * - Omits undefined/null fields from serialized output
 * - Dates follow FHIR R4 instant formatting
 *
 * @see Requirements 10.1, 10.2, 10.3
 */
export interface ISlotSerializer<TID = string> {
  /** Serialize a Slot resource to FHIR R4 JSON */
  serialize(resource: ISlotResource<TID>): string;
  /** Deserialize FHIR R4 JSON to a Slot resource */
  deserialize(json: string): ISlotResource<TID>;
}

/**
 * Serializer for Appointment resources.
 * Guarantees round-trip fidelity: serialize → deserialize → serialize
 * produces byte-identical JSON output.
 *
 * - Omits undefined/null fields from serialized output
 * - Dates follow FHIR R4 dateTime/instant formatting
 *
 * @see Requirements 10.1, 10.2, 10.3
 */
export interface IAppointmentSerializer<TID = string> {
  /** Serialize an Appointment resource to FHIR R4 JSON */
  serialize(resource: IAppointmentResource<TID>): string;
  /** Deserialize FHIR R4 JSON to an Appointment resource */
  deserialize(json: string): IAppointmentResource<TID>;
}

/**
 * Scheduling export bundle extending the order export bundle with
 * scheduling-specific resource arrays and waitlist entries.
 *
 * This type is defined here for use by the bundle serializer.
 * The portability module (task 14) may re-export or extend this type.
 *
 * @see Requirements 16.1, 16.2
 */
export interface ISchedulingExportBundle<TID = string>
  extends IOrderExportBundle<TID> {
  /** Schedule resources in this export */
  schedules: IScheduleResource<TID>[];
  /** Slot resources in this export */
  slots: ISlotResource<TID>[];
  /** Appointment resources in this export */
  appointments: IAppointmentResource<TID>[];
  /** Waitlist entries in this export */
  waitlistEntries: IWaitlistEntry<TID>[];
}

/**
 * Serializer for scheduling export/import bundles.
 * Guarantees round-trip fidelity for the entire bundle,
 * preserving all references between schedules, slots,
 * appointments, waitlist entries, and upstream resources.
 *
 * @see Requirement 16.3
 */
export interface ISchedulingBundleSerializer<TID = string> {
  /** Serialize a scheduling export bundle to JSON */
  serialize(bundle: ISchedulingExportBundle<TID>): string;
  /** Deserialize JSON to a scheduling export bundle */
  deserialize(json: string): ISchedulingExportBundle<TID>;
}
