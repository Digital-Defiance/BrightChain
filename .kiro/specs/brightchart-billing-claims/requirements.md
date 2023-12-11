# Requirements Document: BrightChart Billing & Claims

## Introduction

This module establishes the Billing & Claims layer for BrightChart — the FHIR R4-compliant insurance management, claim submission, and payment processing system. It is the final module in the BrightChart EHR platform, building on all prior modules (Patient Identity, Clinical Data Foundation, Encounter Management, Clinical Documentation, Orders & Results, Scheduling).

Billing & Claims covers five FHIR R4 resources:

- **Coverage**: Insurance card-level information — plan, subscriber, beneficiary, period, class (group, plan, subplan).
- **CoverageEligibilityRequest / CoverageEligibilityResponse**: Real-time insurance eligibility verification before services are rendered.
- **Claim**: A request for payment or preauthorization submitted to an insurer, containing line items with procedure/service codes, diagnoses, and charges.
- **ExplanationOfBenefit (EOB)**: The insurer's adjudication response combining claim details, payment amounts, adjustments, and patient responsibility.

The Specialty Adapter is critical here: medical billing uses CPT + ICD-10-CM codes, dental billing uses CDT + ICD-10-CM codes with tooth/surface modifiers on claim line items, and veterinary billing typically uses direct client invoicing (no insurance claims) with optional pet insurance support.

The implementation spans:
- **brightchart-lib**: Shared FHIR R4 Coverage, Claim, EOB, and eligibility interfaces, fee schedule types, claim lifecycle types, billing code mapping, insurance eligibility types, payment/invoice types, and specialty billing extensions (browser-compatible)
- **brightchart-react-components**: React UI components for insurance card editor, claim builder, EOB viewer, eligibility checker, patient ledger, and superbill/encounter charge capture

## Glossary

- **Coverage_Resource**: A FHIR R4 Coverage representing a patient's insurance plan information.
- **Claim_Resource**: A FHIR R4 Claim representing a request for payment or preauthorization.
- **EOB_Resource**: A FHIR R4 ExplanationOfBenefit representing an insurer's adjudication response.
- **Eligibility_Request**: A FHIR R4 CoverageEligibilityRequest for verifying insurance coverage.
- **Eligibility_Response**: A FHIR R4 CoverageEligibilityResponse with eligibility and benefit details.
- **Fee_Schedule**: A mapping of procedure/service codes to charges, used to price claim line items.
- **Superbill**: An encounter-level charge capture form listing all billable services performed during a visit.
- **Patient_Ledger**: A running account of charges, payments, adjustments, and balances for a patient.
- **Billing_Code**: A CPT, CDT, HCPCS, or ICD-10 code used on claim line items.
- **Claim_Lifecycle**: The state machine governing claim status (draft → active → cancelled/entered-in-error) and submission workflow.

## Requirements

### Requirement 1: FHIR R4 Coverage Resource Model

**User Story:** As a developer building insurance management features, I want a FHIR R4-compliant Coverage resource data model, so that patient insurance information is represented consistently.

#### Acceptance Criteria

1. THE Coverage_Resource SHALL include the following FHIR R4 Coverage fields: identifier (array of IIdentifier), status (CoverageStatus code, required), type (ICodeableConcept), policyHolder (IReference), subscriber (IReference), subscriberId (string), beneficiary (IReference to Patient, required), dependent (string), relationship (ICodeableConcept), period (IPeriod), payor (array of IReference to Organization/Patient/RelatedPerson, required), class (array of CoverageClass — group, plan, subplan, class, subclass), order (positiveInt), network (string), costToBeneficiary (array of CoverageCostToBeneficiary), subrogation (boolean), and contract (array of IReference).
2. THE Coverage_Resource SHALL use the generic TID type parameter.
3. THE Coverage_Resource SHALL include resourceType "Coverage", FHIR metadata, and brightchainMetadata.

### Requirement 2: Coverage Backbone Elements

