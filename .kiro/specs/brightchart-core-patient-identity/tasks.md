# Implementation Tasks: BrightChart Core Patient Identity (MPI)

## Task 1: Scaffold brightchart-lib Library
- [x] 1.1 Create `brightchart-lib/project.json` following the brightchain-lib pattern: `@nx/js:tsc` executor, `@brightchain/` npm scope, `type:lib` tag, build/lint/test targets, output to `dist/brightchart-lib`
- [x] 1.2 Create `brightchart-lib/package.json` with name `@brightchain/brightchart-lib`, version `0.0.1`, and `@brightchain/brightchain-lib` as a peer dependency
- [x] 1.3 Create `brightchart-lib/tsconfig.json`, `brightchart-lib/tsconfig.lib.json`, and `brightchart-lib/tsconfig.spec.json` following the brightchain-lib TypeScript configuration pattern with strict mode enabled
- [x] 1.4 Create `brightchart-lib/jest.config.ts` following the brightchain-lib Jest configuration pattern
- [x] 1.5 Create `brightchart-lib/src/index.ts` barrel export file (initially empty, will be populated as modules are added)
- [x] 1.6 Verify the library builds and lints cleanly with `npx nx build brightchart-lib` and `npx nx lint brightchart-lib`

> **Requirement references**: Req 9 (AC 1, 2, 3, 5)

## Task 2: FHIR R4 Base Datatypes
- [x] 2.1 Create `brightchart-lib/src/lib/fhir/datatypes.ts` defining exported TypeScript interfaces for FHIR R4 complex datatypes: `IHumanName`, `IAddress`, `IContactPoint`, `ICodeableConcept`, `ICoding`, `IIdentifier`, `IReference`, `INarrative`, `IExtension`, `IPeriod`, `IMeta`, `IPatientContact`, `IPatientCommunication`, `IPatientLink` — all generic on `<TID = string>` where applicable
- [x] 2.2 Create `brightchart-lib/src/lib/fhir/enumerations.ts` defining FHIR R4 code enums: `AdministrativeGender`, `NameUse`, `AddressUse`, `AddressType`, `ContactPointSystem`, `ContactPointUse`, `NarrativeStatus`, `LinkType`, `IdentifierUse`
- [x] 2.3 Create `brightchart-lib/src/lib/fhir/operationOutcome.ts` defining `IOperationOutcome`, `IOperationOutcomeIssue` with severity and code fields per FHIR R4
- [x] 2.4 Create `brightchart-lib/src/lib/fhir/index.ts` barrel export and add to `src/index.ts`
- [x] 2.5 Write property-based tests in `brightchart-lib/src/lib/fhir/__tests__/datatypes.property.spec.ts` verifying: (a) all FHIR datatype interfaces can be instantiated with arbitrary valid data, (b) enum values are exhaustive and non-overlapping

> **Requirement references**: Req 1 (AC 5), Req 9 (AC 2)
> **Correctness properties**: FHIR datatype interfaces accept all valid FHIR R4 field combinations; enum values cover the FHIR R4 required value sets

## Task 3: FHIR R4 Patient Resource Model
- [x] 3.1 Create `brightchart-lib/src/lib/fhir/patientResource.ts` defining `IPatientResource<TID = string>` with all FHIR R4 Patient fields (identifier, active, name, telecom, gender, birthDate, deceasedBoolean, deceasedDateTime, address, maritalStatus, multipleBirthBoolean, multipleBirthInteger, contact, communication, generalPractitioner, managingOrganization, link), plus `resourceType: 'Patient'`, FHIR metadata fields (id, meta, text, extension), and `brightchainMetadata` (blockId, creatorMemberId, createdAt, updatedAt, poolId, encryptionType using `BlockEncryptionType` from brightchain-lib)
- [x] 3.2 Create `brightchart-lib/src/lib/fhir/patientIdentifier.ts` defining `IPatientIdentifier` extending `IIdentifier` with system URI and value tuple
- [x] 3.3 Export `IPatientResource` and `IPatientIdentifier` from `src/lib/fhir/index.ts` and `src/index.ts`
- [x] 3.4 Write property-based tests in `brightchart-lib/src/lib/fhir/__tests__/patientResource.property.spec.ts` verifying: (a) `IPatientResource` always has `resourceType === 'Patient'`, (b) the TID generic defaults to string and accepts Uint8Array, (c) brightchainMetadata fields are present alongside FHIR fields

