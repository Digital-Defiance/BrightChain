import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChartStringKey,
  BrightChartStrings,
} from '../../enumerations/BrightChartStrings';

export const BrightChartSpanishStrings: ComponentStrings<BrightChartStringKey> =
  {
    // ── Menu / Navigation ──────────────────────────────────────────────
    [BrightChartStrings.MenuLabel]: 'BrightChart',
    [BrightChartStrings.ChartSectionsLabel]: 'Secciones del expediente',
    [BrightChartStrings.Nav_Conversations]: 'Conversaciones',
    [BrightChartStrings.Nav_Groups]: 'Grupos',
    [BrightChartStrings.Nav_Channels]: 'Canales',

    // ── Shell / Notifications ──────────────────────────────────────────
    [BrightChartStrings.Notification_Type_Result]: 'Resultado',
    [BrightChartStrings.Notification_Type_Note]: 'Nota',
    [BrightChartStrings.Notification_Type_Appointment]: 'Cita',
    [BrightChartStrings.Notification_Type_Claim]: 'Reclamación',
    [BrightChartStrings.Notification_Type_Message]: 'Mensaje',
    [BrightChartStrings.Notification_Type_System]: 'Sistema',
    [BrightChartStrings.Notification_Priority_Normal]: 'Normal',
    [BrightChartStrings.Notification_Priority_Urgent]: 'Urgente',

    // ── Roles ──────────────────────────────────────────────────────────
    [BrightChartStrings.Role_Physician]: 'Médico',
    [BrightChartStrings.Role_RegisteredNurse]: 'Enfermero(a) registrado(a)',
    [BrightChartStrings.Role_MedicalAssistant]: 'Asistente médico',
    [BrightChartStrings.Role_Patient]: 'Paciente',
    [BrightChartStrings.Role_ClinicalAdministrator]: 'Administrador clínico',
    [BrightChartStrings.Role_Dentist]: 'Dentista',
    [BrightChartStrings.Role_Veterinarian]: 'Veterinario',

    // ── Organization ───────────────────────────────────────────────────
    [BrightChartStrings.Org_EnrollmentMode_Open]: 'Abierto',
    [BrightChartStrings.Org_EnrollmentMode_InviteOnly]: 'Solo por invitación',

    // ── Audit ──────────────────────────────────────────────────────────
    [BrightChartStrings.Audit_Operation_Create]: 'Crear',
    [BrightChartStrings.Audit_Operation_Read]: 'Leer',
    [BrightChartStrings.Audit_Operation_Update]: 'Actualizar',
    [BrightChartStrings.Audit_Operation_Delete]: 'Eliminar',
    [BrightChartStrings.Audit_Operation_Search]: 'Buscar',
    [BrightChartStrings.Audit_Operation_Merge]: 'Fusionar',

    // ── FHIR / Patient Identity ──────────────────────────────────────────
    [BrightChartStrings.Gender_Male]: 'Masculino',
    [BrightChartStrings.Gender_Female]: 'Femenino',
    [BrightChartStrings.Gender_Other]: 'Otro',
    [BrightChartStrings.Gender_Unknown]: 'Desconocido',

    [BrightChartStrings.NameUse_Usual]: 'Habitual',
    [BrightChartStrings.NameUse_Official]: 'Oficial',
    [BrightChartStrings.NameUse_Temp]: 'Temporal',
    [BrightChartStrings.NameUse_Nickname]: 'Apodo',
    [BrightChartStrings.NameUse_Anonymous]: 'Anónimo',
    [BrightChartStrings.NameUse_Old]: 'Anterior',
    [BrightChartStrings.NameUse_Maiden]: 'De soltera',

    [BrightChartStrings.AddressUse_Home]: 'Domicilio',
    [BrightChartStrings.AddressUse_Work]: 'Trabajo',
    [BrightChartStrings.AddressUse_Temp]: 'Temporal',
    [BrightChartStrings.AddressUse_Old]: 'Anterior',
    [BrightChartStrings.AddressUse_Billing]: 'Facturación',

    [BrightChartStrings.AddressType_Postal]: 'Postal',
    [BrightChartStrings.AddressType_Physical]: 'Físico',
    [BrightChartStrings.AddressType_Both]: 'Ambos',

    [BrightChartStrings.ContactSystem_Phone]: 'Teléfono',
    [BrightChartStrings.ContactSystem_Fax]: 'Fax',
    [BrightChartStrings.ContactSystem_Email]: 'Correo electrónico',
    [BrightChartStrings.ContactSystem_Pager]: 'Buscapersonas',
    [BrightChartStrings.ContactSystem_Url]: 'URL',
    [BrightChartStrings.ContactSystem_Sms]: 'SMS',
    [BrightChartStrings.ContactSystem_Other]: 'Otro',

    [BrightChartStrings.ContactUse_Home]: 'Domicilio',
    [BrightChartStrings.ContactUse_Work]: 'Trabajo',
    [BrightChartStrings.ContactUse_Temp]: 'Temporal',
    [BrightChartStrings.ContactUse_Old]: 'Anterior',
    [BrightChartStrings.ContactUse_Mobile]: 'Móvil',

    [BrightChartStrings.LinkType_ReplacedBy]: 'Reemplazado por',
    [BrightChartStrings.LinkType_Replaces]: 'Reemplaza',
    [BrightChartStrings.LinkType_Refer]: 'Referencia',
    [BrightChartStrings.LinkType_SeeAlso]: 'Ver también',

    [BrightChartStrings.IdentifierUse_Usual]: 'Habitual',
    [BrightChartStrings.IdentifierUse_Official]: 'Oficial',
    [BrightChartStrings.IdentifierUse_Temp]: 'Temporal',
    [BrightChartStrings.IdentifierUse_Secondary]: 'Secundario',
    [BrightChartStrings.IdentifierUse_Old]: 'Anterior',

    // ── Clinical ─────────────────────────────────────────────────────────
    [BrightChartStrings.ObservationStatus_Registered]: 'Registrado',
    [BrightChartStrings.ObservationStatus_Preliminary]: 'Preliminar',
    [BrightChartStrings.ObservationStatus_Final]: 'Final',
    [BrightChartStrings.ObservationStatus_Amended]: 'Modificado',
    [BrightChartStrings.ObservationStatus_Corrected]: 'Corregido',
    [BrightChartStrings.ObservationStatus_Cancelled]: 'Cancelado',
    [BrightChartStrings.ObservationStatus_EnteredInError]:
      'Ingresado por error',
    [BrightChartStrings.ObservationStatus_Unknown]: 'Desconocido',

    [BrightChartStrings.ConditionClinical_Active]: 'Activo',
    [BrightChartStrings.ConditionClinical_Recurrence]: 'Recurrencia',
    [BrightChartStrings.ConditionClinical_Relapse]: 'Recaída',
    [BrightChartStrings.ConditionClinical_Inactive]: 'Inactivo',
    [BrightChartStrings.ConditionClinical_Remission]: 'Remisión',
    [BrightChartStrings.ConditionClinical_Resolved]: 'Resuelto',

    [BrightChartStrings.ConditionVerification_Unconfirmed]: 'No confirmado',
    [BrightChartStrings.ConditionVerification_Provisional]: 'Provisional',
    [BrightChartStrings.ConditionVerification_Differential]: 'Diferencial',
    [BrightChartStrings.ConditionVerification_Confirmed]: 'Confirmado',
    [BrightChartStrings.ConditionVerification_Refuted]: 'Refutado',
    [BrightChartStrings.ConditionVerification_EnteredInError]:
      'Ingresado por error',

    [BrightChartStrings.AllergyType_Allergy]: 'Alergia',
    [BrightChartStrings.AllergyType_Intolerance]: 'Intolerancia',

    [BrightChartStrings.AllergyCategory_Food]: 'Alimento',
    [BrightChartStrings.AllergyCategory_Medication]: 'Medicamento',
    [BrightChartStrings.AllergyCategory_Environment]: 'Ambiente',
    [BrightChartStrings.AllergyCategory_Biologic]: 'Biológico',

    [BrightChartStrings.AllergyCriticality_Low]: 'Bajo',
    [BrightChartStrings.AllergyCriticality_High]: 'Alto',
    [BrightChartStrings.AllergyCriticality_UnableToAssess]: 'No evaluable',

    [BrightChartStrings.AllergySeverity_Mild]: 'Leve',
    [BrightChartStrings.AllergySeverity_Moderate]: 'Moderado',
    [BrightChartStrings.AllergySeverity_Severe]: 'Grave',

    [BrightChartStrings.MedicationStatus_Active]: 'Activo',
    [BrightChartStrings.MedicationStatus_Inactive]: 'Inactivo',
    [BrightChartStrings.MedicationStatus_EnteredInError]: 'Ingresado por error',

    [BrightChartStrings.MedStatementStatus_Active]: 'Activo',
    [BrightChartStrings.MedStatementStatus_Completed]: 'Completado',
    [BrightChartStrings.MedStatementStatus_EnteredInError]:
      'Ingresado por error',
    [BrightChartStrings.MedStatementStatus_Intended]: 'Previsto',
    [BrightChartStrings.MedStatementStatus_Stopped]: 'Detenido',
    [BrightChartStrings.MedStatementStatus_OnHold]: 'En espera',
    [BrightChartStrings.MedStatementStatus_Unknown]: 'Desconocido',
    [BrightChartStrings.MedStatementStatus_NotTaken]: 'No tomado',

    [BrightChartStrings.ProcedureStatus_Preparation]: 'Preparación',
    [BrightChartStrings.ProcedureStatus_InProgress]: 'En progreso',
    [BrightChartStrings.ProcedureStatus_NotDone]: 'No realizado',
    [BrightChartStrings.ProcedureStatus_OnHold]: 'En espera',
    [BrightChartStrings.ProcedureStatus_Stopped]: 'Detenido',
    [BrightChartStrings.ProcedureStatus_Completed]: 'Completado',
    [BrightChartStrings.ProcedureStatus_EnteredInError]: 'Ingresado por error',
    [BrightChartStrings.ProcedureStatus_Unknown]: 'Desconocido',

    // ── Encounter ────────────────────────────────────────────────────────
    [BrightChartStrings.EncounterStatus_Planned]: 'Planificado',
    [BrightChartStrings.EncounterStatus_Arrived]: 'Llegado',
    [BrightChartStrings.EncounterStatus_Triaged]: 'Triado',
    [BrightChartStrings.EncounterStatus_InProgress]: 'En progreso',
    [BrightChartStrings.EncounterStatus_OnLeave]: 'Con permiso',
    [BrightChartStrings.EncounterStatus_Finished]: 'Finalizado',
    [BrightChartStrings.EncounterStatus_Cancelled]: 'Cancelado',
    [BrightChartStrings.EncounterStatus_EnteredInError]: 'Ingresado por error',
    [BrightChartStrings.EncounterStatus_Unknown]: 'Desconocido',

    [BrightChartStrings.EncounterLocationStatus_Planned]: 'Planificado',
    [BrightChartStrings.EncounterLocationStatus_Active]: 'Activo',
    [BrightChartStrings.EncounterLocationStatus_Reserved]: 'Reservado',
    [BrightChartStrings.EncounterLocationStatus_Completed]: 'Completado',

    [BrightChartStrings.EncounterClass_Inpatient]: 'Hospitalización',
    [BrightChartStrings.EncounterClass_Ambulatory]: 'Ambulatorio',
    [BrightChartStrings.EncounterClass_Emergency]: 'Emergencia',
    [BrightChartStrings.EncounterClass_HomeHealth]: 'Atención domiciliaria',
    [BrightChartStrings.EncounterClass_Virtual]: 'Virtual',
    [BrightChartStrings.EncounterClass_Field]: 'Campo',
    [BrightChartStrings.EncounterClass_ShortStay]: 'Estancia corta',
    [BrightChartStrings.EncounterClass_Observation]: 'Observación',
    [BrightChartStrings.EncounterClass_PreAdmission]: 'Pre-admisión',

    [BrightChartStrings.DiagnosisRole_Admission]: 'Diagnóstico de admisión',
    [BrightChartStrings.DiagnosisRole_Discharge]: 'Diagnóstico de alta',
    [BrightChartStrings.DiagnosisRole_ChiefComplaint]: 'Motivo de consulta',
    [BrightChartStrings.DiagnosisRole_Comorbidity]: 'Comorbilidad',
    [BrightChartStrings.DiagnosisRole_PreOp]: 'Diagnóstico preoperatorio',
    [BrightChartStrings.DiagnosisRole_PostOp]: 'Diagnóstico postoperatorio',
    [BrightChartStrings.DiagnosisRole_Billing]: 'Diagnóstico de facturación',

    // ── Documentation ────────────────────────────────────────────────────
    [BrightChartStrings.CompositionStatus_Preliminary]: 'Preliminar',
    [BrightChartStrings.CompositionStatus_Final]: 'Final',
    [BrightChartStrings.CompositionStatus_Amended]: 'Modificado',
    [BrightChartStrings.CompositionStatus_EnteredInError]:
      'Ingresado por error',

    [BrightChartStrings.DocRefStatus_Current]: 'Actual',
    [BrightChartStrings.DocRefStatus_Superseded]: 'Reemplazado',
    [BrightChartStrings.DocRefStatus_EnteredInError]: 'Ingresado por error',

    [BrightChartStrings.AttestationMode_Personal]: 'Personal',
    [BrightChartStrings.AttestationMode_Professional]: 'Profesional',
    [BrightChartStrings.AttestationMode_Legal]: 'Legal',
    [BrightChartStrings.AttestationMode_Official]: 'Oficial',

    [BrightChartStrings.DocRelationship_Replaces]: 'Reemplaza',
    [BrightChartStrings.DocRelationship_Transforms]: 'Transforma',
    [BrightChartStrings.DocRelationship_Signs]: 'Firma',
    [BrightChartStrings.DocRelationship_Appends]: 'Agrega',

    // ── Note Templates ───────────────────────────────────────────────────
    [BrightChartStrings.Template_SOAPNote_Name]: 'Nota SOAP',
    [BrightChartStrings.Template_SOAPNote_Description]:
      'Formato estándar Subjetivo, Objetivo, Evaluación, Plan utilizado en consulta externa y hospitalaria.',
    [BrightChartStrings.Template_SOAPNote_Subjective]: 'Subjetivo',
    [BrightChartStrings.Template_SOAPNote_Objective]: 'Objetivo',
    [BrightChartStrings.Template_SOAPNote_Assessment]: 'Evaluación',
    [BrightChartStrings.Template_SOAPNote_Plan]: 'Plan',

    [BrightChartStrings.Template_HP_Name]: 'Historia clínica y examen físico',
    [BrightChartStrings.Template_HP_Description]:
      'Formato de evaluación inicial completo para admisiones hospitalarias y nuevas consultas.',
    [BrightChartStrings.Template_HP_ChiefComplaint]: 'Motivo de consulta',
    [BrightChartStrings.Template_HP_HPI]: 'Historia de la enfermedad actual',
    [BrightChartStrings.Template_HP_PastMedicalHistory]: 'Antecedentes médicos',
    [BrightChartStrings.Template_HP_ReviewOfSystems]: 'Revisión por sistemas',
    [BrightChartStrings.Template_HP_PhysicalExam]: 'Examen físico',
    [BrightChartStrings.Template_HP_Assessment]: 'Evaluación',
    [BrightChartStrings.Template_HP_Plan]: 'Plan',

    [BrightChartStrings.Template_Discharge_Name]: 'Resumen de alta',
    [BrightChartStrings.Template_Discharge_Description]:
      'Formato estándar para documentar la estancia hospitalaria, los diagnósticos, la evolución y el plan de alta.',
    [BrightChartStrings.Template_Discharge_AdmissionDiagnosis]:
      'Diagnóstico de admisión',
    [BrightChartStrings.Template_Discharge_HospitalCourse]:
      'Curso hospitalario',
    [BrightChartStrings.Template_Discharge_DischargeDiagnosis]:
      'Diagnóstico de alta',
    [BrightChartStrings.Template_Discharge_DischargeMedications]:
      'Medicamentos de alta',
    [BrightChartStrings.Template_Discharge_FollowUp]:
      'Instrucciones de seguimiento',

    [BrightChartStrings.Template_Procedure_Name]: 'Nota de procedimiento',
    [BrightChartStrings.Template_Procedure_Description]:
      'Formato estándar para documentar procedimientos clínicos o quirúrgicos.',
    [BrightChartStrings.Template_Procedure_Indication]: 'Indicación',
    [BrightChartStrings.Template_Procedure_ProcedureDescription]:
      'Descripción del procedimiento',
    [BrightChartStrings.Template_Procedure_Findings]: 'Hallazgos',
    [BrightChartStrings.Template_Procedure_Complications]: 'Complicaciones',
    [BrightChartStrings.Template_Procedure_PostProcedurePlan]:
      'Plan post-procedimiento',

    // ── LOINC Document Types ─────────────────────────────────────────────
    [BrightChartStrings.DocType_ConsultationNote]: 'Nota de consulta',
    [BrightChartStrings.DocType_DischargeSummary]: 'Resumen de alta',
    [BrightChartStrings.DocType_HistoryAndPhysical]:
      'Historia clínica y examen físico',
    [BrightChartStrings.DocType_ProgressNote]: 'Nota de evolución',
    [BrightChartStrings.DocType_ProcedureNote]: 'Nota de procedimiento',
    [BrightChartStrings.DocType_OperativeNote]: 'Nota operatoria',
    [BrightChartStrings.DocType_NurseNote]: 'Nota de enfermería',
    [BrightChartStrings.DocType_ReferralNote]: 'Nota de referencia',
    [BrightChartStrings.DocType_TransferSummary]: 'Resumen de transferencia',

    // ── Orders & Results ─────────────────────────────────────────────────
    [BrightChartStrings.ServiceRequestStatus_Draft]: 'Borrador',
    [BrightChartStrings.ServiceRequestStatus_Active]: 'Activo',
    [BrightChartStrings.ServiceRequestStatus_OnHold]: 'En espera',
    [BrightChartStrings.ServiceRequestStatus_Revoked]: 'Revocado',
    [BrightChartStrings.ServiceRequestStatus_Completed]: 'Completado',
    [BrightChartStrings.ServiceRequestStatus_EnteredInError]:
      'Ingresado por error',
    [BrightChartStrings.ServiceRequestStatus_Unknown]: 'Desconocido',

    [BrightChartStrings.ServiceRequestIntent_Proposal]: 'Propuesta',
    [BrightChartStrings.ServiceRequestIntent_Plan]: 'Plan',
    [BrightChartStrings.ServiceRequestIntent_Directive]: 'Directiva',
    [BrightChartStrings.ServiceRequestIntent_Order]: 'Orden',
    [BrightChartStrings.ServiceRequestIntent_OriginalOrder]: 'Orden original',
    [BrightChartStrings.ServiceRequestIntent_ReflexOrder]: 'Orden refleja',
    [BrightChartStrings.ServiceRequestIntent_FillerOrder]: 'Orden de relleno',
    [BrightChartStrings.ServiceRequestIntent_InstanceOrder]:
      'Orden de instancia',
    [BrightChartStrings.ServiceRequestIntent_Option]: 'Opción',

    [BrightChartStrings.MedRequestStatus_Active]: 'Activo',
    [BrightChartStrings.MedRequestStatus_OnHold]: 'En espera',
    [BrightChartStrings.MedRequestStatus_Cancelled]: 'Cancelado',
    [BrightChartStrings.MedRequestStatus_Completed]: 'Completado',
    [BrightChartStrings.MedRequestStatus_EnteredInError]: 'Ingresado por error',
    [BrightChartStrings.MedRequestStatus_Stopped]: 'Detenido',
    [BrightChartStrings.MedRequestStatus_Draft]: 'Borrador',
    [BrightChartStrings.MedRequestStatus_Unknown]: 'Desconocido',

    [BrightChartStrings.MedRequestIntent_Proposal]: 'Propuesta',
    [BrightChartStrings.MedRequestIntent_Plan]: 'Plan',
    [BrightChartStrings.MedRequestIntent_Order]: 'Orden',
    [BrightChartStrings.MedRequestIntent_OriginalOrder]: 'Orden original',
    [BrightChartStrings.MedRequestIntent_ReflexOrder]: 'Orden refleja',
    [BrightChartStrings.MedRequestIntent_FillerOrder]: 'Orden de relleno',
    [BrightChartStrings.MedRequestIntent_InstanceOrder]: 'Orden de instancia',
    [BrightChartStrings.MedRequestIntent_Option]: 'Opción',

    [BrightChartStrings.DiagnosticReportStatus_Registered]: 'Registrado',
    [BrightChartStrings.DiagnosticReportStatus_Partial]: 'Parcial',
    [BrightChartStrings.DiagnosticReportStatus_Preliminary]: 'Preliminar',
    [BrightChartStrings.DiagnosticReportStatus_Final]: 'Final',
    [BrightChartStrings.DiagnosticReportStatus_Amended]: 'Modificado',
    [BrightChartStrings.DiagnosticReportStatus_Corrected]: 'Corregido',
    [BrightChartStrings.DiagnosticReportStatus_Appended]: 'Agregado',
    [BrightChartStrings.DiagnosticReportStatus_Cancelled]: 'Cancelado',
    [BrightChartStrings.DiagnosticReportStatus_EnteredInError]:
      'Ingresado por error',
    [BrightChartStrings.DiagnosticReportStatus_Unknown]: 'Desconocido',

    [BrightChartStrings.RequestPriority_Routine]: 'Rutina',
    [BrightChartStrings.RequestPriority_Urgent]: 'Urgente',
    [BrightChartStrings.RequestPriority_Asap]: 'Lo antes posible',
    [BrightChartStrings.RequestPriority_Stat]: 'Inmediato',

    // ── Billing ──────────────────────────────────────────────────────────
    [BrightChartStrings.CoverageStatus_Active]: 'Activo',
    [BrightChartStrings.CoverageStatus_Cancelled]: 'Cancelado',
    [BrightChartStrings.CoverageStatus_Draft]: 'Borrador',
    [BrightChartStrings.CoverageStatus_EnteredInError]: 'Ingresado por error',

    [BrightChartStrings.ClaimStatus_Active]: 'Activo',
    [BrightChartStrings.ClaimStatus_Cancelled]: 'Cancelado',
    [BrightChartStrings.ClaimStatus_Draft]: 'Borrador',
    [BrightChartStrings.ClaimStatus_EnteredInError]: 'Ingresado por error',

    [BrightChartStrings.ClaimUse_Claim]: 'Reclamación',
    [BrightChartStrings.ClaimUse_Preauthorization]: 'Preautorización',
    [BrightChartStrings.ClaimUse_Predetermination]: 'Predeterminación',

    [BrightChartStrings.EOBStatus_Active]: 'Activo',
    [BrightChartStrings.EOBStatus_Cancelled]: 'Cancelado',
    [BrightChartStrings.EOBStatus_Draft]: 'Borrador',
    [BrightChartStrings.EOBStatus_EnteredInError]: 'Ingresado por error',

    [BrightChartStrings.RemittanceOutcome_Queued]: 'En cola',
    [BrightChartStrings.RemittanceOutcome_Complete]: 'Completado',
    [BrightChartStrings.RemittanceOutcome_Error]: 'Error',
    [BrightChartStrings.RemittanceOutcome_Partial]: 'Parcial',

    [BrightChartStrings.EligibilityPurpose_AuthRequirements]:
      'Requisitos de autorización',
    [BrightChartStrings.EligibilityPurpose_Benefits]: 'Beneficios',
    [BrightChartStrings.EligibilityPurpose_Discovery]: 'Descubrimiento',
    [BrightChartStrings.EligibilityPurpose_Validation]: 'Validación',

    [BrightChartStrings.SuperbillStatus_Draft]: 'Borrador',
    [BrightChartStrings.SuperbillStatus_Finalized]: 'Finalizado',
    [BrightChartStrings.SuperbillStatus_Billed]: 'Facturado',

    [BrightChartStrings.LedgerEntryType_Charge]: 'Cargo',
    [BrightChartStrings.LedgerEntryType_Payment]: 'Pago',
    [BrightChartStrings.LedgerEntryType_Adjustment]: 'Ajuste',
    [BrightChartStrings.LedgerEntryType_Refund]: 'Reembolso',
    [BrightChartStrings.LedgerEntryType_WriteOff]: 'Cancelación de deuda',

    [BrightChartStrings.ClaimType_Institutional]: 'Institucional',
    [BrightChartStrings.ClaimType_Oral]: 'Dental',
    [BrightChartStrings.ClaimType_Pharmacy]: 'Farmacia',
    [BrightChartStrings.ClaimType_Professional]: 'Profesional',
    [BrightChartStrings.ClaimType_Vision]: 'Visión',

    // ── Scheduling ───────────────────────────────────────────────────────
    [BrightChartStrings.AppointmentStatus_Proposed]: 'Propuesto',
    [BrightChartStrings.AppointmentStatus_Pending]: 'Pendiente',
    [BrightChartStrings.AppointmentStatus_Booked]: 'Reservado',
    [BrightChartStrings.AppointmentStatus_Arrived]: 'Llegado',
    [BrightChartStrings.AppointmentStatus_Fulfilled]: 'Cumplido',
    [BrightChartStrings.AppointmentStatus_Cancelled]: 'Cancelado',
    [BrightChartStrings.AppointmentStatus_Noshow]: 'No presentado',
    [BrightChartStrings.AppointmentStatus_EnteredInError]:
      'Ingresado por error',
    [BrightChartStrings.AppointmentStatus_CheckedIn]: 'Registrado',
    [BrightChartStrings.AppointmentStatus_Waitlist]: 'Lista de espera',

    [BrightChartStrings.SlotStatus_Busy]: 'Ocupado',
    [BrightChartStrings.SlotStatus_Free]: 'Libre',
    [BrightChartStrings.SlotStatus_BusyUnavailable]: 'Ocupado (no disponible)',
    [BrightChartStrings.SlotStatus_BusyTentative]: 'Ocupado (provisional)',
    [BrightChartStrings.SlotStatus_EnteredInError]: 'Ingresado por error',

    [BrightChartStrings.ParticipantRequired_Required]: 'Requerido',
    [BrightChartStrings.ParticipantRequired_Optional]: 'Opcional',
    [BrightChartStrings.ParticipantRequired_InformationOnly]:
      'Solo información',

    [BrightChartStrings.ParticipationStatus_Accepted]: 'Aceptado',
    [BrightChartStrings.ParticipationStatus_Declined]: 'Rechazado',
    [BrightChartStrings.ParticipationStatus_Tentative]: 'Provisional',
    [BrightChartStrings.ParticipationStatus_NeedsAction]: 'Acción requerida',

    [BrightChartStrings.WaitlistStatus_Waiting]: 'Esperando',
    [BrightChartStrings.WaitlistStatus_Offered]: 'Ofrecido',
    [BrightChartStrings.WaitlistStatus_Booked]: 'Reservado',
    [BrightChartStrings.WaitlistStatus_Cancelled]: 'Cancelado',
    [BrightChartStrings.WaitlistStatus_Expired]: 'Expirado',

    [BrightChartStrings.ReminderType_Sms]: 'SMS',
    [BrightChartStrings.ReminderType_Email]: 'Correo electrónico',
    [BrightChartStrings.ReminderType_Push]: 'Notificación push',
    [BrightChartStrings.ReminderType_Phone]: 'Llamada telefónica',

    [BrightChartStrings.ReminderStatus_Scheduled]: 'Programado',
    [BrightChartStrings.ReminderStatus_Sent]: 'Enviado',
    [BrightChartStrings.ReminderStatus_Failed]: 'Fallido',
    [BrightChartStrings.ReminderStatus_Cancelled]: 'Cancelado',

    // ── Offline / Sync ───────────────────────────────────────────────────
    [BrightChartStrings.Sync_Conflict]: 'Conflicto de sincronización',
    [BrightChartStrings.Sync_Success]: 'Sincronización exitosa',

    // ── FHIR OperationOutcome Severity ───────────────────────────────────
    [BrightChartStrings.IssueSeverity_Fatal]: 'Fatal',
    [BrightChartStrings.IssueSeverity_Error]: 'Error',
    [BrightChartStrings.IssueSeverity_Warning]: 'Advertencia',
    [BrightChartStrings.IssueSeverity_Information]: 'Información',

    // ── Narrative Status ─────────────────────────────────────────────────
    [BrightChartStrings.NarrativeStatus_Generated]: 'Generado',
    [BrightChartStrings.NarrativeStatus_Extensions]: 'Extensiones',
    [BrightChartStrings.NarrativeStatus_Additional]: 'Adicional',
    [BrightChartStrings.NarrativeStatus_Empty]: 'Vacío',

    // ── Shell / UI ─────────────────────────────────────────────────────────
    [BrightChartStrings.Shell_Notifications]: 'Notificaciones',
    [BrightChartStrings.Shell_MarkAllRead]: 'Marcar todo como leído',
    [BrightChartStrings.Shell_NoNotifications]: 'Sin notificaciones',
    [BrightChartStrings.Shell_AccessDenied]: 'Acceso denegado',
    [BrightChartStrings.Shell_AccessDeniedMessage]:
      'No tiene permiso para acceder a esta área.',
    [BrightChartStrings.Shell_Loading]: 'Cargando...',

    // ── Patient Chart Tabs ─────────────────────────────────────────────────
    [BrightChartStrings.PatientChart_Title]: 'Expediente del paciente',
    [BrightChartStrings.PatientChart_Summary]: 'Resumen',
    [BrightChartStrings.PatientChart_Problems]: 'Problemas',
    [BrightChartStrings.PatientChart_Medications]: 'Medicamentos',
    [BrightChartStrings.PatientChart_Allergies]: 'Alergias',
    [BrightChartStrings.PatientChart_Encounters]: 'Encuentros',
    [BrightChartStrings.PatientChart_Documents]: 'Documentos',
    [BrightChartStrings.PatientChart_Orders]: 'Órdenes',
    [BrightChartStrings.PatientChart_Results]: 'Resultados',
    [BrightChartStrings.PatientChart_Appointments]: 'Citas',
    [BrightChartStrings.PatientChart_Insurance]: 'Seguro',
    [BrightChartStrings.PatientChart_Billing]: 'Facturación',
    [BrightChartStrings.PatientChart_NoPatientSelected]:
      'Ningún paciente seleccionado.',

    // ── Encounter Dashboard ────────────────────────────────────────────────
    [BrightChartStrings.EncounterDashboard_Title]: 'Encuentros de hoy',
    [BrightChartStrings.EncounterDashboard_Scheduled]: 'Programado',
    [BrightChartStrings.EncounterDashboard_InProgress]: 'En progreso',
    [BrightChartStrings.EncounterDashboard_PendingTasks]: 'Tareas pendientes',

    // ── Clinician Inbox ────────────────────────────────────────────────────
    [BrightChartStrings.ClinicianInbox_Title]: 'Bandeja de entrada',
    [BrightChartStrings.ClinicianInbox_PendingResults]: 'Resultados pendientes',
    [BrightChartStrings.ClinicianInbox_UnsignedNotes]: 'Notas sin firmar',
    [BrightChartStrings.ClinicianInbox_Messages]: 'Mensajes',

    // ── Patient Portal ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientPortal_MyHealth]: 'Mi salud',
    [BrightChartStrings.PatientPortal_Welcome]: 'Bienvenido',
    [BrightChartStrings.PatientPortal_WelcomeUser]: 'Bienvenido, {NAME}',
    [BrightChartStrings.PatientPortal_ViewingRecordsAt]:
      'Viendo registros en {ORG}',
    [BrightChartStrings.PatientPortal_NextAppointment]: 'Próxima cita',
    [BrightChartStrings.PatientPortal_NoneScheduled]: 'Ninguna programada',
    [BrightChartStrings.PatientPortal_ActiveMedications]:
      'Medicamentos activos',
    [BrightChartStrings.PatientPortal_RecentResults]: 'Resultados recientes',
    [BrightChartStrings.PatientPortal_OutstandingBalance]: 'Saldo pendiente',
    [BrightChartStrings.PatientPortal_ClinicalTimeline]:
      'Línea de tiempo clínica',
    [BrightChartStrings.PatientPortal_Appointments]: 'Citas',
    [BrightChartStrings.PatientPortal_RequestAppointment]: 'Solicitar cita',
    [BrightChartStrings.PatientPortal_Upcoming]: 'Próximas',
    [BrightChartStrings.PatientPortal_NoUpcoming]: 'Sin citas próximas.',
    [BrightChartStrings.PatientPortal_Past]: 'Pasadas',
    [BrightChartStrings.PatientPortal_TestResults]: 'Resultados de pruebas',
    [BrightChartStrings.PatientPortal_BillsPayments]: 'Facturas y pagos',

    // ── Front Desk ─────────────────────────────────────────────────────────
    [BrightChartStrings.FrontDesk_Title]: 'Recepción',
    [BrightChartStrings.FrontDesk_TodaysAppointments]: 'Citas de hoy',
    [BrightChartStrings.FrontDesk_CheckedIn]: 'Registrado',
    [BrightChartStrings.FrontDesk_Waitlist]: 'Lista de espera',
    [BrightChartStrings.FrontDesk_PendingEligibility]: 'Elegibilidad pendiente',
    [BrightChartStrings.FrontDesk_PatientCheckIn]: 'Registro de paciente',
    [BrightChartStrings.FrontDesk_PatientRegistration]:
      'Inscripción de paciente',

    // ── Billing Workspace ──────────────────────────────────────────────────
    [BrightChartStrings.BillingWS_Title]: 'Facturación',
    [BrightChartStrings.BillingWS_UnbilledEncounters]:
      'Encuentros sin facturar',
    [BrightChartStrings.BillingWS_PendingClaims]: 'Reclamaciones pendientes',
    [BrightChartStrings.BillingWS_DeniedClaims]: 'Reclamaciones denegadas',
    [BrightChartStrings.BillingWS_TodaysPayments]: 'Pagos de hoy',
    [BrightChartStrings.BillingWS_ClaimTracking]:
      'Seguimiento de reclamaciones',
    [BrightChartStrings.BillingWS_PaymentPosting]: 'Registro de pagos',

    // ── Admin Workspace ────────────────────────────────────────────────────
    [BrightChartStrings.Admin_UserManagement]: 'Gestión de usuarios',
    [BrightChartStrings.Admin_RoleConfiguration]: 'Configuración de roles',
    [BrightChartStrings.Admin_AuditLog]: 'Registro de auditoría',
    [BrightChartStrings.Admin_SpecialtyConfiguration]:
      'Configuración de especialidad',
    [BrightChartStrings.Admin_PatientSearch]: 'Búsqueda de pacientes',

    // ── Common Table Headers / Labels ──────────────────────────────────────
    [BrightChartStrings.Common_Date]: 'Fecha',
    [BrightChartStrings.Common_Type]: 'Tipo',
    [BrightChartStrings.Common_Status]: 'Estado',
    [BrightChartStrings.Common_Description]: 'Descripción',
    [BrightChartStrings.Common_Amount]: 'Monto',
    [BrightChartStrings.Common_Balance]: 'Saldo',
    [BrightChartStrings.Common_Name]: 'Nombre',
    [BrightChartStrings.Common_Actions]: 'Acciones',
    [BrightChartStrings.Common_Priority]: 'Prioridad',
    [BrightChartStrings.Common_Category]: 'Categoría',
    [BrightChartStrings.Common_Patient]: 'Paciente',
    [BrightChartStrings.Common_Provider]: 'Proveedor',
    [BrightChartStrings.Common_Service]: 'Servicio',
    [BrightChartStrings.Common_Notes]: 'Notas',
    [BrightChartStrings.Common_From]: 'De',
    [BrightChartStrings.Common_To]: 'A',

    // ── Common Buttons / Actions ───────────────────────────────────────────
    [BrightChartStrings.Common_Save]: 'Guardar',
    [BrightChartStrings.Common_Cancel]: 'Cancelar',
    [BrightChartStrings.Common_Search]: 'Buscar',
    [BrightChartStrings.Common_Add]: 'Agregar',
    [BrightChartStrings.Common_Remove]: 'Eliminar',
    [BrightChartStrings.Common_Submit]: 'Enviar',
    [BrightChartStrings.Common_Create]: 'Crear',
    [BrightChartStrings.Common_Update]: 'Actualizar',
    [BrightChartStrings.Common_Delete]: 'Eliminar',
    [BrightChartStrings.Common_Sign]: 'Firmar',
    [BrightChartStrings.Common_Close]: 'Cerrar',
    [BrightChartStrings.Common_Back]: 'Atrás',
    [BrightChartStrings.Common_Next]: 'Siguiente',
    [BrightChartStrings.Common_Previous]: 'Anterior',
    [BrightChartStrings.Common_OfferSlot]: 'Ofrecer turno',
    [BrightChartStrings.Common_SelectSlot]: 'Seleccionar turno',

    // ── Common Empty States ────────────────────────────────────────────────
    [BrightChartStrings.Empty_NoResults]: 'No se encontraron resultados.',
    [BrightChartStrings.Empty_NoDocuments]: 'No se encontraron documentos',
    [BrightChartStrings.Empty_NoEncounters]: 'No se encontraron encuentros.',
    [BrightChartStrings.Empty_NoOrders]:
      'Ninguna orden coincide con los filtros.',
    [BrightChartStrings.Empty_NoLedgerEntries]:
      'No se encontraron entradas contables.',
    [BrightChartStrings.Empty_NoAllergies]: 'Sin alergias conocidas',
    [BrightChartStrings.Empty_NoMedications]: 'Sin medicamentos registrados.',
    [BrightChartStrings.Empty_NoConditions]: 'Sin condiciones registradas.',
    [BrightChartStrings.Empty_NoAppointments]:
      'Sin citas ni turnos disponibles.',
    [BrightChartStrings.Empty_NoSlots]: 'Sin turnos disponibles.',
    [BrightChartStrings.Empty_NoWaitlist]: 'Sin pacientes en lista de espera.',
    [BrightChartStrings.Empty_NoPermission]:
      'No tiene permiso para ver pacientes.',

    // ── Form Labels ────────────────────────────────────────────────────────
    [BrightChartStrings.Form_GivenName]: 'Nombre',
    [BrightChartStrings.Form_FamilyName]: 'Apellido',
    [BrightChartStrings.Form_BirthDate]: 'Fecha de nacimiento',
    [BrightChartStrings.Form_Gender]: 'Género',
    [BrightChartStrings.Form_SelectGender]: 'Seleccionar género',
    [BrightChartStrings.Form_Identifier]: 'Identificador',
    [BrightChartStrings.Form_Contact]: 'Contacto',
    [BrightChartStrings.Form_Address]: 'Dirección',
    [BrightChartStrings.Form_CreatePatient]: 'Crear paciente',
    [BrightChartStrings.Form_UpdatePatient]: 'Actualizar paciente',
    [BrightChartStrings.Form_CreateOrder]: 'Crear orden',
    [BrightChartStrings.Form_UpdateOrder]: 'Actualizar orden',
    [BrightChartStrings.Form_CreatePrescription]: 'Crear prescripción',
    [BrightChartStrings.Form_UpdatePrescription]: 'Actualizar prescripción',
    [BrightChartStrings.Form_CreateObservation]: 'Crear observación',
    [BrightChartStrings.Form_UpdateObservation]: 'Actualizar observación',
    [BrightChartStrings.Form_BookAppointment]: 'Reservar cita',
    [BrightChartStrings.Form_RescheduleAppointment]: 'Reprogramar cita',
    [BrightChartStrings.Form_CheckIn]: 'Registrar',
    [BrightChartStrings.Form_UpdateEncounter]: 'Actualizar encuentro',
    [BrightChartStrings.Form_SubmitClaim]: 'Enviar reclamación',
    [BrightChartStrings.Form_FinalizeSuperbill]: 'Finalizar superbill',

    // ── Allergy List ───────────────────────────────────────────────────────
    [BrightChartStrings.AllergyList_Title]: 'Alergias e intolerancias',
    [BrightChartStrings.AllergyList_AddNew]: '+ Agregar',

    // ── Condition List ─────────────────────────────────────────────────────
    [BrightChartStrings.ConditionList_Title]: 'Condiciones / Problemas',
    [BrightChartStrings.ConditionList_AddNew]: '+ Agregar',

    // ── Medication List ────────────────────────────────────────────────────
    [BrightChartStrings.MedicationList_Title]: 'Medicamentos',
    [BrightChartStrings.MedicationList_ActiveMedications]:
      'Medicamentos activos',
    [BrightChartStrings.MedicationList_Completed]: 'Completado',
    [BrightChartStrings.MedicationList_Stopped]: 'Detenido',
    [BrightChartStrings.MedicationList_Other]: 'Otro',

    // ── Encounter List ─────────────────────────────────────────────────────
    [BrightChartStrings.EncounterList_StatusFilter]: 'Estado:',
    [BrightChartStrings.EncounterList_ClassFilter]: 'Clase:',

    // ── Document List / Viewer ─────────────────────────────────────────────
    [BrightChartStrings.DocumentViewer_NoDocument]:
      'Sin documento para mostrar',
    [BrightChartStrings.DocumentViewer_ExplanationOfBenefit]:
      'Explicación de beneficios',

    // ── Ledger ─────────────────────────────────────────────────────────────
    [BrightChartStrings.Ledger_CurrentBalance]: 'Saldo actual:',

    // ── Waitlist ───────────────────────────────────────────────────────────
    [BrightChartStrings.Waitlist_Title]: 'Gestor de lista de espera',
    [BrightChartStrings.Waitlist_WaitTime]: 'Tiempo de espera',
    [BrightChartStrings.Waitlist_PreferredDates]: 'Fechas preferidas',
    [BrightChartStrings.Waitlist_PreferredProvider]: 'Proveedor preferido',

    // ── Schedule ───────────────────────────────────────────────────────────
    [BrightChartStrings.Schedule_Day]: 'Día',
    [BrightChartStrings.Schedule_Week]: 'Semana',
    [BrightChartStrings.Schedule_Month]: 'Mes',
    [BrightChartStrings.Schedule_Available]: 'Disponible',

    // ── Clinical Note Editor ───────────────────────────────────────────────
    [BrightChartStrings.NoteEditor_EmptyState]:
      'No se proporcionó composición ni plantilla. Seleccione una plantilla para comenzar una nueva nota.',

    // ── Insurance ──────────────────────────────────────────────────────────
    [BrightChartStrings.Insurance_PlanType]: 'Tipo de plan',
    [BrightChartStrings.Insurance_GroupNumber]: 'Número de grupo',
    [BrightChartStrings.Insurance_MemberID]: 'Número de miembro',
    [BrightChartStrings.Insurance_SubscriberName]: 'Nombre del suscriptor',
    [BrightChartStrings.Insurance_Relationship]: 'Relación',
    [BrightChartStrings.Insurance_PayerName]: 'Nombre del pagador',
    [BrightChartStrings.Insurance_Eligibility]: 'Elegibilidad de seguro',

    // ── Clinical Timeline ──────────────────────────────────────────────────
    [BrightChartStrings.ClinicalTimeline_AriaLabel]: 'Línea de tiempo clínica',
    [BrightChartStrings.ClinicalTimeline_FilterAriaLabel]:
      'Filtros por tipo de recurso',
    [BrightChartStrings.ClinicalTimeline_Empty]:
      'No hay datos clínicos disponibles.',
    [BrightChartStrings.ClinicalTimeline_Unknown]: 'Desconocido',
    [BrightChartStrings.ClinicalTimeline_NoDate]: 'Sin fecha',

    // ── Note Template Selector ─────────────────────────────────────────────
    [BrightChartStrings.NoteTemplateSelector_AriaLabel]:
      'Selector de plantilla de nota',
    [BrightChartStrings.NoteTemplateSelector_Empty]:
      'No hay plantillas disponibles',
    [BrightChartStrings.NoteTemplateSelector_GroupAriaTemplate]:
      'Tipo de documento {CODE}',
    [BrightChartStrings.NoteTemplateSelector_SelectTemplate]:
      'Seleccionar plantilla: {NAME}',

    // ── Encounter Workflow Board ───────────────────────────────────────────
    [BrightChartStrings.WorkflowBoard_AriaLabel]:
      'Tablero de flujo de trabajo de consultas',
    [BrightChartStrings.WorkflowBoard_UnknownPatient]: 'Paciente desconocido',
    [BrightChartStrings.WorkflowBoard_NoEncounters]: 'Sin consultas',
    [BrightChartStrings.WorkflowBoard_ColumnAriaTemplate]: 'Columna {NAME}',

    // ── Schedule Editor ────────────────────────────────────────────────────
    [BrightChartStrings.ScheduleEditor_Title]: 'Editor de horarios',
    [BrightChartStrings.ScheduleEditor_AriaLabel]:
      'Editor de disponibilidad de horarios',
    [BrightChartStrings.ScheduleEditor_AddBlockLegend]:
      'Agregar bloque de disponibilidad',
    [BrightChartStrings.ScheduleEditor_DayLabel]: 'Día',
    [BrightChartStrings.ScheduleEditor_StartTime]: 'Hora de inicio',
    [BrightChartStrings.ScheduleEditor_EndTime]: 'Hora de fin',
    [BrightChartStrings.ScheduleEditor_RecurringWeekly]: 'Recurrencia semanal',
    [BrightChartStrings.ScheduleEditor_AddBlock]: 'Agregar bloque',
    [BrightChartStrings.ScheduleEditor_StartBeforeEnd]:
      'La hora de inicio debe ser anterior a la hora de fin',
    [BrightChartStrings.ScheduleEditor_NoAvailability]: 'Sin disponibilidad',
    [BrightChartStrings.ScheduleEditor_Recurring]: 'Recurrente',
    [BrightChartStrings.ScheduleEditor_GridAriaLabel]:
      'Cuadrícula de disponibilidad semanal',
    [BrightChartStrings.ScheduleEditor_SaveSchedule]: 'Guardar horario',
    [BrightChartStrings.ScheduleEditor_Day_Monday]: 'Lunes',
    [BrightChartStrings.ScheduleEditor_Day_Tuesday]: 'Martes',
    [BrightChartStrings.ScheduleEditor_Day_Wednesday]: 'Miércoles',
    [BrightChartStrings.ScheduleEditor_Day_Thursday]: 'Jueves',
    [BrightChartStrings.ScheduleEditor_Day_Friday]: 'Viernes',
    [BrightChartStrings.ScheduleEditor_Day_Saturday]: 'Sábado',
    [BrightChartStrings.ScheduleEditor_Day_Sunday]: 'Domingo',

    // ── Connectivity Indicator ─────────────────────────────────────────────
    [BrightChartStrings.Connectivity_Online]: 'En línea',
    [BrightChartStrings.Connectivity_Offline]: 'Sin conexión',
    [BrightChartStrings.Connectivity_StatusTemplate]:
      'Estado de conexión: {STATUS}',

    // ── Notification Bell ──────────────────────────────────────────────────
    [BrightChartStrings.NotificationBell_AriaLabel]: 'Notificaciones',
    [BrightChartStrings.NotificationBell_UnreadTemplate]:
      'Notificaciones, {COUNT} sin leer',

    // ── Role Switcher ──────────────────────────────────────────────────────
    [BrightChartStrings.RoleSwitcher_AriaLabel]: 'Cambiar rol de salud',
    [BrightChartStrings.RoleSwitcher_MenuAriaLabel]:
      'Selección de rol de salud',

    // ── Patient Header ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientHeader_AriaLabel]: 'Información del paciente',
    [BrightChartStrings.PatientHeader_Unknown]: 'Desconocido',
    [BrightChartStrings.PatientHeader_MRN]: 'NRM:',
    [BrightChartStrings.PatientHeader_NA]: 'N/D',
    [BrightChartStrings.PatientHeader_AllergyTemplate]: 'Alergia: {NAME}',

    // ── Navigation Labels ──────────────────────────────────────────────────
    [BrightChartStrings.Nav_Patients]: 'Pacientes',
    [BrightChartStrings.Nav_Clients]: 'Clientes',
    [BrightChartStrings.Nav_Encounters]: 'Encuentros',
    [BrightChartStrings.Nav_Schedule]: 'Agenda',
    [BrightChartStrings.Nav_Inbox]: 'Bandeja de entrada',
    [BrightChartStrings.Nav_OperatoryView]: 'Vista de consultorio',
    [BrightChartStrings.Nav_TreatmentPlans]: 'Planes de tratamiento',
    [BrightChartStrings.Nav_SpeciesFilter]: 'Filtro de especies',
    [BrightChartStrings.Nav_FarmCalls]: 'Visitas a granjas',
    [BrightChartStrings.Nav_MyHealth]: 'Mi salud',
    [BrightChartStrings.Nav_Appointments]: 'Citas',
    [BrightChartStrings.Nav_TestResults]: 'Resultados de pruebas',
    [BrightChartStrings.Nav_BillsPayments]: 'Facturas y pagos',
    [BrightChartStrings.Nav_CheckIn]: 'Registro',
    [BrightChartStrings.Nav_Waitlist]: 'Lista de espera',
    [BrightChartStrings.Nav_Registration]: 'Inscripción',
    [BrightChartStrings.Nav_Insurance]: 'Seguro',
    [BrightChartStrings.Nav_Superbills]: 'Superfacturas',
    [BrightChartStrings.Nav_Claims]: 'Reclamaciones',
    [BrightChartStrings.Nav_ClaimTracking]: 'Seguimiento de reclamaciones',
    [BrightChartStrings.Nav_Payments]: 'Pagos',
    [BrightChartStrings.Nav_PatientLedger]: 'Libro mayor del paciente',
    [BrightChartStrings.Nav_FeeSchedules]: 'Tarifas',
    [BrightChartStrings.Nav_Users]: 'Usuarios',
    [BrightChartStrings.Nav_Roles]: 'Roles',
    [BrightChartStrings.Nav_AuditLog]: 'Registro de auditoría',
    [BrightChartStrings.Nav_SpecialtyConfig]: 'Configuración de especialidad',
    [BrightChartStrings.Nav_Settings]: 'Configuración',
    [BrightChartStrings.Nav_Organizations]: 'Organizaciones',
    [BrightChartStrings.Nav_Clinician]: 'Clínico',
    [BrightChartStrings.Nav_PatientPortal]: 'Portal del paciente',
    [BrightChartStrings.Nav_Billing]: 'Facturación',

    // ── Sidebar ────────────────────────────────────────────────────────────
    [BrightChartStrings.Sidebar_ExpandAriaLabel]: 'Expandir barra lateral',
    [BrightChartStrings.Sidebar_CollapseAriaLabel]: 'Contraer barra lateral',
    [BrightChartStrings.Sidebar_NavAriaLabel]: 'Navegación BrightChart',

    [BrightChartStrings.BottomNav_AriaLabel]: 'Navegación móvil BrightChart',
    [BrightChartStrings.Layout_NavAriaTemplate]: 'Navegación {NAME}',
  };
