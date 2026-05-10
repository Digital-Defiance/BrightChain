/**
 * Appointment Reminder Types
 *
 * Defines the `IAppointmentReminder<TID>` interface representing a scheduled
 * patient notification, the `IReminderConfig` interface for configuring
 * reminder lead times and delivery channels, and the `IReminderService<TID>`
 * interface for managing reminder lifecycle operations.
 *
 * Reminders are configuration/interface only — actual delivery (SMS, email,
 * push, phone) is a backend concern.
 *
 * Generic on `TID` (defaults to `string`) to support both frontend
 * (string IDs) and backend (Uint8Array IDs) usage.
 *
 * @see Requirements 14.1, 14.2, 14.3, 14.4
 * @module scheduling/reminders/reminderTypes
 */

import type { ReminderStatus, ReminderType } from '../enumerations';

/**
 * A scheduled reminder notification for an upcoming appointment.
 */
export interface IAppointmentReminder<_TID = string> {
  /** Unique identifier for this reminder */
  reminderId: string;

  /** The appointment this reminder is for */
  appointmentId: string;

  /** The patient to be reminded */
  patientId: string;

  /** Delivery channel for this reminder */
  reminderType: ReminderType;

  /** When this reminder is scheduled to be sent */
  scheduledAt: Date;

  /** When this reminder was actually sent (undefined if not yet sent) */
  sentAt?: Date;

  /** Current status of the reminder */
  status: ReminderStatus;

  /** The reminder message content */
  message: string;
}

/**
 * Configuration for appointment reminders.
 *
 * Defines default lead times (hours before the appointment), delivery
 * channels, and whether reminders are enabled.
 */
export interface IReminderConfig {
  /** Hours before the appointment to send reminders (e.g. [24, 2] for 24h and 2h before) */
  defaultLeadTimes: number[];

  /** Default delivery channels */
  defaultTypes: ReminderType[];

  /** Whether reminders are enabled */
  enabled: boolean;
}

/**
 * Service interface for managing appointment reminders.
 *
 * Handles scheduling, cancelling, and querying reminders for appointments.
 */
export interface IReminderService<TID = string> {
  /**
   * Schedule reminders for an appointment.
   *
   * @param appointmentId - The appointment to schedule reminders for
   * @param config        - Optional reminder configuration override
   * @returns The created reminders
   */
  scheduleReminders(
    appointmentId: string,
    config?: IReminderConfig,
  ): Promise<IAppointmentReminder<TID>[]>;

  /**
   * Cancel all pending reminders for an appointment.
   *
   * @param appointmentId - The appointment whose reminders should be cancelled
   */
  cancelReminders(appointmentId: string): Promise<void>;

  /**
   * Retrieve all reminders for an appointment.
   *
   * @param appointmentId - The appointment to query reminders for
   * @returns The reminders for the appointment
   */
  getRemindersForAppointment(
    appointmentId: string,
  ): Promise<IAppointmentReminder<TID>[]>;
}
