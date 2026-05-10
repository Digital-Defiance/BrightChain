import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChartStringKey,
  BrightChartStrings,
} from '../../enumerations/BrightChartStrings';

export const BrightChartMandarinStrings: ComponentStrings<BrightChartStringKey> =
  {
    // ── Menu / Navigation ──────────────────────────────────────────────
    [BrightChartStrings.MenuLabel]: 'BrightChart',
    [BrightChartStrings.ChartSectionsLabel]: '图表分区',
    [BrightChartStrings.Nav_Conversations]: '对话',
    [BrightChartStrings.Nav_Groups]: '群组',
    [BrightChartStrings.Nav_Channels]: '频道',

    // ── Shell / Notifications ──────────────────────────────────────────
    [BrightChartStrings.Notification_Type_Result]: '结果',
    [BrightChartStrings.Notification_Type_Note]: '笔记',
    [BrightChartStrings.Notification_Type_Appointment]: '预约',
    [BrightChartStrings.Notification_Type_Claim]: '索赔',
    [BrightChartStrings.Notification_Type_Message]: '消息',
    [BrightChartStrings.Notification_Type_System]: '系统',
    [BrightChartStrings.Notification_Priority_Normal]: '普通',
    [BrightChartStrings.Notification_Priority_Urgent]: '紧急',

    // ── Roles ──────────────────────────────────────────────────────────
    [BrightChartStrings.Role_Physician]: '医师',
    [BrightChartStrings.Role_RegisteredNurse]: '注册护士',
    [BrightChartStrings.Role_MedicalAssistant]: '医疗助理',
    [BrightChartStrings.Role_Patient]: '患者',
    [BrightChartStrings.Role_ClinicalAdministrator]: '临床管理员',
    [BrightChartStrings.Role_Dentist]: '牙医',
    [BrightChartStrings.Role_Veterinarian]: '兽医',

    // ── Organization ───────────────────────────────────────────────────
    [BrightChartStrings.Org_EnrollmentMode_Open]: '开放',
    [BrightChartStrings.Org_EnrollmentMode_InviteOnly]: '仅限邀请',

    // ── Audit ──────────────────────────────────────────────────────────
    [BrightChartStrings.Audit_Operation_Create]: '创建',
    [BrightChartStrings.Audit_Operation_Read]: '读取',
    [BrightChartStrings.Audit_Operation_Update]: '更新',
    [BrightChartStrings.Audit_Operation_Delete]: '删除',
    [BrightChartStrings.Audit_Operation_Search]: '搜索',
    [BrightChartStrings.Audit_Operation_Merge]: '合并',

    // ── FHIR / Patient Identity ──────────────────────────────────────────
    [BrightChartStrings.Gender_Male]: '男性',
    [BrightChartStrings.Gender_Female]: '女性',
    [BrightChartStrings.Gender_Other]: '其他',
    [BrightChartStrings.Gender_Unknown]: '未知',

    [BrightChartStrings.NameUse_Usual]: '常用',
    [BrightChartStrings.NameUse_Official]: '正式',
    [BrightChartStrings.NameUse_Temp]: '临时',
    [BrightChartStrings.NameUse_Nickname]: '昵称',
    [BrightChartStrings.NameUse_Anonymous]: '匿名',
    [BrightChartStrings.NameUse_Old]: '旧',
    [BrightChartStrings.NameUse_Maiden]: '婚前姓',

    [BrightChartStrings.AddressUse_Home]: '家庭',
    [BrightChartStrings.AddressUse_Work]: '工作',
    [BrightChartStrings.AddressUse_Temp]: '临时',
    [BrightChartStrings.AddressUse_Old]: '旧',
    [BrightChartStrings.AddressUse_Billing]: '账单',

    [BrightChartStrings.AddressType_Postal]: '邮政',
    [BrightChartStrings.AddressType_Physical]: '实际',
    [BrightChartStrings.AddressType_Both]: '两者',

    [BrightChartStrings.ContactSystem_Phone]: '电话',
    [BrightChartStrings.ContactSystem_Fax]: '传真',
    [BrightChartStrings.ContactSystem_Email]: '电子邮件',
    [BrightChartStrings.ContactSystem_Pager]: '寻呼机',
    [BrightChartStrings.ContactSystem_Url]: 'URL',
    [BrightChartStrings.ContactSystem_Sms]: '短信',
    [BrightChartStrings.ContactSystem_Other]: '其他',

    [BrightChartStrings.ContactUse_Home]: '家庭',
    [BrightChartStrings.ContactUse_Work]: '工作',
    [BrightChartStrings.ContactUse_Temp]: '临时',
    [BrightChartStrings.ContactUse_Old]: '旧',
    [BrightChartStrings.ContactUse_Mobile]: '手机',

    [BrightChartStrings.LinkType_ReplacedBy]: '被替换',
    [BrightChartStrings.LinkType_Replaces]: '替换',
    [BrightChartStrings.LinkType_Refer]: '参考',
    [BrightChartStrings.LinkType_SeeAlso]: '另见',

    [BrightChartStrings.IdentifierUse_Usual]: '常用',
    [BrightChartStrings.IdentifierUse_Official]: '正式',
    [BrightChartStrings.IdentifierUse_Temp]: '临时',
    [BrightChartStrings.IdentifierUse_Secondary]: '次要',
    [BrightChartStrings.IdentifierUse_Old]: '旧',

    // ── Clinical ─────────────────────────────────────────────────────────
    [BrightChartStrings.ObservationStatus_Registered]: '已登记',
    [BrightChartStrings.ObservationStatus_Preliminary]: '初步',
    [BrightChartStrings.ObservationStatus_Final]: '最终',
    [BrightChartStrings.ObservationStatus_Amended]: '已修改',
    [BrightChartStrings.ObservationStatus_Corrected]: '已更正',
    [BrightChartStrings.ObservationStatus_Cancelled]: '已取消',
    [BrightChartStrings.ObservationStatus_EnteredInError]: '误录入',
    [BrightChartStrings.ObservationStatus_Unknown]: '未知',

    [BrightChartStrings.ConditionClinical_Active]: '活跃',
    [BrightChartStrings.ConditionClinical_Recurrence]: '复发',
    [BrightChartStrings.ConditionClinical_Relapse]: '再发',
    [BrightChartStrings.ConditionClinical_Inactive]: '非活跃',
    [BrightChartStrings.ConditionClinical_Remission]: '缓解',
    [BrightChartStrings.ConditionClinical_Resolved]: '已解决',

    [BrightChartStrings.ConditionVerification_Unconfirmed]: '未确认',
    [BrightChartStrings.ConditionVerification_Provisional]: '暂定',
    [BrightChartStrings.ConditionVerification_Differential]: '鉴别',
    [BrightChartStrings.ConditionVerification_Confirmed]: '已确认',
    [BrightChartStrings.ConditionVerification_Refuted]: '已否定',
    [BrightChartStrings.ConditionVerification_EnteredInError]: '误录入',

    [BrightChartStrings.AllergyType_Allergy]: '过敏',
    [BrightChartStrings.AllergyType_Intolerance]: '不耐受',

    [BrightChartStrings.AllergyCategory_Food]: '食物',
    [BrightChartStrings.AllergyCategory_Medication]: '药物',
    [BrightChartStrings.AllergyCategory_Environment]: '环境',
    [BrightChartStrings.AllergyCategory_Biologic]: '生物',

    [BrightChartStrings.AllergyCriticality_Low]: '低',
    [BrightChartStrings.AllergyCriticality_High]: '高',
    [BrightChartStrings.AllergyCriticality_UnableToAssess]: '无法评估',

    [BrightChartStrings.AllergySeverity_Mild]: '轻度',
    [BrightChartStrings.AllergySeverity_Moderate]: '中度',
    [BrightChartStrings.AllergySeverity_Severe]: '重度',

    [BrightChartStrings.MedicationStatus_Active]: '活跃',
    [BrightChartStrings.MedicationStatus_Inactive]: '非活跃',
    [BrightChartStrings.MedicationStatus_EnteredInError]: '误录入',

    [BrightChartStrings.MedStatementStatus_Active]: '活跃',
    [BrightChartStrings.MedStatementStatus_Completed]: '已完成',
    [BrightChartStrings.MedStatementStatus_EnteredInError]: '误录入',
    [BrightChartStrings.MedStatementStatus_Intended]: '计划中',
    [BrightChartStrings.MedStatementStatus_Stopped]: '已停止',
    [BrightChartStrings.MedStatementStatus_OnHold]: '暂停',
    [BrightChartStrings.MedStatementStatus_Unknown]: '未知',
    [BrightChartStrings.MedStatementStatus_NotTaken]: '未服用',

    [BrightChartStrings.ProcedureStatus_Preparation]: '准备中',
    [BrightChartStrings.ProcedureStatus_InProgress]: '进行中',
    [BrightChartStrings.ProcedureStatus_NotDone]: '未执行',
    [BrightChartStrings.ProcedureStatus_OnHold]: '暂停',
    [BrightChartStrings.ProcedureStatus_Stopped]: '已停止',
    [BrightChartStrings.ProcedureStatus_Completed]: '已完成',
    [BrightChartStrings.ProcedureStatus_EnteredInError]: '误录入',
    [BrightChartStrings.ProcedureStatus_Unknown]: '未知',

    // ── Encounter ────────────────────────────────────────────────────────
    [BrightChartStrings.EncounterStatus_Planned]: '已计划',
    [BrightChartStrings.EncounterStatus_Arrived]: '已到达',
    [BrightChartStrings.EncounterStatus_Triaged]: '已分诊',
    [BrightChartStrings.EncounterStatus_InProgress]: '进行中',
    [BrightChartStrings.EncounterStatus_OnLeave]: '请假中',
    [BrightChartStrings.EncounterStatus_Finished]: '已结束',
    [BrightChartStrings.EncounterStatus_Cancelled]: '已取消',
    [BrightChartStrings.EncounterStatus_EnteredInError]: '误录入',
    [BrightChartStrings.EncounterStatus_Unknown]: '未知',

    [BrightChartStrings.EncounterLocationStatus_Planned]: '已计划',
    [BrightChartStrings.EncounterLocationStatus_Active]: '活跃',
    [BrightChartStrings.EncounterLocationStatus_Reserved]: '已预留',
    [BrightChartStrings.EncounterLocationStatus_Completed]: '已完成',

    [BrightChartStrings.EncounterClass_Inpatient]: '住院',
    [BrightChartStrings.EncounterClass_Ambulatory]: '门诊',
    [BrightChartStrings.EncounterClass_Emergency]: '急诊',
    [BrightChartStrings.EncounterClass_HomeHealth]: '家庭医疗',
    [BrightChartStrings.EncounterClass_Virtual]: '虚拟',
    [BrightChartStrings.EncounterClass_Field]: '外勤',
    [BrightChartStrings.EncounterClass_ShortStay]: '短期住院',
    [BrightChartStrings.EncounterClass_Observation]: '观察',
    [BrightChartStrings.EncounterClass_PreAdmission]: '入院前',

    [BrightChartStrings.DiagnosisRole_Admission]: '入院诊断',
    [BrightChartStrings.DiagnosisRole_Discharge]: '出院诊断',
    [BrightChartStrings.DiagnosisRole_ChiefComplaint]: '主诉',
    [BrightChartStrings.DiagnosisRole_Comorbidity]: '合并症',
    [BrightChartStrings.DiagnosisRole_PreOp]: '术前诊断',
    [BrightChartStrings.DiagnosisRole_PostOp]: '术后诊断',
    [BrightChartStrings.DiagnosisRole_Billing]: '计费诊断',

    // ── Documentation ────────────────────────────────────────────────────
    [BrightChartStrings.CompositionStatus_Preliminary]: '初步',
    [BrightChartStrings.CompositionStatus_Final]: '最终',
    [BrightChartStrings.CompositionStatus_Amended]: '已修改',
    [BrightChartStrings.CompositionStatus_EnteredInError]: '误录入',

    [BrightChartStrings.DocRefStatus_Current]: '当前',
    [BrightChartStrings.DocRefStatus_Superseded]: '已替代',
    [BrightChartStrings.DocRefStatus_EnteredInError]: '误录入',

    [BrightChartStrings.AttestationMode_Personal]: '个人',
    [BrightChartStrings.AttestationMode_Professional]: '专业',
    [BrightChartStrings.AttestationMode_Legal]: '法律',
    [BrightChartStrings.AttestationMode_Official]: '官方',

    [BrightChartStrings.DocRelationship_Replaces]: '替换',
    [BrightChartStrings.DocRelationship_Transforms]: '转换',
    [BrightChartStrings.DocRelationship_Signs]: '签署',
    [BrightChartStrings.DocRelationship_Appends]: '附加',

    // ── Note Templates ───────────────────────────────────────────────────
    [BrightChartStrings.Template_SOAPNote_Name]: 'SOAP笔记',
    [BrightChartStrings.Template_SOAPNote_Description]:
      '标准的主观、客观、评估、计划格式，用于门诊和住院就诊。',
    [BrightChartStrings.Template_SOAPNote_Subjective]: '主观',
    [BrightChartStrings.Template_SOAPNote_Objective]: '客观',
    [BrightChartStrings.Template_SOAPNote_Assessment]: '评估',
    [BrightChartStrings.Template_SOAPNote_Plan]: '计划',

    [BrightChartStrings.Template_HP_Name]: '病史与体格检查',
    [BrightChartStrings.Template_HP_Description]:
      '用于住院和新患者就诊的完整初始评估格式。',
    [BrightChartStrings.Template_HP_ChiefComplaint]: '主诉',
    [BrightChartStrings.Template_HP_HPI]: '现病史',
    [BrightChartStrings.Template_HP_PastMedicalHistory]: '既往病史',
    [BrightChartStrings.Template_HP_ReviewOfSystems]: '系统回顾',
    [BrightChartStrings.Template_HP_PhysicalExam]: '体格检查',
    [BrightChartStrings.Template_HP_Assessment]: '评估',
    [BrightChartStrings.Template_HP_Plan]: '计划',

    [BrightChartStrings.Template_Discharge_Name]: '出院小结',
    [BrightChartStrings.Template_Discharge_Description]:
      '用于记录住院经过、诊断、病程和出院计划的标准格式。',
    [BrightChartStrings.Template_Discharge_AdmissionDiagnosis]: '入院诊断',
    [BrightChartStrings.Template_Discharge_HospitalCourse]: '住院经过',
    [BrightChartStrings.Template_Discharge_DischargeDiagnosis]: '出院诊断',
    [BrightChartStrings.Template_Discharge_DischargeMedications]: '出院用药',
    [BrightChartStrings.Template_Discharge_FollowUp]: '随访指导',

    [BrightChartStrings.Template_Procedure_Name]: '手术记录',
    [BrightChartStrings.Template_Procedure_Description]:
      '用于记录临床或外科手术的标准格式。',
    [BrightChartStrings.Template_Procedure_Indication]: '适应症',
    [BrightChartStrings.Template_Procedure_ProcedureDescription]: '手术描述',
    [BrightChartStrings.Template_Procedure_Findings]: '发现',
    [BrightChartStrings.Template_Procedure_Complications]: '并发症',
    [BrightChartStrings.Template_Procedure_PostProcedurePlan]: '术后计划',

    // ── LOINC Document Types ─────────────────────────────────────────────
    [BrightChartStrings.DocType_ConsultationNote]: '会诊记录',
    [BrightChartStrings.DocType_DischargeSummary]: '出院小结',
    [BrightChartStrings.DocType_HistoryAndPhysical]: '病史与体格检查',
    [BrightChartStrings.DocType_ProgressNote]: '病程记录',
    [BrightChartStrings.DocType_ProcedureNote]: '手术记录',
    [BrightChartStrings.DocType_OperativeNote]: '手术笔记',
    [BrightChartStrings.DocType_NurseNote]: '护理记录',
    [BrightChartStrings.DocType_ReferralNote]: '转诊记录',
    [BrightChartStrings.DocType_TransferSummary]: '转院小结',

    // ── Orders & Results ─────────────────────────────────────────────────
    [BrightChartStrings.ServiceRequestStatus_Draft]: '草稿',
    [BrightChartStrings.ServiceRequestStatus_Active]: '活跃',
    [BrightChartStrings.ServiceRequestStatus_OnHold]: '暂停',
    [BrightChartStrings.ServiceRequestStatus_Revoked]: '撤销',
    [BrightChartStrings.ServiceRequestStatus_Completed]: '已完成',
    [BrightChartStrings.ServiceRequestStatus_EnteredInError]: '误录入',
    [BrightChartStrings.ServiceRequestStatus_Unknown]: '未知',

    [BrightChartStrings.ServiceRequestIntent_Proposal]: '建议',
    [BrightChartStrings.ServiceRequestIntent_Plan]: '计划',
    [BrightChartStrings.ServiceRequestIntent_Directive]: '指令',
    [BrightChartStrings.ServiceRequestIntent_Order]: '医嘱',
    [BrightChartStrings.ServiceRequestIntent_OriginalOrder]: '原始医嘱',
    [BrightChartStrings.ServiceRequestIntent_ReflexOrder]: '反射医嘱',
    [BrightChartStrings.ServiceRequestIntent_FillerOrder]: '填充医嘱',
    [BrightChartStrings.ServiceRequestIntent_InstanceOrder]: '实例医嘱',
    [BrightChartStrings.ServiceRequestIntent_Option]: '选项',

    [BrightChartStrings.MedRequestStatus_Active]: '活跃',
    [BrightChartStrings.MedRequestStatus_OnHold]: '暂停',
    [BrightChartStrings.MedRequestStatus_Cancelled]: '已取消',
    [BrightChartStrings.MedRequestStatus_Completed]: '已完成',
    [BrightChartStrings.MedRequestStatus_EnteredInError]: '误录入',
    [BrightChartStrings.MedRequestStatus_Stopped]: '已停止',
    [BrightChartStrings.MedRequestStatus_Draft]: '草稿',
    [BrightChartStrings.MedRequestStatus_Unknown]: '未知',

    [BrightChartStrings.MedRequestIntent_Proposal]: '建议',
    [BrightChartStrings.MedRequestIntent_Plan]: '计划',
    [BrightChartStrings.MedRequestIntent_Order]: '医嘱',
    [BrightChartStrings.MedRequestIntent_OriginalOrder]: '原始医嘱',
    [BrightChartStrings.MedRequestIntent_ReflexOrder]: '反射医嘱',
    [BrightChartStrings.MedRequestIntent_FillerOrder]: '填充医嘱',
    [BrightChartStrings.MedRequestIntent_InstanceOrder]: '实例医嘱',
    [BrightChartStrings.MedRequestIntent_Option]: '选项',

    [BrightChartStrings.DiagnosticReportStatus_Registered]: '已登记',
    [BrightChartStrings.DiagnosticReportStatus_Partial]: '部分',
    [BrightChartStrings.DiagnosticReportStatus_Preliminary]: '初步',
    [BrightChartStrings.DiagnosticReportStatus_Final]: '最终',
    [BrightChartStrings.DiagnosticReportStatus_Amended]: '已修改',
    [BrightChartStrings.DiagnosticReportStatus_Corrected]: '已更正',
    [BrightChartStrings.DiagnosticReportStatus_Appended]: '已附加',
    [BrightChartStrings.DiagnosticReportStatus_Cancelled]: '已取消',
    [BrightChartStrings.DiagnosticReportStatus_EnteredInError]: '误录入',
    [BrightChartStrings.DiagnosticReportStatus_Unknown]: '未知',

    [BrightChartStrings.RequestPriority_Routine]: '常规',
    [BrightChartStrings.RequestPriority_Urgent]: '紧急',
    [BrightChartStrings.RequestPriority_Asap]: '尽快',
    [BrightChartStrings.RequestPriority_Stat]: '立即',

    // ── Billing ──────────────────────────────────────────────────────────
    [BrightChartStrings.CoverageStatus_Active]: '活跃',
    [BrightChartStrings.CoverageStatus_Cancelled]: '已取消',
    [BrightChartStrings.CoverageStatus_Draft]: '草稿',
    [BrightChartStrings.CoverageStatus_EnteredInError]: '误录入',

    [BrightChartStrings.ClaimStatus_Active]: '活跃',
    [BrightChartStrings.ClaimStatus_Cancelled]: '已取消',
    [BrightChartStrings.ClaimStatus_Draft]: '草稿',
    [BrightChartStrings.ClaimStatus_EnteredInError]: '误录入',

    [BrightChartStrings.ClaimUse_Claim]: '索赔',
    [BrightChartStrings.ClaimUse_Preauthorization]: '预授权',
    [BrightChartStrings.ClaimUse_Predetermination]: '预决定',

    [BrightChartStrings.EOBStatus_Active]: '活跃',
    [BrightChartStrings.EOBStatus_Cancelled]: '已取消',
    [BrightChartStrings.EOBStatus_Draft]: '草稿',
    [BrightChartStrings.EOBStatus_EnteredInError]: '误录入',

    [BrightChartStrings.RemittanceOutcome_Queued]: '排队中',
    [BrightChartStrings.RemittanceOutcome_Complete]: '已完成',
    [BrightChartStrings.RemittanceOutcome_Error]: '错误',
    [BrightChartStrings.RemittanceOutcome_Partial]: '部分',

    [BrightChartStrings.EligibilityPurpose_AuthRequirements]: '授权要求',
    [BrightChartStrings.EligibilityPurpose_Benefits]: '福利',
    [BrightChartStrings.EligibilityPurpose_Discovery]: '发现',
    [BrightChartStrings.EligibilityPurpose_Validation]: '验证',

    [BrightChartStrings.SuperbillStatus_Draft]: '草稿',
    [BrightChartStrings.SuperbillStatus_Finalized]: '已定稿',
    [BrightChartStrings.SuperbillStatus_Billed]: '已计费',

    [BrightChartStrings.LedgerEntryType_Charge]: '收费',
    [BrightChartStrings.LedgerEntryType_Payment]: '付款',
    [BrightChartStrings.LedgerEntryType_Adjustment]: '调整',
    [BrightChartStrings.LedgerEntryType_Refund]: '退款',
    [BrightChartStrings.LedgerEntryType_WriteOff]: '核销',

    [BrightChartStrings.ClaimType_Institutional]: '机构',
    [BrightChartStrings.ClaimType_Oral]: '口腔',
    [BrightChartStrings.ClaimType_Pharmacy]: '药房',
    [BrightChartStrings.ClaimType_Professional]: '专业',
    [BrightChartStrings.ClaimType_Vision]: '视力',

    // ── Scheduling ───────────────────────────────────────────────────────
    [BrightChartStrings.AppointmentStatus_Proposed]: '已提议',
    [BrightChartStrings.AppointmentStatus_Pending]: '待定',
    [BrightChartStrings.AppointmentStatus_Booked]: '已预约',
    [BrightChartStrings.AppointmentStatus_Arrived]: '已到达',
    [BrightChartStrings.AppointmentStatus_Fulfilled]: '已完成',
    [BrightChartStrings.AppointmentStatus_Cancelled]: '已取消',
    [BrightChartStrings.AppointmentStatus_Noshow]: '未到',
    [BrightChartStrings.AppointmentStatus_EnteredInError]: '误录入',
    [BrightChartStrings.AppointmentStatus_CheckedIn]: '已签到',
    [BrightChartStrings.AppointmentStatus_Waitlist]: '候补名单',

    [BrightChartStrings.SlotStatus_Busy]: '忙碌',
    [BrightChartStrings.SlotStatus_Free]: '空闲',
    [BrightChartStrings.SlotStatus_BusyUnavailable]: '忙碌（不可用）',
    [BrightChartStrings.SlotStatus_BusyTentative]: '忙碌（暂定）',
    [BrightChartStrings.SlotStatus_EnteredInError]: '误录入',

    [BrightChartStrings.ParticipantRequired_Required]: '必需',
    [BrightChartStrings.ParticipantRequired_Optional]: '可选',
    [BrightChartStrings.ParticipantRequired_InformationOnly]: '仅供参考',

    [BrightChartStrings.ParticipationStatus_Accepted]: '已接受',
    [BrightChartStrings.ParticipationStatus_Declined]: '已拒绝',
    [BrightChartStrings.ParticipationStatus_Tentative]: '暂定',
    [BrightChartStrings.ParticipationStatus_NeedsAction]: '需要操作',

    [BrightChartStrings.WaitlistStatus_Waiting]: '等待中',
    [BrightChartStrings.WaitlistStatus_Offered]: '已提供',
    [BrightChartStrings.WaitlistStatus_Booked]: '已预约',
    [BrightChartStrings.WaitlistStatus_Cancelled]: '已取消',
    [BrightChartStrings.WaitlistStatus_Expired]: '已过期',

    [BrightChartStrings.ReminderType_Sms]: '短信',
    [BrightChartStrings.ReminderType_Email]: '电子邮件',
    [BrightChartStrings.ReminderType_Push]: '推送通知',
    [BrightChartStrings.ReminderType_Phone]: '电话',

    [BrightChartStrings.ReminderStatus_Scheduled]: '已安排',
    [BrightChartStrings.ReminderStatus_Sent]: '已发送',
    [BrightChartStrings.ReminderStatus_Failed]: '失败',
    [BrightChartStrings.ReminderStatus_Cancelled]: '已取消',

    // ── Offline / Sync ───────────────────────────────────────────────────
    [BrightChartStrings.Sync_Conflict]: '同步冲突',
    [BrightChartStrings.Sync_Success]: '同步成功',

    // ── FHIR OperationOutcome Severity ───────────────────────────────────
    [BrightChartStrings.IssueSeverity_Fatal]: '致命',
    [BrightChartStrings.IssueSeverity_Error]: '错误',
    [BrightChartStrings.IssueSeverity_Warning]: '警告',
    [BrightChartStrings.IssueSeverity_Information]: '信息',

    // ── Narrative Status ─────────────────────────────────────────────────
    [BrightChartStrings.NarrativeStatus_Generated]: '已生成',
    [BrightChartStrings.NarrativeStatus_Extensions]: '扩展',
    [BrightChartStrings.NarrativeStatus_Additional]: '附加',
    [BrightChartStrings.NarrativeStatus_Empty]: '空',

    // ── Shell / UI ─────────────────────────────────────────────────────────
    [BrightChartStrings.Shell_Notifications]: '通知',
    [BrightChartStrings.Shell_MarkAllRead]: '全部标为已读',
    [BrightChartStrings.Shell_NoNotifications]: '暂无通知',
    [BrightChartStrings.Shell_AccessDenied]: '访问被拒绝',
    [BrightChartStrings.Shell_AccessDeniedMessage]: '您没有权限访问此区域。',
    [BrightChartStrings.Shell_Loading]: '加载中...',

    // ── Patient Chart Tabs ─────────────────────────────────────────────────
    [BrightChartStrings.PatientChart_Title]: '患者病历',
    [BrightChartStrings.PatientChart_Summary]: '概要',
    [BrightChartStrings.PatientChart_Problems]: '问题',
    [BrightChartStrings.PatientChart_Medications]: '药物',
    [BrightChartStrings.PatientChart_Allergies]: '过敏',
    [BrightChartStrings.PatientChart_Encounters]: '就诊',
    [BrightChartStrings.PatientChart_Documents]: '文档',
    [BrightChartStrings.PatientChart_Orders]: '医嘱',
    [BrightChartStrings.PatientChart_Results]: '结果',
    [BrightChartStrings.PatientChart_Appointments]: '预约',
    [BrightChartStrings.PatientChart_Insurance]: '保险',
    [BrightChartStrings.PatientChart_Billing]: '账单',
    [BrightChartStrings.PatientChart_NoPatientSelected]: '未选择患者。',

    // ── Encounter Dashboard ────────────────────────────────────────────────
    [BrightChartStrings.EncounterDashboard_Title]: '今日就诊',
    [BrightChartStrings.EncounterDashboard_Scheduled]: '已安排',
    [BrightChartStrings.EncounterDashboard_InProgress]: '进行中',
    [BrightChartStrings.EncounterDashboard_PendingTasks]: '待处理任务',

    // ── Clinician Inbox ────────────────────────────────────────────────────
    [BrightChartStrings.ClinicianInbox_Title]: '收件箱',
    [BrightChartStrings.ClinicianInbox_PendingResults]: '待处理结果',
    [BrightChartStrings.ClinicianInbox_UnsignedNotes]: '未签署笔记',
    [BrightChartStrings.ClinicianInbox_Messages]: '消息',

    // ── Patient Portal ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientPortal_MyHealth]: '我的健康',
    [BrightChartStrings.PatientPortal_Welcome]: '欢迎',
    [BrightChartStrings.PatientPortal_WelcomeUser]: '欢迎，{NAME}',
    [BrightChartStrings.PatientPortal_ViewingRecordsAt]:
      '正在查看 {ORG} 的记录',
    [BrightChartStrings.PatientPortal_NextAppointment]: '下次预约',
    [BrightChartStrings.PatientPortal_NoneScheduled]: '暂无安排',
    [BrightChartStrings.PatientPortal_ActiveMedications]: '活跃药物',
    [BrightChartStrings.PatientPortal_RecentResults]: '最近结果',
    [BrightChartStrings.PatientPortal_OutstandingBalance]: '未付余额',
    [BrightChartStrings.PatientPortal_ClinicalTimeline]: '临床时间线',
    [BrightChartStrings.PatientPortal_Appointments]: '预约',
    [BrightChartStrings.PatientPortal_RequestAppointment]: '请求预约',
    [BrightChartStrings.PatientPortal_Upcoming]: '即将到来',
    [BrightChartStrings.PatientPortal_NoUpcoming]: '暂无即将到来的预约。',
    [BrightChartStrings.PatientPortal_Past]: '过去',
    [BrightChartStrings.PatientPortal_TestResults]: '检查结果',
    [BrightChartStrings.PatientPortal_BillsPayments]: '账单与付款',

    // ── Front Desk ─────────────────────────────────────────────────────────
    [BrightChartStrings.FrontDesk_Title]: '前台',
    [BrightChartStrings.FrontDesk_TodaysAppointments]: '今日预约',
    [BrightChartStrings.FrontDesk_CheckedIn]: '已签到',
    [BrightChartStrings.FrontDesk_Waitlist]: '候补名单',
    [BrightChartStrings.FrontDesk_PendingEligibility]: '待验证资格',
    [BrightChartStrings.FrontDesk_PatientCheckIn]: '患者签到',
    [BrightChartStrings.FrontDesk_PatientRegistration]: '患者登记',

    // ── Billing Workspace ──────────────────────────────────────────────────
    [BrightChartStrings.BillingWS_Title]: '账单',
    [BrightChartStrings.BillingWS_UnbilledEncounters]: '未计费就诊',
    [BrightChartStrings.BillingWS_PendingClaims]: '待处理索赔',
    [BrightChartStrings.BillingWS_DeniedClaims]: '被拒索赔',
    [BrightChartStrings.BillingWS_TodaysPayments]: '今日付款',
    [BrightChartStrings.BillingWS_ClaimTracking]: '索赔跟踪',
    [BrightChartStrings.BillingWS_PaymentPosting]: '付款记账',

    // ── Admin Workspace ────────────────────────────────────────────────────
    [BrightChartStrings.Admin_UserManagement]: '用户管理',
    [BrightChartStrings.Admin_RoleConfiguration]: '角色配置',
    [BrightChartStrings.Admin_AuditLog]: '审计日志',
    [BrightChartStrings.Admin_SpecialtyConfiguration]: '专科配置',
    [BrightChartStrings.Admin_PatientSearch]: '患者搜索',

    // ── Common Table Headers / Labels ──────────────────────────────────────
    [BrightChartStrings.Common_Date]: '日期',
    [BrightChartStrings.Common_Type]: '类型',
    [BrightChartStrings.Common_Status]: '状态',
    [BrightChartStrings.Common_Description]: '描述',
    [BrightChartStrings.Common_Amount]: '金额',
    [BrightChartStrings.Common_Balance]: '余额',
    [BrightChartStrings.Common_Name]: '姓名',
    [BrightChartStrings.Common_Actions]: '操作',
    [BrightChartStrings.Common_Priority]: '优先级',
    [BrightChartStrings.Common_Category]: '类别',
    [BrightChartStrings.Common_Patient]: '患者',
    [BrightChartStrings.Common_Provider]: '提供者',
    [BrightChartStrings.Common_Service]: '服务',
    [BrightChartStrings.Common_Notes]: '备注',
    [BrightChartStrings.Common_From]: '发件人',
    [BrightChartStrings.Common_To]: '收件人',

    // ── Common Buttons / Actions ───────────────────────────────────────────
    [BrightChartStrings.Common_Save]: '保存',
    [BrightChartStrings.Common_Cancel]: '取消',
    [BrightChartStrings.Common_Search]: '搜索',
    [BrightChartStrings.Common_Add]: '添加',
    [BrightChartStrings.Common_Remove]: '移除',
    [BrightChartStrings.Common_Submit]: '提交',
    [BrightChartStrings.Common_Create]: '创建',
    [BrightChartStrings.Common_Update]: '更新',
    [BrightChartStrings.Common_Delete]: '删除',
    [BrightChartStrings.Common_Sign]: '签署',
    [BrightChartStrings.Common_Close]: '关闭',
    [BrightChartStrings.Common_Back]: '返回',
    [BrightChartStrings.Common_Next]: '下一步',
    [BrightChartStrings.Common_Previous]: '上一步',
    [BrightChartStrings.Common_OfferSlot]: '提供时段',
    [BrightChartStrings.Common_SelectSlot]: '选择时段',

    // ── Common Empty States ────────────────────────────────────────────────
    [BrightChartStrings.Empty_NoResults]: '未找到结果。',
    [BrightChartStrings.Empty_NoDocuments]: '未找到文档',
    [BrightChartStrings.Empty_NoEncounters]: '未找到就诊记录。',
    [BrightChartStrings.Empty_NoOrders]: '没有匹配当前筛选条件的医嘱。',
    [BrightChartStrings.Empty_NoLedgerEntries]: '未找到账目记录。',
    [BrightChartStrings.Empty_NoAllergies]: '无已知过敏',
    [BrightChartStrings.Empty_NoMedications]: '无药物记录。',
    [BrightChartStrings.Empty_NoConditions]: '无疾病记录。',
    [BrightChartStrings.Empty_NoAppointments]: '无预约或可用时段。',
    [BrightChartStrings.Empty_NoSlots]: '无可用时段。',
    [BrightChartStrings.Empty_NoWaitlist]: '候补名单中无患者。',
    [BrightChartStrings.Empty_NoPermission]: '您没有权限查看患者。',

    // ── Form Labels ────────────────────────────────────────────────────────
    [BrightChartStrings.Form_GivenName]: '名',
    [BrightChartStrings.Form_FamilyName]: '姓',
    [BrightChartStrings.Form_BirthDate]: '出生日期',
    [BrightChartStrings.Form_Gender]: '性别',
    [BrightChartStrings.Form_SelectGender]: '选择性别',
    [BrightChartStrings.Form_Identifier]: '标识符',
    [BrightChartStrings.Form_Contact]: '联系方式',
    [BrightChartStrings.Form_Address]: '地址',
    [BrightChartStrings.Form_CreatePatient]: '创建患者',
    [BrightChartStrings.Form_UpdatePatient]: '更新患者',
    [BrightChartStrings.Form_CreateOrder]: '创建医嘱',
    [BrightChartStrings.Form_UpdateOrder]: '更新医嘱',
    [BrightChartStrings.Form_CreatePrescription]: '创建处方',
    [BrightChartStrings.Form_UpdatePrescription]: '更新处方',
    [BrightChartStrings.Form_CreateObservation]: '创建观察',
    [BrightChartStrings.Form_UpdateObservation]: '更新观察',
    [BrightChartStrings.Form_BookAppointment]: '预约',
    [BrightChartStrings.Form_RescheduleAppointment]: '重新安排预约',
    [BrightChartStrings.Form_CheckIn]: '签到',
    [BrightChartStrings.Form_UpdateEncounter]: '更新就诊',
    [BrightChartStrings.Form_SubmitClaim]: '提交索赔',
    [BrightChartStrings.Form_FinalizeSuperbill]: '确认超级账单',

    // ── Allergy List ───────────────────────────────────────────────────────
    [BrightChartStrings.AllergyList_Title]: '过敏与不耐受',
    [BrightChartStrings.AllergyList_AddNew]: '+ 添加',

    // ── Condition List ─────────────────────────────────────────────────────
    [BrightChartStrings.ConditionList_Title]: '疾病 / 问题',
    [BrightChartStrings.ConditionList_AddNew]: '+ 添加',

    // ── Medication List ────────────────────────────────────────────────────
    [BrightChartStrings.MedicationList_Title]: '药物',
    [BrightChartStrings.MedicationList_ActiveMedications]: '活跃药物',
    [BrightChartStrings.MedicationList_Completed]: '已完成',
    [BrightChartStrings.MedicationList_Stopped]: '已停止',
    [BrightChartStrings.MedicationList_Other]: '其他',

    // ── Encounter List ─────────────────────────────────────────────────────
    [BrightChartStrings.EncounterList_StatusFilter]: '状态:',
    [BrightChartStrings.EncounterList_ClassFilter]: '类别:',

    // ── Document List / Viewer ─────────────────────────────────────────────
    [BrightChartStrings.DocumentViewer_NoDocument]: '无文档可显示',
    [BrightChartStrings.DocumentViewer_ExplanationOfBenefit]: '福利说明',

    // ── Ledger ─────────────────────────────────────────────────────────────
    [BrightChartStrings.Ledger_CurrentBalance]: '当前余额:',

    // ── Waitlist ───────────────────────────────────────────────────────────
    [BrightChartStrings.Waitlist_Title]: '候补名单管理',
    [BrightChartStrings.Waitlist_WaitTime]: '等待时间',
    [BrightChartStrings.Waitlist_PreferredDates]: '首选日期',
    [BrightChartStrings.Waitlist_PreferredProvider]: '首选提供者',

    // ── Schedule ───────────────────────────────────────────────────────────
    [BrightChartStrings.Schedule_Day]: '日',
    [BrightChartStrings.Schedule_Week]: '周',
    [BrightChartStrings.Schedule_Month]: '月',
    [BrightChartStrings.Schedule_Available]: '可用',

    // ── Clinical Note Editor ───────────────────────────────────────────────
    [BrightChartStrings.NoteEditor_EmptyState]:
      '未提供组合或模板。请选择模板以开始新笔记。',

    // ── Insurance ──────────────────────────────────────────────────────────
    [BrightChartStrings.Insurance_PlanType]: '计划类型',
    [BrightChartStrings.Insurance_GroupNumber]: '团体编号',
    [BrightChartStrings.Insurance_MemberID]: '会员编号',
    [BrightChartStrings.Insurance_SubscriberName]: '订阅者姓名',
    [BrightChartStrings.Insurance_Relationship]: '关系',
    [BrightChartStrings.Insurance_PayerName]: '付款人名称',
    [BrightChartStrings.Insurance_Eligibility]: '保险资格',

    // ── Clinical Timeline ──────────────────────────────────────────────────
    [BrightChartStrings.ClinicalTimeline_AriaLabel]: '临床时间线',
    [BrightChartStrings.ClinicalTimeline_FilterAriaLabel]: '资源类型筛选器',
    [BrightChartStrings.ClinicalTimeline_Empty]: '没有可用的临床数据。',
    [BrightChartStrings.ClinicalTimeline_Unknown]: '未知',
    [BrightChartStrings.ClinicalTimeline_NoDate]: '无日期',

    // ── Note Template Selector ─────────────────────────────────────────────
    [BrightChartStrings.NoteTemplateSelector_AriaLabel]: '笔记模板选择器',
    [BrightChartStrings.NoteTemplateSelector_Empty]: '没有可用的模板',
    [BrightChartStrings.NoteTemplateSelector_GroupAriaTemplate]:
      '文档类型 {CODE}',
    [BrightChartStrings.NoteTemplateSelector_SelectTemplate]:
      '选择模板：{NAME}',

    // ── Encounter Workflow Board ───────────────────────────────────────────
    [BrightChartStrings.WorkflowBoard_AriaLabel]: '就诊工作流看板',
    [BrightChartStrings.WorkflowBoard_UnknownPatient]: '未知患者',
    [BrightChartStrings.WorkflowBoard_NoEncounters]: '无就诊',
    [BrightChartStrings.WorkflowBoard_ColumnAriaTemplate]: '{NAME} 列',

    // ── Schedule Editor ────────────────────────────────────────────────────
    [BrightChartStrings.ScheduleEditor_Title]: '排班编辑器',
    [BrightChartStrings.ScheduleEditor_AriaLabel]: '排班可用性编辑器',
    [BrightChartStrings.ScheduleEditor_AddBlockLegend]: '添加可用时间段',
    [BrightChartStrings.ScheduleEditor_DayLabel]: '日期',
    [BrightChartStrings.ScheduleEditor_StartTime]: '开始时间',
    [BrightChartStrings.ScheduleEditor_EndTime]: '结束时间',
    [BrightChartStrings.ScheduleEditor_RecurringWeekly]: '每周重复',
    [BrightChartStrings.ScheduleEditor_AddBlock]: '添加时间段',
    [BrightChartStrings.ScheduleEditor_StartBeforeEnd]:
      '开始时间必须早于结束时间',
    [BrightChartStrings.ScheduleEditor_NoAvailability]: '无可用时间',
    [BrightChartStrings.ScheduleEditor_Recurring]: '重复',
    [BrightChartStrings.ScheduleEditor_GridAriaLabel]: '每周可用性网格',
    [BrightChartStrings.ScheduleEditor_SaveSchedule]: '保存排班',
    [BrightChartStrings.ScheduleEditor_Day_Monday]: '星期一',
    [BrightChartStrings.ScheduleEditor_Day_Tuesday]: '星期二',
    [BrightChartStrings.ScheduleEditor_Day_Wednesday]: '星期三',
    [BrightChartStrings.ScheduleEditor_Day_Thursday]: '星期四',
    [BrightChartStrings.ScheduleEditor_Day_Friday]: '星期五',
    [BrightChartStrings.ScheduleEditor_Day_Saturday]: '星期六',
    [BrightChartStrings.ScheduleEditor_Day_Sunday]: '星期日',

    // ── Connectivity Indicator ─────────────────────────────────────────────
    [BrightChartStrings.Connectivity_Online]: '在线',
    [BrightChartStrings.Connectivity_Offline]: '离线',
    [BrightChartStrings.Connectivity_StatusTemplate]: '连接状态：{STATUS}',

    // ── Notification Bell ──────────────────────────────────────────────────
    [BrightChartStrings.NotificationBell_AriaLabel]: '通知',
    [BrightChartStrings.NotificationBell_UnreadTemplate]:
      '通知，{COUNT} 条未读',

    // ── Role Switcher ──────────────────────────────────────────────────────
    [BrightChartStrings.RoleSwitcher_AriaLabel]: '切换医疗角色',
    [BrightChartStrings.RoleSwitcher_MenuAriaLabel]: '医疗角色选择',

    // ── Patient Header ─────────────────────────────────────────────────────
    [BrightChartStrings.PatientHeader_AriaLabel]: '患者信息',
    [BrightChartStrings.PatientHeader_Unknown]: '未知',
    [BrightChartStrings.PatientHeader_MRN]: 'MRN:',
    [BrightChartStrings.PatientHeader_NA]: 'N/A',
    [BrightChartStrings.PatientHeader_AllergyTemplate]: '过敏：{NAME}',

    // ── Navigation Labels ──────────────────────────────────────────────────
    [BrightChartStrings.Nav_Patients]: '患者',
    [BrightChartStrings.Nav_Clients]: '客户',
    [BrightChartStrings.Nav_Encounters]: '就诊',
    [BrightChartStrings.Nav_Schedule]: '日程',
    [BrightChartStrings.Nav_Inbox]: '收件箱',
    [BrightChartStrings.Nav_OperatoryView]: '手术室视图',
    [BrightChartStrings.Nav_TreatmentPlans]: '治疗计划',
    [BrightChartStrings.Nav_SpeciesFilter]: '物种筛选',
    [BrightChartStrings.Nav_FarmCalls]: '农场出诊',
    [BrightChartStrings.Nav_MyHealth]: '我的健康',
    [BrightChartStrings.Nav_Appointments]: '预约',
    [BrightChartStrings.Nav_TestResults]: '检查结果',
    [BrightChartStrings.Nav_BillsPayments]: '账单与付款',
    [BrightChartStrings.Nav_CheckIn]: '签到',
    [BrightChartStrings.Nav_Waitlist]: '候诊名单',
    [BrightChartStrings.Nav_Registration]: '登记',
    [BrightChartStrings.Nav_Insurance]: '保险',
    [BrightChartStrings.Nav_Superbills]: '超级账单',
    [BrightChartStrings.Nav_Claims]: '索赔',
    [BrightChartStrings.Nav_ClaimTracking]: '索赔跟踪',
    [BrightChartStrings.Nav_Payments]: '付款',
    [BrightChartStrings.Nav_PatientLedger]: '患者账本',
    [BrightChartStrings.Nav_FeeSchedules]: '费用表',
    [BrightChartStrings.Nav_Users]: '用户',
    [BrightChartStrings.Nav_Roles]: '角色',
    [BrightChartStrings.Nav_AuditLog]: '审计日志',
    [BrightChartStrings.Nav_SpecialtyConfig]: '专科配置',
    [BrightChartStrings.Nav_Settings]: '设置',
    [BrightChartStrings.Nav_Organizations]: '组织',
    [BrightChartStrings.Nav_Clinician]: '临床医生',
    [BrightChartStrings.Nav_PatientPortal]: '患者门户',
    [BrightChartStrings.Nav_Billing]: '计费',

    // ── Sidebar ────────────────────────────────────────────────────────────
    [BrightChartStrings.Sidebar_ExpandAriaLabel]: '展开侧边栏',
    [BrightChartStrings.Sidebar_CollapseAriaLabel]: '折叠侧边栏',
    [BrightChartStrings.Sidebar_NavAriaLabel]: 'BrightChart 导航',

    [BrightChartStrings.BottomNav_AriaLabel]: 'BrightChart 移动导航',
    [BrightChartStrings.Layout_NavAriaTemplate]: '{NAME} 导航',
  };
