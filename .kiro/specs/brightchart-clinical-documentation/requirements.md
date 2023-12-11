# Requirements Document: BrightChart Clinical Documentation

## Introduction

This module establishes the Clinical Documentation layer for BrightChart — the FHIR R4-compliant clinical note authoring, document management, and signing system. It builds on Module 1 (Core Patient Identity), Module 2 (Clinical Data Foundation), and Module 3 (Encounter Management), enabling clinicians to write structured clinical notes against encounters for patients, attach and manage documents, sign/attest completed notes, and generate/consume C-CDA documents for interoperability.

Clinical documentation is the narrative heart of the EHR — the SOAP notes, H&P reports, progress notes, discharge summaries, and procedure notes that clinicians author during and after encounters. This module uses two complementary FHIR R4 resources:

- **Composition**: A structured clinical document with typed sections (Subjective, Objective, Assessment, Plan, etc.), linked to a patient, encounter, and author. This is the primary resource for clinical note authoring.
- **DocumentReference**: Metadata about any document (scanned paper, PDFs, images, C-CDA XML, external lab reports) with content attachments. This is the primary resource for document management and external document ingestion.

The Specialty Adapter Layer from Module 2 extends into documentation: medical notes use standard LOINC document type codes, dental notes add odontogram/tooth chart section types and CDT procedure documentation, and veterinary notes add species-specific templates and herd health documentation.

The implementation spans:
- **brightchart-lib**: Shared FHIR R4 Composition and DocumentReference interfaces, note template system, document signing/attestation types, document store and search interfaces, C-CDA generation/consumption types, and specialty documentation extensions (browser-compatible)
- **brightchart-react-components**: React UI components for clinical note editor, document list, document viewer, and note template selector

## Glossary

- **Clinical_Note**: A FHIR R4 Composition resource representing a structured clinical document (SOAP note, H&P, progress note, discharge summary, procedure note) authored by a clinician during or after an encounter.
- **Document_Reference**: A FHIR R4 DocumentReference resource providing metadata about a document of any kind (clinical note, scanned paper, PDF, image, C-CDA, external report) with content attachments.
- **Note_Template**: A predefined Composition structure defining the sections, section codes, and default content for a specific note type (e.g., SOAP note template has Subjective, Objective, Assessment, Plan sections).
- **Document_Store**: The BrightChain block store pool dedicated to persisting encrypted Composition and DocumentReference records.
- **Document_Serializer**: The component responsible for serializing Composition and DocumentReference objects to FHIR-compliant JSON.
- **Document_Search_Engine**: The component responsible for indexing and querying document fields using hashed indexes.
- **Attestation**: The act of a clinician signing/authenticating a clinical note, recorded as a CompositionAttester entry with mode (personal, professional, legal, official), timestamp, and signer reference.
- **Note_Status**: The workflow status of a Composition: preliminary (in-progress draft), final (signed/attested), amended (modified after signing), entered-in-error.
- **C-CDA**: Consolidated Clinical Document Architecture — the HL7 standard for clinical document exchange using XML, required for interoperability under the 21st Century Cures Act.
- **LOINC_Document_Type**: LOINC codes identifying document types (e.g., 11488-4 for Consultation Note, 18842-5 for Discharge Summary, 34117-2 for H&P, 11506-3 for Progress Note).

## Requirements

### Requirement 1: FHIR R4 Composition Resource Model

**User Story:** As a developer building clinical documentation features, I want a FHIR R4-compliant Composition resource data model in brightchart-lib, so that clinical notes share a consistent, standards-based representation with typed sections.

#### Acceptance Criteria

