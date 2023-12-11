# Requirements Document: BrightChart Orders & Results

## Introduction

This module establishes the Orders & Results layer for BrightChart — the FHIR R4-compliant order entry, prescription management, and diagnostic results system. It builds on Modules 1–4, bridging the gap between "what was ordered" (ServiceRequest, MedicationRequest) and "what was observed" (DiagnosticReport linking to Observations from Module 2).

Orders & Results covers three FHIR R4 resources:

- **ServiceRequest**: Orders for diagnostic tests (lab panels, imaging studies), referrals, and procedures. This is the "order" side — what the clinician requests.
- **MedicationRequest**: Prescriptions and medication orders. This complements MedicationStatement from Module 2 (which records what a patient is taking) by capturing what was prescribed and by whom.
- **DiagnosticReport**: Results of diagnostic services — lab reports, radiology reports, pathology reports. Groups Observation resources from Module 2 into a coherent report with interpretation and conclusion.

The Specialty Adapter extends into orders: medical orders use CPT/LOINC codes, dental orders use CDT procedure codes with tooth/surface context, and veterinary orders include species-specific lab panels and dosing.

The implementation spans:
- **brightchart-lib**: Shared FHIR R4 ServiceRequest, MedicationRequest, and DiagnosticReport interfaces, order workflow types, order-to-result linking, order store/search/serializer/ACL/audit interfaces, e-prescribing types, and specialty order extensions (browser-compatible)
- **brightchart-react-components**: React UI components for order entry form, order list, prescription pad, results viewer, and results list

## Glossary

- **Service_Request**: A FHIR R4 ServiceRequest representing an order for a diagnostic test, procedure, referral, or other service.
- **Medication_Request**: A FHIR R4 MedicationRequest representing a prescription or medication order for a patient.
- **Diagnostic_Report**: A FHIR R4 DiagnosticReport representing the results of a diagnostic service, grouping Observations into a coherent report.
- **Order_Store**: The BrightChain block store pool for persisting encrypted order and result records.
- **Order_Workflow**: The state machine governing order lifecycle (draft → active → on-hold → completed/revoked/entered-in-error).
- **Order_Result_Link**: The mechanism linking a ServiceRequest to its fulfilling DiagnosticReport(s) and Observation(s).
- **E_Prescribing**: The electronic transmission of prescription information between prescriber and pharmacy, using NCPDP SCRIPT or FHIR-based interfaces.

## Requirements

### Requirement 1: FHIR R4 ServiceRequest Resource Model

**User Story:** As a developer building order entry features, I want a FHIR R4-compliant ServiceRequest resource data model in brightchart-lib, so that lab orders, imaging orders, referrals, and procedure requests share a consistent representation.

#### Acceptance Criteria

1. THE Service_Request SHALL include the following FHIR R4 ServiceRequest fields: identifier (array of IIdentifier), instantiatesCanonical (array of canonical URIs), instantiatesUri (array of URIs), basedOn (array of IReference), replaces (array of IReference), requisition (IIdentifier), status (ServiceRequestStatus code, required), intent (ServiceRequestIntent code, required), category (array of ICodeableConcept), priority (RequestPriority code), doNotPerform (boolean), code (ICodeableConcept), orderDetail (array of ICodeableConcept), quantityQuantity/quantityRatio/quantityRange, subject (IReference to Patient, required), encounter (IReference to Encounter), occurrenceDateTime/occurrencePeriod/occurrenceTiming, asNeededBoolean/asNeededCodeableConcept, authoredOn (dateTime), requester (IReference to Practitioner/PractitionerRole/Organization/Patient/RelatedPerson/Device), performerType (ICodeableConcept), performer (array of IReference), locationCode (array of ICodeableConcept), locationReference (array of IReference), reasonCode (array of ICodeableConcept), reasonReference (array of IReference), insurance (array of IReference), supportingInfo (array of IReference), specimen (array of IReference), bodySite (array of ICodeableConcept), note (array of IAnnotation), patientInstruction (string), and relevantHistory (array of IReference).
2. THE Service_Request SHALL use the generic TID type parameter consistent with the existing resource TID convention.
3. THE Service_Request SHALL include a resourceType field with the fixed value "ServiceRequest".
4. THE Service_Request SHALL include FHIR metadata fields and a brightchainMetadata field matching the existing resource pattern.

