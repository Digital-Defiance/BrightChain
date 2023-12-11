# Implementation Plan: BrightChart Orders & Results

## Overview

This plan implements the Orders & Results module for BrightChart. All new code is added to `brightchart-lib` under `src/lib/orders/` and `brightchart-react-components` under `src/lib/orders/`. Implementation proceeds: enumerations → backbone elements → resource models → lifecycle → linking → service interfaces → e-prescribing → specialty → portability → React components.

## Tasks

- [x] 1. Orders enumerations
  - [x] 1.1 Create `brightchart-lib/src/lib/orders/enumerations.ts` defining exported enumerations: `ServiceRequestStatus` (draft, active, on-hold, revoked, completed, entered-in-error, unknown), `ServiceRequestIntent` (proposal, plan, directive, order, original-order, reflex-order, filler-order, instance-order, option), `MedicationRequestStatus` (active, on-hold, cancelled, completed, entered-in-error, stopped, draft, unknown), `MedicationRequestIntent` (proposal, plan, order, original-order, reflex-order, filler-order, instance-order, option), `DiagnosticReportStatus` (registered, partial, preliminary, final, amended, corrected, appended, cancelled, entered-in-error, unknown), `RequestPriority` (routine, urgent, asap, stat).
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 2. Backbone elements
  - [x] 2.1 Create `brightchart-lib/src/lib/orders/backboneElements.ts` defining exported interfaces: `MedicationRequestDispenseRequest<TID>` (initialFill, dispenseInterval, validityPeriod, numberOfRepeatsAllowed, quantity, expectedSupplyDuration, performer), `MedicationRequestInitialFill` (quantity, duration), `MedicationRequestSubstitution<TID>` (allowedBoolean/allowedCodeableConcept, reason), `DiagnosticReportMedia<TID>` (comment, link: IReference required).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.5_

- [x] 3. Resource interfaces
  - [x] 3.1 Create `brightchart-lib/src/lib/orders/serviceRequestResource.ts` defining exported `IServiceRequestResource<TID = string>` with all FHIR R4 ServiceRequest fields, FHIR metadata, brightchainMetadata, `resourceType: 'ServiceRequest'`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Create `brightchart-lib/src/lib/orders/medicationRequestResource.ts` defining exported `IMedicationRequestResource<TID = string>` with all FHIR R4 MedicationRequest fields, FHIR metadata, brightchainMetadata, `resourceType: 'MedicationRequest'`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Create `brightchart-lib/src/lib/orders/diagnosticReportResource.ts` defining exported `IDiagnosticReportResource<TID = string>` with all FHIR R4 DiagnosticReport fields, FHIR metadata, brightchainMetadata, `resourceType: 'DiagnosticReport'`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.4 Create `brightchart-lib/src/lib/orders/index.ts` barrel export. Update `brightchart-lib/src/index.ts` to re-export from `./lib/orders/index`.
    - _Requirements: 21.1, 21.2_

- [x] 4. Order lifecycle
  - [x] 4.1 Create `brightchart-lib/src/lib/orders/lifecycle/orderLifecycle.ts` defining exported `IOrderLifecycle<TID>` interface with isValidTransition and transition methods. Define `SERVICE_REQUEST_TRANSITIONS` and `MEDICATION_REQUEST_TRANSITIONS` constants encoding valid status transitions per the state machines.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 4.2 Create `brightchart-lib/src/lib/orders/lifecycle/index.ts` barrel export. Update orders index.
    - _Requirements: 21.2_

- [x] 5. Order-result linking
  - [x] 5.1 Create `brightchart-lib/src/lib/orders/linking/orderResultLink.ts` defining exported `IOrderResultLink<TID>` (orderId, orderType, resultId, resultType, linkedAt, linkedBy) and `IOrderResultLinkStore<TID>` with linkResult, getResultsForOrder, getOrderForResult methods.
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.2 Create `brightchart-lib/src/lib/orders/linking/index.ts` barrel export. Update orders index.
    - _Requirements: 21.2_

- [x] 6. Order store interface
  - [x] 6.1 Create `brightchart-lib/src/lib/orders/store/orderStore.ts` defining exported `IOrderStore<TID>` with methods for ServiceRequest, MedicationRequest, and DiagnosticReport: store, retrieve, update, delete, getVersionHistory, getPoolId.
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 6.2 Create `brightchart-lib/src/lib/orders/store/index.ts` barrel export. Update orders index.
    - _Requirements: 21.2_

- [x] 7. Order search interface
  - [x] 7.1 Create `brightchart-lib/src/lib/orders/search/orderSearch.ts` defining exported `IOrderSearchParams`, `IOrderSearchResult<TID>`, and `IOrderSearchEngine<TID>` with search, index, and removeIndex methods.
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 7.2 Create `brightchart-lib/src/lib/orders/search/index.ts` barrel export. Update orders index.
    - _Requirements: 21.2_

- [x] 8. Order serializer interface
  - [x] 8.1 Create `brightchart-lib/src/lib/orders/serializer/orderSerializer.ts` defining exported serializer interfaces for ServiceRequest, MedicationRequest, DiagnosticReport, and the order export bundle.
    - _Requirements: 10.1, 10.2, 10.3, 15.3_

  - [x] 8.2 Create `brightchart-lib/src/lib/orders/serializer/index.ts` barrel export. Update orders index.
    - _Requirements: 21.2_