1. THE Clinical_Note (Composition) SHALL include the following FHIR R4 Composition fields: identifier (IIdentifier), status (CompositionStatus code, required), type (ICodeableConcept, required — LOINC document type), category (array of ICodeableConcept), subject (IReference to Patient, required for clinical notes), encounter (IReference to Encounter), date (dateTime, required), author (array of IReference to Practitioner/PractitionerRole/Device/Patient/RelatedPerson/Organization, required), title (string, required), confidentiality (code), attester (array of CompositionAttester), custodian (IReference to Organization), relatesTo (array of CompositionRelatesTo), event (array of CompositionEvent), and section (array of CompositionSection).
2. THE Clinical_Note SHALL use the generic TID type parameter consistent with the existing resource TID convention.
3. THE Clinical_Note SHALL include a resourceType field with the fixed value "Composition".
4. THE Clinical_Note SHALL include FHIR metadata fields (id, meta, text, extension) and a brightchainMetadata field matching the existing resource pattern.
5. WHEN the Clinical_Note references a patient, THE subject field SHALL use the IReference type pointing to a Patient resource matching an IPatientResource.id from Module 1.
6. WHEN the Clinical_Note references an encounter, THE encounter field SHALL use the IReference type pointing to an Encounter resource matching an IEncounterResource.id from Module 3.

### Requirement 2: Composition Backbone Elements

**User Story:** As a developer, I want FHIR R4 backbone elements for composition sections, attesters, events, and relationships defined in brightchart-lib, so that the composition model is complete and type-safe.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an exported `CompositionSection<TID>` interface with fields: title (string), code (ICodeableConcept), author (array of IReference), focus (IReference), text (INarrative), mode (code: working, snapshot, changes), orderedBy (ICodeableConcept), entry (array of IReference — references to clinical resources), emptyReason (ICodeableConcept), and section (array of CompositionSection — nested sub-sections).
2. THE brightchart-lib library SHALL define an exported `CompositionAttester<TID>` interface with fields: mode (AttestationMode code: personal, professional, legal, official, required), time (dateTime), and party (IReference to Practitioner/PractitionerRole/Patient/RelatedPerson/Organization).
3. THE brightchart-lib library SHALL define an exported `CompositionRelatesTo<TID>` interface with fields: code (DocumentRelationshipType code: replaces, transforms, signs, appends, required) and target (IReference to Composition or IIdentifier).
4. THE brightchart-lib library SHALL define an exported `CompositionEvent<TID>` interface with fields: code (array of ICodeableConcept), period (IPeriod), and detail (array of IReference).
5. THE brightchart-lib library SHALL export all composition backbone element interfaces from the src/index.ts barrel export.

### Requirement 3: FHIR R4 DocumentReference Resource Model

**User Story:** As a developer, I want a FHIR R4-compliant DocumentReference resource data model in brightchart-lib, so that document metadata for scanned papers, PDFs, images, C-CDA documents, and external reports can be managed consistently.

#### Acceptance Criteria

1. THE Document_Reference SHALL include the following FHIR R4 DocumentReference fields: masterIdentifier (IIdentifier), identifier (array of IIdentifier), status (DocumentReferenceStatus code: current, superseded, entered-in-error, required), docStatus (CompositionStatus code), type (ICodeableConcept — LOINC document type), category (array of ICodeableConcept), subject (IReference to Patient), date (instant), author (array of IReference), authenticator (IReference), custodian (IReference to Organization), relatesTo (array of DocumentReferenceRelatesTo), description (string), securityLabel (array of ICodeableConcept), content (array of DocumentReferenceContent, required), and context (DocumentReferenceContext).
2. THE Document_Reference SHALL use the generic TID type parameter consistent with the existing resource TID convention.
3. THE Document_Reference SHALL include a resourceType field with the fixed value "DocumentReference".
4. THE Document_Reference SHALL include FHIR metadata fields and a brightchainMetadata field matching the existing resource pattern.

### Requirement 4: DocumentReference Backbone Elements

