# Requirements Document: BrightChart Core Patient Identity (MPI)

## Introduction

This module establishes the Core Patient Identity layer for BrightChart — a modular Electronic Health Records (EHR) system built on the BrightChain distributed platform. It implements a Master Patient Index (MPI) providing FHIR R4-compliant Patient resource modeling, decentralized patient identity storage on BrightChain (encrypted, owner-free), patient search and matching logic, basic CRUD operations, and access control via BrightChain member pools and ACLs.

This is the first module of the BrightChart EHR system. All interfaces are designed for extensibility so that future modules (Clinical Data Foundation, Encounter Management, Clinical Documentation, Orders & Results, Scheduling, Billing/Claims) can reference patient identities established here.

The implementation spans two new libraries following existing workspace conventions:
- **brightchart-lib**: Shared interfaces and types (browser-compatible, used by both frontend and backend)
- **brightchart-react-components**: React UI components for patient identity management

## Glossary

- **MPI_Service**: The Master Patient Index service responsible for patient creation, retrieval, search, matching, and merge operations.
- **Patient_Resource**: A FHIR R4-compliant data model representing a patient's demographic and identifying information, stored as an encrypted block on BrightChain.
- **FHIR_R4**: Fast Healthcare Interoperability Resources Release 4 — the HL7 standard for healthcare data exchange used as the canonical data model.
- **Patient_Store**: The BrightChain block store pool dedicated to persisting encrypted Patient_Resource records.
- **Patient_ACL**: The pool-level Access Control List governing which BrightChain members may read, write, or administer patient records.
- **Patient_Serializer**: The component responsible for serializing Patient_Resource objects to FHIR-compliant JSON and deserializing FHIR JSON back to Patient_Resource objects.
- **Patient_Search_Engine**: The component responsible for indexing and querying patient demographic fields for search and matching operations.
- **Match_Score**: A numeric similarity score (0.0 to 1.0) computed by the Patient_Search_Engine when comparing two patient records for potential duplicates.
- **Merge_Record**: An auditable record documenting the merge of two Patient_Resource records into a single surviving record, with a link chain to the superseded record.
- **BrightChain_Member**: An authenticated user in the BrightChain platform with ECIES keys, identified by a MemberType (User, Admin, System, Service) and JWT credentials.
- **Patient_Identifier**: A typed identifier tuple (system URI + value) conforming to the FHIR Identifier datatype, used for MRNs, SSNs, driver's licenses, and other external identifiers.
- **Audit_Log_Entry**: A timestamped, signed record of any create, read, update, delete, search, or merge operation performed on a Patient_Resource.
- **Patient_Component**: A React UI component in brightchart-react-components for displaying, searching, or editing patient identity data.

## Requirements

### Requirement 1: FHIR R4 Patient Resource Model

**User Story:** As a developer building EHR modules, I want a FHIR R4-compliant Patient resource data model in brightchart-lib, so that all BrightChart modules share a consistent, standards-based patient representation.

#### Acceptance Criteria

1. THE Patient_Resource SHALL include the following FHIR R4 Patient fields: identifier (array of Patient_Identifier), active (boolean), name (array of HumanName), telecom (array of ContactPoint), gender (AdministrativeGender code), birthDate (date), deceasedBoolean, deceasedDateTime, address (array of Address), maritalStatus (CodeableConcept), multipleBirthBoolean, multipleBirthInteger, contact (array of PatientContact), communication (array of PatientCommunication), generalPractitioner (array of Reference), and managingOrganization (Reference).
2. THE Patient_Resource SHALL use the generic TID type parameter (defaulting to string for frontend, Uint8Array for backend) consistent with the existing PlatformID convention in brightchain-lib.
3. THE Patient_Resource SHALL include a resourceType field with the fixed value "Patient" conforming to the FHIR R4 resource type system.
4. THE Patient_Resource SHALL include FHIR metadata fields: id, meta (with versionId, lastUpdated, source, profile, security, tag), text (Narrative), and extension (array of Extension).
5. WHEN a Patient_Resource field uses a FHIR complex datatype (HumanName, Address, ContactPoint, CodeableConcept, Identifier, Reference, Narrative, Extension), THE Patient_Resource SHALL define that datatype as a separate exported TypeScript interface in brightchart-lib following FHIR R4 structure definitions.
6. THE Patient_Resource SHALL include a brightchainMetadata field containing blockId (TID), creatorMemberId (TID), createdAt (Date), updatedAt (Date), poolId (string), and encryptionType (BlockEncryptionType) for BrightChain storage tracking.

### Requirement 2: Patient Serialization and Deserialization