### Requirement 2: FHIR R4 MedicationRequest Resource Model

**User Story:** As a developer building prescription features, I want a FHIR R4-compliant MedicationRequest resource data model, so that prescriptions and medication orders share a consistent representation distinct from MedicationStatement (what the patient is taking).

#### Acceptance Criteria

1. THE Medication_Request SHALL include the following FHIR R4 MedicationRequest fields: identifier (array of IIdentifier), status (MedicationRequestStatus code, required), statusReason (ICodeableConcept), intent (MedicationRequestIntent code, required), category (array of ICodeableConcept), priority (RequestPriority code), doNotPerform (boolean), reportedBoolean/reportedReference, medicationCodeableConcept/medicationReference (IReference to Medication from Module 2), subject (IReference to Patient, required), encounter (IReference to Encounter), supportingInformation (array of IReference), authoredOn (dateTime), requester (IReference), performer (IReference), performerType (ICodeableConcept), recorder (IReference), reasonCode (array of ICodeableConcept), reasonReference (array of IReference), instantiatesCanonical (array of canonical URIs), instantiatesUri (array of URIs), basedOn (array of IReference), groupIdentifier (IIdentifier), courseOfTherapyType (ICodeableConcept), insurance (array of IReference), note (array of IAnnotation), dosageInstruction (array of IDosage from Module 2), dispenseRequest (MedicationRequestDispenseRequest), substitution (MedicationRequestSubstitution), and priorPrescription (IReference to MedicationRequest).
2. THE Medication_Request SHALL use the generic TID type parameter.
3. THE Medication_Request SHALL include a resourceType field with the fixed value "MedicationRequest".
4. THE Medication_Request SHALL include FHIR metadata fields and a brightchainMetadata field.

### Requirement 3: MedicationRequest Backbone Elements

**User Story:** As a developer, I want FHIR R4 backbone elements for medication dispense requests and substitution rules.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an exported `MedicationRequestDispenseRequest<TID>` interface with fields: initialFill (MedicationRequestInitialFill with quantity and duration), dispenseInterval (IDuration), validityPeriod (IPeriod), numberOfRepeatsAllowed (number), quantity (ISimpleQuantity), expectedSupplyDuration (IDuration), and performer (IReference to Organization).
2. THE brightchart-lib library SHALL define an exported `MedicationRequestInitialFill` interface with fields: quantity (ISimpleQuantity) and duration (IDuration).
3. THE brightchart-lib library SHALL define an exported `MedicationRequestSubstitution<TID>` interface with fields: allowedBoolean/allowedCodeableConcept and reason (ICodeableConcept).
4. THE brightchart-lib library SHALL export all MedicationRequest backbone elements from the src/index.ts barrel export.

### Requirement 4: FHIR R4 DiagnosticReport Resource Model

**User Story:** As a developer building results viewing features, I want a FHIR R4-compliant DiagnosticReport resource data model, so that lab results, radiology reports, and pathology reports share a consistent representation that groups Observations from Module 2.

#### Acceptance Criteria

1. THE Diagnostic_Report SHALL include the following FHIR R4 DiagnosticReport fields: identifier (array of IIdentifier), basedOn (array of IReference to ServiceRequest/MedicationRequest), status (DiagnosticReportStatus code, required), category (array of ICodeableConcept), code (ICodeableConcept, required), subject (IReference to Patient), encounter (IReference to Encounter), effectiveDateTime/effectivePeriod, issued (instant), performer (array of IReference), resultsInterpreter (array of IReference), specimen (array of IReference), result (array of IReference to Observation from Module 2), imagingStudy (array of IReference), media (array of DiagnosticReportMedia), conclusion (string), conclusionCode (array of ICodeableConcept), and presentedForm (array of IAttachment).
2. THE Diagnostic_Report SHALL use the generic TID type parameter.
3. THE Diagnostic_Report SHALL include a resourceType field with the fixed value "DiagnosticReport".
4. THE Diagnostic_Report SHALL include FHIR metadata fields and a brightchainMetadata field.
5. THE brightchart-lib library SHALL define an exported `DiagnosticReportMedia<TID>` interface with fields: comment (string) and link (IReference to Media, required).

