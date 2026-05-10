import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChartStringKey,
  BrightChartStrings,
} from '../../enumerations/BrightChartStrings';

export const BrightChartJapaneseStrings: ComponentStrings<BrightChartStringKey> =
  {
    // ── Menu / Navigation ──────────────────────────────────────────────
    [BrightChartStrings.MenuLabel]: 'BrightChart',
    [BrightChartStrings.ChartSectionsLabel]: 'チャートセクション',
    [BrightChartStrings.Nav_Conversations]: '会話',
    [BrightChartStrings.Nav_Groups]: 'グループ',
    [BrightChartStrings.Nav_Channels]: 'チャンネル',

    // ── Shell / Notifications ──────────────────────────────────────────
    [BrightChartStrings.Notification_Type_Result]: '結果',
    [BrightChartStrings.Notification_Type_Note]: 'ノート',
    [BrightChartStrings.Notification_Type_Appointment]: '予約',
    [BrightChartStrings.Notification_Type_Claim]: '請求',
    [BrightChartStrings.Notification_Type_Message]: 'メッセージ',
    [BrightChartStrings.Notification_Type_System]: 'システム',
    [BrightChartStrings.Notification_Priority_Normal]: '通常',
    [BrightChartStrings.Notification_Priority_Urgent]: '緊急',

    // ── Roles ──────────────────────────────────────────────────────────
    [BrightChartStrings.Role_Physician]: '医師',
    [BrightChartStrings.Role_RegisteredNurse]: '看護師',
    [BrightChartStrings.Role_MedicalAssistant]: '医療助手',
    [BrightChartStrings.Role_Patient]: '患者',
    [BrightChartStrings.Role_ClinicalAdministrator]: '臨床管理者',
    [BrightChartStrings.Role_Dentist]: '歯科医',
    [BrightChartStrings.Role_Veterinarian]: '獣医',

    // ── Organization ───────────────────────────────────────────────────
    [BrightChartStrings.Org_EnrollmentMode_Open]: 'オープン',
    [BrightChartStrings.Org_EnrollmentMode_InviteOnly]: '招待制',

    // ── Audit ──────────────────────────────────────────────────────────
    [BrightChartStrings.Audit_Operation_Create]: '作成',
    [BrightChartStrings.Audit_Operation_Read]: '読取',
    [BrightChartStrings.Audit_Operation_Update]: '更新',
    [BrightChartStrings.Audit_Operation_Delete]: '削除',
    [BrightChartStrings.Audit_Operation_Search]: '検索',
    [BrightChartStrings.Audit_Operation_Merge]: '統合',

    // ── FHIR / Patient Identity ──────────────────────────────────────────
    [BrightChartStrings.Gender_Male]: '男性',
    [BrightChartStrings.Gender_Female]: '女性',
    [BrightChartStrings.Gender_Other]: 'その他',
    [BrightChartStrings.Gender_Unknown]: '不明',

    [BrightChartStrings.NameUse_Usual]: '通常',
    [BrightChartStrings.NameUse_Official]: '公式',
    [BrightChartStrings.NameUse_Temp]: '一時的',
    [BrightChartStrings.NameUse_Nickname]: 'ニックネーム',
    [BrightChartStrings.NameUse_Anonymous]: '匿名',
    [BrightChartStrings.NameUse_Old]: '旧',
    [BrightChartStrings.NameUse_Maiden]: '旧姓',

    [BrightChartStrings.AddressUse_Home]: '自宅',
    [BrightChartStrings.AddressUse_Work]: '職場',
    [BrightChartStrings.AddressUse_Temp]: '一時的',
    [BrightChartStrings.AddressUse_Old]: '旧',
    [BrightChartStrings.AddressUse_Billing]: '請求先',

    [BrightChartStrings.AddressType_Postal]: '郵便',
    [BrightChartStrings.AddressType_Physical]: '物理',
    [BrightChartStrings.AddressType_Both]: '両方',

    [BrightChartStrings.ContactSystem_Phone]: '電話',
    [BrightChartStrings.ContactSystem_Fax]: 'ファックス',
    [BrightChartStrings.ContactSystem_Email]: 'メール',
    [BrightChartStrings.ContactSystem_Pager]: 'ポケベル',
    [BrightChartStrings.ContactSystem_Url]: 'URL',
    [BrightChartStrings.ContactSystem_Sms]: 'SMS',
    [BrightChartStrings.ContactSystem_Other]: 'その他',

    [BrightChartStrings.ContactUse_Home]: '自宅',
    [BrightChartStrings.ContactUse_Work]: '職場',
    [BrightChartStrings.ContactUse_Temp]: '一時的',
    [BrightChartStrings.ContactUse_Old]: '旧',
    [BrightChartStrings.ContactUse_Mobile]: '携帯',

    [BrightChartStrings.LinkType_ReplacedBy]: '置換先',
    [BrightChartStrings.LinkType_Replaces]: '置換元',
    [BrightChartStrings.LinkType_Refer]: '参照',
    [BrightChartStrings.LinkType_SeeAlso]: '関連項目',

    [BrightChartStrings.IdentifierUse_Usual]: '通常',
    [BrightChartStrings.IdentifierUse_Official]: '公式',
    [BrightChartStrings.IdentifierUse_Temp]: '一時的',
    [BrightChartStrings.IdentifierUse_Secondary]: '二次',
    [BrightChartStrings.IdentifierUse_Old]: '旧',

    // ── Clinical ─────────────────────────────────────────────────────────
    [BrightChartStrings.ObservationStatus_Registered]: '登録済み',
    [BrightChartStrings.ObservationStatus_Preliminary]: '暫定',
    [BrightChartStrings.ObservationStatus_Final]: '最終',
    [BrightChartStrings.ObservationStatus_Amended]: '修正済み',
    [BrightChartStrings.ObservationStatus_Corrected]: '訂正済み',
    [BrightChartStrings.ObservationStatus_Cancelled]: '取消済み',
    [BrightChartStrings.ObservationStatus_EnteredInError]: '誤入力',
    [BrightChartStrings.ObservationStatus_Unknown]: '不明',

    [BrightChartStrings.ConditionClinical_Active]: '活動中',
    [BrightChartStrings.ConditionClinical_Recurrence]: '再発',
    [BrightChartStrings.ConditionClinical_Relapse]: '再燃',
    [BrightChartStrings.ConditionClinical_Inactive]: '非活動',
    [BrightChartStrings.ConditionClinical_Remission]: '寛解',
    [BrightChartStrings.ConditionClinical_Resolved]: '解決済み',

    [BrightChartStrings.ConditionVerification_Unconfirmed]: '未確認',
    [BrightChartStrings.ConditionVerification_Provisional]: '暫定',
    [BrightChartStrings.ConditionVerification_Differential]: '鑑別',
    [BrightChartStrings.ConditionVerification_Confirmed]: '確認済み',
    [BrightChartStrings.ConditionVerification_Refuted]: '否定',
    [BrightChartStrings.ConditionVerification_EnteredInError]: '誤入力',

    [BrightChartStrings.AllergyType_Allergy]: 'アレルギー',
    [BrightChartStrings.AllergyType_Intolerance]: '不耐性',

    [BrightChartStrings.AllergyCategory_Food]: '食物',
    [BrightChartStrings.AllergyCategory_Medication]: '薬剤',
    [BrightChartStrings.AllergyCategory_Environment]: '環境',
    [BrightChartStrings.AllergyCategory_Biologic]: '生物学的',

    [BrightChartStrings.AllergyCriticality_Low]: '低',
    [BrightChartStrings.AllergyCriticality_High]: '高',
    [BrightChartStrings.AllergyCriticality_UnableToAssess]: '評価不能',

    [BrightChartStrings.AllergySeverity_Mild]: '軽度',
    [BrightChartStrings.AllergySeverity_Moderate]: '中等度',
    [BrightChartStrings.AllergySeverity_Severe]: '重度',

    [BrightChartStrings.MedicationStatus_Active]: '活動中',
    [BrightChartStrings.MedicationStatus_Inactive]: '非活動',
    [BrightChartStrings.MedicationStatus_EnteredInError]: '誤入力',

    [BrightChartStrings.MedStatementStatus_Active]: '活動中',
    [BrightChartStrings.MedStatementStatus_Completed]: '完了',
    [BrightChartStrings.MedStatementStatus_EnteredInError]: '誤入力',
    [BrightChartStrings.MedStatementStatus_Intended]: '予定',
    [BrightChartStrings.MedStatementStatus_Stopped]: '中止',
    [BrightChartStrings.MedStatementStatus_OnHold]: '保留中',
    [BrightChartStrings.MedStatementStatus_Unknown]: '不明',
    [BrightChartStrings.MedStatementStatus_NotTaken]: '未服用',

    [BrightChartStrings.ProcedureStatus_Preparation]: '準備中',
    [BrightChartStrings.ProcedureStatus_InProgress]: '進行中',
    [BrightChartStrings.ProcedureStatus_NotDone]: '未実施',
    [BrightChartStrings.ProcedureStatus_OnHold]: '保留中',
    [BrightChartStrings.ProcedureStatus_Stopped]: '中止',
    [BrightChartStrings.ProcedureStatus_Completed]: '完了',
    [BrightChartStrings.ProcedureStatus_EnteredInError]: '誤入力',
    [BrightChartStrings.ProcedureStatus_Unknown]: '不明',

    // ── Encounter ────────────────────────────────────────────────────────
    [BrightChartStrings.EncounterStatus_Planned]: '計画済み',
    [BrightChartStrings.EncounterStatus_Arrived]: '到着',
    [BrightChartStrings.EncounterStatus_Triaged]: 'トリアージ済み',
    [BrightChartStrings.EncounterStatus_InProgress]: '進行中',
    [BrightChartStrings.EncounterStatus_OnLeave]: '外出中',
    [BrightChartStrings.EncounterStatus_Finished]: '終了',
    [BrightChartStrings.EncounterStatus_Cancelled]: '取消済み',
    [BrightChartStrings.EncounterStatus_EnteredInError]: '誤入力',
    [BrightChartStrings.EncounterStatus_Unknown]: '不明',

    [BrightChartStrings.EncounterLocationStatus_Planned]: '計画済み',
    [BrightChartStrings.EncounterLocationStatus_Active]: '活動中',
    [BrightChartStrings.EncounterLocationStatus_Reserved]: '予約済み',
    [BrightChartStrings.EncounterLocationStatus_Completed]: '完了',

    [BrightChartStrings.EncounterClass_Inpatient]: '入院',
    [BrightChartStrings.EncounterClass_Ambulatory]: '外来',
    [BrightChartStrings.EncounterClass_Emergency]: '救急',
    [BrightChartStrings.EncounterClass_HomeHealth]: '在宅医療',
    [BrightChartStrings.EncounterClass_Virtual]: 'バーチャル',
    [BrightChartStrings.EncounterClass_Field]: 'フィールド',
    [BrightChartStrings.EncounterClass_ShortStay]: '短期滞在',
    [BrightChartStrings.EncounterClass_Observation]: '観察',
    [BrightChartStrings.EncounterClass_PreAdmission]: '入院前',

    [BrightChartStrings.DiagnosisRole_Admission]: '入院時診断',
    [BrightChartStrings.DiagnosisRole_Discharge]: '退院時診断',
    [BrightChartStrings.DiagnosisRole_ChiefComplaint]: '主訴',
    [BrightChartStrings.DiagnosisRole_Comorbidity]: '併存疾患',
    [BrightChartStrings.DiagnosisRole_PreOp]: '術前診断',
    [BrightChartStrings.DiagnosisRole_PostOp]: '術後診断',
    [BrightChartStrings.DiagnosisRole_Billing]: '請求診断',

    // ── Documentation ────────────────────────────────────────────────────
    [BrightChartStrings.CompositionStatus_Preliminary]: '暫定',
    [BrightChartStrings.CompositionStatus_Final]: '最終',
    [BrightChartStrings.CompositionStatus_Amended]: '修正済み',
    [BrightChartStrings.CompositionStatus_EnteredInError]: '誤入力',

    [BrightChartStrings.DocRefStatus_Current]: '現行',
    [BrightChartStrings.DocRefStatus_Superseded]: '置換済み',
    [BrightChartStrings.DocRefStatus_EnteredInError]: '誤入力',

    [BrightChartStrings.AttestationMode_Personal]: '個人',
    [BrightChartStrings.AttestationMode_Professional]: '専門',
    [BrightChartStrings.AttestationMode_Legal]: '法的',
    [BrightChartStrings.AttestationMode_Official]: '公式',

    [BrightChartStrings.DocRelationship_Replaces]: '置換',
    [BrightChartStrings.DocRelationship_Transforms]: '変換',
    [BrightChartStrings.DocRelationship_Signs]: '署名',
    [BrightChartStrings.DocRelationship_Appends]: '追加',

    // ── Note Templates ───────────────────────────────────────────────────
    [BrightChartStrings.Template_SOAPNote_Name]: 'SOAPノート',
    [BrightChartStrings.Template_SOAPNote_Description]:
      '外来および入院診療で使用される標準的な主観的、客観的、評価、計画の形式。',
    [BrightChartStrings.Template_SOAPNote_Subjective]: '主観的',
    [BrightChartStrings.Template_SOAPNote_Objective]: '客観的',
    [BrightChartStrings.Template_SOAPNote_Assessment]: '評価',
    [BrightChartStrings.Template_SOAPNote_Plan]: '計画',

    [BrightChartStrings.Template_HP_Name]: '病歴と身体所見',
    [BrightChartStrings.Template_HP_Description]:
      '入院および新規診察のための包括的な初期評価形式。',
    [BrightChartStrings.Template_HP_ChiefComplaint]: '主訴',
    [BrightChartStrings.Template_HP_HPI]: '現病歴',
    [BrightChartStrings.Template_HP_PastMedicalHistory]: '既往歴',
    [BrightChartStrings.Template_HP_ReviewOfSystems]: '系統的レビュー',
    [BrightChartStrings.Template_HP_PhysicalExam]: '身体診察',
    [BrightChartStrings.Template_HP_Assessment]: '評価',
    [BrightChartStrings.Template_HP_Plan]: '計画',

    [BrightChartStrings.Template_Discharge_Name]: '退院サマリー',
    [BrightChartStrings.Template_Discharge_Description]:
      '入院経過、診断、経過および退院計画を記録するための標準形式。',
    [BrightChartStrings.Template_Discharge_AdmissionDiagnosis]: '入院時診断',
    [BrightChartStrings.Template_Discharge_HospitalCourse]: '入院経過',
    [BrightChartStrings.Template_Discharge_DischargeDiagnosis]: '退院時診断',
    [BrightChartStrings.Template_Discharge_DischargeMedications]: '退院時処方',
    [BrightChartStrings.Template_Discharge_FollowUp]: 'フォローアップ指示',

    [BrightChartStrings.Template_Procedure_Name]: '処置記録',
    [BrightChartStrings.Template_Procedure_Description]:
      '臨床的または外科的処置を記録するための標準形式。',
    [BrightChartStrings.Template_Procedure_Indication]: '適応',
    [BrightChartStrings.Template_Procedure_ProcedureDescription]: '処置内容',
    [BrightChartStrings.Template_Procedure_Findings]: '所見',
    [BrightChartStrings.Template_Procedure_Complications]: '合併症',
    [BrightChartStrings.Template_Procedure_PostProcedurePlan]: '処置後計画',

    // ── LOINC Document Types ─────────────────────────────────────────────
    [BrightChartStrings.DocType_ConsultationNote]: 'コンサルテーションノート',
    [BrightChartStrings.DocType_DischargeSummary]: '退院サマリー',
    [BrightChartStrings.DocType_HistoryAndPhysical]: '病歴と身体所見',
    [BrightChartStrings.DocType_ProgressNote]: '経過記録',
    [BrightChartStrings.DocType_ProcedureNote]: '処置記録',
    [BrightChartStrings.DocType_OperativeNote]: '手術記録',
    [BrightChartStrings.DocType_NurseNote]: '看護記録',
    [BrightChartStrings.DocType_ReferralNote]: '紹介状',
    [BrightChartStrings.DocType_TransferSummary]: '転院サマリー',

    // ── Orders & Results ─────────────────────────────────────────────────
    [BrightChartStrings.ServiceRequestStatus_Draft]: '下書き',
    [BrightChartStrings.ServiceRequestStatus_Active]: '活動中',
    [BrightChartStrings.ServiceRequestStatus_OnHold]: '保留中',
    [BrightChartStrings.ServiceRequestStatus_Revoked]: '取消',
    [BrightChartStrings.ServiceRequestStatus_Completed]: '完了',
    [BrightChartStrings.ServiceRequestStatus_EnteredInError]: '誤入力',
    [BrightChartStrings.ServiceRequestStatus_Unknown]: '不明',

    [BrightChartStrings.ServiceRequestIntent_Proposal]: '提案',
    [BrightChartStrings.ServiceRequestIntent_Plan]: '計画',
    [BrightChartStrings.ServiceRequestIntent_Directive]: '指示',
    [BrightChartStrings.ServiceRequestIntent_Order]: 'オーダー',
    [BrightChartStrings.ServiceRequestIntent_OriginalOrder]: '元オーダー',
    [BrightChartStrings.ServiceRequestIntent_ReflexOrder]:
      'リフレックスオーダー',
    [BrightChartStrings.ServiceRequestIntent_FillerOrder]: 'フィラーオーダー',
    [BrightChartStrings.ServiceRequestIntent_InstanceOrder]:
      'インスタンスオーダー',
    [BrightChartStrings.ServiceRequestIntent_Option]: 'オプション',

    [BrightChartStrings.MedRequestStatus_Active]: '活動中',
    [BrightChartStrings.MedRequestStatus_OnHold]: '保留中',
    [BrightChartStrings.MedRequestStatus_Cancelled]: '取消済み',
    [BrightChartStrings.MedRequestStatus_Completed]: '完了',
    [BrightChartStrings.MedRequestStatus_EnteredInError]: '誤入力',
    [BrightChartStrings.MedRequestStatus_Stopped]: '中止',
    [BrightChartStrings.MedRequestStatus_Draft]: '下書き',
    [BrightChartStrings.MedRequestStatus_Unknown]: '不明',

    [BrightChartStrings.MedRequestIntent_Proposal]: '提案',
    [BrightChartStrings.MedRequestIntent_Plan]: '計画',
    [BrightChartStrings.MedRequestIntent_Order]: 'オーダー',
    [BrightChartStrings.MedRequestIntent_OriginalOrder]: '元オーダー',
    [BrightChartStrings.MedRequestIntent_ReflexOrder]: 'リフレックスオーダー',
    [BrightChartStrings.MedRequestIntent_FillerOrder]: 'フィラーオーダー',
    [BrightChartStrings.MedRequestIntent_InstanceOrder]: 'インスタンスオーダー',
    [BrightChartStrings.MedRequestIntent_Option]: 'オプション',

    [BrightChartStrings.DiagnosticReportStatus_Registered]: '登録済み',
    [BrightChartStrings.DiagnosticReportStatus_Partial]: '部分的',
    [BrightChartStrings.DiagnosticReportStatus_Preliminary]: '暫定',
    [BrightChartStrings.DiagnosticReportStatus_Final]: '最終',
    [BrightChartStrings.DiagnosticReportStatus_Amended]: '修正済み',
    [BrightChartStrings.DiagnosticReportStatus_Corrected]: '訂正済み',
    [BrightChartStrings.DiagnosticReportStatus_Appended]: '追加済み',
    [BrightChartStrings.DiagnosticReportStatus_Cancelled]: '取消済み',
    [BrightChartStrings.DiagnosticReportStatus_EnteredInError]: '誤入力',
    [BrightChartStrings.DiagnosticReportStatus_Unknown]: '不明',

    [BrightChartStrings.RequestPriority_Routine]: 'ルーチン',
    [BrightChartStrings.RequestPriority_Urgent]: '緊急',
    [BrightChartStrings.RequestPriority_Asap]: 'できるだけ早く',
    [BrightChartStrings.RequestPriority_Stat]: '至急',

    // ── Billing ──────────────────────────────────────────────────────────
    [BrightChartStrings.CoverageStatus_Active]: '活動中',
    [BrightChartStrings.CoverageStatus_Cancelled]: '取消済み',
    [BrightChartStrings.CoverageStatus_Draft]: '下書き',
    [BrightChartStrings.CoverageStatus_EnteredInError]: '誤入力',

    [BrightChartStrings.ClaimStatus_Active]: '活動中',
    [BrightChartStrings.ClaimStatus_Cancelled]: '取消済み',
    [BrightChartStrings.ClaimStatus_Draft]: '下書き',
    [BrightChartStrings.ClaimStatus_EnteredInError]: '誤入力',

    [BrightChartStrings.ClaimUse_Claim]: '請求',
    [BrightChartStrings.ClaimUse_Preauthorization]: '事前承認',
    [BrightChartStrings.ClaimUse_Predetermination]: '事前決定',

    [BrightChartStrings.EOBStatus_Active]: '活動中',
    [BrightChartStrings.EOBStatus_Cancelled]: '取消済み',
    [BrightChartStrings.EOBStatus_Draft]: '下書き',
    [BrightChartStrings.EOBStatus_EnteredInError]: '誤入力',

    [BrightChartStrings.RemittanceOutcome_Queued]: 'キュー待ち',
    [BrightChartStrings.RemittanceOutcome_Complete]: '完了',
    [BrightChartStrings.RemittanceOutcome_Error]: 'エラー',
    [BrightChartStrings.RemittanceOutcome_Partial]: '部分的',

    [BrightChartStrings.EligibilityPurpose_AuthRequirements]: '承認要件',
    [BrightChartStrings.EligibilityPurpose_Benefits]: '給付',
    [BrightChartStrings.EligibilityPurpose_Discovery]: '調査',
    [BrightChartStrings.EligibilityPurpose_Validation]: '検証',

    [BrightChartStrings.SuperbillStatus_Draft]: '下書き',
    [BrightChartStrings.SuperbillStatus_Finalized]: '確定',
    [BrightChartStrings.SuperbillStatus_Billed]: '請求済み',

    [BrightChartStrings.LedgerEntryType_Charge]: '請求',
    [BrightChartStrings.LedgerEntryType_Payment]: '支払い',
    [BrightChartStrings.LedgerEntryType_Adjustment]: '調整',
    [BrightChartStrings.LedgerEntryType_Refund]: '返金',
    [BrightChartStrings.LedgerEntryType_WriteOff]: '償却',

    [BrightChartStrings.ClaimType_Institutional]: '施設',
    [BrightChartStrings.ClaimType_Oral]: '歯科',
    [BrightChartStrings.ClaimType_Pharmacy]: '薬局',
    [BrightChartStrings.ClaimType_Professional]: '専門',
    [BrightChartStrings.ClaimType_Vision]: '視力',

    // ── Scheduling ───────────────────────────────────────────────────────
    [BrightChartStrings.AppointmentStatus_Proposed]: '提案',
    [BrightChartStrings.AppointmentStatus_Pending]: '保留',
    [BrightChartStrings.AppointmentStatus_Booked]: '予約済み',
    [BrightChartStrings.AppointmentStatus_Arrived]: '到着',
    [BrightChartStrings.AppointmentStatus_Fulfilled]: '完了',
    [BrightChartStrings.AppointmentStatus_Cancelled]: '取消済み',
    [BrightChartStrings.AppointmentStatus_Noshow]: '無断欠席',
    [BrightChartStrings.AppointmentStatus_EnteredInError]: '誤入力',
    [BrightChartStrings.AppointmentStatus_CheckedIn]: '受付済み',
    [BrightChartStrings.AppointmentStatus_Waitlist]: '待機リスト',

    [BrightChartStrings.SlotStatus_Busy]: '使用中',
    [BrightChartStrings.SlotStatus_Free]: '空き',
    [BrightChartStrings.SlotStatus_BusyUnavailable]: '使用中（利用不可）',
    [BrightChartStrings.SlotStatus_BusyTentative]: '使用中（仮）',
    [BrightChartStrings.SlotStatus_EnteredInError]: '誤入力',

    [BrightChartStrings.ParticipantRequired_Required]: '必須',
    [BrightChartStrings.ParticipantRequired_Optional]: '任意',
    [BrightChartStrings.ParticipantRequired_InformationOnly]: '情報のみ',

    [BrightChartStrings.ParticipationStatus_Accepted]: '承諾',
    [BrightChartStrings.ParticipationStatus_Declined]: '辞退',
    [BrightChartStrings.ParticipationStatus_Tentative]: '仮',
    [BrightChartStrings.ParticipationStatus_NeedsAction]: '要対応',

    [BrightChartStrings.WaitlistStatus_Waiting]: '待機中',
    [BrightChartStrings.WaitlistStatus_Offered]: '提案済み',
    [BrightChartStrings.WaitlistStatus_Booked]: '予約済み',
    [BrightChartStrings.WaitlistStatus_Cancelled]: '取消済み',
    [BrightChartStrings.WaitlistStatus_Expired]: '期限切れ',

    [BrightChartStrings.ReminderType_Sms]: 'SMS',
    [BrightChartStrings.ReminderType_Email]: 'メール',
    [BrightChartStrings.ReminderType_Push]: 'プッシュ通知',
    [BrightChartStrings.ReminderType_Phone]: '電話',

    [BrightChartStrings.ReminderStatus_Scheduled]: '予定',
    [BrightChartStrings.ReminderStatus_Sent]: '送信済み',
    [BrightChartStrings.ReminderStatus_Failed]: '失敗',
    [BrightChartStrings.ReminderStatus_Cancelled]: '取消済み',

    // ── Offline / Sync ───────────────────────────────────────────────────
    [BrightChartStrings.Sync_Conflict]: '同期の競合',
    [BrightChartStrings.Sync_Success]: '同期成功',

    // ── FHIR OperationOutcome Severity ───────────────────────────────────
    [BrightChartStrings.IssueSeverity_Fatal]: '致命的',
    [BrightChartStrings.IssueSeverity_Error]: 'エラー',
    [BrightChartStrings.IssueSeverity_Warning]: '警告',
    [BrightChartStrings.IssueSeverity_Information]: '情報',

    // ── Narrative Status ─────────────────────────────────────────────────
    [BrightChartStrings.NarrativeStatus_Generated]: '生成済み',
    [BrightChartStrings.NarrativeStatus_Extensions]: '拡張',
    [BrightChartStrings.NarrativeStatus_Additional]: '追加',
    [BrightChartStrings.NarrativeStatus_Empty]: '空',

    // ── Shell / UI ─────────────────────────────────────────────────────────
    [BrightChartStrings.Shell_Notifications]: '通知',
    [BrightChartStrings.Shell_MarkAllRead]: 'すべて既読にする',
    [BrightChartStrings.Shell_NoNotifications]: '通知なし',
    [BrightChartStrings.Shell_AccessDenied]: 'アクセス拒否',
    [BrightChartStrings.Shell_AccessDeniedMessage]:
      'このエリアにアクセスする権限がありません。',
    [BrightChartStrings.Shell_Loading]: '読み込み中...',

    // ── Patient Chart Tabs ─────────────────────────────────────────────────
    [BrightChartStrings.PatientChart_Title]: '患者カルテ',
    [BrightChartStrings.PatientChart_Summary]: '概要',
    [BrightChartStrings.PatientChart_Problems]: '問題',
    [BrightChartStrings.PatientChart_Medications]: '薬剤',
    [BrightChartStrings.PatientChart_Allergies]: 'アレルギー',
    [BrightChartStrings.PatientChart_Encounters]: '診察',
    [BrightChartStrings.PatientChart_Documents]: '文書',
    [BrightChartStrings.PatientChart_Orders]: 'オーダー',
    [BrightChartStrings.PatientChart_Results]: '結果',
    [BrightChartStrings.PatientChart_Appointments]: '予約',
    [BrightChartStrings.PatientChart_Insurance]: '保険',
    [BrightChartStrings.PatientChart_Billing]: '請求',
    [BrightChartStrings.PatientChart_NoPatientSelected]:
      '患者が選択されていません。',

    // ── Encounter Dashboard ────────────────────────────────────────────────
    [BrightChartStrings.EncounterDashboard_Title]: '本日の診察',
    [BrightChartStrings.EncounterDashboard_Scheduled]: '予定',
    [BrightChartStrings.EncounterDashboard_InProgress]: '進行中',
    [BrightChartStrings.EncounterDashboard_PendingTasks]: '保留中のタスク',

    // ── Clinician Inbox ────────────────────────────────────────────────────
    [BrightChartStrings.ClinicianInbox_Title]: '受信トレイ',
    [BrightChartStrings.ClinicianInbox_PendingResults]: '保留中の結果',
    [BrightChartStrings.ClinicianInbox_UnsignedNotes]: '未署名のノート',
    [BrightChartStrings.ClinicianInbox_Messages]: 'メッセージ',

    // ── Patient Portal ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientPortal_MyHealth]: '私の健康',
    [BrightChartStrings.PatientPortal_Welcome]: 'ようこそ',
    [BrightChartStrings.PatientPortal_WelcomeUser]: 'ようこそ、{NAME}さん',
    [BrightChartStrings.PatientPortal_ViewingRecordsAt]: '{ORG} の記録を閲覧中',
    [BrightChartStrings.PatientPortal_NextAppointment]: '次の予約',
    [BrightChartStrings.PatientPortal_NoneScheduled]: '予定なし',
    [BrightChartStrings.PatientPortal_ActiveMedications]: '服用中の薬',
    [BrightChartStrings.PatientPortal_RecentResults]: '最近の結果',
    [BrightChartStrings.PatientPortal_OutstandingBalance]: '未払い残高',
    [BrightChartStrings.PatientPortal_ClinicalTimeline]: '臨床タイムライン',
    [BrightChartStrings.PatientPortal_Appointments]: '予約',
    [BrightChartStrings.PatientPortal_RequestAppointment]: '予約をリクエスト',
    [BrightChartStrings.PatientPortal_Upcoming]: '今後',
    [BrightChartStrings.PatientPortal_NoUpcoming]: '今後の予約はありません。',
    [BrightChartStrings.PatientPortal_Past]: '過去',
    [BrightChartStrings.PatientPortal_TestResults]: '検査結果',
    [BrightChartStrings.PatientPortal_BillsPayments]: '請求と支払い',

    // ── Front Desk ─────────────────────────────────────────────────────────
    [BrightChartStrings.FrontDesk_Title]: '受付',
    [BrightChartStrings.FrontDesk_TodaysAppointments]: '本日の予約',
    [BrightChartStrings.FrontDesk_CheckedIn]: '受付済み',
    [BrightChartStrings.FrontDesk_Waitlist]: '待機リスト',
    [BrightChartStrings.FrontDesk_PendingEligibility]: '資格確認待ち',
    [BrightChartStrings.FrontDesk_PatientCheckIn]: '患者受付',
    [BrightChartStrings.FrontDesk_PatientRegistration]: '患者登録',

    // ── Billing Workspace ──────────────────────────────────────────────────
    [BrightChartStrings.BillingWS_Title]: '請求',
    [BrightChartStrings.BillingWS_UnbilledEncounters]: '未請求の診察',
    [BrightChartStrings.BillingWS_PendingClaims]: '保留中の請求',
    [BrightChartStrings.BillingWS_DeniedClaims]: '拒否された請求',
    [BrightChartStrings.BillingWS_TodaysPayments]: '本日の支払い',
    [BrightChartStrings.BillingWS_ClaimTracking]: '請求追跡',
    [BrightChartStrings.BillingWS_PaymentPosting]: '支払い記帳',

    // ── Admin Workspace ────────────────────────────────────────────────────
    [BrightChartStrings.Admin_UserManagement]: 'ユーザー管理',
    [BrightChartStrings.Admin_RoleConfiguration]: 'ロール設定',
    [BrightChartStrings.Admin_AuditLog]: '監査ログ',
    [BrightChartStrings.Admin_SpecialtyConfiguration]: '専門分野設定',
    [BrightChartStrings.Admin_PatientSearch]: '患者検索',

    // ── Common Table Headers / Labels ──────────────────────────────────────
    [BrightChartStrings.Common_Date]: '日付',
    [BrightChartStrings.Common_Type]: 'タイプ',
    [BrightChartStrings.Common_Status]: 'ステータス',
    [BrightChartStrings.Common_Description]: '説明',
    [BrightChartStrings.Common_Amount]: '金額',
    [BrightChartStrings.Common_Balance]: '残高',
    [BrightChartStrings.Common_Name]: '名前',
    [BrightChartStrings.Common_Actions]: 'アクション',
    [BrightChartStrings.Common_Priority]: '優先度',
    [BrightChartStrings.Common_Category]: 'カテゴリ',
    [BrightChartStrings.Common_Patient]: '患者',
    [BrightChartStrings.Common_Provider]: '提供者',
    [BrightChartStrings.Common_Service]: 'サービス',
    [BrightChartStrings.Common_Notes]: 'メモ',
    [BrightChartStrings.Common_From]: '差出人',
    [BrightChartStrings.Common_To]: '宛先',

    // ── Common Buttons / Actions ───────────────────────────────────────────
    [BrightChartStrings.Common_Save]: '保存',
    [BrightChartStrings.Common_Cancel]: 'キャンセル',
    [BrightChartStrings.Common_Search]: '検索',
    [BrightChartStrings.Common_Add]: '追加',
    [BrightChartStrings.Common_Remove]: '削除',
    [BrightChartStrings.Common_Submit]: '送信',
    [BrightChartStrings.Common_Create]: '作成',
    [BrightChartStrings.Common_Update]: '更新',
    [BrightChartStrings.Common_Delete]: '削除',
    [BrightChartStrings.Common_Sign]: '署名',
    [BrightChartStrings.Common_Close]: '閉じる',
    [BrightChartStrings.Common_Back]: '戻る',
    [BrightChartStrings.Common_Next]: '次へ',
    [BrightChartStrings.Common_Previous]: '前へ',
    [BrightChartStrings.Common_OfferSlot]: 'スロットを提案',
    [BrightChartStrings.Common_SelectSlot]: 'スロットを選択',

    // ── Common Empty States ────────────────────────────────────────────────
    [BrightChartStrings.Empty_NoResults]: '結果が見つかりません。',
    [BrightChartStrings.Empty_NoDocuments]: '文書が見つかりません',
    [BrightChartStrings.Empty_NoEncounters]: '診察が見つかりません。',
    [BrightChartStrings.Empty_NoOrders]:
      'フィルターに一致するオーダーがありません。',
    [BrightChartStrings.Empty_NoLedgerEntries]:
      '元帳エントリが見つかりません。',
    [BrightChartStrings.Empty_NoAllergies]: '既知のアレルギーなし',
    [BrightChartStrings.Empty_NoMedications]: '薬剤の記録なし。',
    [BrightChartStrings.Empty_NoConditions]: '疾患の記録なし。',
    [BrightChartStrings.Empty_NoAppointments]:
      '予約または利用可能なスロットがありません。',
    [BrightChartStrings.Empty_NoSlots]: '利用可能なスロットがありません。',
    [BrightChartStrings.Empty_NoWaitlist]: '待機リストに患者がいません。',
    [BrightChartStrings.Empty_NoPermission]: '患者を表示する権限がありません。',

    // ── Form Labels ────────────────────────────────────────────────────────
    [BrightChartStrings.Form_GivenName]: '名',
    [BrightChartStrings.Form_FamilyName]: '姓',
    [BrightChartStrings.Form_BirthDate]: '生年月日',
    [BrightChartStrings.Form_Gender]: '性別',
    [BrightChartStrings.Form_SelectGender]: '性別を選択',
    [BrightChartStrings.Form_Identifier]: '識別子',
    [BrightChartStrings.Form_Contact]: '連絡先',
    [BrightChartStrings.Form_Address]: '住所',
    [BrightChartStrings.Form_CreatePatient]: '患者を作成',
    [BrightChartStrings.Form_UpdatePatient]: '患者を更新',
    [BrightChartStrings.Form_CreateOrder]: 'オーダーを作成',
    [BrightChartStrings.Form_UpdateOrder]: 'オーダーを更新',
    [BrightChartStrings.Form_CreatePrescription]: '処方を作成',
    [BrightChartStrings.Form_UpdatePrescription]: '処方を更新',
    [BrightChartStrings.Form_CreateObservation]: '観察を作成',
    [BrightChartStrings.Form_UpdateObservation]: '観察を更新',
    [BrightChartStrings.Form_BookAppointment]: '予約する',
    [BrightChartStrings.Form_RescheduleAppointment]: '予約を変更',
    [BrightChartStrings.Form_CheckIn]: '受付',
    [BrightChartStrings.Form_UpdateEncounter]: '診察を更新',
    [BrightChartStrings.Form_SubmitClaim]: '請求を送信',
    [BrightChartStrings.Form_FinalizeSuperbill]: 'スーパービルを確定',

    // ── Allergy List ───────────────────────────────────────────────────────
    [BrightChartStrings.AllergyList_Title]: 'アレルギーと不耐性',
    [BrightChartStrings.AllergyList_AddNew]: '+ 追加',

    // ── Condition List ─────────────────────────────────────────────────────
    [BrightChartStrings.ConditionList_Title]: '疾患 / 問題',
    [BrightChartStrings.ConditionList_AddNew]: '+ 追加',

    // ── Medication List ────────────────────────────────────────────────────
    [BrightChartStrings.MedicationList_Title]: '薬剤',
    [BrightChartStrings.MedicationList_ActiveMedications]: '服用中の薬',
    [BrightChartStrings.MedicationList_Completed]: '完了',
    [BrightChartStrings.MedicationList_Stopped]: '中止',
    [BrightChartStrings.MedicationList_Other]: 'その他',

    // ── Encounter List ─────────────────────────────────────────────────────
    [BrightChartStrings.EncounterList_StatusFilter]: 'ステータス:',
    [BrightChartStrings.EncounterList_ClassFilter]: 'クラス:',

    // ── Document List / Viewer ─────────────────────────────────────────────
    [BrightChartStrings.DocumentViewer_NoDocument]: '表示する文書がありません',
    [BrightChartStrings.DocumentViewer_ExplanationOfBenefit]: '給付金説明書',

    // ── Ledger ─────────────────────────────────────────────────────────────
    [BrightChartStrings.Ledger_CurrentBalance]: '現在の残高:',

    // ── Waitlist ───────────────────────────────────────────────────────────
    [BrightChartStrings.Waitlist_Title]: '待機リスト管理',
    [BrightChartStrings.Waitlist_WaitTime]: '待ち時間',
    [BrightChartStrings.Waitlist_PreferredDates]: '希望日',
    [BrightChartStrings.Waitlist_PreferredProvider]: '希望する提供者',

    // ── Schedule ───────────────────────────────────────────────────────────
    [BrightChartStrings.Schedule_Day]: '日',
    [BrightChartStrings.Schedule_Week]: '週',
    [BrightChartStrings.Schedule_Month]: '月',
    [BrightChartStrings.Schedule_Available]: '空き',

    // ── Clinical Note Editor ───────────────────────────────────────────────
    [BrightChartStrings.NoteEditor_EmptyState]:
      '構成またはテンプレートが提供されていません。新しいノートを開始するにはテンプレートを選択してください。',

    // ── Insurance ──────────────────────────────────────────────────────────
    [BrightChartStrings.Insurance_PlanType]: 'プランタイプ',
    [BrightChartStrings.Insurance_GroupNumber]: 'グループ番号',
    [BrightChartStrings.Insurance_MemberID]: '会員番号',
    [BrightChartStrings.Insurance_SubscriberName]: '加入者名',
    [BrightChartStrings.Insurance_Relationship]: '関係',
    [BrightChartStrings.Insurance_PayerName]: '支払者名',
    [BrightChartStrings.Insurance_Eligibility]: '保険資格',

    // ── Clinical Timeline ──────────────────────────────────────────────────
    [BrightChartStrings.ClinicalTimeline_AriaLabel]: '臨床タイムライン',
    [BrightChartStrings.ClinicalTimeline_FilterAriaLabel]:
      'リソースタイプフィルター',
    [BrightChartStrings.ClinicalTimeline_Empty]: '臨床データがありません。',
    [BrightChartStrings.ClinicalTimeline_Unknown]: '不明',
    [BrightChartStrings.ClinicalTimeline_NoDate]: '日付なし',

    // ── Note Template Selector ─────────────────────────────────────────────
    [BrightChartStrings.NoteTemplateSelector_AriaLabel]:
      'ノートテンプレートセレクター',
    [BrightChartStrings.NoteTemplateSelector_Empty]:
      '利用可能なテンプレートがありません',
    [BrightChartStrings.NoteTemplateSelector_GroupAriaTemplate]:
      'ドキュメントタイプ {CODE}',
    [BrightChartStrings.NoteTemplateSelector_SelectTemplate]:
      'テンプレートを選択: {NAME}',

    // ── Encounter Workflow Board ───────────────────────────────────────────
    [BrightChartStrings.WorkflowBoard_AriaLabel]: '診察ワークフローボード',
    [BrightChartStrings.WorkflowBoard_UnknownPatient]: '不明な患者',
    [BrightChartStrings.WorkflowBoard_NoEncounters]: '診察なし',
    [BrightChartStrings.WorkflowBoard_ColumnAriaTemplate]: '{NAME} 列',

    // ── Schedule Editor ────────────────────────────────────────────────────
    [BrightChartStrings.ScheduleEditor_Title]: 'スケジュールエディター',
    [BrightChartStrings.ScheduleEditor_AriaLabel]:
      'スケジュール空き状況エディター',
    [BrightChartStrings.ScheduleEditor_AddBlockLegend]:
      '空き時間ブロックを追加',
    [BrightChartStrings.ScheduleEditor_DayLabel]: '曜日',
    [BrightChartStrings.ScheduleEditor_StartTime]: '開始時間',
    [BrightChartStrings.ScheduleEditor_EndTime]: '終了時間',
    [BrightChartStrings.ScheduleEditor_RecurringWeekly]: '毎週繰り返し',
    [BrightChartStrings.ScheduleEditor_AddBlock]: 'ブロックを追加',
    [BrightChartStrings.ScheduleEditor_StartBeforeEnd]:
      '開始時間は終了時間より前でなければなりません',
    [BrightChartStrings.ScheduleEditor_NoAvailability]: '空きなし',
    [BrightChartStrings.ScheduleEditor_Recurring]: '繰り返し',
    [BrightChartStrings.ScheduleEditor_GridAriaLabel]: '週間空き状況グリッド',
    [BrightChartStrings.ScheduleEditor_SaveSchedule]: 'スケジュールを保存',
    [BrightChartStrings.ScheduleEditor_Day_Monday]: '月曜日',
    [BrightChartStrings.ScheduleEditor_Day_Tuesday]: '火曜日',
    [BrightChartStrings.ScheduleEditor_Day_Wednesday]: '水曜日',
    [BrightChartStrings.ScheduleEditor_Day_Thursday]: '木曜日',
    [BrightChartStrings.ScheduleEditor_Day_Friday]: '金曜日',
    [BrightChartStrings.ScheduleEditor_Day_Saturday]: '土曜日',
    [BrightChartStrings.ScheduleEditor_Day_Sunday]: '日曜日',

    // ── Connectivity Indicator ─────────────────────────────────────────────
    [BrightChartStrings.Connectivity_Online]: 'オンライン',
    [BrightChartStrings.Connectivity_Offline]: 'オフライン',
    [BrightChartStrings.Connectivity_StatusTemplate]: '接続状態: {STATUS}',

    // ── Notification Bell ──────────────────────────────────────────────────
    [BrightChartStrings.NotificationBell_AriaLabel]: '通知',
    [BrightChartStrings.NotificationBell_UnreadTemplate]:
      '通知、{COUNT} 件未読',

    // ── Role Switcher ──────────────────────────────────────────────────────
    [BrightChartStrings.RoleSwitcher_AriaLabel]: '医療ロールを切り替え',
    [BrightChartStrings.RoleSwitcher_MenuAriaLabel]: '医療ロールの選択',

    // ── Patient Header ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientHeader_AriaLabel]: '患者情報',
    [BrightChartStrings.PatientHeader_Unknown]: '不明',
    [BrightChartStrings.PatientHeader_MRN]: 'MRN:',
    [BrightChartStrings.PatientHeader_NA]: 'N/A',
    [BrightChartStrings.PatientHeader_AllergyTemplate]: 'アレルギー: {NAME}',

    // ── Navigation Labels ──────────────────────────────────────────────────
    [BrightChartStrings.Nav_Patients]: '患者',
    [BrightChartStrings.Nav_Clients]: 'クライアント',
    [BrightChartStrings.Nav_Encounters]: '診察',
    [BrightChartStrings.Nav_Schedule]: 'スケジュール',
    [BrightChartStrings.Nav_Inbox]: '受信トレイ',
    [BrightChartStrings.Nav_OperatoryView]: '診療室ビュー',
    [BrightChartStrings.Nav_TreatmentPlans]: '治療計画',
    [BrightChartStrings.Nav_SpeciesFilter]: '種別フィルター',
    [BrightChartStrings.Nav_FarmCalls]: '農場往診',
    [BrightChartStrings.Nav_MyHealth]: '私の健康',
    [BrightChartStrings.Nav_Appointments]: '予約',
    [BrightChartStrings.Nav_TestResults]: '検査結果',
    [BrightChartStrings.Nav_BillsPayments]: '請求と支払い',
    [BrightChartStrings.Nav_CheckIn]: 'チェックイン',
    [BrightChartStrings.Nav_Waitlist]: '待機リスト',
    [BrightChartStrings.Nav_Registration]: '登録',
    [BrightChartStrings.Nav_Insurance]: '保険',
    [BrightChartStrings.Nav_Superbills]: 'スーパービル',
    [BrightChartStrings.Nav_Claims]: '請求',
    [BrightChartStrings.Nav_ClaimTracking]: '請求追跡',
    [BrightChartStrings.Nav_Payments]: '支払い',
    [BrightChartStrings.Nav_PatientLedger]: '患者元帳',
    [BrightChartStrings.Nav_FeeSchedules]: '料金表',
    [BrightChartStrings.Nav_Users]: 'ユーザー',
    [BrightChartStrings.Nav_Roles]: 'ロール',
    [BrightChartStrings.Nav_AuditLog]: '監査ログ',
    [BrightChartStrings.Nav_SpecialtyConfig]: '専門科設定',
    [BrightChartStrings.Nav_Settings]: '設定',
    [BrightChartStrings.Nav_Organizations]: '組織',
    [BrightChartStrings.Nav_Clinician]: '臨床医',
    [BrightChartStrings.Nav_PatientPortal]: '患者ポータル',
    [BrightChartStrings.Nav_Billing]: '請求',

    // ── Sidebar ────────────────────────────────────────────────────────────
    [BrightChartStrings.Sidebar_ExpandAriaLabel]: 'サイドバーを展開',
    [BrightChartStrings.Sidebar_CollapseAriaLabel]: 'サイドバーを折りたたむ',
    [BrightChartStrings.Sidebar_NavAriaLabel]: 'BrightChart ナビゲーション',

    [BrightChartStrings.BottomNav_AriaLabel]:
      'BrightChart モバイルナビゲーション',
    [BrightChartStrings.Layout_NavAriaTemplate]: '{NAME} ナビゲーション',
  };
