import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightCalStringKey,
  BrightCalStrings,
} from '../../enumerations/brightCalStrings';

export const JapaneseStrings: ComponentStrings<BrightCalStringKey> = {
  // ── Common ──
  [BrightCalStrings.Common_Calendar]: 'カレンダー',
  [BrightCalStrings.Common_Event]: 'イベント',
  [BrightCalStrings.Common_Booking]: '予約',
  [BrightCalStrings.Common_Schedule]: 'スケジュール',
  [BrightCalStrings.Common_Invitation]: '招待',

  // ── View modes ──
  [BrightCalStrings.View_Month]: '月',
  [BrightCalStrings.View_Week]: '週',
  [BrightCalStrings.View_Day]: '日',
  [BrightCalStrings.View_Agenda]: '予定一覧',

  // ── Actions ──
  [BrightCalStrings.Action_Create]: '作成',
  [BrightCalStrings.Action_Save]: '保存',
  [BrightCalStrings.Action_Cancel]: 'キャンセル',
  [BrightCalStrings.Action_Delete]: '削除',
  [BrightCalStrings.Action_Edit]: '編集',
  [BrightCalStrings.Action_Retry]: '再試行',
  [BrightCalStrings.Action_Accept]: '承諾',
  [BrightCalStrings.Action_Decline]: '辞退',
  [BrightCalStrings.Action_Tentative]: '仮承諾',
  [BrightCalStrings.Action_AddEvent]: 'イベントを追加',
  [BrightCalStrings.Action_ConfirmBooking]: '予約を確定',
  [BrightCalStrings.Action_GoToToday]: '今日',
  [BrightCalStrings.Action_PreviousMonth]: '前月',
  [BrightCalStrings.Action_NextMonth]: '翌月',
  [BrightCalStrings.Action_PreviousDay]: '前日',
  [BrightCalStrings.Action_NextDay]: '翌日',
  [BrightCalStrings.Action_Close]: '閉じる',

  // ── Labels ──
  [BrightCalStrings.Label_Title]: 'タイトル',
  [BrightCalStrings.Label_Start]: '開始',
  [BrightCalStrings.Label_End]: '終了',
  [BrightCalStrings.Label_Location]: '場所',
  [BrightCalStrings.Label_Description]: '説明',
  [BrightCalStrings.Label_Attendees]: '参加者',
  [BrightCalStrings.Label_When]: '日時',
  [BrightCalStrings.Label_Where]: '場所',
  [BrightCalStrings.Label_Name]: '名前',
  [BrightCalStrings.Label_Email]: 'メールアドレス',
  [BrightCalStrings.Label_Upcoming]: '今後の予定',
  [BrightCalStrings.Label_Loading]: 'カレンダーを読み込み中',
  [BrightCalStrings.Label_RsvpActions]: 'RSVP アクション',
  [BrightCalStrings.Label_BookingPage]: '予約ページ',
  [BrightCalStrings.Label_BookingForm]: '予約フォーム',
  [BrightCalStrings.Label_AvailableSlots]: '空き時間枠',
  [BrightCalStrings.Label_DateNavigation]: '日付ナビゲーション',
  [BrightCalStrings.Label_CalendarSidebar]: 'カレンダーサイドバー',
  [BrightCalStrings.Label_CreateEvent]: 'イベントを作成',
  [BrightCalStrings.Label_EditEvent]: 'イベントを編集',
  [BrightCalStrings.Label_AddCalendarEvent]: 'カレンダーにイベントを追加',
  [BrightCalStrings.Label_AllDay]: '終日',
  [BrightCalStrings.Label_Visibility]: '公開設定',
  [BrightCalStrings.Label_Calendar]: 'カレンダー',

  // ── Status ──
  [BrightCalStrings.Status_Updated]: '更新済み',
  [BrightCalStrings.Status_NoUpcomingEvents]: '今後の予定はありません',
  [BrightCalStrings.Status_NoAvailableSlots]:
    'この日付に空き時間枠はありません',

  // ── Validation errors (controllers) ──
  [BrightCalStrings.Error_MissingField_Template]:
    '必須フィールドが不足または無効です：{field}',
  [BrightCalStrings.Error_InvalidField_Template]:
    'フィールドの値が無効です：{field}',
  [BrightCalStrings.Error_FieldTooLong_Template]:
    '{field} は {max} 文字以内にしてください',
  [BrightCalStrings.Error_InvalidHexColor]:
    'color は有効な hex カラーコードである必要があります（例：「#FF5733」）',
  [BrightCalStrings.Error_InvalidISODate_Template]:
    '{field} は有効な ISO 8601 日時である必要があります',
  [BrightCalStrings.Error_EndBeforeStart]:
    'dtend は dtstart より後である必要があります',
  [BrightCalStrings.Error_InvalidVisibility]:
    'visibility は次のいずれかである必要があります：{values}',
  [BrightCalStrings.Error_InvalidTransparency]:
    'transparency は次のいずれかである必要があります：{values}',
  [BrightCalStrings.Error_MissingCalendarId]:
    '必須クエリパラメータが不足しています：calendarId',
  [BrightCalStrings.Error_MissingId]: '必須パラメータが不足しています：id',
  [BrightCalStrings.Error_MissingSearchQuery]:
    '必須クエリパラメータが不足または空です：q',
  [BrightCalStrings.Error_EmptySummary]:
    'summary は空でない文字列である必要があります',
  [BrightCalStrings.Error_NoUpdateFields]:
    '少なくとも1つのフィールド（displayName、color、description）を指定してください',
  [BrightCalStrings.Error_InvalidRsvpResponse]:
    'response は次のいずれかである必要があります：ACCEPTED、DECLINED、TENTATIVE',
  [BrightCalStrings.Error_InvalidDuplicateMode]:
    'duplicateMode は次のいずれかである必要があります：skip、overwrite、create-new',
  [BrightCalStrings.Error_MissingIcsData]:
    '必須フィールドが不足または無効です：icsData',
  [BrightCalStrings.Error_EmptyUserIds]:
    'userIds はユーザー ID の空でない配列である必要があります',
  [BrightCalStrings.Error_InvalidUserId]:
    '各 userId は空でない文字列である必要があります',
  [BrightCalStrings.Error_InvalidDuration]:
    'durationMinutes は正の数である必要があります',
  [BrightCalStrings.Error_NoAttendees]:
    '必須または任意の参加者を少なくとも1人指定してください',
  [BrightCalStrings.Error_EmptyAppointmentTypes]:
    'appointmentTypes は空でない配列である必要があります',
  [BrightCalStrings.Error_MissingSlug]:
    '必須フィールドが不足または無効です：slug',
  [BrightCalStrings.Error_MissingTitle]:
    '必須フィールドが不足または無効です：title',
  [BrightCalStrings.Error_MissingDate]:
    '必須クエリパラメータが不足または無効です：date',
  [BrightCalStrings.Error_MissingAppointmentType]:
    '必須クエリパラメータが不足または無効です：appointmentType',
  [BrightCalStrings.Error_MissingStartTime]:
    '必須フィールドが不足または無効です：startTime',
  [BrightCalStrings.Error_MissingBookerName]:
    '必須フィールドが不足または無効です：bookerName',
  [BrightCalStrings.Error_MissingBookerEmail]:
    '必須フィールドが不足または無効です：bookerEmail',
  [BrightCalStrings.Error_InvalidComment]:
    'comment は文字列である必要があります',
  [BrightCalStrings.Error_MissingCounterProposalId]:
    '必須フィールドが不足または無効です：counterProposalId',
  [BrightCalStrings.Error_MissingEventId]:
    '必須フィールドが不足または無効です：eventId',
  [BrightCalStrings.Error_MissingProposedStart]:
    '必須フィールドが不足または無効です：proposedStart',
  [BrightCalStrings.Error_MissingProposedEnd]:
    '必須フィールドが不足または無効です：proposedEnd',
  [BrightCalStrings.Error_MissingCalendarIdParam]:
    '必須パラメータが不足しています：calendarId',
  [BrightCalStrings.Error_DescriptionMustBeString]:
    'description は文字列である必要があります',
  [BrightCalStrings.Error_InvalidStartDate]:
    'start は有効な ISO 8601 日時である必要があります',
  [BrightCalStrings.Error_InvalidEndDate]:
    'end は有効な ISO 8601 日時である必要があります',

  // ── Permission errors ──
  [BrightCalStrings.Error_Forbidden_CalendarUpdate]:
    'カレンダーの所有者のみがこのカレンダーを更新できます',
  [BrightCalStrings.Error_Forbidden_CalendarDelete]:
    'カレンダーの所有者のみがこのカレンダーを削除できます',
  [BrightCalStrings.Error_Forbidden_EventUpdate]:
    'このイベントを更新する権限がありません',
  [BrightCalStrings.Error_Forbidden_EventDelete]:
    'このイベントを削除する権限がありません',
  [BrightCalStrings.Error_Forbidden_Export]:
    'このカレンダーをエクスポートする権限がありません',
  [BrightCalStrings.Error_Forbidden_Import]:
    'このカレンダーにインポートする権限がありません',

  // ── Service errors ──
  [BrightCalStrings.Error_ServiceUnavailable_Calendar]:
    'カレンダーサービスを利用できません',
  [BrightCalStrings.Error_ServiceUnavailable_Event]:
    'イベントサービスを利用できません',
  [BrightCalStrings.Error_ServiceUnavailable_Scheduling]:
    'スケジュールサービスを利用できません',
  [BrightCalStrings.Error_ServiceUnavailable_Invitation]:
    '招待サービスを利用できません',
  [BrightCalStrings.Error_ServiceUnavailable_Booking]:
    '予約サービスを利用できません',
  [BrightCalStrings.Error_ServiceUnavailable_Search]:
    '検索サービスを利用できません',
  [BrightCalStrings.Error_ServiceUnavailable_ExportImport]:
    'エクスポート/インポートサービスを利用できません',

  // ── Not found ──
  [BrightCalStrings.Error_NotFound_BookingPage]: '予約ページが見つかりません',
  [BrightCalStrings.Error_SlotUnavailable]:
    'リクエストされた時間枠はすでに利用できません',
  [BrightCalStrings.Error_NotFound_AppointmentType]:
    '予約ページまたは予約タイプが見つかりません',

  // ── Friends ──
  [BrightCalStrings.Friends_SectionTitle]: 'フレンド',

  // ── カレンダーサイドバー ──
  [BrightCalStrings.Label_MyCalendars]: 'マイカレンダー',
  [BrightCalStrings.Label_OtherCalendars]: 'その他のカレンダー',
  [BrightCalStrings.Label_CalendarName]: 'カレンダー名',
  [BrightCalStrings.Label_CalendarUrl]: 'カレンダーURL',
  [BrightCalStrings.Label_NewName]: '新しい名前',
  [BrightCalStrings.Label_CalendarColor]: 'カレンダーの色',
  [BrightCalStrings.Label_CalendarOptions]: 'カレンダーオプション',
  [BrightCalStrings.Label_ConfirmDelete]: '削除の確認',
  [BrightCalStrings.Label_DismissError]: 'エラーを閉じる',
  [BrightCalStrings.Label_AddCalendarForm]: 'カレンダー追加フォーム',
  [BrightCalStrings.Label_SubscribeToCalendarForm]: 'カレンダー購読フォーム',
  [BrightCalStrings.Label_RenameCalendarForm]: 'カレンダー名変更フォーム',
  [BrightCalStrings.Label_ChangeCalendarColorForm]: 'カレンダー色変更フォーム',
  [BrightCalStrings.Label_NewCalendarName]: '新しいカレンダー名',
  [BrightCalStrings.Label_CalendarControls]: 'カレンダーコントロール',
  [BrightCalStrings.Label_CalendarApplication]: 'カレンダーアプリケーション',
  [BrightCalStrings.Label_CalendarNavigation]: 'カレンダーナビゲーション',
  [BrightCalStrings.Label_CalendarContent]: 'カレンダーコンテンツ',
  [BrightCalStrings.Label_WeekView]: '週表示',
  [BrightCalStrings.Label_DayViewTemplate]: '{DATE}の日表示',
  [BrightCalStrings.Label_AttendeeAvailability]: '参加者の空き状況',
  [BrightCalStrings.Label_Attendee]: '参加者',
  [BrightCalStrings.Label_MiniCalendar]: 'ミニカレンダー',
  [BrightCalStrings.Label_AgendaView]: 'アジェンダ表示',
  [BrightCalStrings.Action_AddCalendar]: 'カレンダーを追加',
  [BrightCalStrings.Action_SubscribeToCalendar]: 'カレンダーを購読',
  [BrightCalStrings.Action_BrowseHolidayCalendars]: '祝日カレンダーを閲覧',
  [BrightCalStrings.Action_Subscribe]: '購読',
  [BrightCalStrings.Action_Rename]: '名前を変更',
  [BrightCalStrings.Action_ChangeColor]: '色を変更',
  [BrightCalStrings.Action_Share]: '共有',
  [BrightCalStrings.Action_Revoke]: '取り消し',
  [BrightCalStrings.Action_CopyPublicLink]: '公開リンクをコピー',
  [BrightCalStrings.Action_RevokePublicLink]: '公開リンクを取り消し',
  [BrightCalStrings.Sidebar_CannotDeleteDefault]:
    'デフォルトカレンダーは削除できません',
  [BrightCalStrings.Sidebar_ConfirmDeleteMessage]:
    'このカレンダーを削除してもよろしいですか？この操作は元に戻せません。',
  [BrightCalStrings.Sharing_DialogTitleTemplate]: '"{NAME}"を共有',
  [BrightCalStrings.Sharing_CurrentShares]: '現在の共有',
  [BrightCalStrings.Sharing_NoShares]:
    'まだ共有がありません。下にユーザーを追加してください。',
  [BrightCalStrings.Sharing_AddShare]: '共有を追加',
  [BrightCalStrings.Sharing_LinkCopied]:
    'リンクをクリップボードにコピーしました',
  [BrightCalStrings.Sharing_SelectAndCopy]:
    '上のリンクを選択してコピーしてください',
  [BrightCalStrings.Label_CloseSharingDialog]: '共有ダイアログを閉じる',
  [BrightCalStrings.Label_SharedUsers]: '共有ユーザー',
  [BrightCalStrings.Label_ShareCalendarForm]: 'カレンダー共有フォーム',
  [BrightCalStrings.Label_UserId]: 'ユーザーID',
  [BrightCalStrings.Label_PermissionLevel]: '権限レベル',
  [BrightCalStrings.Label_PublicLink]: '公開リンク',
  [BrightCalStrings.Label_PublicLinkUrl]: '公開リンクURL',
  [BrightCalStrings.Permission_Owner]: 'オーナー',
  [BrightCalStrings.Permission_Editor]: '編集者',
  [BrightCalStrings.Permission_Viewer]: '閲覧者',
  [BrightCalStrings.Permission_FreeBusyOnly]: '空き/予定ありのみ',
  [BrightCalStrings.Visibility_Public]: '公開',
  [BrightCalStrings.Visibility_Private]: '非公開',
  [BrightCalStrings.Visibility_Confidential]: '機密',
  [BrightCalStrings.Weekday_Sun]: '日',
  [BrightCalStrings.Weekday_Mon]: '月',
  [BrightCalStrings.Weekday_Tue]: '火',
  [BrightCalStrings.Weekday_Wed]: '水',
  [BrightCalStrings.Weekday_Thu]: '木',
  [BrightCalStrings.Weekday_Fri]: '金',
  [BrightCalStrings.Weekday_Sat]: '土',
  [BrightCalStrings.Label_HolidayCalendars]: '祝日カレンダー',
  [BrightCalStrings.Label_SearchHolidayCalendars]: '祝日カレンダーを検索',
  [BrightCalStrings.Label_CloseHolidayCatalog]: '祝日カタログを閉じる',
  [BrightCalStrings.Holiday_SearchPlaceholder]: '名前または地域で検索...',
  [BrightCalStrings.Holiday_NoCalendarsFound]:
    '祝日カレンダーが見つかりません。',
  [BrightCalStrings.Holiday_UnableToLoad]: '祝日カレンダーを読み込めません',
  [BrightCalStrings.Status_Subscribed]: '購読済み',
  [BrightCalStrings.Tooltip_AddEvent]:
    'これらの受信者でカレンダーイベントを作成',
};