**User Story:** As a developer, I want Coverage backbone elements for class and cost-to-beneficiary defined in brightchart-lib.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define exported `CoverageClass<TID>` interface with fields: type (ICodeableConcept, required), value (string, required), and name (string).
2. THE brightchart-lib library SHALL define exported `CoverageCostToBeneficiary<TID>` interface with fields: type (ICodeableConcept), valueQuantity/valueMoney, and exception (array of CoverageException with type and period).
3. THE brightchart-lib library SHALL define exported `CoverageException` interface with fields: type (ICodeableConcept, required) and period (IPeriod).
4. THE brightchart-lib library SHALL define exported `IMoney` interface with fields: value (number) and currency (string code).

### Requirement 3: FHIR R4 Claim Resource Model

**User Story:** As a developer building claim submission features, I want a FHIR R4-compliant Claim resource data model.

#### Acceptance Criteria

1. THE Claim_Resource SHALL include the following FHIR R4 Claim fields: identifier (array of IIdentifier), status (ClaimStatus code, required), type (ICodeableConcept, required — oral, pharmacy, vision, professional, institutional), subType (ICodeableConcept), use (ClaimUse code, required — claim, preauthorization, predetermination), patient (IReference to Patient, required), billablePeriod (IPeriod), created (dateTime, required), enterer (IReference), insurer (IReference to Organization), provider (IReference, required), priority (ICodeableConcept, required), fundsReserve (ICodeableConcept), related (array of ClaimRelated), prescription (IReference), originalPrescription (IReference), payee (ClaimPayee), referral (IReference to ServiceRequest), facility (IReference to Location), careTeam (array of ClaimCareTeam), supportingInfo (array of ClaimSupportingInfo), diagnosis (array of ClaimDiagnosis), procedure (array of ClaimProcedure), insurance (array of ClaimInsurance, required), accident (ClaimAccident), item (array of ClaimItem), and total (IMoney).
2. THE Claim_Resource SHALL use the generic TID type parameter.
3. THE Claim_Resource SHALL include resourceType "Claim", FHIR metadata, and brightchainMetadata.

### Requirement 4: Claim Backbone Elements

**User Story:** As a developer, I want Claim backbone elements for line items, diagnoses, procedures, insurance, care team, and supporting info.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define exported `ClaimItem<TID>` interface with fields: sequence (positiveInt, required), careTeamSequence (positiveInt[]), diagnosisSequence (positiveInt[]), procedureSequence (positiveInt[]), informationSequence (positiveInt[]), revenue (ICodeableConcept), category (ICodeableConcept), productOrService (ICodeableConcept, required), modifier (ICodeableConcept[]), programCode (ICodeableConcept[]), servicedDate/servicedPeriod, locationCodeableConcept/locationAddress/locationReference, quantity (IQuantity), unitPrice (IMoney), factor (number), net (IMoney), udi (IReference[]), bodySite (ICodeableConcept), subSite (ICodeableConcept[]), encounter (IReference to Encounter[]), and detail (array of ClaimItemDetail).
2. THE brightchart-lib library SHALL define exported `ClaimItemDetail<TID>` and `ClaimItemDetailSubDetail<TID>` interfaces with fields: sequence, revenue, category, productOrService (required), modifier, programCode, quantity, unitPrice, factor, net, udi.
3. THE brightchart-lib library SHALL define exported `ClaimDiagnosis<TID>` (sequence, diagnosisCodeableConcept/diagnosisReference, type, onAdmission, packageCode), `ClaimProcedure<TID>` (sequence, type, date, procedureCodeableConcept/procedureReference, udi), `ClaimInsurance<TID>` (sequence, focal, identifier, coverage required, businessArrangement, preAuthRef, claimResponse), `ClaimCareTeam<TID>` (sequence, provider required, responsible, role, qualification), `ClaimSupportingInfo<TID>` (sequence, category required, code, timing, value, reason), `ClaimPayee<TID>` (type required, party), `ClaimRelated<TID>` (claim, relationship, reference), and `ClaimAccident<TID>` (date required, type, locationAddress/locationReference).
4. THE brightchart-lib library SHALL export all Claim backbone elements.

### Requirement 5: FHIR R4 ExplanationOfBenefit Resource Model

