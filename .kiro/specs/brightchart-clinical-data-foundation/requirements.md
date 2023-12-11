# Requirements Document: BrightChart Clinical Data Foundation

## Introduction

This module establishes the Clinical Data Foundation for BrightChart — the FHIR R4-compliant clinical resource data layer that all clinical modules (Encounter Management, Clinical Documentation, Orders & Results, Scheduling, Billing/Claims) depend on. It builds directly on the Core Patient Identity (MPI) module, referencing patients via `IPatientResource.id` and extending the same architectural patterns: TID generics, `brightchainMetadata`, BrightChain encrypted pool storage, SMART on FHIR v2 scopes, hashed search indexes, serializer round-trip properties, and the BrightChart open portability standard.

A key differentiator is the Specialty Adapter Layer: BrightChart Medical, BrightChart Dental, and BrightChart Vet are configurations of the same codebase driven by `SpecialtyProfile` configuration objects — not code forks. Each specialty selects its own terminology sets (SNOMED CT / ICD-10-CM / CPT / LOINC for medical, CDT / ADA for dental, VeNom for veterinary), resource extensions, and validation rules.

The implementation spans:
- **brightchart-lib**: Shared FHIR R4 clinical resource interfaces, clinical store interfaces, specialty adapter interfaces, clinical serializers, clinical ACL types, and clinical audit types (browser-compatible)
- **brightchart-react-components**: React UI components for clinical data timeline, observation entry, condition/problem list, allergy list, and medication list

## Glossary

- **Clinical_Resource**: A FHIR R4-compliant data model representing a clinical record (Observation, Condition, AllergyIntolerance, Medication, MedicationStatement, or Procedure) stored as an encrypted block on BrightChain.
- **Clinical_Store**: The BrightChain block store pool dedicated to persisting encrypted Clinical_Resource records, following the Patient_Store pattern from Module 1.
- **Clinical_Serializer**: The component responsible for serializing Clinical_Resource objects to FHIR-compliant JSON and deserializing FHIR JSON back to Clinical_Resource objects, one per resource type.
- **Clinical_Search_Engine**: The component responsible for indexing and querying clinical resource fields using hashed indexes, matching the Patient_Search_Engine pattern.
- **Clinical_ACL**: The pool-level Access Control List governing which BrightChain members may read, write, or administer clinical records, extending the Patient_ACL pattern with clinical-specific permissions.
- **Clinical_Audit_Logger**: The component responsible for recording all clinical data operations as signed, hash-linked audit entries in a dedicated audit pool.
- **Specialty_Profile**: A configuration object that defines terminology sets, resource extensions, and validation rules for a specific healthcare specialty (medical, dental, or veterinary).
- **Specialty_Adapter**: The service that resolves the active Specialty_Profile and applies specialty-specific terminology, extensions, and validation to clinical resources.
- **Observation_Resource**: A FHIR R4 Observation representing measurements, vital signs, lab results, or other clinical findings, linked to a patient and optionally to an encounter.
- **Condition_Resource**: A FHIR R4 Condition representing a clinical problem, diagnosis, or health concern on a patient's problem list.
- **AllergyIntolerance_Resource**: A FHIR R4 AllergyIntolerance representing a patient's allergy or intolerance record.
- **Medication_Resource**: A FHIR R4 Medication representing a medication definition (drug, compound, or product).
- **MedicationStatement_Resource**: A FHIR R4 MedicationStatement representing a record of a medication being taken by a patient.
- **Procedure_Resource**: A FHIR R4 Procedure representing a clinical procedure performed on a patient.
- **Clinical_Component**: A React UI component in brightchart-react-components for displaying, entering, or managing clinical data.
- **Encounter_Reference**: A forward-compatible FHIR Reference to an Encounter resource; the Encounter module is not yet implemented, so references use the standard FHIR Reference type with an optional encounter id.
- **IPatientResource**: The FHIR R4 Patient resource interface from Module 1 (brightchart-lib), used as the patient reference anchor for all clinical resources.

## Requirements

### Requirement 1: FHIR R4 Observation Resource Model

**User Story:** As a developer building clinical modules, I want a FHIR R4-compliant Observation resource data model in brightchart-lib, so that vital signs, lab results, and other clinical measurements share a consistent, standards-based representation.

#### Acceptance Criteria

