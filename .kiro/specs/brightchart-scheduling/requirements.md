# Requirements Document: BrightChart Scheduling

## Introduction

This module establishes the Scheduling layer for BrightChart — the FHIR R4-compliant appointment booking, provider availability, and waitlist management system. It builds on Modules 1–5, connecting the scheduling lifecycle to encounters (an appointment becomes an encounter when the patient arrives) and to orders (a ServiceRequest can trigger an appointment via `basedOn`).

Scheduling uses three FHIR R4 resources:

- **Schedule**: A container defining when a provider, location, or service is available for appointments. Schedules belong to actors (practitioners, locations, devices).
- **Slot**: A time window within a Schedule that can be booked. Slots have status (free, busy, busy-unavailable, busy-tentative) and define the atomic bookable unit.
- **Appointment**: A booking of one or more Slots for a patient with one or more participants (providers, locations). Appointments have a lifecycle (proposed → booked → arrived → fulfilled) that bridges into the Encounter lifecycle from Module 3.

The Specialty Adapter extends into scheduling: medical scheduling uses standard appointment types, dental scheduling adds operatory/chair-based scheduling with hygienist-then-doctor sequencing, and veterinary scheduling adds species-aware appointment durations and farm call scheduling.

The implementation spans:
- **brightchart-lib**: Shared FHIR R4 Schedule, Slot, and Appointment interfaces, scheduling service interfaces, appointment-to-encounter bridging types, waitlist types, reminder types, and specialty scheduling extensions (browser-compatible)
- **brightchart-react-components**: React UI components for calendar view, appointment booking form, schedule/availability editor, and waitlist manager

## Glossary

- **Schedule_Resource**: A FHIR R4 Schedule defining availability windows for a provider, location, or service.
- **Slot_Resource**: A FHIR R4 Slot representing a bookable time window within a Schedule.
- **Appointment_Resource**: A FHIR R4 Appointment representing a booked interaction between a patient and provider(s).
- **Scheduling_Store**: The BrightChain block store pool for persisting encrypted scheduling records.
- **Appointment_Lifecycle**: The state machine governing appointment status transitions (proposed → pending → booked → arrived → fulfilled → cancelled/noshow).
- **Appointment_Encounter_Bridge**: The mechanism that creates an Encounter from a booked Appointment when the patient arrives (check-in).
- **Waitlist_Entry**: A record of a patient waiting for an appointment slot to become available, with priority and requested time preferences.
- **Appointment_Reminder**: A notification configuration for reminding patients of upcoming appointments.

## Requirements

### Requirement 1: FHIR R4 Schedule Resource Model

**User Story:** As a developer building scheduling features, I want a FHIR R4-compliant Schedule resource data model, so that provider and location availability can be managed consistently.

#### Acceptance Criteria

1. THE Schedule_Resource SHALL include the following FHIR R4 Schedule fields: identifier (array of IIdentifier), active (boolean), serviceCategory (array of ICodeableConcept), serviceType (array of ICodeableConcept), specialty (array of ICodeableConcept), actor (array of IReference to Practitioner/PractitionerRole/RelatedPerson/Device/HealthcareService/Location, required), planningHorizon (IPeriod), and comment (string).
2. THE Schedule_Resource SHALL use the generic TID type parameter.
3. THE Schedule_Resource SHALL include a resourceType field with the fixed value "Schedule".
4. THE Schedule_Resource SHALL include FHIR metadata fields and a brightchainMetadata field.

### Requirement 2: FHIR R4 Slot Resource Model

**User Story:** As a developer, I want a FHIR R4-compliant Slot resource data model, so that bookable time windows within schedules are represented consistently.

#### Acceptance Criteria

1. THE Slot_Resource SHALL include the following FHIR R4 Slot fields: identifier (array of IIdentifier), serviceCategory (array of ICodeableConcept), serviceType (array of ICodeableConcept), specialty (array of ICodeableConcept), appointmentType (ICodeableConcept), schedule (IReference to Schedule, required), status (SlotStatus code, required), start (instant, required), end (instant, required), overbooked (boolean), and comment (string).
2. THE Slot_Resource SHALL use the generic TID type parameter.
3. THE Slot_Resource SHALL include a resourceType field with the fixed value "Slot".
4. THE Slot_Resource SHALL include FHIR metadata fields and a brightchainMetadata field.

### Requirement 3: FHIR R4 Appointment Resource Model

**User Story:** As a developer, I want a FHIR R4-compliant Appointment resource data model, so that patient bookings are represented consistently with participants, timing, and status.

