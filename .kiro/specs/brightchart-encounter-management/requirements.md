# Requirements Document: BrightChart Encounter Management

## Introduction

This module establishes the Encounter Management layer for BrightChart — the FHIR R4-compliant encounter tracking system that resolves the forward-compatible encounter references stubbed in Module 2 (Clinical Data Foundation). It builds directly on Module 1 (Core Patient Identity) and Module 2, referencing patients via `IPatientResource.id` and linking clinical resources (Observation, Condition, AllergyIntolerance, MedicationStatement, Procedure) to the encounters during which they were recorded.

An Encounter represents an interaction between a patient and healthcare provider(s) for the purpose of providing healthcare services or assessing health status. This covers inpatient admissions, outpatient visits, emergency department encounters, telehealth consultations, dental appointments, and veterinary visits. The Encounter resource is the contextual hub that connects clinical data to the events where care was delivered.

The Specialty Adapter Layer from Module 2 extends naturally into encounters: medical encounters use standard HL7 v3 ActCode classes, dental encounters add operatory/chair tracking and procedure-linked tooth charting, and veterinary encounters add species-aware triage and herd/flock group encounters. Each specialty ships with a default workflow state configuration — a site-configurable sub-status layer that maps practice-specific steps (e.g., "In Hygiene Chair", "Waiting for Doctor") to standard FHIR encounter statuses, so that `Encounter.status` stays FHIR R4-compliant while the UI shows the granularity each practice needs.

The implementation spans:
- **brightchart-lib**: Shared FHIR R4 Encounter resource interfaces, encounter store interfaces, encounter search interfaces, encounter serializer interfaces, encounter lifecycle/workflow types, encounter-to-clinical-resource linking types, and specialty encounter extensions (browser-compatible)
- **brightchart-react-components**: React UI components for encounter list, encounter detail view, encounter creation/check-in form, and encounter timeline integration

## Glossary

- **Encounter_Resource**: A FHIR R4-compliant data model representing an interaction between a patient and healthcare provider(s), stored as an encrypted block on BrightChain.
- **Encounter_Store**: The BrightChain block store pool dedicated to persisting encrypted Encounter_Resource records, following the Clinical_Store pattern from Module 2.
- **Encounter_Serializer**: The component responsible for serializing Encounter_Resource objects to FHIR-compliant JSON and deserializing FHIR JSON back to Encounter_Resource objects.
- **Encounter_Search_Engine**: The component responsible for indexing and querying encounter fields using hashed indexes, matching the Clinical_Search_Engine pattern from Module 2.
- **Encounter_Lifecycle**: The state machine governing encounter status transitions (planned → arrived → triaged → in-progress → onleave → finished, with cancellation and error paths).
- **Encounter_Workflow_State**: A site-configurable sub-status that maps to a FHIR EncounterStatus but provides practice-specific granularity (e.g., "In Hygiene Chair" maps to in-progress). Each specialty ships with sensible defaults; sites can customize the state list, display labels, and valid transitions.
- **Encounter_Workflow_Config**: A per-site configuration defining the ordered list of workflow states, their FHIR status mappings, and valid workflow-level transitions. Stored as a configuration block on BrightChain.
- **Encounter_Participant**: A backbone element identifying a practitioner, related person, or other individual involved in the encounter, with their role and participation period.
- **Encounter_Diagnosis**: A backbone element linking a Condition or Procedure to the encounter with a use code (admission, billing, discharge) and rank.
- **Encounter_Hospitalization**: A backbone element capturing admission/discharge details for inpatient encounters, including admit source, discharge disposition, diet preferences, and special arrangements.
- **Encounter_Location**: A backbone element linking a location to the encounter with status (planned, active, reserved, completed) and physical type.
- **Encounter_Class**: A Coding value classifying the encounter setting (inpatient, outpatient, ambulatory, emergency, virtual, home health) using the HL7 v3 ActCode system.
- **Clinical_Resource_Link**: The mechanism by which clinical resources (Observation, Condition, etc.) reference the encounter during which they were recorded, resolving the forward-compatible `encounter` / `context` fields from Module 2.

