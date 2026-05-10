import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightCalStringKey,
  BrightCalStrings,
} from '../../enumerations/brightCalStrings';

export const MandarinStrings: ComponentStrings<BrightCalStringKey> = {
  // ── Common ──
  [BrightCalStrings.Common_Calendar]: '日历',
  [BrightCalStrings.Common_Event]: '事件',
  [BrightCalStrings.Common_Booking]: '预约',
  [BrightCalStrings.Common_Schedule]: '日程',
  [BrightCalStrings.Common_Invitation]: '邀请',

  // ── View modes ──
  [BrightCalStrings.View_Month]: '月',
  [BrightCalStrings.View_Week]: '周',
  [BrightCalStrings.View_Day]: '日',
  [BrightCalStrings.View_Agenda]: '日程列表',

  // ── Actions ──
  [BrightCalStrings.Action_Create]: '创建',
  [BrightCalStrings.Action_Save]: '保存',
  [BrightCalStrings.Action_Cancel]: '取消',
  [BrightCalStrings.Action_Delete]: '删除',
  [BrightCalStrings.Action_Edit]: '编辑',
  [BrightCalStrings.Action_Retry]: '重试',
  [BrightCalStrings.Action_Accept]: '接受',
  [BrightCalStrings.Action_Decline]: '拒绝',
  [BrightCalStrings.Action_Tentative]: '暂定',
  [BrightCalStrings.Action_AddEvent]: '添加事件',
  [BrightCalStrings.Action_ConfirmBooking]: '确认预约',
  [BrightCalStrings.Action_GoToToday]: '今天',
  [BrightCalStrings.Action_PreviousMonth]: '上个月',
  [BrightCalStrings.Action_NextMonth]: '下个月',
  [BrightCalStrings.Action_PreviousDay]: '前一天',
  [BrightCalStrings.Action_NextDay]: '后一天',
  [BrightCalStrings.Action_Close]: '关闭',

  // ── Labels ──
  [BrightCalStrings.Label_Title]: '标题',
  [BrightCalStrings.Label_Start]: '开始',
  [BrightCalStrings.Label_End]: '结束',
  [BrightCalStrings.Label_Location]: '地点',
  [BrightCalStrings.Label_Description]: '描述',
  [BrightCalStrings.Label_Attendees]: '参与者',
  [BrightCalStrings.Label_When]: '时间',
  [BrightCalStrings.Label_Where]: '地点',
  [BrightCalStrings.Label_Name]: '姓名',
  [BrightCalStrings.Label_Email]: '电子邮件',
  [BrightCalStrings.Label_Upcoming]: '即将到来',
  [BrightCalStrings.Label_Loading]: '正在加载日历',
  [BrightCalStrings.Label_RsvpActions]: 'RSVP 操作',
  [BrightCalStrings.Label_BookingPage]: '预约页面',
  [BrightCalStrings.Label_BookingForm]: '预约表单',
  [BrightCalStrings.Label_AvailableSlots]: '可用时段',
  [BrightCalStrings.Label_DateNavigation]: '日期导航',
  [BrightCalStrings.Label_CalendarSidebar]: '日历侧边栏',
  [BrightCalStrings.Label_CreateEvent]: '创建事件',
  [BrightCalStrings.Label_EditEvent]: '编辑事件',
  [BrightCalStrings.Label_AddCalendarEvent]: '添加日历事件',
  [BrightCalStrings.Label_AllDay]: '全天',
  [BrightCalStrings.Label_Visibility]: '可见性',
  [BrightCalStrings.Label_Calendar]: '日历',

  // ── Status ──
  [BrightCalStrings.Status_Updated]: '已更新',
  [BrightCalStrings.Status_NoUpcomingEvents]: '没有即将到来的事件',
  [BrightCalStrings.Status_NoAvailableSlots]: '该日期没有可用时段',

  // ── Validation errors (controllers) ──
  [BrightCalStrings.Error_MissingField_Template]: '必填字段缺失或无效：{field}',
  [BrightCalStrings.Error_InvalidField_Template]: '字段值无效：{field}',
  [BrightCalStrings.Error_FieldTooLong_Template]:
    '{field} 不能超过 {max} 个字符',
  [BrightCalStrings.Error_InvalidHexColor]:
    'color 必须是有效的 hex 颜色代码（例如 "#FF5733"）',
  [BrightCalStrings.Error_InvalidISODate_Template]:
    '{field} 必须是有效的 ISO 8601 日期/时间',
  [BrightCalStrings.Error_EndBeforeStart]: 'dtend 必须晚于 dtstart',
  [BrightCalStrings.Error_InvalidVisibility]:
    'visibility 必须是以下值之一：{values}',
  [BrightCalStrings.Error_InvalidTransparency]:
    'transparency 必须是以下值之一：{values}',
  [BrightCalStrings.Error_MissingCalendarId]: '缺少必需的查询参数：calendarId',
  [BrightCalStrings.Error_MissingId]: '缺少必需的参数：id',
  [BrightCalStrings.Error_MissingSearchQuery]: '缺少或为空的必需查询参数：q',
  [BrightCalStrings.Error_EmptySummary]: 'summary 必须是非空字符串',
  [BrightCalStrings.Error_NoUpdateFields]:
    '至少需要提供一个字段（displayName、color、description）',
  [BrightCalStrings.Error_InvalidRsvpResponse]:
    'response 必须是以下值之一：ACCEPTED、DECLINED、TENTATIVE',
  [BrightCalStrings.Error_InvalidDuplicateMode]:
    'duplicateMode 必须是以下值之一：skip、overwrite、create-new',
  [BrightCalStrings.Error_MissingIcsData]: '必填字段缺失或无效：icsData',
  [BrightCalStrings.Error_EmptyUserIds]: 'userIds 必须是非空的用户 ID 数组',
  [BrightCalStrings.Error_InvalidUserId]: '每个 userId 必须是非空字符串',
  [BrightCalStrings.Error_InvalidDuration]: 'durationMinutes 必须是正数',
  [BrightCalStrings.Error_NoAttendees]: '至少需要指定一个必需或可选的参与者',
  [BrightCalStrings.Error_EmptyAppointmentTypes]:
    'appointmentTypes 必须是非空数组',
  [BrightCalStrings.Error_MissingSlug]: '必填字段缺失或无效：slug',
  [BrightCalStrings.Error_MissingTitle]: '必填字段缺失或无效：title',
  [BrightCalStrings.Error_MissingDate]: '必需的查询参数缺失或无效：date',
  [BrightCalStrings.Error_MissingAppointmentType]:
    '必需的查询参数缺失或无效：appointmentType',
  [BrightCalStrings.Error_MissingStartTime]: '必填字段缺失或无效：startTime',
  [BrightCalStrings.Error_MissingBookerName]: '必填字段缺失或无效：bookerName',
  [BrightCalStrings.Error_MissingBookerEmail]:
    '必填字段缺失或无效：bookerEmail',
  [BrightCalStrings.Error_InvalidComment]: 'comment 必须是字符串',
  [BrightCalStrings.Error_MissingCounterProposalId]:
    '必填字段缺失或无效：counterProposalId',
  [BrightCalStrings.Error_MissingEventId]: '必填字段缺失或无效：eventId',
  [BrightCalStrings.Error_MissingProposedStart]:
    '必填字段缺失或无效：proposedStart',
  [BrightCalStrings.Error_MissingProposedEnd]:
    '必填字段缺失或无效：proposedEnd',
  [BrightCalStrings.Error_MissingCalendarIdParam]: '缺少必需的参数：calendarId',
  [BrightCalStrings.Error_DescriptionMustBeString]: 'description 必须是字符串',
  [BrightCalStrings.Error_InvalidStartDate]:
    'start 必须是有效的 ISO 8601 日期/时间',
  [BrightCalStrings.Error_InvalidEndDate]:
    'end 必须是有效的 ISO 8601 日期/时间',

  // ── Permission errors ──
  [BrightCalStrings.Error_Forbidden_CalendarUpdate]:
    '只有日历所有者才能更新此日历',
  [BrightCalStrings.Error_Forbidden_CalendarDelete]:
    '只有日历所有者才能删除此日历',
  [BrightCalStrings.Error_Forbidden_EventUpdate]: '权限不足，无法更新此事件',
  [BrightCalStrings.Error_Forbidden_EventDelete]: '权限不足，无法删除此事件',
  [BrightCalStrings.Error_Forbidden_Export]: '权限不足，无法导出此日历',
  [BrightCalStrings.Error_Forbidden_Import]: '权限不足，无法导入到此日历',

  // ── Service errors ──
  [BrightCalStrings.Error_ServiceUnavailable_Calendar]: '日历服务不可用',
  [BrightCalStrings.Error_ServiceUnavailable_Event]: '事件服务不可用',
  [BrightCalStrings.Error_ServiceUnavailable_Scheduling]: '日程安排服务不可用',
  [BrightCalStrings.Error_ServiceUnavailable_Invitation]: '邀请服务不可用',
  [BrightCalStrings.Error_ServiceUnavailable_Booking]: '预约服务不可用',
  [BrightCalStrings.Error_ServiceUnavailable_Search]: '搜索服务不可用',
  [BrightCalStrings.Error_ServiceUnavailable_ExportImport]:
    '导出/导入服务不可用',

  // ── Not found ──
  [BrightCalStrings.Error_NotFound_BookingPage]: '未找到预约页面',
  [BrightCalStrings.Error_SlotUnavailable]: '所请求的时段已不可用',
  [BrightCalStrings.Error_NotFound_AppointmentType]: '未找到预约页面或预约类型',

  // ── Friends ──
  [BrightCalStrings.Friends_SectionTitle]: '好友',

  // ── 日历侧边栏 ──
  [BrightCalStrings.Label_MyCalendars]: '我的日历',
  [BrightCalStrings.Label_OtherCalendars]: '其他日历',
  [BrightCalStrings.Label_CalendarName]: '日历名称',
  [BrightCalStrings.Label_CalendarUrl]: '日历URL',
  [BrightCalStrings.Label_NewName]: '新名称',
  [BrightCalStrings.Label_CalendarColor]: '日历颜色',
  [BrightCalStrings.Label_CalendarOptions]: '日历选项',
  [BrightCalStrings.Label_ConfirmDelete]: '确认删除',
  [BrightCalStrings.Label_DismissError]: '关闭错误',
  [BrightCalStrings.Label_AddCalendarForm]: '添加日历表单',
  [BrightCalStrings.Label_SubscribeToCalendarForm]: '订阅日历表单',
  [BrightCalStrings.Label_RenameCalendarForm]: '重命名日历表单',
  [BrightCalStrings.Label_ChangeCalendarColorForm]: '更改日历颜色表单',
  [BrightCalStrings.Label_NewCalendarName]: '新日历名称',
  [BrightCalStrings.Label_CalendarControls]: '日历控件',
  [BrightCalStrings.Label_CalendarApplication]: '日历应用',
  [BrightCalStrings.Label_CalendarNavigation]: '日历导航',
  [BrightCalStrings.Label_CalendarContent]: '日历内容',
  [BrightCalStrings.Label_WeekView]: '周视图',
  [BrightCalStrings.Label_DayViewTemplate]: '{DATE}的日视图',
  [BrightCalStrings.Label_AttendeeAvailability]: '参与者可用性',
  [BrightCalStrings.Label_Attendee]: '参与者',
  [BrightCalStrings.Label_MiniCalendar]: '迷你日历',
  [BrightCalStrings.Label_AgendaView]: '议程视图',
  [BrightCalStrings.Action_AddCalendar]: '添加日历',
  [BrightCalStrings.Action_SubscribeToCalendar]: '订阅日历',
  [BrightCalStrings.Action_BrowseHolidayCalendars]: '浏览节假日日历',
  [BrightCalStrings.Action_Subscribe]: '订阅',
  [BrightCalStrings.Action_Rename]: '重命名',
  [BrightCalStrings.Action_ChangeColor]: '更改颜色',
  [BrightCalStrings.Action_Share]: '共享',
  [BrightCalStrings.Action_Revoke]: '撤销',
  [BrightCalStrings.Action_CopyPublicLink]: '复制公开链接',
  [BrightCalStrings.Action_RevokePublicLink]: '撤销公开链接',
  [BrightCalStrings.Sidebar_CannotDeleteDefault]: '无法删除默认日历',
  [BrightCalStrings.Sidebar_ConfirmDeleteMessage]:
    '确定要删除此日历吗？此操作无法撤销。',
  [BrightCalStrings.Sharing_DialogTitleTemplate]: '共享"{NAME}"',
  [BrightCalStrings.Sharing_CurrentShares]: '当前共享',
  [BrightCalStrings.Sharing_NoShares]: '暂无共享。请在下方添加用户。',
  [BrightCalStrings.Sharing_AddShare]: '添加共享',
  [BrightCalStrings.Sharing_LinkCopied]: '链接已复制到剪贴板',
  [BrightCalStrings.Sharing_SelectAndCopy]: '请选择并复制上方链接',
  [BrightCalStrings.Label_CloseSharingDialog]: '关闭共享对话框',
  [BrightCalStrings.Label_SharedUsers]: '共享用户',
  [BrightCalStrings.Label_ShareCalendarForm]: '日历共享表单',
  [BrightCalStrings.Label_UserId]: '用户ID',
  [BrightCalStrings.Label_PermissionLevel]: '权限级别',
  [BrightCalStrings.Label_PublicLink]: '公开链接',
  [BrightCalStrings.Label_PublicLinkUrl]: '公开链接URL',
  [BrightCalStrings.Permission_Owner]: '所有者',
  [BrightCalStrings.Permission_Editor]: '编辑者',
  [BrightCalStrings.Permission_Viewer]: '查看者',
  [BrightCalStrings.Permission_FreeBusyOnly]: '仅空闲/忙碌',
  [BrightCalStrings.Visibility_Public]: '公开',
  [BrightCalStrings.Visibility_Private]: '私密',
  [BrightCalStrings.Visibility_Confidential]: '机密',
  [BrightCalStrings.Weekday_Sun]: '日',
  [BrightCalStrings.Weekday_Mon]: '一',
  [BrightCalStrings.Weekday_Tue]: '二',
  [BrightCalStrings.Weekday_Wed]: '三',
  [BrightCalStrings.Weekday_Thu]: '四',
  [BrightCalStrings.Weekday_Fri]: '五',
  [BrightCalStrings.Weekday_Sat]: '六',
  [BrightCalStrings.Label_HolidayCalendars]: '节假日日历',
  [BrightCalStrings.Label_SearchHolidayCalendars]: '搜索节假日日历',
  [BrightCalStrings.Label_CloseHolidayCatalog]: '关闭节假日目录',
  [BrightCalStrings.Holiday_SearchPlaceholder]: '按名称或地区搜索...',
  [BrightCalStrings.Holiday_NoCalendarsFound]: '未找到节假日日历。',
  [BrightCalStrings.Holiday_UnableToLoad]: '无法加载节假日日历',
  [BrightCalStrings.Status_Subscribed]: '已订阅',
  [BrightCalStrings.Tooltip_AddEvent]: '使用这些收件人创建日历事件',
};
