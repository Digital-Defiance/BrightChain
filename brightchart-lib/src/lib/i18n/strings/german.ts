import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChartStringKey,
  BrightChartStrings,
} from '../../enumerations/BrightChartStrings';

export const BrightChartGermanStrings: ComponentStrings<BrightChartStringKey> =
  {
    // ── Menu / Navigation ──────────────────────────────────────────────
    [BrightChartStrings.MenuLabel]: 'BrightChart',
    [BrightChartStrings.ChartSectionsLabel]: 'Diagrammbereiche',
    [BrightChartStrings.Nav_Conversations]: 'Unterhaltungen',
    [BrightChartStrings.Nav_Groups]: 'Gruppen',
    [BrightChartStrings.Nav_Channels]: 'Kanäle',

    // ── Shell / Notifications ──────────────────────────────────────────
    [BrightChartStrings.Notification_Type_Result]: 'Ergebnis',
    [BrightChartStrings.Notification_Type_Note]: 'Notiz',
    [BrightChartStrings.Notification_Type_Appointment]: 'Termin',
    [BrightChartStrings.Notification_Type_Claim]: 'Anspruch',
    [BrightChartStrings.Notification_Type_Message]: 'Nachricht',
    [BrightChartStrings.Notification_Type_System]: 'System',
    [BrightChartStrings.Notification_Priority_Normal]: 'Normal',
    [BrightChartStrings.Notification_Priority_Urgent]: 'Dringend',

    // ── Roles ──────────────────────────────────────────────────────────
    [BrightChartStrings.Role_Physician]: 'Arzt',
    [BrightChartStrings.Role_RegisteredNurse]: 'Krankenschwester/-pfleger',
    [BrightChartStrings.Role_MedicalAssistant]: 'Medizinische(r) Assistent(in)',
    [BrightChartStrings.Role_Patient]: 'Patient',
    [BrightChartStrings.Role_ClinicalAdministrator]: 'Klinischer Administrator',
    [BrightChartStrings.Role_Dentist]: 'Zahnarzt',
    [BrightChartStrings.Role_Veterinarian]: 'Tierarzt',

    // ── Organization ───────────────────────────────────────────────────
    [BrightChartStrings.Org_EnrollmentMode_Open]: 'Offen',
    [BrightChartStrings.Org_EnrollmentMode_InviteOnly]: 'Nur auf Einladung',

    // ── Audit ──────────────────────────────────────────────────────────
    [BrightChartStrings.Audit_Operation_Create]: 'Erstellen',
    [BrightChartStrings.Audit_Operation_Read]: 'Lesen',
    [BrightChartStrings.Audit_Operation_Update]: 'Aktualisieren',
    [BrightChartStrings.Audit_Operation_Delete]: 'Löschen',
    [BrightChartStrings.Audit_Operation_Search]: 'Suchen',
    [BrightChartStrings.Audit_Operation_Merge]: 'Zusammenführen',

    // ── FHIR / Patient Identity ──────────────────────────────────────────
    [BrightChartStrings.Gender_Male]: 'Männlich',
    [BrightChartStrings.Gender_Female]: 'Weiblich',
    [BrightChartStrings.Gender_Other]: 'Sonstig',
    [BrightChartStrings.Gender_Unknown]: 'Unbekannt',

    [BrightChartStrings.NameUse_Usual]: 'Üblich',
    [BrightChartStrings.NameUse_Official]: 'Offiziell',
    [BrightChartStrings.NameUse_Temp]: 'Vorübergehend',
    [BrightChartStrings.NameUse_Nickname]: 'Spitzname',
    [BrightChartStrings.NameUse_Anonymous]: 'Anonym',
    [BrightChartStrings.NameUse_Old]: 'Alt',
    [BrightChartStrings.NameUse_Maiden]: 'Geburtsname',

    [BrightChartStrings.AddressUse_Home]: 'Zuhause',
    [BrightChartStrings.AddressUse_Work]: 'Arbeit',
    [BrightChartStrings.AddressUse_Temp]: 'Vorübergehend',
    [BrightChartStrings.AddressUse_Old]: 'Alt',
    [BrightChartStrings.AddressUse_Billing]: 'Rechnungsadresse',

    [BrightChartStrings.AddressType_Postal]: 'Postalisch',
    [BrightChartStrings.AddressType_Physical]: 'Physisch',
    [BrightChartStrings.AddressType_Both]: 'Beides',

    [BrightChartStrings.ContactSystem_Phone]: 'Telefon',
    [BrightChartStrings.ContactSystem_Fax]: 'Fax',
    [BrightChartStrings.ContactSystem_Email]: 'E-Mail',
    [BrightChartStrings.ContactSystem_Pager]: 'Pager',
    [BrightChartStrings.ContactSystem_Url]: 'URL',
    [BrightChartStrings.ContactSystem_Sms]: 'SMS',
    [BrightChartStrings.ContactSystem_Other]: 'Sonstig',

    [BrightChartStrings.ContactUse_Home]: 'Zuhause',
    [BrightChartStrings.ContactUse_Work]: 'Arbeit',
    [BrightChartStrings.ContactUse_Temp]: 'Vorübergehend',
    [BrightChartStrings.ContactUse_Old]: 'Alt',
    [BrightChartStrings.ContactUse_Mobile]: 'Mobil',

    [BrightChartStrings.LinkType_ReplacedBy]: 'Ersetzt durch',
    [BrightChartStrings.LinkType_Replaces]: 'Ersetzt',
    [BrightChartStrings.LinkType_Refer]: 'Verweis',
    [BrightChartStrings.LinkType_SeeAlso]: 'Siehe auch',

    [BrightChartStrings.IdentifierUse_Usual]: 'Üblich',
    [BrightChartStrings.IdentifierUse_Official]: 'Offiziell',
    [BrightChartStrings.IdentifierUse_Temp]: 'Vorübergehend',
    [BrightChartStrings.IdentifierUse_Secondary]: 'Sekundär',
    [BrightChartStrings.IdentifierUse_Old]: 'Alt',

    // ── Clinical ─────────────────────────────────────────────────────────
    [BrightChartStrings.ObservationStatus_Registered]: 'Registriert',
    [BrightChartStrings.ObservationStatus_Preliminary]: 'Vorläufig',
    [BrightChartStrings.ObservationStatus_Final]: 'Endgültig',
    [BrightChartStrings.ObservationStatus_Amended]: 'Geändert',
    [BrightChartStrings.ObservationStatus_Corrected]: 'Korrigiert',
    [BrightChartStrings.ObservationStatus_Cancelled]: 'Storniert',
    [BrightChartStrings.ObservationStatus_EnteredInError]:
      'Irrtümlich eingegeben',
    [BrightChartStrings.ObservationStatus_Unknown]: 'Unbekannt',

    [BrightChartStrings.ConditionClinical_Active]: 'Aktiv',
    [BrightChartStrings.ConditionClinical_Recurrence]: 'Rezidiv',
    [BrightChartStrings.ConditionClinical_Relapse]: 'Rückfall',
    [BrightChartStrings.ConditionClinical_Inactive]: 'Inaktiv',
    [BrightChartStrings.ConditionClinical_Remission]: 'Remission',
    [BrightChartStrings.ConditionClinical_Resolved]: 'Behoben',

    [BrightChartStrings.ConditionVerification_Unconfirmed]: 'Unbestätigt',
    [BrightChartStrings.ConditionVerification_Provisional]: 'Vorläufig',
    [BrightChartStrings.ConditionVerification_Differential]: 'Differenzial',
    [BrightChartStrings.ConditionVerification_Confirmed]: 'Bestätigt',
    [BrightChartStrings.ConditionVerification_Refuted]: 'Widerlegt',
    [BrightChartStrings.ConditionVerification_EnteredInError]:
      'Irrtümlich eingegeben',

    [BrightChartStrings.AllergyType_Allergy]: 'Allergie',
    [BrightChartStrings.AllergyType_Intolerance]: 'Unverträglichkeit',

    [BrightChartStrings.AllergyCategory_Food]: 'Nahrungsmittel',
    [BrightChartStrings.AllergyCategory_Medication]: 'Medikament',
    [BrightChartStrings.AllergyCategory_Environment]: 'Umwelt',
    [BrightChartStrings.AllergyCategory_Biologic]: 'Biologisch',

    [BrightChartStrings.AllergyCriticality_Low]: 'Niedrig',
    [BrightChartStrings.AllergyCriticality_High]: 'Hoch',
    [BrightChartStrings.AllergyCriticality_UnableToAssess]: 'Nicht beurteilbar',

    [BrightChartStrings.AllergySeverity_Mild]: 'Leicht',
    [BrightChartStrings.AllergySeverity_Moderate]: 'Mäßig',
    [BrightChartStrings.AllergySeverity_Severe]: 'Schwer',

    [BrightChartStrings.MedicationStatus_Active]: 'Aktiv',
    [BrightChartStrings.MedicationStatus_Inactive]: 'Inaktiv',
    [BrightChartStrings.MedicationStatus_EnteredInError]:
      'Irrtümlich eingegeben',

    [BrightChartStrings.MedStatementStatus_Active]: 'Aktiv',
    [BrightChartStrings.MedStatementStatus_Completed]: 'Abgeschlossen',
    [BrightChartStrings.MedStatementStatus_EnteredInError]:
      'Irrtümlich eingegeben',
    [BrightChartStrings.MedStatementStatus_Intended]: 'Beabsichtigt',
    [BrightChartStrings.MedStatementStatus_Stopped]: 'Gestoppt',
    [BrightChartStrings.MedStatementStatus_OnHold]: 'Wartend',
    [BrightChartStrings.MedStatementStatus_Unknown]: 'Unbekannt',
    [BrightChartStrings.MedStatementStatus_NotTaken]: 'Nicht eingenommen',

    [BrightChartStrings.ProcedureStatus_Preparation]: 'Vorbereitung',
    [BrightChartStrings.ProcedureStatus_InProgress]: 'In Bearbeitung',
    [BrightChartStrings.ProcedureStatus_NotDone]: 'Nicht durchgeführt',
    [BrightChartStrings.ProcedureStatus_OnHold]: 'Wartend',
    [BrightChartStrings.ProcedureStatus_Stopped]: 'Gestoppt',
    [BrightChartStrings.ProcedureStatus_Completed]: 'Abgeschlossen',
    [BrightChartStrings.ProcedureStatus_EnteredInError]:
      'Irrtümlich eingegeben',
    [BrightChartStrings.ProcedureStatus_Unknown]: 'Unbekannt',

    // ── Encounter ────────────────────────────────────────────────────────
    [BrightChartStrings.EncounterStatus_Planned]: 'Geplant',
    [BrightChartStrings.EncounterStatus_Arrived]: 'Eingetroffen',
    [BrightChartStrings.EncounterStatus_Triaged]: 'Triagiert',
    [BrightChartStrings.EncounterStatus_InProgress]: 'In Bearbeitung',
    [BrightChartStrings.EncounterStatus_OnLeave]: 'Beurlaubt',
    [BrightChartStrings.EncounterStatus_Finished]: 'Abgeschlossen',
    [BrightChartStrings.EncounterStatus_Cancelled]: 'Storniert',
    [BrightChartStrings.EncounterStatus_EnteredInError]:
      'Irrtümlich eingegeben',
    [BrightChartStrings.EncounterStatus_Unknown]: 'Unbekannt',

    [BrightChartStrings.EncounterLocationStatus_Planned]: 'Geplant',
    [BrightChartStrings.EncounterLocationStatus_Active]: 'Aktiv',
    [BrightChartStrings.EncounterLocationStatus_Reserved]: 'Reserviert',
    [BrightChartStrings.EncounterLocationStatus_Completed]: 'Abgeschlossen',

    [BrightChartStrings.EncounterClass_Inpatient]: 'Stationär',
    [BrightChartStrings.EncounterClass_Ambulatory]: 'Ambulant',
    [BrightChartStrings.EncounterClass_Emergency]: 'Notfall',
    [BrightChartStrings.EncounterClass_HomeHealth]: 'Häusliche Pflege',
    [BrightChartStrings.EncounterClass_Virtual]: 'Virtuell',
    [BrightChartStrings.EncounterClass_Field]: 'Außendienst',
    [BrightChartStrings.EncounterClass_ShortStay]: 'Kurzaufenthalt',
    [BrightChartStrings.EncounterClass_Observation]: 'Beobachtung',
    [BrightChartStrings.EncounterClass_PreAdmission]: 'Vorstationär',

    [BrightChartStrings.DiagnosisRole_Admission]: 'Aufnahmediagnose',
    [BrightChartStrings.DiagnosisRole_Discharge]: 'Entlassungsdiagnose',
    [BrightChartStrings.DiagnosisRole_ChiefComplaint]: 'Hauptbeschwerde',
    [BrightChartStrings.DiagnosisRole_Comorbidity]: 'Komorbidität',
    [BrightChartStrings.DiagnosisRole_PreOp]: 'Präoperative Diagnose',
    [BrightChartStrings.DiagnosisRole_PostOp]: 'Postoperative Diagnose',
    [BrightChartStrings.DiagnosisRole_Billing]: 'Abrechnungsdiagnose',

    // ── Documentation ────────────────────────────────────────────────────
    [BrightChartStrings.CompositionStatus_Preliminary]: 'Vorläufig',
    [BrightChartStrings.CompositionStatus_Final]: 'Endgültig',
    [BrightChartStrings.CompositionStatus_Amended]: 'Geändert',
    [BrightChartStrings.CompositionStatus_EnteredInError]:
      'Irrtümlich eingegeben',

    [BrightChartStrings.DocRefStatus_Current]: 'Aktuell',
    [BrightChartStrings.DocRefStatus_Superseded]: 'Ersetzt',
    [BrightChartStrings.DocRefStatus_EnteredInError]: 'Irrtümlich eingegeben',

    [BrightChartStrings.AttestationMode_Personal]: 'Persönlich',
    [BrightChartStrings.AttestationMode_Professional]: 'Professionell',
    [BrightChartStrings.AttestationMode_Legal]: 'Rechtlich',
    [BrightChartStrings.AttestationMode_Official]: 'Offiziell',

    [BrightChartStrings.DocRelationship_Replaces]: 'Ersetzt',
    [BrightChartStrings.DocRelationship_Transforms]: 'Transformiert',
    [BrightChartStrings.DocRelationship_Signs]: 'Unterzeichnet',
    [BrightChartStrings.DocRelationship_Appends]: 'Ergänzt',

    // ── Note Templates ───────────────────────────────────────────────────
    [BrightChartStrings.Template_SOAPNote_Name]: 'SOAP-Notiz',
    [BrightChartStrings.Template_SOAPNote_Description]:
      'Standardformat Subjektiv, Objektiv, Beurteilung, Plan für ambulante und stationäre Konsultationen.',
    [BrightChartStrings.Template_SOAPNote_Subjective]: 'Subjektiv',
    [BrightChartStrings.Template_SOAPNote_Objective]: 'Objektiv',
    [BrightChartStrings.Template_SOAPNote_Assessment]: 'Beurteilung',
    [BrightChartStrings.Template_SOAPNote_Plan]: 'Plan',

    [BrightChartStrings.Template_HP_Name]:
      'Anamnese und körperliche Untersuchung',
    [BrightChartStrings.Template_HP_Description]:
      'Umfassendes Erstbewertungsformat für stationäre Aufnahmen und neue Konsultationen.',
    [BrightChartStrings.Template_HP_ChiefComplaint]: 'Hauptbeschwerde',
    [BrightChartStrings.Template_HP_HPI]: 'Anamnese der aktuellen Erkrankung',
    [BrightChartStrings.Template_HP_PastMedicalHistory]: 'Vorerkrankungen',
    [BrightChartStrings.Template_HP_ReviewOfSystems]: 'Systemübersicht',
    [BrightChartStrings.Template_HP_PhysicalExam]: 'Körperliche Untersuchung',
    [BrightChartStrings.Template_HP_Assessment]: 'Beurteilung',
    [BrightChartStrings.Template_HP_Plan]: 'Plan',

    [BrightChartStrings.Template_Discharge_Name]: 'Entlassungsbericht',
    [BrightChartStrings.Template_Discharge_Description]:
      'Standardformat zur Dokumentation des Krankenhausaufenthalts, der Diagnosen, des Verlaufs und des Entlassungsplans.',
    [BrightChartStrings.Template_Discharge_AdmissionDiagnosis]:
      'Aufnahmediagnose',
    [BrightChartStrings.Template_Discharge_HospitalCourse]:
      'Krankenhausverlauf',
    [BrightChartStrings.Template_Discharge_DischargeDiagnosis]:
      'Entlassungsdiagnose',
    [BrightChartStrings.Template_Discharge_DischargeMedications]:
      'Entlassungsmedikation',
    [BrightChartStrings.Template_Discharge_FollowUp]: 'Nachsorgeanweisungen',

    [BrightChartStrings.Template_Procedure_Name]: 'Verfahrensnotiz',
    [BrightChartStrings.Template_Procedure_Description]:
      'Standardformat zur Dokumentation klinischer oder chirurgischer Verfahren.',
    [BrightChartStrings.Template_Procedure_Indication]: 'Indikation',
    [BrightChartStrings.Template_Procedure_ProcedureDescription]:
      'Verfahrensbeschreibung',
    [BrightChartStrings.Template_Procedure_Findings]: 'Befunde',
    [BrightChartStrings.Template_Procedure_Complications]: 'Komplikationen',
    [BrightChartStrings.Template_Procedure_PostProcedurePlan]:
      'Nachbehandlungsplan',

    // ── LOINC Document Types ─────────────────────────────────────────────
    [BrightChartStrings.DocType_ConsultationNote]: 'Konsultationsnotiz',
    [BrightChartStrings.DocType_DischargeSummary]: 'Entlassungsbericht',
    [BrightChartStrings.DocType_HistoryAndPhysical]:
      'Anamnese und körperliche Untersuchung',
    [BrightChartStrings.DocType_ProgressNote]: 'Verlaufsnotiz',
    [BrightChartStrings.DocType_ProcedureNote]: 'Verfahrensnotiz',
    [BrightChartStrings.DocType_OperativeNote]: 'Operationsnotiz',
    [BrightChartStrings.DocType_NurseNote]: 'Pflegenotiz',
    [BrightChartStrings.DocType_ReferralNote]: 'Überweisungsnotiz',
    [BrightChartStrings.DocType_TransferSummary]: 'Verlegungsbericht',

    // ── Orders & Results ─────────────────────────────────────────────────
    [BrightChartStrings.ServiceRequestStatus_Draft]: 'Entwurf',
    [BrightChartStrings.ServiceRequestStatus_Active]: 'Aktiv',
    [BrightChartStrings.ServiceRequestStatus_OnHold]: 'Wartend',
    [BrightChartStrings.ServiceRequestStatus_Revoked]: 'Widerrufen',
    [BrightChartStrings.ServiceRequestStatus_Completed]: 'Abgeschlossen',
    [BrightChartStrings.ServiceRequestStatus_EnteredInError]:
      'Irrtümlich eingegeben',
    [BrightChartStrings.ServiceRequestStatus_Unknown]: 'Unbekannt',

    [BrightChartStrings.ServiceRequestIntent_Proposal]: 'Vorschlag',
    [BrightChartStrings.ServiceRequestIntent_Plan]: 'Plan',
    [BrightChartStrings.ServiceRequestIntent_Directive]: 'Anweisung',
    [BrightChartStrings.ServiceRequestIntent_Order]: 'Auftrag',
    [BrightChartStrings.ServiceRequestIntent_OriginalOrder]: 'Originalauftrag',
    [BrightChartStrings.ServiceRequestIntent_ReflexOrder]: 'Reflexauftrag',
    [BrightChartStrings.ServiceRequestIntent_FillerOrder]: 'Ergänzungsauftrag',
    [BrightChartStrings.ServiceRequestIntent_InstanceOrder]: 'Instanzauftrag',
    [BrightChartStrings.ServiceRequestIntent_Option]: 'Option',

    [BrightChartStrings.MedRequestStatus_Active]: 'Aktiv',
    [BrightChartStrings.MedRequestStatus_OnHold]: 'Wartend',
    [BrightChartStrings.MedRequestStatus_Cancelled]: 'Storniert',
    [BrightChartStrings.MedRequestStatus_Completed]: 'Abgeschlossen',
    [BrightChartStrings.MedRequestStatus_EnteredInError]:
      'Irrtümlich eingegeben',
    [BrightChartStrings.MedRequestStatus_Stopped]: 'Gestoppt',
    [BrightChartStrings.MedRequestStatus_Draft]: 'Entwurf',
    [BrightChartStrings.MedRequestStatus_Unknown]: 'Unbekannt',

    [BrightChartStrings.MedRequestIntent_Proposal]: 'Vorschlag',
    [BrightChartStrings.MedRequestIntent_Plan]: 'Plan',
    [BrightChartStrings.MedRequestIntent_Order]: 'Auftrag',
    [BrightChartStrings.MedRequestIntent_OriginalOrder]: 'Originalauftrag',
    [BrightChartStrings.MedRequestIntent_ReflexOrder]: 'Reflexauftrag',
    [BrightChartStrings.MedRequestIntent_FillerOrder]: 'Ergänzungsauftrag',
    [BrightChartStrings.MedRequestIntent_InstanceOrder]: 'Instanzauftrag',
    [BrightChartStrings.MedRequestIntent_Option]: 'Option',

    [BrightChartStrings.DiagnosticReportStatus_Registered]: 'Registriert',
    [BrightChartStrings.DiagnosticReportStatus_Partial]: 'Teilweise',
    [BrightChartStrings.DiagnosticReportStatus_Preliminary]: 'Vorläufig',
    [BrightChartStrings.DiagnosticReportStatus_Final]: 'Endgültig',
    [BrightChartStrings.DiagnosticReportStatus_Amended]: 'Geändert',
    [BrightChartStrings.DiagnosticReportStatus_Corrected]: 'Korrigiert',
    [BrightChartStrings.DiagnosticReportStatus_Appended]: 'Ergänzt',
    [BrightChartStrings.DiagnosticReportStatus_Cancelled]: 'Storniert',
    [BrightChartStrings.DiagnosticReportStatus_EnteredInError]:
      'Irrtümlich eingegeben',
    [BrightChartStrings.DiagnosticReportStatus_Unknown]: 'Unbekannt',

    [BrightChartStrings.RequestPriority_Routine]: 'Routine',
    [BrightChartStrings.RequestPriority_Urgent]: 'Dringend',
    [BrightChartStrings.RequestPriority_Asap]: 'Schnellstmöglich',
    [BrightChartStrings.RequestPriority_Stat]: 'Sofort',

    // ── Billing ──────────────────────────────────────────────────────────
    [BrightChartStrings.CoverageStatus_Active]: 'Aktiv',
    [BrightChartStrings.CoverageStatus_Cancelled]: 'Storniert',
    [BrightChartStrings.CoverageStatus_Draft]: 'Entwurf',
    [BrightChartStrings.CoverageStatus_EnteredInError]: 'Irrtümlich eingegeben',

    [BrightChartStrings.ClaimStatus_Active]: 'Aktiv',
    [BrightChartStrings.ClaimStatus_Cancelled]: 'Storniert',
    [BrightChartStrings.ClaimStatus_Draft]: 'Entwurf',
    [BrightChartStrings.ClaimStatus_EnteredInError]: 'Irrtümlich eingegeben',

    [BrightChartStrings.ClaimUse_Claim]: 'Anspruch',
    [BrightChartStrings.ClaimUse_Preauthorization]: 'Vorautorisierung',
    [BrightChartStrings.ClaimUse_Predetermination]: 'Vorbestimmung',

    [BrightChartStrings.EOBStatus_Active]: 'Aktiv',
    [BrightChartStrings.EOBStatus_Cancelled]: 'Storniert',
    [BrightChartStrings.EOBStatus_Draft]: 'Entwurf',
    [BrightChartStrings.EOBStatus_EnteredInError]: 'Irrtümlich eingegeben',

    [BrightChartStrings.RemittanceOutcome_Queued]: 'In Warteschlange',
    [BrightChartStrings.RemittanceOutcome_Complete]: 'Abgeschlossen',
    [BrightChartStrings.RemittanceOutcome_Error]: 'Fehler',
    [BrightChartStrings.RemittanceOutcome_Partial]: 'Teilweise',

    [BrightChartStrings.EligibilityPurpose_AuthRequirements]:
      'Autorisierungsanforderungen',
    [BrightChartStrings.EligibilityPurpose_Benefits]: 'Leistungen',
    [BrightChartStrings.EligibilityPurpose_Discovery]: 'Ermittlung',
    [BrightChartStrings.EligibilityPurpose_Validation]: 'Validierung',

    [BrightChartStrings.SuperbillStatus_Draft]: 'Entwurf',
    [BrightChartStrings.SuperbillStatus_Finalized]: 'Abgeschlossen',
    [BrightChartStrings.SuperbillStatus_Billed]: 'Abgerechnet',

    [BrightChartStrings.LedgerEntryType_Charge]: 'Gebühr',
    [BrightChartStrings.LedgerEntryType_Payment]: 'Zahlung',
    [BrightChartStrings.LedgerEntryType_Adjustment]: 'Anpassung',
    [BrightChartStrings.LedgerEntryType_Refund]: 'Erstattung',
    [BrightChartStrings.LedgerEntryType_WriteOff]: 'Abschreibung',

    [BrightChartStrings.ClaimType_Institutional]: 'Institutionell',
    [BrightChartStrings.ClaimType_Oral]: 'Dental',
    [BrightChartStrings.ClaimType_Pharmacy]: 'Apotheke',
    [BrightChartStrings.ClaimType_Professional]: 'Professionell',
    [BrightChartStrings.ClaimType_Vision]: 'Sehkraft',

    // ── Scheduling ───────────────────────────────────────────────────────
    [BrightChartStrings.AppointmentStatus_Proposed]: 'Vorgeschlagen',
    [BrightChartStrings.AppointmentStatus_Pending]: 'Ausstehend',
    [BrightChartStrings.AppointmentStatus_Booked]: 'Gebucht',
    [BrightChartStrings.AppointmentStatus_Arrived]: 'Eingetroffen',
    [BrightChartStrings.AppointmentStatus_Fulfilled]: 'Erfüllt',
    [BrightChartStrings.AppointmentStatus_Cancelled]: 'Storniert',
    [BrightChartStrings.AppointmentStatus_Noshow]: 'Nicht erschienen',
    [BrightChartStrings.AppointmentStatus_EnteredInError]:
      'Irrtümlich eingegeben',
    [BrightChartStrings.AppointmentStatus_CheckedIn]: 'Eingecheckt',
    [BrightChartStrings.AppointmentStatus_Waitlist]: 'Warteliste',

    [BrightChartStrings.SlotStatus_Busy]: 'Belegt',
    [BrightChartStrings.SlotStatus_Free]: 'Frei',
    [BrightChartStrings.SlotStatus_BusyUnavailable]: 'Belegt (nicht verfügbar)',
    [BrightChartStrings.SlotStatus_BusyTentative]: 'Belegt (vorläufig)',
    [BrightChartStrings.SlotStatus_EnteredInError]: 'Irrtümlich eingegeben',

    [BrightChartStrings.ParticipantRequired_Required]: 'Erforderlich',
    [BrightChartStrings.ParticipantRequired_Optional]: 'Optional',
    [BrightChartStrings.ParticipantRequired_InformationOnly]:
      'Nur zur Information',

    [BrightChartStrings.ParticipationStatus_Accepted]: 'Akzeptiert',
    [BrightChartStrings.ParticipationStatus_Declined]: 'Abgelehnt',
    [BrightChartStrings.ParticipationStatus_Tentative]: 'Vorläufig',
    [BrightChartStrings.ParticipationStatus_NeedsAction]: 'Aktion erforderlich',

    [BrightChartStrings.WaitlistStatus_Waiting]: 'Wartend',
    [BrightChartStrings.WaitlistStatus_Offered]: 'Angeboten',
    [BrightChartStrings.WaitlistStatus_Booked]: 'Gebucht',
    [BrightChartStrings.WaitlistStatus_Cancelled]: 'Storniert',
    [BrightChartStrings.WaitlistStatus_Expired]: 'Abgelaufen',

    [BrightChartStrings.ReminderType_Sms]: 'SMS',
    [BrightChartStrings.ReminderType_Email]: 'E-Mail',
    [BrightChartStrings.ReminderType_Push]: 'Push-Benachrichtigung',
    [BrightChartStrings.ReminderType_Phone]: 'Telefonanruf',

    [BrightChartStrings.ReminderStatus_Scheduled]: 'Geplant',
    [BrightChartStrings.ReminderStatus_Sent]: 'Gesendet',
    [BrightChartStrings.ReminderStatus_Failed]: 'Fehlgeschlagen',
    [BrightChartStrings.ReminderStatus_Cancelled]: 'Storniert',

    // ── Offline / Sync ───────────────────────────────────────────────────
    [BrightChartStrings.Sync_Conflict]: 'Synchronisationskonflikt',
    [BrightChartStrings.Sync_Success]: 'Synchronisation erfolgreich',

    // ── FHIR OperationOutcome Severity ───────────────────────────────────
    [BrightChartStrings.IssueSeverity_Fatal]: 'Fatal',
    [BrightChartStrings.IssueSeverity_Error]: 'Fehler',
    [BrightChartStrings.IssueSeverity_Warning]: 'Warnung',
    [BrightChartStrings.IssueSeverity_Information]: 'Information',

    // ── Narrative Status ─────────────────────────────────────────────────
    [BrightChartStrings.NarrativeStatus_Generated]: 'Generiert',
    [BrightChartStrings.NarrativeStatus_Extensions]: 'Erweiterungen',
    [BrightChartStrings.NarrativeStatus_Additional]: 'Zusätzlich',
    [BrightChartStrings.NarrativeStatus_Empty]: 'Leer',

    // ── Shell / UI ─────────────────────────────────────────────────────────
    [BrightChartStrings.Shell_Notifications]: 'Benachrichtigungen',
    [BrightChartStrings.Shell_MarkAllRead]: 'Alle als gelesen markieren',
    [BrightChartStrings.Shell_NoNotifications]: 'Keine Benachrichtigungen',
    [BrightChartStrings.Shell_AccessDenied]: 'Zugriff verweigert',
    [BrightChartStrings.Shell_AccessDeniedMessage]:
      'Sie haben keine Berechtigung, auf diesen Bereich zuzugreifen.',
    [BrightChartStrings.Shell_Loading]: 'Laden...',

    // ── Patient Chart Tabs ─────────────────────────────────────────────────
    [BrightChartStrings.PatientChart_Title]: 'Patientenakte',
    [BrightChartStrings.PatientChart_Summary]: 'Zusammenfassung',
    [BrightChartStrings.PatientChart_Problems]: 'Probleme',
    [BrightChartStrings.PatientChart_Medications]: 'Medikamente',
    [BrightChartStrings.PatientChart_Allergies]: 'Allergien',
    [BrightChartStrings.PatientChart_Encounters]: 'Begegnungen',
    [BrightChartStrings.PatientChart_Documents]: 'Dokumente',
    [BrightChartStrings.PatientChart_Orders]: 'Aufträge',
    [BrightChartStrings.PatientChart_Results]: 'Ergebnisse',
    [BrightChartStrings.PatientChart_Appointments]: 'Termine',
    [BrightChartStrings.PatientChart_Insurance]: 'Versicherung',
    [BrightChartStrings.PatientChart_Billing]: 'Abrechnung',
    [BrightChartStrings.PatientChart_NoPatientSelected]:
      'Kein Patient ausgewählt.',

    // ── Encounter Dashboard ────────────────────────────────────────────────
    [BrightChartStrings.EncounterDashboard_Title]: 'Heutige Begegnungen',
    [BrightChartStrings.EncounterDashboard_Scheduled]: 'Geplant',
    [BrightChartStrings.EncounterDashboard_InProgress]: 'In Bearbeitung',
    [BrightChartStrings.EncounterDashboard_PendingTasks]:
      'Ausstehende Aufgaben',

    // ── Clinician Inbox ────────────────────────────────────────────────────
    [BrightChartStrings.ClinicianInbox_Title]: 'Posteingang',
    [BrightChartStrings.ClinicianInbox_PendingResults]:
      'Ausstehende Ergebnisse',
    [BrightChartStrings.ClinicianInbox_UnsignedNotes]:
      'Nicht unterzeichnete Notizen',
    [BrightChartStrings.ClinicianInbox_Messages]: 'Nachrichten',

    // ── Patient Portal ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientPortal_MyHealth]: 'Meine Gesundheit',
    [BrightChartStrings.PatientPortal_Welcome]: 'Willkommen',
    [BrightChartStrings.PatientPortal_WelcomeUser]: 'Willkommen, {NAME}',
    [BrightChartStrings.PatientPortal_ViewingRecordsAt]:
      'Datensätze bei {ORG} anzeigen',
    [BrightChartStrings.PatientPortal_NextAppointment]: 'Nächster Termin',
    [BrightChartStrings.PatientPortal_NoneScheduled]: 'Keiner geplant',
    [BrightChartStrings.PatientPortal_ActiveMedications]: 'Aktive Medikamente',
    [BrightChartStrings.PatientPortal_RecentResults]: 'Aktuelle Ergebnisse',
    [BrightChartStrings.PatientPortal_OutstandingBalance]: 'Offener Saldo',
    [BrightChartStrings.PatientPortal_ClinicalTimeline]: 'Klinische Zeitleiste',
    [BrightChartStrings.PatientPortal_Appointments]: 'Termine',
    [BrightChartStrings.PatientPortal_RequestAppointment]: 'Termin anfragen',
    [BrightChartStrings.PatientPortal_Upcoming]: 'Bevorstehend',
    [BrightChartStrings.PatientPortal_NoUpcoming]:
      'Keine bevorstehenden Termine.',
    [BrightChartStrings.PatientPortal_Past]: 'Vergangen',
    [BrightChartStrings.PatientPortal_TestResults]: 'Testergebnisse',
    [BrightChartStrings.PatientPortal_BillsPayments]:
      'Rechnungen und Zahlungen',

    // ── Front Desk ─────────────────────────────────────────────────────────
    [BrightChartStrings.FrontDesk_Title]: 'Empfang',
    [BrightChartStrings.FrontDesk_TodaysAppointments]: 'Heutige Termine',
    [BrightChartStrings.FrontDesk_CheckedIn]: 'Eingecheckt',
    [BrightChartStrings.FrontDesk_Waitlist]: 'Warteliste',
    [BrightChartStrings.FrontDesk_PendingEligibility]:
      'Ausstehende Berechtigung',
    [BrightChartStrings.FrontDesk_PatientCheckIn]: 'Patientenregistrierung',
    [BrightChartStrings.FrontDesk_PatientRegistration]: 'Patientenanmeldung',

    // ── Billing Workspace ──────────────────────────────────────────────────
    [BrightChartStrings.BillingWS_Title]: 'Abrechnung',
    [BrightChartStrings.BillingWS_UnbilledEncounters]:
      'Nicht abgerechnete Begegnungen',
    [BrightChartStrings.BillingWS_PendingClaims]: 'Ausstehende Ansprüche',
    [BrightChartStrings.BillingWS_DeniedClaims]: 'Abgelehnte Ansprüche',
    [BrightChartStrings.BillingWS_TodaysPayments]: 'Heutige Zahlungen',
    [BrightChartStrings.BillingWS_ClaimTracking]: 'Anspruchsverfolgung',
    [BrightChartStrings.BillingWS_PaymentPosting]: 'Zahlungsverbuchung',

    // ── Admin Workspace ────────────────────────────────────────────────────
    [BrightChartStrings.Admin_UserManagement]: 'Benutzerverwaltung',
    [BrightChartStrings.Admin_RoleConfiguration]: 'Rollenkonfiguration',
    [BrightChartStrings.Admin_AuditLog]: 'Prüfprotokoll',
    [BrightChartStrings.Admin_SpecialtyConfiguration]:
      'Fachgebietskonfiguration',
    [BrightChartStrings.Admin_PatientSearch]: 'Patientensuche',

    // ── Common Table Headers / Labels ──────────────────────────────────────
    [BrightChartStrings.Common_Date]: 'Datum',
    [BrightChartStrings.Common_Type]: 'Typ',
    [BrightChartStrings.Common_Status]: 'Status',
    [BrightChartStrings.Common_Description]: 'Beschreibung',
    [BrightChartStrings.Common_Amount]: 'Betrag',
    [BrightChartStrings.Common_Balance]: 'Saldo',
    [BrightChartStrings.Common_Name]: 'Name',
    [BrightChartStrings.Common_Actions]: 'Aktionen',
    [BrightChartStrings.Common_Priority]: 'Priorität',
    [BrightChartStrings.Common_Category]: 'Kategorie',
    [BrightChartStrings.Common_Patient]: 'Patient',
    [BrightChartStrings.Common_Provider]: 'Anbieter',
    [BrightChartStrings.Common_Service]: 'Dienst',
    [BrightChartStrings.Common_Notes]: 'Notizen',
    [BrightChartStrings.Common_From]: 'Von',
    [BrightChartStrings.Common_To]: 'An',

    // ── Common Buttons / Actions ───────────────────────────────────────────
    [BrightChartStrings.Common_Save]: 'Speichern',
    [BrightChartStrings.Common_Cancel]: 'Abbrechen',
    [BrightChartStrings.Common_Search]: 'Suchen',
    [BrightChartStrings.Common_Add]: 'Hinzufügen',
    [BrightChartStrings.Common_Remove]: 'Entfernen',
    [BrightChartStrings.Common_Submit]: 'Einreichen',
    [BrightChartStrings.Common_Create]: 'Erstellen',
    [BrightChartStrings.Common_Update]: 'Aktualisieren',
    [BrightChartStrings.Common_Delete]: 'Löschen',
    [BrightChartStrings.Common_Sign]: 'Unterzeichnen',
    [BrightChartStrings.Common_Close]: 'Schließen',
    [BrightChartStrings.Common_Back]: 'Zurück',
    [BrightChartStrings.Common_Next]: 'Weiter',
    [BrightChartStrings.Common_Previous]: 'Vorherige',
    [BrightChartStrings.Common_OfferSlot]: 'Zeitfenster anbieten',
    [BrightChartStrings.Common_SelectSlot]: 'Zeitfenster auswählen',

    // ── Common Empty States ────────────────────────────────────────────────
    [BrightChartStrings.Empty_NoResults]: 'Keine Ergebnisse gefunden.',
    [BrightChartStrings.Empty_NoDocuments]: 'Keine Dokumente gefunden',
    [BrightChartStrings.Empty_NoEncounters]: 'Keine Begegnungen gefunden.',
    [BrightChartStrings.Empty_NoOrders]:
      'Keine Aufträge entsprechen den aktuellen Filtern.',
    [BrightChartStrings.Empty_NoLedgerEntries]:
      'Keine Buchungseinträge gefunden.',
    [BrightChartStrings.Empty_NoAllergies]: 'Keine bekannten Allergien',
    [BrightChartStrings.Empty_NoMedications]: 'Keine Medikamente erfasst.',
    [BrightChartStrings.Empty_NoConditions]: 'Keine Erkrankungen erfasst.',
    [BrightChartStrings.Empty_NoAppointments]:
      'Keine Termine oder verfügbare Zeitfenster.',
    [BrightChartStrings.Empty_NoSlots]: 'Keine verfügbaren Zeitfenster.',
    [BrightChartStrings.Empty_NoWaitlist]:
      'Keine Patienten auf der Warteliste.',
    [BrightChartStrings.Empty_NoPermission]:
      'Sie haben keine Berechtigung, Patienten anzuzeigen.',

    // ── Form Labels ────────────────────────────────────────────────────────
    [BrightChartStrings.Form_GivenName]: 'Vorname',
    [BrightChartStrings.Form_FamilyName]: 'Nachname',
    [BrightChartStrings.Form_BirthDate]: 'Geburtsdatum',
    [BrightChartStrings.Form_Gender]: 'Geschlecht',
    [BrightChartStrings.Form_SelectGender]: 'Geschlecht auswählen',
    [BrightChartStrings.Form_Identifier]: 'Kennung',
    [BrightChartStrings.Form_Contact]: 'Kontakt',
    [BrightChartStrings.Form_Address]: 'Adresse',
    [BrightChartStrings.Form_CreatePatient]: 'Patient erstellen',
    [BrightChartStrings.Form_UpdatePatient]: 'Patient aktualisieren',
    [BrightChartStrings.Form_CreateOrder]: 'Auftrag erstellen',
    [BrightChartStrings.Form_UpdateOrder]: 'Auftrag aktualisieren',
    [BrightChartStrings.Form_CreatePrescription]: 'Rezept erstellen',
    [BrightChartStrings.Form_UpdatePrescription]: 'Rezept aktualisieren',
    [BrightChartStrings.Form_CreateObservation]: 'Beobachtung erstellen',
    [BrightChartStrings.Form_UpdateObservation]: 'Beobachtung aktualisieren',
    [BrightChartStrings.Form_BookAppointment]: 'Termin buchen',
    [BrightChartStrings.Form_RescheduleAppointment]: 'Termin verschieben',
    [BrightChartStrings.Form_CheckIn]: 'Einchecken',
    [BrightChartStrings.Form_UpdateEncounter]: 'Begegnung aktualisieren',
    [BrightChartStrings.Form_SubmitClaim]: 'Anspruch einreichen',
    [BrightChartStrings.Form_FinalizeSuperbill]: 'Superbill abschließen',

    // ── Allergy List ───────────────────────────────────────────────────────
    [BrightChartStrings.AllergyList_Title]: 'Allergien und Unverträglichkeiten',
    [BrightChartStrings.AllergyList_AddNew]: '+ Hinzufügen',

    // ── Condition List ─────────────────────────────────────────────────────
    [BrightChartStrings.ConditionList_Title]: 'Erkrankungen / Probleme',
    [BrightChartStrings.ConditionList_AddNew]: '+ Hinzufügen',

    // ── Medication List ────────────────────────────────────────────────────
    [BrightChartStrings.MedicationList_Title]: 'Medikamente',
    [BrightChartStrings.MedicationList_ActiveMedications]: 'Aktive Medikamente',
    [BrightChartStrings.MedicationList_Completed]: 'Abgeschlossen',
    [BrightChartStrings.MedicationList_Stopped]: 'Gestoppt',
    [BrightChartStrings.MedicationList_Other]: 'Sonstige',

    // ── Encounter List ─────────────────────────────────────────────────────
    [BrightChartStrings.EncounterList_StatusFilter]: 'Status:',
    [BrightChartStrings.EncounterList_ClassFilter]: 'Klasse:',

    // ── Document List / Viewer ─────────────────────────────────────────────
    [BrightChartStrings.DocumentViewer_NoDocument]: 'Kein Dokument anzuzeigen',
    [BrightChartStrings.DocumentViewer_ExplanationOfBenefit]:
      'Leistungserklärung',

    // ── Ledger ─────────────────────────────────────────────────────────────
    [BrightChartStrings.Ledger_CurrentBalance]: 'Aktueller Saldo:',

    // ── Waitlist ───────────────────────────────────────────────────────────
    [BrightChartStrings.Waitlist_Title]: 'Wartelistenverwaltung',
    [BrightChartStrings.Waitlist_WaitTime]: 'Wartezeit',
    [BrightChartStrings.Waitlist_PreferredDates]: 'Bevorzugte Termine',
    [BrightChartStrings.Waitlist_PreferredProvider]: 'Bevorzugter Anbieter',

    // ── Schedule ───────────────────────────────────────────────────────────
    [BrightChartStrings.Schedule_Day]: 'Tag',
    [BrightChartStrings.Schedule_Week]: 'Woche',
    [BrightChartStrings.Schedule_Month]: 'Monat',
    [BrightChartStrings.Schedule_Available]: 'Verfügbar',

    // ── Clinical Note Editor ───────────────────────────────────────────────
    [BrightChartStrings.NoteEditor_EmptyState]:
      'Keine Komposition oder Vorlage vorhanden. Wählen Sie eine Vorlage, um eine neue Notiz zu beginnen.',

    // ── Insurance ──────────────────────────────────────────────────────────
    [BrightChartStrings.Insurance_PlanType]: 'Plantyp',
    [BrightChartStrings.Insurance_GroupNumber]: 'Gruppennummer',
    [BrightChartStrings.Insurance_MemberID]: 'Mitgliedsnummer',
    [BrightChartStrings.Insurance_SubscriberName]:
      'Name des Versicherungsnehmers',
    [BrightChartStrings.Insurance_Relationship]: 'Beziehung',
    [BrightChartStrings.Insurance_PayerName]: 'Name des Kostenträgers',
    [BrightChartStrings.Insurance_Eligibility]: 'Versicherungsberechtigung',

    // ── Clinical Timeline ──────────────────────────────────────────────────
    [BrightChartStrings.ClinicalTimeline_AriaLabel]: 'Klinische Zeitleiste',
    [BrightChartStrings.ClinicalTimeline_FilterAriaLabel]:
      'Ressourcentypfilter',
    [BrightChartStrings.ClinicalTimeline_Empty]:
      'Keine klinischen Daten verfügbar.',
    [BrightChartStrings.ClinicalTimeline_Unknown]: 'Unbekannt',
    [BrightChartStrings.ClinicalTimeline_NoDate]: 'Kein Datum',

    // ── Note Template Selector ─────────────────────────────────────────────
    [BrightChartStrings.NoteTemplateSelector_AriaLabel]: 'Notizvorlagenauswahl',
    [BrightChartStrings.NoteTemplateSelector_Empty]: 'Keine Vorlagen verfügbar',
    [BrightChartStrings.NoteTemplateSelector_GroupAriaTemplate]:
      'Dokumenttyp {CODE}',
    [BrightChartStrings.NoteTemplateSelector_SelectTemplate]:
      'Vorlage auswählen: {NAME}',

    // ── Encounter Workflow Board ───────────────────────────────────────────
    [BrightChartStrings.WorkflowBoard_AriaLabel]:
      'Workflow-Board für Begegnungen',
    [BrightChartStrings.WorkflowBoard_UnknownPatient]: 'Unbekannter Patient',
    [BrightChartStrings.WorkflowBoard_NoEncounters]: 'Keine Begegnungen',
    [BrightChartStrings.WorkflowBoard_ColumnAriaTemplate]: 'Spalte {NAME}',

    // ── Schedule Editor ────────────────────────────────────────────────────
    [BrightChartStrings.ScheduleEditor_Title]: 'Zeitplaneditor',
    [BrightChartStrings.ScheduleEditor_AriaLabel]:
      'Editor für Zeitplanverfügbarkeit',
    [BrightChartStrings.ScheduleEditor_AddBlockLegend]:
      'Verfügbarkeitsblock hinzufügen',
    [BrightChartStrings.ScheduleEditor_DayLabel]: 'Tag',
    [BrightChartStrings.ScheduleEditor_StartTime]: 'Startzeit',
    [BrightChartStrings.ScheduleEditor_EndTime]: 'Endzeit',
    [BrightChartStrings.ScheduleEditor_RecurringWeekly]:
      'Wöchentlich wiederkehrend',
    [BrightChartStrings.ScheduleEditor_AddBlock]: 'Block hinzufügen',
    [BrightChartStrings.ScheduleEditor_StartBeforeEnd]:
      'Die Startzeit muss vor der Endzeit liegen',
    [BrightChartStrings.ScheduleEditor_NoAvailability]: 'Keine Verfügbarkeit',
    [BrightChartStrings.ScheduleEditor_Recurring]: 'Wiederkehrend',
    [BrightChartStrings.ScheduleEditor_GridAriaLabel]:
      'Wöchentliches Verfügbarkeitsraster',
    [BrightChartStrings.ScheduleEditor_SaveSchedule]: 'Zeitplan speichern',
    [BrightChartStrings.ScheduleEditor_Day_Monday]: 'Montag',
    [BrightChartStrings.ScheduleEditor_Day_Tuesday]: 'Dienstag',
    [BrightChartStrings.ScheduleEditor_Day_Wednesday]: 'Mittwoch',
    [BrightChartStrings.ScheduleEditor_Day_Thursday]: 'Donnerstag',
    [BrightChartStrings.ScheduleEditor_Day_Friday]: 'Freitag',
    [BrightChartStrings.ScheduleEditor_Day_Saturday]: 'Samstag',
    [BrightChartStrings.ScheduleEditor_Day_Sunday]: 'Sonntag',

    // ── Connectivity Indicator ─────────────────────────────────────────────
    [BrightChartStrings.Connectivity_Online]: 'Online',
    [BrightChartStrings.Connectivity_Offline]: 'Offline',
    [BrightChartStrings.Connectivity_StatusTemplate]:
      'Verbindungsstatus: {STATUS}',

    // ── Notification Bell ──────────────────────────────────────────────────
    [BrightChartStrings.NotificationBell_AriaLabel]: 'Benachrichtigungen',
    [BrightChartStrings.NotificationBell_UnreadTemplate]:
      'Benachrichtigungen, {COUNT} ungelesen',

    // ── Role Switcher ──────────────────────────────────────────────────────
    [BrightChartStrings.RoleSwitcher_AriaLabel]: 'Gesundheitsrolle wechseln',
    [BrightChartStrings.RoleSwitcher_MenuAriaLabel]:
      'Auswahl der Gesundheitsrolle',

    // ── Patient Header ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientHeader_AriaLabel]: 'Patienteninformationen',
    [BrightChartStrings.PatientHeader_Unknown]: 'Unbekannt',
    [BrightChartStrings.PatientHeader_MRN]: 'MRN:',
    [BrightChartStrings.PatientHeader_NA]: 'N/V',
    [BrightChartStrings.PatientHeader_AllergyTemplate]: 'Allergie: {NAME}',

    // ── Navigation Labels ──────────────────────────────────────────────────
    [BrightChartStrings.Nav_Patients]: 'Patienten',
    [BrightChartStrings.Nav_Clients]: 'Kunden',
    [BrightChartStrings.Nav_Encounters]: 'Begegnungen',
    [BrightChartStrings.Nav_Schedule]: 'Terminplan',
    [BrightChartStrings.Nav_Inbox]: 'Posteingang',
    [BrightChartStrings.Nav_OperatoryView]: 'Behandlungsraum-Ansicht',
    [BrightChartStrings.Nav_TreatmentPlans]: 'Behandlungspläne',
    [BrightChartStrings.Nav_SpeciesFilter]: 'Artenfilter',
    [BrightChartStrings.Nav_FarmCalls]: 'Hofbesuche',
    [BrightChartStrings.Nav_MyHealth]: 'Meine Gesundheit',
    [BrightChartStrings.Nav_Appointments]: 'Termine',
    [BrightChartStrings.Nav_TestResults]: 'Testergebnisse',
    [BrightChartStrings.Nav_BillsPayments]: 'Rechnungen & Zahlungen',
    [BrightChartStrings.Nav_CheckIn]: 'Anmeldung',
    [BrightChartStrings.Nav_Waitlist]: 'Warteliste',
    [BrightChartStrings.Nav_Registration]: 'Registrierung',
    [BrightChartStrings.Nav_Insurance]: 'Versicherung',
    [BrightChartStrings.Nav_Superbills]: 'Sammelrechnungen',
    [BrightChartStrings.Nav_Claims]: 'Ansprüche',
    [BrightChartStrings.Nav_ClaimTracking]: 'Anspruchsverfolgung',
    [BrightChartStrings.Nav_Payments]: 'Zahlungen',
    [BrightChartStrings.Nav_PatientLedger]: 'Patientenkonto',
    [BrightChartStrings.Nav_FeeSchedules]: 'Gebührenordnungen',
    [BrightChartStrings.Nav_Users]: 'Benutzer',
    [BrightChartStrings.Nav_Roles]: 'Rollen',
    [BrightChartStrings.Nav_AuditLog]: 'Prüfprotokoll',
    [BrightChartStrings.Nav_SpecialtyConfig]: 'Fachgebiet-Konfiguration',
    [BrightChartStrings.Nav_Settings]: 'Einstellungen',
    [BrightChartStrings.Nav_Organizations]: 'Organisationen',
    [BrightChartStrings.Nav_Clinician]: 'Kliniker',
    [BrightChartStrings.Nav_PatientPortal]: 'Patientenportal',
    [BrightChartStrings.Nav_Billing]: 'Abrechnung',

    // ── Sidebar ────────────────────────────────────────────────────────────
    [BrightChartStrings.Sidebar_ExpandAriaLabel]: 'Seitenleiste erweitern',
    [BrightChartStrings.Sidebar_CollapseAriaLabel]: 'Seitenleiste einklappen',
    [BrightChartStrings.Sidebar_NavAriaLabel]: 'BrightChart-Navigation',

    [BrightChartStrings.BottomNav_AriaLabel]: 'BrightChart mobile Navigation',
    [BrightChartStrings.Layout_NavAriaTemplate]: '{NAME}-Navigation',
  };