#### Acceptance Criteria

1. THE Appointment_Resource SHALL include the following FHIR R4 Appointment fields: identifier (array of IIdentifier), status (AppointmentStatus code, required), cancelationReason (ICodeableConcept), serviceCategory (array of ICodeableConcept), serviceType (array of ICodeableConcept), specialty (array of ICodeableConcept), appointmentType (ICodeableConcept), reasonCode (array of ICodeableConcept), reasonReference (array of IReference to Condition/Procedure/Observation/ImmunizationRecommendation), priority (unsignedInt), description (string), supportingInformation (array of IReference), start (instant), end (instant), minutesDuration (positiveInt), slot (array of IReference to Slot), created (dateTime), comment (string), patientInstruction (string), basedOn (array of IReference to ServiceRequest), participant (array of AppointmentParticipant, required), and requestedPeriod (array of IPeriod).
2. THE Appointment_Resource SHALL use the generic TID type parameter.
3. THE Appointment_Resource SHALL include a resourceType field with the fixed value "Appointment".
4. THE Appointment_Resource SHALL include FHIR metadata fields and a brightchainMetadata field.

### Requirement 4: Appointment Backbone Elements

**User Story:** As a developer, I want the Appointment participant backbone element defined in brightchart-lib.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an exported `AppointmentParticipant<TID>` interface with fields: type (array of ICodeableConcept), actor (IReference to Patient/Practitioner/PractitionerRole/RelatedPerson/Device/HealthcareService/Location), required (ParticipantRequired code: required, optional, information-only), status (ParticipationStatus code: accepted, declined, tentative, needs-action, required), and period (IPeriod).
2. THE brightchart-lib library SHALL export the AppointmentParticipant interface from src/index.ts.

### Requirement 5: Scheduling Enumerations

**User Story:** As a developer, I want scheduling status codes defined as TypeScript enumerations.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define exported `AppointmentStatus` enumeration: proposed, pending, booked, arrived, fulfilled, cancelled, noshow, entered-in-error, checked-in, waitlist.
2. THE brightchart-lib library SHALL define exported `SlotStatus` enumeration: busy, free, busy-unavailable, busy-tentative, entered-in-error.
3. THE brightchart-lib library SHALL define exported `ParticipantRequired` enumeration: required, optional, information-only.
4. THE brightchart-lib library SHALL define exported `ParticipationStatus` enumeration: accepted, declined, tentative, needs-action.
5. THE brightchart-lib library SHALL export all scheduling enumerations.

### Requirement 6: Appointment Lifecycle and Status Transitions

**User Story:** As a clinical workflow developer, I want a well-defined appointment lifecycle state machine.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IAppointmentLifecycle<TID>` interface with isValidTransition and transition methods.
2. THE valid appointment status transitions SHALL be: proposed → pending, proposed → cancelled, pending → booked, pending → cancelled, booked → arrived, booked → cancelled, booked → noshow, arrived → fulfilled, arrived → cancelled, checked-in → arrived (alias), waitlist → proposed, waitlist → booked, waitlist → cancelled, and any → entered-in-error.
3. WHEN an appointment transitions to "arrived", THE system SHALL support creating a linked Encounter via the Appointment-Encounter bridge.
4. THE brightchart-lib library SHALL export the appointment lifecycle interface and default transition map.

### Requirement 7: Appointment-Encounter Bridge

**User Story:** As a clinical workflow developer, I want appointments to automatically bridge into encounters when a patient arrives, so that the scheduling and clinical workflows are seamlessly connected.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IAppointmentEncounterBridge<TID>` interface with methods: createEncounterFromAppointment(appointment: IAppointmentResource<TID>, memberId: TID): Promise<IEncounterResource<TID>>, getEncounterForAppointment(appointmentId: string): Promise<string | null>, and getAppointmentForEncounter(encounterId: string): Promise<string | null>.
2. WHEN an Encounter is created from an Appointment, THE bridge SHALL populate the Encounter's subject from the Appointment's patient participant, class from the Appointment's serviceCategory/serviceType, period.start from the current time, participant from the Appointment's participants, and appointment reference pointing back to the Appointment.
3. THE bridge SHALL support bidirectional lookup: appointment → encounter and encounter → appointment.
4. THE brightchart-lib library SHALL export the bridge interface.

### Requirement 8: Scheduling Data Store

**User Story:** As a system architect, I want scheduling data stored as encrypted blocks on BrightChain.

#### Acceptance Criteria

