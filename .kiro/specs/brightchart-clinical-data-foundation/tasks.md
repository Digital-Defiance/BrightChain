# Implementation Plan: BrightChart Clinical Data Foundation

## Overview

This plan implements the Clinical Data Foundation for BrightChart — the FHIR R4-compliant clinical resource data layer building on Module 1 (Core Patient Identity). All new code is added to the existing `brightchart-lib` and `brightchart-react-components` libraries under `src/lib/clinical/` directories. The implementation proceeds bottom-up: datatypes → resource models → specialty adapter → service interfaces (store, search, serializer, ACL, audit) → portability → React components.

## Tasks

- [x] 1. Clinical datatypes, backbone elements, and enumerations
  - [x] 1.1 Create `brightchart-lib/src/lib/clinical/datatypes.ts` defining exported TypeScript interfaces for FHIR R4 complex datatypes required by clinical resources: `IQuantity` (value, comparator, unit, system, code), `ISimpleQuantity` (value, unit, system, code — no comparator), `IRange` (low: ISimpleQuantity, high: ISimpleQuantity), `IRatio` (numerator: IQuantity, denominator: IQuantity), `IAge` (extends IQuantity with age-specific constraints), `IAnnotation` (authorReference, authorString, time, text), `IDosage` (sequence, text, additionalInstruction, patientInstruction, timing, site, route, method, doseAndRate, maxDosePerPeriod, maxDosePerAdministration, maxDosePerLifetime), `IDosageDoseAndRate` (type, doseRange, doseQuantity, rateRatio, rateRange, rateQuantity), `ITiming` (event, repeat, code), `ITimingRepeat` (boundsDuration, boundsRange, boundsPeriod, count, countMax, duration, durationMax, durationUnit, frequency, frequencyMax, period, periodMax, periodUnit, dayOfWeek, timeOfDay, when, offset), `ISampledData` (origin, period, factor, lowerLimit, upperLimit, dimensions, data). All generic on `<TID = string>` where applicable.
    - _Requirements: 6.1, 6.5_

  - [x] 1.2 Create `brightchart-lib/src/lib/clinical/backboneElements.ts` defining exported TypeScript interfaces for clinical resource backbone elements: `ObservationReferenceRange` (low, high, type, appliesTo, age, text), `ObservationComponent` (code, value[x], dataAbsentReason, interpretation, referenceRange), `ConditionStage` (summary, assessment, type), `ConditionEvidence` (code, detail), `AllergyIntoleranceReaction` (substance, manifestation, description, onset, severity, exposureRoute, note), `MedicationIngredient` (itemCodeableConcept, itemReference, isActive, strength), `MedicationBatch` (lotNumber, expirationDate), `ProcedurePerformer` (function, actor, onBehalfOf), `ProcedureFocalDevice` (action, manipulated). Generic on `<TID = string>` where they contain IReference fields.
    - _Requirements: 6.2, 6.5_

  - [x] 1.3 Create `brightchart-lib/src/lib/clinical/enumerations.ts` defining exported enumerations for clinical resource status codes: `ObservationStatus` (registered, preliminary, final, amended, corrected, cancelled, entered-in-error, unknown), `ConditionClinicalStatus` (active, recurrence, relapse, inactive, remission, resolved), `ConditionVerificationStatus` (unconfirmed, provisional, differential, confirmed, refuted, entered-in-error), `AllergyIntoleranceType` (allergy, intolerance), `AllergyIntoleranceCategory` (food, medication, environment, biologic), `AllergyIntoleranceCriticality` (low, high, unable-to-assess), `AllergyIntoleranceSeverity` (mild, moderate, severe), `MedicationStatus` (active, inactive, entered-in-error), `MedicationStatementStatus` (active, completed, entered-in-error, intended, stopped, on-hold, unknown, not-taken), `ProcedureStatus` (preparation, in-progress, not-done, on-hold, stopped, completed, entered-in-error, unknown).
    - _Requirements: 6.3_

  - [x] 1.4 Create `brightchart-lib/src/lib/clinical/index.ts` barrel export re-exporting all types from `datatypes.ts`, `backboneElements.ts`, and `enumerations.ts`. Update `brightchart-lib/src/index.ts` to re-export from `./lib/clinical/index`.
    - _Requirements: 6.4, 20.2_