**User Story:** As a developer, I want to serialize Patient_Resource objects to FHIR-compliant JSON and deserialize FHIR JSON back to Patient_Resource objects, so that patient data can be stored on BrightChain and exchanged with external systems.

#### Acceptance Criteria

1. WHEN a valid Patient_Resource object is provided, THE Patient_Serializer SHALL produce a JSON string conforming to the FHIR R4 Patient resource schema.
2. WHEN a valid FHIR R4 Patient JSON string is provided, THE Patient_Serializer SHALL parse it into a Patient_Resource object with all fields correctly populated.
3. WHEN an invalid JSON string is provided, THE Patient_Serializer SHALL return a descriptive error indicating the parsing failure location and reason.
4. WHEN a JSON string contains fields not defined in the FHIR R4 Patient resource, THE Patient_Serializer SHALL preserve unrecognized fields in an extensions collection without data loss.
5. FOR ALL valid Patient_Resource objects, serializing then deserializing then serializing SHALL produce byte-identical JSON output (round-trip property).
6. THE Patient_Serializer SHALL omit fields with undefined or null values from the serialized JSON output, consistent with FHIR R4 serialization rules.
7. WHEN serializing date fields, THE Patient_Serializer SHALL format dates as FHIR R4 date strings (YYYY, YYYY-MM, or YYYY-MM-DD) and dateTime fields as FHIR R4 dateTime strings (ISO 8601 with timezone).

### Requirement 3: Patient CRUD Operations

**User Story:** As a healthcare provider, I want to create, read, update, and delete patient records, so that I can manage patient identities in the EHR system.

#### Acceptance Criteria

1. WHEN a valid Patient_Resource is submitted for creation, THE MPI_Service SHALL assign a unique FHIR-compliant id, set meta.versionId to "1", set meta.lastUpdated to the current timestamp, encrypt the Patient_Resource using the creator's ECIES keys, store the encrypted block in the Patient_Store, and return the created Patient_Resource with the assigned id.
2. WHEN a patient id is provided for retrieval, THE MPI_Service SHALL locate the encrypted block in the Patient_Store, decrypt the block using the requesting BrightChain_Member's credentials, and return the Patient_Resource.
3. IF a patient id provided for retrieval does not exist in the Patient_Store, THEN THE MPI_Service SHALL return a FHIR OperationOutcome with issue severity "error" and code "not-found".
4. WHEN an updated Patient_Resource is submitted, THE MPI_Service SHALL increment meta.versionId, update meta.lastUpdated, store the new version as a new encrypted block, link the new block to the previous version for history tracking, and return the updated Patient_Resource.
5. WHEN a patient id is submitted for deletion, THE MPI_Service SHALL mark the Patient_Resource as inactive (active = false) rather than physically removing the block, conforming to FHIR soft-delete semantics.
6. IF a create or update operation receives a Patient_Resource that fails FHIR R4 structural validation, THEN THE MPI_Service SHALL return a FHIR OperationOutcome listing all validation errors with their field paths.
7. WHEN a Patient_Resource is created or updated, THE MPI_Service SHALL generate an Audit_Log_Entry recording the operation type, the BrightChain_Member who performed the operation, the patient id, a timestamp, and a signature from the operating member's ECIES key.

### Requirement 4: Patient Search and Matching (MPI Logic)

**User Story:** As a healthcare provider, I want to search for patients by demographic criteria and detect potential duplicate records, so that I can find existing patients and maintain data integrity.

#### Acceptance Criteria

1. WHEN search parameters are provided (any combination of family name, given name, birthDate, gender, identifier value, telecom value, address fields), THE Patient_Search_Engine SHALL return a list of Patient_Resource records matching the specified criteria, ordered by relevance.
2. THE Patient_Search_Engine SHALL support exact match, prefix match, and phonetic match (Soundex or Metaphone) for name fields.
3. WHEN a Patient_Resource is submitted for duplicate detection, THE Patient_Search_Engine SHALL compare the submitted record against existing records and return candidate matches with a Match_Score for each.
4. THE Patient_Search_Engine SHALL compute Match_Score using weighted field comparisons: identifier matches receive the highest weight, followed by (family name + birthDate + gender), then (given name + address), then (telecom).
5. WHEN the Patient_Search_Engine returns candidate matches, each candidate SHALL include the Match_Score value and a classification of "certain" (score >= 0.95), "probable" (score >= 0.80), "possible" (score >= 0.60), or "unlikely" (score < 0.60).
6. THE Patient_Search_Engine SHALL maintain a search index of unencrypted demographic field hashes (not plaintext) to enable search without decrypting every stored Patient_Resource block.
7. WHEN search results are returned, THE MPI_Service SHALL filter results to include only Patient_Resource records that the requesting BrightChain_Member has read permission for according to the Patient_ACL.