1. THE Observation_Resource SHALL include the following FHIR R4 Observation fields: identifier (array of IIdentifier), status (ObservationStatus code), category (array of ICodeableConcept), code (ICodeableConcept), subject (IReference to Patient), encounter (IReference to Encounter, optional), effectiveDateTime, effectivePeriod (IPeriod), issued (instant), performer (array of IReference), valueQuantity (IQuantity), valueCodeableConcept (ICodeableConcept), valueString, valueBoolean, valueInteger, valueRange (IRange), valueRatio (IRatio), dataAbsentReason (ICodeableConcept), interpretation (array of ICodeableConcept), note (array of IAnnotation), bodySite (ICodeableConcept), method (ICodeableConcept), referenceRange (array of ObservationReferenceRange), component (array of ObservationComponent), and hasMember (array of IReference).
2. THE Observation_Resource SHALL use the generic TID type parameter (defaulting to string for frontend, Uint8Array for backend) consistent with the IPatientResource TID convention.
3. THE Observation_Resource SHALL include a resourceType field with the fixed value "Observation" conforming to the FHIR R4 resource type system.
4. THE Observation_Resource SHALL include FHIR metadata fields: id, meta (with versionId, lastUpdated, source, profile, security, tag), text (Narrative), and extension (array of Extension).
5. THE Observation_Resource SHALL include a brightchainMetadata field containing blockId (TID), creatorMemberId (TID), createdAt (Date), updatedAt (Date), poolId (string), and encryptionType (BlockEncryptionType), matching the IPatientResource brightchainMetadata structure.
6. WHEN the Observation_Resource references a patient, THE subject field SHALL use the IReference type pointing to a Patient resource, with the reference value matching an IPatientResource.id from Module 1.

### Requirement 2: FHIR R4 Condition Resource Model

**User Story:** As a developer building clinical modules, I want a FHIR R4-compliant Condition resource data model in brightchart-lib, so that diagnoses and problem list entries share a consistent representation.

#### Acceptance Criteria

1. THE Condition_Resource SHALL include the following FHIR R4 Condition fields: identifier (array of IIdentifier), clinicalStatus (ICodeableConcept), verificationStatus (ICodeableConcept), category (array of ICodeableConcept), severity (ICodeableConcept), code (ICodeableConcept), bodySite (array of ICodeableConcept), subject (IReference to Patient), encounter (IReference to Encounter, optional), onsetDateTime, onsetAge (IAge), onsetPeriod (IPeriod), onsetRange (IRange), onsetString, abatementDateTime, abatementAge (IAge), abatementPeriod (IPeriod), abatementRange (IRange), abatementString, recordedDate (dateTime), recorder (IReference), asserter (IReference), stage (array of ConditionStage), and evidence (array of ConditionEvidence).
2. THE Condition_Resource SHALL use the generic TID type parameter consistent with the IPatientResource TID convention.
3. THE Condition_Resource SHALL include a resourceType field with the fixed value "Condition".
4. THE Condition_Resource SHALL include FHIR metadata fields (id, meta, text, extension) and a brightchainMetadata field matching the Observation_Resource pattern.
5. WHEN the Condition_Resource references a patient, THE subject field SHALL use the IReference type pointing to a Patient resource.

### Requirement 3: FHIR R4 AllergyIntolerance Resource Model

**User Story:** As a developer building clinical modules, I want a FHIR R4-compliant AllergyIntolerance resource data model in brightchart-lib, so that allergy and intolerance records share a consistent representation.

#### Acceptance Criteria

1. THE AllergyIntolerance_Resource SHALL include the following FHIR R4 AllergyIntolerance fields: identifier (array of IIdentifier), clinicalStatus (ICodeableConcept), verificationStatus (ICodeableConcept), type (AllergyIntoleranceType code), category (array of AllergyIntoleranceCategory code), criticality (AllergyIntoleranceCriticality code), code (ICodeableConcept), patient (IReference to Patient), encounter (IReference to Encounter, optional), onsetDateTime, onsetAge (IAge), onsetPeriod (IPeriod), onsetRange (IRange), onsetString, recordedDate (dateTime), recorder (IReference), asserter (IReference), lastOccurrence (dateTime), note (array of IAnnotation), and reaction (array of AllergyIntoleranceReaction).
2. THE AllergyIntolerance_Resource SHALL use the generic TID type parameter consistent with the IPatientResource TID convention.
3. THE AllergyIntolerance_Resource SHALL include a resourceType field with the fixed value "AllergyIntolerance".
4. THE AllergyIntolerance_Resource SHALL include FHIR metadata fields and a brightchainMetadata field matching the Observation_Resource pattern.
5. WHEN the AllergyIntolerance_Resource references a patient, THE patient field SHALL use the IReference type pointing to a Patient resource.