- [x] 2. Clinical resource interfaces
  - [x] 2.1 Create `brightchart-lib/src/lib/clinical/resources/observation.ts` defining the exported `IObservationResource<TID = string>` interface with all FHIR R4 Observation fields (identifier, status, category, code, subject, encounter, effectiveDateTime, effectivePeriod, issued, performer, value[x] variants, dataAbsentReason, interpretation, note, bodySite, method, referenceRange, component, hasMember), FHIR metadata (id, meta, text, extension), `brightchainMetadata: IBrightChainMetadata<TID>`, and `resourceType: 'Observation'` literal. Import FHIR base types (ICodeableConcept, IReference, IIdentifier, IMeta, INarrative, IExtension, IPeriod) from the existing Module 1 FHIR types and clinical datatypes/backbone elements from task 1.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 20.3_

  - [x] 2.2 Create `brightchart-lib/src/lib/clinical/resources/condition.ts` defining the exported `IConditionResource<TID = string>` interface with all FHIR R4 Condition fields (identifier, clinicalStatus, verificationStatus, category, severity, code, bodySite, subject, encounter, onset[x] variants, abatement[x] variants, recordedDate, recorder, asserter, stage, evidence), FHIR metadata, `brightchainMetadata`, and `resourceType: 'Condition'` literal.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.3 Create `brightchart-lib/src/lib/clinical/resources/allergyIntolerance.ts` defining the exported `IAllergyIntoleranceResource<TID = string>` interface with all FHIR R4 AllergyIntolerance fields (identifier, clinicalStatus, verificationStatus, type, category, criticality, code, patient, encounter, onset[x] variants, recordedDate, recorder, asserter, lastOccurrence, note, reaction), FHIR metadata, `brightchainMetadata`, and `resourceType: 'AllergyIntolerance'` literal.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.4 Create `brightchart-lib/src/lib/clinical/resources/medication.ts` defining the exported `IMedicationResource<TID = string>` interface with all FHIR R4 Medication fields (identifier, code, status, manufacturer, form, amount, ingredient, batch), FHIR metadata, `brightchainMetadata`, and `resourceType: 'Medication'` literal.
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 2.5 Create `brightchart-lib/src/lib/clinical/resources/medicationStatement.ts` defining the exported `IMedicationStatementResource<TID = string>` interface with all FHIR R4 MedicationStatement fields (identifier, status, statusReason, category, medicationCodeableConcept, medicationReference, subject, context, effectiveDateTime, effectivePeriod, dateAsserted, informationSource, reasonCode, reasonReference, note, dosage), FHIR metadata, `brightchainMetadata`, and `resourceType: 'MedicationStatement'` literal.
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.6 Create `brightchart-lib/src/lib/clinical/resources/procedure.ts` defining the exported `IProcedureResource<TID = string>` interface with all FHIR R4 Procedure fields (identifier, status, statusReason, category, code, subject, encounter, performed[x] variants, recorder, asserter, performer, location, reasonCode, reasonReference, bodySite, outcome, report, complication, complicationDetail, followUp, note, focalDevice, usedCode), FHIR metadata, `brightchainMetadata`, and `resourceType: 'Procedure'` literal.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.7 Create `brightchart-lib/src/lib/clinical/resources/index.ts` defining and exporting the `ClinicalResource<TID>` union type (all six resource interfaces) and `ClinicalResourceType` string literal union type. Re-export all individual resource interfaces. Update `brightchart-lib/src/lib/clinical/index.ts` to re-export from `./resources/index`.
    - _Requirements: 20.2, 20.4_

- [x] 3. BrightChain metadata and clinical store interfaces
  - [x] 3.1 Create `brightchart-lib/src/lib/clinical/metadata.ts` defining the exported `IBrightChainMetadata<TID = string>` interface with fields: `blockId: TID`, `creatorMemberId: TID`, `createdAt: Date`, `updatedAt: Date`, `poolId: string`, `encryptionType: BlockEncryptionType`. If `IBrightChainMetadata` already exists in the Module 1 FHIR types, re-export it instead of redefining.
    - _Requirements: 1.5, 7.2_

  - [x] 3.2 Create `brightchart-lib/src/lib/clinical/store/clinicalStore.ts` defining the exported `IClinicalStore<TID = string, TResource extends ClinicalResource<TID> = ClinicalResource<TID>>` interface with methods: `store(resource: TResource, encryptionKeys: Uint8Array, memberId: TID): Promise<TID>`, `retrieve(blockId: TID, decryptionKeys: Uint8Array, memberId: TID): Promise<TResource>`, `update(resource: TResource, encryptionKeys: Uint8Array, memberId: TID): Promise<TID>`, `delete(resourceId: string, memberId: TID): Promise<void>`, `getVersionHistory(resourceId: string): Promise<TID[]>`, `getPoolId(): string`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4_

  - [x] 3.3 Create `brightchart-lib/src/lib/clinical/store/index.ts` barrel export. Update `brightchart-lib/src/lib/clinical/index.ts` to re-export from `./store/index`.
    - _Requirements: 20.2_