## Requirements

### Requirement 1: FHIR R4 Encounter Resource Model

**User Story:** As a developer building clinical workflow modules, I want a FHIR R4-compliant Encounter resource data model in brightchart-lib, so that patient visits, admissions, and other healthcare interactions share a consistent, standards-based representation.

#### Acceptance Criteria

1. THE Encounter_Resource SHALL include the following FHIR R4 Encounter fields: identifier (array of IIdentifier), status (EncounterStatus code, required), statusHistory (array of EncounterStatusHistory), class (ICoding, required), classHistory (array of EncounterClassHistory), type (array of ICodeableConcept), serviceType (ICodeableConcept), priority (ICodeableConcept), subject (IReference to Patient), episodeOfCare (array of IReference), basedOn (array of IReference to ServiceRequest), participant (array of EncounterParticipant), appointment (array of IReference to Appointment), period (IPeriod), length (IDuration), reasonCode (array of ICodeableConcept), reasonReference (array of IReference to Condition, Procedure, Observation, or ImmunizationRecommendation), diagnosis (array of EncounterDiagnosis), account (array of IReference), hospitalization (EncounterHospitalization), location (array of EncounterLocation), serviceProvider (IReference to Organization), and partOf (IReference to Encounter).
2. THE Encounter_Resource SHALL use the generic TID type parameter (defaulting to string for frontend, Uint8Array for backend) consistent with the IPatientResource and clinical resource TID convention.
3. THE Encounter_Resource SHALL include a resourceType field with the fixed value "Encounter" conforming to the FHIR R4 resource type system.
4. THE Encounter_Resource SHALL include FHIR metadata fields: id, meta (IMeta), text (INarrative), and extension (array of IExtension).
5. THE Encounter_Resource SHALL include a brightchainMetadata field containing blockId (TID), creatorMemberId (TID), createdAt (Date), updatedAt (Date), poolId (string), and encryptionType (BlockEncryptionType), matching the clinical resource brightchainMetadata structure.
6. WHEN the Encounter_Resource references a patient, THE subject field SHALL use the IReference type pointing to a Patient resource, with the reference value matching an IPatientResource.id from Module 1.

### Requirement 2: Encounter Backbone Elements

**User Story:** As a developer, I want FHIR R4 backbone elements for encounter participants, diagnoses, hospitalization details, locations, and status/class history defined in brightchart-lib, so that the encounter model is complete and type-safe.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an exported `EncounterParticipant<TID>` interface with fields: type (array of ICodeableConcept for participant role), period (IPeriod), and individual (IReference to Practitioner, PractitionerRole, or RelatedPerson).
2. THE brightchart-lib library SHALL define an exported `EncounterDiagnosis<TID>` interface with fields: condition (IReference to Condition or Procedure, required), use (ICodeableConcept for diagnosis role: admission, billing, discharge), and rank (positiveInt).
3. THE brightchart-lib library SHALL define an exported `EncounterHospitalization<TID>` interface with fields: preAdmissionIdentifier (IIdentifier), origin (IReference to Location or Organization), admitSource (ICodeableConcept), reAdmission (ICodeableConcept), dietPreference (array of ICodeableConcept), specialCourtesy (array of ICodeableConcept), specialArrangement (array of ICodeableConcept), destination (IReference to Location or Organization), and dischargeDisposition (ICodeableConcept).
4. THE brightchart-lib library SHALL define an exported `EncounterLocation<TID>` interface with fields: location (IReference to Location, required), status (EncounterLocationStatus code: planned, active, reserved, completed), physicalType (ICodeableConcept), and period (IPeriod).
5. THE brightchart-lib library SHALL define exported `EncounterStatusHistory` interface with fields: status (EncounterStatus, required) and period (IPeriod, required), and `EncounterClassHistory` interface with fields: class (ICoding, required) and period (IPeriod, required).
6. THE brightchart-lib library SHALL export all encounter backbone element interfaces from the src/index.ts barrel export.

