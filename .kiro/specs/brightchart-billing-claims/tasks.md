# Implementation Plan: BrightChart Billing & Claims

## Overview

This plan implements the Billing & Claims module — the final module in the BrightChart EHR platform. All new code is added to `brightchart-lib` under `src/lib/billing/` and `brightchart-react-components` under `src/lib/billing/`. Implementation proceeds: enumerations → backbone elements → resource models → fee schedule → superbill → ledger → lifecycle/submission → eligibility → service interfaces → specialty → portability → React components.

## Tasks

- [x] 1. Billing enumerations and constants
  - [x] 1.1 Create `brightchart-lib/src/lib/billing/enumerations.ts` defining exported enumerations: `CoverageStatus` (active, cancelled, draft, entered-in-error), `ClaimStatus` (active, cancelled, draft, entered-in-error), `ClaimUse` (claim, preauthorization, predetermination), `EOBStatus` (active, cancelled, draft, entered-in-error), `RemittanceOutcome` (queued, complete, error, partial), `EligibilityRequestPurpose` (auth-requirements, benefits, discovery, validation), `SuperbillStatus` (draft, finalized, billed), `LedgerEntryType` (charge, payment, adjustment, refund, write-off). Define exported claim type constants: CLAIM_TYPE_INSTITUTIONAL, CLAIM_TYPE_ORAL, CLAIM_TYPE_PHARMACY, CLAIM_TYPE_PROFESSIONAL, CLAIM_TYPE_VISION as ICodeableConcept objects.
    - _Requirements: 7.1, 7.2, 7.3, 11.1, 12.1_

- [x] 2. Money type and Coverage backbone elements
  - [x] 2.1 Create `brightchart-lib/src/lib/billing/moneyType.ts` defining exported `IMoney` interface (value: number, currency: string).
    - _Requirements: 2.4_

  - [x] 2.2 Create `brightchart-lib/src/lib/billing/coverageBackboneElements.ts` defining exported `CoverageClass<TID>` (type required, value required, name), `CoverageCostToBeneficiary<TID>` (type, valueQuantity/valueMoney, exception), `CoverageException` (type required, period).
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Claim backbone elements
  - [x] 3.1 Create `brightchart-lib/src/lib/billing/claimBackboneElements.ts` defining exported interfaces: `ClaimItem<TID>` (sequence, careTeamSequence, diagnosisSequence, procedureSequence, informationSequence, revenue, category, productOrService required, modifier, programCode, servicedDate/servicedPeriod, location variants, quantity, unitPrice, factor, net, udi, bodySite, subSite, encounter, detail), `ClaimItemDetail<TID>` and `ClaimItemDetailSubDetail<TID>` (sequence, revenue, category, productOrService required, modifier, programCode, quantity, unitPrice, factor, net, udi), `ClaimDiagnosis<TID>`, `ClaimProcedure<TID>`, `ClaimInsurance<TID>`, `ClaimCareTeam<TID>`, `ClaimSupportingInfo<TID>`, `ClaimPayee<TID>`, `ClaimRelated<TID>`, `ClaimAccident<TID>`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4. Resource interfaces
  - [x] 4.1 Create `brightchart-lib/src/lib/billing/coverageResource.ts` defining exported `ICoverageResource<TID = string>` with all FHIR R4 Coverage fields, FHIR metadata, brightchainMetadata, `resourceType: 'Coverage'`.
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 4.2 Create `brightchart-lib/src/lib/billing/claimResource.ts` defining exported `IClaimResource<TID = string>` with all FHIR R4 Claim fields, FHIR metadata, brightchainMetadata, `resourceType: 'Claim'`.
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.3 Create `brightchart-lib/src/lib/billing/eobResource.ts` defining exported `IExplanationOfBenefitResource<TID = string>` with key FHIR R4 EOB fields, FHIR metadata, brightchainMetadata, `resourceType: 'ExplanationOfBenefit'`. Define `EOBItem<TID>`, `EOBAdjudication`, `EOBTotal`, `EOBPayment` backbone elements.
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.4 Create `brightchart-lib/src/lib/billing/eligibilityResources.ts` defining exported `ICoverageEligibilityRequestResource<TID>` and `ICoverageEligibilityResponseResource<TID>` with key fields, FHIR metadata, brightchainMetadata.
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 4.5 Create `brightchart-lib/src/lib/billing/index.ts` barrel export. Update `brightchart-lib/src/index.ts`.
    - _Requirements: 26.1, 26.2_

- [x] 5. Fee schedule system
  - [x] 5.1 Create `brightchart-lib/src/lib/billing/feeSchedule/feeScheduleTypes.ts` defining exported `IFeeScheduleEntry` (code, codeSystem, description, defaultCharge, effectiveDate, expirationDate?, modifiers?), `IFeeSchedule` (scheduleId, name, specialtyCode, effectiveDate, entries), `IFeeScheduleService<TID>` (getCharge, getFeeSchedule, getActiveFeeSchedule).
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 5.2 Create `brightchart-lib/src/lib/billing/feeSchedule/index.ts` barrel export. Update billing index.
    - _Requirements: 26.2_

