# Implementation Plan: BrightChart Clinical Documentation

## Overview

This plan implements the Clinical Documentation module for BrightChart — the FHIR R4-compliant clinical note authoring, document management, and signing system building on Modules 1–3. All new code is added to `brightchart-lib` under `src/lib/documentation/` and `brightchart-react-components` under `src/lib/documentation/`. Implementation proceeds: enumerations → backbone elements → resource models → templates → signing → service interfaces → C-CDA → specialty → portability → React components.

## Tasks

- [x] 1. Documentation enumerations and constants
  - [x] 1.1 Create `brightchart-lib/src/lib/documentation/enumerations.ts` defining exported enumerations: `CompositionStatus` (preliminary, final, amended, entered-in-error), `DocumentReferenceStatus` (current, superseded, entered-in-error), `AttestationMode` (personal, professional, legal, official), `DocumentRelationshipType` (replaces, transforms, signs, appends). Define exported LOINC document type constants: CONSULTATION_NOTE, DISCHARGE_SUMMARY, HISTORY_AND_PHYSICAL, PROGRESS_NOTE, PROCEDURE_NOTE, OPERATIVE_NOTE, NURSE_NOTE, REFERRAL_NOTE, TRANSFER_SUMMARY as ICodeableConcept objects with system `http://loinc.org`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 2. Composition backbone elements
  - [x] 2.1 Create `brightchart-lib/src/lib/documentation/compositionBackboneElements.ts` defining exported interfaces: `CompositionSection<TID = string>` (title, code, author, focus, text, mode, orderedBy, entry, emptyReason, section — recursive), `CompositionAttester<TID = string>` (mode: AttestationMode required, time, party), `CompositionRelatesTo<TID = string>` (code: DocumentRelationshipType required, target), `CompositionEvent<TID = string>` (code, period, detail).
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. DocumentReference backbone elements
  - [x] 3.1 Create `brightchart-lib/src/lib/documentation/documentReferenceBackboneElements.ts` defining exported interfaces: `IAttachment` (contentType, language, data, url, size, hash, title, creation), `DocumentReferenceContent<TID = string>` (attachment: IAttachment required, format: ICoding), `DocumentReferenceContext<TID = string>` (encounter, event, period, facilityType, practiceSetting, sourcePatientInfo, related), `DocumentReferenceRelatesTo<TID = string>` (code: DocumentRelationshipType required, target: IReference required).
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Resource interfaces
  - [x] 4.1 Create `brightchart-lib/src/lib/documentation/compositionResource.ts` defining exported `ICompositionResource<TID = string>` with all FHIR R4 Composition fields, FHIR metadata, brightchainMetadata, and `resourceType: 'Composition'` literal.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 4.2 Create `brightchart-lib/src/lib/documentation/documentReferenceResource.ts` defining exported `IDocumentReferenceResource<TID = string>` with all FHIR R4 DocumentReference fields, FHIR metadata, brightchainMetadata, and `resourceType: 'DocumentReference'` literal.
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.3 Create `brightchart-lib/src/lib/documentation/index.ts` barrel export. Update `brightchart-lib/src/index.ts` to re-export from `./lib/documentation/index`.
    - _Requirements: 20.1, 20.2_

- [x] 5. Note template system
  - [x] 5.1 Create `brightchart-lib/src/lib/documentation/templates/noteTemplateTypes.ts` defining exported interfaces: `INoteTemplateSection` (title, code, required, defaultText?, subsections?, entryTypes?), `INoteTemplate` (templateId, name, description, loincTypeCode, specialtyCode, sections, isDefault), `INoteTemplateRegistry` (getTemplate, getTemplatesForType, registerTemplate, getDefaultTemplate).
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [x] 5.2 Create `brightchart-lib/src/lib/documentation/templates/predefinedTemplates.ts` defining and exporting predefined note templates: `SOAP_NOTE_TEMPLATE` (Subjective 10164-2, Objective 29545-1, Assessment 51848-0, Plan 18776-5), `HISTORY_AND_PHYSICAL_TEMPLATE` (Chief Complaint 10154-3, HPI 10164-2, PMH 11348-0, ROS 10187-3, PE 29545-1, Assessment 51848-0, Plan 18776-5), `DISCHARGE_SUMMARY_TEMPLATE` (Admission Diagnosis, Hospital Course, Discharge Diagnosis, Discharge Medications, Follow-Up), `PROCEDURE_NOTE_TEMPLATE` (Indication, Procedure Description, Findings, Complications, Post-Procedure Plan).
    - _Requirements: 6.3_

  - [x] 5.3 Create `brightchart-lib/src/lib/documentation/templates/index.ts` barrel export. Update documentation index.
    - _Requirements: 20.2_