**User Story:** As a developer, I want FHIR R4 backbone elements for document content, context, and relationships defined in brightchart-lib.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an exported `DocumentReferenceContent<TID>` interface with fields: attachment (IAttachment, required — with contentType, language, data or url, size, hash, title, creation) and format (ICoding).
2. THE brightchart-lib library SHALL define an exported `DocumentReferenceContext<TID>` interface with fields: encounter (array of IReference to Encounter), event (array of ICodeableConcept), period (IPeriod), facilityType (ICodeableConcept), practiceSetting (ICodeableConcept), sourcePatientInfo (IReference to Patient), and related (array of IReference).
3. THE brightchart-lib library SHALL define an exported `DocumentReferenceRelatesTo<TID>` interface with fields: code (DocumentRelationshipType code: replaces, transforms, signs, appends, required) and target (IReference to DocumentReference, required).
4. THE brightchart-lib library SHALL define an exported `IAttachment` interface with FHIR R4 Attachment fields: contentType (string), language (string), data (string — base64), url (string), size (number), hash (string — base64), title (string), and creation (dateTime).
5. THE brightchart-lib library SHALL export all DocumentReference backbone element interfaces from the src/index.ts barrel export.

### Requirement 5: Clinical Documentation Enumerations

**User Story:** As a developer, I want status codes and document type constants defined as TypeScript enumerations, so that document management is type-safe.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an exported `CompositionStatus` enumeration with FHIR R4 required values: preliminary, final, amended, entered-in-error.
2. THE brightchart-lib library SHALL define an exported `DocumentReferenceStatus` enumeration with FHIR R4 required values: current, superseded, entered-in-error.
3. THE brightchart-lib library SHALL define an exported `AttestationMode` enumeration with FHIR R4 required values: personal, professional, legal, official.
4. THE brightchart-lib library SHALL define an exported `DocumentRelationshipType` enumeration with FHIR R4 required values: replaces, transforms, signs, appends.
5. THE brightchart-lib library SHALL define exported LOINC document type constants for common clinical note types: CONSULTATION_NOTE (11488-4), DISCHARGE_SUMMARY (18842-5), HISTORY_AND_PHYSICAL (34117-2), PROGRESS_NOTE (11506-3), PROCEDURE_NOTE (28570-0), OPERATIVE_NOTE (11504-8), SURGICAL_OPERATION_NOTE (11504-8), NURSE_NOTE (34746-8), REFERRAL_NOTE (57133-1), TRANSFER_SUMMARY (18761-7).
6. THE brightchart-lib library SHALL export all documentation enumerations and constants from the src/index.ts barrel export.

### Requirement 6: Note Template System

**User Story:** As a clinical workflow developer, I want a template system for clinical notes, so that clinicians can start from predefined section structures (SOAP, H&P, discharge summary, etc.) rather than building notes from scratch.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `INoteTemplate` interface with fields: templateId (string), name (string), description (string), loincTypeCode (string — the LOINC document type this template produces), specialtyCode (string — matching ISpecialtyProfile.specialtyCode), sections (array of INoteTemplateSection), and isDefault (boolean — whether this is the default template for its type+specialty combination).
2. THE brightchart-lib library SHALL define an `INoteTemplateSection` interface with fields: title (string), code (ICodeableConcept — LOINC section code), required (boolean), defaultText (optional string — placeholder or boilerplate text), subsections (optional array of INoteTemplateSection), and entryTypes (optional array of ClinicalResourceType — which clinical resource types can be linked in this section).
3. THE brightchart-lib library SHALL provide predefined note templates for: SOAP Note (sections: Subjective, Objective, Assessment, Plan), History & Physical (sections: Chief Complaint, History of Present Illness, Past Medical History, Review of Systems, Physical Examination, Assessment, Plan), Discharge Summary (sections: Admission Diagnosis, Hospital Course, Discharge Diagnosis, Discharge Medications, Follow-Up Instructions), and Procedure Note (sections: Indication, Procedure Description, Findings, Complications, Post-Procedure Plan).
4. THE note template system SHALL define an `INoteTemplateRegistry` interface with methods: getTemplate(templateId): INoteTemplate, getTemplatesForType(loincTypeCode, specialtyCode?): INoteTemplate[], registerTemplate(template: INoteTemplate): void, and getDefaultTemplate(loincTypeCode, specialtyCode): INoteTemplate.
5. WHEN a clinician creates a new note from a template, THE system SHALL generate a Composition resource with sections pre-populated from the template's section definitions, with status set to "preliminary".