- [x] 4. Clinical search interfaces
  - [x] 4.1 Create `brightchart-lib/src/lib/clinical/search/clinicalSearch.ts` defining exported interfaces: `IClinicalSearchParams` (patientId: string required, resourceType: ClinicalResourceType required, dateRange optional with start/end strings, code optional string or ICodeableConcept, status optional string, category optional string or ICodeableConcept, offset optional number, count optional number), `IClinicalSearchResult<TID = string>` (entries: ClinicalResource<TID>[], total: number, offset: number, count: number), and `IClinicalSearchEngine<TID = string>` with methods: `search(params: IClinicalSearchParams, memberId: TID): Promise<IClinicalSearchResult<TID>>`, `indexResource(resource: ClinicalResource<TID>): Promise<void>`, `removeIndex(resourceId: string): Promise<void>`.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 4.2 Create `brightchart-lib/src/lib/clinical/search/index.ts` barrel export. Update `brightchart-lib/src/lib/clinical/index.ts` to re-export from `./search/index`.
    - _Requirements: 20.2_

- [x] 5. Specialty adapter interfaces and predefined profiles
  - [x] 5.1 Create `brightchart-lib/src/lib/clinical/specialty/specialtyTypes.ts` defining exported interfaces: `ITerminologySet` (system, name, version?, codes?), `IResourceExtension` (resourceType: ClinicalResourceType | 'Patient', url, valueType, description), `IValidationResult` (valid: boolean, errors: Array<{field, message, rule}>), `IValidationRule` (resourceType: ClinicalResourceType, field, rule: (value: unknown) => IValidationResult, description), `ISpecialtyProfile` (specialtyCode, displayName, terminologySets, resourceExtensions, validationRules), and `ISpecialtyContext` (profile: ISpecialtyProfile, getTerminologySets(), getExtensionsForResource(resourceType), validateResource(resource): IValidationResult).
    - _Requirements: 10.1, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 5.2 Create `brightchart-lib/src/lib/clinical/specialty/medicalProfile.ts` defining and exporting the `MEDICAL_SPECIALTY_PROFILE: ISpecialtyProfile` constant with terminology sets for SNOMED CT (`http://snomed.info/sct`), ICD-10-CM (`http://hl7.org/fhir/sid/icd-10-cm`), CPT (`http://www.ama-assn.org/go/cpt`), and LOINC (`http://loinc.org`). No resource extensions (standard FHIR fields suffice). Validation rule: `code.coding[].system` must be one of the medical terminology URIs.
    - _Requirements: 10.2_

  - [x] 5.3 Create `brightchart-lib/src/lib/clinical/specialty/dentalProfile.ts` defining and exporting the `DENTAL_SPECIALTY_PROFILE: ISpecialtyProfile` constant with terminology sets for CDT (`http://www.ada.org/cdt`) and ADA Dental (`http://www.ada.org/dental`). Resource extensions: `toothNumber` (valueInteger, ADA universal numbering 1-32) on Procedure and Condition, `surface` (valueCodeableConcept: M, D, O, B, L) on Procedure and Condition, `quadrant` (valueCode: UR, UL, LR, LL) on Procedure and Condition. Validation rules: toothNumber must be 1-32 when present; surface codes must be valid ADA surface codes.
    - _Requirements: 10.2, 10.9_

  - [x] 5.4 Create `brightchart-lib/src/lib/clinical/specialty/veterinaryProfile.ts` defining and exporting the `VETERINARY_SPECIALTY_PROFILE: ISpecialtyProfile` constant with terminology set for VeNom (`http://www.venomcoding.org`). Resource extensions: `species` (valueCodeableConcept, VeNom species codes) on Patient, `breed` (valueCodeableConcept, VeNom breed codes) on Patient, `bodyConditionScore` (valueInteger, 1-9 scale) on Observation. Validation rules: species must be present on Patient resources; bodyConditionScore must be 1-9.
    - _Requirements: 10.2, 10.10_

  - [x] 5.5 Create `brightchart-lib/src/lib/clinical/specialty/index.ts` barrel export re-exporting all specialty types and predefined profiles. Update `brightchart-lib/src/lib/clinical/index.ts` to re-export from `./specialty/index`.
    - _Requirements: 20.2_