**User Story:** As a developer, I want a FHIR R4-compliant ExplanationOfBenefit resource data model for representing insurer adjudication responses.

#### Acceptance Criteria

1. THE EOB_Resource SHALL include key FHIR R4 ExplanationOfBenefit fields: identifier, status (EOBStatus, required), type (required), subType, use (required), patient (required), billablePeriod, created (required), enterer, insurer (required), provider (required), priority, fundsReserveRequested, fundsReserve, related, prescription, originalPrescription, payee, referral, facility, claim (IReference to Claim), claimResponse, outcome (RemittanceOutcome, required), disposition, preAuthRef, preAuthRefPeriod, careTeam, supportingInfo, diagnosis, procedure, precedence, insurance (required), accident, item (array of EOBItem with adjudication), addItem, adjudication (array of EOBAdjudication), total (array of EOBTotal), payment (EOBPayment), formCode, form, processNote, benefitPeriod, and benefitBalance.
2. THE EOB_Resource SHALL use the generic TID type parameter.
3. THE EOB_Resource SHALL include resourceType "ExplanationOfBenefit", FHIR metadata, and brightchainMetadata.

### Requirement 6: FHIR R4 Coverage Eligibility Resources

**User Story:** As a developer, I want CoverageEligibilityRequest and CoverageEligibilityResponse data models for real-time insurance eligibility verification.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define exported `ICoverageEligibilityRequestResource<TID>` with key fields: identifier, status (required), purpose (array of EligibilityRequestPurpose: auth-requirements, benefits, discovery, validation, required), patient (required), servicedDate/servicedPeriod, created (required), enterer, provider, insurer (required), facility, supportingInfo, and insurance (array with coverage required).
2. THE brightchart-lib library SHALL define exported `ICoverageEligibilityResponseResource<TID>` with key fields: identifier, status (required), purpose (required), patient (required), servicedDate/servicedPeriod, created (required), requestor, request (IReference to CoverageEligibilityRequest, required), outcome (RemittanceOutcome, required), disposition, insurer (required), insurance (array with coverage, inforce boolean, benefitPeriod, and item array with category, productOrService, modifier, provider, excluded, name, description, network, unit, term, benefit array with type/allowedMoney/usedMoney), preAuthRef, form, and error.
3. THE brightchart-lib library SHALL export all eligibility interfaces.

### Requirement 7: Billing Enumerations

**User Story:** As a developer, I want billing status codes and type codes defined as TypeScript enumerations.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define exported enumerations: `CoverageStatus` (active, cancelled, draft, entered-in-error), `ClaimStatus` (active, cancelled, draft, entered-in-error), `ClaimUse` (claim, preauthorization, predetermination), `EOBStatus` (active, cancelled, draft, entered-in-error), `RemittanceOutcome` (queued, complete, error, partial), `EligibilityRequestPurpose` (auth-requirements, benefits, discovery, validation).
2. THE brightchart-lib library SHALL define exported claim type constants: INSTITUTIONAL, ORAL, PHARMACY, PROFESSIONAL, VISION as ICodeableConcept objects.
3. THE brightchart-lib library SHALL export all billing enumerations.

### Requirement 8: Fee Schedule System

