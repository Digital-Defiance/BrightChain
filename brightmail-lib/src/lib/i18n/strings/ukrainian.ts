import { RequiredBrandedStringsCollection } from '@digitaldefiance/i18n-lib';
import { BrightMailStrings } from '../../enumerations/brightMailStrings';

export const BrightMailUkrainianStrings: RequiredBrandedStringsCollection<
  typeof BrightMailStrings
> = {
  // Menu
  [BrightMailStrings.MenuLabel]: 'BrightMail',

  // Inbox
  [BrightMailStrings.Inbox_Title]: 'Вхідні',
  [BrightMailStrings.Inbox_Empty]: 'Електронних листів ще немає',
  [BrightMailStrings.Inbox_Error]: 'Не вдалося завантажити вхідні',
  [BrightMailStrings.Inbox_Retry]: 'Повторити',
  [BrightMailStrings.Inbox_UnreadCountTemplate]: '{COUNT} непрочитаних',

  // Compose
  [BrightMailStrings.Compose_Title]: 'Написати',
  [BrightMailStrings.Compose_To]: 'Кому',
  [BrightMailStrings.Compose_Cc]: 'Копія',
  [BrightMailStrings.Compose_Bcc]: 'Прихована копія',
  [BrightMailStrings.Compose_Subject]: 'Тема',
  [BrightMailStrings.Compose_Body]: 'Повідомлення',
  [BrightMailStrings.Compose_Send]: 'Надіслати',
  [BrightMailStrings.Compose_SendSuccess]: 'Електронний лист успішно надіслано',
  [BrightMailStrings.Compose_SendError]:
    'Не вдалося надіслати електронний лист',
  [BrightMailStrings.Compose_InvalidRecipient]:
    'Будь ласка, додайте принаймні одного дійсного одержувача',
  [BrightMailStrings.Compose_Attachments]: 'Вкладення',
  [BrightMailStrings.Compose_ExternalRecipientsWarning]:
    'Шифрування ECIES недоступне для зовнішніх одержувачів. Надсилання вимкнено, поки присутні зовнішні адреси з увімкненим шифруванням.',
  [BrightMailStrings.Compose_ExternalRecipientsWarningTemplate]:
    'Зовнішні одержувачі ({ADDRESSES}) знаходяться за межами локального домену і не можуть отримувати повідомлення, зашифровані ECIES.',
  [BrightMailStrings.Compose_BounceWarningTitle]: 'Неперевірені одержувачі',
  [BrightMailStrings.Compose_BounceWarningMessage]:
    'Наступних одержувачів не знайдено, і ваше повідомлення може бути повернуто: {ADDRESSES}. Надіслати все одно?',
  [BrightMailStrings.Compose_BounceWarningSendAnyway]: 'Надіслати все одно',

  // Thread
  [BrightMailStrings.Thread_Error]: 'Не вдалося завантажити ланцюжок',
  [BrightMailStrings.Thread_BackToInbox]: 'Назад до вхідних',
  [BrightMailStrings.Thread_Reply]: 'Відповісти',
  [BrightMailStrings.Thread_ReplyAll]: 'Відповісти всім',
  [BrightMailStrings.Thread_Forward]: 'Переслати',

  // Delete
  [BrightMailStrings.Delete_Confirm]: 'Ви впевнені, що хочете видалити?',
  [BrightMailStrings.Delete_ConfirmBulkTemplate]:
    'Видалити {COUNT} вибраних листів?',
  [BrightMailStrings.Delete_Success]: 'Лист видалено',
  [BrightMailStrings.Delete_ErrorTemplate]:
    'Не вдалося видалити лист: {MESSAGE_ID}',

  // Sidebar / Navigation
  [BrightMailStrings.Nav_Inbox]: 'Вхідні',
  [BrightMailStrings.Nav_Sent]: 'Надіслані',
  [BrightMailStrings.Nav_Drafts]: 'Чернетки',
  [BrightMailStrings.Nav_Trash]: 'Кошик',
  [BrightMailStrings.Nav_Spam]: 'Спам',
  [BrightMailStrings.Nav_Labels]: 'Мітки',
  [BrightMailStrings.Nav_Calendar]: 'Календар',
  [BrightMailStrings.Nav_Compose]: 'Написати',
  [BrightMailStrings.Nav_MailFolders]: 'Поштові теки',

  // Actions
  [BrightMailStrings.Action_Delete]: 'Видалити',
  [BrightMailStrings.Action_MarkAsRead]: 'Позначити як прочитане',
  [BrightMailStrings.Action_Cancel]: 'Скасувати',
  [BrightMailStrings.Action_Discard]: 'Відхилити',
  [BrightMailStrings.Action_Submit]: 'Надіслати',
  [BrightMailStrings.Action_Generate]: 'Згенерувати',
  [BrightMailStrings.Action_Search]: 'Пошук',
  [BrightMailStrings.Action_Import]: 'Імпортувати',

  // General
  [BrightMailStrings.Loading]: 'Завантаження...',
  [BrightMailStrings.NewMessage]: 'Нове повідомлення',
  [BrightMailStrings.DiscardDraftTitle]: 'Відхилити чернетку?',
  [BrightMailStrings.DiscardDraftMessage]:
    'Ваше повідомлення має незбережений вміст. Відхилити його?',

  // Attachment
  [BrightMailStrings.Attachment_AttachFiles]: 'Прикріпити файли',
  [BrightMailStrings.Attachment_FileSizeExceededTemplate]:
    'Файл "{FILENAME}" перевищує ліміт {LIMIT}',
  [BrightMailStrings.Attachment_TotalSizeExceeded]:
    'Загальний розмір вкладень перевищує ліміт {LIMIT}',
  [BrightMailStrings.Attachment_RemoveTemplate]: 'Видалити {FILENAME}',

  // Email List
  [BrightMailStrings.EmailList_SelectAll]: 'Вибрати всі листи',
  [BrightMailStrings.EmailList_AriaLabel]: 'Список листів',
  [BrightMailStrings.EmailList_SelectEmailTemplate]:
    'Вибрати лист від {SENDER}',
  [BrightMailStrings.EmailList_Header_Sender]: 'Відправник',
  [BrightMailStrings.EmailList_Header_Subject]: 'Тема',
  [BrightMailStrings.EmailList_Header_Date]: 'Дата',
  [BrightMailStrings.EmailList_Header_Status]: 'Статус',
  [BrightMailStrings.EmailList_Status_Read]: 'Прочитано',
  [BrightMailStrings.EmailList_Status_Unread]: 'Непрочитано',
  [BrightMailStrings.EmailList_Star]: 'Позначити зіркою',
  [BrightMailStrings.EmailList_Unstar]: 'Зняти зірку',

  // Encryption
  [BrightMailStrings.Encryption_Label]: 'Шифрування',
  [BrightMailStrings.Encryption_None]: 'Без шифрування',
  [BrightMailStrings.Encryption_ECIES]: 'ECIES',
  [BrightMailStrings.Encryption_GPG]: 'GPG',
  [BrightMailStrings.Encryption_SMIME]: 'S/MIME',
  [BrightMailStrings.Encryption_MissingKeysTemplate]:
    'У наступних одержувачів відсутні публічні ключі: {RECIPIENTS}',
  [BrightMailStrings.Encryption_SmimeCertRequired]:
    'Підпис S/MIME потребує налаштованого сертифіката в Налаштуваннях',
  [BrightMailStrings.Encryption_GpgKeyRequired]:
    'Підпис GPG потребує налаштованої пари ключів у Налаштуваннях',
  [BrightMailStrings.Encryption_DefaultPreference]:
    'Стандартна перевага шифрування',
  [BrightMailStrings.Encryption_DefaultLabel]: 'Стандартне шифрування',

  // Key Management
  [BrightMailStrings.KeyMgmt_GpgKeypair]: 'Пара ключів GPG',
  [BrightMailStrings.KeyMgmt_SmimeCertificate]: 'Сертифікат S/MIME',
  [BrightMailStrings.KeyMgmt_NoGpgKeypair]:
    'Пару ключів GPG не налаштовано. Згенеруйте нову пару ключів або імпортуйте публічний ключ.',
  [BrightMailStrings.KeyMgmt_NoSmimeCert]:
    'Сертифікат S/MIME не налаштовано. Імпортуйте сертифікат, щоб увімкнути шифрування S/MIME.',
  [BrightMailStrings.KeyMgmt_ExportPublicKey]: 'Експортувати публічний ключ',
  [BrightMailStrings.KeyMgmt_PublishToKeyserver]:
    'Опублікувати на сервері ключів',
  [BrightMailStrings.KeyMgmt_GenerateKeypair]: 'Згенерувати пару ключів',
  [BrightMailStrings.KeyMgmt_ImportPublicKey]: 'Імпортувати публічний ключ',
  [BrightMailStrings.KeyMgmt_ReplaceKey]: 'Замінити ключ',
  [BrightMailStrings.KeyMgmt_ImportByEmail]:
    'Імпортувати через електронну пошту',
  [BrightMailStrings.KeyMgmt_ImportCertPem]: 'Імпортувати сертифікат (PEM)',
  [BrightMailStrings.KeyMgmt_ReplaceCertificate]: 'Замінити сертифікат',
  [BrightMailStrings.KeyMgmt_ImportPkcs12]: 'Імпортувати PKCS#12',
  [BrightMailStrings.KeyMgmt_Passphrase]: 'Парольна фраза',
  [BrightMailStrings.KeyMgmt_Pkcs12Password]: 'Пароль PKCS#12',
  [BrightMailStrings.KeyMgmt_EmailAddress]: 'Електронна адреса',
  [BrightMailStrings.KeyMgmt_DeleteGpgKeypair]: 'Видалити пару ключів GPG',
  [BrightMailStrings.KeyMgmt_DeleteGpgPublicKey]: 'Видалити публічний ключ GPG',
  [BrightMailStrings.KeyMgmt_DeleteSmimeCert]: 'Видалити сертифікат S/MIME',
  [BrightMailStrings.KeyMgmt_CertExpired]:
    'Термін дії цього сертифіката закінчився',
  [BrightMailStrings.KeyMgmt_ErrorInvalidCert]:
    'Недійсний файл сертифіката X.509',
  [BrightMailStrings.KeyMgmt_ErrorInvalidKey]:
    'Недійсний файл публічного ключа PGP',
  [BrightMailStrings.KeyMgmt_ErrorUploadCert]:
    'Не вдалося завантажити сертифікат',
  [BrightMailStrings.KeyMgmt_ErrorUploadKey]: 'Не вдалося завантажити ключ',
  [BrightMailStrings.KeyMgmt_ErrorDeleteCert]: 'Не вдалося видалити сертифікат',
  [BrightMailStrings.KeyMgmt_ErrorDeleteKey]: 'Не вдалося видалити ключ',
  [BrightMailStrings.KeyMgmt_ErrorGenerateKeypair]:
    'Не вдалося згенерувати пару ключів GPG',
  [BrightMailStrings.KeyMgmt_ErrorExportKey]:
    'Не вдалося експортувати публічний ключ GPG',
  [BrightMailStrings.KeyMgmt_ErrorPublishKey]:
    'Не вдалося опублікувати ключ GPG на сервері ключів',
  [BrightMailStrings.KeyMgmt_ErrorImportByEmail]:
    'Не вдалося імпортувати ключ GPG через електронну пошту',
  [BrightMailStrings.KeyMgmt_ErrorImportPkcs12]:
    'Не вдалося імпортувати сертифікат PKCS#12',

  // Passphrase Dialog
  [BrightMailStrings.Passphrase_Title]: 'Введіть парольну фразу GPG',
  [BrightMailStrings.Passphrase_Label]: 'Парольна фраза',

  // Reading Pane
  [BrightMailStrings.ReadingPane_Placeholder]: 'Виберіть лист для читання',

  // Recipient Chip Input
  [BrightMailStrings.Recipient_AddedOneTemplate]: 'Додано одержувача: {EMAIL}',
  [BrightMailStrings.Recipient_AddedManyTemplate]:
    'Додано одержувачів: {EMAILS}',
  [BrightMailStrings.Recipient_RemovedTemplate]: 'Видалено одержувача: {EMAIL}',
  [BrightMailStrings.Recipient_NotFoundTemplate]:
    '{LOCAL} не знайдено на {DOMAIN}',

  // Rich Text Editor
  [BrightMailStrings.RichText_Placeholder]: 'Напишіть повідомлення...',
  [BrightMailStrings.RichText_Bold]: 'Жирний',
  [BrightMailStrings.RichText_Italic]: 'Курсив',
  [BrightMailStrings.RichText_Underline]: 'Підкреслений',
  [BrightMailStrings.RichText_OrderedList]: 'Нумерований список',
  [BrightMailStrings.RichText_UnorderedList]: 'Маркований список',
  [BrightMailStrings.RichText_Link]: 'Посилання',
  [BrightMailStrings.RichText_EnterUrl]: 'Введіть URL:',
  [BrightMailStrings.RichText_ToolbarLabel]: 'Форматування тексту',

  // Compose Modal
  [BrightMailStrings.ComposeModal_Restore]: 'Відновити написання',
  [BrightMailStrings.ComposeModal_Minimize]: 'Згорнути написання',
  [BrightMailStrings.ComposeModal_Maximize]: 'Розгорнути написання',
  [BrightMailStrings.ComposeModal_RestoreDown]: 'Відновити розмір написання',
  [BrightMailStrings.ComposeModal_Close]: 'Закрити написання',

  // GPG Setup Wizard
  [BrightMailStrings.GpgWizard_Title]: 'Налаштування шифрування GPG',
  [BrightMailStrings.GpgWizard_WelcomeHeading]:
    'Захистіть свою пошту за допомогою GPG',
  [BrightMailStrings.GpgWizard_WelcomeBody]:
    'GPG (GNU Privacy Guard) дозволяє шифрувати та підписувати електронні листи, щоб їх міг прочитати лише призначений одержувач. Налаштування займає менше хвилини.',
  [BrightMailStrings.GpgWizard_EciesNote]:
    'Учасники BrightChain також автоматично отримують шифрування ECIES для повідомлень у мережі.',
  [BrightMailStrings.GpgWizard_OptionGenerate]: 'Створити нову пару ключів',
  [BrightMailStrings.GpgWizard_OptionGenerateDesc]:
    'Рекомендовано. Ми згенеруємо безпечну пару ключів для вас.',
  [BrightMailStrings.GpgWizard_OptionImport]: 'У мене вже є ключ GPG',
  [BrightMailStrings.GpgWizard_OptionImportDesc]:
    'Імпортуйте існуючий публічний ключ з файлу, буфера обміну або сервера ключів.',
  [BrightMailStrings.GpgWizard_GenerateHeading]: 'Оберіть парольну фразу',
  [BrightMailStrings.GpgWizard_GenerateBody]:
    "Парольна фраза захищає ваш приватний ключ. Оберіть щось запам'ятовуване, але важке для вгадування.",
  [BrightMailStrings.GpgWizard_PassphraseLabel]: 'Парольна фраза',
  [BrightMailStrings.GpgWizard_PassphraseConfirmLabel]:
    'Підтвердіть парольну фразу',
  [BrightMailStrings.GpgWizard_PassphraseMismatch]:
    'Парольні фрази не збігаються',
  [BrightMailStrings.GpgWizard_PassphraseStrengthWeak]: 'Слабка',
  [BrightMailStrings.GpgWizard_PassphraseStrengthFair]: 'Задовільна',
  [BrightMailStrings.GpgWizard_PassphraseStrengthGood]: 'Добра',
  [BrightMailStrings.GpgWizard_PassphraseStrengthStrong]: 'Сильна',
  [BrightMailStrings.GpgWizard_GenerateButton]: 'Згенерувати мої ключі',
  [BrightMailStrings.GpgWizard_Generating]: 'Генерація пари ключів…',
  [BrightMailStrings.GpgWizard_ImportHeading]: 'Імпортуйте ваш ключ GPG',
  [BrightMailStrings.GpgWizard_ImportTabFile]: 'Завантажити файл',
  [BrightMailStrings.GpgWizard_ImportTabPaste]: 'Вставити ключ',
  [BrightMailStrings.GpgWizard_ImportTabKeyserver]: 'Пошук на сервері ключів',
  [BrightMailStrings.GpgWizard_ImportFilePrompt]:
    'Оберіть файл .asc, .gpg або .pub',
  [BrightMailStrings.GpgWizard_ImportPasteLabel]:
    'Вставте ваш публічний ключ у форматі ASCII-armor',
  [BrightMailStrings.GpgWizard_ImportKeyserverLabel]: 'Електронна адреса',
  [BrightMailStrings.GpgWizard_ImportKeyserverHint]:
    'Ми шукатимемо на публічних серверах ключів ключ, що відповідає цій електронній адресі.',
  [BrightMailStrings.GpgWizard_ImportButton]: 'Імпортувати ключ',
  [BrightMailStrings.GpgWizard_Searching]: 'Пошук на серверах ключів…',
  [BrightMailStrings.GpgWizard_SuccessHeading]: 'Все готово!',
  [BrightMailStrings.GpgWizard_SuccessBody]:
    'Ваш ключ GPG готовий. Тепер ви можете надсилати та отримувати зашифровані GPG листи.',
  [BrightMailStrings.GpgWizard_SuccessFingerprint]: 'Відбиток ключа',
  [BrightMailStrings.GpgWizard_PublishPrompt]:
    'Опублікуйте свій публічний ключ, щоб інші могли його знайти та надсилати вам зашифровані листи.',
  [BrightMailStrings.GpgWizard_PublishButton]: 'Опублікувати на сервері ключів',
  [BrightMailStrings.GpgWizard_SetDefaultPrompt]:
    'Встановити GPG як шифрування за замовчуванням для нових повідомлень?',
  [BrightMailStrings.GpgWizard_SetDefaultButton]:
    'Встановити GPG за замовчуванням',
  [BrightMailStrings.GpgWizard_Done]: 'Готово',
  [BrightMailStrings.GpgWizard_Back]: 'Назад',
  [BrightMailStrings.GpgWizard_Next]: 'Далі',
  [BrightMailStrings.GpgWizard_ErrorGenerate]:
    'Не вдалося згенерувати пару ключів. Спробуйте ще раз.',
  [BrightMailStrings.GpgWizard_ErrorImport]:
    'Не вдалося імпортувати ключ. Перевірте файл або дані ключа та спробуйте ще раз.',
  [BrightMailStrings.GpgWizard_ErrorPublish]:
    'Не вдалося опублікувати ключ на сервері ключів.',

  // Calendar Invite Card
  [BrightMailStrings.CalInvite_Title]: 'Запрошення в календар',
  [BrightMailStrings.CalInvite_Organizer]: 'Організатор',
  [BrightMailStrings.CalInvite_WhenTemplate]: '{START} – {END}',
  [BrightMailStrings.CalInvite_AllDay]: 'Весь день',
  [BrightMailStrings.CalInvite_Location]: 'Місце',
  [BrightMailStrings.CalInvite_Description]: 'Опис',
  [BrightMailStrings.CalInvite_AttendeesTemplate]: '{COUNT} учасник(ів)',
  [BrightMailStrings.CalInvite_Accept]: 'Прийняти',
  [BrightMailStrings.CalInvite_Decline]: 'Відхилити',
  [BrightMailStrings.CalInvite_Tentative]: 'Попередньо',
  [BrightMailStrings.CalInvite_AddToCalendar]: 'Додати до календаря',
  [BrightMailStrings.CalInvite_ViewInCalendar]: 'Переглянути в календарі',
  [BrightMailStrings.CalInvite_AlreadyResponded]: 'Ви вже відповіли',
  [BrightMailStrings.CalInvite_ResponseTemplate]:
    'Ваша відповідь: {RESPONSE}',
  [BrightMailStrings.CalInvite_Cancelled]: 'Подію скасовано',
  [BrightMailStrings.CalInvite_CancelledBody]:
    'Організатор скасував цю подію.',
  [BrightMailStrings.CalInvite_Updated]: 'Подію оновлено',
  [BrightMailStrings.CalInvite_UpdatedBody]:
    'Організатор оновив цю подію.',
  [BrightMailStrings.CalInvite_Counter]: 'Зустрічна пропозиція',
  [BrightMailStrings.CalInvite_CounterBody]:
    'Учасник запропонував новий час.',
  [BrightMailStrings.CalInvite_ErrorRsvp]:
    'Не вдалося надіслати відповідь',
  [BrightMailStrings.CalInvite_ErrorImport]:
    'Не вдалося імпортувати подію до календаря',
  [BrightMailStrings.CalInvite_SuccessAccepted]: 'Запрошення прийнято',
  [BrightMailStrings.CalInvite_SuccessDeclined]: 'Запрошення відхилено',
  [BrightMailStrings.CalInvite_SuccessTentative]:
    'Запрошення попередньо прийнято',
};