### Requirement 7: Document Signing and Attestation

**User Story:** As a clinician, I want to sign/attest clinical notes to indicate they are complete and accurate, so that signed notes carry legal weight and can be distinguished from drafts.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IDocumentSigningService<TID>` interface with methods: sign(compositionId: string, mode: AttestationMode, signerRef: IReference<TID>, signerKeys: Uint8Array, memberId: TID): Promise<ICompositionResource<TID>>, cosign(compositionId: string, cosignerRef: IReference<TID>, cosignerKeys: Uint8Array, memberId: TID): Promise<ICompositionResource<TID>>, and amend(compositionId: string, amendments: Partial<ICompositionResource<TID>>, memberId: TID): Promise<ICompositionResource<TID>>.
2. WHEN a Composition is signed, THE signing service SHALL transition the Composition status from "preliminary" to "final", add a CompositionAttester entry with the signer's reference, attestation mode, and timestamp, and create a cryptographic signature using the signer's ECIES keys stored as a FHIR extension.
3. WHEN a signed Composition is amended, THE signing service SHALL transition the status from "final" to "amended", create a new version linking to the previous version, and require a new attestation on the amended version.
4. THE signing service SHALL enforce that only members with DocumentWrite permission can sign notes, and only the original author or a member with DocumentAdmin permission can amend signed notes.
5. THE brightchart-lib library SHALL export all signing service interfaces from the src/index.ts barrel export.

### Requirement 8: Document Data Store

**User Story:** As a system architect, I want clinical documents stored as encrypted blocks on BrightChain, so that clinical notes and document references benefit from BrightChain's storage model.

#### Acceptance Criteria

1. THE Document_Store SHALL define an `IDocumentStore<TID>` interface with methods for both Composition and DocumentReference resources: storeComposition, retrieveComposition, updateComposition, storeDocumentReference, retrieveDocumentReference, updateDocumentReference, delete, getVersionHistory, and getPoolId.
2. THE Document_Store SHALL use a dedicated BrightChain pool for document blocks, separate from the Patient, Clinical, and Encounter pools.
3. WHEN a document is stored, THE Document_Store SHALL validate that patient and encounter references resolve to existing resources.
4. THE Document_Store SHALL store each document version as a separate block with version linking.
5. THE IDocumentStore interface SHALL be generic on TID.

### Requirement 9: Document Search and Query

**User Story:** As a healthcare provider, I want to search for clinical documents by patient, encounter, date, type, status, and author, so that I can find relevant notes and documents.

#### Acceptance Criteria

1. THE Document_Search_Engine SHALL define an `IDocumentSearchParams` interface supporting search by: patientId (required), encounterId (optional), type (optional LOINC code or ICodeableConcept), status (optional CompositionStatus or DocumentReferenceStatus), author (optional practitioner reference), dateRange (optional start/end), category (optional), offset, and count.
2. WHEN search parameters are provided, THE Document_Search_Engine SHALL return matching documents ordered by date (most recent first).
3. THE Document_Search_Engine SHALL maintain hashed search indexes for patientId, encounterId, type, status, author, and date.
4. THE Document_Search_Engine SHALL support pagination and ACL filtering.
5. THE Document_Search_Engine SHALL define an `IDocumentSearchResult<TID>` interface with entries (union of ICompositionResource and IDocumentReferenceResource), total, offset, count.

### Requirement 10: Document Serialization

**User Story:** As a developer, I want serializers for Composition and DocumentReference that follow the round-trip property pattern.

#### Acceptance Criteria

1. THE Document_Serializer SHALL provide serialize and deserialize methods for both ICompositionResource and IDocumentReferenceResource.
2. FOR ALL valid Composition and DocumentReference objects, the round-trip property SHALL hold.
3. THE Document_Serializer SHALL omit undefined/null fields and format dates per FHIR R4 rules.
4. WHEN invalid JSON is provided, THE serializer SHALL return a descriptive error.

### Requirement 11: Document ACL

**User Story:** As a healthcare administrator, I want document-specific access control, so that clinical note access follows the principle of least privilege.

#### Acceptance Criteria

1. THE Document ACL SHALL define a `DocumentPermission` enum with values: DocumentRead ("document:read"), DocumentWrite ("document:write"), DocumentSign ("document:sign"), DocumentAdmin ("document:admin").
2. THE Document ACL SHALL define an `IDocumentACL<TID>` interface extending `IPoolACL<TID>` with document-specific permissions.
3. DocumentAdmin SHALL imply DocumentRead, DocumentWrite, and DocumentSign.
4. THE Document ACL SHALL integrate with SMART on FHIR v2 scopes: read scopes → DocumentRead, cuds scopes → DocumentWrite, `system/*.*` → DocumentAdmin.
5. THE brightchart-lib library SHALL export all document ACL types from the src/index.ts barrel export.

### Requirement 12: Document Audit Trail

**User Story:** As a compliance officer, I want a complete audit trail of all document operations including signing events.

#### Acceptance Criteria

1. WHEN any operation (create, read, update, delete, search, sign, cosign, amend) is performed on a document, THE audit logger SHALL create an audit entry.
2. THE document audit entries SHALL extend the IClinicalAuditEntry pattern, adding documentStatus, attestationMode (for sign operations), and amendmentReason (for amend operations).
3. THE document audit entries SHALL be stored in the shared audit pool with hash-linked chains per document.
4. THE document audit entries SHALL be append-only.

### Requirement 13: C-CDA Generation and Consumption

**User Story:** As a practice administrator, I want BrightChart to generate and consume C-CDA documents, so that clinical notes can be exchanged with external systems per 21st Century Cures Act requirements.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `ICCDAGenerator<TID>` interface with a method: generate(composition: ICompositionResource<TID>, patient: IPatientResource<TID>, encounter?: IEncounterResource<TID>, clinicalResources?: ClinicalResource<TID>[]): Promise<string> that produces a C-CDA XML string.
2. THE brightchart-lib library SHALL define an `ICCDAConsumer<TID>` interface with a method: consume(ccdaXml: string): Promise<ICCDAImportResult<TID>> that parses a C-CDA XML document and produces FHIR resources (Composition, Patient, Encounter, clinical resources).
3. THE C-CDA generator SHALL support the following document types: Continuity of Care Document (CCD), Discharge Summary, History and Physical, Progress Note, Consultation Note, and Procedure Note.
4. THE `ICCDAImportResult<TID>` interface SHALL include: composition (ICompositionResource<TID>), patient (IPatientResource<TID>), encounter (IEncounterResource<TID> optional), clinicalResources (ClinicalResource<TID>[]), and warnings (string[] for data that could not be mapped).
5. THE brightchart-lib library SHALL export all C-CDA interfaces from the src/index.ts barrel export.

### Requirement 14: Documentation Specialty Extensions

**User Story:** As a product owner, I want the Specialty Adapter extended to support documentation-specific configurations for medical, dental, and veterinary specialties.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IDocumentationSpecialtyExtension` interface with fields: specialtyCode, noteTemplates (array of INoteTemplate for the specialty), documentTypeExtensions (additional LOINC document type codes), sectionExtensions (additional section types), and validationRules.
2. THE Medical documentation specialty SHALL include standard LOINC document types and note templates (SOAP, H&P, Discharge Summary, Procedure Note).
3. THE Dental documentation specialty SHALL include dental-specific note templates with odontogram/tooth chart sections, CDT procedure documentation sections, and dental treatment plan sections.
4. THE Veterinary documentation specialty SHALL include veterinary-specific note templates with species-specific examination sections, herd health report templates, and vaccination certificate templates.
5. THE brightchart-lib library SHALL export predefined documentation specialty extension constants for medical, dental, and veterinary specialties.

### Requirement 15: Portability Standard Extension for Documents

**User Story:** As a practice administrator, I want the portability standard extended to include clinical documents.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IDocumentExportBundle<TID>` interface extending `IEncounterExportBundle<TID>` from Module 3, adding: compositions (array of ICompositionResource<TID>), documentReferences (array of IDocumentReferenceResource<TID>), and noteTemplates (array of INoteTemplate).
2. THE export bundle SHALL preserve all patient, encounter, and clinical resource references in documents.
3. THE Document_Serializer SHALL support serializing and deserializing IDocumentExportBundle with the round-trip property.

### Requirement 16: Clinical Note Editor Component

**User Story:** As a frontend developer, I want a React component for authoring clinical notes with section-based editing, so that clinicians can write structured notes efficiently.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `ClinicalNoteEditor` component that accepts an ICompositionResource<string> (or creates a new one from a template) and renders an editable section-based note editor.
2. THE ClinicalNoteEditor SHALL display each Composition section as a collapsible, editable text area with the section title and code.
3. THE ClinicalNoteEditor SHALL support rich text editing within sections (bold, italic, lists, tables).
4. THE ClinicalNoteEditor SHALL accept an onSave callback emitting the updated ICompositionResource<string> and an onSign callback for attestation.
5. THE ClinicalNoteEditor SHALL accept a note template prop to initialize new notes with predefined sections.
6. THE ClinicalNoteEditor SHALL visually indicate the note status (preliminary = draft indicator, final = signed indicator, amended = amended indicator).
7. THE ClinicalNoteEditor SHALL accept a specialty profile prop to determine available section types and terminology.

### Requirement 17: Document List Component

**User Story:** As a frontend developer, I want a React component that displays a list of clinical documents for a patient.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `DocumentList` component that accepts an array of ICompositionResource<string> and/or IDocumentReferenceResource<string> objects and displays them as a list showing: document type, title, date, author, and status.
2. THE DocumentList SHALL support filtering by document type, status, and date range.
3. THE DocumentList SHALL visually distinguish document statuses (preliminary/draft, final/signed, amended, superseded).
4. WHEN a DocumentList entry is selected, THE DocumentList SHALL emit the selected document via an onSelect callback.
5. THE DocumentList SHALL display a "signed" indicator (checkmark or badge) for attested documents.

### Requirement 18: Document Viewer Component

**User Story:** As a frontend developer, I want a React component that displays the content of a clinical document in a readable format.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `DocumentViewer` component that accepts an ICompositionResource<string> and renders the note sections with their narrative text in a read-only, print-friendly format.
2. THE DocumentViewer SHALL display document metadata: title, type, date, author(s), status, and attestation details (signer, mode, timestamp).
3. THE DocumentViewer SHALL render section entries (linked clinical resources) as clickable references that emit via an onResourceSelect callback.
4. THE DocumentViewer SHALL support rendering IDocumentReferenceResource content by displaying the attachment (PDF viewer for PDFs, image viewer for images, text display for text content).

### Requirement 19: Note Template Selector Component

**User Story:** As a frontend developer, I want a React component for selecting a note template when creating a new clinical note.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `NoteTemplateSelector` component that accepts an array of INoteTemplate objects and displays them grouped by document type.
2. THE NoteTemplateSelector SHALL show each template's name, description, and section summary.
3. WHEN a template is selected, THE NoteTemplateSelector SHALL emit the selected INoteTemplate via an onSelect callback.
4. THE NoteTemplateSelector SHALL accept a specialty profile prop to filter templates by specialty.

### Requirement 20: Library Structure and Exports

**User Story:** As a developer building future modules, I want documentation interfaces organized under a consistent directory structure.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL organize documentation interfaces under a `src/lib/documentation/` directory.
2. THE brightchart-lib library SHALL export all documentation interfaces from the src/index.ts barrel export.
3. THE documentation interfaces SHALL reuse existing FHIR datatype interfaces and clinical/encounter types from Modules 1–3.
4. THE brightchart-react-components library SHALL organize documentation UI components under a `src/lib/documentation/` directory.
5. THE brightchart-react-components library SHALL export all documentation UI components from the src/index.ts barrel export.