- [x] 6. Clinical serializer interfaces
  - [x] 6.1 Create `brightchart-lib/src/lib/clinical/serializer/clinicalSerializer.ts` defining the exported generic `IClinicalSerializer<TResource extends ClinicalResource>` interface with methods: `serialize(resource: TResource): string` and `deserialize(json: string): TResource`. Also define a `IClinicalBundleSerializer` interface with `serialize(bundle: IClinicalExportBundle): string` and `deserialize(json: string): IClinicalExportBundle` for portability bundle serialization.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [x] 6.2 Create `brightchart-lib/src/lib/clinical/serializer/index.ts` barrel export. Update `brightchart-lib/src/lib/clinical/index.ts` to re-export from `./serializer/index`.
    - _Requirements: 20.2_

- [x] 7. Clinical ACL interfaces
  - [x] 7.1 Create `brightchart-lib/src/lib/clinical/access/clinicalAcl.ts` defining: exported `ClinicalPermission` enum with values `ClinicalRead = 'clinical:read'`, `ClinicalWrite = 'clinical:write'`, `ClinicalAdmin = 'clinical:admin'`; exported `IClinicalACL<TID = string>` interface extending `IPoolACL<TID>` (from brightchain-lib) with `clinicalPermissions: Array<{ memberId: TID; permissions: ClinicalPermission[] }>`. Also export a `hasClinicalPermission` function signature: `(acl: IClinicalACL<TID>, memberId: TID, permission: ClinicalPermission) => boolean` that checks clinical-specific permissions and maps ClinicalAdmin to imply ClinicalRead and ClinicalWrite. Also export SMART scope mapping types/constants mapping read scopes → ClinicalRead, create/update/delete scopes → ClinicalWrite, `system/*.*` → ClinicalAdmin.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 7.2 Create `brightchart-lib/src/lib/clinical/access/index.ts` barrel export. Update `brightchart-lib/src/lib/clinical/index.ts` to re-export from `./access/index`.
    - _Requirements: 20.2_

- [x] 8. Clinical audit interfaces
  - [x] 8.1 Create `brightchart-lib/src/lib/clinical/audit/clinicalAudit.ts` defining: exported `ClinicalAuditOperationType` enum with values `Create = 'create'`, `Read = 'read'`, `Update = 'update'`, `Delete = 'delete'`, `Search = 'search'`; exported `IClinicalAuditEntry<TID = string>` interface extending `IAuditLogEntry` (from Module 1) with fields: `resourceType: ClinicalResourceType`, `clinicalResourceId?: string` (undefined for search operations), `searchParams?: IClinicalSearchParams` (present for search operations), `memberId: TID`, `timestamp: Date`, `requestId: string`, `signature: Uint8Array`, `previousEntryBlockId?: TID` (hash-linked chain per resource). Also export an `IClinicalAuditLogger<TID = string>` interface with methods: `logCreate(resourceType, resourceId, memberId): Promise<void>`, `logRead(resourceType, resourceId, memberId): Promise<void>`, `logUpdate(resourceType, resourceId, memberId): Promise<void>`, `logDelete(resourceType, resourceId, memberId): Promise<void>`, `logSearch(resourceType, searchParams, memberId): Promise<void>`.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 8.2 Create `brightchart-lib/src/lib/clinical/audit/index.ts` barrel export. Update `brightchart-lib/src/lib/clinical/index.ts` to re-export from `./audit/index`.
    - _Requirements: 20.2_

- [x] 9. Clinical portability interfaces
  - [x] 9.1 Create `brightchart-lib/src/lib/clinical/portability/clinicalPortability.ts` defining the exported `IClinicalExportBundle<TID = string>` interface extending `IBrightChartExportBundle<TID>` (from Module 1) with fields: `observations: IObservationResource<TID>[]`, `conditions: IConditionResource<TID>[]`, `allergies: IAllergyIntoleranceResource<TID>[]`, `medications: IMedicationResource<TID>[]`, `medicationStatements: IMedicationStatementResource<TID>[]`, `procedures: IProcedureResource<TID>[]`, `specialtyProfile: ISpecialtyProfile`. Also export an `IClinicalImportResult<TID = string>` interface with fields: `success: boolean`, `importedResources: ClinicalResource<TID>[]`, `errors?: IOperationOutcome[]` (for unresolved references or validation failures).
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 9.2 Create `brightchart-lib/src/lib/clinical/portability/index.ts` barrel export. Update `brightchart-lib/src/lib/clinical/index.ts` to re-export from `./portability/index`.
    - _Requirements: 20.2_