- [x] 6. Superbill interfaces
  - [x] 6.1 Create `brightchart-lib/src/lib/billing/superbill/superbillTypes.ts` defining exported `ISuperbillLineItem` (sequence, procedureCode, modifiers, quantity, unitCharge, totalCharge, diagnosisPointers, bodySite?, subSite?), `ISuperbill<TID>` (superbillId, encounterId, patientId, providerId, dateOfService, diagnoses, lineItems, status, totalCharge), `ISuperbillService<TID>` (createFromEncounter, addLineItem, removeLineItem, finalize, generateClaim).
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 6.2 Create `brightchart-lib/src/lib/billing/superbill/index.ts` barrel export. Update billing index.
    - _Requirements: 26.2_

- [x] 7. Patient ledger interfaces
  - [x] 7.1 Create `brightchart-lib/src/lib/billing/ledger/ledgerTypes.ts` defining exported `ILedgerEntry<TID>` (entryId, patientId, date, type, description, amount, relatedClaimId?, relatedEncounterId?, postedBy, balance), `IPatientLedger<TID>` (patientId, entries, currentBalance), `IPatientStatement<TID>` (patientId, statementDate, dateRange, entries, openingBalance, closingBalance, totalCharges, totalPayments), `ILedgerService<TID>` (getPatientLedger, postCharge, postPayment, postAdjustment, getStatement).
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 7.2 Create `brightchart-lib/src/lib/billing/ledger/index.ts` barrel export. Update billing index.
    - _Requirements: 26.2_

- [x] 8. Claim lifecycle and submission interfaces
  - [x] 8.1 Create `brightchart-lib/src/lib/billing/lifecycle/claimLifecycle.ts` defining exported `IClaimLifecycle<TID>` with isValidTransition and transition methods. Define `CLAIM_STATUS_TRANSITIONS` constant. Define `IClaimSubmissionService<TID>` (submit, checkStatus, void), `IClaimSubmissionResult<TID>` (success, submissionId, status, errors), `IClaimSubmissionStatus` (claimId, status, lastUpdated, adjudicationResult?).
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.2 Create `brightchart-lib/src/lib/billing/lifecycle/index.ts` barrel export. Update billing index.
    - _Requirements: 26.2_

- [x] 9. Eligibility service interface
  - [x] 9.1 Create `brightchart-lib/src/lib/billing/eligibility/eligibilityService.ts` defining exported `IEligibilityService<TID>` (checkEligibility, getEligibilityHistory).
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 9.2 Create `brightchart-lib/src/lib/billing/eligibility/index.ts` barrel export. Update billing index.
    - _Requirements: 26.2_

- [x] 10. Billing store interface
  - [x] 10.1 Create `brightchart-lib/src/lib/billing/store/billingStore.ts` defining exported `IBillingStore<TID>` with methods for Coverage, Claim, EOB, CoverageEligibilityRequest, CoverageEligibilityResponse, Superbill, and LedgerEntry.
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 10.2 Create `brightchart-lib/src/lib/billing/store/index.ts` barrel export. Update billing index.
    - _Requirements: 26.2_

- [x] 11. Billing search interface
  - [x] 11.1 Create `brightchart-lib/src/lib/billing/search/billingSearch.ts` defining exported `IBillingSearchParams`, `IBillingSearchResult<TID>`, and `IBillingSearchEngine<TID>`.
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 11.2 Create `brightchart-lib/src/lib/billing/search/index.ts` barrel export. Update billing index.
    - _Requirements: 26.2_

- [x] 12. Billing serializer interface
  - [x] 12.1 Create `brightchart-lib/src/lib/billing/serializer/billingSerializer.ts` defining exported serializer interfaces for Coverage, Claim, EOB, CoverageEligibilityRequest, CoverageEligibilityResponse, and the billing export bundle.
    - _Requirements: 15.1, 15.2, 15.3, 19.3_

  - [x] 12.2 Create `brightchart-lib/src/lib/billing/serializer/index.ts` barrel export. Update billing index.
    - _Requirements: 26.2_

- [x] 13. Billing ACL interface
  - [x] 13.1 Create `brightchart-lib/src/lib/billing/access/billingAcl.ts` defining exported `BillingPermission` enum (BillingRead, BillingWrite, BillingSubmit, BillingAdmin), `IBillingACL<TID>` extending IPoolACL, `hasBillingPermission` function signature, SMART scope mapping constants.
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 13.2 Create `brightchart-lib/src/lib/billing/access/index.ts` barrel export. Update billing index.
    - _Requirements: 26.2_

