# Implementation Plan: BrightChart Encounter Management

## Overview

This plan implements the Encounter Management module for BrightChart — the FHIR R4-compliant encounter tracking layer building on Module 1 (Core Patient Identity) and Module 2 (Clinical Data Foundation). All new code is added to the existing `brightchart-lib` and `brightchart-react-components` libraries under `src/lib/encounter/` directories. The implementation proceeds bottom-up: enumerations → backbone elements → resource model → lifecycle/workflow → service interfaces (store, search, serializer, linking, ACL, audit) → specialty extensions → portability → React components.

## Tasks

- [x] 1. Encounter enumerations and class constants
  - [x] 1.1 Create `brightchart-lib/src/lib/encounter/enumerations.ts` defining exported enumerations: `EncounterStatus` (planned, arrived, triaged, in-progress, onleave, finished, cancelled, entered-in-error, unknown), `EncounterLocationStatus` (planned, active, reserved, completed). Define exported `DiagnosisRole` constants (AD, DD, CC, CM, pre-op, post-op, billing). Define exported `ICoding` constants for HL7 v3 ActCode encounter classes: `ENCOUNTER_CLASS_IMP`, `ENCOUNTER_CLASS_AMB`, `ENCOUNTER_CLASS_EMER`, `ENCOUNTER_CLASS_HH`, `ENCOUNTER_CLASS_VR`, `ENCOUNTER_CLASS_FLD`, `ENCOUNTER_CLASS_SS`, `ENCOUNTER_CLASS_OBSENC`, `ENCOUNTER_CLASS_PRENC`, all with system URI `http://terminology.hl7.org/CodeSystem/v3-ActCode`.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Encounter backbone elements
  - [x] 2.1 Create `brightchart-lib/src/lib/encounter/backboneElements.ts` defining exported interfaces: `EncounterParticipant<TID = string>` (type: ICodeableConcept[], period: IPeriod, individual: IReference<TID>), `EncounterDiagnosis<TID = string>` (condition: IReference<TID> required, use: ICodeableConcept, rank: number), `EncounterHospitalization<TID = string>` (preAdmissionIdentifier, origin, admitSource, reAdmission, dietPreference, specialCourtesy, specialArrangement, destination, dischargeDisposition), `EncounterLocation<TID = string>` (location: IReference<TID> required, status: EncounterLocationStatus, physicalType, period), `EncounterStatusHistory` (status: EncounterStatus required, period: IPeriod required), `EncounterClassHistory` (class: ICoding required, period: IPeriod required). Import FHIR base types from Module 1 and clinical datatypes from Module 2.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Encounter resource interface
  - [x] 3.1 Create `brightchart-lib/src/lib/encounter/encounterResource.ts` defining the exported `IEncounterResource<TID = string>` interface with all FHIR R4 Encounter fields (identifier, status, statusHistory, class, classHistory, type, serviceType, priority, subject, episodeOfCare, basedOn, participant, appointment, period, length, reasonCode, reasonReference, diagnosis, account, hospitalization, location, serviceProvider, partOf), FHIR metadata (id, meta, text, extension), `brightchainMetadata: IBrightChainMetadata<TID>`, and `resourceType: 'Encounter'` literal. Import backbone elements from task 2 and FHIR base types from Module 1.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.2 Create `brightchart-lib/src/lib/encounter/index.ts` barrel export re-exporting enumerations, backbone elements, and encounter resource. Update `brightchart-lib/src/index.ts` to re-export from `./lib/encounter/index`.
    - _Requirements: 16.1, 16.2_

- [x] 4. Encounter lifecycle and workflow state layer
  - [x] 4.1 Create `brightchart-lib/src/lib/encounter/lifecycle/encounterLifecycle.ts` defining the exported `IEncounterLifecycle<TID = string>` interface with methods: `isValidTransition(fromStatus, toStatus): boolean`, `transition(encounter, toStatus, memberId): IEncounterResource<TID> | IOperationOutcome`, `isValidWorkflowTransition(config, fromState, toState): boolean`, `workflowTransition(encounter, config, toState, memberId): IEncounterResource<TID> | IOperationOutcome`. Define and export the `ENCOUNTER_STATUS_TRANSITIONS: Record<EncounterStatus, EncounterStatus[]>` constant encoding the valid FHIR transitions: planned → [arrived, cancelled], arrived → [triaged, in-progress, cancelled], triaged → [in-progress, cancelled], in-progress → [onleave, finished, cancelled], onleave → [in-progress, finished], plus any → entered-in-error.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.10_

  - [x] 4.2 Create `brightchart-lib/src/lib/encounter/workflow/workflowTypes.ts` defining exported interfaces: `IEncounterWorkflowState` (code: string, displayName: string, mappedFhirStatus: EncounterStatus, description?: string, sortOrder: number, isTerminal: boolean), `IEncounterWorkflowTransition` (fromState: string, toState: string, requiredPermission?: EncounterPermission), `IEncounterWorkflowConfig` (configId: string, specialtyCode: string, siteName?: string, states: IEncounterWorkflowState[], transitions: IEncounterWorkflowTransition[], defaultInitialState: string).
    - _Requirements: 4.6, 4.7, 4.8, 4.9, 4.11_

  - [x] 4.3 Create `brightchart-lib/src/lib/encounter/lifecycle/index.ts` and `brightchart-lib/src/lib/encounter/workflow/index.ts` barrel exports. Update `brightchart-lib/src/lib/encounter/index.ts` to re-export from both.
    - _Requirements: 16.2_

