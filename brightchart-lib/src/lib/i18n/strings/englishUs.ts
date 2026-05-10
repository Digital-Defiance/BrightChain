import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChartStringKey,
  BrightChartStrings,
} from '../../enumerations/BrightChartStrings';

export const BrightChartAmericanEnglishStrings: ComponentStrings<BrightChartStringKey> =
  {
    // ── Menu / Navigation ──────────────────────────────────────────────
    [BrightChartStrings.MenuLabel]: 'BrightChart',
    [BrightChartStrings.ChartSectionsLabel]: 'Chart Sections',
    [BrightChartStrings.Nav_Conversations]: 'Conversations',
    [BrightChartStrings.Nav_Groups]: 'Groups',
    [BrightChartStrings.Nav_Channels]: 'Channels',

    // ── Shell / Notifications ──────────────────────────────────────────
    [BrightChartStrings.Notification_Type_Result]: 'Result',
    [BrightChartStrings.Notification_Type_Note]: 'Note',
    [BrightChartStrings.Notification_Type_Appointment]: 'Appointment',
    [BrightChartStrings.Notification_Type_Claim]: 'Claim',
    [BrightChartStrings.Notification_Type_Message]: 'Message',
    [BrightChartStrings.Notification_Type_System]: 'System',
    [BrightChartStrings.Notification_Priority_Normal]: 'Normal',
    [BrightChartStrings.Notification_Priority_Urgent]: 'Urgent',

    // ── Roles ──────────────────────────────────────────────────────────
    [BrightChartStrings.Role_Physician]: 'Physician',
    [BrightChartStrings.Role_RegisteredNurse]: 'Registered Nurse',
    [BrightChartStrings.Role_MedicalAssistant]: 'Medical Assistant',
    [BrightChartStrings.Role_Patient]: 'Patient',
    [BrightChartStrings.Role_ClinicalAdministrator]: 'Clinical Administrator',
    [BrightChartStrings.Role_Dentist]: 'Dentist',
    [BrightChartStrings.Role_Veterinarian]: 'Veterinarian',

    // ── Organization ───────────────────────────────────────────────────
    [BrightChartStrings.Org_EnrollmentMode_Open]: 'Open',
    [BrightChartStrings.Org_EnrollmentMode_InviteOnly]: 'Invite Only',

    // ── Audit ──────────────────────────────────────────────────────────
    [BrightChartStrings.Audit_Operation_Create]: 'Create',
    [BrightChartStrings.Audit_Operation_Read]: 'Read',
    [BrightChartStrings.Audit_Operation_Update]: 'Update',
    [BrightChartStrings.Audit_Operation_Delete]: 'Delete',
    [BrightChartStrings.Audit_Operation_Search]: 'Search',
    [BrightChartStrings.Audit_Operation_Merge]: 'Merge',

    // ── FHIR / Patient Identity ──────────────────────────────────────────
    [BrightChartStrings.Gender_Male]: 'Male',
    [BrightChartStrings.Gender_Female]: 'Female',
    [BrightChartStrings.Gender_Other]: 'Other',
    [BrightChartStrings.Gender_Unknown]: 'Unknown',

    [BrightChartStrings.NameUse_Usual]: 'Usual',
    [BrightChartStrings.NameUse_Official]: 'Official',
    [BrightChartStrings.NameUse_Temp]: 'Temporary',
    [BrightChartStrings.NameUse_Nickname]: 'Nickname',
    [BrightChartStrings.NameUse_Anonymous]: 'Anonymous',
    [BrightChartStrings.NameUse_Old]: 'Old',
    [BrightChartStrings.NameUse_Maiden]: 'Maiden',

    [BrightChartStrings.AddressUse_Home]: 'Home',
    [BrightChartStrings.AddressUse_Work]: 'Work',
    [BrightChartStrings.AddressUse_Temp]: 'Temporary',
    [BrightChartStrings.AddressUse_Old]: 'Old',
    [BrightChartStrings.AddressUse_Billing]: 'Billing',

    [BrightChartStrings.AddressType_Postal]: 'Postal',
    [BrightChartStrings.AddressType_Physical]: 'Physical',
    [BrightChartStrings.AddressType_Both]: 'Both',

    [BrightChartStrings.ContactSystem_Phone]: 'Phone',
    [BrightChartStrings.ContactSystem_Fax]: 'Fax',
    [BrightChartStrings.ContactSystem_Email]: 'Email',
    [BrightChartStrings.ContactSystem_Pager]: 'Pager',
    [BrightChartStrings.ContactSystem_Url]: 'URL',
    [BrightChartStrings.ContactSystem_Sms]: 'SMS',
    [BrightChartStrings.ContactSystem_Other]: 'Other',

    [BrightChartStrings.ContactUse_Home]: 'Home',
    [BrightChartStrings.ContactUse_Work]: 'Work',
    [BrightChartStrings.ContactUse_Temp]: 'Temporary',
    [BrightChartStrings.ContactUse_Old]: 'Old',
    [BrightChartStrings.ContactUse_Mobile]: 'Mobile',

    [BrightChartStrings.LinkType_ReplacedBy]: 'Replaced By',
    [BrightChartStrings.LinkType_Replaces]: 'Replaces',
    [BrightChartStrings.LinkType_Refer]: 'Refer',
    [BrightChartStrings.LinkType_SeeAlso]: 'See Also',

    [BrightChartStrings.IdentifierUse_Usual]: 'Usual',
    [BrightChartStrings.IdentifierUse_Official]: 'Official',
    [BrightChartStrings.IdentifierUse_Temp]: 'Temporary',
    [BrightChartStrings.IdentifierUse_Secondary]: 'Secondary',
    [BrightChartStrings.IdentifierUse_Old]: 'Old',

    // ── Clinical ─────────────────────────────────────────────────────────
    [BrightChartStrings.ObservationStatus_Registered]: 'Registered',
    [BrightChartStrings.ObservationStatus_Preliminary]: 'Preliminary',
    [BrightChartStrings.ObservationStatus_Final]: 'Final',
    [BrightChartStrings.ObservationStatus_Amended]: 'Amended',
    [BrightChartStrings.ObservationStatus_Corrected]: 'Corrected',
    [BrightChartStrings.ObservationStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.ObservationStatus_EnteredInError]: 'Entered in Error',
    [BrightChartStrings.ObservationStatus_Unknown]: 'Unknown',

    [BrightChartStrings.ConditionClinical_Active]: 'Active',
    [BrightChartStrings.ConditionClinical_Recurrence]: 'Recurrence',
    [BrightChartStrings.ConditionClinical_Relapse]: 'Relapse',
    [BrightChartStrings.ConditionClinical_Inactive]: 'Inactive',
    [BrightChartStrings.ConditionClinical_Remission]: 'Remission',
    [BrightChartStrings.ConditionClinical_Resolved]: 'Resolved',

    [BrightChartStrings.ConditionVerification_Unconfirmed]: 'Unconfirmed',
    [BrightChartStrings.ConditionVerification_Provisional]: 'Provisional',
    [BrightChartStrings.ConditionVerification_Differential]: 'Differential',
    [BrightChartStrings.ConditionVerification_Confirmed]: 'Confirmed',
    [BrightChartStrings.ConditionVerification_Refuted]: 'Refuted',
    [BrightChartStrings.ConditionVerification_EnteredInError]:
      'Entered in Error',

    [BrightChartStrings.AllergyType_Allergy]: 'Allergy',
    [BrightChartStrings.AllergyType_Intolerance]: 'Intolerance',

    [BrightChartStrings.AllergyCategory_Food]: 'Food',
    [BrightChartStrings.AllergyCategory_Medication]: 'Medication',
    [BrightChartStrings.AllergyCategory_Environment]: 'Environment',
    [BrightChartStrings.AllergyCategory_Biologic]: 'Biologic',

    [BrightChartStrings.AllergyCriticality_Low]: 'Low',
    [BrightChartStrings.AllergyCriticality_High]: 'High',
    [BrightChartStrings.AllergyCriticality_UnableToAssess]: 'Unable to Assess',

    [BrightChartStrings.AllergySeverity_Mild]: 'Mild',
    [BrightChartStrings.AllergySeverity_Moderate]: 'Moderate',
    [BrightChartStrings.AllergySeverity_Severe]: 'Severe',

    [BrightChartStrings.MedicationStatus_Active]: 'Active',
    [BrightChartStrings.MedicationStatus_Inactive]: 'Inactive',
    [BrightChartStrings.MedicationStatus_EnteredInError]: 'Entered in Error',

    [BrightChartStrings.MedStatementStatus_Active]: 'Active',
    [BrightChartStrings.MedStatementStatus_Completed]: 'Completed',
    [BrightChartStrings.MedStatementStatus_EnteredInError]: 'Entered in Error',
    [BrightChartStrings.MedStatementStatus_Intended]: 'Intended',
    [BrightChartStrings.MedStatementStatus_Stopped]: 'Stopped',
    [BrightChartStrings.MedStatementStatus_OnHold]: 'On Hold',
    [BrightChartStrings.MedStatementStatus_Unknown]: 'Unknown',
    [BrightChartStrings.MedStatementStatus_NotTaken]: 'Not Taken',

    [BrightChartStrings.ProcedureStatus_Preparation]: 'Preparation',
    [BrightChartStrings.ProcedureStatus_InProgress]: 'In Progress',
    [BrightChartStrings.ProcedureStatus_NotDone]: 'Not Done',
    [BrightChartStrings.ProcedureStatus_OnHold]: 'On Hold',
    [BrightChartStrings.ProcedureStatus_Stopped]: 'Stopped',
    [BrightChartStrings.ProcedureStatus_Completed]: 'Completed',
    [BrightChartStrings.ProcedureStatus_EnteredInError]: 'Entered in Error',
    [BrightChartStrings.ProcedureStatus_Unknown]: 'Unknown',

    // ── Encounter ────────────────────────────────────────────────────────
    [BrightChartStrings.EncounterStatus_Planned]: 'Planned',
    [BrightChartStrings.EncounterStatus_Arrived]: 'Arrived',
    [BrightChartStrings.EncounterStatus_Triaged]: 'Triaged',
    [BrightChartStrings.EncounterStatus_InProgress]: 'In Progress',
    [BrightChartStrings.EncounterStatus_OnLeave]: 'On Leave',
    [BrightChartStrings.EncounterStatus_Finished]: 'Finished',
    [BrightChartStrings.EncounterStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.EncounterStatus_EnteredInError]: 'Entered in Error',
    [BrightChartStrings.EncounterStatus_Unknown]: 'Unknown',

    [BrightChartStrings.EncounterLocationStatus_Planned]: 'Planned',
    [BrightChartStrings.EncounterLocationStatus_Active]: 'Active',
    [BrightChartStrings.EncounterLocationStatus_Reserved]: 'Reserved',
    [BrightChartStrings.EncounterLocationStatus_Completed]: 'Completed',

    [BrightChartStrings.EncounterClass_Inpatient]: 'Inpatient Encounter',
    [BrightChartStrings.EncounterClass_Ambulatory]: 'Ambulatory',
    [BrightChartStrings.EncounterClass_Emergency]: 'Emergency',
    [BrightChartStrings.EncounterClass_HomeHealth]: 'Home Health',
    [BrightChartStrings.EncounterClass_Virtual]: 'Virtual',
    [BrightChartStrings.EncounterClass_Field]: 'Field',
    [BrightChartStrings.EncounterClass_ShortStay]: 'Short Stay',
    [BrightChartStrings.EncounterClass_Observation]: 'Observation Encounter',
    [BrightChartStrings.EncounterClass_PreAdmission]: 'Pre-Admission',

    [BrightChartStrings.DiagnosisRole_Admission]: 'Admission Diagnosis',
    [BrightChartStrings.DiagnosisRole_Discharge]: 'Discharge Diagnosis',
    [BrightChartStrings.DiagnosisRole_ChiefComplaint]: 'Chief Complaint',
    [BrightChartStrings.DiagnosisRole_Comorbidity]: 'Comorbidity',
    [BrightChartStrings.DiagnosisRole_PreOp]: 'Pre-Op Diagnosis',
    [BrightChartStrings.DiagnosisRole_PostOp]: 'Post-Op Diagnosis',
    [BrightChartStrings.DiagnosisRole_Billing]: 'Billing Diagnosis',

    // ── Documentation ────────────────────────────────────────────────────
    [BrightChartStrings.CompositionStatus_Preliminary]: 'Preliminary',
    [BrightChartStrings.CompositionStatus_Final]: 'Final',
    [BrightChartStrings.CompositionStatus_Amended]: 'Amended',
    [BrightChartStrings.CompositionStatus_EnteredInError]: 'Entered in Error',

    [BrightChartStrings.DocRefStatus_Current]: 'Current',
    [BrightChartStrings.DocRefStatus_Superseded]: 'Superseded',
    [BrightChartStrings.DocRefStatus_EnteredInError]: 'Entered in Error',

    [BrightChartStrings.AttestationMode_Personal]: 'Personal',
    [BrightChartStrings.AttestationMode_Professional]: 'Professional',
    [BrightChartStrings.AttestationMode_Legal]: 'Legal',
    [BrightChartStrings.AttestationMode_Official]: 'Official',

    [BrightChartStrings.DocRelationship_Replaces]: 'Replaces',
    [BrightChartStrings.DocRelationship_Transforms]: 'Transforms',
    [BrightChartStrings.DocRelationship_Signs]: 'Signs',
    [BrightChartStrings.DocRelationship_Appends]: 'Appends',

    // ── Note Templates ───────────────────────────────────────────────────
    [BrightChartStrings.Template_SOAPNote_Name]: 'SOAP Note',
    [BrightChartStrings.Template_SOAPNote_Description]:
      'Standard Subjective, Objective, Assessment, Plan progress note format used in outpatient and inpatient settings.',
    [BrightChartStrings.Template_SOAPNote_Subjective]: 'Subjective',
    [BrightChartStrings.Template_SOAPNote_Objective]: 'Objective',
    [BrightChartStrings.Template_SOAPNote_Assessment]: 'Assessment',
    [BrightChartStrings.Template_SOAPNote_Plan]: 'Plan',

    [BrightChartStrings.Template_HP_Name]: 'History & Physical',
    [BrightChartStrings.Template_HP_Description]:
      'Comprehensive initial evaluation format for hospital admissions and new patient encounters.',
    [BrightChartStrings.Template_HP_ChiefComplaint]: 'Chief Complaint',
    [BrightChartStrings.Template_HP_HPI]: 'History of Present Illness',
    [BrightChartStrings.Template_HP_PastMedicalHistory]: 'Past Medical History',
    [BrightChartStrings.Template_HP_ReviewOfSystems]: 'Review of Systems',
    [BrightChartStrings.Template_HP_PhysicalExam]: 'Physical Examination',
    [BrightChartStrings.Template_HP_Assessment]: 'Assessment',
    [BrightChartStrings.Template_HP_Plan]: 'Plan',

    [BrightChartStrings.Template_Discharge_Name]: 'Discharge Summary',
    [BrightChartStrings.Template_Discharge_Description]:
      "Standard format for documenting a patient's hospital stay, diagnoses, course, and discharge plan.",
    [BrightChartStrings.Template_Discharge_AdmissionDiagnosis]:
      'Admission Diagnosis',
    [BrightChartStrings.Template_Discharge_HospitalCourse]: 'Hospital Course',
    [BrightChartStrings.Template_Discharge_DischargeDiagnosis]:
      'Discharge Diagnosis',
    [BrightChartStrings.Template_Discharge_DischargeMedications]:
      'Discharge Medications',
    [BrightChartStrings.Template_Discharge_FollowUp]: 'Follow-Up Instructions',

    [BrightChartStrings.Template_Procedure_Name]: 'Procedure Note',
    [BrightChartStrings.Template_Procedure_Description]:
      'Standard format for documenting clinical or surgical procedures including indication, description, findings, and follow-up.',
    [BrightChartStrings.Template_Procedure_Indication]: 'Indication',
    [BrightChartStrings.Template_Procedure_ProcedureDescription]:
      'Procedure Description',
    [BrightChartStrings.Template_Procedure_Findings]: 'Findings',
    [BrightChartStrings.Template_Procedure_Complications]: 'Complications',
    [BrightChartStrings.Template_Procedure_PostProcedurePlan]:
      'Post-Procedure Plan',

    // ── LOINC Document Types ─────────────────────────────────────────────
    [BrightChartStrings.DocType_ConsultationNote]: 'Consultation Note',
    [BrightChartStrings.DocType_DischargeSummary]: 'Discharge Summary',
    [BrightChartStrings.DocType_HistoryAndPhysical]: 'History and Physical',
    [BrightChartStrings.DocType_ProgressNote]: 'Progress Note',
    [BrightChartStrings.DocType_ProcedureNote]: 'Procedure Note',
    [BrightChartStrings.DocType_OperativeNote]: 'Operative Note',
    [BrightChartStrings.DocType_NurseNote]: 'Nurse Note',
    [BrightChartStrings.DocType_ReferralNote]: 'Referral Note',
    [BrightChartStrings.DocType_TransferSummary]: 'Transfer Summary',

    // ── Orders & Results ─────────────────────────────────────────────────
    [BrightChartStrings.ServiceRequestStatus_Draft]: 'Draft',
    [BrightChartStrings.ServiceRequestStatus_Active]: 'Active',
    [BrightChartStrings.ServiceRequestStatus_OnHold]: 'On Hold',
    [BrightChartStrings.ServiceRequestStatus_Revoked]: 'Revoked',
    [BrightChartStrings.ServiceRequestStatus_Completed]: 'Completed',
    [BrightChartStrings.ServiceRequestStatus_EnteredInError]:
      'Entered in Error',
    [BrightChartStrings.ServiceRequestStatus_Unknown]: 'Unknown',

    [BrightChartStrings.ServiceRequestIntent_Proposal]: 'Proposal',
    [BrightChartStrings.ServiceRequestIntent_Plan]: 'Plan',
    [BrightChartStrings.ServiceRequestIntent_Directive]: 'Directive',
    [BrightChartStrings.ServiceRequestIntent_Order]: 'Order',
    [BrightChartStrings.ServiceRequestIntent_OriginalOrder]: 'Original Order',
    [BrightChartStrings.ServiceRequestIntent_ReflexOrder]: 'Reflex Order',
    [BrightChartStrings.ServiceRequestIntent_FillerOrder]: 'Filler Order',
    [BrightChartStrings.ServiceRequestIntent_InstanceOrder]: 'Instance Order',
    [BrightChartStrings.ServiceRequestIntent_Option]: 'Option',

    [BrightChartStrings.MedRequestStatus_Active]: 'Active',
    [BrightChartStrings.MedRequestStatus_OnHold]: 'On Hold',
    [BrightChartStrings.MedRequestStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.MedRequestStatus_Completed]: 'Completed',
    [BrightChartStrings.MedRequestStatus_EnteredInError]: 'Entered in Error',
    [BrightChartStrings.MedRequestStatus_Stopped]: 'Stopped',
    [BrightChartStrings.MedRequestStatus_Draft]: 'Draft',
    [BrightChartStrings.MedRequestStatus_Unknown]: 'Unknown',

    [BrightChartStrings.MedRequestIntent_Proposal]: 'Proposal',
    [BrightChartStrings.MedRequestIntent_Plan]: 'Plan',
    [BrightChartStrings.MedRequestIntent_Order]: 'Order',
    [BrightChartStrings.MedRequestIntent_OriginalOrder]: 'Original Order',
    [BrightChartStrings.MedRequestIntent_ReflexOrder]: 'Reflex Order',
    [BrightChartStrings.MedRequestIntent_FillerOrder]: 'Filler Order',
    [BrightChartStrings.MedRequestIntent_InstanceOrder]: 'Instance Order',
    [BrightChartStrings.MedRequestIntent_Option]: 'Option',

    [BrightChartStrings.DiagnosticReportStatus_Registered]: 'Registered',
    [BrightChartStrings.DiagnosticReportStatus_Partial]: 'Partial',
    [BrightChartStrings.DiagnosticReportStatus_Preliminary]: 'Preliminary',
    [BrightChartStrings.DiagnosticReportStatus_Final]: 'Final',
    [BrightChartStrings.DiagnosticReportStatus_Amended]: 'Amended',
    [BrightChartStrings.DiagnosticReportStatus_Corrected]: 'Corrected',
    [BrightChartStrings.DiagnosticReportStatus_Appended]: 'Appended',
    [BrightChartStrings.DiagnosticReportStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.DiagnosticReportStatus_EnteredInError]:
      'Entered in Error',
    [BrightChartStrings.DiagnosticReportStatus_Unknown]: 'Unknown',

    [BrightChartStrings.RequestPriority_Routine]: 'Routine',
    [BrightChartStrings.RequestPriority_Urgent]: 'Urgent',
    [BrightChartStrings.RequestPriority_Asap]: 'ASAP',
    [BrightChartStrings.RequestPriority_Stat]: 'Stat',

    // ── Billing ──────────────────────────────────────────────────────────
    [BrightChartStrings.CoverageStatus_Active]: 'Active',
    [BrightChartStrings.CoverageStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.CoverageStatus_Draft]: 'Draft',
    [BrightChartStrings.CoverageStatus_EnteredInError]: 'Entered in Error',

    [BrightChartStrings.ClaimStatus_Active]: 'Active',
    [BrightChartStrings.ClaimStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.ClaimStatus_Draft]: 'Draft',
    [BrightChartStrings.ClaimStatus_EnteredInError]: 'Entered in Error',

    [BrightChartStrings.ClaimUse_Claim]: 'Claim',
    [BrightChartStrings.ClaimUse_Preauthorization]: 'Preauthorization',
    [BrightChartStrings.ClaimUse_Predetermination]: 'Predetermination',

    [BrightChartStrings.EOBStatus_Active]: 'Active',
    [BrightChartStrings.EOBStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.EOBStatus_Draft]: 'Draft',
    [BrightChartStrings.EOBStatus_EnteredInError]: 'Entered in Error',

    [BrightChartStrings.RemittanceOutcome_Queued]: 'Queued',
    [BrightChartStrings.RemittanceOutcome_Complete]: 'Complete',
    [BrightChartStrings.RemittanceOutcome_Error]: 'Error',
    [BrightChartStrings.RemittanceOutcome_Partial]: 'Partial',

    [BrightChartStrings.EligibilityPurpose_AuthRequirements]:
      'Authorization Requirements',
    [BrightChartStrings.EligibilityPurpose_Benefits]: 'Benefits',
    [BrightChartStrings.EligibilityPurpose_Discovery]: 'Discovery',
    [BrightChartStrings.EligibilityPurpose_Validation]: 'Validation',

    [BrightChartStrings.SuperbillStatus_Draft]: 'Draft',
    [BrightChartStrings.SuperbillStatus_Finalized]: 'Finalized',
    [BrightChartStrings.SuperbillStatus_Billed]: 'Billed',

    [BrightChartStrings.LedgerEntryType_Charge]: 'Charge',
    [BrightChartStrings.LedgerEntryType_Payment]: 'Payment',
    [BrightChartStrings.LedgerEntryType_Adjustment]: 'Adjustment',
    [BrightChartStrings.LedgerEntryType_Refund]: 'Refund',
    [BrightChartStrings.LedgerEntryType_WriteOff]: 'Write-Off',

    [BrightChartStrings.ClaimType_Institutional]: 'Institutional',
    [BrightChartStrings.ClaimType_Oral]: 'Oral',
    [BrightChartStrings.ClaimType_Pharmacy]: 'Pharmacy',
    [BrightChartStrings.ClaimType_Professional]: 'Professional',
    [BrightChartStrings.ClaimType_Vision]: 'Vision',

    // ── Scheduling ───────────────────────────────────────────────────────
    [BrightChartStrings.AppointmentStatus_Proposed]: 'Proposed',
    [BrightChartStrings.AppointmentStatus_Pending]: 'Pending',
    [BrightChartStrings.AppointmentStatus_Booked]: 'Booked',
    [BrightChartStrings.AppointmentStatus_Arrived]: 'Arrived',
    [BrightChartStrings.AppointmentStatus_Fulfilled]: 'Fulfilled',
    [BrightChartStrings.AppointmentStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.AppointmentStatus_Noshow]: 'No Show',
    [BrightChartStrings.AppointmentStatus_EnteredInError]: 'Entered in Error',
    [BrightChartStrings.AppointmentStatus_CheckedIn]: 'Checked In',
    [BrightChartStrings.AppointmentStatus_Waitlist]: 'Waitlist',

    [BrightChartStrings.SlotStatus_Busy]: 'Busy',
    [BrightChartStrings.SlotStatus_Free]: 'Free',
    [BrightChartStrings.SlotStatus_BusyUnavailable]: 'Busy (Unavailable)',
    [BrightChartStrings.SlotStatus_BusyTentative]: 'Busy (Tentative)',
    [BrightChartStrings.SlotStatus_EnteredInError]: 'Entered in Error',

    [BrightChartStrings.ParticipantRequired_Required]: 'Required',
    [BrightChartStrings.ParticipantRequired_Optional]: 'Optional',
    [BrightChartStrings.ParticipantRequired_InformationOnly]:
      'Information Only',

    [BrightChartStrings.ParticipationStatus_Accepted]: 'Accepted',
    [BrightChartStrings.ParticipationStatus_Declined]: 'Declined',
    [BrightChartStrings.ParticipationStatus_Tentative]: 'Tentative',
    [BrightChartStrings.ParticipationStatus_NeedsAction]: 'Needs Action',

    [BrightChartStrings.WaitlistStatus_Waiting]: 'Waiting',
    [BrightChartStrings.WaitlistStatus_Offered]: 'Offered',
    [BrightChartStrings.WaitlistStatus_Booked]: 'Booked',
    [BrightChartStrings.WaitlistStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.WaitlistStatus_Expired]: 'Expired',

    [BrightChartStrings.ReminderType_Sms]: 'SMS',
    [BrightChartStrings.ReminderType_Email]: 'Email',
    [BrightChartStrings.ReminderType_Push]: 'Push Notification',
    [BrightChartStrings.ReminderType_Phone]: 'Phone Call',

    [BrightChartStrings.ReminderStatus_Scheduled]: 'Scheduled',
    [BrightChartStrings.ReminderStatus_Sent]: 'Sent',
    [BrightChartStrings.ReminderStatus_Failed]: 'Failed',
    [BrightChartStrings.ReminderStatus_Cancelled]: 'Cancelled',

    // ── Offline / Sync ───────────────────────────────────────────────────
    [BrightChartStrings.Sync_Conflict]: 'Sync Conflict',
    [BrightChartStrings.Sync_Success]: 'Sync Successful',

    // ── FHIR OperationOutcome Severity ───────────────────────────────────
    [BrightChartStrings.IssueSeverity_Fatal]: 'Fatal',
    [BrightChartStrings.IssueSeverity_Error]: 'Error',
    [BrightChartStrings.IssueSeverity_Warning]: 'Warning',
    [BrightChartStrings.IssueSeverity_Information]: 'Information',

    // ── Narrative Status ─────────────────────────────────────────────────
    [BrightChartStrings.NarrativeStatus_Generated]: 'Generated',
    [BrightChartStrings.NarrativeStatus_Extensions]: 'Extensions',
    [BrightChartStrings.NarrativeStatus_Additional]: 'Additional',
    [BrightChartStrings.NarrativeStatus_Empty]: 'Empty',

    // ── Shell / UI ─────────────────────────────────────────────────────────
    [BrightChartStrings.Shell_Notifications]: 'Notifications',
    [BrightChartStrings.Shell_MarkAllRead]: 'Mark all read',
    [BrightChartStrings.Shell_NoNotifications]: 'No notifications',
    [BrightChartStrings.Shell_AccessDenied]: 'Access Denied',
    [BrightChartStrings.Shell_AccessDeniedMessage]:
      'You do not have permission to access this area.',
    [BrightChartStrings.Shell_Loading]: 'Loading...',

    // ── Patient Chart Tabs ─────────────────────────────────────────────────
    [BrightChartStrings.PatientChart_Title]: 'Patient Chart',
    [BrightChartStrings.PatientChart_Summary]: 'Summary',
    [BrightChartStrings.PatientChart_Problems]: 'Problems',
    [BrightChartStrings.PatientChart_Medications]: 'Medications',
    [BrightChartStrings.PatientChart_Allergies]: 'Allergies',
    [BrightChartStrings.PatientChart_Encounters]: 'Encounters',
    [BrightChartStrings.PatientChart_Documents]: 'Documents',
    [BrightChartStrings.PatientChart_Orders]: 'Orders',
    [BrightChartStrings.PatientChart_Results]: 'Results',
    [BrightChartStrings.PatientChart_Appointments]: 'Appointments',
    [BrightChartStrings.PatientChart_Insurance]: 'Insurance',
    [BrightChartStrings.PatientChart_Billing]: 'Billing',
    [BrightChartStrings.PatientChart_NoPatientSelected]: 'No patient selected.',

    // ── Encounter Dashboard ────────────────────────────────────────────────
    [BrightChartStrings.EncounterDashboard_Title]: "Today's Encounters",
    [BrightChartStrings.EncounterDashboard_Scheduled]: 'Scheduled',
    [BrightChartStrings.EncounterDashboard_InProgress]: 'In Progress',
    [BrightChartStrings.EncounterDashboard_PendingTasks]: 'Pending Tasks',

    // ── Clinician Inbox ────────────────────────────────────────────────────
    [BrightChartStrings.ClinicianInbox_Title]: 'Inbox',
    [BrightChartStrings.ClinicianInbox_PendingResults]: 'Pending Results',
    [BrightChartStrings.ClinicianInbox_UnsignedNotes]: 'Unsigned Notes',
    [BrightChartStrings.ClinicianInbox_Messages]: 'Messages',

    // ── Patient Portal ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientPortal_MyHealth]: 'My Health',
    [BrightChartStrings.PatientPortal_Welcome]: 'Welcome',
    [BrightChartStrings.PatientPortal_WelcomeUser]: 'Welcome, {NAME}',
    [BrightChartStrings.PatientPortal_ViewingRecordsAt]:
      'Viewing records at {ORG}',
    [BrightChartStrings.PatientPortal_NextAppointment]: 'Next Appointment',
    [BrightChartStrings.PatientPortal_NoneScheduled]: 'None scheduled',
    [BrightChartStrings.PatientPortal_ActiveMedications]: 'Active Medications',
    [BrightChartStrings.PatientPortal_RecentResults]: 'Recent Results',
    [BrightChartStrings.PatientPortal_OutstandingBalance]:
      'Outstanding Balance',
    [BrightChartStrings.PatientPortal_ClinicalTimeline]: 'Clinical Timeline',
    [BrightChartStrings.PatientPortal_Appointments]: 'Appointments',
    [BrightChartStrings.PatientPortal_RequestAppointment]:
      'Request Appointment',
    [BrightChartStrings.PatientPortal_Upcoming]: 'Upcoming',
    [BrightChartStrings.PatientPortal_NoUpcoming]: 'No upcoming appointments.',
    [BrightChartStrings.PatientPortal_Past]: 'Past',
    [BrightChartStrings.PatientPortal_TestResults]: 'Test Results',
    [BrightChartStrings.PatientPortal_BillsPayments]: 'Bills & Payments',

    // ── Front Desk ─────────────────────────────────────────────────────────
    [BrightChartStrings.FrontDesk_Title]: 'Front Desk',
    [BrightChartStrings.FrontDesk_TodaysAppointments]: "Today's Appointments",
    [BrightChartStrings.FrontDesk_CheckedIn]: 'Checked In',
    [BrightChartStrings.FrontDesk_Waitlist]: 'Waitlist',
    [BrightChartStrings.FrontDesk_PendingEligibility]: 'Pending Eligibility',
    [BrightChartStrings.FrontDesk_PatientCheckIn]: 'Patient Check-In',
    [BrightChartStrings.FrontDesk_PatientRegistration]: 'Patient Registration',

    // ── Billing Workspace ──────────────────────────────────────────────────
    [BrightChartStrings.BillingWS_Title]: 'Billing',
    [BrightChartStrings.BillingWS_UnbilledEncounters]: 'Unbilled Encounters',
    [BrightChartStrings.BillingWS_PendingClaims]: 'Pending Claims',
    [BrightChartStrings.BillingWS_DeniedClaims]: 'Denied Claims',
    [BrightChartStrings.BillingWS_TodaysPayments]: "Today's Payments",
    [BrightChartStrings.BillingWS_ClaimTracking]: 'Claim Tracking',
    [BrightChartStrings.BillingWS_PaymentPosting]: 'Payment Posting',

    // ── Admin Workspace ────────────────────────────────────────────────────
    [BrightChartStrings.Admin_UserManagement]: 'User Management',
    [BrightChartStrings.Admin_RoleConfiguration]: 'Role Configuration',
    [BrightChartStrings.Admin_AuditLog]: 'Audit Log',
    [BrightChartStrings.Admin_SpecialtyConfiguration]:
      'Specialty Configuration',
    [BrightChartStrings.Admin_PatientSearch]: 'Patient Search',

    // ── Common Table Headers / Labels ──────────────────────────────────────
    [BrightChartStrings.Common_Date]: 'Date',
    [BrightChartStrings.Common_Type]: 'Type',
    [BrightChartStrings.Common_Status]: 'Status',
    [BrightChartStrings.Common_Description]: 'Description',
    [BrightChartStrings.Common_Amount]: 'Amount',
    [BrightChartStrings.Common_Balance]: 'Balance',
    [BrightChartStrings.Common_Name]: 'Name',
    [BrightChartStrings.Common_Actions]: 'Actions',
    [BrightChartStrings.Common_Priority]: 'Priority',
    [BrightChartStrings.Common_Category]: 'Category',
    [BrightChartStrings.Common_Patient]: 'Patient',
    [BrightChartStrings.Common_Provider]: 'Provider',
    [BrightChartStrings.Common_Service]: 'Service',
    [BrightChartStrings.Common_Notes]: 'Notes',
    [BrightChartStrings.Common_From]: 'From',
    [BrightChartStrings.Common_To]: 'To',

    // ── Common Buttons / Actions ───────────────────────────────────────────
    [BrightChartStrings.Common_Save]: 'Save',
    [BrightChartStrings.Common_Cancel]: 'Cancel',
    [BrightChartStrings.Common_Search]: 'Search',
    [BrightChartStrings.Common_Add]: 'Add',
    [BrightChartStrings.Common_Remove]: 'Remove',
    [BrightChartStrings.Common_Submit]: 'Submit',
    [BrightChartStrings.Common_Create]: 'Create',
    [BrightChartStrings.Common_Update]: 'Update',
    [BrightChartStrings.Common_Delete]: 'Delete',
    [BrightChartStrings.Common_Sign]: 'Sign',
    [BrightChartStrings.Common_Close]: 'Close',
    [BrightChartStrings.Common_Back]: 'Back',
    [BrightChartStrings.Common_Next]: 'Next',
    [BrightChartStrings.Common_Previous]: 'Previous',
    [BrightChartStrings.Common_OfferSlot]: 'Offer Slot',
    [BrightChartStrings.Common_SelectSlot]: 'Select Slot',

    // ── Common Empty States ────────────────────────────────────────────────
    [BrightChartStrings.Empty_NoResults]: 'No results found.',
    [BrightChartStrings.Empty_NoDocuments]: 'No documents found',
    [BrightChartStrings.Empty_NoEncounters]: 'No encounters found.',
    [BrightChartStrings.Empty_NoOrders]: 'No orders match the current filters.',
    [BrightChartStrings.Empty_NoLedgerEntries]: 'No ledger entries found.',
    [BrightChartStrings.Empty_NoAllergies]: 'No Known Allergies',
    [BrightChartStrings.Empty_NoMedications]: 'No medications recorded.',
    [BrightChartStrings.Empty_NoConditions]: 'No conditions recorded.',
    [BrightChartStrings.Empty_NoAppointments]:
      'No appointments or available slots for the current view.',
    [BrightChartStrings.Empty_NoSlots]: 'No available slots.',
    [BrightChartStrings.Empty_NoWaitlist]: 'No patients on the waitlist.',
    [BrightChartStrings.Empty_NoPermission]:
      'You do not have permission to view patients.',

    // ── Form Labels ────────────────────────────────────────────────────────
    [BrightChartStrings.Form_GivenName]: 'Given Name',
    [BrightChartStrings.Form_FamilyName]: 'Family Name',
    [BrightChartStrings.Form_BirthDate]: 'Birth Date',
    [BrightChartStrings.Form_Gender]: 'Gender',
    [BrightChartStrings.Form_SelectGender]: 'Select gender',
    [BrightChartStrings.Form_Identifier]: 'Identifier',
    [BrightChartStrings.Form_Contact]: 'Contact',
    [BrightChartStrings.Form_Address]: 'Address',
    [BrightChartStrings.Form_CreatePatient]: 'Create Patient',
    [BrightChartStrings.Form_UpdatePatient]: 'Update Patient',
    [BrightChartStrings.Form_CreateOrder]: 'Create Order',
    [BrightChartStrings.Form_UpdateOrder]: 'Update Order',
    [BrightChartStrings.Form_CreatePrescription]: 'Create Prescription',
    [BrightChartStrings.Form_UpdatePrescription]: 'Update Prescription',
    [BrightChartStrings.Form_CreateObservation]: 'Create Observation',
    [BrightChartStrings.Form_UpdateObservation]: 'Update Observation',
    [BrightChartStrings.Form_BookAppointment]: 'Book Appointment',
    [BrightChartStrings.Form_RescheduleAppointment]: 'Reschedule Appointment',
    [BrightChartStrings.Form_CheckIn]: 'Check In',
    [BrightChartStrings.Form_UpdateEncounter]: 'Update Encounter',
    [BrightChartStrings.Form_SubmitClaim]: 'Submit Claim',
    [BrightChartStrings.Form_FinalizeSuperbill]: 'Finalize Superbill',

    // ── Allergy List ───────────────────────────────────────────────────────
    [BrightChartStrings.AllergyList_Title]: 'Allergies & Intolerances',
    [BrightChartStrings.AllergyList_AddNew]: '+ Add',

    // ── Condition List ─────────────────────────────────────────────────────
    [BrightChartStrings.ConditionList_Title]: 'Conditions / Problems',
    [BrightChartStrings.ConditionList_AddNew]: '+ Add',

    // ── Medication List ────────────────────────────────────────────────────
    [BrightChartStrings.MedicationList_Title]: 'Medications',
    [BrightChartStrings.MedicationList_ActiveMedications]: 'Active Medications',
    [BrightChartStrings.MedicationList_Completed]: 'Completed',
    [BrightChartStrings.MedicationList_Stopped]: 'Stopped',
    [BrightChartStrings.MedicationList_Other]: 'Other',

    // ── Encounter List ─────────────────────────────────────────────────────
    [BrightChartStrings.EncounterList_StatusFilter]: 'Status:',
    [BrightChartStrings.EncounterList_ClassFilter]: 'Class:',

    // ── Document List / Viewer ─────────────────────────────────────────────
    [BrightChartStrings.DocumentViewer_NoDocument]: 'No document to display',
    [BrightChartStrings.DocumentViewer_ExplanationOfBenefit]:
      'Explanation of Benefit',

    // ── Ledger ─────────────────────────────────────────────────────────────
    [BrightChartStrings.Ledger_CurrentBalance]: 'Current Balance:',

    // ── Waitlist ───────────────────────────────────────────────────────────
    [BrightChartStrings.Waitlist_Title]: 'Waitlist Manager',
    [BrightChartStrings.Waitlist_WaitTime]: 'Wait Time',
    [BrightChartStrings.Waitlist_PreferredDates]: 'Preferred Dates',
    [BrightChartStrings.Waitlist_PreferredProvider]: 'Preferred Provider',

    // ── Schedule ───────────────────────────────────────────────────────────
    [BrightChartStrings.Schedule_Day]: 'Day',
    [BrightChartStrings.Schedule_Week]: 'Week',
    [BrightChartStrings.Schedule_Month]: 'Month',
    [BrightChartStrings.Schedule_Available]: 'Available',

    // ── Clinical Note Editor ───────────────────────────────────────────────
    [BrightChartStrings.NoteEditor_EmptyState]:
      'No composition or template provided. Select a template to begin a new note.',

    // ── Insurance ──────────────────────────────────────────────────────────
    [BrightChartStrings.Insurance_PlanType]: 'Plan Type',
    [BrightChartStrings.Insurance_GroupNumber]: 'Group Number',
    [BrightChartStrings.Insurance_MemberID]: 'Member ID',
    [BrightChartStrings.Insurance_SubscriberName]: 'Subscriber Name',
    [BrightChartStrings.Insurance_Relationship]: 'Relationship',
    [BrightChartStrings.Insurance_PayerName]: 'Payer Name',
    [BrightChartStrings.Insurance_Eligibility]: 'Insurance Eligibility',

    // ── Clinical Timeline ──────────────────────────────────────────────────
    [BrightChartStrings.ClinicalTimeline_AriaLabel]: 'Clinical Timeline',
    [BrightChartStrings.ClinicalTimeline_FilterAriaLabel]:
      'Resource type filters',
    [BrightChartStrings.ClinicalTimeline_Empty]: 'No clinical data available.',
    [BrightChartStrings.ClinicalTimeline_Unknown]: 'Unknown',
    [BrightChartStrings.ClinicalTimeline_NoDate]: 'No date',

    // ── Note Template Selector ─────────────────────────────────────────────
    [BrightChartStrings.NoteTemplateSelector_AriaLabel]:
      'Note Template Selector',
    [BrightChartStrings.NoteTemplateSelector_Empty]: 'No templates available',
    [BrightChartStrings.NoteTemplateSelector_GroupAriaTemplate]:
      'Document type {CODE}',
    [BrightChartStrings.NoteTemplateSelector_SelectTemplate]:
      'Select template: {NAME}',

    // ── Encounter Workflow Board ───────────────────────────────────────────
    [BrightChartStrings.WorkflowBoard_AriaLabel]: 'Encounter Workflow Board',
    [BrightChartStrings.WorkflowBoard_UnknownPatient]: 'Unknown Patient',
    [BrightChartStrings.WorkflowBoard_NoEncounters]: 'No encounters',
    [BrightChartStrings.WorkflowBoard_ColumnAriaTemplate]: '{NAME} column',

    // ── Schedule Editor ────────────────────────────────────────────────────
    [BrightChartStrings.ScheduleEditor_Title]: 'Schedule Editor',
    [BrightChartStrings.ScheduleEditor_AriaLabel]:
      'Schedule Availability Editor',
    [BrightChartStrings.ScheduleEditor_AddBlockLegend]:
      'Add Availability Block',
    [BrightChartStrings.ScheduleEditor_DayLabel]: 'Day',
    [BrightChartStrings.ScheduleEditor_StartTime]: 'Start Time',
    [BrightChartStrings.ScheduleEditor_EndTime]: 'End Time',
    [BrightChartStrings.ScheduleEditor_RecurringWeekly]: 'Recurring weekly',
    [BrightChartStrings.ScheduleEditor_AddBlock]: 'Add Block',
    [BrightChartStrings.ScheduleEditor_StartBeforeEnd]:
      'Start time must be before end time',
    [BrightChartStrings.ScheduleEditor_NoAvailability]: 'No availability',
    [BrightChartStrings.ScheduleEditor_Recurring]: 'Recurring',
    [BrightChartStrings.ScheduleEditor_GridAriaLabel]:
      'Weekly availability grid',
    [BrightChartStrings.ScheduleEditor_SaveSchedule]: 'Save Schedule',
    [BrightChartStrings.ScheduleEditor_Day_Monday]: 'Monday',
    [BrightChartStrings.ScheduleEditor_Day_Tuesday]: 'Tuesday',
    [BrightChartStrings.ScheduleEditor_Day_Wednesday]: 'Wednesday',
    [BrightChartStrings.ScheduleEditor_Day_Thursday]: 'Thursday',
    [BrightChartStrings.ScheduleEditor_Day_Friday]: 'Friday',
    [BrightChartStrings.ScheduleEditor_Day_Saturday]: 'Saturday',
    [BrightChartStrings.ScheduleEditor_Day_Sunday]: 'Sunday',

    // ── Connectivity Indicator ─────────────────────────────────────────────
    [BrightChartStrings.Connectivity_Online]: 'Online',
    [BrightChartStrings.Connectivity_Offline]: 'Offline',
    [BrightChartStrings.Connectivity_StatusTemplate]:
      'Connection status: {STATUS}',

    // ── Notification Bell ──────────────────────────────────────────────────
    [BrightChartStrings.NotificationBell_AriaLabel]: 'Notifications',
    [BrightChartStrings.NotificationBell_UnreadTemplate]:
      'Notifications, {COUNT} unread',

    // ── Role Switcher ──────────────────────────────────────────────────────
    [BrightChartStrings.RoleSwitcher_AriaLabel]: 'Switch healthcare role',
    [BrightChartStrings.RoleSwitcher_MenuAriaLabel]:
      'Healthcare role selection',

    // ── Patient Header ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientHeader_AriaLabel]: 'Patient information',
    [BrightChartStrings.PatientHeader_Unknown]: 'Unknown',
    [BrightChartStrings.PatientHeader_MRN]: 'MRN:',
    [BrightChartStrings.PatientHeader_NA]: 'N/A',
    [BrightChartStrings.PatientHeader_AllergyTemplate]: 'Allergy: {NAME}',

    // ── Navigation Labels ──────────────────────────────────────────────────
    [BrightChartStrings.Nav_Patients]: 'Patients',
    [BrightChartStrings.Nav_Clients]: 'Clients',
    [BrightChartStrings.Nav_Encounters]: 'Encounters',
    [BrightChartStrings.Nav_Schedule]: 'Schedule',
    [BrightChartStrings.Nav_Inbox]: 'Inbox',
    [BrightChartStrings.Nav_OperatoryView]: 'Operatory View',
    [BrightChartStrings.Nav_TreatmentPlans]: 'Treatment Plans',
    [BrightChartStrings.Nav_SpeciesFilter]: 'Species Filter',
    [BrightChartStrings.Nav_FarmCalls]: 'Farm Calls',
    [BrightChartStrings.Nav_MyHealth]: 'My Health',
    [BrightChartStrings.Nav_Appointments]: 'Appointments',
    [BrightChartStrings.Nav_TestResults]: 'Test Results',
    [BrightChartStrings.Nav_BillsPayments]: 'Bills & Payments',
    [BrightChartStrings.Nav_CheckIn]: 'Check-In',
    [BrightChartStrings.Nav_Waitlist]: 'Waitlist',
    [BrightChartStrings.Nav_Registration]: 'Registration',
    [BrightChartStrings.Nav_Insurance]: 'Insurance',
    [BrightChartStrings.Nav_Superbills]: 'Superbills',
    [BrightChartStrings.Nav_Claims]: 'Claims',
    [BrightChartStrings.Nav_ClaimTracking]: 'Claim Tracking',
    [BrightChartStrings.Nav_Payments]: 'Payments',
    [BrightChartStrings.Nav_PatientLedger]: 'Patient Ledger',
    [BrightChartStrings.Nav_FeeSchedules]: 'Fee Schedules',
    [BrightChartStrings.Nav_Users]: 'Users',
    [BrightChartStrings.Nav_Roles]: 'Roles',
    [BrightChartStrings.Nav_AuditLog]: 'Audit Log',
    [BrightChartStrings.Nav_SpecialtyConfig]: 'Specialty Config',
    [BrightChartStrings.Nav_Settings]: 'Settings',
    [BrightChartStrings.Nav_Organizations]: 'Organizations',
    [BrightChartStrings.Nav_Clinician]: 'Clinician',
    [BrightChartStrings.Nav_PatientPortal]: 'Patient Portal',
    [BrightChartStrings.Nav_Billing]: 'Billing',

    // ── Sidebar ────────────────────────────────────────────────────────────
    [BrightChartStrings.Sidebar_ExpandAriaLabel]: 'Expand sidebar',
    [BrightChartStrings.Sidebar_CollapseAriaLabel]: 'Collapse sidebar',
    [BrightChartStrings.Sidebar_NavAriaLabel]: 'BrightChart navigation',

    // ── Bottom Nav ─────────────────────────────────────────────────────────
    [BrightChartStrings.BottomNav_AriaLabel]: 'BrightChart mobile navigation',

    // ── Layout ─────────────────────────────────────────────────────────────
    [BrightChartStrings.Layout_NavAriaTemplate]: '{NAME} navigation',
  };
