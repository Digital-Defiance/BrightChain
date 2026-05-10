import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChartStringKey,
  BrightChartStrings,
} from '../../enumerations/BrightChartStrings';

export const BrightChartUkrainianStrings: ComponentStrings<BrightChartStringKey> =
  {
    // ── Menu / Navigation ──────────────────────────────────────────────
    [BrightChartStrings.MenuLabel]: 'BrightChart',
    [BrightChartStrings.ChartSectionsLabel]: 'Розділи діаграм',
    [BrightChartStrings.Nav_Conversations]: 'Розмови',
    [BrightChartStrings.Nav_Groups]: 'Групи',
    [BrightChartStrings.Nav_Channels]: 'Канали',

    // ── Shell / Notifications ──────────────────────────────────────────
    [BrightChartStrings.Notification_Type_Result]: 'Результат',
    [BrightChartStrings.Notification_Type_Note]: 'Нотатка',
    [BrightChartStrings.Notification_Type_Appointment]: 'Прийом',
    [BrightChartStrings.Notification_Type_Claim]: 'Претензія',
    [BrightChartStrings.Notification_Type_Message]: 'Повідомлення',
    [BrightChartStrings.Notification_Type_System]: 'Система',
    [BrightChartStrings.Notification_Priority_Normal]: 'Звичайний',
    [BrightChartStrings.Notification_Priority_Urgent]: 'Терміновий',

    // ── Roles ──────────────────────────────────────────────────────────
    [BrightChartStrings.Role_Physician]: 'Лікар',
    [BrightChartStrings.Role_RegisteredNurse]: 'Медсестра/Медбрат',
    [BrightChartStrings.Role_MedicalAssistant]: 'Медичний асистент',
    [BrightChartStrings.Role_Patient]: 'Пацієнт',
    [BrightChartStrings.Role_ClinicalAdministrator]: 'Клінічний адміністратор',
    [BrightChartStrings.Role_Dentist]: 'Стоматолог',
    [BrightChartStrings.Role_Veterinarian]: 'Ветеринар',

    // ── Organization ───────────────────────────────────────────────────
    [BrightChartStrings.Org_EnrollmentMode_Open]: 'Відкритий',
    [BrightChartStrings.Org_EnrollmentMode_InviteOnly]: 'Лише за запрошенням',

    // ── Audit ──────────────────────────────────────────────────────────
    [BrightChartStrings.Audit_Operation_Create]: 'Створити',
    [BrightChartStrings.Audit_Operation_Read]: 'Читати',
    [BrightChartStrings.Audit_Operation_Update]: 'Оновити',
    [BrightChartStrings.Audit_Operation_Delete]: 'Видалити',
    [BrightChartStrings.Audit_Operation_Search]: 'Шукати',
    [BrightChartStrings.Audit_Operation_Merge]: "Об'єднати",

    // ── FHIR / Patient Identity ──────────────────────────────────────────
    [BrightChartStrings.Gender_Male]: 'Чоловічий',
    [BrightChartStrings.Gender_Female]: 'Жіночий',
    [BrightChartStrings.Gender_Other]: 'Інший',
    [BrightChartStrings.Gender_Unknown]: 'Невідомий',

    [BrightChartStrings.NameUse_Usual]: 'Звичайне',
    [BrightChartStrings.NameUse_Official]: 'Офіційне',
    [BrightChartStrings.NameUse_Temp]: 'Тимчасове',
    [BrightChartStrings.NameUse_Nickname]: 'Прізвисько',
    [BrightChartStrings.NameUse_Anonymous]: 'Анонімне',
    [BrightChartStrings.NameUse_Old]: 'Старе',
    [BrightChartStrings.NameUse_Maiden]: 'Дівоче',

    [BrightChartStrings.AddressUse_Home]: 'Домашня',
    [BrightChartStrings.AddressUse_Work]: 'Робоча',
    [BrightChartStrings.AddressUse_Temp]: 'Тимчасова',
    [BrightChartStrings.AddressUse_Old]: 'Стара',
    [BrightChartStrings.AddressUse_Billing]: 'Для рахунків',

    [BrightChartStrings.AddressType_Postal]: 'Поштова',
    [BrightChartStrings.AddressType_Physical]: 'Фізична',
    [BrightChartStrings.AddressType_Both]: 'Обидва',

    [BrightChartStrings.ContactSystem_Phone]: 'Телефон',
    [BrightChartStrings.ContactSystem_Fax]: 'Факс',
    [BrightChartStrings.ContactSystem_Email]: 'Електронна пошта',
    [BrightChartStrings.ContactSystem_Pager]: 'Пейджер',
    [BrightChartStrings.ContactSystem_Url]: 'URL',
    [BrightChartStrings.ContactSystem_Sms]: 'SMS',
    [BrightChartStrings.ContactSystem_Other]: 'Інше',

    [BrightChartStrings.ContactUse_Home]: 'Домашній',
    [BrightChartStrings.ContactUse_Work]: 'Робочий',
    [BrightChartStrings.ContactUse_Temp]: 'Тимчасовий',
    [BrightChartStrings.ContactUse_Old]: 'Старий',
    [BrightChartStrings.ContactUse_Mobile]: 'Мобільний',

    [BrightChartStrings.LinkType_ReplacedBy]: 'Замінений',
    [BrightChartStrings.LinkType_Replaces]: 'Замінює',
    [BrightChartStrings.LinkType_Refer]: 'Посилання',
    [BrightChartStrings.LinkType_SeeAlso]: 'Дивіться також',

    [BrightChartStrings.IdentifierUse_Usual]: 'Звичайний',
    [BrightChartStrings.IdentifierUse_Official]: 'Офіційний',
    [BrightChartStrings.IdentifierUse_Temp]: 'Тимчасовий',
    [BrightChartStrings.IdentifierUse_Secondary]: 'Вторинний',
    [BrightChartStrings.IdentifierUse_Old]: 'Старий',

    // ── Clinical ─────────────────────────────────────────────────────────
    [BrightChartStrings.ObservationStatus_Registered]: 'Зареєстрований',
    [BrightChartStrings.ObservationStatus_Preliminary]: 'Попередній',
    [BrightChartStrings.ObservationStatus_Final]: 'Остаточний',
    [BrightChartStrings.ObservationStatus_Amended]: 'Змінений',
    [BrightChartStrings.ObservationStatus_Corrected]: 'Виправлений',
    [BrightChartStrings.ObservationStatus_Cancelled]: 'Скасований',
    [BrightChartStrings.ObservationStatus_EnteredInError]: 'Помилково введений',
    [BrightChartStrings.ObservationStatus_Unknown]: 'Невідомий',

    [BrightChartStrings.ConditionClinical_Active]: 'Активний',
    [BrightChartStrings.ConditionClinical_Recurrence]: 'Рецидив',
    [BrightChartStrings.ConditionClinical_Relapse]: 'Рецидив',
    [BrightChartStrings.ConditionClinical_Inactive]: 'Неактивний',
    [BrightChartStrings.ConditionClinical_Remission]: 'Ремісія',
    [BrightChartStrings.ConditionClinical_Resolved]: 'Вирішений',

    [BrightChartStrings.ConditionVerification_Unconfirmed]: 'Непідтверджений',
    [BrightChartStrings.ConditionVerification_Provisional]: 'Попередній',
    [BrightChartStrings.ConditionVerification_Differential]: 'Диференціальний',
    [BrightChartStrings.ConditionVerification_Confirmed]: 'Підтверджений',
    [BrightChartStrings.ConditionVerification_Refuted]: 'Спростований',
    [BrightChartStrings.ConditionVerification_EnteredInError]:
      'Помилково введений',

    [BrightChartStrings.AllergyType_Allergy]: 'Алергія',
    [BrightChartStrings.AllergyType_Intolerance]: 'Непереносимість',

    [BrightChartStrings.AllergyCategory_Food]: 'Харчова',
    [BrightChartStrings.AllergyCategory_Medication]: 'Медикаментозна',
    [BrightChartStrings.AllergyCategory_Environment]: 'Екологічна',
    [BrightChartStrings.AllergyCategory_Biologic]: 'Біологічна',

    [BrightChartStrings.AllergyCriticality_Low]: 'Низький',
    [BrightChartStrings.AllergyCriticality_High]: 'Високий',
    [BrightChartStrings.AllergyCriticality_UnableToAssess]: 'Неможливо оцінити',

    [BrightChartStrings.AllergySeverity_Mild]: 'Легкий',
    [BrightChartStrings.AllergySeverity_Moderate]: 'Помірний',
    [BrightChartStrings.AllergySeverity_Severe]: 'Тяжкий',

    [BrightChartStrings.MedicationStatus_Active]: 'Активний',
    [BrightChartStrings.MedicationStatus_Inactive]: 'Неактивний',
    [BrightChartStrings.MedicationStatus_EnteredInError]: 'Помилково введений',

    [BrightChartStrings.MedStatementStatus_Active]: 'Активний',
    [BrightChartStrings.MedStatementStatus_Completed]: 'Завершений',
    [BrightChartStrings.MedStatementStatus_EnteredInError]:
      'Помилково введений',
    [BrightChartStrings.MedStatementStatus_Intended]: 'Запланований',
    [BrightChartStrings.MedStatementStatus_Stopped]: 'Зупинений',
    [BrightChartStrings.MedStatementStatus_OnHold]: 'На утриманні',
    [BrightChartStrings.MedStatementStatus_Unknown]: 'Невідомий',
    [BrightChartStrings.MedStatementStatus_NotTaken]: 'Не прийнятий',

    [BrightChartStrings.ProcedureStatus_Preparation]: 'Підготовка',
    [BrightChartStrings.ProcedureStatus_InProgress]: 'В процесі',
    [BrightChartStrings.ProcedureStatus_NotDone]: 'Не виконано',
    [BrightChartStrings.ProcedureStatus_OnHold]: 'На утриманні',
    [BrightChartStrings.ProcedureStatus_Stopped]: 'Зупинений',
    [BrightChartStrings.ProcedureStatus_Completed]: 'Завершений',
    [BrightChartStrings.ProcedureStatus_EnteredInError]: 'Помилково введений',
    [BrightChartStrings.ProcedureStatus_Unknown]: 'Невідомий',

    // ── Encounter ────────────────────────────────────────────────────────
    [BrightChartStrings.EncounterStatus_Planned]: 'Запланований',
    [BrightChartStrings.EncounterStatus_Arrived]: 'Прибув',
    [BrightChartStrings.EncounterStatus_Triaged]: 'Тріажований',
    [BrightChartStrings.EncounterStatus_InProgress]: 'В процесі',
    [BrightChartStrings.EncounterStatus_OnLeave]: 'У відпустці',
    [BrightChartStrings.EncounterStatus_Finished]: 'Завершений',
    [BrightChartStrings.EncounterStatus_Cancelled]: 'Скасований',
    [BrightChartStrings.EncounterStatus_EnteredInError]: 'Помилково введений',
    [BrightChartStrings.EncounterStatus_Unknown]: 'Невідомий',

    [BrightChartStrings.EncounterLocationStatus_Planned]: 'Запланований',
    [BrightChartStrings.EncounterLocationStatus_Active]: 'Активний',
    [BrightChartStrings.EncounterLocationStatus_Reserved]: 'Зарезервований',
    [BrightChartStrings.EncounterLocationStatus_Completed]: 'Завершений',

    [BrightChartStrings.EncounterClass_Inpatient]: 'Стаціонар',
    [BrightChartStrings.EncounterClass_Ambulatory]: 'Амбулаторний',
    [BrightChartStrings.EncounterClass_Emergency]: 'Невідкладний',
    [BrightChartStrings.EncounterClass_HomeHealth]: 'Домашня допомога',
    [BrightChartStrings.EncounterClass_Virtual]: 'Віртуальний',
    [BrightChartStrings.EncounterClass_Field]: 'Польовий',
    [BrightChartStrings.EncounterClass_ShortStay]: 'Короткий перебування',
    [BrightChartStrings.EncounterClass_Observation]: 'Спостереження',
    [BrightChartStrings.EncounterClass_PreAdmission]: 'Передгоспітальний',

    [BrightChartStrings.DiagnosisRole_Admission]: 'Діагноз при госпіталізації',
    [BrightChartStrings.DiagnosisRole_Discharge]: 'Діагноз при виписці',
    [BrightChartStrings.DiagnosisRole_ChiefComplaint]: 'Основна скарга',
    [BrightChartStrings.DiagnosisRole_Comorbidity]: 'Супутнє захворювання',
    [BrightChartStrings.DiagnosisRole_PreOp]: 'Передопераційний діагноз',
    [BrightChartStrings.DiagnosisRole_PostOp]: 'Післяопераційний діагноз',
    [BrightChartStrings.DiagnosisRole_Billing]:
      'Діагноз для виставлення рахунку',

    // ── Documentation ────────────────────────────────────────────────────
    [BrightChartStrings.CompositionStatus_Preliminary]: 'Попередній',
    [BrightChartStrings.CompositionStatus_Final]: 'Остаточний',
    [BrightChartStrings.CompositionStatus_Amended]: 'Змінений',
    [BrightChartStrings.CompositionStatus_EnteredInError]: 'Помилково введений',

    [BrightChartStrings.DocRefStatus_Current]: 'Поточний',
    [BrightChartStrings.DocRefStatus_Superseded]: 'Замінений',
    [BrightChartStrings.DocRefStatus_EnteredInError]: 'Помилково введений',

    [BrightChartStrings.AttestationMode_Personal]: 'Особистий',
    [BrightChartStrings.AttestationMode_Professional]: 'Професійний',
    [BrightChartStrings.AttestationMode_Legal]: 'Юридичний',
    [BrightChartStrings.AttestationMode_Official]: 'Офіційний',

    [BrightChartStrings.DocRelationship_Replaces]: 'Замінює',
    [BrightChartStrings.DocRelationship_Transforms]: 'Перетворює',
    [BrightChartStrings.DocRelationship_Signs]: 'Підписує',
    [BrightChartStrings.DocRelationship_Appends]: 'Додає',

    // ── Note Templates ───────────────────────────────────────────────────
    [BrightChartStrings.Template_SOAPNote_Name]: 'SOAP-нотатка',
    [BrightChartStrings.Template_SOAPNote_Description]:
      "Стандартний формат Суб'єктивне, Об'єктивне, Оцінка, План, що використовується в амбулаторних та стаціонарних умовах.",
    [BrightChartStrings.Template_SOAPNote_Subjective]: "Суб'єктивне",
    [BrightChartStrings.Template_SOAPNote_Objective]: "Об'єктивне",
    [BrightChartStrings.Template_SOAPNote_Assessment]: 'Оцінка',
    [BrightChartStrings.Template_SOAPNote_Plan]: 'План',

    [BrightChartStrings.Template_HP_Name]: 'Анамнез та фізикальне обстеження',
    [BrightChartStrings.Template_HP_Description]:
      'Повний формат початкової оцінки для госпіталізацій та нових консультацій.',
    [BrightChartStrings.Template_HP_ChiefComplaint]: 'Основна скарга',
    [BrightChartStrings.Template_HP_HPI]: 'Анамнез захворювання',
    [BrightChartStrings.Template_HP_PastMedicalHistory]:
      'Попередній медичний анамнез',
    [BrightChartStrings.Template_HP_ReviewOfSystems]: 'Огляд систем',
    [BrightChartStrings.Template_HP_PhysicalExam]: 'Фізикальне обстеження',
    [BrightChartStrings.Template_HP_Assessment]: 'Оцінка',
    [BrightChartStrings.Template_HP_Plan]: 'План',

    [BrightChartStrings.Template_Discharge_Name]: 'Виписний епікриз',
    [BrightChartStrings.Template_Discharge_Description]:
      'Стандартний формат для документування перебування в стаціонарі, діагнозів, перебігу та плану виписки.',
    [BrightChartStrings.Template_Discharge_AdmissionDiagnosis]:
      'Діагноз при госпіталізації',
    [BrightChartStrings.Template_Discharge_HospitalCourse]:
      'Перебіг госпіталізації',
    [BrightChartStrings.Template_Discharge_DischargeDiagnosis]:
      'Діагноз при виписці',
    [BrightChartStrings.Template_Discharge_DischargeMedications]:
      'Медикаменти при виписці',
    [BrightChartStrings.Template_Discharge_FollowUp]:
      'Інструкції з подальшого спостереження',

    [BrightChartStrings.Template_Procedure_Name]: 'Протокол процедури',
    [BrightChartStrings.Template_Procedure_Description]:
      'Стандартний формат для документування клінічних або хірургічних процедур.',
    [BrightChartStrings.Template_Procedure_Indication]: 'Показання',
    [BrightChartStrings.Template_Procedure_ProcedureDescription]:
      'Опис процедури',
    [BrightChartStrings.Template_Procedure_Findings]: 'Знахідки',
    [BrightChartStrings.Template_Procedure_Complications]: 'Ускладнення',
    [BrightChartStrings.Template_Procedure_PostProcedurePlan]:
      'Післяпроцедурний план',

    // ── LOINC Document Types ─────────────────────────────────────────────
    [BrightChartStrings.DocType_ConsultationNote]: 'Консультаційна нотатка',
    [BrightChartStrings.DocType_DischargeSummary]: 'Виписний епікриз',
    [BrightChartStrings.DocType_HistoryAndPhysical]:
      'Анамнез та фізикальне обстеження',
    [BrightChartStrings.DocType_ProgressNote]: 'Щоденник',
    [BrightChartStrings.DocType_ProcedureNote]: 'Протокол процедури',
    [BrightChartStrings.DocType_OperativeNote]: 'Операційна нотатка',
    [BrightChartStrings.DocType_NurseNote]: 'Сестринська нотатка',
    [BrightChartStrings.DocType_ReferralNote]: 'Направлення',
    [BrightChartStrings.DocType_TransferSummary]: 'Переводний епікриз',

    // ── Orders & Results ─────────────────────────────────────────────────
    [BrightChartStrings.ServiceRequestStatus_Draft]: 'Чернетка',
    [BrightChartStrings.ServiceRequestStatus_Active]: 'Активний',
    [BrightChartStrings.ServiceRequestStatus_OnHold]: 'На утриманні',
    [BrightChartStrings.ServiceRequestStatus_Revoked]: 'Відкликаний',
    [BrightChartStrings.ServiceRequestStatus_Completed]: 'Завершений',
    [BrightChartStrings.ServiceRequestStatus_EnteredInError]:
      'Помилково введений',
    [BrightChartStrings.ServiceRequestStatus_Unknown]: 'Невідомий',

    [BrightChartStrings.ServiceRequestIntent_Proposal]: 'Пропозиція',
    [BrightChartStrings.ServiceRequestIntent_Plan]: 'План',
    [BrightChartStrings.ServiceRequestIntent_Directive]: 'Директива',
    [BrightChartStrings.ServiceRequestIntent_Order]: 'Замовлення',
    [BrightChartStrings.ServiceRequestIntent_OriginalOrder]:
      'Оригінальне замовлення',
    [BrightChartStrings.ServiceRequestIntent_ReflexOrder]:
      'Рефлексне замовлення',
    [BrightChartStrings.ServiceRequestIntent_FillerOrder]:
      'Замовлення-заповнювач',
    [BrightChartStrings.ServiceRequestIntent_InstanceOrder]:
      'Замовлення-екземпляр',
    [BrightChartStrings.ServiceRequestIntent_Option]: 'Опція',

    [BrightChartStrings.MedRequestStatus_Active]: 'Активний',
    [BrightChartStrings.MedRequestStatus_OnHold]: 'На утриманні',
    [BrightChartStrings.MedRequestStatus_Cancelled]: 'Скасований',
    [BrightChartStrings.MedRequestStatus_Completed]: 'Завершений',
    [BrightChartStrings.MedRequestStatus_EnteredInError]: 'Помилково введений',
    [BrightChartStrings.MedRequestStatus_Stopped]: 'Зупинений',
    [BrightChartStrings.MedRequestStatus_Draft]: 'Чернетка',
    [BrightChartStrings.MedRequestStatus_Unknown]: 'Невідомий',

    [BrightChartStrings.MedRequestIntent_Proposal]: 'Пропозиція',
    [BrightChartStrings.MedRequestIntent_Plan]: 'План',
    [BrightChartStrings.MedRequestIntent_Order]: 'Замовлення',
    [BrightChartStrings.MedRequestIntent_OriginalOrder]:
      'Оригінальне замовлення',
    [BrightChartStrings.MedRequestIntent_ReflexOrder]: 'Рефлексне замовлення',
    [BrightChartStrings.MedRequestIntent_FillerOrder]: 'Замовлення-заповнювач',
    [BrightChartStrings.MedRequestIntent_InstanceOrder]: 'Замовлення-екземпляр',
    [BrightChartStrings.MedRequestIntent_Option]: 'Опція',

    [BrightChartStrings.DiagnosticReportStatus_Registered]: 'Зареєстрований',
    [BrightChartStrings.DiagnosticReportStatus_Partial]: 'Частковий',
    [BrightChartStrings.DiagnosticReportStatus_Preliminary]: 'Попередній',
    [BrightChartStrings.DiagnosticReportStatus_Final]: 'Остаточний',
    [BrightChartStrings.DiagnosticReportStatus_Amended]: 'Змінений',
    [BrightChartStrings.DiagnosticReportStatus_Corrected]: 'Виправлений',
    [BrightChartStrings.DiagnosticReportStatus_Appended]: 'Доданий',
    [BrightChartStrings.DiagnosticReportStatus_Cancelled]: 'Скасований',
    [BrightChartStrings.DiagnosticReportStatus_EnteredInError]:
      'Помилково введений',
    [BrightChartStrings.DiagnosticReportStatus_Unknown]: 'Невідомий',

    [BrightChartStrings.RequestPriority_Routine]: 'Рутинний',
    [BrightChartStrings.RequestPriority_Urgent]: 'Терміновий',
    [BrightChartStrings.RequestPriority_Asap]: 'Якнайшвидше',
    [BrightChartStrings.RequestPriority_Stat]: 'Негайно',

    // ── Billing ──────────────────────────────────────────────────────────
    [BrightChartStrings.CoverageStatus_Active]: 'Активний',
    [BrightChartStrings.CoverageStatus_Cancelled]: 'Скасований',
    [BrightChartStrings.CoverageStatus_Draft]: 'Чернетка',
    [BrightChartStrings.CoverageStatus_EnteredInError]: 'Помилково введений',

    [BrightChartStrings.ClaimStatus_Active]: 'Активний',
    [BrightChartStrings.ClaimStatus_Cancelled]: 'Скасований',
    [BrightChartStrings.ClaimStatus_Draft]: 'Чернетка',
    [BrightChartStrings.ClaimStatus_EnteredInError]: 'Помилково введений',

    [BrightChartStrings.ClaimUse_Claim]: 'Претензія',
    [BrightChartStrings.ClaimUse_Preauthorization]: 'Попередня авторизація',
    [BrightChartStrings.ClaimUse_Predetermination]: 'Попереднє визначення',

    [BrightChartStrings.EOBStatus_Active]: 'Активний',
    [BrightChartStrings.EOBStatus_Cancelled]: 'Скасований',
    [BrightChartStrings.EOBStatus_Draft]: 'Чернетка',
    [BrightChartStrings.EOBStatus_EnteredInError]: 'Помилково введений',

    [BrightChartStrings.RemittanceOutcome_Queued]: 'У черзі',
    [BrightChartStrings.RemittanceOutcome_Complete]: 'Завершений',
    [BrightChartStrings.RemittanceOutcome_Error]: 'Помилка',
    [BrightChartStrings.RemittanceOutcome_Partial]: 'Частковий',

    [BrightChartStrings.EligibilityPurpose_AuthRequirements]:
      'Вимоги авторизації',
    [BrightChartStrings.EligibilityPurpose_Benefits]: 'Пільги',
    [BrightChartStrings.EligibilityPurpose_Discovery]: 'Виявлення',
    [BrightChartStrings.EligibilityPurpose_Validation]: 'Валідація',

    [BrightChartStrings.SuperbillStatus_Draft]: 'Чернетка',
    [BrightChartStrings.SuperbillStatus_Finalized]: 'Завершений',
    [BrightChartStrings.SuperbillStatus_Billed]: 'Виставлений рахунок',

    [BrightChartStrings.LedgerEntryType_Charge]: 'Нарахування',
    [BrightChartStrings.LedgerEntryType_Payment]: 'Оплата',
    [BrightChartStrings.LedgerEntryType_Adjustment]: 'Коригування',
    [BrightChartStrings.LedgerEntryType_Refund]: 'Повернення',
    [BrightChartStrings.LedgerEntryType_WriteOff]: 'Списання',

    [BrightChartStrings.ClaimType_Institutional]: 'Інституційний',
    [BrightChartStrings.ClaimType_Oral]: 'Стоматологічний',
    [BrightChartStrings.ClaimType_Pharmacy]: 'Аптечний',
    [BrightChartStrings.ClaimType_Professional]: 'Професійний',
    [BrightChartStrings.ClaimType_Vision]: 'Зір',

    // ── Scheduling ───────────────────────────────────────────────────────
    [BrightChartStrings.AppointmentStatus_Proposed]: 'Запропонований',
    [BrightChartStrings.AppointmentStatus_Pending]: 'Очікує',
    [BrightChartStrings.AppointmentStatus_Booked]: 'Заброньований',
    [BrightChartStrings.AppointmentStatus_Arrived]: 'Прибув',
    [BrightChartStrings.AppointmentStatus_Fulfilled]: 'Виконаний',
    [BrightChartStrings.AppointmentStatus_Cancelled]: 'Скасований',
    [BrightChartStrings.AppointmentStatus_Noshow]: "Не з'явився",
    [BrightChartStrings.AppointmentStatus_EnteredInError]: 'Помилково введений',
    [BrightChartStrings.AppointmentStatus_CheckedIn]: 'Зареєстрований',
    [BrightChartStrings.AppointmentStatus_Waitlist]: 'Список очікування',

    [BrightChartStrings.SlotStatus_Busy]: 'Зайнятий',
    [BrightChartStrings.SlotStatus_Free]: 'Вільний',
    [BrightChartStrings.SlotStatus_BusyUnavailable]: 'Зайнятий (недоступний)',
    [BrightChartStrings.SlotStatus_BusyTentative]: 'Зайнятий (попередній)',
    [BrightChartStrings.SlotStatus_EnteredInError]: 'Помилково введений',

    [BrightChartStrings.ParticipantRequired_Required]: "Обов'язковий",
    [BrightChartStrings.ParticipantRequired_Optional]: "Необов'язковий",
    [BrightChartStrings.ParticipantRequired_InformationOnly]:
      'Лише для інформації',

    [BrightChartStrings.ParticipationStatus_Accepted]: 'Прийнято',
    [BrightChartStrings.ParticipationStatus_Declined]: 'Відхилено',
    [BrightChartStrings.ParticipationStatus_Tentative]: 'Попередній',
    [BrightChartStrings.ParticipationStatus_NeedsAction]: 'Потребує дії',

    [BrightChartStrings.WaitlistStatus_Waiting]: 'Очікує',
    [BrightChartStrings.WaitlistStatus_Offered]: 'Запропоновано',
    [BrightChartStrings.WaitlistStatus_Booked]: 'Заброньовано',
    [BrightChartStrings.WaitlistStatus_Cancelled]: 'Скасовано',
    [BrightChartStrings.WaitlistStatus_Expired]: 'Закінчився термін',

    [BrightChartStrings.ReminderType_Sms]: 'SMS',
    [BrightChartStrings.ReminderType_Email]: 'Електронна пошта',
    [BrightChartStrings.ReminderType_Push]: 'Push-сповіщення',
    [BrightChartStrings.ReminderType_Phone]: 'Телефонний дзвінок',

    [BrightChartStrings.ReminderStatus_Scheduled]: 'Заплановано',
    [BrightChartStrings.ReminderStatus_Sent]: 'Надіслано',
    [BrightChartStrings.ReminderStatus_Failed]: 'Не вдалося',
    [BrightChartStrings.ReminderStatus_Cancelled]: 'Скасовано',

    // ── Offline / Sync ───────────────────────────────────────────────────
    [BrightChartStrings.Sync_Conflict]: 'Конфлікт синхронізації',
    [BrightChartStrings.Sync_Success]: 'Синхронізація успішна',

    // ── FHIR OperationOutcome Severity ───────────────────────────────────
    [BrightChartStrings.IssueSeverity_Fatal]: 'Фатальний',
    [BrightChartStrings.IssueSeverity_Error]: 'Помилка',
    [BrightChartStrings.IssueSeverity_Warning]: 'Попередження',
    [BrightChartStrings.IssueSeverity_Information]: 'Інформація',

    // ── Narrative Status ─────────────────────────────────────────────────
    [BrightChartStrings.NarrativeStatus_Generated]: 'Згенерований',
    [BrightChartStrings.NarrativeStatus_Extensions]: 'Розширення',
    [BrightChartStrings.NarrativeStatus_Additional]: 'Додатковий',
    [BrightChartStrings.NarrativeStatus_Empty]: 'Порожній',

    // ── Shell / UI ─────────────────────────────────────────────────────────
    [BrightChartStrings.Shell_Notifications]: 'Сповіщення',
    [BrightChartStrings.Shell_MarkAllRead]: 'Позначити все як прочитане',
    [BrightChartStrings.Shell_NoNotifications]: 'Немає сповіщень',
    [BrightChartStrings.Shell_AccessDenied]: 'Доступ заборонено',
    [BrightChartStrings.Shell_AccessDeniedMessage]:
      'У вас немає дозволу на доступ до цієї області.',
    [BrightChartStrings.Shell_Loading]: 'Завантаження...',

    // ── Patient Chart Tabs ─────────────────────────────────────────────────
    [BrightChartStrings.PatientChart_Title]: 'Картка пацієнта',
    [BrightChartStrings.PatientChart_Summary]: 'Підсумок',
    [BrightChartStrings.PatientChart_Problems]: 'Проблеми',
    [BrightChartStrings.PatientChart_Medications]: 'Медикаменти',
    [BrightChartStrings.PatientChart_Allergies]: 'Алергії',
    [BrightChartStrings.PatientChart_Encounters]: 'Візити',
    [BrightChartStrings.PatientChart_Documents]: 'Документи',
    [BrightChartStrings.PatientChart_Orders]: 'Призначення',
    [BrightChartStrings.PatientChart_Results]: 'Результати',
    [BrightChartStrings.PatientChart_Appointments]: 'Записи',
    [BrightChartStrings.PatientChart_Insurance]: 'Страхування',
    [BrightChartStrings.PatientChart_Billing]: 'Рахунки',
    [BrightChartStrings.PatientChart_NoPatientSelected]: 'Пацієнт не обраний.',

    // ── Encounter Dashboard ────────────────────────────────────────────────
    [BrightChartStrings.EncounterDashboard_Title]: 'Сьогоднішні візити',
    [BrightChartStrings.EncounterDashboard_Scheduled]: 'Заплановано',
    [BrightChartStrings.EncounterDashboard_InProgress]: 'В процесі',
    [BrightChartStrings.EncounterDashboard_PendingTasks]: 'Очікувані завдання',

    // ── Clinician Inbox ────────────────────────────────────────────────────
    [BrightChartStrings.ClinicianInbox_Title]: 'Вхідні',
    [BrightChartStrings.ClinicianInbox_PendingResults]: 'Очікувані результати',
    [BrightChartStrings.ClinicianInbox_UnsignedNotes]: 'Непідписані нотатки',
    [BrightChartStrings.ClinicianInbox_Messages]: 'Повідомлення',

    // ── Patient Portal ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientPortal_MyHealth]: "Моє здоров'я",
    [BrightChartStrings.PatientPortal_Welcome]: 'Ласкаво просимо',
    [BrightChartStrings.PatientPortal_WelcomeUser]: 'Ласкаво просимо, {NAME}',
    [BrightChartStrings.PatientPortal_ViewingRecordsAt]:
      'Перегляд записів у {ORG}',
    [BrightChartStrings.PatientPortal_NextAppointment]: 'Наступний запис',
    [BrightChartStrings.PatientPortal_NoneScheduled]: 'Не заплановано',
    [BrightChartStrings.PatientPortal_ActiveMedications]: 'Активні медикаменти',
    [BrightChartStrings.PatientPortal_RecentResults]: 'Останні результати',
    [BrightChartStrings.PatientPortal_OutstandingBalance]:
      'Непогашений залишок',
    [BrightChartStrings.PatientPortal_ClinicalTimeline]: 'Клінічна хронологія',
    [BrightChartStrings.PatientPortal_Appointments]: 'Записи',
    [BrightChartStrings.PatientPortal_RequestAppointment]: 'Запросити запис',
    [BrightChartStrings.PatientPortal_Upcoming]: 'Майбутні',
    [BrightChartStrings.PatientPortal_NoUpcoming]: 'Немає майбутніх записів.',
    [BrightChartStrings.PatientPortal_Past]: 'Минулі',
    [BrightChartStrings.PatientPortal_TestResults]: 'Результати аналізів',
    [BrightChartStrings.PatientPortal_BillsPayments]: 'Рахунки та платежі',

    // ── Front Desk ─────────────────────────────────────────────────────────
    [BrightChartStrings.FrontDesk_Title]: 'Реєстратура',
    [BrightChartStrings.FrontDesk_TodaysAppointments]: 'Записи на сьогодні',
    [BrightChartStrings.FrontDesk_CheckedIn]: 'Зареєстровано',
    [BrightChartStrings.FrontDesk_Waitlist]: 'Список очікування',
    [BrightChartStrings.FrontDesk_PendingEligibility]:
      'Очікування підтвердження',
    [BrightChartStrings.FrontDesk_PatientCheckIn]: 'Реєстрація пацієнта',
    [BrightChartStrings.FrontDesk_PatientRegistration]: 'Запис пацієнта',

    // ── Billing Workspace ──────────────────────────────────────────────────
    [BrightChartStrings.BillingWS_Title]: 'Рахунки',
    [BrightChartStrings.BillingWS_UnbilledEncounters]: 'Невиставлені візити',
    [BrightChartStrings.BillingWS_PendingClaims]: 'Очікувані претензії',
    [BrightChartStrings.BillingWS_DeniedClaims]: 'Відхилені претензії',
    [BrightChartStrings.BillingWS_TodaysPayments]: 'Платежі за сьогодні',
    [BrightChartStrings.BillingWS_ClaimTracking]: 'Відстеження претензій',
    [BrightChartStrings.BillingWS_PaymentPosting]: 'Реєстрація платежів',

    // ── Admin Workspace ────────────────────────────────────────────────────
    [BrightChartStrings.Admin_UserManagement]: 'Управління користувачами',
    [BrightChartStrings.Admin_RoleConfiguration]: 'Налаштування ролей',
    [BrightChartStrings.Admin_AuditLog]: 'Журнал аудиту',
    [BrightChartStrings.Admin_SpecialtyConfiguration]:
      'Налаштування спеціальності',
    [BrightChartStrings.Admin_PatientSearch]: 'Пошук пацієнтів',

    // ── Common Table Headers / Labels ──────────────────────────────────────
    [BrightChartStrings.Common_Date]: 'Дата',
    [BrightChartStrings.Common_Type]: 'Тип',
    [BrightChartStrings.Common_Status]: 'Статус',
    [BrightChartStrings.Common_Description]: 'Опис',
    [BrightChartStrings.Common_Amount]: 'Сума',
    [BrightChartStrings.Common_Balance]: 'Залишок',
    [BrightChartStrings.Common_Name]: "Ім'я",
    [BrightChartStrings.Common_Actions]: 'Дії',
    [BrightChartStrings.Common_Priority]: 'Пріоритет',
    [BrightChartStrings.Common_Category]: 'Категорія',
    [BrightChartStrings.Common_Patient]: 'Пацієнт',
    [BrightChartStrings.Common_Provider]: 'Постачальник',
    [BrightChartStrings.Common_Service]: 'Послуга',
    [BrightChartStrings.Common_Notes]: 'Нотатки',
    [BrightChartStrings.Common_From]: 'Від',
    [BrightChartStrings.Common_To]: 'До',

    // ── Common Buttons / Actions ───────────────────────────────────────────
    [BrightChartStrings.Common_Save]: 'Зберегти',
    [BrightChartStrings.Common_Cancel]: 'Скасувати',
    [BrightChartStrings.Common_Search]: 'Пошук',
    [BrightChartStrings.Common_Add]: 'Додати',
    [BrightChartStrings.Common_Remove]: 'Видалити',
    [BrightChartStrings.Common_Submit]: 'Надіслати',
    [BrightChartStrings.Common_Create]: 'Створити',
    [BrightChartStrings.Common_Update]: 'Оновити',
    [BrightChartStrings.Common_Delete]: 'Видалити',
    [BrightChartStrings.Common_Sign]: 'Підписати',
    [BrightChartStrings.Common_Close]: 'Закрити',
    [BrightChartStrings.Common_Back]: 'Назад',
    [BrightChartStrings.Common_Next]: 'Далі',
    [BrightChartStrings.Common_Previous]: 'Попередній',
    [BrightChartStrings.Common_OfferSlot]: 'Запропонувати слот',
    [BrightChartStrings.Common_SelectSlot]: 'Обрати слот',

    // ── Common Empty States ────────────────────────────────────────────────
    [BrightChartStrings.Empty_NoResults]: 'Результатів не знайдено.',
    [BrightChartStrings.Empty_NoDocuments]: 'Документів не знайдено',
    [BrightChartStrings.Empty_NoEncounters]: 'Візитів не знайдено.',
    [BrightChartStrings.Empty_NoOrders]:
      'Жодне призначення не відповідає фільтрам.',
    [BrightChartStrings.Empty_NoLedgerEntries]: 'Записів у книзі не знайдено.',
    [BrightChartStrings.Empty_NoAllergies]: 'Відомих алергій немає',
    [BrightChartStrings.Empty_NoMedications]: 'Медикаментів не зафіксовано.',
    [BrightChartStrings.Empty_NoConditions]: 'Захворювань не зафіксовано.',
    [BrightChartStrings.Empty_NoAppointments]:
      'Немає записів або доступних слотів.',
    [BrightChartStrings.Empty_NoSlots]: 'Немає доступних слотів.',
    [BrightChartStrings.Empty_NoWaitlist]:
      'Немає пацієнтів у списку очікування.',
    [BrightChartStrings.Empty_NoPermission]:
      'У вас немає дозволу переглядати пацієнтів.',

    // ── Form Labels ────────────────────────────────────────────────────────
    [BrightChartStrings.Form_GivenName]: "Ім'я",
    [BrightChartStrings.Form_FamilyName]: 'Прізвище',
    [BrightChartStrings.Form_BirthDate]: 'Дата народження',
    [BrightChartStrings.Form_Gender]: 'Стать',
    [BrightChartStrings.Form_SelectGender]: 'Оберіть стать',
    [BrightChartStrings.Form_Identifier]: 'Ідентифікатор',
    [BrightChartStrings.Form_Contact]: 'Контакт',
    [BrightChartStrings.Form_Address]: 'Адреса',
    [BrightChartStrings.Form_CreatePatient]: 'Створити пацієнта',
    [BrightChartStrings.Form_UpdatePatient]: 'Оновити пацієнта',
    [BrightChartStrings.Form_CreateOrder]: 'Створити призначення',
    [BrightChartStrings.Form_UpdateOrder]: 'Оновити призначення',
    [BrightChartStrings.Form_CreatePrescription]: 'Створити рецепт',
    [BrightChartStrings.Form_UpdatePrescription]: 'Оновити рецепт',
    [BrightChartStrings.Form_CreateObservation]: 'Створити спостереження',
    [BrightChartStrings.Form_UpdateObservation]: 'Оновити спостереження',
    [BrightChartStrings.Form_BookAppointment]: 'Записатися на прийом',
    [BrightChartStrings.Form_RescheduleAppointment]: 'Перенести запис',
    [BrightChartStrings.Form_CheckIn]: 'Зареєструвати',
    [BrightChartStrings.Form_UpdateEncounter]: 'Оновити візит',
    [BrightChartStrings.Form_SubmitClaim]: 'Надіслати претензію',
    [BrightChartStrings.Form_FinalizeSuperbill]: 'Завершити суперрахунок',

    // ── Allergy List ───────────────────────────────────────────────────────
    [BrightChartStrings.AllergyList_Title]: 'Алергії та непереносимості',
    [BrightChartStrings.AllergyList_AddNew]: '+ Додати',

    // ── Condition List ─────────────────────────────────────────────────────
    [BrightChartStrings.ConditionList_Title]: 'Захворювання / Проблеми',
    [BrightChartStrings.ConditionList_AddNew]: '+ Додати',

    // ── Medication List ────────────────────────────────────────────────────
    [BrightChartStrings.MedicationList_Title]: 'Медикаменти',
    [BrightChartStrings.MedicationList_ActiveMedications]:
      'Активні медикаменти',
    [BrightChartStrings.MedicationList_Completed]: 'Завершено',
    [BrightChartStrings.MedicationList_Stopped]: 'Зупинено',
    [BrightChartStrings.MedicationList_Other]: 'Інше',

    // ── Encounter List ─────────────────────────────────────────────────────
    [BrightChartStrings.EncounterList_StatusFilter]: 'Статус:',
    [BrightChartStrings.EncounterList_ClassFilter]: 'Клас:',

    // ── Document List / Viewer ─────────────────────────────────────────────
    [BrightChartStrings.DocumentViewer_NoDocument]:
      'Немає документа для відображення',
    [BrightChartStrings.DocumentViewer_ExplanationOfBenefit]: 'Пояснення пільг',

    // ── Ledger ─────────────────────────────────────────────────────────────
    [BrightChartStrings.Ledger_CurrentBalance]: 'Поточний залишок:',

    // ── Waitlist ───────────────────────────────────────────────────────────
    [BrightChartStrings.Waitlist_Title]: 'Менеджер списку очікування',
    [BrightChartStrings.Waitlist_WaitTime]: 'Час очікування',
    [BrightChartStrings.Waitlist_PreferredDates]: 'Бажані дати',
    [BrightChartStrings.Waitlist_PreferredProvider]: 'Бажаний постачальник',

    // ── Schedule ───────────────────────────────────────────────────────────
    [BrightChartStrings.Schedule_Day]: 'День',
    [BrightChartStrings.Schedule_Week]: 'Тиждень',
    [BrightChartStrings.Schedule_Month]: 'Місяць',
    [BrightChartStrings.Schedule_Available]: 'Доступно',

    // ── Clinical Note Editor ───────────────────────────────────────────────
    [BrightChartStrings.NoteEditor_EmptyState]:
      'Не надано композицію або шаблон. Оберіть шаблон, щоб розпочати нову нотатку.',

    // ── Insurance ──────────────────────────────────────────────────────────
    [BrightChartStrings.Insurance_PlanType]: 'Тип плану',
    [BrightChartStrings.Insurance_GroupNumber]: 'Номер групи',
    [BrightChartStrings.Insurance_MemberID]: 'Номер учасника',
    [BrightChartStrings.Insurance_SubscriberName]: "Ім'я підписника",
    [BrightChartStrings.Insurance_Relationship]: 'Відношення',
    [BrightChartStrings.Insurance_PayerName]: "Ім'я платника",
    [BrightChartStrings.Insurance_Eligibility]: 'Страхова придатність',

    // ── Clinical Timeline ──────────────────────────────────────────────────
    [BrightChartStrings.ClinicalTimeline_AriaLabel]: 'Клінічна хронологія',
    [BrightChartStrings.ClinicalTimeline_FilterAriaLabel]:
      'Фільтри за типом ресурсу',
    [BrightChartStrings.ClinicalTimeline_Empty]: 'Клінічні дані відсутні.',
    [BrightChartStrings.ClinicalTimeline_Unknown]: 'Невідомо',
    [BrightChartStrings.ClinicalTimeline_NoDate]: 'Без дати',

    // ── Note Template Selector ─────────────────────────────────────────────
    [BrightChartStrings.NoteTemplateSelector_AriaLabel]:
      'Вибір шаблону нотатки',
    [BrightChartStrings.NoteTemplateSelector_Empty]: 'Немає доступних шаблонів',
    [BrightChartStrings.NoteTemplateSelector_GroupAriaTemplate]:
      'Тип документа {CODE}',
    [BrightChartStrings.NoteTemplateSelector_SelectTemplate]:
      'Обрати шаблон: {NAME}',

    // ── Encounter Workflow Board ───────────────────────────────────────────
    [BrightChartStrings.WorkflowBoard_AriaLabel]:
      'Дошка робочого процесу візитів',
    [BrightChartStrings.WorkflowBoard_UnknownPatient]: 'Невідомий пацієнт',
    [BrightChartStrings.WorkflowBoard_NoEncounters]: 'Немає візитів',
    [BrightChartStrings.WorkflowBoard_ColumnAriaTemplate]: 'Стовпець {NAME}',

    // ── Schedule Editor ────────────────────────────────────────────────────
    [BrightChartStrings.ScheduleEditor_Title]: 'Редактор розкладу',
    [BrightChartStrings.ScheduleEditor_AriaLabel]:
      'Редактор доступності розкладу',
    [BrightChartStrings.ScheduleEditor_AddBlockLegend]:
      'Додати блок доступності',
    [BrightChartStrings.ScheduleEditor_DayLabel]: 'День',
    [BrightChartStrings.ScheduleEditor_StartTime]: 'Час початку',
    [BrightChartStrings.ScheduleEditor_EndTime]: 'Час закінчення',
    [BrightChartStrings.ScheduleEditor_RecurringWeekly]: 'Щотижневе повторення',
    [BrightChartStrings.ScheduleEditor_AddBlock]: 'Додати блок',
    [BrightChartStrings.ScheduleEditor_StartBeforeEnd]:
      'Час початку повинен бути раніше часу закінчення',
    [BrightChartStrings.ScheduleEditor_NoAvailability]: 'Немає доступності',
    [BrightChartStrings.ScheduleEditor_Recurring]: 'Повторюваний',
    [BrightChartStrings.ScheduleEditor_GridAriaLabel]:
      'Тижнева сітка доступності',
    [BrightChartStrings.ScheduleEditor_SaveSchedule]: 'Зберегти розклад',
    [BrightChartStrings.ScheduleEditor_Day_Monday]: 'Понеділок',
    [BrightChartStrings.ScheduleEditor_Day_Tuesday]: 'Вівторок',
    [BrightChartStrings.ScheduleEditor_Day_Wednesday]: 'Середа',
    [BrightChartStrings.ScheduleEditor_Day_Thursday]: 'Четвер',
    [BrightChartStrings.ScheduleEditor_Day_Friday]: "П'ятниця",
    [BrightChartStrings.ScheduleEditor_Day_Saturday]: 'Субота',
    [BrightChartStrings.ScheduleEditor_Day_Sunday]: 'Неділя',

    // ── Connectivity Indicator ─────────────────────────────────────────────
    [BrightChartStrings.Connectivity_Online]: 'Онлайн',
    [BrightChartStrings.Connectivity_Offline]: 'Офлайн',
    [BrightChartStrings.Connectivity_StatusTemplate]:
      "Стан з'єднання: {STATUS}",

    // ── Notification Bell ──────────────────────────────────────────────────
    [BrightChartStrings.NotificationBell_AriaLabel]: 'Сповіщення',
    [BrightChartStrings.NotificationBell_UnreadTemplate]:
      'Сповіщення, {COUNT} непрочитаних',

    // ── Role Switcher ──────────────────────────────────────────────────────
    [BrightChartStrings.RoleSwitcher_AriaLabel]: 'Змінити медичну роль',
    [BrightChartStrings.RoleSwitcher_MenuAriaLabel]: 'Вибір медичної ролі',

    // ── Patient Header ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientHeader_AriaLabel]: 'Інформація про пацієнта',
    [BrightChartStrings.PatientHeader_Unknown]: 'Невідомо',
    [BrightChartStrings.PatientHeader_MRN]: 'MRN:',
    [BrightChartStrings.PatientHeader_NA]: 'Н/Д',
    [BrightChartStrings.PatientHeader_AllergyTemplate]: 'Алергія: {NAME}',

    // ── Navigation Labels ──────────────────────────────────────────────────
    [BrightChartStrings.Nav_Patients]: 'Пацієнти',
    [BrightChartStrings.Nav_Clients]: 'Клієнти',
    [BrightChartStrings.Nav_Encounters]: 'Візити',
    [BrightChartStrings.Nav_Schedule]: 'Розклад',
    [BrightChartStrings.Nav_Inbox]: 'Вхідні',
    [BrightChartStrings.Nav_OperatoryView]: 'Вигляд операційної',
    [BrightChartStrings.Nav_TreatmentPlans]: 'Плани лікування',
    [BrightChartStrings.Nav_SpeciesFilter]: 'Фільтр за видами',
    [BrightChartStrings.Nav_FarmCalls]: 'Виїзди на ферму',
    [BrightChartStrings.Nav_MyHealth]: "Моє здоров'я",
    [BrightChartStrings.Nav_Appointments]: 'Записи',
    [BrightChartStrings.Nav_TestResults]: 'Результати аналізів',
    [BrightChartStrings.Nav_BillsPayments]: 'Рахунки та платежі',
    [BrightChartStrings.Nav_CheckIn]: 'Реєстрація',
    [BrightChartStrings.Nav_Waitlist]: 'Список очікування',
    [BrightChartStrings.Nav_Registration]: 'Реєстрація пацієнта',
    [BrightChartStrings.Nav_Insurance]: 'Страхування',
    [BrightChartStrings.Nav_Superbills]: 'Суперрахунки',
    [BrightChartStrings.Nav_Claims]: 'Претензії',
    [BrightChartStrings.Nav_ClaimTracking]: 'Відстеження претензій',
    [BrightChartStrings.Nav_Payments]: 'Платежі',
    [BrightChartStrings.Nav_PatientLedger]: 'Книга обліку пацієнта',
    [BrightChartStrings.Nav_FeeSchedules]: 'Тарифи',
    [BrightChartStrings.Nav_Users]: 'Користувачі',
    [BrightChartStrings.Nav_Roles]: 'Ролі',
    [BrightChartStrings.Nav_AuditLog]: 'Журнал аудиту',
    [BrightChartStrings.Nav_SpecialtyConfig]: 'Налаштування спеціальності',
    [BrightChartStrings.Nav_Settings]: 'Налаштування',
    [BrightChartStrings.Nav_Organizations]: 'Організації',
    [BrightChartStrings.Nav_Clinician]: 'Клініцист',
    [BrightChartStrings.Nav_PatientPortal]: 'Портал пацієнта',
    [BrightChartStrings.Nav_Billing]: 'Виставлення рахунків',

    // ── Sidebar ────────────────────────────────────────────────────────────
    [BrightChartStrings.Sidebar_ExpandAriaLabel]: 'Розгорнути бічну панель',
    [BrightChartStrings.Sidebar_CollapseAriaLabel]: 'Згорнути бічну панель',
    [BrightChartStrings.Sidebar_NavAriaLabel]: 'Навігація BrightChart',

    [BrightChartStrings.BottomNav_AriaLabel]: 'Мобільна навігація BrightChart',
    [BrightChartStrings.Layout_NavAriaTemplate]: 'Навігація {NAME}',
  };