- [x] 5. Encounter store interface
  - [x] 5.1 Create `brightchart-lib/src/lib/encounter/store/encounterStore.ts` defining the exported `IEncounterStore<TID = string>` interface with methods: `store(encounter: IEncounterResource<TID>, encryptionKeys: Uint8Array, memberId: TID): Promise<TID>`, `retrieve(blockId: TID, decryptionKeys: Uint8Array, memberId: TID): Promise<IEncounterResource<TID>>`, `update(encounter: IEncounterResource<TID>, encryptionKeys: Uint8Array, memberId: TID): Promise<TID>`, `delete(encounterId: string, memberId: TID): Promise<void>`, `getVersionHistory(encounterId: string): Promise<TID[]>`, `getPoolId(): string`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 5.2 Create `brightchart-lib/src/lib/encounter/store/index.ts` barrel export. Update `brightchart-lib/src/lib/encounter/index.ts` to re-export from `./store/index`.
    - _Requirements: 16.2_

- [x] 6. Encounter search interface
  - [x] 6.1 Create `brightchart-lib/src/lib/encounter/search/encounterSearch.ts` defining exported interfaces: `IEncounterSearchParams` (patientId: string required, status?: EncounterStatus | EncounterStatus[], classCode?: string | string[], type?: string | ICodeableConcept, dateRange?: {start?, end?}, participantId?: string, locationId?: string, offset?: number, count?: number), `IEncounterSearchResult<TID = string>` (entries: IEncounterResource<TID>[], total: number, offset: number, count: number), `IEncounterSearchEngine<TID = string>` with methods: `search(params, memberId): Promise<IEncounterSearchResult<TID>>`, `indexEncounter(encounter): Promise<void>`, `removeIndex(encounterId): Promise<void>`.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 6.2 Create `brightchart-lib/src/lib/encounter/search/index.ts` barrel export. Update `brightchart-lib/src/lib/encounter/index.ts` to re-export from `./search/index`.
    - _Requirements: 16.2_

- [x] 7. Encounter serializer interface
  - [x] 7.1 Create `brightchart-lib/src/lib/encounter/serializer/encounterSerializer.ts` defining exported interfaces: `IEncounterSerializer` with methods `serialize(encounter: IEncounterResource): string` and `deserialize(json: string): IEncounterResource`, and `IEncounterBundleSerializer` with methods `serialize(bundle: IEncounterExportBundle): string` and `deserialize(json: string): IEncounterExportBundle`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.5_

  - [x] 7.2 Create `brightchart-lib/src/lib/encounter/serializer/index.ts` barrel export. Update `brightchart-lib/src/lib/encounter/index.ts` to re-export from `./serializer/index`.
    - _Requirements: 16.2_

- [x] 8. Encounter-clinical linking interface
  - [x] 8.1 Create `brightchart-lib/src/lib/encounter/linking/encounterClinicalLink.ts` defining exported interfaces: `IEncounterClinicalLink<TID = string>` (encounterId: string, clinicalResourceId: string, clinicalResourceType: ClinicalResourceType, linkedAt: Date, linkedBy: TID), `IEncounterClinicalLinkStore<TID = string>` with methods: `linkResource(encounterId, clinicalResourceId, clinicalResourceType, memberId): Promise<void>`, `unlinkResource(encounterId, clinicalResourceId, memberId): Promise<void>`, `getLinkedResources(encounterId, resourceType?): Promise<IEncounterClinicalLink<TID>[]>`, `getEncounterForResource(clinicalResourceId): Promise<string | null>`.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 8.2 Create `brightchart-lib/src/lib/encounter/linking/index.ts` barrel export. Update `brightchart-lib/src/lib/encounter/index.ts` to re-export from `./linking/index`.
    - _Requirements: 16.2_