### Requirement 3: Encounter Enumerations

**User Story:** As a developer, I want FHIR R4 encounter status codes and encounter class codes defined as TypeScript enumerations, so that encounter state management is type-safe.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an exported `EncounterStatus` enumeration with FHIR R4 required values: planned, arrived, triaged, in-progress, onleave, finished, cancelled, entered-in-error, unknown.
2. THE brightchart-lib library SHALL define an exported `EncounterLocationStatus` enumeration with FHIR R4 required values: planned, active, reserved, completed.
3. THE brightchart-lib library SHALL define exported constants for common HL7 v3 ActCode encounter class values: IMP (inpatient), AMB (ambulatory), EMER (emergency), HH (home health), VR (virtual), FLD (field), SS (short stay), OBSENC (observation encounter), PRENC (pre-admission), with their system URI (`http://terminology.hl7.org/CodeSystem/v3-ActCode`).
4. THE brightchart-lib library SHALL define an exported `DiagnosisRole` type or constants for encounter diagnosis use codes: AD (admission diagnosis), DD (discharge diagnosis), CC (chief complaint), CM (comorbidity), pre-op, post-op, billing.
5. THE brightchart-lib library SHALL export all encounter enumerations from the src/index.ts barrel export.

### Requirement 4: Encounter Lifecycle and Status Transitions

**User Story:** As a clinical workflow developer, I want a well-defined encounter lifecycle state machine with site-configurable workflow states, so that encounter status transitions follow valid clinical workflows, invalid transitions are rejected, and each practice can define its own granular workflow steps mapped to standard FHIR statuses.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IEncounterLifecycle` interface with a method `isValidTransition(fromStatus: EncounterStatus, toStatus: EncounterStatus): boolean` that enforces valid FHIR R4 encounter status transitions.
2. THE valid FHIR status transitions SHALL be: planned → arrived, planned → cancelled, arrived → triaged, arrived → in-progress, arrived → cancelled, triaged → in-progress, triaged → cancelled, in-progress → onleave, in-progress → finished, in-progress → cancelled, onleave → in-progress, onleave → finished, and any status → entered-in-error.
3. THE brightchart-lib library SHALL define an `IEncounterLifecycle` method `transition(encounter: IEncounterResource, toStatus: EncounterStatus, memberId: TID): IEncounterResource | IOperationOutcome` that applies a valid transition, appends to statusHistory, and returns the updated encounter — or returns an OperationOutcome if the transition is invalid.
4. WHEN a status transition occurs, THE encounter's statusHistory array SHALL be appended with the previous status and the period during which that status was active.
5. THE brightchart-lib library SHALL export the encounter lifecycle interface and a default transition map constant from the src/index.ts barrel export.
6. THE brightchart-lib library SHALL define an `IEncounterWorkflowState` interface with fields: code (string, unique within a workflow config), displayName (string, the practice-facing label), mappedFhirStatus (EncounterStatus, the FHIR status this workflow state maps to), description (optional string), sortOrder (number, for UI ordering), and isTerminal (boolean, true for states like "Complete" or "Cancelled" that end the encounter).
7. THE brightchart-lib library SHALL define an `IEncounterWorkflowTransition` interface with fields: fromState (workflow state code), toState (workflow state code), and requiredPermission (optional EncounterPermission, for transitions that require elevated access such as provider sign-off).
8. THE brightchart-lib library SHALL define an `IEncounterWorkflowConfig` interface with fields: configId (string), specialtyCode (string matching ISpecialtyProfile.specialtyCode), siteName (optional string), states (array of IEncounterWorkflowState), transitions (array of IEncounterWorkflowTransition), and defaultInitialState (workflow state code for new encounters).
9. THE Encounter_Resource SHALL carry an optional `workflowState` field (as a FHIR extension with URL `http://brightchart.org/fhir/StructureDefinition/encounter-workflow-state`) containing the current workflow state code. The canonical `Encounter.status` field SHALL always hold the corresponding FHIR status value.
10. WHEN a workflow state transition is requested, THE lifecycle service SHALL validate that (a) the transition is in the workflow config's allowed transitions list, and (b) the mapped FHIR status transition is valid per the FHIR transition rules in AC 2. If the FHIR status changes as a result, the statusHistory SHALL be updated accordingly.
11. THE brightchart-lib library SHALL export all workflow state interfaces from the src/index.ts barrel export.