- [x] 9. Order ACL interface
  - [x] 9.1 Create `brightchart-lib/src/lib/orders/access/orderAcl.ts` defining exported `OrderPermission` enum (OrderRead, OrderWrite, OrderSign, OrderAdmin), `IOrderACL<TID>` extending IPoolACL, `hasOrderPermission` function signature, SMART scope mapping constants.
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 9.2 Create `brightchart-lib/src/lib/orders/access/index.ts` barrel export. Update orders index.
    - _Requirements: 21.2_

- [x] 10. Order audit interface
  - [x] 10.1 Create `brightchart-lib/src/lib/orders/audit/orderAudit.ts` defining exported `IOrderAuditEntry<TID>` extending IClinicalAuditEntry with orderStatus, orderIntent, statusTransition. Export `IOrderAuditLogger<TID>` with methods for all order operations.
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 10.2 Create `brightchart-lib/src/lib/orders/audit/index.ts` barrel export. Update orders index.
    - _Requirements: 21.2_

- [x] 11. E-prescribing interfaces
  - [x] 11.1 Create `brightchart-lib/src/lib/orders/eprescribing/eprescribingTypes.ts` defining exported interfaces: `IEPrescribingService<TID>` (transmit, checkStatus, cancel), `IEPrescribingResult<TID>` (success, transmissionId, status, errors), `IEPrescribingStatus` (prescriptionId, transmissionStatus, lastUpdated), `IPharmacySearchParams` (name?, zipCode?, npi?), `IPharmacyInfo` (pharmacyId, name, address, phone, npi, fax), `IPharmacyDirectory<TID>` (search, getPharmacy).
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 11.2 Create `brightchart-lib/src/lib/orders/eprescribing/index.ts` barrel export. Update orders index.
    - _Requirements: 21.2_

- [x] 12. Order specialty extensions
  - [x] 12.1 Create `brightchart-lib/src/lib/orders/specialty/orderSpecialtyTypes.ts` defining exported `IOrderSpecialtyExtension` (specialtyCode, orderCodeSets, orderTemplates, validationRules).
    - _Requirements: 14.1_

  - [x] 12.2 Create `brightchart-lib/src/lib/orders/specialty/medicalOrderProfile.ts` exporting `MEDICAL_ORDER_EXTENSION` with CPT/LOINC order codes and common order sets (BMP, CBC, CMP, Lipid Panel, etc.).
    - _Requirements: 14.2_

  - [x] 12.3 Create `brightchart-lib/src/lib/orders/specialty/dentalOrderProfile.ts` exporting `DENTAL_ORDER_EXTENSION` with CDT procedure codes, tooth/surface context, dental order sets.
    - _Requirements: 14.3_

  - [x] 12.4 Create `brightchart-lib/src/lib/orders/specialty/veterinaryOrderProfile.ts` exporting `VETERINARY_ORDER_EXTENSION` with species-specific lab panels, dosing references, vet order sets.
    - _Requirements: 14.4_

  - [x] 12.5 Create `brightchart-lib/src/lib/orders/specialty/index.ts` barrel export. Update orders index.
    - _Requirements: 14.5, 21.2_

- [x] 13. Order portability interface
  - [x] 13.1 Create `brightchart-lib/src/lib/orders/portability/orderPortability.ts` defining exported `IOrderExportBundle<TID>` extending IDocumentExportBundle with serviceRequests, medicationRequests, diagnosticReports, orderResultLinks.
    - _Requirements: 15.1, 15.2_

  - [x] 13.2 Create `brightchart-lib/src/lib/orders/portability/index.ts` barrel export. Update orders index.
    - _Requirements: 21.2_

- [x] 14. Final barrel export verification
  - [x] 14.1 Verify `brightchart-lib/src/lib/orders/index.ts` re-exports all sub-modules. Verify `brightchart-lib/src/index.ts` re-exports from `./lib/orders/index`. Run `yarn nx run brightchart-lib:build`.
    - _Requirements: 21.1, 21.2, 21.3_

- [x] 15. React order components
  - [x] 15.1 Create `brightchart-react-components/src/lib/orders/OrderEntryForm.tsx`. Props: onSubmit, serviceRequest?, specialtyProfile?, encounter?. Order type selector, searchable code, priority, performer, reason, specimen, body site, notes, patient instructions. Inline validation.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 15.2 Create `brightchart-react-components/src/lib/orders/PrescriptionPad.tsx`. Props: onSubmit, medicationRequest?, specialtyProfile?, interactionChecker?. Medication search, dosage builder (dose/route/frequency/duration), dispense quantity, refills, substitution, pharmacy selector, interaction warnings.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x] 15.3 Create `brightchart-react-components/src/lib/orders/OrderList.tsx`. Props: orders (union of ServiceRequest and MedicationRequest arrays), onSelect, filterTypes?, filterStatuses?. Unified list with type icons, status/priority styling, filtering.
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 15.4 Create `brightchart-react-components/src/lib/orders/ResultsViewer.tsx`. Props: report, observations?, onObservationSelect?. Report details, observation values with abnormal flagging, attachment viewer.
    - _Requirements: 19.1, 19.2, 19.3, 19.4_

  - [x] 15.5 Create `brightchart-react-components/src/lib/orders/ResultsList.tsx`. Props: reports, onSelect, filterCategories?. Report list with category/status filtering, abnormal result flagging.
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [x] 15.6 Create `brightchart-react-components/src/lib/orders/index.ts` barrel export. Update `brightchart-react-components/src/index.ts`. Run `yarn nx run brightchart-react-components:build`.
    - _Requirements: 21.4, 21.5_
