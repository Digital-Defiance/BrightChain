import {
  BrandedStringKeyValue,
  createI18nStringKeys,
} from '@digitaldefiance/i18n-lib';

export const BrightChartComponentId = 'BrightChart';

export const BrightChartStrings = createI18nStringKeys(BrightChartComponentId, {
  // ── Menu / Navigation ──────────────────────────────────────────────────
  MenuLabel: 'MenuLabel',
  ChartSectionsLabel: 'ChartSectionsLabel',
  Nav_Conversations: 'Nav_Conversations',
  Nav_Groups: 'Nav_Groups',
  Nav_Channels: 'Nav_Channels',

  // ── Shell / Notifications ──────────────────────────────────────────────
  Notification_Type_Result: 'Notification_Type_Result',
  Notification_Type_Note: 'Notification_Type_Note',
  Notification_Type_Appointment: 'Notification_Type_Appointment',
  Notification_Type_Claim: 'Notification_Type_Claim',
  Notification_Type_Message: 'Notification_Type_Message',
  Notification_Type_System: 'Notification_Type_System',
  Notification_Priority_Normal: 'Notification_Priority_Normal',
  Notification_Priority_Urgent: 'Notification_Priority_Urgent',

  // ── Roles ──────────────────────────────────────────────────────────────
  Role_Physician: 'Role_Physician',
  Role_RegisteredNurse: 'Role_RegisteredNurse',
  Role_MedicalAssistant: 'Role_MedicalAssistant',
  Role_Patient: 'Role_Patient',
  Role_ClinicalAdministrator: 'Role_ClinicalAdministrator',
  Role_Dentist: 'Role_Dentist',
  Role_Veterinarian: 'Role_Veterinarian',

  // ── Organization ───────────────────────────────────────────────────────
  Org_EnrollmentMode_Open: 'Org_EnrollmentMode_Open',
  Org_EnrollmentMode_InviteOnly: 'Org_EnrollmentMode_InviteOnly',

  // ── Audit ──────────────────────────────────────────────────────────────
  Audit_Operation_Create: 'Audit_Operation_Create',
  Audit_Operation_Read: 'Audit_Operation_Read',
  Audit_Operation_Update: 'Audit_Operation_Update',
  Audit_Operation_Delete: 'Audit_Operation_Delete',
  Audit_Operation_Search: 'Audit_Operation_Search',
  Audit_Operation_Merge: 'Audit_Operation_Merge',

  // ── FHIR / Patient Identity ────────────────────────────────────────────
  Gender_Male: 'Gender_Male',
  Gender_Female: 'Gender_Female',
  Gender_Other: 'Gender_Other',
  Gender_Unknown: 'Gender_Unknown',

  NameUse_Usual: 'NameUse_Usual',
  NameUse_Official: 'NameUse_Official',
  NameUse_Temp: 'NameUse_Temp',
  NameUse_Nickname: 'NameUse_Nickname',
  NameUse_Anonymous: 'NameUse_Anonymous',
  NameUse_Old: 'NameUse_Old',
  NameUse_Maiden: 'NameUse_Maiden',

  AddressUse_Home: 'AddressUse_Home',
  AddressUse_Work: 'AddressUse_Work',
  AddressUse_Temp: 'AddressUse_Temp',
  AddressUse_Old: 'AddressUse_Old',
  AddressUse_Billing: 'AddressUse_Billing',

  AddressType_Postal: 'AddressType_Postal',
  AddressType_Physical: 'AddressType_Physical',
  AddressType_Both: 'AddressType_Both',

  ContactSystem_Phone: 'ContactSystem_Phone',
  ContactSystem_Fax: 'ContactSystem_Fax',
  ContactSystem_Email: 'ContactSystem_Email',
  ContactSystem_Pager: 'ContactSystem_Pager',
  ContactSystem_Url: 'ContactSystem_Url',
  ContactSystem_Sms: 'ContactSystem_Sms',
  ContactSystem_Other: 'ContactSystem_Other',

  ContactUse_Home: 'ContactUse_Home',
  ContactUse_Work: 'ContactUse_Work',
  ContactUse_Temp: 'ContactUse_Temp',
  ContactUse_Old: 'ContactUse_Old',
  ContactUse_Mobile: 'ContactUse_Mobile',

  LinkType_ReplacedBy: 'LinkType_ReplacedBy',
  LinkType_Replaces: 'LinkType_Replaces',
  LinkType_Refer: 'LinkType_Refer',
  LinkType_SeeAlso: 'LinkType_SeeAlso',

  IdentifierUse_Usual: 'IdentifierUse_Usual',
  IdentifierUse_Official: 'IdentifierUse_Official',
  IdentifierUse_Temp: 'IdentifierUse_Temp',
  IdentifierUse_Secondary: 'IdentifierUse_Secondary',
  IdentifierUse_Old: 'IdentifierUse_Old',

  // ── Clinical ───────────────────────────────────────────────────────────
  ObservationStatus_Registered: 'ObservationStatus_Registered',
  ObservationStatus_Preliminary: 'ObservationStatus_Preliminary',
  ObservationStatus_Final: 'ObservationStatus_Final',
  ObservationStatus_Amended: 'ObservationStatus_Amended',
  ObservationStatus_Corrected: 'ObservationStatus_Corrected',
  ObservationStatus_Cancelled: 'ObservationStatus_Cancelled',
  ObservationStatus_EnteredInError: 'ObservationStatus_EnteredInError',
  ObservationStatus_Unknown: 'ObservationStatus_Unknown',

  ConditionClinical_Active: 'ConditionClinical_Active',
  ConditionClinical_Recurrence: 'ConditionClinical_Recurrence',
  ConditionClinical_Relapse: 'ConditionClinical_Relapse',
  ConditionClinical_Inactive: 'ConditionClinical_Inactive',
  ConditionClinical_Remission: 'ConditionClinical_Remission',
  ConditionClinical_Resolved: 'ConditionClinical_Resolved',

  ConditionVerification_Unconfirmed: 'ConditionVerification_Unconfirmed',
  ConditionVerification_Provisional: 'ConditionVerification_Provisional',
  ConditionVerification_Differential: 'ConditionVerification_Differential',
  ConditionVerification_Confirmed: 'ConditionVerification_Confirmed',
  ConditionVerification_Refuted: 'ConditionVerification_Refuted',
  ConditionVerification_EnteredInError: 'ConditionVerification_EnteredInError',

  AllergyType_Allergy: 'AllergyType_Allergy',
  AllergyType_Intolerance: 'AllergyType_Intolerance',

  AllergyCategory_Food: 'AllergyCategory_Food',
  AllergyCategory_Medication: 'AllergyCategory_Medication',
  AllergyCategory_Environment: 'AllergyCategory_Environment',
  AllergyCategory_Biologic: 'AllergyCategory_Biologic',

  AllergyCriticality_Low: 'AllergyCriticality_Low',
  AllergyCriticality_High: 'AllergyCriticality_High',
  AllergyCriticality_UnableToAssess: 'AllergyCriticality_UnableToAssess',

  AllergySeverity_Mild: 'AllergySeverity_Mild',
  AllergySeverity_Moderate: 'AllergySeverity_Moderate',
  AllergySeverity_Severe: 'AllergySeverity_Severe',

  MedicationStatus_Active: 'MedicationStatus_Active',
  MedicationStatus_Inactive: 'MedicationStatus_Inactive',
  MedicationStatus_EnteredInError: 'MedicationStatus_EnteredInError',

  MedStatementStatus_Active: 'MedStatementStatus_Active',
  MedStatementStatus_Completed: 'MedStatementStatus_Completed',
  MedStatementStatus_EnteredInError: 'MedStatementStatus_EnteredInError',
  MedStatementStatus_Intended: 'MedStatementStatus_Intended',
  MedStatementStatus_Stopped: 'MedStatementStatus_Stopped',
  MedStatementStatus_OnHold: 'MedStatementStatus_OnHold',
  MedStatementStatus_Unknown: 'MedStatementStatus_Unknown',
  MedStatementStatus_NotTaken: 'MedStatementStatus_NotTaken',

  ProcedureStatus_Preparation: 'ProcedureStatus_Preparation',
  ProcedureStatus_InProgress: 'ProcedureStatus_InProgress',
  ProcedureStatus_NotDone: 'ProcedureStatus_NotDone',
  ProcedureStatus_OnHold: 'ProcedureStatus_OnHold',
  ProcedureStatus_Stopped: 'ProcedureStatus_Stopped',
  ProcedureStatus_Completed: 'ProcedureStatus_Completed',
  ProcedureStatus_EnteredInError: 'ProcedureStatus_EnteredInError',
  ProcedureStatus_Unknown: 'ProcedureStatus_Unknown',

  // ── Encounter ──────────────────────────────────────────────────────────
  EncounterStatus_Planned: 'EncounterStatus_Planned',
  EncounterStatus_Arrived: 'EncounterStatus_Arrived',
  EncounterStatus_Triaged: 'EncounterStatus_Triaged',
  EncounterStatus_InProgress: 'EncounterStatus_InProgress',
  EncounterStatus_OnLeave: 'EncounterStatus_OnLeave',
  EncounterStatus_Finished: 'EncounterStatus_Finished',
  EncounterStatus_Cancelled: 'EncounterStatus_Cancelled',
  EncounterStatus_EnteredInError: 'EncounterStatus_EnteredInError',
  EncounterStatus_Unknown: 'EncounterStatus_Unknown',

  EncounterLocationStatus_Planned: 'EncounterLocationStatus_Planned',
  EncounterLocationStatus_Active: 'EncounterLocationStatus_Active',
  EncounterLocationStatus_Reserved: 'EncounterLocationStatus_Reserved',
  EncounterLocationStatus_Completed: 'EncounterLocationStatus_Completed',

  EncounterClass_Inpatient: 'EncounterClass_Inpatient',
  EncounterClass_Ambulatory: 'EncounterClass_Ambulatory',
  EncounterClass_Emergency: 'EncounterClass_Emergency',
  EncounterClass_HomeHealth: 'EncounterClass_HomeHealth',
  EncounterClass_Virtual: 'EncounterClass_Virtual',
  EncounterClass_Field: 'EncounterClass_Field',
  EncounterClass_ShortStay: 'EncounterClass_ShortStay',
  EncounterClass_Observation: 'EncounterClass_Observation',
  EncounterClass_PreAdmission: 'EncounterClass_PreAdmission',

  DiagnosisRole_Admission: 'DiagnosisRole_Admission',
  DiagnosisRole_Discharge: 'DiagnosisRole_Discharge',
  DiagnosisRole_ChiefComplaint: 'DiagnosisRole_ChiefComplaint',
  DiagnosisRole_Comorbidity: 'DiagnosisRole_Comorbidity',
  DiagnosisRole_PreOp: 'DiagnosisRole_PreOp',
  DiagnosisRole_PostOp: 'DiagnosisRole_PostOp',
  DiagnosisRole_Billing: 'DiagnosisRole_Billing',

  // ── Documentation ──────────────────────────────────────────────────────
  CompositionStatus_Preliminary: 'CompositionStatus_Preliminary',
  CompositionStatus_Final: 'CompositionStatus_Final',
  CompositionStatus_Amended: 'CompositionStatus_Amended',
  CompositionStatus_EnteredInError: 'CompositionStatus_EnteredInError',

  DocRefStatus_Current: 'DocRefStatus_Current',
  DocRefStatus_Superseded: 'DocRefStatus_Superseded',
  DocRefStatus_EnteredInError: 'DocRefStatus_EnteredInError',

  AttestationMode_Personal: 'AttestationMode_Personal',
  AttestationMode_Professional: 'AttestationMode_Professional',
  AttestationMode_Legal: 'AttestationMode_Legal',
  AttestationMode_Official: 'AttestationMode_Official',

  DocRelationship_Replaces: 'DocRelationship_Replaces',
  DocRelationship_Transforms: 'DocRelationship_Transforms',
  DocRelationship_Signs: 'DocRelationship_Signs',
  DocRelationship_Appends: 'DocRelationship_Appends',

  // ── Note Templates ─────────────────────────────────────────────────────
  Template_SOAPNote_Name: 'Template_SOAPNote_Name',
  Template_SOAPNote_Description: 'Template_SOAPNote_Description',
  Template_SOAPNote_Subjective: 'Template_SOAPNote_Subjective',
  Template_SOAPNote_Objective: 'Template_SOAPNote_Objective',
  Template_SOAPNote_Assessment: 'Template_SOAPNote_Assessment',
  Template_SOAPNote_Plan: 'Template_SOAPNote_Plan',

  Template_HP_Name: 'Template_HP_Name',
  Template_HP_Description: 'Template_HP_Description',
  Template_HP_ChiefComplaint: 'Template_HP_ChiefComplaint',
  Template_HP_HPI: 'Template_HP_HPI',
  Template_HP_PastMedicalHistory: 'Template_HP_PastMedicalHistory',
  Template_HP_ReviewOfSystems: 'Template_HP_ReviewOfSystems',
  Template_HP_PhysicalExam: 'Template_HP_PhysicalExam',
  Template_HP_Assessment: 'Template_HP_Assessment',
  Template_HP_Plan: 'Template_HP_Plan',

  Template_Discharge_Name: 'Template_Discharge_Name',
  Template_Discharge_Description: 'Template_Discharge_Description',
  Template_Discharge_AdmissionDiagnosis:
    'Template_Discharge_AdmissionDiagnosis',
  Template_Discharge_HospitalCourse: 'Template_Discharge_HospitalCourse',
  Template_Discharge_DischargeDiagnosis:
    'Template_Discharge_DischargeDiagnosis',
  Template_Discharge_DischargeMedications:
    'Template_Discharge_DischargeMedications',
  Template_Discharge_FollowUp: 'Template_Discharge_FollowUp',

  Template_Procedure_Name: 'Template_Procedure_Name',
  Template_Procedure_Description: 'Template_Procedure_Description',
  Template_Procedure_Indication: 'Template_Procedure_Indication',
  Template_Procedure_ProcedureDescription:
    'Template_Procedure_ProcedureDescription',
  Template_Procedure_Findings: 'Template_Procedure_Findings',
  Template_Procedure_Complications: 'Template_Procedure_Complications',
  Template_Procedure_PostProcedurePlan: 'Template_Procedure_PostProcedurePlan',

  // ── LOINC Document Types ───────────────────────────────────────────────
  DocType_ConsultationNote: 'DocType_ConsultationNote',
  DocType_DischargeSummary: 'DocType_DischargeSummary',
  DocType_HistoryAndPhysical: 'DocType_HistoryAndPhysical',
  DocType_ProgressNote: 'DocType_ProgressNote',
  DocType_ProcedureNote: 'DocType_ProcedureNote',
  DocType_OperativeNote: 'DocType_OperativeNote',
  DocType_NurseNote: 'DocType_NurseNote',
  DocType_ReferralNote: 'DocType_ReferralNote',
  DocType_TransferSummary: 'DocType_TransferSummary',

  // ── Orders & Results ───────────────────────────────────────────────────
  ServiceRequestStatus_Draft: 'ServiceRequestStatus_Draft',
  ServiceRequestStatus_Active: 'ServiceRequestStatus_Active',
  ServiceRequestStatus_OnHold: 'ServiceRequestStatus_OnHold',
  ServiceRequestStatus_Revoked: 'ServiceRequestStatus_Revoked',
  ServiceRequestStatus_Completed: 'ServiceRequestStatus_Completed',
  ServiceRequestStatus_EnteredInError: 'ServiceRequestStatus_EnteredInError',
  ServiceRequestStatus_Unknown: 'ServiceRequestStatus_Unknown',

  ServiceRequestIntent_Proposal: 'ServiceRequestIntent_Proposal',
  ServiceRequestIntent_Plan: 'ServiceRequestIntent_Plan',
  ServiceRequestIntent_Directive: 'ServiceRequestIntent_Directive',
  ServiceRequestIntent_Order: 'ServiceRequestIntent_Order',
  ServiceRequestIntent_OriginalOrder: 'ServiceRequestIntent_OriginalOrder',
  ServiceRequestIntent_ReflexOrder: 'ServiceRequestIntent_ReflexOrder',
  ServiceRequestIntent_FillerOrder: 'ServiceRequestIntent_FillerOrder',
  ServiceRequestIntent_InstanceOrder: 'ServiceRequestIntent_InstanceOrder',
  ServiceRequestIntent_Option: 'ServiceRequestIntent_Option',

  MedRequestStatus_Active: 'MedRequestStatus_Active',
  MedRequestStatus_OnHold: 'MedRequestStatus_OnHold',
  MedRequestStatus_Cancelled: 'MedRequestStatus_Cancelled',
  MedRequestStatus_Completed: 'MedRequestStatus_Completed',
  MedRequestStatus_EnteredInError: 'MedRequestStatus_EnteredInError',
  MedRequestStatus_Stopped: 'MedRequestStatus_Stopped',
  MedRequestStatus_Draft: 'MedRequestStatus_Draft',
  MedRequestStatus_Unknown: 'MedRequestStatus_Unknown',

  MedRequestIntent_Proposal: 'MedRequestIntent_Proposal',
  MedRequestIntent_Plan: 'MedRequestIntent_Plan',
  MedRequestIntent_Order: 'MedRequestIntent_Order',
  MedRequestIntent_OriginalOrder: 'MedRequestIntent_OriginalOrder',
  MedRequestIntent_ReflexOrder: 'MedRequestIntent_ReflexOrder',
  MedRequestIntent_FillerOrder: 'MedRequestIntent_FillerOrder',
  MedRequestIntent_InstanceOrder: 'MedRequestIntent_InstanceOrder',
  MedRequestIntent_Option: 'MedRequestIntent_Option',

  DiagnosticReportStatus_Registered: 'DiagnosticReportStatus_Registered',
  DiagnosticReportStatus_Partial: 'DiagnosticReportStatus_Partial',
  DiagnosticReportStatus_Preliminary: 'DiagnosticReportStatus_Preliminary',
  DiagnosticReportStatus_Final: 'DiagnosticReportStatus_Final',
  DiagnosticReportStatus_Amended: 'DiagnosticReportStatus_Amended',
  DiagnosticReportStatus_Corrected: 'DiagnosticReportStatus_Corrected',
  DiagnosticReportStatus_Appended: 'DiagnosticReportStatus_Appended',
  DiagnosticReportStatus_Cancelled: 'DiagnosticReportStatus_Cancelled',
  DiagnosticReportStatus_EnteredInError:
    'DiagnosticReportStatus_EnteredInError',
  DiagnosticReportStatus_Unknown: 'DiagnosticReportStatus_Unknown',

  RequestPriority_Routine: 'RequestPriority_Routine',
  RequestPriority_Urgent: 'RequestPriority_Urgent',
  RequestPriority_Asap: 'RequestPriority_Asap',
  RequestPriority_Stat: 'RequestPriority_Stat',

  // ── Billing ────────────────────────────────────────────────────────────
  CoverageStatus_Active: 'CoverageStatus_Active',
  CoverageStatus_Cancelled: 'CoverageStatus_Cancelled',
  CoverageStatus_Draft: 'CoverageStatus_Draft',
  CoverageStatus_EnteredInError: 'CoverageStatus_EnteredInError',

  ClaimStatus_Active: 'ClaimStatus_Active',
  ClaimStatus_Cancelled: 'ClaimStatus_Cancelled',
  ClaimStatus_Draft: 'ClaimStatus_Draft',
  ClaimStatus_EnteredInError: 'ClaimStatus_EnteredInError',

  ClaimUse_Claim: 'ClaimUse_Claim',
  ClaimUse_Preauthorization: 'ClaimUse_Preauthorization',
  ClaimUse_Predetermination: 'ClaimUse_Predetermination',

  EOBStatus_Active: 'EOBStatus_Active',
  EOBStatus_Cancelled: 'EOBStatus_Cancelled',
  EOBStatus_Draft: 'EOBStatus_Draft',
  EOBStatus_EnteredInError: 'EOBStatus_EnteredInError',

  RemittanceOutcome_Queued: 'RemittanceOutcome_Queued',
  RemittanceOutcome_Complete: 'RemittanceOutcome_Complete',
  RemittanceOutcome_Error: 'RemittanceOutcome_Error',
  RemittanceOutcome_Partial: 'RemittanceOutcome_Partial',

  EligibilityPurpose_AuthRequirements: 'EligibilityPurpose_AuthRequirements',
  EligibilityPurpose_Benefits: 'EligibilityPurpose_Benefits',
  EligibilityPurpose_Discovery: 'EligibilityPurpose_Discovery',
  EligibilityPurpose_Validation: 'EligibilityPurpose_Validation',

  SuperbillStatus_Draft: 'SuperbillStatus_Draft',
  SuperbillStatus_Finalized: 'SuperbillStatus_Finalized',
  SuperbillStatus_Billed: 'SuperbillStatus_Billed',

  LedgerEntryType_Charge: 'LedgerEntryType_Charge',
  LedgerEntryType_Payment: 'LedgerEntryType_Payment',
  LedgerEntryType_Adjustment: 'LedgerEntryType_Adjustment',
  LedgerEntryType_Refund: 'LedgerEntryType_Refund',
  LedgerEntryType_WriteOff: 'LedgerEntryType_WriteOff',

  ClaimType_Institutional: 'ClaimType_Institutional',
  ClaimType_Oral: 'ClaimType_Oral',
  ClaimType_Pharmacy: 'ClaimType_Pharmacy',
  ClaimType_Professional: 'ClaimType_Professional',
  ClaimType_Vision: 'ClaimType_Vision',

  // ── Scheduling ─────────────────────────────────────────────────────────
  AppointmentStatus_Proposed: 'AppointmentStatus_Proposed',
  AppointmentStatus_Pending: 'AppointmentStatus_Pending',
  AppointmentStatus_Booked: 'AppointmentStatus_Booked',
  AppointmentStatus_Arrived: 'AppointmentStatus_Arrived',
  AppointmentStatus_Fulfilled: 'AppointmentStatus_Fulfilled',
  AppointmentStatus_Cancelled: 'AppointmentStatus_Cancelled',
  AppointmentStatus_Noshow: 'AppointmentStatus_Noshow',
  AppointmentStatus_EnteredInError: 'AppointmentStatus_EnteredInError',
  AppointmentStatus_CheckedIn: 'AppointmentStatus_CheckedIn',
  AppointmentStatus_Waitlist: 'AppointmentStatus_Waitlist',

  SlotStatus_Busy: 'SlotStatus_Busy',
  SlotStatus_Free: 'SlotStatus_Free',
  SlotStatus_BusyUnavailable: 'SlotStatus_BusyUnavailable',
  SlotStatus_BusyTentative: 'SlotStatus_BusyTentative',
  SlotStatus_EnteredInError: 'SlotStatus_EnteredInError',

  ParticipantRequired_Required: 'ParticipantRequired_Required',
  ParticipantRequired_Optional: 'ParticipantRequired_Optional',
  ParticipantRequired_InformationOnly: 'ParticipantRequired_InformationOnly',

  ParticipationStatus_Accepted: 'ParticipationStatus_Accepted',
  ParticipationStatus_Declined: 'ParticipationStatus_Declined',
  ParticipationStatus_Tentative: 'ParticipationStatus_Tentative',
  ParticipationStatus_NeedsAction: 'ParticipationStatus_NeedsAction',

  WaitlistStatus_Waiting: 'WaitlistStatus_Waiting',
  WaitlistStatus_Offered: 'WaitlistStatus_Offered',
  WaitlistStatus_Booked: 'WaitlistStatus_Booked',
  WaitlistStatus_Cancelled: 'WaitlistStatus_Cancelled',
  WaitlistStatus_Expired: 'WaitlistStatus_Expired',

  ReminderType_Sms: 'ReminderType_Sms',
  ReminderType_Email: 'ReminderType_Email',
  ReminderType_Push: 'ReminderType_Push',
  ReminderType_Phone: 'ReminderType_Phone',

  ReminderStatus_Scheduled: 'ReminderStatus_Scheduled',
  ReminderStatus_Sent: 'ReminderStatus_Sent',
  ReminderStatus_Failed: 'ReminderStatus_Failed',
  ReminderStatus_Cancelled: 'ReminderStatus_Cancelled',

  // ── Offline / Sync ─────────────────────────────────────────────────────
  Sync_Conflict: 'Sync_Conflict',
  Sync_Success: 'Sync_Success',

  // ── FHIR OperationOutcome Severity ─────────────────────────────────────
  IssueSeverity_Fatal: 'IssueSeverity_Fatal',
  IssueSeverity_Error: 'IssueSeverity_Error',
  IssueSeverity_Warning: 'IssueSeverity_Warning',
  IssueSeverity_Information: 'IssueSeverity_Information',

  // ── Narrative Status ───────────────────────────────────────────────────
  NarrativeStatus_Generated: 'NarrativeStatus_Generated',
  NarrativeStatus_Extensions: 'NarrativeStatus_Extensions',
  NarrativeStatus_Additional: 'NarrativeStatus_Additional',
  NarrativeStatus_Empty: 'NarrativeStatus_Empty',

  // ── Shell / UI ─────────────────────────────────────────────────────────
  Shell_Notifications: 'Shell_Notifications',
  Shell_MarkAllRead: 'Shell_MarkAllRead',
  Shell_NoNotifications: 'Shell_NoNotifications',
  Shell_AccessDenied: 'Shell_AccessDenied',
  Shell_AccessDeniedMessage: 'Shell_AccessDeniedMessage',
  Shell_Loading: 'Shell_Loading',

  // ── Patient Chart Tabs ─────────────────────────────────────────────────
  PatientChart_Title: 'PatientChart_Title',
  PatientChart_Summary: 'PatientChart_Summary',
  PatientChart_Problems: 'PatientChart_Problems',
  PatientChart_Medications: 'PatientChart_Medications',
  PatientChart_Allergies: 'PatientChart_Allergies',
  PatientChart_Encounters: 'PatientChart_Encounters',
  PatientChart_Documents: 'PatientChart_Documents',
  PatientChart_Orders: 'PatientChart_Orders',
  PatientChart_Results: 'PatientChart_Results',
  PatientChart_Appointments: 'PatientChart_Appointments',
  PatientChart_Insurance: 'PatientChart_Insurance',
  PatientChart_Billing: 'PatientChart_Billing',
  PatientChart_NoPatientSelected: 'PatientChart_NoPatientSelected',

  // ── Encounter Dashboard ────────────────────────────────────────────────
  EncounterDashboard_Title: 'EncounterDashboard_Title',
  EncounterDashboard_Scheduled: 'EncounterDashboard_Scheduled',
  EncounterDashboard_InProgress: 'EncounterDashboard_InProgress',
  EncounterDashboard_PendingTasks: 'EncounterDashboard_PendingTasks',

  // ── Clinician Inbox ────────────────────────────────────────────────────
  ClinicianInbox_Title: 'ClinicianInbox_Title',
  ClinicianInbox_PendingResults: 'ClinicianInbox_PendingResults',
  ClinicianInbox_UnsignedNotes: 'ClinicianInbox_UnsignedNotes',
  ClinicianInbox_Messages: 'ClinicianInbox_Messages',

  // ── Patient Portal ─────────────────────────────────────────────────────
  PatientPortal_MyHealth: 'PatientPortal_MyHealth',
  PatientPortal_Welcome: 'PatientPortal_Welcome',
  PatientPortal_WelcomeUser: 'PatientPortal_WelcomeUser',
  PatientPortal_ViewingRecordsAt: 'PatientPortal_ViewingRecordsAt',
  PatientPortal_NextAppointment: 'PatientPortal_NextAppointment',
  PatientPortal_NoneScheduled: 'PatientPortal_NoneScheduled',
  PatientPortal_ActiveMedications: 'PatientPortal_ActiveMedications',
  PatientPortal_RecentResults: 'PatientPortal_RecentResults',
  PatientPortal_OutstandingBalance: 'PatientPortal_OutstandingBalance',
  PatientPortal_ClinicalTimeline: 'PatientPortal_ClinicalTimeline',
  PatientPortal_Appointments: 'PatientPortal_Appointments',
  PatientPortal_RequestAppointment: 'PatientPortal_RequestAppointment',
  PatientPortal_Upcoming: 'PatientPortal_Upcoming',
  PatientPortal_NoUpcoming: 'PatientPortal_NoUpcoming',
  PatientPortal_Past: 'PatientPortal_Past',
  PatientPortal_TestResults: 'PatientPortal_TestResults',
  PatientPortal_BillsPayments: 'PatientPortal_BillsPayments',

  // ── Front Desk ─────────────────────────────────────────────────────────
  FrontDesk_Title: 'FrontDesk_Title',
  FrontDesk_TodaysAppointments: 'FrontDesk_TodaysAppointments',
  FrontDesk_CheckedIn: 'FrontDesk_CheckedIn',
  FrontDesk_Waitlist: 'FrontDesk_Waitlist',
  FrontDesk_PendingEligibility: 'FrontDesk_PendingEligibility',
  FrontDesk_PatientCheckIn: 'FrontDesk_PatientCheckIn',
  FrontDesk_PatientRegistration: 'FrontDesk_PatientRegistration',

  // ── Billing Workspace ──────────────────────────────────────────────────
  BillingWS_Title: 'BillingWS_Title',
  BillingWS_UnbilledEncounters: 'BillingWS_UnbilledEncounters',
  BillingWS_PendingClaims: 'BillingWS_PendingClaims',
  BillingWS_DeniedClaims: 'BillingWS_DeniedClaims',
  BillingWS_TodaysPayments: 'BillingWS_TodaysPayments',
  BillingWS_ClaimTracking: 'BillingWS_ClaimTracking',
  BillingWS_PaymentPosting: 'BillingWS_PaymentPosting',

  // ── Admin Workspace ────────────────────────────────────────────────────
  Admin_UserManagement: 'Admin_UserManagement',
  Admin_RoleConfiguration: 'Admin_RoleConfiguration',
  Admin_AuditLog: 'Admin_AuditLog',
  Admin_SpecialtyConfiguration: 'Admin_SpecialtyConfiguration',
  Admin_PatientSearch: 'Admin_PatientSearch',

  // ── Common Table Headers / Labels ──────────────────────────────────────
  Common_Date: 'Common_Date',
  Common_Type: 'Common_Type',
  Common_Status: 'Common_Status',
  Common_Description: 'Common_Description',
  Common_Amount: 'Common_Amount',
  Common_Balance: 'Common_Balance',
  Common_Name: 'Common_Name',
  Common_Actions: 'Common_Actions',
  Common_Priority: 'Common_Priority',
  Common_Category: 'Common_Category',
  Common_Patient: 'Common_Patient',
  Common_Provider: 'Common_Provider',
  Common_Service: 'Common_Service',
  Common_Notes: 'Common_Notes',
  Common_From: 'Common_From',
  Common_To: 'Common_To',

  // ── Common Buttons / Actions ───────────────────────────────────────────
  Common_Save: 'Common_Save',
  Common_Cancel: 'Common_Cancel',
  Common_Search: 'Common_Search',
  Common_Add: 'Common_Add',
  Common_Remove: 'Common_Remove',
  Common_Submit: 'Common_Submit',
  Common_Create: 'Common_Create',
  Common_Update: 'Common_Update',
  Common_Delete: 'Common_Delete',
  Common_Sign: 'Common_Sign',
  Common_Close: 'Common_Close',
  Common_Back: 'Common_Back',
  Common_Next: 'Common_Next',
  Common_Previous: 'Common_Previous',
  Common_OfferSlot: 'Common_OfferSlot',
  Common_SelectSlot: 'Common_SelectSlot',

  // ── Common Empty States ────────────────────────────────────────────────
  Empty_NoResults: 'Empty_NoResults',
  Empty_NoDocuments: 'Empty_NoDocuments',
  Empty_NoEncounters: 'Empty_NoEncounters',
  Empty_NoOrders: 'Empty_NoOrders',
  Empty_NoLedgerEntries: 'Empty_NoLedgerEntries',
  Empty_NoAllergies: 'Empty_NoAllergies',
  Empty_NoMedications: 'Empty_NoMedications',
  Empty_NoConditions: 'Empty_NoConditions',
  Empty_NoAppointments: 'Empty_NoAppointments',
  Empty_NoSlots: 'Empty_NoSlots',
  Empty_NoWaitlist: 'Empty_NoWaitlist',
  Empty_NoPermission: 'Empty_NoPermission',

  // ── Form Labels ────────────────────────────────────────────────────────
  Form_GivenName: 'Form_GivenName',
  Form_FamilyName: 'Form_FamilyName',
  Form_BirthDate: 'Form_BirthDate',
  Form_Gender: 'Form_Gender',
  Form_SelectGender: 'Form_SelectGender',
  Form_Identifier: 'Form_Identifier',
  Form_Contact: 'Form_Contact',
  Form_Address: 'Form_Address',
  Form_CreatePatient: 'Form_CreatePatient',
  Form_UpdatePatient: 'Form_UpdatePatient',
  Form_CreateOrder: 'Form_CreateOrder',
  Form_UpdateOrder: 'Form_UpdateOrder',
  Form_CreatePrescription: 'Form_CreatePrescription',
  Form_UpdatePrescription: 'Form_UpdatePrescription',
  Form_CreateObservation: 'Form_CreateObservation',
  Form_UpdateObservation: 'Form_UpdateObservation',
  Form_BookAppointment: 'Form_BookAppointment',
  Form_RescheduleAppointment: 'Form_RescheduleAppointment',
  Form_CheckIn: 'Form_CheckIn',
  Form_UpdateEncounter: 'Form_UpdateEncounter',
  Form_SubmitClaim: 'Form_SubmitClaim',
  Form_FinalizeSuperbill: 'Form_FinalizeSuperbill',

  // ── Allergy List ───────────────────────────────────────────────────────
  AllergyList_Title: 'AllergyList_Title',
  AllergyList_AddNew: 'AllergyList_AddNew',

  // ── Condition List ─────────────────────────────────────────────────────
  ConditionList_Title: 'ConditionList_Title',
  ConditionList_AddNew: 'ConditionList_AddNew',

  // ── Medication List ────────────────────────────────────────────────────
  MedicationList_Title: 'MedicationList_Title',
  MedicationList_ActiveMedications: 'MedicationList_ActiveMedications',
  MedicationList_Completed: 'MedicationList_Completed',
  MedicationList_Stopped: 'MedicationList_Stopped',
  MedicationList_Other: 'MedicationList_Other',

  // ── Encounter List ─────────────────────────────────────────────────────
  EncounterList_StatusFilter: 'EncounterList_StatusFilter',
  EncounterList_ClassFilter: 'EncounterList_ClassFilter',

  // ── Document List / Viewer ─────────────────────────────────────────────
  DocumentViewer_NoDocument: 'DocumentViewer_NoDocument',
  DocumentViewer_ExplanationOfBenefit: 'DocumentViewer_ExplanationOfBenefit',

  // ── Ledger ─────────────────────────────────────────────────────────────
  Ledger_CurrentBalance: 'Ledger_CurrentBalance',

  // ── Waitlist ───────────────────────────────────────────────────────────
  Waitlist_Title: 'Waitlist_Title',
  Waitlist_WaitTime: 'Waitlist_WaitTime',
  Waitlist_PreferredDates: 'Waitlist_PreferredDates',
  Waitlist_PreferredProvider: 'Waitlist_PreferredProvider',

  // ── Schedule ───────────────────────────────────────────────────────────
  Schedule_Day: 'Schedule_Day',
  Schedule_Week: 'Schedule_Week',
  Schedule_Month: 'Schedule_Month',
  Schedule_Available: 'Schedule_Available',

  // ── Clinical Note Editor ───────────────────────────────────────────────
  NoteEditor_EmptyState: 'NoteEditor_EmptyState',

  // ── Insurance ──────────────────────────────────────────────────────────
  Insurance_PlanType: 'Insurance_PlanType',
  Insurance_GroupNumber: 'Insurance_GroupNumber',
  Insurance_MemberID: 'Insurance_MemberID',
  Insurance_SubscriberName: 'Insurance_SubscriberName',
  Insurance_Relationship: 'Insurance_Relationship',
  Insurance_PayerName: 'Insurance_PayerName',
  Insurance_Eligibility: 'Insurance_Eligibility',

  // ── Clinical Timeline ──────────────────────────────────────────────────
  ClinicalTimeline_AriaLabel: 'ClinicalTimeline_AriaLabel',
  ClinicalTimeline_FilterAriaLabel: 'ClinicalTimeline_FilterAriaLabel',
  ClinicalTimeline_Empty: 'ClinicalTimeline_Empty',
  ClinicalTimeline_Unknown: 'ClinicalTimeline_Unknown',
  ClinicalTimeline_NoDate: 'ClinicalTimeline_NoDate',

  // ── Note Template Selector ─────────────────────────────────────────────
  NoteTemplateSelector_AriaLabel: 'NoteTemplateSelector_AriaLabel',
  NoteTemplateSelector_Empty: 'NoteTemplateSelector_Empty',
  NoteTemplateSelector_GroupAriaTemplate:
    'NoteTemplateSelector_GroupAriaTemplate',
  NoteTemplateSelector_SelectTemplate: 'NoteTemplateSelector_SelectTemplate',

  // ── Encounter Workflow Board ───────────────────────────────────────────
  WorkflowBoard_AriaLabel: 'WorkflowBoard_AriaLabel',
  WorkflowBoard_UnknownPatient: 'WorkflowBoard_UnknownPatient',
  WorkflowBoard_NoEncounters: 'WorkflowBoard_NoEncounters',
  WorkflowBoard_ColumnAriaTemplate: 'WorkflowBoard_ColumnAriaTemplate',

  // ── Schedule Editor ────────────────────────────────────────────────────
  ScheduleEditor_Title: 'ScheduleEditor_Title',
  ScheduleEditor_AriaLabel: 'ScheduleEditor_AriaLabel',
  ScheduleEditor_AddBlockLegend: 'ScheduleEditor_AddBlockLegend',
  ScheduleEditor_DayLabel: 'ScheduleEditor_DayLabel',
  ScheduleEditor_StartTime: 'ScheduleEditor_StartTime',
  ScheduleEditor_EndTime: 'ScheduleEditor_EndTime',
  ScheduleEditor_RecurringWeekly: 'ScheduleEditor_RecurringWeekly',
  ScheduleEditor_AddBlock: 'ScheduleEditor_AddBlock',
  ScheduleEditor_StartBeforeEnd: 'ScheduleEditor_StartBeforeEnd',
  ScheduleEditor_NoAvailability: 'ScheduleEditor_NoAvailability',
  ScheduleEditor_Recurring: 'ScheduleEditor_Recurring',
  ScheduleEditor_GridAriaLabel: 'ScheduleEditor_GridAriaLabel',
  ScheduleEditor_SaveSchedule: 'ScheduleEditor_SaveSchedule',
  ScheduleEditor_Day_Monday: 'ScheduleEditor_Day_Monday',
  ScheduleEditor_Day_Tuesday: 'ScheduleEditor_Day_Tuesday',
  ScheduleEditor_Day_Wednesday: 'ScheduleEditor_Day_Wednesday',
  ScheduleEditor_Day_Thursday: 'ScheduleEditor_Day_Thursday',
  ScheduleEditor_Day_Friday: 'ScheduleEditor_Day_Friday',
  ScheduleEditor_Day_Saturday: 'ScheduleEditor_Day_Saturday',
  ScheduleEditor_Day_Sunday: 'ScheduleEditor_Day_Sunday',

  // ── Connectivity Indicator ─────────────────────────────────────────────
  Connectivity_Online: 'Connectivity_Online',
  Connectivity_Offline: 'Connectivity_Offline',
  Connectivity_StatusTemplate: 'Connectivity_StatusTemplate',

  // ── Notification Bell ──────────────────────────────────────────────────
  NotificationBell_AriaLabel: 'NotificationBell_AriaLabel',
  NotificationBell_UnreadTemplate: 'NotificationBell_UnreadTemplate',

  // ── Role Switcher ──────────────────────────────────────────────────────
  RoleSwitcher_AriaLabel: 'RoleSwitcher_AriaLabel',
  RoleSwitcher_MenuAriaLabel: 'RoleSwitcher_MenuAriaLabel',

  // ── Patient Header ─────────────────────────────────────────────────────
  PatientHeader_AriaLabel: 'PatientHeader_AriaLabel',
  PatientHeader_Unknown: 'PatientHeader_Unknown',
  PatientHeader_MRN: 'PatientHeader_MRN',
  PatientHeader_NA: 'PatientHeader_NA',
  PatientHeader_AllergyTemplate: 'PatientHeader_AllergyTemplate',

  // ── Navigation Labels ────────────────────────────────────────────────
  Nav_Patients: 'Nav_Patients',
  Nav_Clients: 'Nav_Clients',
  Nav_Encounters: 'Nav_Encounters',
  Nav_Schedule: 'Nav_Schedule',
  Nav_Inbox: 'Nav_Inbox',
  Nav_OperatoryView: 'Nav_OperatoryView',
  Nav_TreatmentPlans: 'Nav_TreatmentPlans',
  Nav_SpeciesFilter: 'Nav_SpeciesFilter',
  Nav_FarmCalls: 'Nav_FarmCalls',
  Nav_MyHealth: 'Nav_MyHealth',
  Nav_Appointments: 'Nav_Appointments',
  Nav_TestResults: 'Nav_TestResults',
  Nav_BillsPayments: 'Nav_BillsPayments',
  Nav_CheckIn: 'Nav_CheckIn',
  Nav_Waitlist: 'Nav_Waitlist',
  Nav_Registration: 'Nav_Registration',
  Nav_Insurance: 'Nav_Insurance',
  Nav_Superbills: 'Nav_Superbills',
  Nav_Claims: 'Nav_Claims',
  Nav_ClaimTracking: 'Nav_ClaimTracking',
  Nav_Payments: 'Nav_Payments',
  Nav_PatientLedger: 'Nav_PatientLedger',
  Nav_FeeSchedules: 'Nav_FeeSchedules',
  Nav_Users: 'Nav_Users',
  Nav_Roles: 'Nav_Roles',
  Nav_AuditLog: 'Nav_AuditLog',
  Nav_SpecialtyConfig: 'Nav_SpecialtyConfig',
  Nav_Settings: 'Nav_Settings',
  Nav_Organizations: 'Nav_Organizations',
  Nav_Clinician: 'Nav_Clinician',
  Nav_PatientPortal: 'Nav_PatientPortal',
  Nav_Billing: 'Nav_Billing',

  // ── Sidebar ────────────────────────────────────────────────────────────
  Sidebar_ExpandAriaLabel: 'Sidebar_ExpandAriaLabel',
  Sidebar_CollapseAriaLabel: 'Sidebar_CollapseAriaLabel',
  Sidebar_NavAriaLabel: 'Sidebar_NavAriaLabel',

  // ── Bottom Nav ─────────────────────────────────────────────────────────
  BottomNav_AriaLabel: 'BottomNav_AriaLabel',

  // ── Layout ─────────────────────────────────────────────────────────────
  Layout_NavAriaTemplate: 'Layout_NavAriaTemplate',
} as const);

export type BrightChartStringKey = BrandedStringKeyValue<
  typeof BrightChartStrings
>;

export type BrightChartStringKeyValue = BrightChartStringKey;