### Requirement 4: FHIR R4 Medication and MedicationStatement Resource Models

**User Story:** As a developer building clinical modules, I want FHIR R4-compliant Medication and MedicationStatement resource data models in brightchart-lib, so that medication definitions and patient medication records share a consistent representation.

#### Acceptance Criteria

1. THE Medication_Resource SHALL include the following FHIR R4 Medication fields: identifier (array of IIdentifier), code (ICodeableConcept), status (MedicationStatus code), manufacturer (IReference), form (ICodeableConcept), amount (IRatio), ingredient (array of MedicationIngredient), and batch (MedicationBatch with lotNumber and expirationDate).
2. THE MedicationStatement_Resource SHALL include the following FHIR R4 MedicationStatement fields: identifier (array of IIdentifier), status (MedicationStatementStatus code), statusReason (array of ICodeableConcept), category (ICodeableConcept), medicationCodeableConcept (ICodeableConcept), medicationReference (IReference to Medication), subject (IReference to Patient), context (IReference to Encounter, optional), effectiveDateTime, effectivePeriod (IPeriod), dateAsserted (dateTime), informationSource (IReference), reasonCode (array of ICodeableConcept), reasonReference (array of IReference), note (array of IAnnotation), and dosage (array of IDosage).
3. THE Medication_Resource and MedicationStatement_Resource SHALL use the generic TID type parameter consistent with the IPatientResource TID convention.
4. THE Medication_Resource SHALL include a resourceType field with the fixed value "Medication" and THE MedicationStatement_Resource SHALL include a resourceType field with the fixed value "MedicationStatement".
5. THE Medication_Resource and MedicationStatement_Resource SHALL include FHIR metadata fields and a brightchainMetadata field matching the Observation_Resource pattern.
6. WHEN the MedicationStatement_Resource references a patient, THE subject field SHALL use the IReference type pointing to a Patient resource.

### Requirement 5: FHIR R4 Procedure Resource Model

**User Story:** As a developer building clinical modules, I want a FHIR R4-compliant Procedure resource data model in brightchart-lib, so that clinical procedures share a consistent representation.

#### Acceptance Criteria

1. THE Procedure_Resource SHALL include the following FHIR R4 Procedure fields: identifier (array of IIdentifier), status (ProcedureStatus code), statusReason (ICodeableConcept), category (ICodeableConcept), code (ICodeableConcept), subject (IReference to Patient), encounter (IReference to Encounter, optional), performedDateTime, performedPeriod (IPeriod), performedString, performedAge (IAge), performedRange (IRange), recorder (IReference), asserter (IReference), performer (array of ProcedurePerformer), location (IReference), reasonCode (array of ICodeableConcept), reasonReference (array of IReference), bodySite (array of ICodeableConcept), outcome (ICodeableConcept), report (array of IReference), complication (array of ICodeableConcept), complicationDetail (array of IReference), followUp (array of ICodeableConcept), note (array of IAnnotation), focalDevice (array of ProcedureFocalDevice), and usedCode (array of ICodeableConcept).
2. THE Procedure_Resource SHALL use the generic TID type parameter consistent with the IPatientResource TID convention.
3. THE Procedure_Resource SHALL include a resourceType field with the fixed value "Procedure".
4. THE Procedure_Resource SHALL include FHIR metadata fields and a brightchainMetadata field matching the Observation_Resource pattern.
5. WHEN the Procedure_Resource references a patient, THE subject field SHALL use the IReference type pointing to a Patient resource.


### Requirement 6: FHIR R4 Supporting Datatypes for Clinical Resources

