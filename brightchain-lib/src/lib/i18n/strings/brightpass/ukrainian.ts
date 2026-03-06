import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightPassStringKey,
  BrightPassStrings,
} from '../../../enumerations/brightPassStrings';

export const BrightPassUkrainianStrings: ComponentStrings<BrightPassStringKey> =
  {
    // Menu
    [BrightPassStrings.Menu_BrightPass]: 'BrightPass',

    // Vault List
    [BrightPassStrings.VaultList_Title]: 'Сховища',
    [BrightPassStrings.VaultList_CreateVaultName]: 'Назва сховища',
    [BrightPassStrings.VaultList_CreateVault]: 'Створити сховище',
    [BrightPassStrings.VaultList_DeleteVault]: 'Видалити сховище',
    [BrightPassStrings.VaultList_SharedWithTemplate]:
      'Спільний доступ з {COUNT} учасниками',
    [BrightPassStrings.VaultList_NoVaults]:
      'Сховищ ще немає. Створіть одне, щоб почати.',

    // Vault Detail
    [BrightPassStrings.VaultDetail_TitleNameTemplate]: 'Сховище: {NAME}',
    [BrightPassStrings.VaultDetail_AddEntry]: 'Додати запис',
    [BrightPassStrings.VaultDetail_LockVault]: 'Заблокувати сховище',
    [BrightPassStrings.VaultDetail_Search]: 'Пошук записів…',
    [BrightPassStrings.VaultDetail_NoEntries]:
      'Записів ще немає. Додайте один, щоб почати.',
    [BrightPassStrings.VaultDetail_Favorite]: 'Обране',
    [BrightPassStrings.VaultDetail_ConfirmLockTitle]: 'Заблокувати сховище?',
    [BrightPassStrings.VaultDetail_ConfirmLockMessage]:
      'Ви залишаєте сторінку. Бажаєте заблокувати сховище?',
    [BrightPassStrings.VaultDetail_Cancel]: 'Скасувати',
    [BrightPassStrings.VaultDetail_Confirm]: 'Заблокувати',

    // Entry Types
    [BrightPassStrings.EntryType_Login]: 'Логін',
    [BrightPassStrings.EntryType_SecureNote]: 'Захищена нотатка',
    [BrightPassStrings.EntryType_CreditCard]: 'Кредитна картка',
    [BrightPassStrings.EntryType_Identity]: 'Ідентифікація',

    // Password Generator
    [BrightPassStrings.PasswordGen_Title]: 'Генератор паролів',
    [BrightPassStrings.PasswordGen_Length]: 'Довжина',
    [BrightPassStrings.PasswordGen_Generate]: 'Згенерувати',
    [BrightPassStrings.PasswordGen_Copy]: 'Копіювати',
    [BrightPassStrings.PasswordGen_UsePassword]: 'Використати пароль',
    [BrightPassStrings.PasswordGen_Strength_Weak]: 'Слабкий',
    [BrightPassStrings.PasswordGen_Strength_Fair]: 'Середній',
    [BrightPassStrings.PasswordGen_Strength_Strong]: 'Сильний',
    [BrightPassStrings.PasswordGen_Strength_VeryStrong]: 'Дуже сильний',
    [BrightPassStrings.PasswordGen_Uppercase]: 'Великі літери',
    [BrightPassStrings.PasswordGen_Lowercase]: 'Малі літери',
    [BrightPassStrings.PasswordGen_Digits]: 'Цифри',
    [BrightPassStrings.PasswordGen_Symbols]: 'Символи',
    [BrightPassStrings.PasswordGen_Copied]: 'Скопійовано!',
    [BrightPassStrings.PasswordGen_Entropy]: '{BITS} біт ентропії',

    // TOTP
    [BrightPassStrings.TOTP_Title]: 'TOTP автентифікатор',
    [BrightPassStrings.TOTP_Code]: 'Поточний код',
    [BrightPassStrings.TOTP_CopyCode]: 'Копіювати код',
    [BrightPassStrings.TOTP_Copied]: 'Скопійовано!',
    [BrightPassStrings.TOTP_SecondsRemainingTemplate]: 'Залишилось {SECONDS}с',
    [BrightPassStrings.TOTP_QrCode]: 'QR-код',
    [BrightPassStrings.TOTP_SecretUri]: 'URI секрету',

    // Breach Check
    [BrightPassStrings.Breach_Title]: 'Перевірка на витоки',
    [BrightPassStrings.Breach_Check]: 'Перевірити на витоки',
    [BrightPassStrings.Breach_Password]: 'Пароль для перевірки',
    [BrightPassStrings.Breach_FoundTemplate]:
      'Цей пароль знайдено у {COUNT} витоках даних.',
    [BrightPassStrings.Breach_NotFound]:
      'Цей пароль не знайдено у жодному відомому витоку даних.',

    // Audit Log
    [BrightPassStrings.AuditLog_Title]: 'Журнал аудиту',
    [BrightPassStrings.AuditLog_Timestamp]: 'Мітка часу',
    [BrightPassStrings.AuditLog_Action]: 'Дія',
    [BrightPassStrings.AuditLog_Member]: 'ID учасника',
    [BrightPassStrings.AuditLog_FilterAll]: 'Усі дії',
    [BrightPassStrings.AuditLog_NoEntries]:
      'Записів журналу аудиту не знайдено.',
    [BrightPassStrings.AuditLog_Error]:
      'Не вдалося завантажити журнал аудиту. Будь ласка, спробуйте ще раз.',

    // Breadcrumb Navigation
    [BrightPassStrings.Breadcrumb_BrightPass]: 'BrightPass',
    [BrightPassStrings.Breadcrumb_VaultTemplate]: 'Сховище: {NAME}',
    [BrightPassStrings.Breadcrumb_AuditLog]: 'Журнал аудиту',
    [BrightPassStrings.Breadcrumb_PasswordGenerator]: 'Генератор паролів',
    [BrightPassStrings.Breadcrumb_Tools]: 'Інструменти',

    // Vault List Dialogs
    [BrightPassStrings.VaultList_ConfirmDelete]: 'Видалити сховище',
    [BrightPassStrings.VaultList_ConfirmDeleteMessageTemplate]:
      'Введіть свій майстер-пароль, щоб видалити сховище "{NAME}". Цю дію неможливо скасувати.',
    [BrightPassStrings.VaultList_EnterMasterPassword]: 'Введіть майстер-пароль',
    [BrightPassStrings.VaultList_ConfirmMasterPassword]:
      'Підтвердіть майстер-пароль',
    [BrightPassStrings.VaultList_PasswordsMustMatch]:
      'Головний пароль і підтвердження повинні збігатися.',
    [BrightPassStrings.VaultList_Cancel]: 'Скасувати',
    [BrightPassStrings.VaultList_Confirm]: 'Підтвердити',
    [BrightPassStrings.VaultList_Unlock]: 'Розблокувати',
    [BrightPassStrings.VaultList_UnlockVault]: 'Розблокувати сховище',

    // Validation Messages
    [BrightPassStrings.Validation_VaultNameMinLengthTemplate]:
      'Назва сховища повинна містити щонайменше {MIN_LENGTH} символи',
    [BrightPassStrings.Validation_VaultNameMaxLengthTemplate]:
      'Назва сховища повинна містити не більше {MAX_LENGTH} символів',
    [BrightPassStrings.Validation_VaultNameRequired]:
      "Назва сховища є обов'язковою",
    [BrightPassStrings.Validation_PasswordMinLengthTemplate]:
      'Майстер-пароль повинен містити щонайменше {MIN_LENGTH} символів',
    [BrightPassStrings.Validation_PasswordUppercase]:
      'Повинен містити щонайменше одну велику літеру',
    [BrightPassStrings.Validation_PasswordLowercase]:
      'Повинен містити щонайменше одну малу літеру',
    [BrightPassStrings.Validation_PasswordNumber]:
      'Повинен містити щонайменше одну цифру',
    [BrightPassStrings.Validation_PasswordSpecialChar]:
      'Повинен містити щонайменше один спеціальний символ',
    [BrightPassStrings.Validation_PasswordRequired]:
      "Майстер-пароль є обов'язковим",
    [BrightPassStrings.Validation_ConfirmPasswordRequired]:
      'Будь ласка, підтвердіть свій майстер-пароль',

    // Entry Detail
    [BrightPassStrings.EntryDetail_Title]: 'Деталі запису',
    [BrightPassStrings.EntryDetail_Edit]: 'Редагувати',
    [BrightPassStrings.EntryDetail_Delete]: 'Видалити',
    [BrightPassStrings.EntryDetail_ConfirmDelete]: 'Видалити запис',
    [BrightPassStrings.EntryDetail_ConfirmDeleteMessage]:
      'Ви впевнені, що хочете видалити цей запис? Цю дію неможливо скасувати.',
    [BrightPassStrings.EntryDetail_Username]: "Ім'я користувача",
    [BrightPassStrings.EntryDetail_Password]: 'Пароль',
    [BrightPassStrings.EntryDetail_SiteUrl]: 'URL сайту',
    [BrightPassStrings.EntryDetail_TotpSecret]: 'TOTP секрет',
    [BrightPassStrings.EntryDetail_Content]: 'Вміст',
    [BrightPassStrings.EntryDetail_CardholderName]: "Ім'я власника картки",
    [BrightPassStrings.EntryDetail_CardNumber]: 'Номер картки',
    [BrightPassStrings.EntryDetail_ExpirationDate]: 'Термін дії',
    [BrightPassStrings.EntryDetail_CVV]: 'CVV',
    [BrightPassStrings.EntryDetail_FirstName]: "Ім'я",
    [BrightPassStrings.EntryDetail_LastName]: 'Прізвище',
    [BrightPassStrings.EntryDetail_Email]: 'Електронна пошта',
    [BrightPassStrings.EntryDetail_Phone]: 'Телефон',
    [BrightPassStrings.EntryDetail_Address]: 'Адреса',
    [BrightPassStrings.EntryDetail_Notes]: 'Нотатки',
    [BrightPassStrings.EntryDetail_Tags]: 'Теги',
    [BrightPassStrings.EntryDetail_CreatedAt]: 'Створено',
    [BrightPassStrings.EntryDetail_UpdatedAt]: 'Оновлено',
    [BrightPassStrings.EntryDetail_BreachWarningTemplate]:
      'Цей пароль знайдено у {COUNT} витоках даних!',
    [BrightPassStrings.EntryDetail_BreachSafe]:
      'Цей пароль не знайдено у жодному відомому витоку даних.',
    [BrightPassStrings.EntryDetail_ShowPassword]: 'Показати',
    [BrightPassStrings.EntryDetail_HidePassword]: 'Приховати',
    [BrightPassStrings.EntryDetail_Cancel]: 'Скасувати',

    // Entry Form
    [BrightPassStrings.EntryForm_Title_Create]: 'Створити запис',
    [BrightPassStrings.EntryForm_Title_Edit]: 'Редагувати запис',
    [BrightPassStrings.EntryForm_FieldTitle]: 'Назва',
    [BrightPassStrings.EntryForm_FieldNotes]: 'Нотатки',
    [BrightPassStrings.EntryForm_FieldTags]: 'Теги (через кому)',
    [BrightPassStrings.EntryForm_FieldFavorite]: 'Обране',
    [BrightPassStrings.EntryForm_Save]: 'Зберегти',
    [BrightPassStrings.EntryForm_Cancel]: 'Скасувати',
    [BrightPassStrings.EntryForm_GeneratePassword]: 'Згенерувати',
    [BrightPassStrings.EntryForm_TotpSecretHelp]:
      'Введіть base32 секрет або otpauth:// URI',

    // SearchBar
    [BrightPassStrings.SearchBar_Placeholder]:
      'Пошук за назвою, тегами або URL\u2026',
    [BrightPassStrings.SearchBar_FilterFavorites]: 'Обране',
    [BrightPassStrings.SearchBar_NoResults]: 'Відповідних записів не знайдено',

    // Emergency Access Dialog
    [BrightPassStrings.Emergency_Title]: 'Екстрений доступ',
    [BrightPassStrings.Emergency_Configure]: 'Налаштувати',
    [BrightPassStrings.Emergency_Recover]: 'Відновити',
    [BrightPassStrings.Emergency_Threshold]:
      'Поріг (мінімальна кількість довірених осіб)',
    [BrightPassStrings.Emergency_Trustees]: 'ID довірених осіб (через кому)',
    [BrightPassStrings.Emergency_Shares]: 'Зашифрована частка {INDEX}',
    [BrightPassStrings.Emergency_InsufficientSharesTemplate]:
      'Недостатньо часток. Потрібно щонайменше {THRESHOLD} часток.',
    [BrightPassStrings.Emergency_InvalidThreshold]:
      'Поріг повинен бути від 1 до кількості довірених осіб.',
    [BrightPassStrings.Emergency_Close]: 'Закрити',
    [BrightPassStrings.Emergency_Error]:
      'Сталася помилка. Будь ласка, спробуйте ще раз.',
    [BrightPassStrings.Emergency_Success]: 'Операцію успішно завершено.',

    // Share Dialog
    [BrightPassStrings.Share_Title]: 'Поділитися сховищем',
    [BrightPassStrings.Share_SearchMembers]:
      'Пошук учасників за іменем або електронною поштою',
    [BrightPassStrings.Share_Add]: 'Додати',
    [BrightPassStrings.Share_Revoke]: 'Скасувати доступ',
    [BrightPassStrings.Share_CurrentRecipients]: 'Поточні отримувачі',
    [BrightPassStrings.Share_NoRecipients]:
      'Це сховище ще ні з ким не поділено.',
    [BrightPassStrings.Share_Close]: 'Закрити',
    [BrightPassStrings.Share_Error]:
      'Сталася помилка. Будь ласка, спробуйте ще раз.',

    // Import Dialog
    [BrightPassStrings.Import_Title]: 'Імпорт записів',
    [BrightPassStrings.Import_SelectFormat]: 'Виберіть формат',
    [BrightPassStrings.Import_Upload]: 'Завантажити файл',
    [BrightPassStrings.Import_Import]: 'Імпортувати',
    [BrightPassStrings.Import_Close]: 'Закрити',
    [BrightPassStrings.Import_Summary]: 'Результати імпорту',
    [BrightPassStrings.Import_ImportedTemplate]: '{COUNT} записів успішно імпортовано',
    [BrightPassStrings.Import_SkippedTemplate]: '{COUNT} записів пропущено',
    [BrightPassStrings.Import_ErrorsTemplate]: 'Рядок {INDEX}: {MESSAGE}',
    [BrightPassStrings.Import_InvalidFormat]:
      'Завантажений файл не відповідає обраному формату.',
    [BrightPassStrings.Import_Error]:
      'Під час імпорту сталася помилка. Будь ласка, спробуйте ще раз.',

    // Errors
    [BrightPassStrings.Error_InvalidMasterPassword]:
      'Недійсний майстер-пароль.',
    [BrightPassStrings.Error_VaultNotFound]: 'Сховище не знайдено.',
    [BrightPassStrings.Error_Unauthorized]:
      'Ви не маєте дозволу на виконання цієї дії.',
    [BrightPassStrings.Error_Generic]:
      'Сталася неочікувана помилка. Будь ласка, спробуйте ще раз.',
  };