- [x] 14. Billing audit interface
  - [x] 14.1 Create `brightchart-lib/src/lib/billing/audit/billingAudit.ts` defining exported `IBillingAuditEntry<TID>` extending IClinicalAuditEntry with claimStatus, submissionEvent, paymentAmount. Export `IBillingAuditLogger<TID>`.
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [x] 14.2 Create `brightchart-lib/src/lib/billing/audit/index.ts` barrel export. Update billing index.
    - _Requirements: 26.2_

- [x] 15. Billing specialty extensions
  - [x] 15.1 Create `brightchart-lib/src/lib/billing/specialty/billingSpecialtyTypes.ts` defining exported `IBillingSpecialtyExtension` (specialtyCode, claimType, billingCodeSystems, feeScheduleDefaults, validationRules).
    - _Requirements: 18.1_

  - [x] 15.2 Create `brightchart-lib/src/lib/billing/specialty/medicalBillingProfile.ts` exporting `MEDICAL_BILLING_EXTENSION` with claim type professional, CPT + HCPCS + ICD-10-CM code systems.
    - _Requirements: 18.2_

  - [x] 15.3 Create `brightchart-lib/src/lib/billing/specialty/dentalBillingProfile.ts` exporting `DENTAL_BILLING_EXTENSION` with claim type oral, CDT + ICD-10-CM code systems, tooth/surface validation rules for claim line items.
    - _Requirements: 18.3_

  - [x] 15.4 Create `brightchart-lib/src/lib/billing/specialty/veterinaryBillingProfile.ts` exporting `VETERINARY_BILLING_EXTENSION` with direct invoicing model, optional pet insurance claim support.
    - _Requirements: 18.4_

  - [x] 15.5 Create `brightchart-lib/src/lib/billing/specialty/index.ts` barrel export. Update billing index.
    - _Requirements: 18.5, 26.2_

- [x] 16. Billing portability interface
  - [x] 16.1 Create `brightchart-lib/src/lib/billing/portability/billingPortability.ts` defining exported `IBillingExportBundle<TID>` extending ISchedulingExportBundle with coverages, claims, explanationOfBenefits, eligibilityRequests, eligibilityResponses, superbills, feeSchedules, ledgerEntries.
    - _Requirements: 19.1, 19.2_

  - [x] 16.2 Create `brightchart-lib/src/lib/billing/portability/index.ts` barrel export. Update billing index.
    - _Requirements: 26.2_

- [x] 17. Final barrel export verification
  - [x] 17.1 Verify `brightchart-lib/src/lib/billing/index.ts` re-exports all sub-modules. Verify `brightchart-lib/src/index.ts` re-exports from `./lib/billing/index`. Run `yarn nx run brightchart-lib:build`.
    - _Requirements: 26.1, 26.2, 26.3_

- [x] 18. React billing components
  - [x] 18.1 Create `brightchart-react-components/src/lib/billing/InsuranceCardEditor.tsx`. Props: onSubmit, coverage?. Plan type, subscriber, member ID, group, payor (searchable), period, relationship, copay/deductible. Validation.
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [x] 18.2 Create `brightchart-react-components/src/lib/billing/ClaimBuilder.tsx`. Props: onSubmit, superbill?, specialtyProfile?, feeSchedule?. Editable claim with diagnoses (ICD-10 searchable), line items (CPT/CDT searchable with modifiers, quantity, charge), insurance, totals. Auto-populate from superbill.
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

  - [x] 18.3 Create `brightchart-react-components/src/lib/billing/EOBViewer.tsx`. Props: eob. Outcome display, per-line adjudication (allowed, paid, patient responsibility), payment details, totals, process notes. Outcome styling.
    - _Requirements: 22.1, 22.2, 22.3_

  - [x] 18.4 Create `brightchart-react-components/src/lib/billing/EligibilityChecker.tsx`. Props: patient, coverage, onCheck. Eligibility trigger button, response display with coverage status, benefits, copay/deductible, auth requirements.
    - _Requirements: 23.1, 23.2, 23.3_

  - [x] 18.5 Create `brightchart-react-components/src/lib/billing/PatientLedgerView.tsx`. Props: ledger, filterDateRange?, filterTypes?. Chronological entries with running balance, type-colored entries (charges red, payments green, adjustments blue), prominent current balance, filtering.
    - _Requirements: 24.1, 24.2, 24.3, 24.4_

  - [x] 18.6 Create `brightchart-react-components/src/lib/billing/SuperbillForm.tsx`. Props: encounter?, onFinalize, specialtyProfile?, feeSchedule?. Diagnosis entry (ICD-10 searchable), procedure line items (CPT/CDT searchable with modifiers, quantity), auto-pricing from fee schedule, encounter auto-populate, total.
    - _Requirements: 25.1, 25.2, 25.3, 25.4_

  - [x] 18.7 Create `brightchart-react-components/src/lib/billing/index.ts` barrel export. Update `brightchart-react-components/src/index.ts`. Run `yarn nx run brightchart-react-components:build`.
    - _Requirements: 26.4, 26.5_