**User Story:** As a developer, I want FHIR R4 complex datatypes required by clinical resources (IQuantity, IRange, IRatio, IAge, IAnnotation, IDosage, and clinical-specific backbone elements) defined in brightchart-lib, so that clinical resource models are complete and type-safe.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define exported TypeScript interfaces for FHIR R4 complex datatypes required by clinical resources: IQuantity, ISimpleQuantity, IRange, IRatio, IAge, IAnnotation, IDosage, IDosageDoseAndRate, ITiming, ITimingRepeat, and ISampledData.
2. THE brightchart-lib library SHALL define exported TypeScript interfaces for clinical resource backbone elements: ObservationReferenceRange, ObservationComponent, ConditionStage, ConditionEvidence, AllergyIntoleranceReaction, MedicationIngredient, MedicationBatch, ProcedurePerformer, and ProcedureFocalDevice.
3. THE brightchart-lib library SHALL define exported enumerations for clinical resource status codes: ObservationStatus, ConditionClinicalStatus, ConditionVerificationStatus, AllergyIntoleranceType, AllergyIntoleranceCategory, AllergyIntoleranceCriticality, AllergyIntoleranceSeverity, MedicationStatus, MedicationStatementStatus, and ProcedureStatus.
4. THE brightchart-lib library SHALL export all clinical datatypes, backbone elements, and enumerations from the src/index.ts barrel export.
5. WHEN a clinical datatype uses the generic TID type parameter, THE datatype SHALL default TID to string, consistent with the existing FHIR datatype convention from Module 1.

### Requirement 7: Clinical Data Store

**User Story:** As a system architect, I want clinical resources stored as encrypted blocks on BrightChain in a dedicated pool, so that clinical data benefits from BrightChain's owner-free, tamper-evident, and redundant storage model while remaining isolated from patient identity data.

#### Acceptance Criteria

