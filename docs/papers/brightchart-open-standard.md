---
layout: default
title: "BrightChart Practice Records Portability Standard v2.0"
parent: "Papers"
---
# BrightChart Practice Records Portability Standard

**Version 2.0.0**

**Jessica Mulein**
Digital Defiance
jessica@digitaldefiance.org

**Abstract.** This document specifies the BrightChart Practice Records Portability Standard — an open format for the full-fidelity import and export of complete practice data across Electronic Health Record (EHR) systems. The standard prevents EMR lock-in by enabling practice-to-practice and practice-to-new-system migration of the entire operational dataset: patient demographics, staff and practitioner records, access rights and permissions, clinical notes and documentation, audit trails, scheduling data, orders and results, billing and claims, clinical observations, practice configuration, and templates. The data model is rooted in HL7 FHIR R4 resources augmented with BrightChain decentralized storage metadata, and serves medical, dental, and veterinary practices equally. It defines a JSON export bundle format, optional encryption using open standards (AES-256-GCM, ECIES), versioning and backward compatibility rules, and conformance criteria. The standard supports interoperability with Epic and other FHIR R4-compliant EHR systems via USCDI APIs and C-CDA clinical document exchange, and is designed for compliance with the 21st Century Cures Act information blocking provisions.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

**Keywords:** FHIR R4, practice records portability, EHR interoperability, EMR lock-in prevention, ECIES encryption, BrightChain, open standard, USCDI, C-CDA, 21st Century Cures Act, multi-specialty EHR, practice migration

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Purpose and Scope](#2-purpose-and-scope)
3. [Terminology and Definitions](#3-terminology-and-definitions)
4. [Conformance Language](#4-conformance-language)
5. [Data Model Overview](#5-data-model-overview)
6. [Export Bundle Format](#6-export-bundle-format)
7. [Patient Records](#7-patient-records)
8. [Staff and Practitioner Data](#8-staff-and-practitioner-data)
9. [Access Rights and Permissions](#9-access-rights-and-permissions)
10. [Clinical Notes and Documentation](#10-clinical-notes-and-documentation)
11. [Audit Trails](#11-audit-trails)
12. [Scheduling Data](#12-scheduling-data)
13. [Orders and Results](#13-orders-and-results)
14. [Billing and Claims](#14-billing-and-claims)
15. [Clinical Data](#15-clinical-data)
16. [Practice Configuration](#16-practice-configuration)
17. [Templates and Forms](#17-templates-and-forms)
18. [Encryption](#18-encryption)
19. [Import and Export Procedures](#19-import-and-export-procedures)
20. [Versioning and Compatibility](#20-versioning-and-compatibility)
21. [Interoperability](#21-interoperability)
22. [21st Century Cures Act Compliance](#22-21st-century-cures-act-compliance)
23. [Multi-Specialty Support](#23-multi-specialty-support)
24. [Conformance Criteria](#24-conformance-criteria)
25. [Security Considerations](#25-security-considerations)
26. [References](#26-references)
27. [Appendix A: TypeScript Interface Reference](#appendix-a-typescript-interface-reference)
28. [Appendix B: Complete Export Bundle JSON Schema](#appendix-b-complete-export-bundle-json-schema)
29. [Appendix C: Migration Checklist](#appendix-c-migration-checklist)

---

## 1. Introduction

Healthcare practices are routinely held captive by their EHR vendor. Migrating from one system to another — or even extracting a complete copy of practice data for archival — is often prohibitively difficult, expensive, and lossy. Existing standards address fragments of the problem: FHIR R4 provides a resource model for clinical data, C-CDA defines clinical document exchange, and the 21st Century Cures Act mandates patient data access. But no single specification addresses the complete portability of an entire practice's operational dataset.

The BrightChart Practice Records Portability Standard fills this gap. It defines a self-contained export bundle that captures the full stack of practice data: not just patient demographics, but staff records, credentials, access control lists, clinical notes, scheduling, orders, results, billing, practice configuration, and templates. A receiving system can reconstruct the complete operational state of the exporting practice.

This standard is designed for **practice-to-practice** and **practice-to-new-system** migration. It is NOT a patient-facing export format. Patients who want their own records use FHIR R4 Patient Access APIs or the patient portal; this standard is for when a practice changes EHR vendors, merges with another practice, or needs a complete backup of its operational data.

This standard serves medical, dental, and veterinary practices equally. A medical practice, a dental office, and a veterinary clinic all manage fundamentally similar operational data — patient identities, staff roles, schedules, notes, orders, billing — with specialty-specific extensions handled through FHIR's standard extension mechanism and SNOMED CT role codes.

### 1.1 Design Principles

- **Full Fidelity**: Export bundles preserve all data, metadata, access policies, audit history, and configuration without lossy transformation.
- **Standards-Based**: The data model is rooted in HL7 FHIR R4, with extensions clearly namespaced under the BrightChart URI scheme (`http://brightchart.org/fhir/`).
- **Encryption is Optional**: Export bundles MAY be encrypted using open standards (AES-256-GCM, ECIES). Unencrypted bundles are valid. When encryption is used, it MUST use open, non-proprietary algorithms.
- **Specialty-Agnostic**: The core format serves medical, dental, and veterinary practices equally, with specialty-specific extensions handled through FHIR's standard extension mechanism.
- **No Vendor Lock-In**: The format is fully documented, uses open standards exclusively, and requires no proprietary libraries to read or write.
- **Forward and Backward Compatible**: The versioning scheme ensures interoperability across standard versions.
- **Full Stack**: The bundle covers the entire practice operational dataset, not just clinical data.

### 1.2 Relationship to Version 1.0

Version 1.0 of this standard covered patient demographics, audit trails, access policies, and healthcare role definitions. Version 2.0 expands the scope to the full practice operational dataset. Version 2.0 bundles are a strict superset of version 1.0 — a v2.0 implementation MUST be able to read v1.0 bundles, and a v1.0 implementation can read the `patients`, `auditTrail`, `accessPolicies`, and `roles` sections of a v2.0 bundle while ignoring unrecognized top-level fields.

---

## 2. Purpose and Scope

### 2.1 Purpose

This specification defines:

1. A comprehensive data model for all practice operational data, based on FHIR R4 resources with BrightChain storage extensions.
2. A JSON export bundle format (`IBrightChartExportBundle`) for transferring complete practice data between systems.
3. Procedures for exporting practice data from one system and importing it into another.
4. Portable representations of access control policies, audit trails, staff records, clinical notes, scheduling, orders, results, billing, configuration, and templates.
5. Optional encryption using open standards for secure bundle transfer.
6. Versioning rules for forward and backward compatibility.
7. Conformance criteria for systems claiming compliance with this standard.

### 2.2 Scope — What Is Included

| Data Category | Description | FHIR Resource Types |
|---------------|-------------|-------------------|
| **Patient Records** | Full demographics, identifiers, contacts | `Patient` |
| **Staff/Practitioner Data** | Staff records, credentials, roles, specialties, NPI numbers | `Practitioner`, `PractitionerRole` |
| **Access Rights & Permissions** | ACLs, SMART scopes, patient permissions, role assignments, pool memberships | Custom (`IPatientACL`, SMART scopes) |
| **Clinical Notes & Documentation** | Encounter notes, progress notes, clinical narratives, assessments | `DocumentReference`, `Composition` |
| **Audit Trails** | Complete operation history, hash-linked chains, signatures | Custom (`IAuditLogEntry`) |
| **Scheduling Data** | Appointments, availability, recurring schedules | `Appointment`, `Schedule`, `Slot` |
| **Orders & Results** | Lab orders, imaging orders, results, diagnostic reports | `ServiceRequest`, `DiagnosticReport` |
| **Billing & Claims** | Charge items, claims, insurance information, fee schedules | `Claim`, `Coverage`, `ChargeItem` |
| **Clinical Data** | Observations, conditions, allergies, medications, immunizations, procedures | `Observation`, `Condition`, `AllergyIntolerance`, `MedicationStatement`, `Immunization`, `Procedure` |
| **Practice Configuration** | Organization structure, locations, departments, system settings | `Organization`, `Location` |
| **Templates & Forms** | Clinical templates, custom forms, document templates | `Questionnaire` |

### 2.3 Scope — What Is NOT Included

- **Patient-facing exports**: This standard is for practice-to-practice migration, not patient portal downloads. Patients use FHIR R4 Patient Access APIs.
- **Real-time synchronization**: Covered separately by the BrightChain gossip protocol.
- **Proprietary vendor extensions**: Only open-standard data formats are supported.

### 2.4 Target Specialties

| Specialty | Patient Type | Example Identifiers | Applicable Role Codes |
|-----------|-------------|--------------------|-----------------------|
| Medical | Human patient | MRN, SSN, insurance ID, NPI | Physician (`309343006`), Registered Nurse (`224535009`), Medical Assistant (`309453006`) |
| Dental | Human patient | MRN, dental plan ID, NPI | Dentist (`106289002`), Registered Nurse (`224535009`) |
| Veterinary | Animal patient | Microchip ID, rabies tag | Veterinarian (`106290006`), Veterinary Nurse (extension) |

---

## 3. Terminology and Definitions

| Term | Definition |
|------|-----------|
| **Bundle** | A self-contained JSON document conforming to the `IBrightChartExportBundle` interface, containing practice data for migration. |
| **ECIES** | Elliptic Curve Integrated Encryption Scheme — a public-key encryption scheme. Used optionally for bundle encryption. |
| **FHIR R4** | HL7 Fast Healthcare Interoperability Resources Release 4 — the healthcare data exchange standard used as the canonical data model. |
| **MPI** | Master Patient Index — the service responsible for patient identity management, search, matching, and merge operations. |
| **NPI** | National Provider Identifier — a unique 10-digit identification number issued to healthcare providers in the United States. |
| **Patient Resource** | A FHIR R4 Patient resource instance augmented with BrightChain storage metadata (`brightchainMetadata`). |
| **Pool** | A BrightChain storage namespace providing isolation for data blocks. |
| **Practice** | A healthcare organization (medical, dental, or veterinary) that operates as a single administrative unit. |
| **SMART Scope** | A permission string following the SMART on FHIR v2 syntax (`context/ResourceType.actions`) used for granular access control. |
| **SNOMED CT** | Systematized Nomenclature of Medicine — Clinical Terms, used for healthcare role code taxonomy. |
| **TID** | Type Identifier — a generic type parameter defaulting to `string` for frontend use and `Uint8Array` for backend use. |
| **USCDI** | United States Core Data for Interoperability — the standardized health data classes and elements required for nationwide interoperability. |
| **C-CDA** | Consolidated Clinical Document Architecture — an XML-based standard for clinical document exchange. |

---

## 4. Conformance Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

- **MUST / SHALL / REQUIRED**: Absolute requirement. Non-compliance means the implementation does not conform.
- **MUST NOT / SHALL NOT**: Absolute prohibition.
- **SHOULD / RECOMMENDED**: There may be valid reasons to ignore this requirement, but the implications must be understood.
- **MAY / OPTIONAL**: Truly optional. Implementations may or may not include this feature.

---

## 5. Data Model Overview

### 5.1 Resource Type System

All resources in the export bundle carry a `resourceType` field identifying their FHIR R4 resource type (or a BrightChart custom type for non-FHIR data). This enables generic processing of bundle contents.

### 5.2 Identifier Strategy

All resources use the FHIR R4 `Identifier` datatype for cross-system identification:

```json
{
  "use": "official",
  "system": "http://example.org/identifiers/mrn",
  "value": "MRN-12345"
}
```

Importing systems MUST preserve all source identifiers and MAY add local identifiers with a different `system` URI.

### 5.3 Reference Resolution

Inter-resource references use the FHIR R4 `Reference` datatype:

```json
{
  "reference": "Patient/bc-patient-001",
  "display": "John Smith"
}
```

References within a bundle are relative to the bundle. Importing systems MUST resolve references to local resource IDs after import and MUST maintain a mapping table from source IDs to local IDs.

### 5.4 BrightChain Storage Metadata

Resources stored on BrightChain carry a `brightchainMetadata` extension:

```json
{
  "blockId": "bc-block-a1b2c3d4",
  "creatorMemberId": "bc-member-admin-001",
  "createdAt": "2024-06-01T08:00:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z",
  "poolId": "patient-store-pool-001",
  "encryptionType": "aes-256-gcm"
}
```

This metadata is OPTIONAL for non-BrightChain systems. Importing systems that do not use BrightChain storage MAY ignore this field.

### 5.5 Serialization Rules

1. All JSON output MUST be UTF-8 encoded.
2. Date fields MUST be serialized as ISO 8601 strings (e.g., `"2025-01-15T10:30:00.000Z"`).
3. FHIR date fields (`birthDate`) MUST use the FHIR R4 date format: `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`.
4. Fields with `undefined` or `null` values MUST be omitted from the serialized output.
5. Binary data (signatures, encryption keys) MUST be Base64-encoded when serialized to JSON.
6. The `version` field MUST follow Semantic Versioning 2.0.0 (semver).

---

## 6. Export Bundle Format

### 6.1 IBrightChartExportBundle Structure

The export bundle is the primary unit of data exchange. The current TypeScript interface `IBrightChartExportBundle<TID>` (defined in `brightchart-lib/src/lib/portability/portabilityTypes.ts`) covers the v1.0 fields. The v2.0 bundle extends this with additional top-level arrays for the full practice dataset.

| Field | Type | Conformance | Description |
|-------|------|-------------|-------------|
| `version` | string | REQUIRED | Standard version (semver, e.g., `"2.0.0"`) |
| `exportDate` | string (ISO 8601) | REQUIRED | Timestamp when the export was generated |
| `sourceSystem` | string | REQUIRED | Identifier of the system that produced the export |
| `patients` | IPatientResource[] | REQUIRED | Patient records (§7) |
| `practitioners` | IPractitionerExport[] | SHOULD | Staff and practitioner records (§8) |
| `auditTrail` | IAuditLogEntry[] | SHOULD | Audit trail entries (§11) |
| `accessPolicies` | IPatientACL[] | SHOULD | Access control policies (§9) |
| `smartScopes` | ISmartScopeAssignment[] | SHOULD | SMART scope assignments per member (§9) |
| `roles` | IHealthcareRole[] | SHOULD | Healthcare role definitions (§8) |
| `clinicalNotes` | IClinicalDocument[] | MAY | Clinical notes and documentation (§10) |
| `schedules` | IScheduleExport[] | MAY | Scheduling data (§12) |
| `orders` | IOrderExport[] | MAY | Orders and service requests (§13) |
| `diagnosticReports` | IDiagnosticReportExport[] | MAY | Results and diagnostic reports (§13) |
| `billing` | IBillingExport[] | MAY | Billing and claims data (§14) |
| `clinicalData` | IClinicalDataExport | MAY | Observations, conditions, allergies, medications, immunizations, procedures (§15) |
| `practiceConfig` | IPracticeConfigExport | MAY | Organization structure, locations, settings (§16) |
| `templates` | ITemplateExport[] | MAY | Clinical templates and custom forms (§17) |
| `metadata` | Record&lt;string, unknown&gt; | SHOULD | Extensibility metadata |

### 6.2 Export Bundle JSON Example (v2.0)

```json
{
  "version": "2.0.0",
  "exportDate": "2025-07-15T14:00:00.000Z",
  "sourceSystem": "brightchart://springfield-medical/v2",
  "patients": [ "..." ],
  "practitioners": [ "..." ],
  "auditTrail": [ "..." ],
  "accessPolicies": [ "..." ],
  "smartScopes": [ "..." ],
  "roles": [ "..." ],
  "clinicalNotes": [ "..." ],
  "schedules": [ "..." ],
  "orders": [ "..." ],
  "diagnosticReports": [ "..." ],
  "billing": [ "..." ],
  "clinicalData": {
    "observations": [ "..." ],
    "conditions": [ "..." ],
    "allergies": [ "..." ],
    "medications": [ "..." ],
    "immunizations": [ "..." ],
    "procedures": [ "..." ]
  },
  "practiceConfig": {
    "organizations": [ "..." ],
    "locations": [ "..." ],
    "departments": [ "..." ],
    "settings": { "..." }
  },
  "templates": [ "..." ],
  "metadata": {
    "exportReason": "Practice migration to new EHR vendor",
    "exportedBy": "bc-member-admin-001",
    "totalPatientCount": 4872,
    "totalPractitionerCount": 47,
    "pagination": {
      "page": 1,
      "totalPages": 1,
      "bundleId": "export-2025-07-15-full"
    }
  }
}
```

### 6.3 Bundle Size and Pagination

For large exports, implementations SHOULD split the export into multiple bundles. Each bundle MUST be independently valid. The `metadata` field SHOULD include pagination information:

```json
{
  "metadata": {
    "pagination": {
      "page": 1,
      "totalPages": 10,
      "totalPatients": 4872,
      "bundleId": "export-2025-07-15-batch-001"
    }
  }
}
```

### 6.4 Version Negotiation

Before initiating a transfer, systems SHOULD negotiate the bundle version:

1. The exporting system advertises its supported versions via a capabilities endpoint or out-of-band communication.
2. The importing system selects the highest mutually supported MAJOR version.
3. The exporting system generates the bundle at the negotiated version.
4. If no common MAJOR version exists, the transfer MUST NOT proceed.

---

## 7. Patient Records

### 7.1 FHIR R4 Patient Resource with BrightChain Extensions

The core patient data model is the FHIR R4 Patient resource, extended with BrightChain storage metadata. The TypeScript interface `IPatientResource<TID>` (defined in `brightchart-lib/src/lib/fhir/patientResource.ts`) serves as the normative reference.

#### 7.1.1 FHIR R4 Patient Fields

| Field | Type | Cardinality | Description |
|-------|------|-------------|-------------|
| `resourceType` | string | 1..1 | Fixed value: `"Patient"` |
| `id` | string | 0..1 | Logical identifier assigned by the MPI |
| `meta` | Meta | 0..1 | Resource metadata (versionId, lastUpdated, profile, security, tag) |
| `text` | Narrative | 0..1 | Human-readable summary |
| `extension` | Extension[] | 0..* | Additional content defined by implementations |
| `identifier` | Identifier[] | 0..* | Patient identifiers (MRN, SSN, insurance ID, microchip ID, etc.) |
| `active` | boolean | 0..1 | Whether the record is in active use |
| `name` | HumanName[] | 0..* | Patient name(s) |
| `telecom` | ContactPoint[] | 0..* | Contact details (phone, email, fax) |
| `gender` | code | 0..1 | `male` \| `female` \| `other` \| `unknown` |
| `birthDate` | date | 0..1 | Date of birth (YYYY, YYYY-MM, or YYYY-MM-DD) |
| `deceasedBoolean` | boolean | 0..1 | Whether the patient is deceased |
| `deceasedDateTime` | dateTime | 0..1 | Date/time of death |
| `address` | Address[] | 0..* | Patient address(es) |
| `maritalStatus` | CodeableConcept | 0..1 | Marital status |
| `multipleBirthBoolean` | boolean | 0..1 | Whether part of a multiple birth |
| `multipleBirthInteger` | integer | 0..1 | Birth order in multiple birth |
| `contact` | BackboneElement[] | 0..* | Emergency contacts and next of kin |
| `communication` | BackboneElement[] | 0..* | Language and communication preferences |
| `generalPractitioner` | Reference[] | 0..* | Primary care provider(s) |
| `managingOrganization` | Reference | 0..1 | Custodian organization |
| `link` | BackboneElement[] | 0..* | Links to other patient resources (merge chains) |

#### 7.1.2 BrightChain Storage Metadata Extension

Each Patient resource MAY carry a `brightchainMetadata` object:

| Field | Type | Cardinality | Description |
|-------|------|-------------|-------------|
| `blockId` | TID | 1..1 | Block identifier in BrightChain storage |
| `creatorMemberId` | TID | 1..1 | BrightChain member who created the record |
| `createdAt` | Date | 1..1 | Record creation timestamp |
| `updatedAt` | Date | 1..1 | Last update timestamp |
| `poolId` | string | 1..1 | Identifier of the patient data pool |
| `encryptionType` | BlockEncryptionType | 1..1 | Encryption scheme applied to the block |

Non-BrightChain systems MAY omit `brightchainMetadata` entirely.

#### 7.1.3 Patient Resource JSON Example

```json
{
  "resourceType": "Patient",
  "id": "bc-patient-001",
  "meta": {
    "versionId": "3",
    "lastUpdated": "2025-01-15T10:30:00.000Z",
    "profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]
  },
  "identifier": [
    {
      "use": "official",
      "system": "http://hospital.example.org/mrn",
      "value": "MRN-12345"
    },
    {
      "use": "usual",
      "system": "http://hl7.org/fhir/sid/us-ssn",
      "value": "999-99-9999"
    }
  ],
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Smith",
      "given": ["John", "Michael"],
      "prefix": ["Mr."]
    }
  ],
  "telecom": [
    { "system": "phone", "value": "+1-555-555-0100", "use": "home" },
    { "system": "email", "value": "john.smith@example.com", "use": "work" }
  ],
  "gender": "male",
  "birthDate": "1985-07-15",
  "address": [
    {
      "use": "home",
      "type": "physical",
      "line": ["123 Main Street", "Apt 4B"],
      "city": "Springfield",
      "state": "IL",
      "postalCode": "62701",
      "country": "US"
    }
  ],
  "communication": [
    {
      "language": {
        "coding": [{ "system": "urn:ietf:bcp:47", "code": "en-US", "display": "English (United States)" }]
      },
      "preferred": true
    }
  ],
  "generalPractitioner": [
    { "reference": "Practitioner/dr-jones-001", "display": "Dr. Sarah Jones" }
  ],
  "managingOrganization": {
    "reference": "Organization/springfield-medical",
    "display": "Springfield Medical Center"
  },
  "brightchainMetadata": {
    "blockId": "bc-block-a1b2c3d4",
    "creatorMemberId": "bc-member-admin-001",
    "createdAt": "2024-06-01T08:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "poolId": "patient-store-pool-001",
    "encryptionType": "aes-256-gcm"
  }
}
```

### 7.2 FHIR R4 Complex Datatypes

The following FHIR R4 complex datatypes are used throughout the data model. Each is defined as a TypeScript interface in `brightchart-lib/src/lib/fhir/datatypes.ts`:

- **HumanName**: `use`, `text`, `family`, `given[]`, `prefix[]`, `suffix[]`, `period`
- **Address**: `use`, `type`, `text`, `line[]`, `city`, `district`, `state`, `postalCode`, `country`, `period`
- **ContactPoint**: `system`, `value`, `use`, `rank`, `period`
- **Identifier**: `use`, `type`, `system`, `value`, `period`, `assigner`
- **CodeableConcept**: `coding[]`, `text`
- **Coding**: `system`, `version`, `code`, `display`, `userSelected`
- **Reference**: `reference`, `type`, `identifier`, `display`
- **Period**: `start`, `end`
- **Meta**: `versionId`, `lastUpdated`, `source`, `profile[]`, `security[]`, `tag[]`
- **Narrative**: `status`, `div`
- **Extension**: `url`, plus arbitrary key-value pairs

### 7.3 Enumerations

| Enumeration | Values | FHIR Reference |
|-------------|--------|----------------|
| AdministrativeGender | `male`, `female`, `other`, `unknown` | [ValueSet: AdministrativeGender](https://build.fhir.org/valueset-administrative-gender.html) |
| NameUse | `usual`, `official`, `temp`, `nickname`, `anonymous`, `old`, `maiden` | [ValueSet: NameUse](https://build.fhir.org/valueset-name-use.html) |
| AddressUse | `home`, `work`, `temp`, `old`, `billing` | [ValueSet: AddressUse](https://build.fhir.org/valueset-address-use.html) |
| AddressType | `postal`, `physical`, `both` | [ValueSet: AddressType](https://build.fhir.org/valueset-address-type.html) |
| ContactPointSystem | `phone`, `fax`, `email`, `pager`, `url`, `sms`, `other` | [ValueSet: ContactPointSystem](https://build.fhir.org/valueset-contact-point-system.html) |
| ContactPointUse | `home`, `work`, `temp`, `old`, `mobile` | [ValueSet: ContactPointUse](https://build.fhir.org/valueset-contact-point-use.html) |
| IdentifierUse | `usual`, `official`, `temp`, `secondary`, `old` | [ValueSet: IdentifierUse](https://build.fhir.org/valueset-identifier-use.html) |
| LinkType | `replaced-by`, `replaces`, `refer`, `seealso` | [ValueSet: LinkType](https://build.fhir.org/valueset-link-type.html) |

---

## 8. Staff and Practitioner Data

### 8.1 Practitioner Export Structure

Staff and practitioner records capture all personnel associated with the practice, including their credentials, specialties, NPI numbers, and role assignments.

```json
{
  "resourceType": "Practitioner",
  "id": "dr-jones-001",
  "identifier": [
    {
      "use": "official",
      "system": "http://hl7.org/fhir/sid/us-npi",
      "value": "1234567890"
    },
    {
      "use": "secondary",
      "system": "http://hospital.example.org/staff-id",
      "value": "STAFF-001"
    }
  ],
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Jones",
      "given": ["Sarah", "Elizabeth"],
      "prefix": ["Dr."],
      "suffix": ["MD", "FACP"]
    }
  ],
  "telecom": [
    { "system": "phone", "value": "+1-555-555-0300", "use": "work" },
    { "system": "email", "value": "dr.jones@springfield-medical.example.org", "use": "work" }
  ],
  "gender": "female",
  "birthDate": "1978-03-22",
  "qualification": [
    {
      "identifier": [
        {
          "system": "http://example.org/medical-license",
          "value": "IL-MD-2005-12345"
        }
      ],
      "code": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/v2-0360",
            "code": "MD",
            "display": "Doctor of Medicine"
          }
        ]
      },
      "period": { "start": "2005-06-15" },
      "issuer": { "display": "Illinois Department of Financial and Professional Regulation" }
    }
  ],
  "communication": [
    {
      "coding": [{ "system": "urn:ietf:bcp:47", "code": "en-US" }]
    }
  ]
}
```

### 8.2 Practitioner Fields

| Field | Type | Conformance | Description |
|-------|------|-------------|-------------|
| `resourceType` | string | REQUIRED | Fixed value: `"Practitioner"` |
| `id` | string | REQUIRED | Unique identifier within the bundle |
| `identifier` | Identifier[] | REQUIRED | NPI, staff ID, license numbers |
| `active` | boolean | REQUIRED | Whether currently active at the practice |
| `name` | HumanName[] | REQUIRED | Legal and display names |
| `telecom` | ContactPoint[] | SHOULD | Work contact details |
| `gender` | code | MAY | Administrative gender |
| `birthDate` | date | MAY | Date of birth |
| `qualification` | BackboneElement[] | SHOULD | Degrees, licenses, certifications |
| `communication` | CodeableConcept[] | MAY | Languages spoken |

### 8.3 Healthcare Role Definitions

Healthcare roles conform to the `IHealthcareRole<TID>` interface (defined in `brightchart-lib/src/lib/roles/healthcareRole.ts`), following the FHIR PractitionerRole resource structure.

| Field | Type | Conformance | Description |
|-------|------|-------------|-------------|
| `roleCode` | string | REQUIRED | SNOMED CT code identifying the role type |
| `roleDisplay` | string | REQUIRED | Human-readable display name |
| `specialty` | ICodeableConcept | MAY | Clinical specialty |
| `organization` | IReference | SHOULD | Associated organization |
| `practitioner` | IReference | REQUIRED | Practitioner holding this role |
| `period` | IPeriod | MAY | Validity period |

### 8.4 Standard Role Codes

| Constant | SNOMED CT Code | Display Name | Applicable Specialties |
|----------|---------------|--------------|----------------------|
| `PHYSICIAN` | `309343006` | Physician | Medical |
| `REGISTERED_NURSE` | `224535009` | Registered Nurse | Medical, Dental |
| `MEDICAL_ASSISTANT` | `309453006` | Medical Assistant | Medical |
| `PATIENT` | `116154003` | Patient | All |
| `ADMIN` | `394572006` | Clinical Administrator | All |
| `DENTIST` | `106289002` | Dentist | Dental |
| `VETERINARIAN` | `106290006` | Veterinarian | Veterinary |

Implementations MAY use additional valid SNOMED CT codes from the [SNOMED CT Browser](https://browser.ihtsdotools.org/) for roles not covered by the standard set. Custom role codes SHOULD be imported with a status of `pending-review`.

### 8.5 Practitioner Portability Rules

1. Exported practitioners MUST include at least one identifier (NPI RECOMMENDED for US providers).
2. The `roleDisplay` field MUST match the SNOMED CT preferred term for the given `roleCode`.
3. Importing systems MUST attempt to match practitioners by NPI or other official identifiers before creating new records.
4. Credential and qualification data MUST be preserved during import, even if the importing system does not validate credentials.

---

## 9. Access Rights and Permissions

### 9.1 Patient ACL Structure

Access control policies are represented by the `IPatientACL<TID>` interface (defined in `brightchart-lib/src/lib/access/patientAcl.ts`), which extends BrightChain's base `IPoolACL<TID>` with healthcare-specific permissions.

#### 9.1.1 Patient Permission Levels

| Permission | Value | Description |
|-----------|-------|-------------|
| Read | `patient:read` | View patient demographic and clinical data |
| Write | `patient:write` | Create and update patient records |
| Merge | `patient:merge` | Merge duplicate patient records |
| Search | `patient:search` | Search the patient index |
| Admin | `patient:admin` | Full administrative access including ACL modification, audit log access, and export |

#### 9.1.2 Permission Hierarchy

The `patient:admin` permission implies all other permissions. A member with `patient:admin` MUST be granted access for any operation that requires `patient:read`, `patient:write`, `patient:merge`, or `patient:search`.

### 9.2 SMART on FHIR v2 Scope Assignments

Each member's access is also expressed as SMART on FHIR v2 scopes following the syntax `context/ResourceType.actions`:

```json
{
  "memberId": "bc-member-dr-jones-001",
  "scopes": [
    "user/Patient.cruds",
    "user/Observation.cru",
    "user/Condition.cru",
    "user/DocumentReference.cru",
    "user/Appointment.cruds",
    "user/ServiceRequest.cru",
    "user/DiagnosticReport.r",
    "user/Claim.r"
  ]
}
```

| Scope Context | Description |
|--------------|-------------|
| `patient` | Access in the context of the current patient (patient portal) |
| `user` | Access based on the current user's permissions |
| `system` | System-level backend access |

| Action | Description |
|--------|-------------|
| `c` | Create |
| `r` | Read |
| `u` | Update |
| `d` | Delete |
| `s` | Search |

### 9.3 SMART Scope to Patient Permission Mapping

| Patient Permission | SMART Scope Equivalent |
|-------------------|----------------------|
| `patient:read` | `patient/Patient.r` or `user/Patient.r` |
| `patient:write` | `user/Patient.cu` |
| `patient:merge` | `user/Patient.u` (with merge extension) |
| `patient:search` | `user/Patient.s` |
| `patient:admin` | `system/Patient.cruds` |

### 9.4 Pool Membership Export

The bundle SHOULD include pool membership data indicating which members belong to which data pools:

```json
{
  "poolMemberships": [
    {
      "poolId": "patient-store-pool-001",
      "memberId": "bc-member-dr-jones-001",
      "role": "member",
      "joinedAt": "2024-01-15T08:00:00.000Z"
    },
    {
      "poolId": "patient-store-pool-001",
      "memberId": "bc-member-admin-001",
      "role": "admin",
      "joinedAt": "2023-06-01T08:00:00.000Z"
    }
  ]
}
```

### 9.5 ACL Portability Rules

1. Exported ACLs MUST include the complete `patientMembers` array with all member-permission mappings.
2. Exported SMART scope assignments MUST include all scopes for all members.
3. Member identifiers in exported ACLs reference BrightChain member IDs from the source system.
4. Importing systems MUST attempt to resolve source member IDs to local member identities using identifier matching (e.g., email, NPI number).
5. Unresolvable member references MUST be preserved in the imported ACL with a status of `unresolved`, and MUST NOT be granted access until manually mapped by a local administrator.
6. The importing system MUST create an audit log entry for each ACL import operation.

### 9.6 Access Policy JSON Example

```json
{
  "patientMembers": [
    {
      "memberId": "bc-member-dr-jones-001",
      "patientPermissions": ["patient:read", "patient:write", "patient:search"]
    },
    {
      "memberId": "bc-member-patient-smith-001",
      "patientPermissions": ["patient:read"]
    }
  ]
}
```

---

## 10. Clinical Notes and Documentation

### 10.1 Clinical Document Structure

Clinical notes and documentation are exported as FHIR R4 `DocumentReference` and `Composition` resources. This covers encounter notes, progress notes, clinical narratives, assessments, and any other textual clinical documentation.

```json
{
  "resourceType": "DocumentReference",
  "id": "note-001",
  "status": "current",
  "type": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "11506-3",
        "display": "Progress note"
      }
    ]
  },
  "subject": { "reference": "Patient/bc-patient-001" },
  "date": "2025-01-15T10:30:00.000Z",
  "author": [
    { "reference": "Practitioner/dr-jones-001", "display": "Dr. Sarah Jones" }
  ],
  "description": "Follow-up visit progress note",
  "content": [
    {
      "attachment": {
        "contentType": "text/plain",
        "data": "<base64-encoded-note-content>",
        "title": "Progress Note - 2025-01-15"
      }
    }
  ],
  "context": {
    "encounter": [{ "reference": "Encounter/enc-001" }],
    "period": {
      "start": "2025-01-15T09:00:00.000Z",
      "end": "2025-01-15T09:30:00.000Z"
    }
  }
}
```

### 10.2 Clinical Document Fields

| Field | Type | Conformance | Description |
|-------|------|-------------|-------------|
| `resourceType` | string | REQUIRED | `"DocumentReference"` or `"Composition"` |
| `id` | string | REQUIRED | Unique identifier within the bundle |
| `status` | code | REQUIRED | `current` \| `superseded` \| `entered-in-error` |
| `type` | CodeableConcept | REQUIRED | Document type (LOINC code RECOMMENDED) |
| `subject` | Reference | REQUIRED | Reference to the patient |
| `date` | dateTime | REQUIRED | When the document was created |
| `author` | Reference[] | SHOULD | Who authored the document |
| `description` | string | MAY | Human-readable description |
| `content` | BackboneElement[] | REQUIRED | Document content (attachment or URL) |
| `context` | BackboneElement | MAY | Clinical context (encounter, period) |

### 10.3 Content Encoding

Document content MUST be included inline as Base64-encoded data in the `content[].attachment.data` field. External URL references (content stored outside the bundle) are NOT RECOMMENDED for migration bundles, as they create dependencies on the source system.

Supported content types:

| Content Type | Description |
|-------------|-------------|
| `text/plain` | Plain text notes |
| `text/html` | Rich text notes |
| `application/pdf` | PDF documents |
| `text/xml` | C-CDA or other XML documents |
| `application/fhir+json` | FHIR Composition resources |

### 10.4 Clinical Notes Portability Rules

1. All clinical notes MUST be exported with their full content, not just references.
2. Author references MUST correspond to entries in the `practitioners` array.
3. Patient references MUST correspond to entries in the `patients` array.
4. Importing systems MUST preserve the original `date` and `author` metadata.
5. Notes marked as `entered-in-error` MUST be included in the export with their status preserved.

---

## 11. Audit Trails

### 11.1 Audit Log Entry Structure

Each audit log entry conforms to the `IAuditLogEntry<TID>` interface (defined in `brightchart-lib/src/lib/audit/auditLog.ts`).

| Field | Type | Conformance | Description |
|-------|------|-------------|-------------|
| `operationType` | AuditOperationType | REQUIRED | `Create` \| `Read` \| `Update` \| `Delete` \| `Search` \| `Merge` |
| `patientId` | string | SHOULD | Patient ID affected (omitted for Search operations) |
| `searchParams` | IPatientSearchParams | MAY | Search parameters (only for Search operations) |
| `memberId` | TID | REQUIRED | BrightChain member who performed the operation |
| `timestamp` | Date | REQUIRED | Operation timestamp (ISO 8601) |
| `requestId` | string | REQUIRED | Unique request identifier for correlation |
| `signature` | Uint8Array | REQUIRED | ECIES cryptographic signature from the operating member |
| `previousEntryBlockId` | TID | MAY | Block ID of the previous audit entry (hash-chain link) |

### 11.2 Hash-Linked Audit Chain

Audit entries for each patient form a singly-linked chain via the `previousEntryBlockId` field. The first entry for a patient has `previousEntryBlockId` omitted. Each subsequent entry references the block ID of the immediately preceding entry.

This chain structure provides:

- **Tamper Evidence**: Any modification to a historical entry breaks the chain.
- **Completeness Verification**: An importing system can verify the audit trail is complete by walking the chain.
- **Per-Patient Isolation**: Each patient has an independent audit chain.

### 11.3 Audit Trail Portability Rules

1. Exported audit trails MUST include the complete chain of entries for each exported patient.
2. The `signature` field MUST be preserved exactly as generated by the source system.
3. The `previousEntryBlockId` chain MUST be preserved. Importing systems MUST NOT rewrite chain links.
4. Upon import, the importing system MUST append a new audit entry recording the import operation to the end of each patient's audit chain.
5. Audit entries are append-only. No mechanism exists to modify or delete imported audit entries.
6. Importing systems SHOULD verify signatures against the source system's public keys if available. Verification failure MUST be logged but MUST NOT prevent import.

### 11.4 Audit Log Entry JSON Example

```json
{
  "operationType": "Update",
  "patientId": "bc-patient-001",
  "memberId": "bc-member-nurse-002",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "requestId": "req-def-456",
  "signature": "MEUCIQC7x2Ks5gGH...==",
  "previousEntryBlockId": "bc-audit-block-001"
}
```

---

## 12. Scheduling Data

### 12.1 Schedule Export Structure

Scheduling data covers appointments, provider availability schedules, and time slots.

#### 12.1.1 Appointment

```json
{
  "resourceType": "Appointment",
  "id": "appt-001",
  "status": "booked",
  "serviceType": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "185349003",
          "display": "Encounter for check up"
        }
      ]
    }
  ],
  "start": "2025-02-01T09:00:00.000Z",
  "end": "2025-02-01T09:30:00.000Z",
  "minutesDuration": 30,
  "participant": [
    {
      "actor": { "reference": "Patient/bc-patient-001", "display": "John Smith" },
      "status": "accepted"
    },
    {
      "actor": { "reference": "Practitioner/dr-jones-001", "display": "Dr. Sarah Jones" },
      "status": "accepted"
    }
  ],
  "description": "Annual physical examination"
}
```

#### 12.1.2 Schedule (Provider Availability)

```json
{
  "resourceType": "Schedule",
  "id": "sched-001",
  "active": true,
  "actor": [
    { "reference": "Practitioner/dr-jones-001", "display": "Dr. Sarah Jones" },
    { "reference": "Location/exam-room-1", "display": "Exam Room 1" }
  ],
  "planningHorizon": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  }
}
```

#### 12.1.3 Slot

```json
{
  "resourceType": "Slot",
  "id": "slot-001",
  "schedule": { "reference": "Schedule/sched-001" },
  "status": "free",
  "start": "2025-02-01T09:00:00.000Z",
  "end": "2025-02-01T09:30:00.000Z"
}
```

### 12.2 Recurring Schedule Representation

Recurring schedules are represented as a series of `Slot` resources generated from the `Schedule` resource's planning horizon. The `metadata` field on the schedule MAY include recurrence rules:

```json
{
  "metadata": {
    "recurrence": {
      "frequency": "weekly",
      "daysOfWeek": ["mon", "tue", "wed", "thu", "fri"],
      "startTime": "08:00",
      "endTime": "17:00",
      "slotDuration": 30,
      "timezone": "America/Chicago"
    }
  }
}
```

### 12.3 Scheduling Portability Rules

1. All appointments with status `booked`, `pending`, or `waitlist` MUST be exported.
2. Cancelled and no-show appointments SHOULD be exported for historical completeness.
3. Participant references MUST correspond to entries in the `patients` and `practitioners` arrays.
4. Importing systems MUST preserve original appointment timestamps.
5. Schedule and slot data is OPTIONAL — importing systems MAY reconstruct availability from recurrence rules.

---

## 13. Orders and Results

### 13.1 Service Requests (Orders)

Lab orders, imaging orders, referrals, and other service requests are exported as FHIR R4 `ServiceRequest` resources.

```json
{
  "resourceType": "ServiceRequest",
  "id": "order-001",
  "status": "completed",
  "intent": "order",
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "2093-3",
        "display": "Cholesterol [Mass/volume] in Serum or Plasma"
      }
    ]
  },
  "subject": { "reference": "Patient/bc-patient-001" },
  "requester": { "reference": "Practitioner/dr-jones-001" },
  "authoredOn": "2025-01-10T08:00:00.000Z",
  "performer": [
    { "reference": "Organization/quest-diagnostics", "display": "Quest Diagnostics" }
  ],
  "reasonCode": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "13644009",
          "display": "Hypercholesterolemia"
        }
      ]
    }
  ]
}
```

### 13.2 Diagnostic Reports (Results)

Results are exported as FHIR R4 `DiagnosticReport` resources with associated `Observation` resources.

```json
{
  "resourceType": "DiagnosticReport",
  "id": "report-001",
  "status": "final",
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "2093-3",
        "display": "Cholesterol [Mass/volume] in Serum or Plasma"
      }
    ]
  },
  "subject": { "reference": "Patient/bc-patient-001" },
  "effectiveDateTime": "2025-01-12T14:00:00.000Z",
  "issued": "2025-01-12T18:00:00.000Z",
  "performer": [
    { "reference": "Organization/quest-diagnostics" }
  ],
  "result": [
    { "reference": "Observation/obs-cholesterol-001" }
  ],
  "conclusion": "Total cholesterol within normal limits."
}
```

### 13.3 Orders and Results Portability Rules

1. All orders with status `active`, `completed`, or `on-hold` MUST be exported.
2. Orders with status `cancelled` or `entered-in-error` SHOULD be exported for audit completeness.
3. Diagnostic reports MUST include references to their associated observations in the `clinicalData.observations` array.
4. Importing systems MUST preserve the original `authoredOn` and `effectiveDateTime` values.
5. External performer references (e.g., reference labs) SHOULD be preserved as-is.

---

## 14. Billing and Claims

### 14.1 Charge Items

```json
{
  "resourceType": "ChargeItem",
  "id": "charge-001",
  "status": "billed",
  "code": {
    "coding": [
      {
        "system": "http://www.ama-assn.org/go/cpt",
        "code": "99213",
        "display": "Office visit, established patient, low complexity"
      }
    ]
  },
  "subject": { "reference": "Patient/bc-patient-001" },
  "performer": [
    {
      "actor": { "reference": "Practitioner/dr-jones-001" }
    }
  ],
  "occurrenceDateTime": "2025-01-15T09:00:00.000Z",
  "quantity": { "value": 1 },
  "priceOverride": {
    "value": 150.00,
    "currency": "USD"
  }
}
```

### 14.2 Claims

```json
{
  "resourceType": "Claim",
  "id": "claim-001",
  "status": "active",
  "type": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
        "code": "professional",
        "display": "Professional"
      }
    ]
  },
  "patient": { "reference": "Patient/bc-patient-001" },
  "created": "2025-01-16T08:00:00.000Z",
  "provider": { "reference": "Organization/springfield-medical" },
  "insurance": [
    {
      "sequence": 1,
      "focal": true,
      "coverage": { "reference": "Coverage/cov-001" }
    }
  ],
  "item": [
    {
      "sequence": 1,
      "productOrService": {
        "coding": [
          {
            "system": "http://www.ama-assn.org/go/cpt",
            "code": "99213"
          }
        ]
      },
      "servicedDate": "2025-01-15",
      "unitPrice": { "value": 150.00, "currency": "USD" }
    }
  ]
}
```

### 14.3 Insurance Coverage

```json
{
  "resourceType": "Coverage",
  "id": "cov-001",
  "status": "active",
  "type": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        "code": "EHCPOL",
        "display": "Extended healthcare"
      }
    ]
  },
  "subscriber": { "reference": "Patient/bc-patient-001" },
  "beneficiary": { "reference": "Patient/bc-patient-001" },
  "payor": [
    { "display": "Blue Cross Blue Shield of Illinois" }
  ],
  "class": [
    {
      "type": {
        "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/coverage-class", "code": "group" }]
      },
      "value": "GRP-12345"
    },
    {
      "type": {
        "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/coverage-class", "code": "plan" }]
      },
      "value": "PPO-Gold"
    }
  ],
  "period": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  }
}
```

### 14.4 Fee Schedules

Fee schedules are exported in the `metadata` section of the billing export:

```json
{
  "feeSchedule": {
    "name": "Springfield Medical 2025 Fee Schedule",
    "effectiveDate": "2025-01-01",
    "entries": [
      {
        "code": "99213",
        "system": "http://www.ama-assn.org/go/cpt",
        "description": "Office visit, established patient, low complexity",
        "amount": { "value": 150.00, "currency": "USD" }
      },
      {
        "code": "99214",
        "system": "http://www.ama-assn.org/go/cpt",
        "description": "Office visit, established patient, moderate complexity",
        "amount": { "value": 225.00, "currency": "USD" }
      }
    ]
  }
}
```

### 14.5 Billing Portability Rules

1. All claims with status `active` or `draft` MUST be exported.
2. Historical claims (`cancelled`, `entered-in-error`) SHOULD be exported for financial audit completeness.
3. Insurance coverage records MUST be exported for all active patients.
4. Fee schedules are OPTIONAL but RECOMMENDED for practice migration.
5. Importing systems MUST preserve original claim dates and amounts.
6. CPT, ICD-10, and HCPCS codes MUST use their standard code systems.

---

## 15. Clinical Data

### 15.1 Clinical Data Export Structure

Clinical data encompasses the core clinical observations, conditions, allergies, medications, immunizations, and procedures associated with patients. These are exported as a nested object within the bundle.

```json
{
  "clinicalData": {
    "observations": [ "..." ],
    "conditions": [ "..." ],
    "allergies": [ "..." ],
    "medications": [ "..." ],
    "immunizations": [ "..." ],
    "procedures": [ "..." ]
  }
}
```

### 15.2 Observations

FHIR R4 `Observation` resources capture vital signs, lab results, social history, and other clinical measurements.

```json
{
  "resourceType": "Observation",
  "id": "obs-bp-001",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "vital-signs",
          "display": "Vital Signs"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "85354-9",
        "display": "Blood pressure panel"
      }
    ]
  },
  "subject": { "reference": "Patient/bc-patient-001" },
  "effectiveDateTime": "2025-01-15T09:15:00.000Z",
  "performer": [{ "reference": "Practitioner/nurse-williams-002" }],
  "component": [
    {
      "code": {
        "coding": [{ "system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure" }]
      },
      "valueQuantity": { "value": 120, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]" }
    },
    {
      "code": {
        "coding": [{ "system": "http://loinc.org", "code": "8462-4", "display": "Diastolic blood pressure" }]
      },
      "valueQuantity": { "value": 80, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]" }
    }
  ]
}
```

### 15.3 Conditions

```json
{
  "resourceType": "Condition",
  "id": "cond-001",
  "clinicalStatus": {
    "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active" }]
  },
  "verificationStatus": {
    "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status", "code": "confirmed" }]
  },
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "38341003",
        "display": "Hypertensive disorder"
      }
    ]
  },
  "subject": { "reference": "Patient/bc-patient-001" },
  "onsetDateTime": "2023-06-15",
  "recorder": { "reference": "Practitioner/dr-jones-001" }
}
```

### 15.4 Allergies

```json
{
  "resourceType": "AllergyIntolerance",
  "id": "allergy-001",
  "clinicalStatus": {
    "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", "code": "active" }]
  },
  "type": "allergy",
  "category": ["medication"],
  "criticality": "high",
  "code": {
    "coding": [
      {
        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
        "code": "7980",
        "display": "Penicillin"
      }
    ]
  },
  "patient": { "reference": "Patient/bc-patient-001" },
  "recordedDate": "2020-03-10",
  "reaction": [
    {
      "manifestation": [
        {
          "coding": [{ "system": "http://snomed.info/sct", "code": "39579001", "display": "Anaphylaxis" }]
        }
      ],
      "severity": "severe"
    }
  ]
}
```

### 15.5 Medications

```json
{
  "resourceType": "MedicationStatement",
  "id": "med-001",
  "status": "active",
  "medicationCodeableConcept": {
    "coding": [
      {
        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
        "code": "197361",
        "display": "Amlodipine 5 MG Oral Tablet"
      }
    ]
  },
  "subject": { "reference": "Patient/bc-patient-001" },
  "effectivePeriod": { "start": "2023-07-01" },
  "dosage": [
    {
      "text": "Take 1 tablet by mouth daily",
      "timing": { "repeat": { "frequency": 1, "period": 1, "periodUnit": "d" } },
      "doseAndRate": [
        {
          "doseQuantity": { "value": 5, "unit": "mg", "system": "http://unitsofmeasure.org", "code": "mg" }
        }
      ]
    }
  ]
}
```

### 15.6 Immunizations

```json
{
  "resourceType": "Immunization",
  "id": "imm-001",
  "status": "completed",
  "vaccineCode": {
    "coding": [
      {
        "system": "http://hl7.org/fhir/sid/cvx",
        "code": "208",
        "display": "SARS-COV-2 (COVID-19) vaccine, mRNA, spike protein, LNP, preservative free, 30 mcg/0.3mL dose"
      }
    ]
  },
  "patient": { "reference": "Patient/bc-patient-001" },
  "occurrenceDateTime": "2024-10-15",
  "performer": [
    { "actor": { "reference": "Practitioner/nurse-williams-002" } }
  ],
  "lotNumber": "EW0182",
  "site": {
    "coding": [{ "system": "http://snomed.info/sct", "code": "368208006", "display": "Left upper arm" }]
  }
}
```

### 15.7 Procedures

```json
{
  "resourceType": "Procedure",
  "id": "proc-001",
  "status": "completed",
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "80146002",
        "display": "Excision of appendix"
      }
    ]
  },
  "subject": { "reference": "Patient/bc-patient-001" },
  "performedDateTime": "2022-08-20T14:00:00.000Z",
  "performer": [
    { "actor": { "reference": "Practitioner/dr-jones-001" } }
  ]
}
```

### 15.8 Clinical Data Portability Rules

1. All active clinical data (observations, conditions, allergies, medications, immunizations, procedures) MUST be exported.
2. Historical and resolved data SHOULD be exported for clinical completeness.
3. Clinical codes MUST use standard terminologies (LOINC, SNOMED CT, RxNorm, CVX, ICD-10, CPT).
4. Importing systems MUST preserve original clinical dates and performer references.
5. Observations referenced by `DiagnosticReport` resources MUST be included in the `clinicalData.observations` array.
6. Data marked as `entered-in-error` MUST be included with its status preserved.

---

## 16. Practice Configuration

### 16.1 Practice Configuration Export Structure

Practice configuration captures the organizational structure, physical locations, departments, and system settings that define how the practice operates.

```json
{
  "practiceConfig": {
    "organizations": [ "..." ],
    "locations": [ "..." ],
    "departments": [ "..." ],
    "settings": { "..." }
  }
}
```

### 16.2 Organizations

```json
{
  "resourceType": "Organization",
  "id": "springfield-medical",
  "identifier": [
    {
      "use": "official",
      "system": "http://hl7.org/fhir/sid/us-npi",
      "value": "1234567890"
    },
    {
      "use": "secondary",
      "system": "urn:oid:2.16.840.1.113883.4.4",
      "value": "12-3456789"
    }
  ],
  "active": true,
  "type": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/organization-type",
          "code": "prov",
          "display": "Healthcare Provider"
        }
      ]
    }
  ],
  "name": "Springfield Medical Center",
  "telecom": [
    { "system": "phone", "value": "+1-555-555-0001", "use": "work" }
  ],
  "address": [
    {
      "use": "work",
      "line": ["100 Medical Drive"],
      "city": "Springfield",
      "state": "IL",
      "postalCode": "62701"
    }
  ]
}
```

### 16.3 Locations

```json
{
  "resourceType": "Location",
  "id": "exam-room-1",
  "status": "active",
  "name": "Exam Room 1",
  "description": "First floor examination room",
  "type": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
          "code": "HOSP",
          "display": "Hospital"
        }
      ]
    }
  ],
  "physicalType": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/location-physical-type",
        "code": "ro",
        "display": "Room"
      }
    ]
  },
  "managingOrganization": { "reference": "Organization/springfield-medical" }
}
```

### 16.4 Departments

Departments are represented as `Organization` resources with a `partOf` reference to the parent organization:

```json
{
  "resourceType": "Organization",
  "id": "dept-cardiology",
  "active": true,
  "name": "Cardiology Department",
  "partOf": { "reference": "Organization/springfield-medical" }
}
```

### 16.5 System Settings

Practice-specific configuration settings are exported as a key-value map in the `practiceConfig.settings` field. These are non-FHIR data and are specific to the source system:

```json
{
  "settings": {
    "defaultAppointmentDuration": 30,
    "defaultTimezone": "America/Chicago",
    "autoSaveInterval": 60,
    "requireTwoFactorAuth": true,
    "patientPortalEnabled": true,
    "defaultLanguage": "en-US",
    "fiscalYearStart": "01-01",
    "claimSubmissionMode": "electronic"
  }
}
```

Importing systems SHOULD attempt to map recognized settings to their local configuration. Unrecognized settings MUST be preserved in the import metadata for manual review.

### 16.6 Practice Configuration Portability Rules

1. The primary organization record MUST be exported.
2. All active locations MUST be exported.
3. Department hierarchy (via `partOf` references) MUST be preserved.
4. Organization NPI numbers MUST be included when available.
5. System settings are OPTIONAL and system-specific. Importing systems are NOT REQUIRED to apply them.

---

## 17. Templates and Forms

### 17.1 Template Export Structure

Clinical templates, custom forms, and document templates are exported as FHIR R4 `Questionnaire` resources.

```json
{
  "resourceType": "Questionnaire",
  "id": "template-intake-form",
  "status": "active",
  "name": "NewPatientIntakeForm",
  "title": "New Patient Intake Form",
  "date": "2024-06-01",
  "publisher": "Springfield Medical Center",
  "description": "Standard intake form for new patients",
  "item": [
    {
      "linkId": "1",
      "text": "Chief Complaint",
      "type": "text",
      "required": true
    },
    {
      "linkId": "2",
      "text": "Current Medications",
      "type": "text",
      "required": false,
      "repeats": true
    },
    {
      "linkId": "3",
      "text": "Allergies",
      "type": "group",
      "item": [
        {
          "linkId": "3.1",
          "text": "Substance",
          "type": "string",
          "required": true
        },
        {
          "linkId": "3.2",
          "text": "Reaction",
          "type": "string"
        },
        {
          "linkId": "3.3",
          "text": "Severity",
          "type": "choice",
          "answerOption": [
            { "valueCoding": { "code": "mild", "display": "Mild" } },
            { "valueCoding": { "code": "moderate", "display": "Moderate" } },
            { "valueCoding": { "code": "severe", "display": "Severe" } }
          ]
        }
      ]
    },
    {
      "linkId": "4",
      "text": "Do you smoke?",
      "type": "boolean"
    }
  ]
}
```

### 17.2 Document Templates

Non-form document templates (e.g., letter templates, report templates) are exported as `DocumentReference` resources with `contentType` indicating the template format:

```json
{
  "resourceType": "DocumentReference",
  "id": "template-referral-letter",
  "status": "current",
  "type": {
    "coding": [
      {
        "system": "http://brightchart.org/fhir/CodeSystem/document-type",
        "code": "template",
        "display": "Document Template"
      }
    ]
  },
  "description": "Standard referral letter template",
  "content": [
    {
      "attachment": {
        "contentType": "text/html",
        "data": "<base64-encoded-template>",
        "title": "Referral Letter Template"
      }
    }
  ]
}
```

### 17.3 Templates Portability Rules

1. All active templates and forms MUST be exported.
2. Retired templates SHOULD be exported with their status preserved.
3. `Questionnaire` items MUST preserve their `linkId` values for response mapping.
4. Importing systems MUST preserve template structure even if they cannot render all item types.
5. Custom answer option sets MUST be included inline (not by external reference).

---

## 18. Encryption

### 18.1 Encryption is Optional

Export bundles MAY be encrypted or unencrypted. Both forms are valid conforming bundles. The decision to encrypt is left to the exporting practice based on their security requirements and transfer method.

- **Unencrypted bundles**: Valid JSON conforming to the `IBrightChartExportBundle` schema. Suitable for transfers over already-secured channels (e.g., TLS-encrypted direct connections, encrypted storage media).
- **Encrypted bundles**: Wrapped in an encryption envelope using open-standard algorithms. REQUIRED when transferring over untrusted channels.

### 18.2 Encryption Algorithms

When encryption is used, it MUST use one of the following open-standard algorithms:

| Algorithm | Use Case | Standard |
|-----------|----------|----------|
| **AES-256-GCM** | Symmetric encryption of bundle content | NIST SP 800-38D |
| **ECIES** (with AES-256-GCM) | Asymmetric encryption for key exchange | IEEE 1363a / SECG SEC 1 |
| **RSA-OAEP** (with AES-256-GCM) | Alternative asymmetric encryption | PKCS#1 v2.2 / RFC 8017 |

Proprietary or non-standard encryption algorithms MUST NOT be used.

### 18.3 Encrypted Bundle Envelope

When a bundle is encrypted, it MUST be wrapped in the following JSON envelope:

```json
{
  "format": "brightchart-export-encrypted",
  "version": "2.0.0",
  "encryption": {
    "algorithm": "ECIES-AES-256-GCM",
    "ephemeralPublicKey": "<base64-encoded>",
    "iv": "<base64-encoded>",
    "authTag": "<base64-encoded>",
    "keyDerivation": "HKDF-SHA256"
  },
  "ciphertext": "<base64-encoded-encrypted-bundle>"
}
```

For symmetric-only encryption (e.g., when a shared secret is pre-established):

```json
{
  "format": "brightchart-export-encrypted",
  "version": "2.0.0",
  "encryption": {
    "algorithm": "AES-256-GCM",
    "iv": "<base64-encoded>",
    "authTag": "<base64-encoded>"
  },
  "ciphertext": "<base64-encoded-encrypted-bundle>"
}
```

### 18.4 Key Exchange

When asymmetric encryption is used, systems MUST establish trust through one of:

1. **Direct Key Exchange**: Systems exchange public keys through a secure out-of-band channel.
2. **BrightChain Member Directory**: If both systems participate in the same BrightChain network, public keys are available through the member store (`IMemberStore`).
3. **Certificate Authority**: Systems MAY use X.509 certificates issued by a mutually trusted CA.

### 18.5 Signature Verification

1. Each audit log entry contains a `signature` field — a cryptographic signature from the operating member's key pair.
2. Importing systems SHOULD verify audit entry signatures against the source system's member public keys when available.
3. Signature verification failure MUST be logged but MUST NOT prevent import.

### 18.6 Encryption Portability Rules

1. Encrypted bundles MUST use the envelope format specified in §18.3.
2. The `encryption.algorithm` field MUST identify the exact algorithm used.
3. Importing systems MUST support at least AES-256-GCM decryption.
4. Importing systems SHOULD support ECIES decryption.
5. The decrypted content MUST be a valid `IBrightChartExportBundle` JSON document.
6. Implementations MUST NOT require encryption — unencrypted bundles are valid.

---

## 19. Import and Export Procedures

### 19.1 Export Procedure

An exporting system MUST perform the following steps:

1. **Authorization Check**: Verify the requesting member holds `patient:admin` permission (or equivalent system-level authorization) for the data being exported.
2. **Patient Collection**: Retrieve all requested `IPatientResource` records, decrypting each as necessary.
3. **Practitioner Collection**: Retrieve all `Practitioner` records and their associated `IHealthcareRole` definitions.
4. **Access Policy Collection**: Retrieve all `IPatientACL` entries and SMART scope assignments.
5. **Clinical Notes Collection**: Retrieve all `DocumentReference` and `Composition` resources for exported patients.
6. **Audit Trail Collection**: For each patient, retrieve the complete hash-linked chain of `IAuditLogEntry` records.
7. **Scheduling Collection**: Retrieve all `Appointment`, `Schedule`, and `Slot` resources.
8. **Orders and Results Collection**: Retrieve all `ServiceRequest` and `DiagnosticReport` resources with associated `Observation` resources.
9. **Billing Collection**: Retrieve all `ChargeItem`, `Claim`, and `Coverage` resources.
10. **Clinical Data Collection**: Retrieve all `Observation`, `Condition`, `AllergyIntolerance`, `MedicationStatement`, `Immunization`, and `Procedure` resources.
11. **Configuration Collection**: Retrieve `Organization`, `Location`, and system settings.
12. **Template Collection**: Retrieve all `Questionnaire` and template `DocumentReference` resources.
13. **Bundle Assembly**: Construct an `IBrightChartExportBundle` with all collected data, setting `version` to `"2.0.0"`, `exportDate` to the current timestamp, and `sourceSystem` to the exporting system's identifier.
14. **Optional Encryption**: If required, encrypt the bundle per §18.
15. **Audit Logging**: Create audit log entries recording the export operation.

### 19.2 Import Procedure

An importing system MUST perform the following steps:

1. **Bundle Decryption**: If the bundle is encrypted, decrypt it per §18.
2. **Version Validation**: Verify the bundle's `version` field is supported (see §20).
3. **Schema Validation**: Validate the bundle structure against the export bundle schema (Appendix B).
4. **Reference Inventory**: Build a complete map of all resource IDs in the bundle for reference resolution.
5. **Organization Import**: Import practice configuration first (organizations, locations, departments) to establish the organizational context.
6. **Practitioner Import**: Import staff records, matching by NPI or other official identifiers.
7. **Role Import**: Import healthcare role definitions, mapping SNOMED CT codes to local role assignments.
8. **Patient Import**: For each patient:
   a. Run MPI duplicate detection against existing records.
   b. If a `certain` match (score ≥ 0.95) is found, flag for manual review.
   c. Otherwise, create a new patient record preserving all source identifiers.
9. **Access Policy Import**: Map imported ACLs to local member identities. Mark unresolvable members as `unresolved`.
10. **Clinical Data Import**: Import observations, conditions, allergies, medications, immunizations, and procedures.
11. **Clinical Notes Import**: Import all document references and compositions.
12. **Orders and Results Import**: Import service requests and diagnostic reports.
13. **Scheduling Import**: Import appointments and schedules.
14. **Billing Import**: Import charge items, claims, and coverage records.
15. **Template Import**: Import questionnaires and document templates.
16. **Audit Trail Import**: Import audit trail entries preserving hash-chain links. Append import audit entries.
17. **Reference Resolution**: Update all internal references from source IDs to local IDs using the mapping table.
18. **Validation Report**: Generate an import report indicating counts of imported resources, duplicates flagged, unresolved references, and any errors.

### 19.3 Conflict Resolution

When importing data that conflicts with existing local data:

1. **Patient Conflicts**: Compare `meta.versionId` values. The higher version takes precedence per field. Conflicting field values are flagged for manual resolution.
2. **Practitioner Conflicts**: Match by NPI. If matched, merge qualification and role data. Conflicting demographic fields are flagged.
3. **Clinical Data Conflicts**: Clinical data is additive — imported records are added alongside existing records. Exact duplicates (same identifier, same date, same values) MAY be deduplicated.
4. **Audit Trail Merging**: Audit entries from both systems are merged chronologically. Hash-chain links from each source are preserved independently.

### 19.4 Validation and Integrity Checking

Importing systems MUST perform the following validation:

1. **Schema Validation**: Every resource MUST have a valid `resourceType` field.
2. **Reference Integrity**: All internal references MUST resolve to resources within the bundle or to resources already in the local system.
3. **Audit Chain Integrity**: For each patient's audit trail, verify the `previousEntryBlockId` chain is complete (no gaps).
4. **Signature Verification**: If source system public keys are available, verify audit entry signatures. Log failures but do not block import.
5. **Date Validation**: All date and dateTime fields MUST conform to FHIR R4 date formats.
6. **Code System Validation**: Clinical codes SHOULD be validated against their declared code systems (LOINC, SNOMED CT, RxNorm, etc.).

---

## 20. Versioning and Compatibility

### 20.1 Version Scheme

The standard version follows Semantic Versioning 2.0.0:

- **MAJOR** version: Incompatible changes to the bundle format or data model.
- **MINOR** version: Backward-compatible additions (new optional fields, new resource types, new role codes).
- **PATCH** version: Backward-compatible clarifications or corrections to the specification text.

The current version is `2.0.0`.

### 20.2 Compatibility Rules

1. **Forward Compatibility**: An implementation supporting version `X.Y.Z` MUST be able to read bundles with version `X.Y'.Z'` where `Y' >= Y`, by ignoring unrecognized optional fields.
2. **Backward Compatibility**: An implementation supporting version `X.Y.Z` MUST be able to read bundles with version `X.Y'.Z'` where `Y' <= Y`, as older bundles are a subset of the current schema.
3. **Major Version Breaks**: Bundles with a different MAJOR version number MAY be incompatible. Implementations SHOULD reject bundles with an unsupported MAJOR version and return a descriptive error.
4. **Unknown Fields**: Implementations MUST preserve unrecognized fields in the `metadata` object and in FHIR `extension` arrays during import, ensuring no data loss for fields introduced in newer minor versions.
5. **v1.0 Compatibility**: Version 2.0 implementations MUST be able to read version 1.0 bundles. The v1.0 fields (`patients`, `auditTrail`, `accessPolicies`, `roles`, `metadata`) are a strict subset of v2.0.

### 20.3 Migration Path

When a new MAJOR version is released:

1. The specification document MUST include a migration guide detailing all breaking changes.
2. Implementations SHOULD support reading the previous MAJOR version for a transition period of at least 24 months.
3. Export bundles SHOULD include a `metadata.legacyVersion` field if the bundle was converted from an older format.

---

## 21. Interoperability

### 21.1 Epic Interoperability via FHIR R4 USCDI APIs

BrightChart is designed for interoperability with Epic and other EHR systems that expose FHIR R4 APIs conforming to the US Core Data for Interoperability (USCDI) standard.

#### 21.1.1 FHIR R4 Patient Resource Mapping

The `IPatientResource` data model maps directly to the [US Core Patient Profile](http://hl7.org/fhir/us/core/StructureDefinition-us-core-patient.html):

| BrightChart Field | US Core Patient Profile | Epic FHIR R4 API |
|-------------------|------------------------|-------------------|
| `identifier` | `Patient.identifier` | Supported (MRN, SSN, etc.) |
| `name` | `Patient.name` | Supported (official, usual) |
| `telecom` | `Patient.telecom` | Supported (phone, email) |
| `gender` | `Patient.gender` | Supported (required) |
| `birthDate` | `Patient.birthDate` | Supported (required) |
| `address` | `Patient.address` | Supported |
| `communication` | `Patient.communication` | Supported |
| `race` (extension) | US Core Race Extension | Supported via extension |
| `ethnicity` (extension) | US Core Ethnicity Extension | Supported via extension |

#### 21.1.2 Import from Epic

To import patient data from an Epic system:

1. Authenticate using SMART on FHIR v2 authorization (OAuth 2.0 with PKCE).
2. Query the Epic FHIR R4 endpoint: `GET /Patient?_id={id}` or `GET /Patient?name={name}&birthdate={date}`.
3. Map the returned FHIR R4 Patient JSON to an `IPatientResource`, populating `brightchainMetadata` with local storage details.
4. For clinical data, query additional endpoints: `GET /Condition?patient={id}`, `GET /Observation?patient={id}`, `GET /AllergyIntolerance?patient={id}`, etc.
5. Store all imported resources in the local system.
6. Create audit log entries recording the import source as the Epic system identifier.

#### 21.1.3 Export to Epic

To export patient data to an Epic system (where the Epic system supports FHIR R4 write operations):

1. Serialize resources to standard FHIR R4 JSON, omitting BrightChain-specific extensions.
2. Submit via `POST /{ResourceType}` (create) or `PUT /{ResourceType}/{id}` (update) to the Epic FHIR R4 endpoint.
3. Preserve the Epic-assigned `id` in the local resource's `identifier` array for future reference.

#### 21.1.4 Epic Resource Coverage

| Resource Type | Epic FHIR R4 Support | BrightChart Bundle Field |
|--------------|---------------------|-------------------------|
| Patient | Read/Write | `patients` |
| Practitioner | Read | `practitioners` |
| Condition | Read/Write | `clinicalData.conditions` |
| Observation | Read/Write | `clinicalData.observations` |
| AllergyIntolerance | Read/Write | `clinicalData.allergies` |
| MedicationStatement | Read | `clinicalData.medications` |
| Immunization | Read/Write | `clinicalData.immunizations` |
| Procedure | Read | `clinicalData.procedures` |
| Appointment | Read/Write | `schedules` |
| DocumentReference | Read | `clinicalNotes` |
| DiagnosticReport | Read | `diagnosticReports` |

### 21.2 C-CDA Clinical Document Exchange

BrightChart supports C-CDA for clinical document exchange with systems that do not support FHIR R4.

#### 21.2.1 C-CDA Patient Demographics Mapping

| BrightChart Field | C-CDA XPath | Notes |
|-------------------|-------------|-------|
| `identifier` | `recordTarget/patientRole/id` | `@root` = system URI, `@extension` = value |
| `name` | `recordTarget/patientRole/patient/name` | Maps to `given`, `family`, `prefix`, `suffix` |
| `gender` | `recordTarget/patientRole/patient/administrativeGenderCode` | HL7 AdministrativeGender value set |
| `birthDate` | `recordTarget/patientRole/patient/birthTime` | HL7 TS format (YYYYMMDD) |
| `address` | `recordTarget/patientRole/addr` | Maps to `streetAddressLine`, `city`, `state`, `postalCode`, `country` |
| `telecom` | `recordTarget/patientRole/telecom` | `@value` = tel: or mailto: URI |

#### 21.2.2 C-CDA Section Mapping

| C-CDA Section | LOINC Code | BrightChart Source |
|--------------|------------|-------------------|
| Allergies | 48765-2 | `clinicalData.allergies` |
| Medications | 10160-0 | `clinicalData.medications` |
| Problems | 11450-4 | `clinicalData.conditions` |
| Procedures | 47519-4 | `clinicalData.procedures` |
| Results | 30954-2 | `diagnosticReports` |
| Vital Signs | 8716-3 | `clinicalData.observations` (vital-signs category) |
| Immunizations | 11369-6 | `clinicalData.immunizations` |

### 21.3 Bulk Data Export (FHIR Bulk Data Access)

For large-scale data exchange, implementations SHOULD support the [FHIR Bulk Data Access](http://hl7.org/fhir/uv/bulkdata/) specification:

1. Initiate a bulk export via `GET /$export?_type=Patient,Condition,Observation,...`.
2. Poll the status endpoint until the export is complete.
3. Download the resulting NDJSON files.
4. Convert NDJSON resources to `IBrightChartExportBundle` format.

---

## 22. 21st Century Cures Act Compliance

### 22.1 Overview

The 21st Century Cures Act (Public Law 114-255), with the ONC Final Rule effective April 2021, mandates that healthcare providers make patient data available through standardized APIs and prohibits information blocking. This standard is designed to support compliance.

### 22.2 Information Blocking Provisions

The Cures Act defines information blocking as practices likely to interfere with access, exchange, or use of electronic health information (EHI). BrightChart addresses this through:

1. **Standardized API Access**: The FHIR R4 data model and SMART on FHIR v2 authorization framework align with ONC-mandated API requirements.
2. **Patient Access**: Patients are first-class members with the `PATIENT` role code (`116154003`). They access their own records through `patient/Patient.r` SMART scopes.
3. **Export Without Restriction**: The export procedure enables authorized users to export complete practice data. No artificial barriers are imposed.
4. **Standard Formats**: Export bundles use FHIR R4 JSON. C-CDA export provides an alternative for non-FHIR systems.
5. **No Vendor Lock-In**: The entire standard uses open formats and open-standard encryption. No proprietary libraries are required.

### 22.3 USCDI Data Class Coverage

| USCDI Data Class | USCDI Data Element | BrightChart Coverage |
|-----------------|-------------------|---------------------|
| Patient Demographics | First Name | `IPatientResource.name[].given` |
| Patient Demographics | Last Name | `IPatientResource.name[].family` |
| Patient Demographics | Previous Name | `IPatientResource.name[]` with `use: "old"` |
| Patient Demographics | Suffix | `IPatientResource.name[].suffix` |
| Patient Demographics | Date of Birth | `IPatientResource.birthDate` |
| Patient Demographics | Sex | `IPatientResource.gender` |
| Patient Demographics | Race | Via FHIR US Core Race Extension |
| Patient Demographics | Ethnicity | Via FHIR US Core Ethnicity Extension |
| Patient Demographics | Preferred Language | `IPatientResource.communication[]` |
| Patient Demographics | Address | `IPatientResource.address[]` |
| Patient Demographics | Phone Number | `IPatientResource.telecom[]` with `system: "phone"` |
| Patient Demographics | Email Address | `IPatientResource.telecom[]` with `system: "email"` |
| Allergies & Intolerances | Substance | `clinicalData.allergies` |
| Medications | Medications | `clinicalData.medications` |
| Problems | Health Concerns | `clinicalData.conditions` |
| Procedures | Procedures | `clinicalData.procedures` |
| Immunizations | Immunizations | `clinicalData.immunizations` |
| Vital Signs | Vital Signs | `clinicalData.observations` |
| Laboratory | Tests, Values | `diagnosticReports`, `clinicalData.observations` |
| Clinical Notes | Notes | `clinicalNotes` |

### 22.4 Patient Right of Access

1. Patients with the `PATIENT` role and `patient:read` permission can retrieve their own records via FHIR R4 Patient Access APIs.
2. The practice migration export (this standard) is for practice-to-practice transfer, not patient-facing. Patient access is handled through standard FHIR R4 APIs.
3. Export bundles include audit trails, enabling practices to demonstrate compliance with access logging requirements.

---

## 23. Multi-Specialty Support

### 23.1 Medical Practices

Medical practices are the primary use case. The full FHIR R4 resource model supports all standard medical demographics, identifiers (MRN, SSN, insurance ID, NPI), and practitioner role codes.

#### 23.1.1 Medical-Specific Identifiers

```json
{
  "identifier": [
    { "use": "official", "system": "http://hospital.example.org/mrn", "value": "MRN-12345" },
    { "use": "secondary", "system": "http://hl7.org/fhir/sid/us-ssn", "value": "999-99-9999" },
    { "use": "usual", "system": "http://insurance.example.org/member-id", "value": "INS-ABC-789" }
  ]
}
```

### 23.2 Dental Practices

Dental practices use the same resource model with dental-specific role codes, identifiers, and procedure codes (CDT codes).

#### 23.2.1 Dental Role Codes

| Role | SNOMED CT Code | Constant |
|------|---------------|----------|
| Dentist | `106289002` | `DENTIST` |
| Registered Nurse (Dental) | `224535009` | `REGISTERED_NURSE` |
| Clinical Administrator | `394572006` | `ADMIN` |

#### 23.2.2 Dental-Specific Identifiers

```json
{
  "identifier": [
    { "use": "official", "system": "http://dental-clinic.example.org/patient-id", "value": "DENT-2025-001" },
    { "use": "secondary", "system": "http://dental-insurance.example.org/plan-id", "value": "DELTA-PPO-12345" }
  ]
}
```

#### 23.2.3 Dental Procedure Codes

Dental procedures use CDT (Current Dental Terminology) codes:

```json
{
  "resourceType": "Procedure",
  "code": {
    "coding": [
      {
        "system": "http://www.ada.org/cdt",
        "code": "D0120",
        "display": "Periodic oral evaluation - established patient"
      }
    ]
  }
}
```

### 23.3 Veterinary Practices

Veterinary practices present unique requirements: the "patient" is an animal, and the "owner" is a human contact.

#### 23.3.1 Veterinary Role Codes

| Role | SNOMED CT Code | Constant |
|------|---------------|----------|
| Veterinarian | `106290006` | `VETERINARIAN` |
| Clinical Administrator | `394572006` | `ADMIN` |

#### 23.3.2 Veterinary Patient Example

```json
{
  "resourceType": "Patient",
  "id": "vet-patient-max-001",
  "identifier": [
    { "use": "official", "system": "http://vet-clinic.example.org/patient-id", "value": "VET-2025-0042" },
    { "use": "secondary", "system": "http://microchip.example.org/avid", "value": "985112345678901" },
    { "use": "secondary", "system": "http://county.example.org/rabies-tag", "value": "RT-2025-5678" }
  ],
  "active": true,
  "name": [{ "use": "usual", "given": ["Max"] }],
  "gender": "male",
  "birthDate": "2020-03",
  "contact": [
    {
      "relationship": [
        { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v2-0131", "code": "C", "display": "Emergency Contact" }], "text": "Owner" }
      ],
      "name": { "use": "official", "family": "Johnson", "given": ["Emily"] },
      "telecom": [{ "system": "phone", "value": "+1-555-555-0200", "use": "mobile" }],
      "address": { "use": "home", "line": ["456 Oak Avenue"], "city": "Springfield", "state": "IL", "postalCode": "62702" }
    }
  ],
  "extension": [
    {
      "url": "http://brightchart.org/fhir/StructureDefinition/animal-species",
      "valueCodeableConcept": {
        "coding": [{ "system": "http://snomed.info/sct", "code": "448771007", "display": "Domestic dog" }]
      }
    },
    {
      "url": "http://brightchart.org/fhir/StructureDefinition/animal-breed",
      "valueCodeableConcept": {
        "coding": [{ "system": "http://snomed.info/sct", "code": "132636007", "display": "Golden Retriever" }]
      }
    }
  ]
}
```

### 23.4 Cross-Specialty Transfer

When transferring records between specialties (e.g., a veterinary clinic referring an animal patient's owner to a medical practice), the export bundle includes role definitions from the source specialty. The importing system maps source roles to its own role hierarchy using SNOMED CT codes as the common vocabulary.

---

## 24. Conformance Criteria

### 24.1 Conformance Levels

This standard defines three conformance levels:

| Level | Name | Requirements |
|-------|------|-------------|
| 1 | **Core** | Patient records, practitioners, roles. Basic import/export. |
| 2 | **Extended** | Core + audit trails, access policies, clinical data, clinical notes, scheduling, orders/results. |
| 3 | **Full** | Extended + billing, practice configuration, templates, optional encryption, Epic FHIR R4 interoperability, C-CDA generation. |

### 24.2 Core Conformance (Level 1)

A system claiming Core conformance MUST:

1. Produce valid `IBrightChartExportBundle` JSON with correct `version`, `exportDate`, `sourceSystem`, and at least one entry in the `patients` array.
2. Include `practitioners` and `roles` arrays with all staff associated with exported patients.
3. Serialize all resources with their populated FHIR R4 fields, omitting `undefined`/`null` fields.
4. Include `resourceType` on every resource.
5. Format date fields according to FHIR R4 rules (§5.5).
6. Parse and import `IBrightChartExportBundle` JSON, creating local records from the bundle.
7. Perform duplicate detection during patient import and flag potential matches for review.
8. Support the `version` field and reject bundles with unsupported MAJOR versions.
9. Preserve all source identifiers during import.
10. Generate an import validation report.

### 24.3 Extended Conformance (Level 2)

A system claiming Extended conformance MUST meet all Core requirements and additionally:

1. Export and import `auditTrail` entries, preserving the hash-linked chain structure.
2. Export and import `accessPolicies` and `smartScopes`, mapping member identifiers to local identities where possible.
3. Export and import `clinicalData` (observations, conditions, allergies, medications, immunizations, procedures).
4. Export and import `clinicalNotes` (document references and compositions).
5. Export and import `schedules` (appointments, schedules, slots).
6. Export and import `orders` and `diagnosticReports`.
7. Preserve the `metadata` object during import without data loss.
8. Create audit log entries for all import and export operations.
9. Perform reference integrity validation during import.

### 24.4 Full Conformance (Level 3)

A system claiming Full conformance MUST meet all Extended requirements and additionally:

1. Export and import `billing` data (charge items, claims, coverage, fee schedules).
2. Export and import `practiceConfig` (organizations, locations, departments, settings).
3. Export and import `templates` (questionnaires and document templates).
4. Support optional bundle encryption using AES-256-GCM and ECIES (§18).
5. Verify ECIES signatures on imported audit log entries when source system public keys are available.
6. Support import from Epic FHIR R4 APIs via SMART on FHIR v2 authorization.
7. Support export to Epic FHIR R4 APIs (where the Epic system supports write operations).
8. Generate C-CDA document headers containing patient demographics.
9. Support FHIR Bulk Data Access for large-scale import/export.

### 24.5 Conformance Testing

Implementations SHOULD validate conformance using the following test procedures:

1. **Round-Trip Test**: Export practice data, import into a second system, export from the second system, and verify semantic equivalence.
2. **Duplicate Detection Test**: Import a bundle containing a patient that already exists and verify the duplicate is flagged.
3. **Version Compatibility Test**: Import bundles with older MINOR versions and verify no data loss.
4. **Reference Integrity Test**: Import a bundle and verify all internal references resolve correctly.
5. **Encryption Test** (Level 3): Encrypt a bundle, transmit, decrypt, and verify content matches the original.
6. **Audit Chain Integrity Test**: Import a bundle with audit trail entries and verify the hash-linked chain is intact.
7. **Cross-Specialty Test**: Import a bundle from a different specialty (e.g., dental into medical) and verify role mapping.

---

## 25. Security Considerations

### 25.1 Data Classification

All practice data handled by this standard is classified as Protected Health Information (PHI) under HIPAA. Implementations MUST:

1. Encrypt patient data at rest using AES-256-GCM or equivalent.
2. Encrypt patient data in transit using TLS 1.2 or higher.
3. When encrypting export bundles, use only open-standard algorithms (§18).
4. Never persist plaintext patient data to logs or temporary files.

### 25.2 Access Control

1. Export operations MUST require `patient:admin` permission or equivalent system-level authorization.
2. Import operations MUST require `patient:admin` permission on the target system.
3. All access control decisions MUST be logged in the audit trail.
4. Unresolved member references in imported ACLs MUST NOT be granted access.

### 25.3 Audit and Accountability

1. Every export and import operation MUST generate audit log entries.
2. Audit entries MUST be cryptographically signed by the operating member.
3. Audit chains MUST be append-only and tamper-evident.
4. Systems MUST retain audit logs for the duration required by applicable regulations (minimum 6 years under HIPAA).

### 25.4 Key Management

1. Cryptographic key pairs MUST be generated using cryptographically secure random number generators.
2. Private keys MUST never be included in export bundles.
3. Key rotation SHOULD be supported.
4. Compromised keys MUST be revocable.

### 25.5 Bundle Transfer Security

1. Bundles transferred over networks MUST use TLS 1.2 or higher.
2. Bundles stored on removable media SHOULD be encrypted (§18).
3. Bundles SHOULD be deleted from temporary storage after successful import.
4. Systems SHOULD log all bundle transfers including source, destination, timestamp, and bundle ID.

---

## 26. References

1. HL7 FHIR R4 Patient Resource. https://build.fhir.org/patient.html
2. HL7 FHIR R4 Datatypes. https://build.fhir.org/datatypes.html
3. HL7 US Core Patient Profile. http://hl7.org/fhir/us/core/StructureDefinition-us-core-patient.html
4. SMART on FHIR v2 Scopes. https://www.hl7.org/fhir/us/core/scopes.html
5. FHIR PractitionerRole Resource. https://build.fhir.org/practitionerrole.html
6. SNOMED CT Browser. https://browser.ihtsdotools.org/
7. Epic FHIR R4 Design Overview. https://open.epic.com/DesignOverview
8. 21st Century Cures Act (Public Law 114-255). https://www.congress.gov/bill/114th-congress/house-bill/34
9. ONC 21st Century Cures Act Final Rule. https://www.healthit.gov/curesrule/
10. United States Core Data for Interoperability (USCDI). https://www.healthit.gov/isa/united-states-core-data-interoperability-uscdi
11. HL7 C-CDA (Consolidated Clinical Document Architecture). http://www.hl7.org/implement/standards/product_brief.cfm?product_id=492
12. FHIR Bulk Data Access. http://hl7.org/fhir/uv/bulkdata/
13. Semantic Versioning 2.0.0. https://semver.org/
14. BrightChain Platform Specification. See `docs/papers/brightchain.md`
15. ECIES (Elliptic Curve Integrated Encryption Scheme). See `docs/papers/ecies-lib.md`
16. RFC 2119 — Key words for use in RFCs. https://www.rfc-editor.org/rfc/rfc2119
17. NIST SP 800-38D — Recommendation for Block Cipher Modes of Operation: GCM. https://csrc.nist.gov/publications/detail/sp/800-38d/final
18. FHIR R4 Practitioner Resource. https://build.fhir.org/practitioner.html
19. FHIR R4 Appointment Resource. https://build.fhir.org/appointment.html
20. FHIR R4 ServiceRequest Resource. https://build.fhir.org/servicerequest.html
21. FHIR R4 DiagnosticReport Resource. https://build.fhir.org/diagnosticreport.html
22. FHIR R4 Claim Resource. https://build.fhir.org/claim.html
23. FHIR R4 Questionnaire Resource. https://build.fhir.org/questionnaire.html
24. FHIR R4 DocumentReference Resource. https://build.fhir.org/documentreference.html

---

## Appendix A: TypeScript Interface Reference

The normative TypeScript interfaces for the v1.0 data categories are defined in the `brightchart-lib` package. The v2.0 resource types (clinical notes, scheduling, orders, billing, clinical data, practice config, templates) will be defined in future `brightchart-lib` modules as the implementation progresses.

### A.1 Currently Implemented Interfaces (v1.0 Core)

| Interface | Source File | Section |
|-----------|------------|---------|
| `IPatientResource<TID>` | `brightchart-lib/src/lib/fhir/patientResource.ts` | §7.1 |
| `IBrightchainMetadata<TID>` | `brightchart-lib/src/lib/fhir/patientResource.ts` | §7.1.2 |
| `IBrightChartExportBundle<TID>` | `brightchart-lib/src/lib/portability/portabilityTypes.ts` | §6.1 |
| `IAuditLogEntry<TID>` | `brightchart-lib/src/lib/audit/auditLog.ts` | §11.1 |
| `IPatientACL<TID>` | `brightchart-lib/src/lib/access/patientAcl.ts` | §9.1 |
| `IHealthcareRole<TID>` | `brightchart-lib/src/lib/roles/healthcareRole.ts` | §8.3 |
| `PatientPermission` | `brightchart-lib/src/lib/access/patientAcl.ts` | §9.1.1 |
| `AuditOperationType` | `brightchart-lib/src/lib/audit/auditLog.ts` | §11.1 |
| FHIR R4 Datatypes | `brightchart-lib/src/lib/fhir/datatypes.ts` | §7.2 |
| FHIR R4 Enumerations | `brightchart-lib/src/lib/fhir/enumerations.ts` | §7.3 |
| SNOMED CT Role Codes | `brightchart-lib/src/lib/roles/healthcareRoleCodes.ts` | §8.4 |
| SMART Scope Types | `brightchart-lib/src/lib/scopes/smartScopes.ts` | §9.2 |

### A.2 Planned Interfaces (v2.0 Expansion)

The following interfaces will be added to `brightchart-lib` in future tasks to support the full v2.0 bundle:

| Interface | Target Module | Section |
|-----------|--------------|---------|
| `IPractitionerExport<TID>` | `brightchart-lib/src/lib/fhir/practitioner.ts` | §8 |
| `IClinicalDocument<TID>` | `brightchart-lib/src/lib/clinical/clinicalDocument.ts` | §10 |
| `IScheduleExport<TID>` | `brightchart-lib/src/lib/scheduling/scheduleTypes.ts` | §12 |
| `IOrderExport<TID>` | `brightchart-lib/src/lib/orders/orderTypes.ts` | §13 |
| `IDiagnosticReportExport<TID>` | `brightchart-lib/src/lib/orders/diagnosticTypes.ts` | §13 |
| `IBillingExport<TID>` | `brightchart-lib/src/lib/billing/billingTypes.ts` | §14 |
| `IClinicalDataExport<TID>` | `brightchart-lib/src/lib/clinical/clinicalDataTypes.ts` | §15 |
| `IPracticeConfigExport` | `brightchart-lib/src/lib/config/practiceConfig.ts` | §16 |
| `ITemplateExport` | `brightchart-lib/src/lib/templates/templateTypes.ts` | §17 |

---

## Appendix B: Complete Export Bundle JSON Schema

The following JSON Schema describes the v2.0 `IBrightChartExportBundle` structure for validation purposes:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://brightchart.org/schemas/export-bundle/v2.0.0",
  "title": "BrightChart Practice Export Bundle v2.0",
  "description": "Complete practice data export bundle for the BrightChart Practice Records Portability Standard",
  "type": "object",
  "required": ["version", "exportDate", "sourceSystem", "patients"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Standard version (semver)"
    },
    "exportDate": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of export generation"
    },
    "sourceSystem": {
      "type": "string",
      "minLength": 1,
      "description": "Identifier of the exporting system"
    },
    "patients": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["resourceType"],
        "properties": {
          "resourceType": { "type": "string", "const": "Patient" }
        }
      },
      "description": "Patient records"
    },
    "practitioners": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["resourceType", "id"],
        "properties": {
          "resourceType": { "type": "string", "const": "Practitioner" }
        }
      },
      "description": "Staff and practitioner records"
    },
    "auditTrail": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["operationType", "memberId", "timestamp", "requestId", "signature"]
      },
      "description": "Audit trail entries"
    },
    "accessPolicies": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["patientMembers"]
      },
      "description": "Access control policies"
    },
    "smartScopes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["memberId", "scopes"],
        "properties": {
          "memberId": { "type": "string" },
          "scopes": { "type": "array", "items": { "type": "string" } }
        }
      },
      "description": "SMART on FHIR v2 scope assignments"
    },
    "roles": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["roleCode", "roleDisplay"]
      },
      "description": "Healthcare role definitions"
    },
    "clinicalNotes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["resourceType", "id", "status"],
        "properties": {
          "resourceType": { "type": "string", "enum": ["DocumentReference", "Composition"] }
        }
      },
      "description": "Clinical notes and documentation"
    },
    "schedules": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["resourceType", "id"],
        "properties": {
          "resourceType": { "type": "string", "enum": ["Appointment", "Schedule", "Slot"] }
        }
      },
      "description": "Scheduling data"
    },
    "orders": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["resourceType", "id", "status", "intent"],
        "properties": {
          "resourceType": { "type": "string", "const": "ServiceRequest" }
        }
      },
      "description": "Orders and service requests"
    },
    "diagnosticReports": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["resourceType", "id", "status"],
        "properties": {
          "resourceType": { "type": "string", "const": "DiagnosticReport" }
        }
      },
      "description": "Diagnostic reports and results"
    },
    "billing": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["resourceType", "id"],
        "properties": {
          "resourceType": { "type": "string", "enum": ["ChargeItem", "Claim", "Coverage"] }
        }
      },
      "description": "Billing and claims data"
    },
    "clinicalData": {
      "type": "object",
      "properties": {
        "observations": {
          "type": "array",
          "items": { "type": "object", "required": ["resourceType"], "properties": { "resourceType": { "const": "Observation" } } }
        },
        "conditions": {
          "type": "array",
          "items": { "type": "object", "required": ["resourceType"], "properties": { "resourceType": { "const": "Condition" } } }
        },
        "allergies": {
          "type": "array",
          "items": { "type": "object", "required": ["resourceType"], "properties": { "resourceType": { "const": "AllergyIntolerance" } } }
        },
        "medications": {
          "type": "array",
          "items": { "type": "object", "required": ["resourceType"], "properties": { "resourceType": { "const": "MedicationStatement" } } }
        },
        "immunizations": {
          "type": "array",
          "items": { "type": "object", "required": ["resourceType"], "properties": { "resourceType": { "const": "Immunization" } } }
        },
        "procedures": {
          "type": "array",
          "items": { "type": "object", "required": ["resourceType"], "properties": { "resourceType": { "const": "Procedure" } } }
        }
      },
      "description": "Clinical data (observations, conditions, allergies, medications, immunizations, procedures)"
    },
    "practiceConfig": {
      "type": "object",
      "properties": {
        "organizations": { "type": "array", "items": { "type": "object" } },
        "locations": { "type": "array", "items": { "type": "object" } },
        "departments": { "type": "array", "items": { "type": "object" } },
        "settings": { "type": "object" }
      },
      "description": "Practice configuration"
    },
    "templates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["resourceType", "id"],
        "properties": {
          "resourceType": { "type": "string", "enum": ["Questionnaire", "DocumentReference"] }
        }
      },
      "description": "Clinical templates and custom forms"
    },
    "metadata": {
      "type": "object",
      "description": "Extensibility metadata"
    }
  }
}
```

---

## Appendix C: Migration Checklist

The following checklist is provided for practices migrating from one EHR system to another using this standard.

### Pre-Migration

- [ ] Verify the source system supports at least Core conformance (Level 1)
- [ ] Verify the target system supports at least Core conformance (Level 1)
- [ ] Negotiate the bundle version between source and target systems
- [ ] Establish encryption key exchange if encrypted transfer is required
- [ ] Identify a migration administrator with `patient:admin` permissions on both systems
- [ ] Schedule a maintenance window for the migration
- [ ] Back up both source and target systems

### Export Phase

- [ ] Run a test export with a small subset of patients
- [ ] Validate the test export bundle against the JSON schema (Appendix B)
- [ ] Import the test bundle into the target system and verify data integrity
- [ ] Run the full practice export
- [ ] Verify the export bundle contains all expected data categories
- [ ] If encrypting, verify the target system can decrypt the bundle

### Import Phase

- [ ] Import the bundle into the target system
- [ ] Review the import validation report
- [ ] Resolve any flagged duplicate patients
- [ ] Map unresolved member references to local identities
- [ ] Verify practitioner records and role assignments
- [ ] Spot-check clinical data for a sample of patients
- [ ] Verify audit trail chain integrity
- [ ] Verify scheduling data imported correctly
- [ ] Verify billing data imported correctly

### Post-Migration

- [ ] Run conformance tests (§24.5) on the imported data
- [ ] Verify all staff can access the target system with correct permissions
- [ ] Verify patient portal access (if applicable)
- [ ] Archive the export bundle securely
- [ ] Document the migration in both systems' audit trails
- [ ] Decommission the source system (when ready)

---

*This document is part of the BrightChart Open Standard series. For questions, contributions, or conformance certification, contact Digital Defiance at jessica@digitaldefiance.org.*