### Requirement 5: Orders & Results Enumerations

**User Story:** As a developer, I want status codes and intent codes for orders and results defined as TypeScript enumerations.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define exported `ServiceRequestStatus` enumeration: draft, active, on-hold, revoked, completed, entered-in-error, unknown.
2. THE brightchart-lib library SHALL define exported `ServiceRequestIntent` enumeration: proposal, plan, directive, order, original-order, reflex-order, filler-order, instance-order, option.
3. THE brightchart-lib library SHALL define exported `MedicationRequestStatus` enumeration: active, on-hold, cancelled, completed, entered-in-error, stopped, draft, unknown.
4. THE brightchart-lib library SHALL define exported `MedicationRequestIntent` enumeration: proposal, plan, order, original-order, reflex-order, filler-order, instance-order, option.
5. THE brightchart-lib library SHALL define exported `DiagnosticReportStatus` enumeration: registered, partial, preliminary, final, amended, corrected, appended, cancelled, entered-in-error, unknown.
6. THE brightchart-lib library SHALL define exported `RequestPriority` enumeration: routine, urgent, asap, stat.
7. THE brightchart-lib library SHALL export all enumerations from the src/index.ts barrel export.

### Requirement 6: Order Workflow and Lifecycle

**User Story:** As a clinical workflow developer, I want a well-defined order lifecycle state machine, so that order status transitions follow valid clinical workflows.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IOrderLifecycle<TID>` interface with methods: isValidTransition(fromStatus, toStatus): boolean, transition(order, toStatus, memberId): result or OperationOutcome.
2. THE valid ServiceRequest status transitions SHALL be: draft → active, active → on-hold, active → completed, active → revoked, on-hold → active, on-hold → revoked, and any → entered-in-error.
3. THE valid MedicationRequest status transitions SHALL be: draft → active, active → on-hold, active → completed, active → cancelled, active → stopped, on-hold → active, on-hold → cancelled, and any → entered-in-error.
4. WHEN a status transition occurs, THE order's version history SHALL be updated.
5. THE brightchart-lib library SHALL export the order lifecycle interfaces and default transition maps.

### Requirement 7: Order-to-Result Linking

**User Story:** As a developer, I want orders linked to their fulfilling results, so that clinicians can trace from an order to its results and vice versa.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IOrderResultLink<TID>` interface with fields: orderId (string), orderType ('ServiceRequest' | 'MedicationRequest'), resultId (string), resultType ('DiagnosticReport' | 'Observation'), linkedAt (Date), linkedBy (TID).
2. THE brightchart-lib library SHALL define an `IOrderResultLinkStore<TID>` interface with methods: linkResult(orderId, orderType, resultId, resultType, memberId): Promise<void>, getResultsForOrder(orderId): Promise<IOrderResultLink<TID>[]>, getOrderForResult(resultId): Promise<IOrderResultLink<TID> | null>.
3. THE DiagnosticReport.basedOn field SHALL reference the ServiceRequest(s) that initiated the diagnostic study.
4. THE brightchart-lib library SHALL export all order-result linking interfaces.

### Requirement 8: Order Data Store

**User Story:** As a system architect, I want orders and results stored as encrypted blocks on BrightChain.

#### Acceptance Criteria

1. THE Order_Store SHALL define an `IOrderStore<TID>` interface with methods for ServiceRequest, MedicationRequest, and DiagnosticReport: store, retrieve, update, delete, getVersionHistory, getPoolId.
2. THE Order_Store SHALL use a dedicated BrightChain pool for order/result blocks.
3. THE Order_Store SHALL validate patient and encounter references on store.
4. THE IOrderStore interface SHALL be generic on TID.

### Requirement 9: Order Search and Query

**User Story:** As a healthcare provider, I want to search for orders and results by patient, encounter, status, code, date, and requester.