1. THE Scheduling_Store SHALL define an `ISchedulingStore<TID>` interface with methods for Schedule, Slot, and Appointment: store, retrieve, update, delete, getVersionHistory, getPoolId.
2. THE Scheduling_Store SHALL use a dedicated BrightChain pool.
3. THE store SHALL validate patient references on Appointment creation.
4. THE ISchedulingStore interface SHALL be generic on TID.

### Requirement 9: Scheduling Search and Query

**User Story:** As a healthcare provider, I want to search for available slots, appointments by patient/provider/date, and schedules by actor.

#### Acceptance Criteria

1. THE Scheduling_Search_Engine SHALL define an `ISlotSearchParams` interface: scheduleId (optional), status (optional SlotStatus or array), dateRange (required start/end), serviceType (optional), specialty (optional), actorId (optional — provider or location).
2. THE Scheduling_Search_Engine SHALL define an `IAppointmentSearchParams` interface: patientId (optional), practitionerId (optional), locationId (optional), status (optional AppointmentStatus or array), dateRange (optional), serviceType (optional), offset, count.
3. THE search SHALL return results ordered by start time.
4. THE search SHALL support pagination and ACL filtering.
5. THE search SHALL define result interfaces for slots and appointments.

### Requirement 10: Scheduling Serialization

**User Story:** As a developer, I want serializers for Schedule, Slot, and Appointment with round-trip properties.

#### Acceptance Criteria

1. THE Scheduling_Serializer SHALL provide serialize/deserialize for all three resource types.
2. The round-trip property SHALL hold.
3. Undefined/null fields SHALL be omitted; dates SHALL follow FHIR R4 formatting.

### Requirement 11: Scheduling ACL

**User Story:** As a healthcare administrator, I want scheduling-specific access control.

#### Acceptance Criteria

1. THE Scheduling ACL SHALL define a `SchedulingPermission` enum: SchedulingRead, SchedulingWrite, SchedulingAdmin.
2. THE Scheduling ACL SHALL define an `ISchedulingACL<TID>` extending IPoolACL.
3. SchedulingAdmin SHALL imply SchedulingRead and SchedulingWrite.
4. THE Scheduling ACL SHALL integrate with SMART on FHIR v2 scopes.

### Requirement 12: Scheduling Audit Trail

**User Story:** As a compliance officer, I want a complete audit trail of all scheduling operations.

#### Acceptance Criteria

1. THE audit logger SHALL create entries for all scheduling operations (create, read, update, delete, search, status transition, encounter bridge).
2. THE scheduling audit entries SHALL extend IClinicalAuditEntry with appointmentStatus and statusTransition fields.
3. THE entries SHALL be stored in the shared audit pool.
4. THE entries SHALL be append-only.

### Requirement 13: Waitlist Management

**User Story:** As a front desk staff member, I want to manage a waitlist of patients who want appointments when slots become available.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IWaitlistEntry<TID>` interface with fields: entryId (string), patientId (string), requestedServiceType (ICodeableConcept), preferredPractitioner (optional IReference<TID>), preferredDateRange (optional IPeriod), priority (number), notes (string), createdAt (Date), status (WaitlistEntryStatus: waiting, offered, booked, cancelled, expired).
2. THE brightchart-lib library SHALL define an `IWaitlistService<TID>` interface with methods: addToWaitlist, removeFromWaitlist, getWaitlist (with filtering/sorting), offerSlot (marks entry as "offered" and creates a proposed Appointment), and expireStaleEntries.
3. WHEN a Slot becomes free, THE waitlist service interface SHALL support matching waiting patients by service type, practitioner preference, and date preference.
4. THE brightchart-lib library SHALL export all waitlist interfaces.

### Requirement 14: Appointment Reminders

**User Story:** As a practice administrator, I want to configure appointment reminders for patients.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IAppointmentReminder<TID>` interface with fields: reminderId (string), appointmentId (string), patientId (string), reminderType (ReminderType: sms, email, push, phone), scheduledAt (Date), sentAt (optional Date), status (ReminderStatus: scheduled, sent, failed, cancelled), message (string).
2. THE brightchart-lib library SHALL define an `IReminderConfig` interface with fields: defaultLeadTimes (array of numbers in hours, e.g., [24, 2] for 24h and 2h before), defaultTypes (array of ReminderType), enabled (boolean).
3. THE brightchart-lib library SHALL define an `IReminderService<TID>` interface with methods: scheduleReminders(appointmentId, config?): Promise<IAppointmentReminder<TID>[]>, cancelReminders(appointmentId): Promise<void>, getRemindersForAppointment(appointmentId): Promise<IAppointmentReminder<TID>[]>.
4. THE brightchart-lib library SHALL export all reminder interfaces.

