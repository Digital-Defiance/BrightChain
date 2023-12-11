# Implementation Plan: BrightChart Scheduling

## Overview

This plan implements the Scheduling module for BrightChart. All new code is added to `brightchart-lib` under `src/lib/scheduling/` and `brightchart-react-components` under `src/lib/scheduling/`. Implementation proceeds: enumerations → backbone elements → resource models → lifecycle → encounter bridge → waitlist → reminders → service interfaces → specialty → portability → React components.

## Tasks

- [x] 1. Scheduling enumerations
  - [x] 1.1 Create `brightchart-lib/src/lib/scheduling/enumerations.ts` defining exported enumerations: `AppointmentStatus` (proposed, pending, booked, arrived, fulfilled, cancelled, noshow, entered-in-error, checked-in, waitlist), `SlotStatus` (busy, free, busy-unavailable, busy-tentative, entered-in-error), `ParticipantRequired` (required, optional, information-only), `ParticipationStatus` (accepted, declined, tentative, needs-action), `WaitlistEntryStatus` (waiting, offered, booked, cancelled, expired), `ReminderType` (sms, email, push, phone), `ReminderStatus` (scheduled, sent, failed, cancelled).
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 13.1, 14.1_

- [x] 2. Backbone elements
  - [x] 2.1 Create `brightchart-lib/src/lib/scheduling/backboneElements.ts` defining exported `AppointmentParticipant<TID = string>` (type: ICodeableConcept[], actor: IReference<TID>, required: ParticipantRequired, status: ParticipationStatus required, period: IPeriod).
    - _Requirements: 4.1, 4.2_

- [x] 3. Resource interfaces
  - [x] 3.1 Create `brightchart-lib/src/lib/scheduling/scheduleResource.ts` defining exported `IScheduleResource<TID = string>` with all FHIR R4 Schedule fields, FHIR metadata, brightchainMetadata, `resourceType: 'Schedule'`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Create `brightchart-lib/src/lib/scheduling/slotResource.ts` defining exported `ISlotResource<TID = string>` with all FHIR R4 Slot fields, FHIR metadata, brightchainMetadata, `resourceType: 'Slot'`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Create `brightchart-lib/src/lib/scheduling/appointmentResource.ts` defining exported `IAppointmentResource<TID = string>` with all FHIR R4 Appointment fields, FHIR metadata, brightchainMetadata, `resourceType: 'Appointment'`.
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.4 Create `brightchart-lib/src/lib/scheduling/index.ts` barrel export. Update `brightchart-lib/src/index.ts`.
    - _Requirements: 21.1, 21.2_

- [x] 4. Appointment lifecycle
  - [x] 4.1 Create `brightchart-lib/src/lib/scheduling/lifecycle/appointmentLifecycle.ts` defining exported `IAppointmentLifecycle<TID>` with isValidTransition and transition methods. Define `APPOINTMENT_STATUS_TRANSITIONS` constant encoding valid transitions per the state machine.
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 4.2 Create `brightchart-lib/src/lib/scheduling/lifecycle/index.ts` barrel export. Update scheduling index.
    - _Requirements: 21.2_

- [x] 5. Appointment-Encounter bridge
  - [x] 5.1 Create `brightchart-lib/src/lib/scheduling/bridge/appointmentEncounterBridge.ts` defining exported `IAppointmentEncounterBridge<TID>` with methods: createEncounterFromAppointment, getEncounterForAppointment, getAppointmentForEncounter.
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.2 Create `brightchart-lib/src/lib/scheduling/bridge/index.ts` barrel export. Update scheduling index.
    - _Requirements: 21.2_

- [x] 6. Waitlist interfaces
  - [x] 6.1 Create `brightchart-lib/src/lib/scheduling/waitlist/waitlistTypes.ts` defining exported `IWaitlistEntry<TID>` (entryId, patientId, requestedServiceType, preferredPractitioner?, preferredDateRange?, priority, notes, createdAt, status) and `IWaitlistService<TID>` (addToWaitlist, removeFromWaitlist, getWaitlist, offerSlot, expireStaleEntries).
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 6.2 Create `brightchart-lib/src/lib/scheduling/waitlist/index.ts` barrel export. Update scheduling index.
    - _Requirements: 21.2_

- [x] 7. Reminder interfaces
  - [x] 7.1 Create `brightchart-lib/src/lib/scheduling/reminders/reminderTypes.ts` defining exported `IAppointmentReminder<TID>` (reminderId, appointmentId, patientId, reminderType, scheduledAt, sentAt?, status, message), `IReminderConfig` (defaultLeadTimes, defaultTypes, enabled), and `IReminderService<TID>` (scheduleReminders, cancelReminders, getRemindersForAppointment).
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 7.2 Create `brightchart-lib/src/lib/scheduling/reminders/index.ts` barrel export. Update scheduling index.
    - _Requirements: 21.2_

- [x] 8. Scheduling store interface
  - [x] 8.1 Create `brightchart-lib/src/lib/scheduling/store/schedulingStore.ts` defining exported `ISchedulingStore<TID>` with methods for Schedule, Slot, and Appointment: store, retrieve, update, delete, getVersionHistory, getPoolId.
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 8.2 Create `brightchart-lib/src/lib/scheduling/store/index.ts` barrel export. Update scheduling index.
    - _Requirements: 21.2_