### Requirement 5: Encounter Data Store

**User Story:** As a system architect, I want encounters stored as encrypted blocks on BrightChain in a dedicated pool, so that encounter data benefits from BrightChain's storage model while remaining isolated from patient identity and clinical data pools.

#### Acceptance Criteria

1. THE Encounter_Store SHALL define an `IEncounterStore<TID>` interface following the `IClinicalStore` pattern with methods: store, retrieve, update, delete, getVersionHistory, and getPoolId.
2. THE Encounter_Store SHALL use a dedicated BrightChain pool (identified by a configurable poolId) for all encounter blocks, separate from the Patient_Store and Clinical_Store pools.
3. WHEN an Encounter_Resource is stored, THE Encounter_Store SHALL encrypt the serialized FHIR JSON using the BrightChain ECIES encryption scheme before writing the block.
4. WHEN an Encounter_Resource is stored, THE Encounter_Store SHALL validate that the patient reference (subject field) contains a valid IPatientResource.id that exists in the Patient_Store.
5. IF an Encounter_Resource is created with a patient reference that does not exist in the Patient_Store, THEN THE Encounter_Store SHALL return a FHIR OperationOutcome with issue severity "error" and code "not-found".
6. THE Encounter_Store SHALL store each Encounter_Resource version as a separate block, with the block's metadata linking to the previous version's block id for version history.
7. THE IEncounterStore interface SHALL be generic on TID, enabling the same interface for frontend (string) and backend (Uint8Array) use.

### Requirement 6: Encounter Search and Query

**User Story:** As a healthcare provider, I want to search for encounters by patient, date range, status, class, type, and participant, so that I can find relevant encounters for patient care and administrative workflows.

#### Acceptance Criteria

1. THE Encounter_Search_Engine SHALL define an `IEncounterSearchParams` interface supporting search by: patientId (required), status (optional EncounterStatus or array), classCode (optional string or array), type (optional ICodeableConcept or code string), dateRange (optional start and end dates matching the encounter period), participantId (optional practitioner reference), locationId (optional location reference), offset (optional number), and count (optional number).
2. WHEN search parameters are provided, THE Encounter_Search_Engine SHALL return a list of matching Encounter_Resource records ordered by period start date (most recent first).
3. THE Encounter_Search_Engine SHALL maintain a search index of unencrypted field hashes for patientId, status, class, type, period start date, participantId, and locationId — matching the Clinical_Search_Engine hashed index pattern.
4. WHEN search results are returned, THE Encounter_Search_Engine SHALL filter results to include only Encounter_Resource records that the requesting BrightChain_Member has read permission for.
5. THE Encounter_Search_Engine SHALL support pagination via offset and count parameters, returning a total count alongside the result page.
6. THE Encounter_Search_Engine SHALL define an `IEncounterSearchResult<TID>` interface with fields: entries (IEncounterResource<TID>[]), total (number), offset (number), count (number).

### Requirement 7: Encounter Serialization

**User Story:** As a developer, I want a serializer for the Encounter resource that follows the same round-trip property pattern as the Clinical_Serializer, so that encounter data can be reliably stored on BrightChain and exchanged with external systems.

#### Acceptance Criteria