> **Requirement references**: Req 1 (AC 1, 2, 3, 4, 6), Req 9 (AC 4)
> **Correctness properties**: Patient resource always carries resourceType 'Patient'; TID parameterization is consistent across all ID fields; brightchainMetadata coexists with standard FHIR fields without collision

## Task 4: Patient Serializer
- [x] 4.1 Create `brightchart-lib/src/lib/fhir/patientSerializer.ts` implementing `IPatientSerializer` interface with `serialize(patient: IPatientResource): string` and `deserialize(json: string): IPatientResource` methods
- [x] 4.2 Implement serialization logic: omit undefined/null fields, format date fields as FHIR R4 date strings (YYYY, YYYY-MM, YYYY-MM-DD), format dateTime fields as ISO 8601 with timezone, preserve unrecognized fields in extensions
- [x] 4.3 Implement deserialization logic: parse JSON, validate required fields, reconstruct Date objects from FHIR date strings, return descriptive errors for invalid JSON with failure location
- [x] 4.4 Export from `src/index.ts`
- [x] 4.5 Write property-based tests in `brightchart-lib/src/lib/fhir/__tests__/patientSerializer.property.spec.ts` verifying: (a) round-trip property: serialize → deserialize → serialize produces byte-identical JSON, (b) null/undefined fields are omitted from output, (c) unrecognized fields are preserved in extensions, (d) invalid JSON produces descriptive errors, (e) date formatting conforms to FHIR R4 patterns

> **Requirement references**: Req 2 (AC 1–7)
> **Correctness properties**: Round-trip serialization is idempotent (serialize∘deserialize∘serialize = serialize); null/undefined omission is total; date formatting matches FHIR R4 regex patterns

## Task 5: Healthcare Role Layer
- [x] 5.1 Create `brightchart-lib/src/lib/roles/healthcareRole.ts` defining `IHealthcareRole<TID = string>` interface with fields: roleCode (SNOMED CT string), roleDisplay (string), specialty (CodeableConcept), organization (Reference), practitioner (Reference), and period (Period) — following FHIR PractitionerRole structure
- [x] 5.2 Create `brightchart-lib/src/lib/roles/healthcareRoleCodes.ts` defining constants for key SNOMED CT role codes: `PHYSICIAN = '309343006'`, `REGISTERED_NURSE = '224535009'`, `MEDICAL_ASSISTANT = '309453006'`, `PATIENT = '116154003'`, `ADMIN = '394572006'`, `DENTIST = '106289002'`, `VETERINARIAN = '106290006'`
- [x] 5.3 Create `brightchart-lib/src/lib/roles/index.ts` barrel export and add to `src/index.ts`
- [x] 5.4 Write unit tests in `brightchart-lib/src/lib/roles/__tests__/healthcareRole.spec.ts` verifying role code constants match expected SNOMED CT values and IHealthcareRole interface can be instantiated for each role type

> **Requirement references**: Design (Healthcare Role Layer, FHIR PractitionerRole + SNOMED CT)
> **Correctness properties**: Role codes are valid SNOMED CT identifiers; role hierarchy covers medical, dental, and veterinary practitioners

## Task 6: SMART on FHIR v2 Scopes
- [x] 6.1 Create `brightchart-lib/src/lib/scopes/smartScopes.ts` defining `SmartScope` type following SMART v2 syntax (`context/ResourceType.cruds`), `ScopeContext` enum (`patient`, `user`, `system`), `ScopeAction` enum (`c`, `r`, `u`, `d`, `s`), and `ISmartScopeDefinition` interface
- [x] 6.2 Create `brightchart-lib/src/lib/scopes/scopeParser.ts` implementing `parseScope(scopeString: string): ISmartScopeDefinition` and `formatScope(scope: ISmartScopeDefinition): string` functions
- [x] 6.3 Create `brightchart-lib/src/lib/scopes/scopeEvaluator.ts` implementing `evaluateScope(memberScopes: SmartScope[], requiredContext: ScopeContext, resourceType: string, action: ScopeAction): boolean`
- [x] 6.4 Create `brightchart-lib/src/lib/scopes/index.ts` barrel export and add to `src/index.ts`
- [x] 6.5 Write property-based tests in `brightchart-lib/src/lib/scopes/__tests__/smartScopes.property.spec.ts` verifying: (a) parseScope∘formatScope round-trip is identity, (b) scope evaluation grants access only when context, resource type, and action all match, (c) `system/*.*` scope grants universal access, (d) a scope with no matching action denies access