- [x] 10. Final brightchart-lib barrel export update
  - [x] 10.1 Verify `brightchart-lib/src/lib/clinical/index.ts` re-exports all sub-modules (datatypes, backboneElements, enumerations, resources, metadata, store, search, specialty, serializer, access, audit, portability). Verify `brightchart-lib/src/index.ts` re-exports from `./lib/clinical/index`. Run `yarn nx run brightchart-lib:build` to confirm the library compiles without errors.
    - _Requirements: 6.4, 20.1, 20.2_

- [x] 11. React clinical components — scaffold brightchart-react-components
  - [x] 11.1 If `brightchart-react-components` does not already exist as an Nx library, generate it using `yarn nx g @nx/react:library brightchart-react-components --directory=brightchart-react-components --bundler=rollup --unitTestRunner=jest` (adjust flags per workspace conventions). Ensure it depends on `brightchart-lib`.
    - _Requirements: 20.5_

  - [x] 11.2 Create `brightchart-react-components/src/lib/clinical/ClinicalTimeline.tsx` implementing the `ClinicalTimeline` component. Props: `patientId: string`, `resources: ClinicalResource<string>[]`, `onSelect: (resource: ClinicalResource<string>) => void`, `filterTypes?: ClinicalResourceType[]`. Behavior: groups resources by date in reverse chronological order, displays resource type label, code display text, effective date, and status per entry. Supports filtering by resource type via filter controls. Emits selected resource via `onSelect`.
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x] 11.3 Create `brightchart-react-components/src/lib/clinical/ObservationEntryForm.tsx` implementing the `ObservationEntryForm` component. Props: `onSubmit: (obs: IObservationResource<string>) => void`, `observation?: IObservationResource<string>` (edit mode), `specialtyProfile?: ISpecialtyProfile`. Renders inputs for category, code (searchable), value (type-appropriate: numeric for quantities, text for strings, boolean toggle), unit, effective date/time, and notes. Displays inline validation errors for missing required fields. Pre-populates fields when `observation` prop is provided.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 11.4 Create `brightchart-react-components/src/lib/clinical/ConditionList.tsx` implementing the `ConditionList` component. Props: `conditions: IConditionResource<string>[]`, `onSelect: (cond: IConditionResource<string>) => void`, `onAdd: () => void`, `specialtyProfile?: ISpecialtyProfile`. Displays condition code text, clinical status, verification status, onset date, severity. Visually distinguishes active from resolved/inactive conditions. Emits selected condition via `onSelect` and fires `onAdd` for new condition creation.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x] 11.5 Create `brightchart-react-components/src/lib/clinical/AllergyList.tsx` implementing the `AllergyList` component. Props: `allergies: IAllergyIntoleranceResource<string>[]`, `onSelect: (allergy: IAllergyIntoleranceResource<string>) => void`, `onAdd: () => void`. Displays allergy code text, clinical status, criticality, type, last occurrence date. Highlights high-criticality allergies with distinct styling. Shows "No Known Allergies" indicator when array is empty. Emits selected allergy via `onSelect` and fires `onAdd` for new allergy creation.
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 11.6 Create `brightchart-react-components/src/lib/clinical/MedicationList.tsx` implementing the `MedicationList` component. Props: `medications: IMedicationStatementResource<string>[]`, `onSelect: (med: IMedicationStatementResource<string>) => void`. Displays medication name (from medicationCodeableConcept), status, effective date range, dosage summary. Visually distinguishes active from completed/stopped medications. Groups medications by status (active, completed, stopped) with collapsible group headers. Emits selected medication via `onSelect`.
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [x] 11.7 Create `brightchart-react-components/src/lib/clinical/index.ts` barrel export re-exporting all five clinical components. Update `brightchart-react-components/src/index.ts` to re-export from `./lib/clinical/index`. Run `yarn nx run brightchart-react-components:build` to confirm the library compiles without errors.
    - _Requirements: 20.5, 20.6_