**User Story:** As a practice administrator, I want a fee schedule system mapping procedure codes to charges, so that claim line items are priced consistently.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IFeeScheduleEntry` interface with fields: code (string — CPT/CDT/HCPCS code), codeSystem (string URI), description (string), defaultCharge (IMoney), effectiveDate (Date), expirationDate (optional Date), modifiers (optional array of modifier codes with charge adjustments).
2. THE brightchart-lib library SHALL define an `IFeeSchedule` interface with fields: scheduleId (string), name (string), specialtyCode (string), effectiveDate (Date), entries (array of IFeeScheduleEntry).
3. THE brightchart-lib library SHALL define an `IFeeScheduleService<TID>` interface with methods: getCharge(code, modifiers?): IMoney, getFeeSchedule(scheduleId): IFeeSchedule, getActiveFeeSchedule(specialtyCode): IFeeSchedule.
4. THE brightchart-lib library SHALL export all fee schedule interfaces.

### Requirement 9: Claim Lifecycle and Submission

**User Story:** As a billing specialist, I want a well-defined claim lifecycle with submission workflow types.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IClaimLifecycle<TID>` interface with isValidTransition and transition methods.
2. THE valid Claim status transitions SHALL be: draft → active (submit), active → cancelled, and any → entered-in-error.
3. THE brightchart-lib library SHALL define an `IClaimSubmissionService<TID>` interface with methods: submit(claim: IClaimResource<TID>, memberId: TID): Promise<IClaimSubmissionResult<TID>>, checkStatus(claimId: string): Promise<IClaimSubmissionStatus>, and void(claimId: string, reason: ICodeableConcept, memberId: TID): Promise<IClaimSubmissionResult<TID>>.
4. THE brightchart-lib library SHALL define `IClaimSubmissionResult<TID>` (success, submissionId, status, errors) and `IClaimSubmissionStatus` (claimId, status: submitted/accepted/rejected/paid/denied, lastUpdated, adjudicationResult?: IReference to EOB).
5. THE brightchart-lib library SHALL export all claim lifecycle and submission interfaces.

### Requirement 10: Insurance Eligibility Verification

