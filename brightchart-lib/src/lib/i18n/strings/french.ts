import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChartStringKey,
  BrightChartStrings,
} from '../../enumerations/BrightChartStrings';

export const BrightChartFrenchStrings: ComponentStrings<BrightChartStringKey> =
  {
    // ── Menu / Navigation ──────────────────────────────────────────────
    [BrightChartStrings.MenuLabel]: 'BrightChart',
    [BrightChartStrings.ChartSectionsLabel]: 'Sections du dossier',
    [BrightChartStrings.Nav_Conversations]: 'Conversations',
    [BrightChartStrings.Nav_Groups]: 'Groupes',
    [BrightChartStrings.Nav_Channels]: 'Canaux',

    // ── Shell / Notifications ──────────────────────────────────────────
    [BrightChartStrings.Notification_Type_Result]: 'Résultat',
    [BrightChartStrings.Notification_Type_Note]: 'Note',
    [BrightChartStrings.Notification_Type_Appointment]: 'Rendez-vous',
    [BrightChartStrings.Notification_Type_Claim]: 'Réclamation',
    [BrightChartStrings.Notification_Type_Message]: 'Message',
    [BrightChartStrings.Notification_Type_System]: 'Système',
    [BrightChartStrings.Notification_Priority_Normal]: 'Normal',
    [BrightChartStrings.Notification_Priority_Urgent]: 'Urgent',

    // ── Roles ──────────────────────────────────────────────────────────
    [BrightChartStrings.Role_Physician]: 'Médecin',
    [BrightChartStrings.Role_RegisteredNurse]: 'Infirmier(ère) diplômé(e)',
    [BrightChartStrings.Role_MedicalAssistant]: 'Assistant(e) médical(e)',
    [BrightChartStrings.Role_Patient]: 'Patient',
    [BrightChartStrings.Role_ClinicalAdministrator]: 'Administrateur clinique',
    [BrightChartStrings.Role_Dentist]: 'Dentiste',
    [BrightChartStrings.Role_Veterinarian]: 'Vétérinaire',

    // ── Organization ───────────────────────────────────────────────────
    [BrightChartStrings.Org_EnrollmentMode_Open]: 'Ouvert',
    [BrightChartStrings.Org_EnrollmentMode_InviteOnly]:
      'Sur invitation uniquement',

    // ── Audit ──────────────────────────────────────────────────────────
    [BrightChartStrings.Audit_Operation_Create]: 'Créer',
    [BrightChartStrings.Audit_Operation_Read]: 'Lire',
    [BrightChartStrings.Audit_Operation_Update]: 'Mettre à jour',
    [BrightChartStrings.Audit_Operation_Delete]: 'Supprimer',
    [BrightChartStrings.Audit_Operation_Search]: 'Rechercher',
    [BrightChartStrings.Audit_Operation_Merge]: 'Fusionner',

    // ── FHIR / Patient Identity ──────────────────────────────────────────
    [BrightChartStrings.Gender_Male]: 'Masculin',
    [BrightChartStrings.Gender_Female]: 'Féminin',
    [BrightChartStrings.Gender_Other]: 'Autre',
    [BrightChartStrings.Gender_Unknown]: 'Inconnu',

    [BrightChartStrings.NameUse_Usual]: 'Usuel',
    [BrightChartStrings.NameUse_Official]: 'Officiel',
    [BrightChartStrings.NameUse_Temp]: 'Temporaire',
    [BrightChartStrings.NameUse_Nickname]: 'Surnom',
    [BrightChartStrings.NameUse_Anonymous]: 'Anonyme',
    [BrightChartStrings.NameUse_Old]: 'Ancien',
    [BrightChartStrings.NameUse_Maiden]: 'Nom de jeune fille',

    [BrightChartStrings.AddressUse_Home]: 'Domicile',
    [BrightChartStrings.AddressUse_Work]: 'Travail',
    [BrightChartStrings.AddressUse_Temp]: 'Temporaire',
    [BrightChartStrings.AddressUse_Old]: 'Ancien',
    [BrightChartStrings.AddressUse_Billing]: 'Facturation',

    [BrightChartStrings.AddressType_Postal]: 'Postal',
    [BrightChartStrings.AddressType_Physical]: 'Physique',
    [BrightChartStrings.AddressType_Both]: 'Les deux',

    [BrightChartStrings.ContactSystem_Phone]: 'Téléphone',
    [BrightChartStrings.ContactSystem_Fax]: 'Fax',
    [BrightChartStrings.ContactSystem_Email]: 'Courriel',
    [BrightChartStrings.ContactSystem_Pager]: 'Téléavertisseur',
    [BrightChartStrings.ContactSystem_Url]: 'URL',
    [BrightChartStrings.ContactSystem_Sms]: 'SMS',
    [BrightChartStrings.ContactSystem_Other]: 'Autre',

    [BrightChartStrings.ContactUse_Home]: 'Domicile',
    [BrightChartStrings.ContactUse_Work]: 'Travail',
    [BrightChartStrings.ContactUse_Temp]: 'Temporaire',
    [BrightChartStrings.ContactUse_Old]: 'Ancien',
    [BrightChartStrings.ContactUse_Mobile]: 'Mobile',

    [BrightChartStrings.LinkType_ReplacedBy]: 'Remplacé par',
    [BrightChartStrings.LinkType_Replaces]: 'Remplace',
    [BrightChartStrings.LinkType_Refer]: 'Référence',
    [BrightChartStrings.LinkType_SeeAlso]: 'Voir aussi',

    [BrightChartStrings.IdentifierUse_Usual]: 'Usuel',
    [BrightChartStrings.IdentifierUse_Official]: 'Officiel',
    [BrightChartStrings.IdentifierUse_Temp]: 'Temporaire',
    [BrightChartStrings.IdentifierUse_Secondary]: 'Secondaire',
    [BrightChartStrings.IdentifierUse_Old]: 'Ancien',

    // ── Clinical ─────────────────────────────────────────────────────────
    [BrightChartStrings.ObservationStatus_Registered]: 'Enregistré',
    [BrightChartStrings.ObservationStatus_Preliminary]: 'Préliminaire',
    [BrightChartStrings.ObservationStatus_Final]: 'Final',
    [BrightChartStrings.ObservationStatus_Amended]: 'Modifié',
    [BrightChartStrings.ObservationStatus_Corrected]: 'Corrigé',
    [BrightChartStrings.ObservationStatus_Cancelled]: 'Annulé',
    [BrightChartStrings.ObservationStatus_EnteredInError]: 'Saisi par erreur',
    [BrightChartStrings.ObservationStatus_Unknown]: 'Inconnu',

    [BrightChartStrings.ConditionClinical_Active]: 'Actif',
    [BrightChartStrings.ConditionClinical_Recurrence]: 'Récurrence',
    [BrightChartStrings.ConditionClinical_Relapse]: 'Rechute',
    [BrightChartStrings.ConditionClinical_Inactive]: 'Inactif',
    [BrightChartStrings.ConditionClinical_Remission]: 'Rémission',
    [BrightChartStrings.ConditionClinical_Resolved]: 'Résolu',

    [BrightChartStrings.ConditionVerification_Unconfirmed]: 'Non confirmé',
    [BrightChartStrings.ConditionVerification_Provisional]: 'Provisoire',
    [BrightChartStrings.ConditionVerification_Differential]: 'Différentiel',
    [BrightChartStrings.ConditionVerification_Confirmed]: 'Confirmé',
    [BrightChartStrings.ConditionVerification_Refuted]: 'Réfuté',
    [BrightChartStrings.ConditionVerification_EnteredInError]:
      'Saisi par erreur',

    [BrightChartStrings.AllergyType_Allergy]: 'Allergie',
    [BrightChartStrings.AllergyType_Intolerance]: 'Intolérance',

    [BrightChartStrings.AllergyCategory_Food]: 'Alimentaire',
    [BrightChartStrings.AllergyCategory_Medication]: 'Médicament',
    [BrightChartStrings.AllergyCategory_Environment]: 'Environnement',
    [BrightChartStrings.AllergyCategory_Biologic]: 'Biologique',

    [BrightChartStrings.AllergyCriticality_Low]: 'Faible',
    [BrightChartStrings.AllergyCriticality_High]: 'Élevé',
    [BrightChartStrings.AllergyCriticality_UnableToAssess]:
      'Impossible à évaluer',

    [BrightChartStrings.AllergySeverity_Mild]: 'Léger',
    [BrightChartStrings.AllergySeverity_Moderate]: 'Modéré',
    [BrightChartStrings.AllergySeverity_Severe]: 'Sévère',

    [BrightChartStrings.MedicationStatus_Active]: 'Actif',
    [BrightChartStrings.MedicationStatus_Inactive]: 'Inactif',
    [BrightChartStrings.MedicationStatus_EnteredInError]: 'Saisi par erreur',

    [BrightChartStrings.MedStatementStatus_Active]: 'Actif',
    [BrightChartStrings.MedStatementStatus_Completed]: 'Terminé',
    [BrightChartStrings.MedStatementStatus_EnteredInError]: 'Saisi par erreur',
    [BrightChartStrings.MedStatementStatus_Intended]: 'Prévu',
    [BrightChartStrings.MedStatementStatus_Stopped]: 'Arrêté',
    [BrightChartStrings.MedStatementStatus_OnHold]: 'En attente',
    [BrightChartStrings.MedStatementStatus_Unknown]: 'Inconnu',
    [BrightChartStrings.MedStatementStatus_NotTaken]: 'Non pris',

    [BrightChartStrings.ProcedureStatus_Preparation]: 'Préparation',
    [BrightChartStrings.ProcedureStatus_InProgress]: 'En cours',
    [BrightChartStrings.ProcedureStatus_NotDone]: 'Non effectué',
    [BrightChartStrings.ProcedureStatus_OnHold]: 'En attente',
    [BrightChartStrings.ProcedureStatus_Stopped]: 'Arrêté',
    [BrightChartStrings.ProcedureStatus_Completed]: 'Terminé',
    [BrightChartStrings.ProcedureStatus_EnteredInError]: 'Saisi par erreur',
    [BrightChartStrings.ProcedureStatus_Unknown]: 'Inconnu',

    // ── Encounter ────────────────────────────────────────────────────────
    [BrightChartStrings.EncounterStatus_Planned]: 'Planifié',
    [BrightChartStrings.EncounterStatus_Arrived]: 'Arrivé',
    [BrightChartStrings.EncounterStatus_Triaged]: 'Trié',
    [BrightChartStrings.EncounterStatus_InProgress]: 'En cours',
    [BrightChartStrings.EncounterStatus_OnLeave]: 'En congé',
    [BrightChartStrings.EncounterStatus_Finished]: 'Terminé',
    [BrightChartStrings.EncounterStatus_Cancelled]: 'Annulé',
    [BrightChartStrings.EncounterStatus_EnteredInError]: 'Saisi par erreur',
    [BrightChartStrings.EncounterStatus_Unknown]: 'Inconnu',

    [BrightChartStrings.EncounterLocationStatus_Planned]: 'Planifié',
    [BrightChartStrings.EncounterLocationStatus_Active]: 'Actif',
    [BrightChartStrings.EncounterLocationStatus_Reserved]: 'Réservé',
    [BrightChartStrings.EncounterLocationStatus_Completed]: 'Terminé',

    [BrightChartStrings.EncounterClass_Inpatient]: 'Hospitalisation',
    [BrightChartStrings.EncounterClass_Ambulatory]: 'Ambulatoire',
    [BrightChartStrings.EncounterClass_Emergency]: 'Urgence',
    [BrightChartStrings.EncounterClass_HomeHealth]: 'Soins à domicile',
    [BrightChartStrings.EncounterClass_Virtual]: 'Virtuel',
    [BrightChartStrings.EncounterClass_Field]: 'Terrain',
    [BrightChartStrings.EncounterClass_ShortStay]: 'Court séjour',
    [BrightChartStrings.EncounterClass_Observation]: 'Observation',
    [BrightChartStrings.EncounterClass_PreAdmission]: 'Pré-admission',

    [BrightChartStrings.DiagnosisRole_Admission]: "Diagnostic d'admission",
    [BrightChartStrings.DiagnosisRole_Discharge]: 'Diagnostic de sortie',
    [BrightChartStrings.DiagnosisRole_ChiefComplaint]: 'Motif de consultation',
    [BrightChartStrings.DiagnosisRole_Comorbidity]: 'Comorbidité',
    [BrightChartStrings.DiagnosisRole_PreOp]: 'Diagnostic pré-opératoire',
    [BrightChartStrings.DiagnosisRole_PostOp]: 'Diagnostic post-opératoire',
    [BrightChartStrings.DiagnosisRole_Billing]: 'Diagnostic de facturation',

    // ── Documentation ────────────────────────────────────────────────────
    [BrightChartStrings.CompositionStatus_Preliminary]: 'Préliminaire',
    [BrightChartStrings.CompositionStatus_Final]: 'Final',
    [BrightChartStrings.CompositionStatus_Amended]: 'Modifié',
    [BrightChartStrings.CompositionStatus_EnteredInError]: 'Saisi par erreur',

    [BrightChartStrings.DocRefStatus_Current]: 'Actuel',
    [BrightChartStrings.DocRefStatus_Superseded]: 'Remplacé',
    [BrightChartStrings.DocRefStatus_EnteredInError]: 'Saisi par erreur',

    [BrightChartStrings.AttestationMode_Personal]: 'Personnel',
    [BrightChartStrings.AttestationMode_Professional]: 'Professionnel',
    [BrightChartStrings.AttestationMode_Legal]: 'Légal',
    [BrightChartStrings.AttestationMode_Official]: 'Officiel',

    [BrightChartStrings.DocRelationship_Replaces]: 'Remplace',
    [BrightChartStrings.DocRelationship_Transforms]: 'Transforme',
    [BrightChartStrings.DocRelationship_Signs]: 'Signe',
    [BrightChartStrings.DocRelationship_Appends]: 'Ajoute',

    // ── Note Templates ───────────────────────────────────────────────────
    [BrightChartStrings.Template_SOAPNote_Name]: 'Note SOAP',
    [BrightChartStrings.Template_SOAPNote_Description]:
      'Format standard Subjectif, Objectif, Évaluation, Plan utilisé en consultation externe et hospitalière.',
    [BrightChartStrings.Template_SOAPNote_Subjective]: 'Subjectif',
    [BrightChartStrings.Template_SOAPNote_Objective]: 'Objectif',
    [BrightChartStrings.Template_SOAPNote_Assessment]: 'Évaluation',
    [BrightChartStrings.Template_SOAPNote_Plan]: 'Plan',

    [BrightChartStrings.Template_HP_Name]: 'Anamnèse et examen physique',
    [BrightChartStrings.Template_HP_Description]:
      "Format d'évaluation initiale complet pour les admissions hospitalières et les nouvelles consultations.",
    [BrightChartStrings.Template_HP_ChiefComplaint]: 'Motif de consultation',
    [BrightChartStrings.Template_HP_HPI]: 'Histoire de la maladie actuelle',
    [BrightChartStrings.Template_HP_PastMedicalHistory]: 'Antécédents médicaux',
    [BrightChartStrings.Template_HP_ReviewOfSystems]: 'Revue des systèmes',
    [BrightChartStrings.Template_HP_PhysicalExam]: 'Examen physique',
    [BrightChartStrings.Template_HP_Assessment]: 'Évaluation',
    [BrightChartStrings.Template_HP_Plan]: 'Plan',

    [BrightChartStrings.Template_Discharge_Name]: 'Résumé de sortie',
    [BrightChartStrings.Template_Discharge_Description]:
      "Format standard pour documenter le séjour hospitalier, les diagnostics, l'évolution et le plan de sortie.",
    [BrightChartStrings.Template_Discharge_AdmissionDiagnosis]:
      "Diagnostic d'admission",
    [BrightChartStrings.Template_Discharge_HospitalCourse]:
      'Évolution hospitalière',
    [BrightChartStrings.Template_Discharge_DischargeDiagnosis]:
      'Diagnostic de sortie',
    [BrightChartStrings.Template_Discharge_DischargeMedications]:
      'Médicaments de sortie',
    [BrightChartStrings.Template_Discharge_FollowUp]: 'Instructions de suivi',

    [BrightChartStrings.Template_Procedure_Name]: 'Note de procédure',
    [BrightChartStrings.Template_Procedure_Description]:
      'Format standard pour documenter les procédures cliniques ou chirurgicales.',
    [BrightChartStrings.Template_Procedure_Indication]: 'Indication',
    [BrightChartStrings.Template_Procedure_ProcedureDescription]:
      'Description de la procédure',
    [BrightChartStrings.Template_Procedure_Findings]: 'Résultats',
    [BrightChartStrings.Template_Procedure_Complications]: 'Complications',
    [BrightChartStrings.Template_Procedure_PostProcedurePlan]:
      'Plan post-procédure',

    // ── LOINC Document Types ─────────────────────────────────────────────
    [BrightChartStrings.DocType_ConsultationNote]: 'Note de consultation',
    [BrightChartStrings.DocType_DischargeSummary]: 'Résumé de sortie',
    [BrightChartStrings.DocType_HistoryAndPhysical]:
      'Anamnèse et examen physique',
    [BrightChartStrings.DocType_ProgressNote]: "Note d'évolution",
    [BrightChartStrings.DocType_ProcedureNote]: 'Note de procédure',
    [BrightChartStrings.DocType_OperativeNote]: 'Note opératoire',
    [BrightChartStrings.DocType_NurseNote]: 'Note infirmière',
    [BrightChartStrings.DocType_ReferralNote]: 'Note de référence',
    [BrightChartStrings.DocType_TransferSummary]: 'Résumé de transfert',

    // ── Orders & Results ─────────────────────────────────────────────────
    [BrightChartStrings.ServiceRequestStatus_Draft]: 'Brouillon',
    [BrightChartStrings.ServiceRequestStatus_Active]: 'Actif',
    [BrightChartStrings.ServiceRequestStatus_OnHold]: 'En attente',
    [BrightChartStrings.ServiceRequestStatus_Revoked]: 'Révoqué',
    [BrightChartStrings.ServiceRequestStatus_Completed]: 'Terminé',
    [BrightChartStrings.ServiceRequestStatus_EnteredInError]:
      'Saisi par erreur',
    [BrightChartStrings.ServiceRequestStatus_Unknown]: 'Inconnu',

    [BrightChartStrings.ServiceRequestIntent_Proposal]: 'Proposition',
    [BrightChartStrings.ServiceRequestIntent_Plan]: 'Plan',
    [BrightChartStrings.ServiceRequestIntent_Directive]: 'Directive',
    [BrightChartStrings.ServiceRequestIntent_Order]: 'Ordonnance',
    [BrightChartStrings.ServiceRequestIntent_OriginalOrder]:
      'Ordonnance originale',
    [BrightChartStrings.ServiceRequestIntent_ReflexOrder]: 'Ordonnance réflexe',
    [BrightChartStrings.ServiceRequestIntent_FillerOrder]:
      'Ordonnance de remplissage',
    [BrightChartStrings.ServiceRequestIntent_InstanceOrder]:
      "Ordonnance d'instance",
    [BrightChartStrings.ServiceRequestIntent_Option]: 'Option',

    [BrightChartStrings.MedRequestStatus_Active]: 'Actif',
    [BrightChartStrings.MedRequestStatus_OnHold]: 'En attente',
    [BrightChartStrings.MedRequestStatus_Cancelled]: 'Annulé',
    [BrightChartStrings.MedRequestStatus_Completed]: 'Terminé',
    [BrightChartStrings.MedRequestStatus_EnteredInError]: 'Saisi par erreur',
    [BrightChartStrings.MedRequestStatus_Stopped]: 'Arrêté',
    [BrightChartStrings.MedRequestStatus_Draft]: 'Brouillon',
    [BrightChartStrings.MedRequestStatus_Unknown]: 'Inconnu',

    [BrightChartStrings.MedRequestIntent_Proposal]: 'Proposition',
    [BrightChartStrings.MedRequestIntent_Plan]: 'Plan',
    [BrightChartStrings.MedRequestIntent_Order]: 'Ordonnance',
    [BrightChartStrings.MedRequestIntent_OriginalOrder]: 'Ordonnance originale',
    [BrightChartStrings.MedRequestIntent_ReflexOrder]: 'Ordonnance réflexe',
    [BrightChartStrings.MedRequestIntent_FillerOrder]:
      'Ordonnance de remplissage',
    [BrightChartStrings.MedRequestIntent_InstanceOrder]:
      "Ordonnance d'instance",
    [BrightChartStrings.MedRequestIntent_Option]: 'Option',

    [BrightChartStrings.DiagnosticReportStatus_Registered]: 'Enregistré',
    [BrightChartStrings.DiagnosticReportStatus_Partial]: 'Partiel',
    [BrightChartStrings.DiagnosticReportStatus_Preliminary]: 'Préliminaire',
    [BrightChartStrings.DiagnosticReportStatus_Final]: 'Final',
    [BrightChartStrings.DiagnosticReportStatus_Amended]: 'Modifié',
    [BrightChartStrings.DiagnosticReportStatus_Corrected]: 'Corrigé',
    [BrightChartStrings.DiagnosticReportStatus_Appended]: 'Ajouté',
    [BrightChartStrings.DiagnosticReportStatus_Cancelled]: 'Annulé',
    [BrightChartStrings.DiagnosticReportStatus_EnteredInError]:
      'Saisi par erreur',
    [BrightChartStrings.DiagnosticReportStatus_Unknown]: 'Inconnu',

    [BrightChartStrings.RequestPriority_Routine]: 'Routine',
    [BrightChartStrings.RequestPriority_Urgent]: 'Urgent',
    [BrightChartStrings.RequestPriority_Asap]: 'Dès que possible',
    [BrightChartStrings.RequestPriority_Stat]: 'Immédiat',

    // ── Billing ──────────────────────────────────────────────────────────
    [BrightChartStrings.CoverageStatus_Active]: 'Actif',
    [BrightChartStrings.CoverageStatus_Cancelled]: 'Annulé',
    [BrightChartStrings.CoverageStatus_Draft]: 'Brouillon',
    [BrightChartStrings.CoverageStatus_EnteredInError]: 'Saisi par erreur',

    [BrightChartStrings.ClaimStatus_Active]: 'Actif',
    [BrightChartStrings.ClaimStatus_Cancelled]: 'Annulé',
    [BrightChartStrings.ClaimStatus_Draft]: 'Brouillon',
    [BrightChartStrings.ClaimStatus_EnteredInError]: 'Saisi par erreur',

    [BrightChartStrings.ClaimUse_Claim]: 'Réclamation',
    [BrightChartStrings.ClaimUse_Preauthorization]: 'Préautorisation',
    [BrightChartStrings.ClaimUse_Predetermination]: 'Prédétermination',

    [BrightChartStrings.EOBStatus_Active]: 'Actif',
    [BrightChartStrings.EOBStatus_Cancelled]: 'Annulé',
    [BrightChartStrings.EOBStatus_Draft]: 'Brouillon',
    [BrightChartStrings.EOBStatus_EnteredInError]: 'Saisi par erreur',

    [BrightChartStrings.RemittanceOutcome_Queued]: "En file d'attente",
    [BrightChartStrings.RemittanceOutcome_Complete]: 'Terminé',
    [BrightChartStrings.RemittanceOutcome_Error]: 'Erreur',
    [BrightChartStrings.RemittanceOutcome_Partial]: 'Partiel',

    [BrightChartStrings.EligibilityPurpose_AuthRequirements]:
      "Exigences d'autorisation",
    [BrightChartStrings.EligibilityPurpose_Benefits]: 'Prestations',
    [BrightChartStrings.EligibilityPurpose_Discovery]: 'Découverte',
    [BrightChartStrings.EligibilityPurpose_Validation]: 'Validation',

    [BrightChartStrings.SuperbillStatus_Draft]: 'Brouillon',
    [BrightChartStrings.SuperbillStatus_Finalized]: 'Finalisé',
    [BrightChartStrings.SuperbillStatus_Billed]: 'Facturé',

    [BrightChartStrings.LedgerEntryType_Charge]: 'Frais',
    [BrightChartStrings.LedgerEntryType_Payment]: 'Paiement',
    [BrightChartStrings.LedgerEntryType_Adjustment]: 'Ajustement',
    [BrightChartStrings.LedgerEntryType_Refund]: 'Remboursement',
    [BrightChartStrings.LedgerEntryType_WriteOff]: 'Radiation',

    [BrightChartStrings.ClaimType_Institutional]: 'Institutionnel',
    [BrightChartStrings.ClaimType_Oral]: 'Dentaire',
    [BrightChartStrings.ClaimType_Pharmacy]: 'Pharmacie',
    [BrightChartStrings.ClaimType_Professional]: 'Professionnel',
    [BrightChartStrings.ClaimType_Vision]: 'Vision',

    // ── Scheduling ───────────────────────────────────────────────────────
    [BrightChartStrings.AppointmentStatus_Proposed]: 'Proposé',
    [BrightChartStrings.AppointmentStatus_Pending]: 'En attente',
    [BrightChartStrings.AppointmentStatus_Booked]: 'Réservé',
    [BrightChartStrings.AppointmentStatus_Arrived]: 'Arrivé',
    [BrightChartStrings.AppointmentStatus_Fulfilled]: 'Accompli',
    [BrightChartStrings.AppointmentStatus_Cancelled]: 'Annulé',
    [BrightChartStrings.AppointmentStatus_Noshow]: 'Absent',
    [BrightChartStrings.AppointmentStatus_EnteredInError]: 'Saisi par erreur',
    [BrightChartStrings.AppointmentStatus_CheckedIn]: 'Enregistré',
    [BrightChartStrings.AppointmentStatus_Waitlist]: "Liste d'attente",

    [BrightChartStrings.SlotStatus_Busy]: 'Occupé',
    [BrightChartStrings.SlotStatus_Free]: 'Libre',
    [BrightChartStrings.SlotStatus_BusyUnavailable]: 'Occupé (indisponible)',
    [BrightChartStrings.SlotStatus_BusyTentative]: 'Occupé (provisoire)',
    [BrightChartStrings.SlotStatus_EnteredInError]: 'Saisi par erreur',

    [BrightChartStrings.ParticipantRequired_Required]: 'Requis',
    [BrightChartStrings.ParticipantRequired_Optional]: 'Optionnel',
    [BrightChartStrings.ParticipantRequired_InformationOnly]:
      'Information uniquement',

    [BrightChartStrings.ParticipationStatus_Accepted]: 'Accepté',
    [BrightChartStrings.ParticipationStatus_Declined]: 'Refusé',
    [BrightChartStrings.ParticipationStatus_Tentative]: 'Provisoire',
    [BrightChartStrings.ParticipationStatus_NeedsAction]: 'Action requise',

    [BrightChartStrings.WaitlistStatus_Waiting]: 'En attente',
    [BrightChartStrings.WaitlistStatus_Offered]: 'Proposé',
    [BrightChartStrings.WaitlistStatus_Booked]: 'Réservé',
    [BrightChartStrings.WaitlistStatus_Cancelled]: 'Annulé',
    [BrightChartStrings.WaitlistStatus_Expired]: 'Expiré',

    [BrightChartStrings.ReminderType_Sms]: 'SMS',
    [BrightChartStrings.ReminderType_Email]: 'Courriel',
    [BrightChartStrings.ReminderType_Push]: 'Notification push',
    [BrightChartStrings.ReminderType_Phone]: 'Appel téléphonique',

    [BrightChartStrings.ReminderStatus_Scheduled]: 'Planifié',
    [BrightChartStrings.ReminderStatus_Sent]: 'Envoyé',
    [BrightChartStrings.ReminderStatus_Failed]: 'Échoué',
    [BrightChartStrings.ReminderStatus_Cancelled]: 'Annulé',

    // ── Offline / Sync ───────────────────────────────────────────────────
    [BrightChartStrings.Sync_Conflict]: 'Conflit de synchronisation',
    [BrightChartStrings.Sync_Success]: 'Synchronisation réussie',

    // ── FHIR OperationOutcome Severity ───────────────────────────────────
    [BrightChartStrings.IssueSeverity_Fatal]: 'Fatal',
    [BrightChartStrings.IssueSeverity_Error]: 'Erreur',
    [BrightChartStrings.IssueSeverity_Warning]: 'Avertissement',
    [BrightChartStrings.IssueSeverity_Information]: 'Information',

    // ── Narrative Status ─────────────────────────────────────────────────
    [BrightChartStrings.NarrativeStatus_Generated]: 'Généré',
    [BrightChartStrings.NarrativeStatus_Extensions]: 'Extensions',
    [BrightChartStrings.NarrativeStatus_Additional]: 'Supplémentaire',
    [BrightChartStrings.NarrativeStatus_Empty]: 'Vide',

    // ── Shell / UI ─────────────────────────────────────────────────────────
    [BrightChartStrings.Shell_Notifications]: 'Notifications',
    [BrightChartStrings.Shell_MarkAllRead]: 'Marquer tout comme lu',
    [BrightChartStrings.Shell_NoNotifications]: 'Aucune notification',
    [BrightChartStrings.Shell_AccessDenied]: 'Accès refusé',
    [BrightChartStrings.Shell_AccessDeniedMessage]:
      "Vous n'avez pas la permission d'accéder à cette zone.",
    [BrightChartStrings.Shell_Loading]: 'Chargement...',

    // ── Patient Chart Tabs ─────────────────────────────────────────────────
    [BrightChartStrings.PatientChart_Title]: 'Dossier patient',
    [BrightChartStrings.PatientChart_Summary]: 'Résumé',
    [BrightChartStrings.PatientChart_Problems]: 'Problèmes',
    [BrightChartStrings.PatientChart_Medications]: 'Médicaments',
    [BrightChartStrings.PatientChart_Allergies]: 'Allergies',
    [BrightChartStrings.PatientChart_Encounters]: 'Consultations',
    [BrightChartStrings.PatientChart_Documents]: 'Documents',
    [BrightChartStrings.PatientChart_Orders]: 'Ordonnances',
    [BrightChartStrings.PatientChart_Results]: 'Résultats',
    [BrightChartStrings.PatientChart_Appointments]: 'Rendez-vous',
    [BrightChartStrings.PatientChart_Insurance]: 'Assurance',
    [BrightChartStrings.PatientChart_Billing]: 'Facturation',
    [BrightChartStrings.PatientChart_NoPatientSelected]:
      'Aucun patient sélectionné.',

    // ── Encounter Dashboard ────────────────────────────────────────────────
    [BrightChartStrings.EncounterDashboard_Title]: 'Consultations du jour',
    [BrightChartStrings.EncounterDashboard_Scheduled]: 'Planifié',
    [BrightChartStrings.EncounterDashboard_InProgress]: 'En cours',
    [BrightChartStrings.EncounterDashboard_PendingTasks]: 'Tâches en attente',

    // ── Clinician Inbox ────────────────────────────────────────────────────
    [BrightChartStrings.ClinicianInbox_Title]: 'Boîte de réception',
    [BrightChartStrings.ClinicianInbox_PendingResults]: 'Résultats en attente',
    [BrightChartStrings.ClinicianInbox_UnsignedNotes]: 'Notes non signées',
    [BrightChartStrings.ClinicianInbox_Messages]: 'Messages',

    // ── Patient Portal ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientPortal_MyHealth]: 'Ma santé',
    [BrightChartStrings.PatientPortal_Welcome]: 'Bienvenue',
    [BrightChartStrings.PatientPortal_WelcomeUser]: 'Bienvenue, {NAME}',
    [BrightChartStrings.PatientPortal_ViewingRecordsAt]:
      'Consultation des dossiers chez {ORG}',
    [BrightChartStrings.PatientPortal_NextAppointment]: 'Prochain rendez-vous',
    [BrightChartStrings.PatientPortal_NoneScheduled]: 'Aucun prévu',
    [BrightChartStrings.PatientPortal_ActiveMedications]: 'Médicaments actifs',
    [BrightChartStrings.PatientPortal_RecentResults]: 'Résultats récents',
    [BrightChartStrings.PatientPortal_OutstandingBalance]: 'Solde impayé',
    [BrightChartStrings.PatientPortal_ClinicalTimeline]: 'Chronologie clinique',
    [BrightChartStrings.PatientPortal_Appointments]: 'Rendez-vous',
    [BrightChartStrings.PatientPortal_RequestAppointment]:
      'Demander un rendez-vous',
    [BrightChartStrings.PatientPortal_Upcoming]: 'À venir',
    [BrightChartStrings.PatientPortal_NoUpcoming]: 'Aucun rendez-vous à venir.',
    [BrightChartStrings.PatientPortal_Past]: 'Passé',
    [BrightChartStrings.PatientPortal_TestResults]: "Résultats d'examens",
    [BrightChartStrings.PatientPortal_BillsPayments]: 'Factures et paiements',

    // ── Front Desk ─────────────────────────────────────────────────────────
    [BrightChartStrings.FrontDesk_Title]: 'Accueil',
    [BrightChartStrings.FrontDesk_TodaysAppointments]: 'Rendez-vous du jour',
    [BrightChartStrings.FrontDesk_CheckedIn]: 'Enregistré',
    [BrightChartStrings.FrontDesk_Waitlist]: "Liste d'attente",
    [BrightChartStrings.FrontDesk_PendingEligibility]: 'Éligibilité en attente',
    [BrightChartStrings.FrontDesk_PatientCheckIn]: 'Enregistrement patient',
    [BrightChartStrings.FrontDesk_PatientRegistration]: 'Inscription patient',

    // ── Billing Workspace ──────────────────────────────────────────────────
    [BrightChartStrings.BillingWS_Title]: 'Facturation',
    [BrightChartStrings.BillingWS_UnbilledEncounters]:
      'Consultations non facturées',
    [BrightChartStrings.BillingWS_PendingClaims]: 'Réclamations en attente',
    [BrightChartStrings.BillingWS_DeniedClaims]: 'Réclamations refusées',
    [BrightChartStrings.BillingWS_TodaysPayments]: 'Paiements du jour',
    [BrightChartStrings.BillingWS_ClaimTracking]: 'Suivi des réclamations',
    [BrightChartStrings.BillingWS_PaymentPosting]:
      'Enregistrement des paiements',

    // ── Admin Workspace ────────────────────────────────────────────────────
    [BrightChartStrings.Admin_UserManagement]: 'Gestion des utilisateurs',
    [BrightChartStrings.Admin_RoleConfiguration]: 'Configuration des rôles',
    [BrightChartStrings.Admin_AuditLog]: "Journal d'audit",
    [BrightChartStrings.Admin_SpecialtyConfiguration]:
      'Configuration de la spécialité',
    [BrightChartStrings.Admin_PatientSearch]: 'Recherche de patients',

    // ── Common Table Headers / Labels ──────────────────────────────────────
    [BrightChartStrings.Common_Date]: 'Date',
    [BrightChartStrings.Common_Type]: 'Type',
    [BrightChartStrings.Common_Status]: 'Statut',
    [BrightChartStrings.Common_Description]: 'Description',
    [BrightChartStrings.Common_Amount]: 'Montant',
    [BrightChartStrings.Common_Balance]: 'Solde',
    [BrightChartStrings.Common_Name]: 'Nom',
    [BrightChartStrings.Common_Actions]: 'Actions',
    [BrightChartStrings.Common_Priority]: 'Priorité',
    [BrightChartStrings.Common_Category]: 'Catégorie',
    [BrightChartStrings.Common_Patient]: 'Patient',
    [BrightChartStrings.Common_Provider]: 'Prestataire',
    [BrightChartStrings.Common_Service]: 'Service',
    [BrightChartStrings.Common_Notes]: 'Notes',
    [BrightChartStrings.Common_From]: 'De',
    [BrightChartStrings.Common_To]: 'À',

    // ── Common Buttons / Actions ───────────────────────────────────────────
    [BrightChartStrings.Common_Save]: 'Enregistrer',
    [BrightChartStrings.Common_Cancel]: 'Annuler',
    [BrightChartStrings.Common_Search]: 'Rechercher',
    [BrightChartStrings.Common_Add]: 'Ajouter',
    [BrightChartStrings.Common_Remove]: 'Supprimer',
    [BrightChartStrings.Common_Submit]: 'Soumettre',
    [BrightChartStrings.Common_Create]: 'Créer',
    [BrightChartStrings.Common_Update]: 'Mettre à jour',
    [BrightChartStrings.Common_Delete]: 'Supprimer',
    [BrightChartStrings.Common_Sign]: 'Signer',
    [BrightChartStrings.Common_Close]: 'Fermer',
    [BrightChartStrings.Common_Back]: 'Retour',
    [BrightChartStrings.Common_Next]: 'Suivant',
    [BrightChartStrings.Common_Previous]: 'Précédent',
    [BrightChartStrings.Common_OfferSlot]: 'Proposer un créneau',
    [BrightChartStrings.Common_SelectSlot]: 'Sélectionner un créneau',

    // ── Common Empty States ────────────────────────────────────────────────
    [BrightChartStrings.Empty_NoResults]: 'Aucun résultat trouvé.',
    [BrightChartStrings.Empty_NoDocuments]: 'Aucun document trouvé',
    [BrightChartStrings.Empty_NoEncounters]: 'Aucune consultation trouvée.',
    [BrightChartStrings.Empty_NoOrders]:
      'Aucune ordonnance ne correspond aux filtres.',
    [BrightChartStrings.Empty_NoLedgerEntries]:
      'Aucune écriture comptable trouvée.',
    [BrightChartStrings.Empty_NoAllergies]: 'Aucune allergie connue',
    [BrightChartStrings.Empty_NoMedications]: 'Aucun médicament enregistré.',
    [BrightChartStrings.Empty_NoConditions]: 'Aucune condition enregistrée.',
    [BrightChartStrings.Empty_NoAppointments]:
      'Aucun rendez-vous ou créneau disponible.',
    [BrightChartStrings.Empty_NoSlots]: 'Aucun créneau disponible.',
    [BrightChartStrings.Empty_NoWaitlist]: "Aucun patient en liste d'attente.",
    [BrightChartStrings.Empty_NoPermission]:
      "Vous n'avez pas la permission de voir les patients.",

    // ── Form Labels ────────────────────────────────────────────────────────
    [BrightChartStrings.Form_GivenName]: 'Prénom',
    [BrightChartStrings.Form_FamilyName]: 'Nom de famille',
    [BrightChartStrings.Form_BirthDate]: 'Date de naissance',
    [BrightChartStrings.Form_Gender]: 'Genre',
    [BrightChartStrings.Form_SelectGender]: 'Sélectionner le genre',
    [BrightChartStrings.Form_Identifier]: 'Identifiant',
    [BrightChartStrings.Form_Contact]: 'Contact',
    [BrightChartStrings.Form_Address]: 'Adresse',
    [BrightChartStrings.Form_CreatePatient]: 'Créer un patient',
    [BrightChartStrings.Form_UpdatePatient]: 'Mettre à jour le patient',
    [BrightChartStrings.Form_CreateOrder]: 'Créer une ordonnance',
    [BrightChartStrings.Form_UpdateOrder]: "Mettre à jour l'ordonnance",
    [BrightChartStrings.Form_CreatePrescription]: 'Créer une prescription',
    [BrightChartStrings.Form_UpdatePrescription]:
      'Mettre à jour la prescription',
    [BrightChartStrings.Form_CreateObservation]: 'Créer une observation',
    [BrightChartStrings.Form_UpdateObservation]: "Mettre à jour l'observation",
    [BrightChartStrings.Form_BookAppointment]: 'Réserver un rendez-vous',
    [BrightChartStrings.Form_RescheduleAppointment]:
      'Reprogrammer un rendez-vous',
    [BrightChartStrings.Form_CheckIn]: 'Enregistrement',
    [BrightChartStrings.Form_UpdateEncounter]: 'Mettre à jour la consultation',
    [BrightChartStrings.Form_SubmitClaim]: 'Soumettre la réclamation',
    [BrightChartStrings.Form_FinalizeSuperbill]: 'Finaliser le bordereau',

    // ── Allergy List ───────────────────────────────────────────────────────
    [BrightChartStrings.AllergyList_Title]: 'Allergies et intolérances',
    [BrightChartStrings.AllergyList_AddNew]: '+ Ajouter',

    // ── Condition List ─────────────────────────────────────────────────────
    [BrightChartStrings.ConditionList_Title]: 'Conditions / Problèmes',
    [BrightChartStrings.ConditionList_AddNew]: '+ Ajouter',

    // ── Medication List ────────────────────────────────────────────────────
    [BrightChartStrings.MedicationList_Title]: 'Médicaments',
    [BrightChartStrings.MedicationList_ActiveMedications]: 'Médicaments actifs',
    [BrightChartStrings.MedicationList_Completed]: 'Terminé',
    [BrightChartStrings.MedicationList_Stopped]: 'Arrêté',
    [BrightChartStrings.MedicationList_Other]: 'Autre',

    // ── Encounter List ─────────────────────────────────────────────────────
    [BrightChartStrings.EncounterList_StatusFilter]: 'Statut :',
    [BrightChartStrings.EncounterList_ClassFilter]: 'Classe :',

    // ── Document List / Viewer ─────────────────────────────────────────────
    [BrightChartStrings.DocumentViewer_NoDocument]: 'Aucun document à afficher',
    [BrightChartStrings.DocumentViewer_ExplanationOfBenefit]:
      'Explication des prestations',

    // ── Ledger ─────────────────────────────────────────────────────────────
    [BrightChartStrings.Ledger_CurrentBalance]: 'Solde actuel :',

    // ── Waitlist ───────────────────────────────────────────────────────────
    [BrightChartStrings.Waitlist_Title]: "Gestionnaire de liste d'attente",
    [BrightChartStrings.Waitlist_WaitTime]: "Temps d'attente",
    [BrightChartStrings.Waitlist_PreferredDates]: 'Dates préférées',
    [BrightChartStrings.Waitlist_PreferredProvider]: 'Prestataire préféré',

    // ── Schedule ───────────────────────────────────────────────────────────
    [BrightChartStrings.Schedule_Day]: 'Jour',
    [BrightChartStrings.Schedule_Week]: 'Semaine',
    [BrightChartStrings.Schedule_Month]: 'Mois',
    [BrightChartStrings.Schedule_Available]: 'Disponible',

    // ── Clinical Note Editor ───────────────────────────────────────────────
    [BrightChartStrings.NoteEditor_EmptyState]:
      'Aucune composition ou modèle fourni. Sélectionnez un modèle pour commencer une nouvelle note.',

    // ── Insurance ──────────────────────────────────────────────────────────
    [BrightChartStrings.Insurance_PlanType]: 'Type de plan',
    [BrightChartStrings.Insurance_GroupNumber]: 'Numéro de groupe',
    [BrightChartStrings.Insurance_MemberID]: "Numéro d'adhérent",
    [BrightChartStrings.Insurance_SubscriberName]: 'Nom du souscripteur',
    [BrightChartStrings.Insurance_Relationship]: 'Relation',
    [BrightChartStrings.Insurance_PayerName]: 'Nom du payeur',
    [BrightChartStrings.Insurance_Eligibility]: "Éligibilité d'assurance",

    // ── Clinical Timeline ──────────────────────────────────────────────────
    [BrightChartStrings.ClinicalTimeline_AriaLabel]: 'Chronologie clinique',
    [BrightChartStrings.ClinicalTimeline_FilterAriaLabel]:
      'Filtres par type de ressource',
    [BrightChartStrings.ClinicalTimeline_Empty]:
      'Aucune donnée clinique disponible.',
    [BrightChartStrings.ClinicalTimeline_Unknown]: 'Inconnu',
    [BrightChartStrings.ClinicalTimeline_NoDate]: 'Pas de date',

    // ── Note Template Selector ─────────────────────────────────────────────
    [BrightChartStrings.NoteTemplateSelector_AriaLabel]:
      'Sélecteur de modèle de note',
    [BrightChartStrings.NoteTemplateSelector_Empty]: 'Aucun modèle disponible',
    [BrightChartStrings.NoteTemplateSelector_GroupAriaTemplate]:
      'Type de document {CODE}',
    [BrightChartStrings.NoteTemplateSelector_SelectTemplate]:
      'Sélectionner le modèle : {NAME}',

    // ── Encounter Workflow Board ───────────────────────────────────────────
    [BrightChartStrings.WorkflowBoard_AriaLabel]:
      'Tableau de flux de travail des consultations',
    [BrightChartStrings.WorkflowBoard_UnknownPatient]: 'Patient inconnu',
    [BrightChartStrings.WorkflowBoard_NoEncounters]: 'Aucune consultation',
    [BrightChartStrings.WorkflowBoard_ColumnAriaTemplate]: 'Colonne {NAME}',

    // ── Schedule Editor ────────────────────────────────────────────────────
    [BrightChartStrings.ScheduleEditor_Title]: 'Éditeur de planning',
    [BrightChartStrings.ScheduleEditor_AriaLabel]:
      'Éditeur de disponibilité du planning',
    [BrightChartStrings.ScheduleEditor_AddBlockLegend]:
      'Ajouter un bloc de disponibilité',
    [BrightChartStrings.ScheduleEditor_DayLabel]: 'Jour',
    [BrightChartStrings.ScheduleEditor_StartTime]: 'Heure de début',
    [BrightChartStrings.ScheduleEditor_EndTime]: 'Heure de fin',
    [BrightChartStrings.ScheduleEditor_RecurringWeekly]:
      'Récurrence hebdomadaire',
    [BrightChartStrings.ScheduleEditor_AddBlock]: 'Ajouter un bloc',
    [BrightChartStrings.ScheduleEditor_StartBeforeEnd]:
      "L'heure de début doit précéder l'heure de fin",
    [BrightChartStrings.ScheduleEditor_NoAvailability]: 'Aucune disponibilité',
    [BrightChartStrings.ScheduleEditor_Recurring]: 'Récurrent',
    [BrightChartStrings.ScheduleEditor_GridAriaLabel]:
      'Grille de disponibilité hebdomadaire',
    [BrightChartStrings.ScheduleEditor_SaveSchedule]: 'Enregistrer le planning',
    [BrightChartStrings.ScheduleEditor_Day_Monday]: 'Lundi',
    [BrightChartStrings.ScheduleEditor_Day_Tuesday]: 'Mardi',
    [BrightChartStrings.ScheduleEditor_Day_Wednesday]: 'Mercredi',
    [BrightChartStrings.ScheduleEditor_Day_Thursday]: 'Jeudi',
    [BrightChartStrings.ScheduleEditor_Day_Friday]: 'Vendredi',
    [BrightChartStrings.ScheduleEditor_Day_Saturday]: 'Samedi',
    [BrightChartStrings.ScheduleEditor_Day_Sunday]: 'Dimanche',

    // ── Connectivity Indicator ─────────────────────────────────────────────
    [BrightChartStrings.Connectivity_Online]: 'En ligne',
    [BrightChartStrings.Connectivity_Offline]: 'Hors ligne',
    [BrightChartStrings.Connectivity_StatusTemplate]:
      'État de la connexion : {STATUS}',

    // ── Notification Bell ──────────────────────────────────────────────────
    [BrightChartStrings.NotificationBell_AriaLabel]: 'Notifications',
    [BrightChartStrings.NotificationBell_UnreadTemplate]:
      'Notifications, {COUNT} non lues',

    // ── Role Switcher ──────────────────────────────────────────────────────
    [BrightChartStrings.RoleSwitcher_AriaLabel]: 'Changer de rôle de santé',
    [BrightChartStrings.RoleSwitcher_MenuAriaLabel]:
      'Sélection du rôle de santé',

    // ── Patient Header ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientHeader_AriaLabel]: 'Informations du patient',
    [BrightChartStrings.PatientHeader_Unknown]: 'Inconnu',
    [BrightChartStrings.PatientHeader_MRN]: 'NRM :',
    [BrightChartStrings.PatientHeader_NA]: 'N/D',
    [BrightChartStrings.PatientHeader_AllergyTemplate]: 'Allergie : {NAME}',

    // ── Navigation Labels ──────────────────────────────────────────────────
    [BrightChartStrings.Nav_Patients]: 'Patients',
    [BrightChartStrings.Nav_Clients]: 'Clients',
    [BrightChartStrings.Nav_Encounters]: 'Consultations',
    [BrightChartStrings.Nav_Schedule]: 'Agenda',
    [BrightChartStrings.Nav_Inbox]: 'Boîte de réception',
    [BrightChartStrings.Nav_OperatoryView]: 'Vue du cabinet',
    [BrightChartStrings.Nav_TreatmentPlans]: 'Plans de traitement',
    [BrightChartStrings.Nav_SpeciesFilter]: 'Filtre par espèce',
    [BrightChartStrings.Nav_FarmCalls]: 'Visites à la ferme',
    [BrightChartStrings.Nav_MyHealth]: 'Ma santé',
    [BrightChartStrings.Nav_Appointments]: 'Rendez-vous',
    [BrightChartStrings.Nav_TestResults]: "Résultats d'examens",
    [BrightChartStrings.Nav_BillsPayments]: 'Factures et paiements',
    [BrightChartStrings.Nav_CheckIn]: 'Enregistrement',
    [BrightChartStrings.Nav_Waitlist]: "Liste d'attente",
    [BrightChartStrings.Nav_Registration]: 'Inscription',
    [BrightChartStrings.Nav_Insurance]: 'Assurance',
    [BrightChartStrings.Nav_Superbills]: 'Superfactures',
    [BrightChartStrings.Nav_Claims]: 'Réclamations',
    [BrightChartStrings.Nav_ClaimTracking]: 'Suivi des réclamations',
    [BrightChartStrings.Nav_Payments]: 'Paiements',
    [BrightChartStrings.Nav_PatientLedger]: 'Grand livre du patient',
    [BrightChartStrings.Nav_FeeSchedules]: 'Grilles tarifaires',
    [BrightChartStrings.Nav_Users]: 'Utilisateurs',
    [BrightChartStrings.Nav_Roles]: 'Rôles',
    [BrightChartStrings.Nav_AuditLog]: "Journal d'audit",
    [BrightChartStrings.Nav_SpecialtyConfig]: 'Configuration de spécialité',
    [BrightChartStrings.Nav_Settings]: 'Paramètres',
    [BrightChartStrings.Nav_Organizations]: 'Organisations',
    [BrightChartStrings.Nav_Clinician]: 'Clinicien',
    [BrightChartStrings.Nav_PatientPortal]: 'Portail patient',
    [BrightChartStrings.Nav_Billing]: 'Facturation',

    // ── Sidebar ────────────────────────────────────────────────────────────
    [BrightChartStrings.Sidebar_ExpandAriaLabel]:
      'Développer la barre latérale',
    [BrightChartStrings.Sidebar_CollapseAriaLabel]: 'Réduire la barre latérale',
    [BrightChartStrings.Sidebar_NavAriaLabel]: 'Navigation BrightChart',

    [BrightChartStrings.BottomNav_AriaLabel]: 'Navigation mobile BrightChart',
    [BrightChartStrings.Layout_NavAriaTemplate]: 'Navigation {NAME}',
  };