1. THE Encounter_Serializer SHALL provide serialize and deserialize methods for the Encounter_Resource following the IClinicalSerializer pattern.
2. FOR ALL valid Encounter_Resource objects, serializing then deserializing then serializing SHALL produce byte-identical JSON output (round-trip property).
3. THE Encounter_Serializer SHALL omit fields with undefined or null values from the serialized JSON output.
4. WHEN an invalid JSON string is provided, THE Encounter_Serializer SHALL return a descriptive error indicating the parsing failure location and reason.
5. WHEN serializing date fields, THE Encounter_Serializer SHALL format dates as FHIR R4 date strings and dateTime fields as ISO 8601 with timezone.

### Requirement 8: Encounter-to-Clinical-Resource Linking

**User Story:** As a developer, I want clinical resources from Module 2 to be linkable to encounters, so that observations, conditions, allergies, medication statements, and procedures recorded during an encounter are traceable to that encounter context.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IEncounterClinicalLink<TID>` interface with fields: encounterId (string), clinicalResourceId (string), clinicalResourceType (ClinicalResourceType from Module 2), linkedAt (Date), and linkedBy (TID).
2. THE brightchart-lib library SHALL define an `IEncounterClinicalLinkStore<TID>` interface with methods: linkResource(encounterId, clinicalResourceId, clinicalResourceType, memberId): Promise<void>, unlinkResource(encounterId, clinicalResourceId, memberId): Promise<void>, getLinkedResources(encounterId, resourceType?): Promise<IEncounterClinicalLink<TID>[]>, and getEncounterForResource(clinicalResourceId): Promise<string | null>.
3. WHEN a clinical resource's encounter/context reference field is populated with a valid encounter id, THE link store SHALL be able to resolve that reference to an existing Encounter_Resource.
4. THE linking mechanism SHALL support bidirectional lookup: given an encounter, find all linked clinical resources; given a clinical resource, find its encounter.
5. THE brightchart-lib library SHALL export all encounter-clinical linking interfaces from the src/index.ts barrel export.

### Requirement 9: Encounter ACL

**User Story:** As a healthcare administrator, I want encounter-specific access control extending the Clinical ACL pattern, so that encounter data access follows the principle of least privilege.

#### Acceptance Criteria

1. THE Encounter ACL SHALL define an `EncounterPermission` enum with values: EncounterRead ("encounter:read"), EncounterWrite ("encounter:write"), EncounterAdmin ("encounter:admin").
2. THE Encounter ACL SHALL define an `IEncounterACL<TID>` interface extending `IPoolACL<TID>` with encounter-specific permissions, following the IClinicalACL pattern from Module 2.
3. EncounterAdmin SHALL imply both EncounterRead and EncounterWrite.
4. THE Encounter ACL SHALL integrate with the SMART on FHIR v2 scope system, mapping EncounterRead to read scopes on Encounter (`user/Encounter.rs`), EncounterWrite to create/update/delete scopes, and EncounterAdmin to `system/*.*`.
5. THE brightchart-lib library SHALL export all encounter ACL types from the src/index.ts barrel export.

### Requirement 10: Encounter Audit Trail

**User Story:** As a compliance officer, I want a complete audit trail of all encounter operations, so that the organization can demonstrate regulatory compliance for visit tracking.

#### Acceptance Criteria

1. WHEN any operation (create, read, update, delete, search, status transition) is performed on an Encounter_Resource, THE audit logger SHALL create an audit entry containing: operation type, encounter id (or search parameters for search operations), the BrightChain_Member id, a timestamp, the request id, and a cryptographic signature.
2. THE encounter audit entries SHALL extend the IClinicalAuditEntry pattern from Module 2, adding `encounterStatus` (the status at time of operation) and `statusTransition` (from/to status, if applicable) fields.
3. THE encounter audit entries SHALL be stored in the shared audit pool from Modules 1 and 2, with hash-linked chains per encounter.
4. THE encounter audit entries SHALL be append-only with no mechanism to modify or delete existing entries.

### Requirement 11: Encounter Specialty Extensions

**User Story:** As a product owner, I want the Specialty Adapter from Module 2 extended to support encounter-specific configurations for medical, dental, and veterinary specialties — including default workflow state configurations — so that encounter workflows are specialty-aware out of the box and customizable per site.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IEncounterSpecialtyExtension` interface with fields: specialtyCode (string matching ISpecialtyProfile.specialtyCode), encounterClassExtensions (additional class codes specific to the specialty), encounterTypeExtensions (additional type codes), validationRules (array of IValidationRule for encounter-specific validation), and defaultWorkflowConfig (IEncounterWorkflowConfig providing the default workflow states and transitions for the specialty).
2. THE Medical encounter specialty SHALL include standard HL7 v3 ActCode classes (IMP, AMB, EMER, HH, VR) and encounter types from SNOMED CT. THE Medical default workflow config SHALL include states: Scheduled (→ planned), Checked In (→ arrived), Triage (→ triaged), With Provider (→ in-progress), Checkout (→ in-progress), Complete (→ finished), Cancelled (→ cancelled).
3. THE Dental encounter specialty SHALL include extensions for: operatory/chair assignment (IReference to Location with dental operatory type), procedure-linked tooth charting context, and dental-specific encounter types (periodic exam, emergency dental, restorative visit). THE Dental default workflow config SHALL include states: Scheduled (→ planned), Checked In (→ arrived), In Hygiene Chair (→ in-progress), Waiting for Doctor (→ in-progress), With Doctor (→ in-progress), Checkout (→ in-progress), Complete (→ finished), Cancelled (→ cancelled).
4. THE Veterinary encounter specialty SHALL include extensions for: species-aware triage priority, herd/flock group encounter support (subject as Group reference), and veterinary-specific encounter types (wellness exam, vaccination visit, surgical procedure, farm call). THE Veterinary default workflow config SHALL include states: Appointment Booked (→ planned), In Waiting Room (→ arrived), Triage/Weigh-in (→ triaged), In Exam Room (→ in-progress), In Surgery (→ in-progress), In Recovery (→ in-progress), Owner Pickup (→ in-progress), Discharged (→ finished), Cancelled (→ cancelled).
5. THE brightchart-lib library SHALL export predefined encounter specialty extension constants (including their default workflow configs) for medical, dental, and veterinary specialties.
6. EACH default workflow config SHALL define valid transitions between its workflow states, and all transitions SHALL map to valid FHIR status transitions as defined in Requirement 4 AC 2.

### Requirement 12: Portability Standard Extension for Encounters

**User Story:** As a practice administrator, I want the BrightChart portability standard extended to include encounter data, so that visit history is preserved during data migration.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IEncounterExportBundle<TID>` interface extending `IClinicalExportBundle<TID>` from Module 2, adding: encounters (array of IEncounterResource<TID>) and encounterClinicalLinks (array of IEncounterClinicalLink<TID>).
2. THE export bundle SHALL preserve all encounter-to-patient references and encounter-to-clinical-resource links so that imported data maintains referential integrity.
3. WHEN an encounter import is processed, THE import service SHALL validate that all patient references in encounters resolve to patients in the import bundle or existing Patient_Store.
4. IF an encounter import contains unresolved patient references, THEN THE import service SHALL return a FHIR OperationOutcome listing all unresolved references.
5. THE Encounter_Serializer SHALL support serializing and deserializing IEncounterExportBundle objects with the round-trip property.

### Requirement 13: Encounter List Component

**User Story:** As a frontend developer, I want a React component that displays a list of encounters for a patient, so that clinicians can see visit history at a glance.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide an `EncounterList` component that accepts an array of IEncounterResource<string> objects and displays them as a list showing: encounter class, type display text, status (displaying the workflow state displayName when available, falling back to FHIR status), period (start/end dates), and service provider.
2. THE EncounterList SHALL visually distinguish encounters by status using color or styling (active encounters highlighted, finished encounters muted, cancelled encounters struck through). WHEN workflow states are available, THE EncounterList SHALL use the workflow state displayName as the status label.
3. THE EncounterList SHALL support filtering by status and class via filter controls. WHEN an IEncounterWorkflowConfig is provided, THE filter SHALL offer workflow state names instead of raw FHIR statuses.
4. WHEN an EncounterList entry is selected, THE EncounterList SHALL emit the selected IEncounterResource via an onSelect callback prop.
5. THE EncounterList SHALL support grouping encounters by class (inpatient, outpatient, emergency) with collapsible group headers.

### Requirement 14: Encounter Detail View Component

**User Story:** As a frontend developer, I want a React component that displays the full details of a single encounter, so that clinicians can review visit information including participants, diagnoses, locations, and linked clinical resources.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide an `EncounterDetailView` component that accepts an IEncounterResource<string> and displays: status with status history timeline (showing workflow state displayNames when an IEncounterWorkflowConfig is provided), class, type, period, participants (with roles), diagnoses (with use and rank), locations (with status), hospitalization details (if present), reason codes, and service provider.
2. THE EncounterDetailView SHALL accept an optional array of ClinicalResource<string> objects (from Module 2) representing linked clinical resources, and display them grouped by resource type beneath the encounter details.
3. THE EncounterDetailView SHALL display the encounter status history as a visual timeline showing each status transition with its period. WHEN an IEncounterWorkflowConfig is provided, THE timeline SHALL display workflow state displayNames alongside or instead of raw FHIR statuses.
4. WHEN a linked clinical resource is selected, THE EncounterDetailView SHALL emit the selected resource via an onResourceSelect callback prop.

### Requirement 15: Encounter Check-In Form Component

**User Story:** As a frontend developer, I want a React component for creating new encounters and checking patients in, so that front desk staff can initiate encounters through the UI.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide an `EncounterCheckInForm` component that renders input fields for: patient (searchable patient selector), encounter class (dropdown), encounter type (searchable code input), priority, participants (add/remove practitioners), location, reason codes, and appointment reference.
2. WHEN the EncounterCheckInForm is submitted with valid data, THE form SHALL emit a complete IEncounterResource<string> object via an onSubmit callback prop with status set to the FHIR status mapped from the workflow config's defaultInitialState (typically "arrived"), and the workflowState extension set to the default initial workflow state code.
3. WHEN the EncounterCheckInForm receives invalid input (missing required fields), THE form SHALL display validation errors inline next to the affected fields.
4. THE EncounterCheckInForm SHALL accept an optional IEncounterResource<string> prop for editing an existing encounter.
5. THE EncounterCheckInForm SHALL accept a specialty profile prop and an optional IEncounterWorkflowConfig prop to determine which encounter class codes, type codes, and initial workflow states are available.

### Requirement 16: Library Structure and Exports

**User Story:** As a developer building future modules, I want encounter interfaces organized under a consistent directory structure and exported from barrel files, so that downstream modules can import encounter types cleanly.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL organize encounter interfaces under a `src/lib/encounter/` directory, separate from the existing `src/lib/clinical/` and `src/lib/fhir/` directories.
2. THE brightchart-lib library SHALL export all encounter resource interfaces, backbone elements, enumerations, store interfaces, search interfaces, serializer interfaces, lifecycle interfaces, linking interfaces, ACL types, audit types, specialty extensions, and portability types from the src/index.ts barrel export.
3. THE encounter interfaces SHALL reuse existing FHIR datatype interfaces (ICodeableConcept, IReference, IIdentifier, IMeta, INarrative, IExtension, IPeriod, ICoding) and clinical types (ClinicalResourceType, ClinicalResource, IBrightChainMetadata) from Modules 1 and 2 rather than redefining them.
4. THE brightchart-react-components library SHALL organize encounter UI components under a `src/lib/encounter/` directory.
5. THE brightchart-react-components library SHALL export all encounter UI components from the src/index.ts barrel export.