> **Requirement references**: Design (SMART on FHIR v2 scopes), Req 7 (AC 1, 2)
> **Correctness properties**: Scope parsing is invertible; scope evaluation is monotonic (adding scopes never reduces access); empty scope set denies all access

## Task 7: Patient ACL Service
- [x] 7.1 Create `brightchart-lib/src/lib/access/patientAcl.ts` defining `IPatientACL<TID = string>` extending `IPoolACL<TID>` from brightchain-lib, adding healthcare-specific permission levels: `PatientPermission` enum with values `Read = 'patient:read'`, `Write = 'patient:write'`, `Merge = 'patient:merge'`, `Search = 'patient:search'`, `Admin = 'patient:admin'`
- [x] 7.2 Create `brightchart-lib/src/lib/access/patientAclEvaluator.ts` implementing `evaluatePatientAccess(acl: IPatientACL, memberId: TID, requiredPermission: PatientPermission): boolean` that checks member permissions against the ACL
- [x] 7.3 Create `brightchart-lib/src/lib/access/index.ts` barrel export and add to `src/index.ts`
- [x] 7.4 Write property-based tests in `brightchart-lib/src/lib/access/__tests__/patientAcl.property.spec.ts` verifying: (a) a member with Admin permission passes all permission checks, (b) a member without a specific permission is denied, (c) ACL with no members denies all access, (d) permission evaluation is deterministic for the same inputs

> **Requirement references**: Req 7 (AC 1–3)
> **Correctness properties**: Admin permission implies all other permissions; permission check is deterministic; empty ACL denies all

## Task 8: MPI Service Interfaces
- [x] 8.1 Create `brightchart-lib/src/lib/mpi/mpiService.ts` defining `IMPIService<TID = string>` interface with methods: `createPatient(patient: IPatientResource<TID>, memberId: TID): Promise<IPatientResource<TID>>`, `getPatient(id: string, memberId: TID): Promise<IPatientResource<TID> | IOperationOutcome>`, `updatePatient(patient: IPatientResource<TID>, memberId: TID): Promise<IPatientResource<TID> | IOperationOutcome>`, `deletePatient(id: string, memberId: TID): Promise<IPatientResource<TID> | IOperationOutcome>`, `searchPatients(params: IPatientSearchParams, memberId: TID): Promise<IPatientSearchResult<TID>>`, `findDuplicates(patient: IPatientResource<TID>, memberId: TID): Promise<IMatchCandidate<TID>[]>`, `mergePatients(sourceId: string, targetId: string, memberId: TID): Promise<IMergeResult<TID> | IOperationOutcome>`
- [x] 8.2 Create `brightchart-lib/src/lib/mpi/searchTypes.ts` defining `IPatientSearchParams` (family, given, birthDate, gender, identifier, telecom, address fields), `IPatientSearchResult<TID>` (entries array, total count), `IMatchCandidate<TID>` (patient, matchScore, matchClassification), `MatchClassification` enum (`Certain`, `Probable`, `Possible`, `Unlikely`)
- [x] 8.3 Create `brightchart-lib/src/lib/mpi/mergeTypes.ts` defining `IMergeResult<TID>` (survivingPatient, mergeRecord), `IMergeRecord<TID>` (sourceId, targetId, authorizedBy, timestamp, combinedFields, signature)
- [x] 8.4 Create `brightchart-lib/src/lib/mpi/index.ts` barrel export and add to `src/index.ts`

> **Requirement references**: Req 3 (AC 1–7), Req 4 (AC 1–7), Req 5 (AC 1–6), Req 9 (AC 2)