- [x] 6. Document signing interfaces
  - [x] 6.1 Create `brightchart-lib/src/lib/documentation/signing/documentSigning.ts` defining exported `IDocumentSigningService<TID = string>` interface with methods: sign, cosign, amend. Define the FHIR extension URL for cryptographic signatures (`http://brightchart.org/fhir/StructureDefinition/composition-ecies-signature`).
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.2 Create `brightchart-lib/src/lib/documentation/signing/index.ts` barrel export. Update documentation index.
    - _Requirements: 20.2_

- [x] 7. Document store interface
  - [x] 7.1 Create `brightchart-lib/src/lib/documentation/store/documentStore.ts` defining exported `IDocumentStore<TID = string>` interface with methods: storeComposition, retrieveComposition, updateComposition, storeDocumentReference, retrieveDocumentReference, updateDocumentReference, delete, getVersionHistory, getPoolId.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 7.2 Create `brightchart-lib/src/lib/documentation/store/index.ts` barrel export. Update documentation index.
    - _Requirements: 20.2_

- [x] 8. Document search interface
  - [x] 8.1 Create `brightchart-lib/src/lib/documentation/search/documentSearch.ts` defining exported interfaces: `IDocumentSearchParams` (patientId required, encounterId?, type?, status?, author?, dateRange?, category?, offset?, count?), `IDocumentSearchResult<TID = string>` (entries: (ICompositionResource<TID> | IDocumentReferenceResource<TID>)[], total, offset, count), `IDocumentSearchEngine<TID = string>` with methods: search, indexComposition, indexDocumentReference, removeIndex.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.2 Create `brightchart-lib/src/lib/documentation/search/index.ts` barrel export. Update documentation index.
    - _Requirements: 20.2_

- [x] 9. Document serializer interface
  - [x] 9.1 Create `brightchart-lib/src/lib/documentation/serializer/documentSerializer.ts` defining exported interfaces: `ICompositionSerializer` (serialize, deserialize for ICompositionResource), `IDocumentReferenceSerializer` (serialize, deserialize for IDocumentReferenceResource), `IDocumentBundleSerializer` (serialize, deserialize for IDocumentExportBundle).
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 15.3_

  - [x] 9.2 Create `brightchart-lib/src/lib/documentation/serializer/index.ts` barrel export. Update documentation index.
    - _Requirements: 20.2_

- [x] 10. Document ACL interface
  - [x] 10.1 Create `brightchart-lib/src/lib/documentation/access/documentAcl.ts` defining: exported `DocumentPermission` enum (DocumentRead, DocumentWrite, DocumentSign, DocumentAdmin), exported `IDocumentACL<TID = string>` extending IPoolACL with documentPermissions, `hasDocumentPermission` function signature, SMART scope mapping constants.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 10.2 Create `brightchart-lib/src/lib/documentation/access/index.ts` barrel export. Update documentation index.
    - _Requirements: 20.2_

- [x] 11. Document audit interface
  - [x] 11.1 Create `brightchart-lib/src/lib/documentation/audit/documentAudit.ts` defining: exported `IDocumentAuditEntry<TID = string>` extending IClinicalAuditEntry with documentStatus, attestationMode?, amendmentReason?. Export `IDocumentAuditLogger<TID = string>` with methods for logging document operations (create, read, update, delete, search, sign, cosign, amend).
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 11.2 Create `brightchart-lib/src/lib/documentation/audit/index.ts` barrel export. Update documentation index.
    - _Requirements: 20.2_

- [x] 12. C-CDA interfaces
  - [x] 12.1 Create `brightchart-lib/src/lib/documentation/ccda/ccdaTypes.ts` defining exported interfaces: `ICCDAGenerator<TID = string>` with generate method, `ICCDAConsumer<TID = string>` with consume method, `ICCDAImportResult<TID = string>` (composition, patient?, encounter?, clinicalResources, warnings), and `CCDADocumentType` constants (CCD, DISCHARGE_SUMMARY, HISTORY_AND_PHYSICAL, PROGRESS_NOTE, CONSULTATION_NOTE, PROCEDURE_NOTE).
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 12.2 Create `brightchart-lib/src/lib/documentation/ccda/index.ts` barrel export. Update documentation index.
    - _Requirements: 20.2_