### Requirement 5: Patient Record Merge

**User Story:** As a healthcare administrator, I want to merge duplicate patient records into a single surviving record, so that the MPI maintains a single source of truth per patient.

#### Acceptance Criteria

1. WHEN two patient ids are submitted for merge (a source and a target), THE MPI_Service SHALL combine the demographic data from the source Patient_Resource into the target Patient_Resource, mark the source as inactive, and add a FHIR link entry on the source with type "replaced-by" pointing to the target.
2. WHEN a merge is performed, THE MPI_Service SHALL add a FHIR link entry on the target Patient_Resource with type "replaces" pointing to the source.
3. WHEN a merge is performed, THE MPI_Service SHALL create a Merge_Record containing the source id, target id, the BrightChain_Member who authorized the merge, a timestamp, the fields that were combined, and a signature from the authorizing member.
4. IF the source patient id or target patient id does not exist, THEN THE MPI_Service SHALL return a FHIR OperationOutcome with issue severity "error" and code "not-found".
5. IF the source and target patient ids are identical, THEN THE MPI_Service SHALL return a FHIR OperationOutcome with issue severity "error" and code "invalid" indicating that a patient cannot be merged with itself.
6. WHEN a merged (inactive) patient id is retrieved, THE MPI_Service SHALL return the inactive Patient_Resource with the "replaced-by" link, enabling clients to follow the link to the surviving record.

### Requirement 6: Decentralized Storage on BrightChain

**User Story:** As a system architect, I want patient records stored as encrypted blocks on BrightChain's distributed storage, so that patient data benefits from BrightChain's owner-free, tamper-evident, and redundant storage model.

#### Acceptance Criteria

1. WHEN a Patient_Resource is stored, THE Patient_Store SHALL encrypt the serialized FHIR JSON using the BrightChain ECIES encryption scheme before writing the block.
2. THE Patient_Store SHALL store each Patient_Resource version as a separate block, with the block's metadata linking to the previous version's block id for version history.
3. THE Patient_Store SHALL use a dedicated BrightChain pool (identified by a configurable poolId) for all patient identity blocks, isolating patient data from other BrightChain data.
4. WHEN a Patient_Resource block is stored, THE Patient_Store SHALL compute and store a checksum for integrity verification consistent with the existing BrightChain block checksum mechanism.
5. IF a block integrity check fails during retrieval (checksum mismatch), THEN THE Patient_Store SHALL return an error indicating data corruption and attempt retrieval from a replica if available.
6. THE Patient_Store SHALL support the existing BrightChain block replication and availability mechanisms so that patient data participates in the network's redundancy model.

### Requirement 7: Access Control via BrightChain Member Pools

**User Story:** As a healthcare administrator, I want to control which BrightChain members can access patient records using the existing pool ACL system, so that patient data access follows the principle of least privilege.

#### Acceptance Criteria

1. THE Patient_ACL SHALL extend the existing IPoolACL interface from brightchain-lib, adding healthcare-specific permission levels: "patient:read", "patient:write", "patient:merge", "patient:search", and "patient:admin".
2. WHEN a BrightChain_Member attempts any patient operation (create, read, update, delete, search, merge), THE MPI_Service SHALL verify the member's permissions against the Patient_ACL before executing the operation.
3. IF a BrightChain_Member lacks the required permission for a requested operation, THEN THE MPI_Service SHALL return a FHIR OperationOutcome with issue severity "error" and code "security" and HTTP status 403.
4. WHEN a BrightChain_Member with "patient:admin" permission modifies the Patient_ACL, THE MPI_Service SHALL create a new signed ACL version, link it to the previous version, and require quorum approval if multiple administrators exist (consistent with the existing hasQuorum function in poolAcl.ts).
5. THE Patient_ACL SHALL integrate with the existing JWT authentication middleware (createJwtAuthMiddleware) and role-based access control middleware (createRoleMiddleware) from brightchain-api-lib for API endpoint protection.
6. WHEN a patient record is accessed, THE MPI_Service SHALL record the accessing BrightChain_Member's id, the operation type, and a timestamp in the Audit_Log_Entry for the patient, enabling access audit trails.

### Requirement 8: Audit Logging

**User Story:** As a compliance officer, I want a complete audit trail of all patient identity operations, so that the organization can demonstrate regulatory compliance and investigate access patterns.

#### Acceptance Criteria