## Task 9: Audit Log Interfaces
- [x] 9.1 Create `brightchart-lib/src/lib/audit/auditLog.ts` defining `IAuditLogEntry<TID = string>` with fields: operationType (AuditOperationType enum: Create, Read, Update, Delete, Search, Merge), patientId (string, optional for search), searchParams (IPatientSearchParams, optional), memberId (TID), timestamp (Date), requestId (string), signature (Uint8Array), previousEntryBlockId (TID, optional for chain linking)
- [x] 9.2 Create `brightchart-lib/src/lib/audit/index.ts` barrel export and add to `src/index.ts`

> **Requirement references**: Req 8 (AC 1, 3, 4)

## Task 10: Patient Store Interface
- [x] 10.1 Create `brightchart-lib/src/lib/stores/patientStore.ts` defining `IPatientStore<TID = string>` interface with methods: `store(patient: IPatientResource<TID>, encryptionKeys: Uint8Array): Promise<TID>` (returns blockId), `retrieve(blockId: TID, decryptionKeys: Uint8Array): Promise<IPatientResource<TID>>`, `getVersionHistory(patientId: string): Promise<TID[]>`, `getPoolId(): string`
- [x] 10.2 Create `brightchart-lib/src/lib/stores/patientSearchIndex.ts` defining `IPatientSearchIndex<TID = string>` interface with methods: `indexPatient(patient: IPatientResource<TID>): Promise<void>`, `search(params: IPatientSearchParams): Promise<Array<{patientId: string, blockId: TID}>>`, `removeIndex(patientId: string): Promise<void>`
- [x] 10.3 Create `brightchart-lib/src/lib/stores/index.ts` barrel export and add to `src/index.ts`

> **Requirement references**: Req 6 (AC 1–3), Req 4 (AC 6)

## Task 11: Portability Standard Types
- [x] 11.1 Create `brightchart-lib/src/lib/portability/portabilityTypes.ts` defining `IBrightChartExportBundle<TID = string>` with fields: version (string), exportDate (Date), sourceSystem (string), patients (IPatientResource<TID>[]), auditTrail (IAuditLogEntry<TID>[]), accessPolicies (IPatientACL<TID>[]), roles (IHealthcareRole<TID>[]), metadata (key-value map)
- [x] 11.2 Create `brightchart-lib/src/lib/portability/index.ts` barrel export and add to `src/index.ts`

> **Requirement references**: Design (Open portability standard)

## Task 12: Open Standard Specification Document
- [x] 12.1 Create `docs/papers/brightchart-open-standard.md` — a formal specification document for the BrightChart Patient Records Portability Standard covering: purpose and scope (medical, dental, veterinary), data model (FHIR R4 Patient resource with BrightChain extensions), export bundle format (JSON structure matching IBrightChartExportBundle), import/export procedures, access policy portability, audit trail portability, role definitions portability, encryption and key exchange requirements, versioning and backward compatibility, and conformance criteria
- [x] 12.2 Include sections on interoperability with Epic (FHIR R4 USCDI APIs, C-CDA), 21st Century Cures Act compliance, and multi-specialty support (medical, dental, veterinary)

> **Requirement references**: Design (Open portability standard), user request (portability, dentists, veterinarians)

## Task 13: Scaffold brightchart-react-components Library
- [x] 13.1 Create `brightchart-react-components/project.json` following the brightchain-react-components pattern: `@nx/js:tsc` executor, implicit dependency on `brightchart-lib`, build/lint/test targets
- [x] 13.2 Create `brightchart-react-components/package.json` with name `@brightchain/brightchart-react-components`, peer dependencies on React and `@brightchain/brightchart-lib`
- [x] 13.3 Create `brightchart-react-components/tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json` following the brightchain-react-components pattern with JSX support
- [x] 13.4 Create `brightchart-react-components/jest.config.cts` following the brightchain-react-components Jest pattern
- [x] 13.5 Create `brightchart-react-components/src/index.ts` barrel export
- [x] 13.6 Verify the library builds and lints cleanly

> **Requirement references**: Req 9 (AC 6)