#### Acceptance Criteria

1. THE Order_Search_Engine SHALL define an `IOrderSearchParams` interface supporting: patientId (required), encounterId (optional), resourceType ('ServiceRequest' | 'MedicationRequest' | 'DiagnosticReport', optional), status (optional), code (optional), dateRange (optional), requesterId (optional), priority (optional), offset, count.
2. THE search SHALL return matching resources ordered by date (most recent first).
3. THE search SHALL maintain hashed indexes and support pagination and ACL filtering.
4. THE search SHALL define an `IOrderSearchResult<TID>` interface.

### Requirement 10: Order Serialization

**User Story:** As a developer, I want serializers for ServiceRequest, MedicationRequest, and DiagnosticReport with round-trip properties.

#### Acceptance Criteria

1. THE Order_Serializer SHALL provide serialize/deserialize for all three resource types.
2. The round-trip property SHALL hold for all valid resources.
3. Undefined/null fields SHALL be omitted; dates SHALL follow FHIR R4 formatting.

### Requirement 11: Order ACL

**User Story:** As a healthcare administrator, I want order-specific access control.

#### Acceptance Criteria

1. THE Order ACL SHALL define an `OrderPermission` enum: OrderRead, OrderWrite, OrderSign (for signing/authorizing orders), OrderAdmin.
2. THE Order ACL SHALL define an `IOrderACL<TID>` extending IPoolACL with order-specific permissions.
3. OrderAdmin SHALL imply all other order permissions.
4. THE Order ACL SHALL integrate with SMART on FHIR v2 scopes.

### Requirement 12: Order Audit Trail

**User Story:** As a compliance officer, I want a complete audit trail of all order operations.

#### Acceptance Criteria

1. THE audit logger SHALL create entries for all order operations (create, read, update, delete, search, sign, status transition, result linking).
2. THE order audit entries SHALL extend IClinicalAuditEntry with orderStatus, orderIntent, and statusTransition fields.
3. THE entries SHALL be stored in the shared audit pool with hash-linked chains.
4. THE entries SHALL be append-only.

### Requirement 13: E-Prescribing Interface Types

**User Story:** As a developer building prescription transmission features, I want interface types for e-prescribing workflows, so that prescriptions can be transmitted to pharmacies electronically.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IEPrescribingService<TID>` interface with methods: transmit(prescription: IMedicationRequestResource<TID>, pharmacyRef: IReference<TID>, memberId: TID): Promise<IEPrescribingResult<TID>>, checkStatus(prescriptionId: string): Promise<IEPrescribingStatus>, and cancel(prescriptionId: string, reason: ICodeableConcept, memberId: TID): Promise<IEPrescribingResult<TID>>.
2. THE brightchart-lib library SHALL define an `IEPrescribingResult<TID>` interface with fields: success (boolean), transmissionId (string), status (string), errors (IOperationOutcome[]).
3. THE brightchart-lib library SHALL define an `IEPrescribingStatus` interface with fields: prescriptionId, transmissionStatus (queued, transmitted, received, dispensed, cancelled, error), lastUpdated (Date).
4. THE brightchart-lib library SHALL define an `IPharmacyDirectory<TID>` interface with methods: search(params: IPharmacySearchParams): Promise<IPharmacyInfo[]> and getPharmacy(pharmacyId: string): Promise<IPharmacyInfo>.
5. THE brightchart-lib library SHALL export all e-prescribing interfaces.

### Requirement 14: Orders Specialty Extensions

**User Story:** As a product owner, I want the Specialty Adapter extended for order-specific configurations.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IOrderSpecialtyExtension` interface with fields: specialtyCode, orderCodeSets (terminology sets for order codes), orderTemplates (predefined order sets), validationRules.
2. THE Medical order specialty SHALL include CPT/LOINC order codes and common order sets (basic metabolic panel, CBC, lipid panel, etc.).
3. THE Dental order specialty SHALL include CDT procedure order codes with tooth/surface context and dental-specific order sets (panoramic x-ray, periapical series, etc.).
4. THE Veterinary order specialty SHALL include species-specific lab panels, species-aware medication dosing references, and veterinary-specific order sets.
5. THE brightchart-lib library SHALL export predefined order specialty extensions.