- [x] 13. Documentation specialty extensions
  - [x] 13.1 Create `brightchart-lib/src/lib/documentation/specialty/documentationSpecialtyTypes.ts` defining exported `IDocumentationSpecialtyExtension` interface (specialtyCode, noteTemplates, documentTypeExtensions, sectionExtensions, validationRules).
    - _Requirements: 14.1_

  - [x] 13.2 Create `brightchart-lib/src/lib/documentation/specialty/medicalDocProfile.ts` exporting `MEDICAL_DOCUMENTATION_EXTENSION` with standard LOINC types and medical note templates (SOAP, H&P, Discharge Summary, Procedure Note).
    - _Requirements: 14.2_

  - [x] 13.3 Create `brightchart-lib/src/lib/documentation/specialty/dentalDocProfile.ts` exporting `DENTAL_DOCUMENTATION_EXTENSION` with dental-specific templates (odontogram sections, CDT procedure documentation, treatment plan sections).
    - _Requirements: 14.3_

  - [x] 13.4 Create `brightchart-lib/src/lib/documentation/specialty/veterinaryDocProfile.ts` exporting `VETERINARY_DOCUMENTATION_EXTENSION` with veterinary-specific templates (species-specific exam, herd health report, vaccination certificate).
    - _Requirements: 14.4_

  - [x] 13.5 Create `brightchart-lib/src/lib/documentation/specialty/index.ts` barrel export. Update documentation index.
    - _Requirements: 14.5, 20.2_

  - [x] 13.6 Create `brightchart-lib/src/lib/documentation/specialty/hospitalDocProfile.ts` exporting `HOSPITAL_DOCUMENTATION_EXTENSION` with hospital/inpatient-specific templates (Admission Note, ICU Progress Note, Operative Report, Nursing Assessment). Update specialty barrel export.
    - _Requirements: 14.2_

- [x] 14. Documentation portability interface
  - [x] 14.1 Create `brightchart-lib/src/lib/documentation/portability/documentPortability.ts` defining exported `IDocumentExportBundle<TID = string>` extending IEncounterExportBundle with compositions, documentReferences, noteTemplates.
    - _Requirements: 15.1, 15.2_

  - [x] 14.2 Create `brightchart-lib/src/lib/documentation/portability/index.ts` barrel export. Update documentation index.
    - _Requirements: 20.2_

- [x] 15. Final brightchart-lib barrel export verification
  - [x] 15.1 Verify `brightchart-lib/src/lib/documentation/index.ts` re-exports all sub-modules. Verify `brightchart-lib/src/index.ts` re-exports from `./lib/documentation/index`. Run `yarn nx run brightchart-lib:build` to confirm compilation.
    - _Requirements: 20.1, 20.2, 20.3_

- [x] 16. React documentation components
  - [x] 16.1 Create `brightchart-react-components/src/lib/documentation/ClinicalNoteEditor.tsx`. Props: composition?, template?, specialtyProfile?, onSave, onSign. Section-based rich text editor with collapsible sections, status indicators, sign button. Initializes from template when no composition provided.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

  - [x] 16.2 Create `brightchart-react-components/src/lib/documentation/DocumentList.tsx`. Props: documents (union of Composition and DocumentReference arrays), onSelect, filterTypes?, filterStatuses?. List with type/title/date/author/status, signed indicators, filtering by type/status/date.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x] 16.3 Create `brightchart-react-components/src/lib/documentation/DocumentViewer.tsx`. Props: composition?, documentReference?, onResourceSelect?. Read-only section display for Compositions, PDF/image viewer for DocumentReference attachments, metadata header.
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 16.4 Create `brightchart-react-components/src/lib/documentation/NoteTemplateSelector.tsx`. Props: templates, specialtyProfile?, onSelect. Template cards grouped by document type, section preview, specialty filtering.
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

  - [x] 16.5 Create `brightchart-react-components/src/lib/documentation/index.ts` barrel export. Update `brightchart-react-components/src/index.ts`. Run `yarn nx run brightchart-react-components:build`.
    - _Requirements: 20.4, 20.5_