**User Story:** As a front desk staff member, I want to verify patient insurance eligibility in real-time before services are rendered.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IEligibilityService<TID>` interface with methods: checkEligibility(request: ICoverageEligibilityRequestResource<TID>, memberId: TID): Promise<ICoverageEligibilityResponseResource<TID>>, and getEligibilityHistory(patientId: string, coverageId: string): Promise<ICoverageEligibilityResponseResource<TID>[]>.
2. THE eligibility service SHALL support checking for: active coverage, benefit details, authorization requirements, and remaining benefits.
3. THE brightchart-lib library SHALL export all eligibility service interfaces.

### Requirement 11: Superbill / Encounter Charge Capture

**User Story:** As a clinician, I want to capture billable charges during an encounter, so that billing can generate claims from encounter data.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `ISuperbill<TID>` interface with fields: superbillId (string), encounterId (string), patientId (string), providerId (string), dateOfService (Date), diagnoses (array of ICodeableConcept — ICD-10 codes), lineItems (array of ISuperbillLineItem), status (SuperbillStatus: draft, finalized, billed), totalCharge (IMoney).
2. THE brightchart-lib library SHALL define an `ISuperbillLineItem` interface with fields: sequence (number), procedureCode (ICodeableConcept — CPT/CDT code), modifiers (ICodeableConcept[]), quantity (number), unitCharge (IMoney), totalCharge (IMoney), diagnosisPointers (number[] — indexes into the superbill diagnoses array), bodySite (optional ICodeableConcept), subSite (optional ICodeableConcept[]).
3. THE brightchart-lib library SHALL define an `ISuperbillService<TID>` interface with methods: createFromEncounter(encounterId, memberId): Promise<ISuperbill<TID>> (auto-populates from encounter diagnoses and procedures), addLineItem, removeLineItem, finalize, and generateClaim(superbillId, coverageId, memberId): Promise<IClaimResource<TID>>.
4. THE brightchart-lib library SHALL export all superbill interfaces.

### Requirement 12: Patient Ledger

**User Story:** As a billing specialist, I want a patient ledger tracking charges, payments, adjustments, and balances.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `ILedgerEntry<TID>` interface with fields: entryId (string), patientId (string), date (Date), type (LedgerEntryType: charge, payment, adjustment, refund, write-off), description (string), amount (IMoney), relatedClaimId (optional string), relatedEncounterId (optional string), postedBy (TID), balance (IMoney — running balance after this entry).
2. THE brightchart-lib library SHALL define an `IPatientLedger<TID>` interface with fields: patientId (string), entries (ILedgerEntry<TID>[]), currentBalance (IMoney).
3. THE brightchart-lib library SHALL define an `ILedgerService<TID>` interface with methods: getPatientLedger(patientId): Promise<IPatientLedger<TID>>, postCharge, postPayment, postAdjustment, getStatement(patientId, dateRange): Promise<IPatientStatement<TID>>.
4. THE brightchart-lib library SHALL export all ledger interfaces.

### Requirement 13: Billing Data Store

**User Story:** As a system architect, I want billing data stored as encrypted blocks on BrightChain.

#### Acceptance Criteria

1. THE Billing_Store SHALL define an `IBillingStore<TID>` interface with methods for Coverage, Claim, EOB, CoverageEligibilityRequest, CoverageEligibilityResponse, Superbill, and LedgerEntry: store, retrieve, update, delete, getVersionHistory, getPoolId.
2. THE Billing_Store SHALL use a dedicated BrightChain pool.
3. THE store SHALL validate patient references.
4. THE IBillingStore interface SHALL be generic on TID.

### Requirement 14: Billing Search and Query

**User Story:** As a billing specialist, I want to search for claims, coverages, and EOBs by patient, date, status, and insurer.

#### Acceptance Criteria

1. THE Billing_Search_Engine SHALL define an `IBillingSearchParams` interface supporting: patientId (required), resourceType (Coverage/Claim/EOB, optional), status (optional), dateRange (optional), insurerId (optional), claimUse (optional), offset, count.
2. THE search SHALL return results ordered by date (most recent first).
3. THE search SHALL support pagination and ACL filtering.

### Requirement 15: Billing Serialization

**User Story:** As a developer, I want serializers for billing resources with round-trip properties.

#### Acceptance Criteria

1. THE Billing_Serializer SHALL provide serialize/deserialize for Coverage, Claim, EOB, CoverageEligibilityRequest, and CoverageEligibilityResponse.
2. The round-trip property SHALL hold.
3. Undefined/null fields SHALL be omitted; dates SHALL follow FHIR R4 formatting.

### Requirement 16: Billing ACL

**User Story:** As a healthcare administrator, I want billing-specific access control.

#### Acceptance Criteria

1. THE Billing ACL SHALL define a `BillingPermission` enum: BillingRead, BillingWrite, BillingSubmit (for claim submission), BillingAdmin.
2. THE Billing ACL SHALL define an `IBillingACL<TID>` extending IPoolACL.
3. BillingAdmin SHALL imply all other billing permissions.
4. THE Billing ACL SHALL integrate with SMART on FHIR v2 scopes.

### Requirement 17: Billing Audit Trail

**User Story:** As a compliance officer, I want a complete audit trail of all billing operations.

#### Acceptance Criteria

1. THE audit logger SHALL create entries for all billing operations (create, read, update, delete, search, submit, eligibility check, payment posting).
2. THE billing audit entries SHALL extend IClinicalAuditEntry with claimStatus, submissionEvent, and paymentAmount fields.
3. THE entries SHALL be stored in the shared audit pool.
4. THE entries SHALL be append-only.

### Requirement 18: Billing Specialty Extensions

**User Story:** As a product owner, I want the Specialty Adapter extended for billing-specific configurations.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IBillingSpecialtyExtension` interface with fields: specialtyCode, claimType (ICodeableConcept — the default claim type for the specialty), billingCodeSystems (terminology sets for billing codes), feeScheduleDefaults (default fee schedule entries), and validationRules.
2. THE Medical billing specialty SHALL use claim type "professional", CPT + HCPCS billing codes, and ICD-10-CM diagnosis codes.
3. THE Dental billing specialty SHALL use claim type "oral", CDT billing codes with tooth number (bodySite) and surface (subSite) on claim line items, and ICD-10-CM diagnosis codes.
4. THE Veterinary billing specialty SHALL use claim type "professional" (or a custom "veterinary" type), direct client invoicing as the primary billing model, with optional pet insurance claim support.
5. THE brightchart-lib library SHALL export predefined billing specialty extensions.

### Requirement 19: Portability Standard Extension for Billing

**User Story:** As a practice administrator, I want the portability standard extended to include billing data.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL define an `IBillingExportBundle<TID>` extending ISchedulingExportBundle from Module 6, adding: coverages, claims, explanationOfBenefits, eligibilityRequests, eligibilityResponses, superbills, feeSchedules, and ledgerEntries.
2. THE export bundle SHALL preserve all references.
3. The round-trip serialization property SHALL hold.