### Requirement 15: Portability Standard Extension for Orders & Results

**User Story:** As a practice administrator, I want the portability standard extended to include orders and results.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IOrderExportBundle<TID>` extending IDocumentExportBundle from Module 4, adding: serviceRequests, medicationRequests, diagnosticReports, and orderResultLinks.
2. THE export bundle SHALL preserve all references between orders, results, patients, encounters, and clinical resources.
3. The round-trip serialization property SHALL hold for the export bundle.

### Requirement 16: Order Entry Form Component

**User Story:** As a frontend developer, I want a React component for entering orders (lab, imaging, referral, procedure).

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide an `OrderEntryForm` component with inputs for: order type (lab/imaging/referral/procedure), code (searchable), priority, patient, encounter, requester, performer, reason, specimen (for lab), body site, notes, and patient instructions.
2. WHEN submitted, THE form SHALL emit a complete IServiceRequestResource<string> via onSubmit.
3. THE form SHALL support edit mode with an existing ServiceRequest prop.
4. THE form SHALL accept a specialty profile prop for code filtering.
5. THE form SHALL display inline validation errors.

### Requirement 17: Prescription Pad Component

**User Story:** As a frontend developer, I want a React component for writing prescriptions.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `PrescriptionPad` component with inputs for: medication (searchable from Medication resources or code), dosage instructions (dose, route, frequency, duration), dispense quantity, refills, substitution allowed, pharmacy selector, and notes.
2. WHEN submitted, THE form SHALL emit a complete IMedicationRequestResource<string> via onSubmit.
3. THE form SHALL support edit mode with an existing MedicationRequest prop.
4. THE form SHALL accept a specialty profile prop for medication code filtering.
5. THE form SHALL display drug interaction warnings when an `interactionChecker` callback prop is provided.

### Requirement 18: Order List Component

**User Story:** As a frontend developer, I want a React component displaying a list of orders for a patient.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide an `OrderList` component displaying ServiceRequest and MedicationRequest resources as a unified list showing: order type icon, code display, status, priority, date, requester.
2. THE OrderList SHALL support filtering by order type (service request vs. prescription), status, and priority.
3. THE OrderList SHALL visually distinguish by status (active highlighted, completed muted, revoked/cancelled struck through) and priority (stat = red, urgent = orange).
4. WHEN selected, THE OrderList SHALL emit the selected resource via onSelect.

### Requirement 19: Results Viewer Component

**User Story:** As a frontend developer, I want a React component for viewing diagnostic report results.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `ResultsViewer` component that accepts an IDiagnosticReportResource<string> and displays: report status, code, category, effective date, performer, conclusion, conclusion codes, and linked Observations (result references) with their values.
2. THE ResultsViewer SHALL display abnormal result values with visual highlighting (out-of-range flagging).
3. THE ResultsViewer SHALL display the report's presentedForm attachments (PDF/image viewer).
4. WHEN a linked Observation is selected, THE ResultsViewer SHALL emit it via onObservationSelect.

### Requirement 20: Results List Component

**User Story:** As a frontend developer, I want a React component displaying a list of diagnostic reports for a patient.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `ResultsList` component displaying DiagnosticReport resources showing: report code, category, status, effective date, performer, and whether abnormal results are present.
2. THE ResultsList SHALL support filtering by category (lab, radiology, pathology), status, and date range.
3. THE ResultsList SHALL visually flag reports containing abnormal results.
4. WHEN selected, THE ResultsList SHALL emit the selected DiagnosticReport via onSelect.

### Requirement 21: Library Structure and Exports

**User Story:** As a developer, I want order/result interfaces organized under a consistent directory structure.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL organize order/result interfaces under `src/lib/orders/`.
2. THE brightchart-lib library SHALL export all interfaces from src/index.ts.
3. THE interfaces SHALL reuse existing types from Modules 1–4.
4. THE brightchart-react-components library SHALL organize components under `src/lib/orders/`.
5. THE brightchart-react-components library SHALL export all components from src/index.ts.