- [x] 9. Encounter ACL interface
  - [x] 9.1 Create `brightchart-lib/src/lib/encounter/access/encounterAcl.ts` defining: exported `EncounterPermission` enum with values `EncounterRead = 'encounter:read'`, `EncounterWrite = 'encounter:write'`, `EncounterAdmin = 'encounter:admin'`; exported `IEncounterACL<TID = string>` interface extending `IPoolACL<TID>` with `encounterPermissions: Array<{ memberId: TID; permissions: EncounterPermission[] }>`. Export a `hasEncounterPermission` function signature and SMART scope mapping constants (read scopes → EncounterRead, cuds scopes → EncounterWrite, system/*.* → EncounterAdmin).
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 9.2 Create `brightchart-lib/src/lib/encounter/access/index.ts` barrel export. Update `brightchart-lib/src/lib/encounter/index.ts` to re-export from `./access/index`.
    - _Requirements: 16.2_

- [x] 10. Encounter audit interface
  - [x] 10.1 Create `brightchart-lib/src/lib/encounter/audit/encounterAudit.ts` defining: exported `IEncounterAuditEntry<TID = string>` interface extending `IClinicalAuditEntry<TID>` with fields: `encounterStatus: EncounterStatus`, `statusTransition?: { fromStatus: EncounterStatus; toStatus: EncounterStatus; fromWorkflowState?: string; toWorkflowState?: string }`. Export an `IEncounterAuditLogger<TID = string>` interface with methods for logging encounter operations (create, read, update, delete, search, statusTransition).
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 10.2 Create `brightchart-lib/src/lib/encounter/audit/index.ts` barrel export. Update `brightchart-lib/src/lib/encounter/index.ts` to re-export from `./audit/index`.
    - _Requirements: 16.2_

- [x] 11. Encounter specialty extensions with default workflow configs
  - [x] 11.1 Create `brightchart-lib/src/lib/encounter/specialty/encounterSpecialtyTypes.ts` defining the exported `IEncounterSpecialtyExtension` interface with fields: specialtyCode, encounterClassExtensions (ICoding[]), encounterTypeExtensions (ICodeableConcept[]), validationRules (IValidationRule[]), defaultWorkflowConfig (IEncounterWorkflowConfig).
    - _Requirements: 11.1_

  - [x] 11.2 Create `brightchart-lib/src/lib/encounter/specialty/medicalEncounterProfile.ts` defining and exporting `MEDICAL_ENCOUNTER_EXTENSION: IEncounterSpecialtyExtension` with standard HL7 v3 ActCode classes (IMP, AMB, EMER, HH, VR), SNOMED CT encounter types, and the medical default workflow config: Scheduled (→ planned), Checked In (→ arrived), Triage (→ triaged), With Provider (→ in-progress), Checkout (→ in-progress), Complete (→ finished), Cancelled (→ cancelled), with valid transitions between them.
    - _Requirements: 11.2, 11.6_

  - [x] 11.3 Create `brightchart-lib/src/lib/encounter/specialty/dentalEncounterProfile.ts` defining and exporting `DENTAL_ENCOUNTER_EXTENSION: IEncounterSpecialtyExtension` with dental-specific encounter types (periodic exam, emergency dental, restorative visit), operatory/chair location extensions, and the dental default workflow config: Scheduled (→ planned), Checked In (→ arrived), In Hygiene Chair (→ in-progress), Waiting for Doctor (→ in-progress), With Doctor (→ in-progress), Checkout (→ in-progress), Complete (→ finished), Cancelled (→ cancelled), with valid transitions.
    - _Requirements: 11.3, 11.6_

  - [x] 11.4 Create `brightchart-lib/src/lib/encounter/specialty/veterinaryEncounterProfile.ts` defining and exporting `VETERINARY_ENCOUNTER_EXTENSION: IEncounterSpecialtyExtension` with veterinary-specific encounter types (wellness exam, vaccination visit, surgical procedure, farm call), species-aware triage, herd/flock group encounter support, and the veterinary default workflow config: Appointment Booked (→ planned), In Waiting Room (→ arrived), Triage/Weigh-in (→ triaged), In Exam Room (→ in-progress), In Surgery (→ in-progress), In Recovery (→ in-progress), Owner Pickup (→ in-progress), Discharged (→ finished), Cancelled (→ cancelled), with valid transitions.
    - _Requirements: 11.4, 11.6_

  - [x] 11.5 Create `brightchart-lib/src/lib/encounter/specialty/hospitalEncounterProfile.ts` defining and exporting `HOSPITAL_ENCOUNTER_EXTENSION: IEncounterSpecialtyExtension` with hospital-specific encounter classes (IMP, EMER, SS, OBSENC), hospital encounter types, bed/ward/unit location tracking, and the hospital default workflow config with states: Pre-Admission, Admitted, In Ward, In Surgery, In Recovery, In ICU, Awaiting Discharge, Discharged, Cancelled.
    - _Requirements: 11.1, 11.6_

  - [x] 11.6 Create `brightchart-lib/src/lib/encounter/specialty/index.ts` barrel export. Update `brightchart-lib/src/lib/encounter/index.ts` to re-export from `./specialty/index`.
    - _Requirements: 11.5, 16.2_

- [x] 12. Encounter portability interface
  - [x] 12.1 Create `brightchart-lib/src/lib/encounter/portability/encounterPortability.ts` defining the exported `IEncounterExportBundle<TID = string>` interface extending `IClinicalExportBundle<TID>` with fields: `encounters: IEncounterResource<TID>[]`, `encounterClinicalLinks: IEncounterClinicalLink<TID>[]`. Also export an `IEncounterImportResult<TID = string>` interface with fields: success, importedEncounters, errors.
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 12.2 Create `brightchart-lib/src/lib/encounter/portability/index.ts` barrel export. Update `brightchart-lib/src/lib/encounter/index.ts` to re-export from `./portability/index`.
    - _Requirements: 16.2_

- [x] 13. Final brightchart-lib barrel export verification
  - [x] 13.1 Verify `brightchart-lib/src/lib/encounter/index.ts` re-exports all sub-modules (enumerations, backboneElements, encounterResource, lifecycle, workflow, store, search, serializer, linking, access, audit, specialty, portability). Verify `brightchart-lib/src/index.ts` re-exports from `./lib/encounter/index`. Run `yarn nx run brightchart-lib:build` to confirm the library compiles without errors.
    - _Requirements: 16.1, 16.2, 16.3_

- [x] 14. React encounter components
  - [x] 14.1 Create `brightchart-react-components/src/lib/encounter/EncounterList.tsx` implementing the `EncounterList` component. Props: `encounters: IEncounterResource<string>[]`, `onSelect: (encounter: IEncounterResource<string>) => void`, `workflowConfig?: IEncounterWorkflowConfig`, `filterStatuses?: EncounterStatus[]`, `filterClasses?: string[]`. Displays encounter class, type, status (workflow state displayName when config provided, FHIR status otherwise), period, service provider. Groups by class with collapsible headers. Visually distinguishes by status. Supports filtering by status and class.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 14.2 Create `brightchart-react-components/src/lib/encounter/EncounterDetailView.tsx` implementing the `EncounterDetailView` component. Props: `encounter: IEncounterResource<string>`, `linkedResources?: ClinicalResource<string>[]`, `workflowConfig?: IEncounterWorkflowConfig`, `onResourceSelect?: (resource: ClinicalResource<string>) => void`. Displays full encounter details: status with timeline (workflow state labels when config provided), class, type, period, participants with roles, diagnoses with use/rank, locations with status, hospitalization details, reason codes, service provider. Shows linked clinical resources grouped by type.
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 14.3 Create `brightchart-react-components/src/lib/encounter/EncounterCheckInForm.tsx` implementing the `EncounterCheckInForm` component. Props: `onSubmit: (encounter: IEncounterResource<string>) => void`, `encounter?: IEncounterResource<string>` (edit mode), `specialtyProfile?: ISpecialtyProfile`, `workflowConfig?: IEncounterWorkflowConfig`. Renders inputs for patient (searchable), encounter class (dropdown), type (searchable code input), priority, participants (add/remove), location, reason codes, appointment reference. Emits encounter with status from workflow config's defaultInitialState mapping. Inline validation errors for missing required fields.
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 14.4 Create `brightchart-react-components/src/lib/encounter/EncounterWorkflowBoard.tsx` implementing the `EncounterWorkflowBoard` component. Props: `encounters: IEncounterResource<string>[]`, `workflowConfig: IEncounterWorkflowConfig`, `onTransition: (encounter: IEncounterResource<string>, toState: string) => void`, `onSelect: (encounter: IEncounterResource<string>) => void`. Renders a kanban-style board with one column per non-terminal workflow state (sorted by sortOrder), encounter cards in each column showing patient name, type, and time in state. Supports drag-to-transition between columns (validating against workflow config transitions).
    - _Requirements: 13.1, 14.1 (supplementary — the workflow board is an additional view not explicitly in requirements but referenced in the design as a key UI pattern)_

  - [x] 14.5 Create `brightchart-react-components/src/lib/encounter/index.ts` barrel export re-exporting all four encounter components. Update `brightchart-react-components/src/index.ts` to re-export from `./lib/encounter/index`. Run `yarn nx run brightchart-react-components:build` to confirm the library compiles without errors.
    - _Requirements: 16.4, 16.5_