1. WHEN any operation (create, read, update, delete, search, merge) is performed on a Patient_Resource, THE MPI_Service SHALL create an Audit_Log_Entry containing: operation type, patient id (or search parameters for search operations), the BrightChain_Member id who performed the operation, a timestamp, the request id, and a cryptographic signature from the operating member's ECIES key.
2. THE MPI_Service SHALL store Audit_Log_Entry records as encrypted blocks in a dedicated audit pool, separate from the Patient_Store pool.
3. WHEN an Audit_Log_Entry is created, THE MPI_Service SHALL include the previous Audit_Log_Entry block id for the same patient, forming a hash-linked chain of audit events per patient.
4. THE Audit_Log_Entry SHALL be append-only; the MPI_Service SHALL provide no mechanism to modify or delete existing audit entries.
5. WHEN audit log entries are queried, THE MPI_Service SHALL require "patient:admin" permission on the Patient_ACL for the requesting BrightChain_Member.

### Requirement 9: Library Structure and Extensibility

**User Story:** As a developer building future EHR modules, I want the patient identity interfaces in brightchart-lib to follow established workspace conventions and be designed for extensibility, so that Clinical Data, Encounters, and other modules can reference patient identities without tight coupling.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL follow the existing workspace library pattern: root-level directory, @brightchain/ npm scope, Nx project with @nx/js:tsc executor, TypeScript strict mode, and Jest test configuration.
2. THE brightchart-lib library SHALL export all Patient_Resource interfaces, FHIR datatype interfaces, and MPI service interfaces from a single src/index.ts barrel export.
3. THE brightchart-lib library SHALL be browser-compatible (no Node.js-specific dependencies), consistent with brightchain-lib's browser compatibility requirement.
4. THE Patient_Resource interface SHALL include a generic extension point (extensions array typed as FHIR Extension) that future modules can use to attach clinical data references (observations, conditions, encounters) without modifying the core Patient_Resource interface.
5. THE brightchart-lib library SHALL declare brightchain-lib as an implicit dependency in its Nx project.json, enabling access to PlatformID, BlockEncryptionType, PoolPermission, and other shared types.
6. THE brightchart-react-components library SHALL follow the existing brightchain-react-components pattern: root-level directory, @brightchain/ npm scope, implicit dependency on brightchart-lib, and React component exports.

### Requirement 10: Patient Identity UI Components

**User Story:** As a frontend developer, I want React components for patient search, patient demographics display, and patient creation forms, so that I can build patient-facing UIs in the BrightChart application.

#### Acceptance Criteria

1. THE Patient_Component library SHALL provide a PatientSearchForm component that accepts search parameters (name, birthDate, gender, identifier) and emits search results via a callback.
2. THE Patient_Component library SHALL provide a PatientDemographicsCard component that displays a Patient_Resource's name, birthDate, gender, identifiers, address, and telecom in a read-only summary view.
3. THE Patient_Component library SHALL provide a PatientCreateEditForm component that renders input fields for all required Patient_Resource demographic fields, validates input against FHIR R4 constraints, and emits the completed Patient_Resource via a callback.
4. WHEN the PatientSearchForm receives search results, THE PatientSearchForm SHALL display results in a list with each entry showing the patient's primary name, birthDate, gender, and primary identifier.
5. WHEN a PatientSearchForm result includes a Match_Score (from duplicate detection), THE PatientSearchForm SHALL display the match classification ("certain", "probable", "possible") as a visual indicator alongside the result.
6. THE Patient_Component library SHALL use the Patient_Resource interface from brightchart-lib as the data contract for all components, with TID defaulted to string for frontend use.

### Requirement 11: Offline-Capable Patient Data Access

**User Story:** As a healthcare provider working in environments with intermittent connectivity, I want encrypted patient records cached locally and synced when connected, so that I can access critical patient identity data without a live network connection.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an IOfflineCache interface with methods: cachePatient(patient: Patient_Resource, encryptionKeys: Uint8Array): Promise<void>, getCachedPatient(id: string, decryptionKeys: Uint8Array): Promise<Patient_Resource | null>, listCachedPatientIds(): Promise<string[]>, and clearCache(): Promise<void>.
2. WHEN a Patient_Resource is retrieved online, THE MPI_Service SHALL offer an option to cache the encrypted record locally using the IOfflineCache interface.
3. WHEN the network is unavailable, THE MPI_Service SHALL serve Patient_Resource reads from the local encrypted cache if the requested patient is cached.
4. WHEN network connectivity is restored, THE MPI_Service SHALL sync any locally created or updated Patient_Resource records to the Patient_Store, resolving version conflicts by comparing meta.versionId values.
5. THE IOfflineCache SHALL store patient data in encrypted form only — plaintext Patient_Resource data SHALL NOT be persisted to local storage at any time.
6. THE IOfflineCache SHALL record a lastSynced timestamp per cached patient, enabling the UI to indicate data freshness to the user.