- [x] 9. Scheduling search interface
  - [x] 9.1 Create `brightchart-lib/src/lib/scheduling/search/schedulingSearch.ts` defining exported `ISlotSearchParams`, `IAppointmentSearchParams`, `ISlotSearchResult<TID>`, `IAppointmentSearchResult<TID>`, and `ISchedulingSearchEngine<TID>` with searchSlots, searchAppointments, indexSchedule, indexSlot, indexAppointment, removeIndex methods.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 9.2 Create `brightchart-lib/src/lib/scheduling/search/index.ts` barrel export. Update scheduling index.
    - _Requirements: 21.2_

- [x] 10. Scheduling serializer interface
  - [x] 10.1 Create `brightchart-lib/src/lib/scheduling/serializer/schedulingSerializer.ts` defining exported serializer interfaces for Schedule, Slot, Appointment, and the scheduling export bundle.
    - _Requirements: 10.1, 10.2, 10.3, 16.3_

  - [x] 10.2 Create `brightchart-lib/src/lib/scheduling/serializer/index.ts` barrel export. Update scheduling index.
    - _Requirements: 21.2_

- [x] 11. Scheduling ACL interface
  - [x] 11.1 Create `brightchart-lib/src/lib/scheduling/access/schedulingAcl.ts` defining exported `SchedulingPermission` enum, `ISchedulingACL<TID>` extending IPoolACL, `hasSchedulingPermission` function signature, SMART scope mapping constants.
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 11.2 Create `brightchart-lib/src/lib/scheduling/access/index.ts` barrel export. Update scheduling index.
    - _Requirements: 21.2_

- [x] 12. Scheduling audit interface
  - [x] 12.1 Create `brightchart-lib/src/lib/scheduling/audit/schedulingAudit.ts` defining exported `ISchedulingAuditEntry<TID>` extending IClinicalAuditEntry with appointmentStatus, statusTransition. Export `ISchedulingAuditLogger<TID>`.
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 12.2 Create `brightchart-lib/src/lib/scheduling/audit/index.ts` barrel export. Update scheduling index.
    - _Requirements: 21.2_

- [x] 13. Scheduling specialty extensions
  - [x] 13.1 Create `brightchart-lib/src/lib/scheduling/specialty/schedulingSpecialtyTypes.ts` defining exported `ISchedulingSpecialtyExtension` (specialtyCode, appointmentTypeExtensions, defaultDurations, schedulingRules).
    - _Requirements: 15.1_

  - [x] 13.2 Create `brightchart-lib/src/lib/scheduling/specialty/medicalSchedulingProfile.ts` exporting `MEDICAL_SCHEDULING_EXTENSION` with standard appointment types and durations.
    - _Requirements: 15.2_

  - [x] 13.3 Create `brightchart-lib/src/lib/scheduling/specialty/dentalSchedulingProfile.ts` exporting `DENTAL_SCHEDULING_EXTENSION` with operatory/chair scheduling, hygienist-then-doctor sequencing, dental durations.
    - _Requirements: 15.3_

  - [x] 13.4 Create `brightchart-lib/src/lib/scheduling/specialty/veterinarySchedulingProfile.ts` exporting `VETERINARY_SCHEDULING_EXTENSION` with species-aware durations, farm call scheduling, herd vaccination blocks.
    - _Requirements: 15.4_

  - [x] 13.5 Create `brightchart-lib/src/lib/scheduling/specialty/index.ts` barrel export. Update scheduling index.
    - _Requirements: 15.5, 21.2_

- [x] 14. Scheduling portability interface
  - [x] 14.1 Create `brightchart-lib/src/lib/scheduling/portability/schedulingPortability.ts` defining exported `ISchedulingExportBundle<TID>` extending IOrderExportBundle with schedules, slots, appointments, waitlistEntries.
    - _Requirements: 16.1, 16.2_

  - [x] 14.2 Create `brightchart-lib/src/lib/scheduling/portability/index.ts` barrel export. Update scheduling index.
    - _Requirements: 21.2_

- [x] 15. Final barrel export verification
  - [x] 15.1 Verify `brightchart-lib/src/lib/scheduling/index.ts` re-exports all sub-modules. Verify `brightchart-lib/src/index.ts` re-exports from `./lib/scheduling/index`. Run `yarn nx run brightchart-lib:build`.
    - _Requirements: 21.1, 21.2, 21.3_

- [x] 16. React scheduling components
  - [x] 16.1 Create `brightchart-react-components/src/lib/scheduling/ScheduleCalendar.tsx`. Props: appointments, slots, onSlotSelect, onAppointmentSelect, viewMode (day/week/month), filters (provider/location/serviceType). Day/week/month calendar with colored appointment blocks, free slot areas, view mode toggle.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [x] 16.2 Create `brightchart-react-components/src/lib/scheduling/AppointmentBookingForm.tsx`. Props: onSubmit, appointment?, availableSlots, specialtyProfile?. Patient/provider/slot selection, reason, priority, notes, validation.
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 16.3 Create `brightchart-react-components/src/lib/scheduling/ScheduleEditor.tsx`. Props: schedule, slots, onSave. Availability grid editor, recurring patterns, slot generation.
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

  - [x] 16.4 Create `brightchart-react-components/src/lib/scheduling/WaitlistManager.tsx`. Props: entries, onOfferSlot, onRemove. Priority-sorted list, patient/service/preference display, offer/remove actions.
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [x] 16.5 Create `brightchart-react-components/src/lib/scheduling/index.ts` barrel export. Update `brightchart-react-components/src/index.ts`. Run `yarn nx run brightchart-react-components:build`.
    - _Requirements: 21.4, 21.5_