## Task 14: PatientSearchForm Component
- [x] 14.1 Create `brightchart-react-components/src/lib/PatientSearchForm/PatientSearchForm.tsx` — a React component accepting search parameters (name, birthDate, gender, identifier) via form inputs, with an `onSearch` callback prop and an `onResults` callback prop
- [x] 14.2 Implement search results display as a list showing each patient's primary name, birthDate, gender, and primary identifier
- [x] 14.3 Implement match classification visual indicators (badge/tag) for results that include a Match_Score: "certain" (green), "probable" (yellow), "possible" (orange)
- [x] 14.4 Export from `src/index.ts`
- [x] 14.5 Write tests in `brightchart-react-components/src/lib/PatientSearchForm/__tests__/PatientSearchForm.spec.tsx` verifying: (a) form renders all search fields, (b) onSearch callback fires with correct params, (c) results list renders patient data, (d) match classification badges render correctly

> **Requirement references**: Req 10 (AC 1, 4, 5)

## Task 15: PatientDemographicsCard Component
- [x] 15.1 Create `brightchart-react-components/src/lib/PatientDemographicsCard/PatientDemographicsCard.tsx` — a React component accepting `IPatientResource<string>` and displaying name, birthDate, gender, identifiers, address, and telecom in a read-only summary card
- [x] 15.2 Export from `src/index.ts`
- [x] 15.3 Write tests in `brightchart-react-components/src/lib/PatientDemographicsCard/__tests__/PatientDemographicsCard.spec.tsx` verifying: (a) all demographic fields render, (b) multiple identifiers display, (c) component handles missing optional fields gracefully

> **Requirement references**: Req 10 (AC 2, 6)

## Task 16: PatientCreateEditForm Component
- [x] 16.1 Create `brightchart-react-components/src/lib/PatientCreateEditForm/PatientCreateEditForm.tsx` — a React component rendering input fields for all required Patient_Resource demographic fields, with FHIR R4 constraint validation and an `onSubmit` callback emitting the completed `IPatientResource<string>`
- [x] 16.2 Implement field validation: required fields (family name, gender, birthDate), date format validation, identifier system URI format validation
- [x] 16.3 Support both create mode (empty form) and edit mode (pre-populated from existing IPatientResource)
- [x] 16.4 Export from `src/index.ts`
- [x] 16.5 Write tests in `brightchart-react-components/src/lib/PatientCreateEditForm/__tests__/PatientCreateEditForm.spec.tsx` verifying: (a) form renders all required fields, (b) validation errors display for invalid input, (c) onSubmit fires with valid IPatientResource, (d) edit mode pre-populates fields

> **Requirement references**: Req 10 (AC 3, 6)

## Task 17: Offline Cache Interface
- [x] 17.1 Create `brightchart-lib/src/lib/offline/offlineCache.ts` defining `IOfflineCache<TID = string>` interface with methods: `cachePatient(patient: IPatientResource<TID>, encryptionKeys: Uint8Array): Promise<void>`, `getCachedPatient(id: string, decryptionKeys: Uint8Array): Promise<IPatientResource<TID> | null>`, `listCachedPatientIds(): Promise<string[]>`, `clearCache(): Promise<void>`, and `getLastSynced(patientId: string): Promise<Date | null>`
- [x] 17.2 Create `brightchart-lib/src/lib/offline/syncTypes.ts` defining `ISyncResult<TID = string>` with fields: syncedPatientIds (string[]), conflicts (array of {patientId, localVersionId, remoteVersionId}), timestamp (Date); and `ISyncStrategy` interface with method `resolveConflict(local: IPatientResource<TID>, remote: IPatientResource<TID>): IPatientResource<TID>`
- [x] 17.3 Create `brightchart-lib/src/lib/offline/index.ts` barrel export and add to `src/index.ts`
- [x] 17.4 Write unit tests in `brightchart-lib/src/lib/offline/__tests__/offlineCache.spec.ts` verifying: (a) IOfflineCache interface can be implemented with all required methods, (b) ISyncResult captures conflict metadata, (c) lastSynced timestamp is tracked per patient

> **Requirement references**: Req 11 (AC 1–6)