### Requirement 20: Insurance Card Editor Component

**User Story:** As a frontend developer, I want a React component for entering and editing patient insurance information.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide an `InsuranceCardEditor` component with inputs for: plan type, subscriber info, member ID, group number, plan name, payor (searchable), period, relationship to subscriber, and copay/deductible amounts.
2. WHEN submitted, THE form SHALL emit a complete ICoverageResource<string> via onSubmit.
3. THE form SHALL support edit mode with an existing Coverage prop.
4. THE form SHALL display inline validation errors.

### Requirement 21: Claim Builder Component

**User Story:** As a frontend developer, I want a React component for building and reviewing claims before submission.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `ClaimBuilder` component that accepts a superbill or manual entry and renders an editable claim form with: patient, provider, insurer, diagnoses (ICD-10 searchable), line items (CPT/CDT searchable with modifiers, quantity, charge), insurance selection, and total.
2. THE ClaimBuilder SHALL auto-populate from a superbill when provided.
3. THE ClaimBuilder SHALL display running totals and validate required fields.
4. WHEN submitted, THE form SHALL emit a complete IClaimResource<string> via onSubmit.
5. THE ClaimBuilder SHALL accept a specialty profile prop for code system filtering (CPT for medical, CDT for dental).

### Requirement 22: EOB Viewer Component

**User Story:** As a frontend developer, I want a React component for viewing Explanation of Benefit details.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide an `EOBViewer` component that accepts an IExplanationOfBenefitResource<string> and displays: claim reference, outcome, payment details, line item adjudication (allowed, paid, patient responsibility), totals, and process notes.
2. THE EOBViewer SHALL visually distinguish paid vs. denied vs. partial outcomes.
3. THE EOBViewer SHALL display per-line-item adjudication details.

### Requirement 23: Eligibility Checker Component

**User Story:** As a frontend developer, I want a React component for checking patient insurance eligibility.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide an `EligibilityChecker` component that accepts a patient and coverage, and provides a button to trigger eligibility verification.
2. WHEN eligibility is checked, THE component SHALL display the response: coverage active/inactive, benefit details, copay/deductible amounts, and any authorization requirements.
3. THE component SHALL accept an onCheck callback that receives the CoverageEligibilityRequest and returns the CoverageEligibilityResponse.

### Requirement 24: Patient Ledger Component

**User Story:** As a frontend developer, I want a React component displaying a patient's financial ledger.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `PatientLedgerView` component that accepts an IPatientLedger<string> and displays a chronological list of charges, payments, adjustments, and refunds with running balance.
2. THE PatientLedgerView SHALL visually distinguish entry types (charges red, payments green, adjustments blue).
3. THE PatientLedgerView SHALL display the current balance prominently.
4. THE PatientLedgerView SHALL support filtering by date range and entry type.

### Requirement 25: Superbill Component

**User Story:** As a frontend developer, I want a React component for encounter-level charge capture.

#### Acceptance Criteria

1. THE brightchart-react-components library SHALL provide a `SuperbillForm` component that accepts an encounter and renders a charge capture form with: diagnosis entry (ICD-10 searchable), procedure/service line items (CPT/CDT searchable with modifiers, quantity), auto-pricing from fee schedule, and total.
2. THE SuperbillForm SHALL auto-populate diagnoses from encounter diagnoses when available.
3. WHEN finalized, THE form SHALL emit the completed ISuperbill<string> via onFinalize.
4. THE SuperbillForm SHALL accept a specialty profile and fee schedule for code filtering and pricing.

### Requirement 26: Library Structure and Exports

**User Story:** As a developer, I want billing interfaces organized under a consistent directory structure.

#### Acceptance Criteria

1. THE brightchart-lib library SHALL organize billing interfaces under `src/lib/billing/`.
2. THE brightchart-lib library SHALL export all interfaces from src/index.ts.
3. THE interfaces SHALL reuse existing types from Modules 1–6.
4. THE brightchart-react-components library SHALL organize components under `src/lib/billing/`.
5. THE brightchart-react-components library SHALL export all components from src/index.ts.