### Requirement 15: Scheduling Specialty Extensions

**User Story:** As a product owner, I want the Specialty Adapter extended for scheduling-specific configurations.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `ISchedulingSpecialtyExtension` interface with fields: specialtyCode, appointmentTypeExtensions (additional appointment types), defaultDurations (map of service type to default minutes), schedulingRules (specialty-specific booking rules).
2. THE Medical scheduling specialty SHALL include standard appointment types and durations (new patient 60min, follow-up 15min, physical 30min, etc.).
3. THE Dental scheduling specialty SHALL include operatory/chair-based scheduling, hygienist-then-doctor sequencing rules, and dental appointment types (cleaning 60min, filling 30min, crown prep 90min, etc.).
4. THE Veterinary scheduling specialty SHALL include species-aware appointment durations (cat exam 20min, dog exam 30min, equine 60min), farm call scheduling, and herd vaccination block scheduling.
5. THE brightchart-lib library SHALL export predefined scheduling specialty extensions.

### Requirement 16: Portability Standard Extension for Scheduling

**User Story:** As a practice administrator, I want the portability standard extended to include scheduling data.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `ISchedulingExportBundle<TID>` extending IOrderExportBundle from Module 5, adding: schedules, slots, appointments, and waitlistEntries.
2. THE export bundle SHALL preserve all references.
3. The round-trip serialization property SHALL hold.

### Requirement 17: Calendar View Component

**User Story:** As a frontend developer, I want a React calendar component showing appointments and available slots.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `ScheduleCalendar` component that accepts arrays of IAppointmentResource<string> and ISlotResource<string> and renders a day/week/month calendar view.
2. THE calendar SHALL display appointments as colored blocks with patient name, service type, and status.
3. THE calendar SHALL display free slots as bookable areas.
4. THE calendar SHALL support filtering by provider, location, and service type.
5. WHEN a slot is clicked, THE calendar SHALL emit the slot via onSlotSelect. WHEN an appointment is clicked, THE calendar SHALL emit via onAppointmentSelect.
6. THE calendar SHALL support day, week, and month view modes.

### Requirement 18: Appointment Booking Form Component

**User Story:** As a frontend developer, I want a React component for booking appointments.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide an `AppointmentBookingForm` component with inputs for: patient (searchable), service type, provider (searchable), slot selection (from available slots), reason, priority, and notes.
2. WHEN submitted, THE form SHALL emit a complete IAppointmentResource<string> via onSubmit with status "booked".
3. THE form SHALL accept a specialty profile prop for service type and duration defaults.
4. THE form SHALL display inline validation errors.
5. THE form SHALL accept an optional appointment prop for rescheduling.

### Requirement 19: Schedule Editor Component

**User Story:** As a frontend developer, I want a React component for managing provider/location schedules and generating slots.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `ScheduleEditor` component that accepts an IScheduleResource<string> and its ISlotResource<string>[] and renders an editable availability grid.
2. THE ScheduleEditor SHALL allow adding/removing time blocks to define availability.
3. THE ScheduleEditor SHALL support recurring availability patterns (e.g., every Monday 9am-5pm).
4. WHEN saved, THE ScheduleEditor SHALL emit the updated Schedule and generated Slots via onSave.

### Requirement 20: Waitlist Manager Component

**User Story:** As a frontend developer, I want a React component for managing the patient waitlist.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `WaitlistManager` component that accepts an array of IWaitlistEntry objects and displays them sorted by priority.
2. THE WaitlistManager SHALL show patient name, requested service, preferred provider, preferred dates, priority, and wait time.
3. THE WaitlistManager SHALL support offering a slot to a waitlisted patient (emitting via onOfferSlot callback).
4. THE WaitlistManager SHALL support removing entries (emitting via onRemove callback).

### Requirement 21: Library Structure and Exports

**User Story:** As a developer, I want scheduling interfaces organized under a consistent directory structure.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL organize scheduling interfaces under `src/lib/scheduling/`.
2. THE brightchart-lib library SHALL export all interfaces from src/index.ts.
3. THE interfaces SHALL reuse existing types from Modules 1–5.
4. THE brightchart-react-components library SHALL organize components under `src/lib/scheduling/`.
5. THE brightchart-react-components library SHALL export all components from src/index.ts.