1. THE Clinical_Store SHALL define an IClinicalStore interface with CRUD methods: store (accepts a Clinical_Resource and encryption keys, returns a blockId), retrieve (accepts a blockId and decryption keys, returns a Clinical_Resource), update (accepts a Clinical_Resource and encryption keys, links the new version to the previous version's blockId, returns the new blockId), and getVersionHistory (accepts a resource id, returns an ordered array of blockIds).
2. THE Clinical_Store SHALL use a dedicated BrightChain pool (identified by a configurable poolId) for all clinical data blocks, separate from the Patient_Store pool.
3. WHEN a Clinical_Resource is stored, THE Clinical_Store SHALL encrypt the serialized FHIR JSON using the BrightChain ECIES encryption scheme before writing the block.
4. WHEN a Clinical_Resource block is stored, THE Clinical_Store SHALL compute and store a checksum for integrity verification consistent with the existing BrightChain block checksum mechanism.
5. IF a block integrity check fails during retrieval (checksum mismatch), THEN THE Clinical_Store SHALL return an error indicating data corruption and the affected resource id.
6. THE Clinical_Store SHALL store each Clinical_Resource version as a separate block, with the block's metadata linking to the previous version's block id for version history.
7. THE IClinicalStore interface SHALL be generic on TID and on the Clinical_Resource type, enabling a single store interface to serve Observation_Resource, Condition_Resource, AllergyIntolerance_Resource, Medication_Resource, MedicationStatement_Resource, and Procedure_Resource.

### Requirement 8: Clinical Data References

**User Story:** As a developer, I want all clinical resources to reference patients via IPatientResource.id and support forward-compatible Encounter references, so that clinical data is properly linked to patient identities and ready for the Encounter module.

#### Acceptance Criteria

1. WHEN a Clinical_Resource is created, THE Clinical_Store SHALL validate that the patient reference (subject or patient field) contains a valid IPatientResource.id that exists in the Patient_Store.
2. WHEN a Clinical_Resource includes an encounter reference, THE Clinical_Store SHALL accept the reference without validation (forward-compatible), storing the encounter id as a FHIR Reference string.
3. THE Clinical_Resource interfaces SHALL define encounter references using the standard IReference type from Module 1, with the reference field typed as an optional IReference pointing to resource type "Encounter".
4. IF a Clinical_Resource is created with a patient reference that does not exist in the Patient_Store, THEN THE Clinical_Store SHALL return a FHIR OperationOutcome with issue severity "error" and code "not-found" indicating the referenced patient does not exist.

### Requirement 9: Clinical Search and Query

**User Story:** As a healthcare provider, I want to search for clinical resources by patient, date range, code, status, and category, so that I can find relevant clinical data for patient care.

#### Acceptance Criteria

1. THE Clinical_Search_Engine SHALL define an IClinicalSearchParams interface supporting search by: patientId (required), resourceType (required), dateRange (optional start and end dates), code (optional ICodeableConcept or code string), status (optional status code), and category (optional ICodeableConcept or category string).
2. WHEN search parameters are provided, THE Clinical_Search_Engine SHALL return a list of matching Clinical_Resource records ordered by effective date (most recent first).
3. THE Clinical_Search_Engine SHALL maintain a search index of unencrypted field hashes (not plaintext) for patientId, resourceType, effectiveDate, code, status, and category fields, enabling search without decrypting every stored Clinical_Resource block.
4. WHEN search results are returned, THE Clinical_Search_Engine SHALL filter results to include only Clinical_Resource records that the requesting BrightChain_Member has read permission for according to the Clinical_ACL.
5. THE Clinical_Search_Engine SHALL support pagination via offset and count parameters, returning a total count alongside the result page.
6. WHEN a search is performed with only patientId and resourceType, THE Clinical_Search_Engine SHALL return all resources of that type for the patient, ordered by effective date.

### Requirement 10: Specialty Adapter Layer

**User Story:** As a product owner, I want a configuration-driven specialty system so that BrightChart Medical, BrightChart Dental, and BrightChart Vet are configurations of the same codebase rather than code forks, enabling multi-specialty support from a single platform.

#### Acceptance Criteria

1. THE Specialty_Adapter SHALL define an ISpecialtyProfile interface containing: specialtyCode (string identifier), displayName (string), terminologySets (array of ITerminologySet), resourceExtensions (array of IResourceExtension), and validationRules (array of IValidationRule).
2. THE Specialty_Adapter SHALL provide predefined Specialty_Profile configurations for three specialties: Medical (SNOMED CT, ICD-10-CM, CPT, LOINC terminology sets), Dental (CDT codes, ADA dental terminology, dentition-specific extensions), and Veterinary (VeNom codes, species/breed extensions, veterinary-specific observation types).
3. THE ITerminologySet interface SHALL define: system (URI string identifying the code system), name (display name), version (optional version string), and codes (optional array of commonly used codes for validation hints).
4. THE IResourceExtension interface SHALL define: resourceType (the FHIR resource type the extension applies to), url (extension URI), valueType (the FHIR datatype of the extension value), and description (human-readable description).
5. THE IValidationRule interface SHALL define: resourceType (the FHIR resource type the rule applies to), field (the field path the rule validates), rule (a validation function signature accepting a field value and returning a validation result), and description (human-readable description of the rule).
6. WHEN a Clinical_Resource is created or updated, THE Specialty_Adapter SHALL apply the active Specialty_Profile's validation rules to the resource before storage.
7. IF a Clinical_Resource fails specialty-specific validation, THEN THE Specialty_Adapter SHALL return a FHIR OperationOutcome listing all validation errors with their field paths and the applicable validation rule descriptions.
8. THE Specialty_Adapter SHALL define an ISpecialtyContext interface that holds the active Specialty_Profile and provides methods: getTerminologySets(), getExtensionsForResource(resourceType), and validateResource(resource).
9. THE Dental Specialty_Profile SHALL include resource extensions for dentition-specific fields: toothNumber (ADA universal numbering), surface (mesial, distal, occlusal, buccal, lingual), and quadrant.
10. THE Veterinary Specialty_Profile SHALL include resource extensions for species (ICodeableConcept using VeNom species codes) and breed (ICodeableConcept using VeNom breed codes) on the Patient resource, and veterinary-specific observation types (weight by species, body condition score).

### Requirement 11: Clinical Data Serialization

**User Story:** As a developer, I want serializers for each clinical resource type that follow the same round-trip property pattern as PatientSerializer, so that clinical data can be reliably stored on BrightChain and exchanged with external systems.

#### Acceptance Criteria

1. THE Clinical_Serializer SHALL provide a serialize method and a deserialize method for each clinical resource type: Observation_Resource, Condition_Resource, AllergyIntolerance_Resource, Medication_Resource, MedicationStatement_Resource, and Procedure_Resource.
2. WHEN a valid Clinical_Resource object is provided, THE Clinical_Serializer SHALL produce a JSON string conforming to the corresponding FHIR R4 resource schema.
3. WHEN a valid FHIR R4 clinical resource JSON string is provided, THE Clinical_Serializer SHALL parse it into the corresponding Clinical_Resource object with all fields correctly populated.
4. WHEN an invalid JSON string is provided, THE Clinical_Serializer SHALL return a descriptive error indicating the parsing failure location and reason.
5. FOR ALL valid Clinical_Resource objects of each type, serializing then deserializing then serializing SHALL produce byte-identical JSON output (round-trip property).
6. THE Clinical_Serializer SHALL omit fields with undefined or null values from the serialized JSON output, consistent with FHIR R4 serialization rules.
7. WHEN serializing date fields, THE Clinical_Serializer SHALL format dates as FHIR R4 date strings and dateTime fields as FHIR R4 dateTime strings (ISO 8601 with timezone), matching the Patient_Serializer date formatting convention.
8. THE Clinical_Serializer SHALL define a generic IClinicalSerializer interface parameterized on the resource type, enabling a single serializer pattern to be reused across all clinical resource types.

### Requirement 12: Clinical Data ACL

**User Story:** As a healthcare administrator, I want clinical-data-specific access control permissions extending the Patient ACL pattern, so that clinical data access follows the principle of least privilege with granular control over clinical operations.

#### Acceptance Criteria

1. THE Clinical_ACL SHALL define a ClinicalPermission enum with values: ClinicalRead ("clinical:read"), ClinicalWrite ("clinical:write"), and ClinicalAdmin ("clinical:admin").
2. THE Clinical_ACL SHALL define an IClinicalACL interface extending IPoolACL from brightchain-lib, adding the ClinicalPermission levels to the pool's permission model.
3. WHEN a BrightChain_Member attempts any clinical data operation (create, read, update, delete, search), THE Clinical_Store SHALL verify the member's permissions against the Clinical_ACL before executing the operation.
4. IF a BrightChain_Member lacks the required ClinicalPermission for a requested operation, THEN THE Clinical_Store SHALL return a FHIR OperationOutcome with issue severity "error", code "security", and HTTP status 403.
5. THE Clinical_ACL SHALL integrate with the existing SMART on FHIR v2 scope system from Module 1, mapping ClinicalRead to read scopes on clinical resource types, ClinicalWrite to create/update/delete scopes, and ClinicalAdmin to all scopes.
6. WHEN a BrightChain_Member with ClinicalAdmin permission modifies the Clinical_ACL, THE Clinical_Store SHALL create a new signed ACL version linked to the previous version, consistent with the Patient_ACL versioning pattern.

### Requirement 13: Clinical Audit Trail

**User Story:** As a compliance officer, I want a complete audit trail of all clinical data operations, so that the organization can demonstrate regulatory compliance and investigate clinical data access patterns.

#### Acceptance Criteria

1. WHEN any operation (create, read, update, delete, search) is performed on a Clinical_Resource, THE Clinical_Audit_Logger SHALL create an audit entry containing: operation type, resource type, resource id (or search parameters for search operations), the BrightChain_Member id who performed the operation, a timestamp, the request id, and a cryptographic signature from the operating member's ECIES key.
2. THE Clinical_Audit_Logger SHALL store audit entries as encrypted blocks in the existing audit pool from Module 1, extending the audit pool to cover clinical operations alongside patient identity operations.
3. WHEN a clinical audit entry is created, THE Clinical_Audit_Logger SHALL include the previous audit entry block id for the same resource, forming a hash-linked chain of audit events per clinical resource.
4. THE clinical audit entries SHALL be append-only; THE Clinical_Audit_Logger SHALL provide no mechanism to modify or delete existing audit entries.
5. WHEN clinical audit entries are queried, THE Clinical_Audit_Logger SHALL require ClinicalAdmin permission on the Clinical_ACL for the requesting BrightChain_Member.
6. THE Clinical_Audit_Logger SHALL define an IClinicalAuditEntry interface extending the IAuditLogEntry interface from Module 1, adding resourceType and clinicalResourceId fields.


### Requirement 14: Portability Standard Extension for Clinical Data

**User Story:** As a practice administrator, I want the BrightChart open portability standard extended to include clinical data export and import specifications, so that medical practices, dental offices, and veterinary clinics can perform full-fidelity data migration.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an IClinicalExportBundle interface extending IBrightChartExportBundle from Module 1, adding: observations (array of Observation_Resource), conditions (array of Condition_Resource), allergies (array of AllergyIntolerance_Resource), medications (array of Medication_Resource), medicationStatements (array of MedicationStatement_Resource), procedures (array of Procedure_Resource), and specialtyProfile (Specialty_Profile identifying the source specialty).
2. THE IClinicalExportBundle SHALL preserve all patient-to-clinical-resource references so that imported clinical data correctly links to imported patient records.
3. WHEN a clinical export is generated, THE export service SHALL include all clinical resources for the specified patients, maintaining referential integrity between patients and clinical resources.
4. WHEN a clinical import is processed, THE import service SHALL validate that all patient references in clinical resources resolve to patients in the import bundle or in the existing Patient_Store.
5. IF a clinical import contains a clinical resource referencing a patient not found in the import bundle or Patient_Store, THEN THE import service SHALL return a FHIR OperationOutcome listing the unresolved patient references.
6. THE Clinical_Serializer SHALL support serializing and deserializing IClinicalExportBundle objects, with the round-trip property: serialize then deserialize then serialize produces byte-identical JSON output.
7. THE portability standard extension SHALL support clinical data from all three specialties (medical, dental, veterinary), including specialty-specific extensions and terminology codes.

### Requirement 15: Clinical Data Timeline Component

**User Story:** As a frontend developer, I want a React component that displays a chronological timeline of all clinical data for a patient, so that clinicians can see a comprehensive clinical summary at a glance.

#### Acceptance Criteria

1. THE Clinical_Component library SHALL provide a ClinicalTimeline component that accepts a patientId and an array of Clinical_Resource objects (observations, conditions, allergies, medications, procedures) and renders them in reverse chronological order.
2. WHEN the ClinicalTimeline receives clinical resources, THE ClinicalTimeline SHALL group resources by date and display each group with a date header.
3. THE ClinicalTimeline SHALL display each resource entry with: resource type icon or label, the resource code display text, the effective date, and the status.
4. WHEN a ClinicalTimeline entry is selected, THE ClinicalTimeline SHALL emit the selected Clinical_Resource via an onSelect callback prop.
5. THE ClinicalTimeline SHALL support filtering by resource type via a filter control, allowing the user to show or hide specific resource types.
6. THE ClinicalTimeline SHALL use the Clinical_Resource interfaces from brightchart-lib as the data contract, with TID defaulted to string for frontend use.

### Requirement 16: Observation Entry Form Component

**User Story:** As a frontend developer, I want a React component for entering observations (vital signs, lab results), so that clinicians can record clinical measurements through the UI.

#### Acceptance Criteria

1. THE Clinical_Component library SHALL provide an ObservationEntryForm component that renders input fields for: category (selectable from a list), code (searchable code input), value (with type-appropriate input: numeric for quantities, text for strings, boolean toggle), unit (for quantity values), effective date/time, and optional notes.
2. WHEN the ObservationEntryForm is submitted with valid data, THE ObservationEntryForm SHALL emit a complete Observation_Resource object via an onSubmit callback prop.
3. WHEN the ObservationEntryForm receives invalid input (missing required fields or invalid value types), THE ObservationEntryForm SHALL display validation errors inline next to the affected fields.
4. THE ObservationEntryForm SHALL accept an optional Observation_Resource prop for edit mode, pre-populating all fields from the existing observation.
5. THE ObservationEntryForm SHALL accept a Specialty_Profile prop to determine which terminology codes are available in the code selector and which category options are displayed.

### Requirement 17: Condition/Problem List Component

**User Story:** As a frontend developer, I want a React component for displaying and managing a patient's condition/problem list, so that clinicians can view, add, and update diagnoses.

#### Acceptance Criteria

1. THE Clinical_Component library SHALL provide a ConditionList component that accepts an array of Condition_Resource objects and displays them as a list showing: condition code display text, clinical status, verification status, onset date, and severity.
2. THE ConditionList SHALL visually distinguish active conditions from resolved or inactive conditions using color or styling.
3. WHEN a ConditionList entry is selected, THE ConditionList SHALL emit the selected Condition_Resource via an onSelect callback prop.
4. THE ConditionList SHALL provide an onAdd callback prop that fires when the user initiates adding a new condition.
5. THE ConditionList SHALL accept a Specialty_Profile prop to determine which terminology codes are displayed for condition codes.

### Requirement 18: Allergy List Component

**User Story:** As a frontend developer, I want a React component for displaying and managing a patient's allergy list, so that clinicians can view allergy and intolerance records.

#### Acceptance Criteria

1. THE Clinical_Component library SHALL provide an AllergyList component that accepts an array of AllergyIntolerance_Resource objects and displays them as a list showing: allergy code display text, clinical status, criticality, type (allergy or intolerance), and last occurrence date.
2. THE AllergyList SHALL visually highlight high-criticality allergies using a distinct color or icon.
3. WHEN an AllergyList entry is selected, THE AllergyList SHALL emit the selected AllergyIntolerance_Resource via an onSelect callback prop.
4. THE AllergyList SHALL provide an onAdd callback prop that fires when the user initiates adding a new allergy record.
5. WHEN the AllergyList receives an empty array, THE AllergyList SHALL display a "No Known Allergies" indicator.

### Requirement 19: Medication List Component

**User Story:** As a frontend developer, I want a React component for displaying a patient's medication list, so that clinicians can view current and past medications.

#### Acceptance Criteria

1. THE Clinical_Component library SHALL provide a MedicationList component that accepts an array of MedicationStatement_Resource objects and displays them as a list showing: medication name (from medicationCodeableConcept or referenced Medication_Resource), status, effective date range, and dosage summary.
2. THE MedicationList SHALL visually distinguish active medications from completed or stopped medications using color or styling.
3. WHEN a MedicationList entry is selected, THE MedicationList SHALL emit the selected MedicationStatement_Resource via an onSelect callback prop.
4. THE MedicationList SHALL support grouping medications by status (active, completed, stopped) with collapsible group headers.
5. THE MedicationList SHALL use the MedicationStatement_Resource and Medication_Resource interfaces from brightchart-lib as the data contract, with TID defaulted to string.

### Requirement 20: Library Structure and Extensibility

**User Story:** As a developer building future EHR modules, I want the clinical data interfaces in brightchart-lib to follow established workspace conventions and be designed for extensibility, so that Encounter Management, Clinical Documentation, Orders, and other modules can reference clinical data without tight coupling.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL organize clinical resource interfaces under a src/lib/clinical/ directory, separate from the existing src/lib/fhir/ patient resource directory.
2. THE brightchart-lib library SHALL export all clinical resource interfaces, clinical datatype interfaces, clinical store interfaces, clinical serializer interfaces, clinical ACL types, clinical audit types, specialty adapter interfaces, and portability extension types from the src/index.ts barrel export.
3. THE clinical resource interfaces SHALL declare brightchart-lib's existing FHIR datatype interfaces (ICodeableConcept, IReference, IIdentifier, IMeta, INarrative, IExtension, IPeriod) as dependencies, reusing them rather than redefining them.
4. THE clinical resource interfaces SHALL include a generic extension point (extension array typed as FHIR Extension) that future modules can use to attach encounter references, order references, or documentation links without modifying the core clinical resource interfaces.
5. THE brightchart-react-components library SHALL organize clinical UI components under a src/lib/clinical/ directory, separate from the existing patient identity components.
6. THE brightchart-react-components library SHALL export all clinical UI components from the src/index.ts barrel export.

### Requirement 21: Zero-Knowledge Selective Disclosure for Clinical Data

**User Story:** As a patient, I want to prove specific clinical facts (e.g., vaccination status, insurance eligibility) to third parties without exposing my full medical history, so that my privacy is preserved during verification workflows.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an ISelectiveDisclosure interface with methods: createProof(patientId: string, claims: DisclosureClaim[], signerKeys: Uint8Array): Promise<IDisclosureProof>, and verifyProof(proof: IDisclosureProof, verifierKeys: Uint8Array): Promise<IDisclosureVerificationResult>.
2. THE DisclosureClaim type SHALL define a claim as a tuple of (resourceType: ClinicalResourceType, field: string, predicate: 'exists' | 'equals' | 'greaterThan' | 'before' | 'after', value?: string), enabling claims like "patient has an active AllergyIntolerance" or "patient has a Procedure with code X performed before date Y".
3. THE IDisclosureProof SHALL contain: the claims being proven, a cryptographic proof blob, the prover's member id, a timestamp, and an expiration time — but SHALL NOT contain the underlying clinical resource data.
4. WHEN a valid IDisclosureProof is submitted for verification, THE verifyProof method SHALL return a result indicating whether each claim is confirmed or denied, without revealing any clinical data beyond the claim predicates.
5. THE ISelectiveDisclosure interface SHALL be designed as an extension point — the initial implementation may use signed attestations from the patient's ECIES keys, with a migration path to full zero-knowledge proof schemes (e.g., zk-SNARKs) in a future module.
6. THE IDisclosureProof SHALL include a revocation mechanism: the patient SHALL be able to invalidate a previously issued proof by publishing a revocation entry to the audit pool.
