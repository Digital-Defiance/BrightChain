import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';

export const UkrainianStrings: StringsCollection<BrightChainStringKey> = {
  // UI Strings
  [BrightChainStrings.Common_BlockSize]: 'Розмір блоку',
  [BrightChainStrings.Common_AtIndexTemplate]:
    '{OPERATION} за індексом {INDEX}',
  [BrightChainStrings.ChangePassword_Success]: 'Пароль успішно змінено.',
  [BrightChainStrings.Common_Site]: 'BrightChain',
  [BrightChainStrings.ForgotPassword_Title]: 'Забули пароль',
  [BrightChainStrings.Register_Button]: 'Зареєструватися',
  [BrightChainStrings.Register_Error]: 'Під час реєстрації сталася помилка.',
  [BrightChainStrings.Register_Success]: 'Реєстрація успішна.',

  // Block Handle Errors
  [BrightChainStrings.Error_BlockHandle_BlockConstructorMustBeValid]:
    'blockConstructor має бути дійсною функцією-конструктором',
  [BrightChainStrings.Error_BlockHandle_BlockSizeRequired]:
    "blockSize є обов'язковим",
  [BrightChainStrings.Error_BlockHandle_DataMustBeUint8Array]:
    'data має бути Uint8Array',
  [BrightChainStrings.Error_BlockHandle_ChecksumMustBeChecksum]:
    'checksum має бути Checksum',

  // Block Handle Tuple Errors
  [BrightChainStrings.Error_BlockHandleTuple_FailedToLoadBlockTemplate]:
    'Не вдалося завантажити блок {CHECKSUM}: {ERROR}',
  [BrightChainStrings.Error_BlockHandleTuple_FailedToStoreXorResultTemplate]:
    'Не вдалося зберегти результат XOR: {ERROR}',

  // Block Access Errors
  [BrightChainStrings.Error_BlockAccess_Template]:
    'Неможливо отримати доступ до блоку: {REASON}',
  [BrightChainStrings.Error_BlockAccessError_BlockAlreadyExists]:
    'Файл блоку вже існує',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotPersistable]:
    'Блок не може бути збережений',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotReadable]:
    'Блок не може бути прочитаний',
  [BrightChainStrings.Error_BlockAccessError_BlockFileNotFoundTemplate]:
    'Файл блоку не знайдено: {FILE}',
  [BrightChainStrings.Error_BlockAccess_CBLCannotBeEncrypted]:
    'Блок CBL не може бути зашифрований',
  [BrightChainStrings.Error_BlockAccessError_CreatorMustBeProvided]:
    'Творець повинен бути наданий для перевірки підпису',
  [BrightChainStrings.Error_Block_CannotBeDecrypted]:
    'Блок не може бути розшифрований',
  [BrightChainStrings.Error_Block_CannotBeEncrypted]:
    'Блок не може бути зашифрований',
  [BrightChainStrings.Error_BlockCapacity_Template]:
    'Ємність блоку перевищена. Розмір блоку: ({BLOCK_SIZE}), Дані: ({DATA_SIZE})',

  // Block Metadata Errors
  [BrightChainStrings.Error_BlockMetadata_Template]:
    'Помилка метаданих блоку: {REASON}',
  [BrightChainStrings.Error_BlockMetadataError_CreatorIdMismatch]:
    'Невідповідність ідентифікатора творця',
  [BrightChainStrings.Error_BlockMetadataError_CreatorRequired]:
    "Творець є обов'язковим",
  [BrightChainStrings.Error_BlockMetadataError_EncryptorRequired]:
    "Шифрувальник є обов'язковим",
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadata]:
    'Недійсні метадані блоку',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadataTemplate]:
    'Недійсні метадані блоку: {REASON}',
  [BrightChainStrings.Error_BlockMetadataError_MetadataRequired]:
    "Метадані є обов'язковими",
  [BrightChainStrings.Error_BlockMetadataError_MissingRequiredMetadata]:
    "Відсутні обов'язкові поля метаданих",

  // Block Capacity Errors
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockSize]:
    'Недійсний розмір блоку',
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockType]:
    'Недійсний тип блоку',
  [BrightChainStrings.Error_BlockCapacity_CapacityExceeded]:
    'Ємність перевищена',
  [BrightChainStrings.Error_BlockCapacity_InvalidFileName]:
    "Недійсне ім'я файлу",
  [BrightChainStrings.Error_BlockCapacity_InvalidMimetype]:
    'Недійсний тип MIME',
  [BrightChainStrings.Error_BlockCapacity_InvalidRecipientCount]:
    'Недійсна кількість отримувачів',
  [BrightChainStrings.Error_BlockCapacity_InvalidExtendedCblData]:
    'Недійсні розширені дані CBL',

  // Block Validation Errors
  [BrightChainStrings.Error_BlockValidationError_Template]:
    'Перевірка блоку не вдалася: {REASON}',
  [BrightChainStrings.Error_BlockValidationError_ActualDataLengthUnknown]:
    'Фактична довжина даних невідома',
  [BrightChainStrings.Error_BlockValidationError_AddressCountExceedsCapacity]:
    'Кількість адрес перевищує ємність блоку',
  [BrightChainStrings.Error_BlockValidationError_BlockDataNotBuffer]:
    'Block.data повинно бути буфером',
  [BrightChainStrings.Error_BlockValidationError_BlockSizeNegative]:
    'Розмір блоку повинен бути додатним числом',
  [BrightChainStrings.Error_BlockValidationError_CreatorIDMismatch]:
    'Невідповідність ідентифікатора творця',
  [BrightChainStrings.Error_BlockValidationError_DataBufferIsTruncated]:
    'Буфер даних обрізаний',
  [BrightChainStrings.Error_BlockValidationError_DataCannotBeEmpty]:
    'Дані не можуть бути порожніми',
  [BrightChainStrings.Error_BlockValidationError_DataLengthExceedsCapacity]:
    'Довжина даних перевищує ємність блоку',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShort]:
    'Дані занадто короткі для заголовка шифрування',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForCBLHeader]:
    'Дані занадто короткі для заголовка CBL',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForEncryptedCBL]:
    'Дані занадто короткі для зашифрованого CBL',
  [BrightChainStrings.Error_BlockValidationError_EphemeralBlockOnlySupportsBufferData]:
    'EphemeralBlock підтримує тільки дані Buffer',
  [BrightChainStrings.Error_BlockValidationError_FutureCreationDate]:
    'Дата створення блоку не може бути в майбутньому',
  [BrightChainStrings.Error_BlockValidationError_InvalidAddressLengthTemplate]:
    'Недійсна довжина адреси за індексом {INDEX}: {LENGTH}, очікувалося: {EXPECTED_LENGTH}',
  [BrightChainStrings.Error_BlockValidationError_InvalidAuthTagLength]:
    'Недійсна довжина тегу автентифікації',
  [BrightChainStrings.Error_BlockValidationError_InvalidBlockTypeTemplate]:
    'Недійсний тип блоку: {TYPE}',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLAddressCount]:
    'Кількість адрес CBL повинна бути кратною TupleSize',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLDataLength]:
    'Недійсна довжина даних CBL',
  [BrightChainStrings.Error_BlockValidationError_InvalidDateCreated]:
    'Недійсна дата створення',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionHeaderLength]:
    'Недійсна довжина заголовка шифрування',
  [BrightChainStrings.Error_BlockValidationError_InvalidEphemeralPublicKeyLength]:
    'Недійсна довжина ефемерного публічного ключа',
  [BrightChainStrings.Error_BlockValidationError_InvalidIVLength]:
    'Недійсна довжина IV',
  [BrightChainStrings.Error_BlockValidationError_InvalidSignature]:
    'Надано недійсний підпис',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientIds]:
    'Недійсні ідентифікатори отримувачів',
  [BrightChainStrings.Error_BlockValidationError_InvalidTupleSizeTemplate]:
    'Розмір кортежу повинен бути між {TUPLE_MIN_SIZE} та {TUPLE_MAX_SIZE}',
  [BrightChainStrings.Error_BlockValidationError_MethodMustBeImplementedByDerivedClass]:
    'Метод повинен бути реалізований похідним класом',
  [BrightChainStrings.Error_BlockValidationError_NoChecksum]:
    'Контрольна сума не надана',
  [BrightChainStrings.Error_BlockValidationError_OriginalDataLengthNegative]:
    "Оригінальна довжина даних не може бути від'ємною",
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionType]:
    'Недійсний тип шифрування',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientCount]:
    'Недійсна кількість отримувачів',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientKeys]:
    'Недійсні ключі отримувачів',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientNotFoundInRecipients]:
    'Отримувач шифрування не знайдений серед отримувачів',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientHasNoPrivateKey]:
    'Отримувач шифрування не має приватного ключа',
  [BrightChainStrings.Error_BlockValidationError_InvalidCreator]:
    'Недійсний творець',
  [BrightChainStrings.Error_BufferError_InvalidBufferTypeTemplate]:
    'Недійсний тип буфера. Очікувався Buffer, отримано: {TYPE}',
  [BrightChainStrings.Error_Checksum_MismatchTemplate]:
    'Невідповідність контрольної суми: очікувалося {EXPECTED}, отримано {CHECKSUM}',
  [BrightChainStrings.Error_BlockSize_InvalidTemplate]:
    'Недійсний розмір блоку: {BLOCK_SIZE}',
  [BrightChainStrings.Error_Credentials_Invalid]: 'Недійсні облікові дані.',

  // Isolated Key Errors
  [BrightChainStrings.Error_IsolatedKeyError_InvalidPublicKey]:
    'Недійсний публічний ключ: повинен бути ізольованим ключем',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyId]:
    'Порушення ізоляції ключа: недійсний ідентифікатор ключа',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyFormat]:
    'Недійсний формат ключа',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyLength]:
    'Недійсна довжина ключа',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyType]:
    'Недійсний тип ключа',
  [BrightChainStrings.Error_IsolatedKeyError_KeyIsolationViolation]:
    'Порушення ізоляції ключа: шифротексти з різних екземплярів ключа',

  // Block Service Errors
  [BrightChainStrings.Error_BlockServiceError_BlockWhitenerCountMismatch]:
    'Кількість блоків і відбілювачів повинна бути однаковою',
  [BrightChainStrings.Error_BlockServiceError_EmptyBlocksArray]:
    'Масив блоків не повинен бути порожнім',
  [BrightChainStrings.Error_BlockServiceError_BlockSizeMismatch]:
    'Усі блоки повинні мати однаковий розмір блоку',
  [BrightChainStrings.Error_BlockServiceError_NoWhitenersProvided]:
    'Відбілювачі не надані',
  [BrightChainStrings.Error_BlockServiceError_AlreadyInitialized]:
    'Підсистема BlockService вже ініціалізована',
  [BrightChainStrings.Error_BlockServiceError_Uninitialized]:
    'Підсистема BlockService не ініціалізована',
  [BrightChainStrings.Error_BlockServiceError_BlockAlreadyExistsTemplate]:
    'Блок вже існує: {ID}',
  [BrightChainStrings.Error_BlockServiceError_RecipientRequiredForEncryption]:
    "Отримувач є обов'язковим для шифрування",
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileLength]:
    'Неможливо визначити довжину файлу',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineBlockSize]:
    'Неможливо визначити розмір блоку',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileName]:
    "Неможливо визначити ім'я файлу",
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineMimeType]:
    'Неможливо визначити тип MIME',
  [BrightChainStrings.Error_BlockServiceError_FilePathNotProvided]:
    'Шлях до файлу не наданий',
  [BrightChainStrings.Error_BlockServiceError_UnableToDetermineBlockSize]:
    'Неможливо визначити розмір блоку',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockData]:
    'Недійсні дані блоку',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockType]:
    'Недійсний тип блоку',

  // Quorum Errors
  [BrightChainStrings.Error_QuorumError_InvalidQuorumId]:
    'Недійсний ідентифікатор кворуму',
  [BrightChainStrings.Error_QuorumError_DocumentNotFound]:
    'Документ не знайдено',
  [BrightChainStrings.Error_QuorumError_UnableToRestoreDocument]:
    'Неможливо відновити документ',
  [BrightChainStrings.Error_QuorumError_NotImplemented]: 'Не реалізовано',
  [BrightChainStrings.Error_QuorumError_Uninitialized]:
    'Підсистема кворуму не ініціалізована',
  [BrightChainStrings.Error_QuorumError_MemberNotFound]: 'Учасник не знайдений',
  [BrightChainStrings.Error_QuorumError_NotEnoughMembers]:
    'Недостатньо учасників для операції кворуму',

  // System Keyring Errors
  [BrightChainStrings.Error_SystemKeyringError_KeyNotFoundTemplate]:
    'Ключ {KEY} не знайдено',
  [BrightChainStrings.Error_SystemKeyringError_RateLimitExceeded]:
    'Перевищено ліміт запитів',

  // FEC Errors
  [BrightChainStrings.Error_FecError_InputBlockRequired]:
    "Вхідний блок є обов'язковим",
  [BrightChainStrings.Error_FecError_DamagedBlockRequired]:
    "Пошкоджений блок є обов'язковим",
  [BrightChainStrings.Error_FecError_ParityBlocksRequired]:
    "Блоки парності є обов'язковими",
  [BrightChainStrings.Error_FecError_InvalidParityBlockSizeTemplate]:
    'Недійсний розмір блоку парності: очікувалося {EXPECTED_SIZE}, отримано {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InvalidRecoveredBlockSizeTemplate]:
    'Недійсний розмір відновленого блоку: очікувалося {EXPECTED_SIZE}, отримано {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InputDataMustBeBuffer]:
    'Вхідні дані повинні бути Buffer',
  [BrightChainStrings.Error_FecError_BlockSizeMismatch]:
    'Розміри блоків повинні співпадати',
  [BrightChainStrings.Error_FecError_DamagedBlockDataMustBeBuffer]:
    'Дані пошкодженого блоку повинні бути Buffer',
  [BrightChainStrings.Error_FecError_ParityBlockDataMustBeBuffer]:
    'Дані блоку парності повинні бути Buffer',

  // ECIES Errors
  [BrightChainStrings.Error_EciesError_InvalidBlockType]:
    'Недійсний тип блоку для операції ECIES',

  // Voting Derivation Errors
  [BrightChainStrings.Error_VotingDerivationError_FailedToGeneratePrime]:
    'Не вдалося згенерувати просте число після максимальної кількості спроб',
  [BrightChainStrings.Error_VotingDerivationError_IdenticalPrimes]:
    'Згенеровано ідентичні прості числа',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairTooSmallTemplate]:
    'Згенерована пара ключів занадто мала: {ACTUAL_BITS} біт < {REQUIRED_BITS} біт',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairValidationFailed]:
    'Перевірка пари ключів не вдалася',
  [BrightChainStrings.Error_VotingDerivationError_ModularInverseDoesNotExist]:
    'Модульна обернена величина не існує',
  [BrightChainStrings.Error_VotingDerivationError_PrivateKeyMustBeBuffer]:
    'Приватний ключ повинен бути Buffer',
  [BrightChainStrings.Error_VotingDerivationError_PublicKeyMustBeBuffer]:
    'Публічний ключ повинен бути Buffer',
  [BrightChainStrings.Error_VotingDerivationError_InvalidPublicKeyFormat]:
    'Недійсний формат публічного ключа',
  [BrightChainStrings.Error_VotingDerivationError_InvalidEcdhKeyPair]:
    'Недійсна пара ключів ECDH',
  [BrightChainStrings.Error_VotingDerivationError_FailedToDeriveVotingKeysTemplate]:
    'Не вдалося отримати ключі голосування: {ERROR}',

  // Voting Errors
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPublicKeyNotIsolated]:
    'Недійсна пара ключів: публічний ключ повинен бути ізольованим',
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPrivateKeyNotIsolated]:
    'Недійсна пара ключів: приватний ключ повинен бути ізольованим',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyNotIsolated]:
    'Недійсний публічний ключ: повинен бути ізольованим ключем',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferTooShort]:
    'Недійсний буфер публічного ключа: занадто короткий',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferWrongMagic]:
    'Недійсний буфер публічного ключа: неправильний magic',
  [BrightChainStrings.Error_VotingError_UnsupportedPublicKeyVersion]:
    'Непідтримувана версія публічного ключа',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferIncompleteN]:
    'Недійсний буфер публічного ключа: неповне значення n',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferFailedToParseNTemplate]:
    'Недійсний буфер публічного ключа: не вдалося розібрати n: {ERROR}',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyIdMismatch]:
    'Недійсний публічний ключ: невідповідність ідентифікатора ключа',
  [BrightChainStrings.Error_VotingError_ModularInverseDoesNotExist]:
    'Модульна обернена величина не існує',
  [BrightChainStrings.Error_VotingError_PrivateKeyMustBeBuffer]:
    'Приватний ключ повинен бути Buffer',
  [BrightChainStrings.Error_VotingError_PublicKeyMustBeBuffer]:
    'Публічний ключ повинен бути Buffer',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyFormat]:
    'Недійсний формат публічного ключа',
  [BrightChainStrings.Error_VotingError_InvalidEcdhKeyPair]:
    'Недійсна пара ключів ECDH',
  [BrightChainStrings.Error_VotingError_FailedToDeriveVotingKeysTemplate]:
    'Не вдалося отримати ключі голосування: {ERROR}',
  [BrightChainStrings.Error_VotingError_FailedToGeneratePrime]:
    'Не вдалося згенерувати просте число після максимальної кількості спроб',
  [BrightChainStrings.Error_VotingError_IdenticalPrimes]:
    'Згенеровано ідентичні прості числа',
  [BrightChainStrings.Error_VotingError_KeyPairTooSmallTemplate]:
    'Згенерована пара ключів занадто мала: {ACTUAL_BITS} біт < {REQUIRED_BITS} біт',
  [BrightChainStrings.Error_VotingError_KeyPairValidationFailed]:
    'Перевірка пари ключів не вдалася',
  [BrightChainStrings.Error_VotingError_InvalidVotingKey]:
    'Недійсний ключ голосування',
  [BrightChainStrings.Error_VotingError_InvalidKeyPair]: 'Недійсна пара ключів',
  [BrightChainStrings.Error_VotingError_InvalidPublicKey]:
    'Недійсний публічний ключ',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKey]:
    'Недійсний приватний ключ',
  [BrightChainStrings.Error_VotingError_InvalidEncryptedKey]:
    'Недійсний зашифрований ключ',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferTooShort]:
    'Недійсний буфер приватного ключа: занадто короткий',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferWrongMagic]:
    'Недійсний буфер приватного ключа: неправильний magic',
  [BrightChainStrings.Error_VotingError_UnsupportedPrivateKeyVersion]:
    'Непідтримувана версія приватного ключа',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteLambda]:
    'Недійсний буфер приватного ключа: неповний lambda',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMuLength]:
    'Недійсний буфер приватного ключа: неповна довжина mu',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMu]:
    'Недійсний буфер приватного ключа: неповний mu',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToParse]:
    'Недійсний буфер приватного ключа: не вдалося розібрати',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToCreate]:
    'Недійсний буфер приватного ключа: не вдалося створити',

  // Store Errors
  [BrightChainStrings.Error_StoreError_InvalidBlockMetadataTemplate]:
    'Недійсні метадані блоку: {ERROR}',
  [BrightChainStrings.Error_StoreError_KeyNotFoundTemplate]:
    'Ключ не знайдено: {KEY}',
  [BrightChainStrings.Error_StoreError_StorePathRequired]:
    "Шлях до сховища є обов'язковим",
  [BrightChainStrings.Error_StoreError_StorePathNotFound]:
    'Шлях до сховища не знайдено',
  [BrightChainStrings.Error_StoreError_BlockSizeRequired]:
    "Розмір блоку є обов'язковим",
  [BrightChainStrings.Error_StoreError_BlockIdRequired]:
    "Ідентифікатор блоку є обов'язковим",
  [BrightChainStrings.Error_StoreError_InvalidBlockIdTooShort]:
    'Недійсний ідентифікатор блоку: занадто короткий',
  [BrightChainStrings.Error_StoreError_BlockFileSizeMismatch]:
    'Невідповідність розміру файлу блоку',
  [BrightChainStrings.Error_StoreError_BlockValidationFailed]:
    'Перевірка блоку не вдалася',
  [BrightChainStrings.Error_StoreError_BlockPathAlreadyExistsTemplate]:
    'Шлях до блоку {PATH} вже існує',
  [BrightChainStrings.Error_StoreError_BlockAlreadyExists]: 'Блок вже існує',
  [BrightChainStrings.Error_StoreError_NoBlocksProvided]: 'Блоки не надані',
  [BrightChainStrings.Error_StoreError_CannotStoreEphemeralData]:
    'Неможливо зберегти ефемерні структуровані дані',
  [BrightChainStrings.Error_StoreError_BlockIdMismatchTemplate]:
    'Ключ {KEY} не відповідає ідентифікатору блоку {BLOCK_ID}',
  [BrightChainStrings.Error_StoreError_BlockSizeMismatch]:
    'Розмір блоку не відповідає розміру блоку сховища',
  [BrightChainStrings.Error_StoreError_BlockDirectoryCreationFailedTemplate]:
    'Не вдалося створити директорію блоків: {ERROR}',
  [BrightChainStrings.Error_StoreError_BlockDeletionFailedTemplate]:
    'Не вдалося видалити блок: {ERROR}',
  [BrightChainStrings.Error_StoreError_NotImplemented]:
    'Операція не реалізована',
  [BrightChainStrings.Error_StoreError_InsufficientRandomBlocksTemplate]:
    'Недостатньо випадкових блоків: запитано {REQUESTED}, доступно {AVAILABLE}',

  // Sealing Errors
  [BrightChainStrings.Error_SealingError_MissingPrivateKeys]:
    'Не всі учасники мають завантажені приватні ключі',
  [BrightChainStrings.Error_SealingError_MemberNotFound]:
    'Учасник не знайдений',
  [BrightChainStrings.Error_SealingError_TooManyMembersToUnlock]:
    'Занадто багато учасників для розблокування документа',
  [BrightChainStrings.Error_SealingError_NotEnoughMembersToUnlock]:
    'Недостатньо учасників для розблокування документа',
  [BrightChainStrings.Error_SealingError_EncryptedShareNotFound]:
    'Зашифрована частка не знайдена',
  [BrightChainStrings.Error_SealingError_InvalidBitRange]:
    'Біти повинні бути між 3 та 20',
  [BrightChainStrings.Error_SealingError_InvalidMemberArray]:
    'amongstMembers повинен бути масивом Member',
  [BrightChainStrings.Error_SealingError_FailedToSealTemplate]:
    'Не вдалося запечатати документ: {ERROR}',

  // CBL Errors
  [BrightChainStrings.Error_CblError_BlockNotReadable]:
    'Блок не може бути прочитаний',
  [BrightChainStrings.Error_CblError_CblRequired]: "CBL є обов'язковим",
  [BrightChainStrings.Error_CblError_WhitenedBlockFunctionRequired]:
    "Функція getWhitenedBlock є обов'язковою",
  [BrightChainStrings.Error_CblError_FailedToLoadBlock]:
    'Не вдалося завантажити блок',
  [BrightChainStrings.Error_CblError_ExpectedEncryptedDataBlock]:
    'Очікувався зашифрований блок даних',
  [BrightChainStrings.Error_CblError_ExpectedOwnedDataBlock]:
    'Очікувався власний блок даних',
  [BrightChainStrings.Error_CblError_InvalidStructure]:
    'Недійсна структура CBL',
  [BrightChainStrings.Error_CblError_CreatorUndefined]:
    'Творець не може бути undefined',
  [BrightChainStrings.Error_CblError_CreatorRequiredForSignature]:
    "Творець є обов'язковим для перевірки підпису",
  [BrightChainStrings.Error_CblError_InvalidCreatorId]:
    'Недійсний ідентифікатор творця',
  [BrightChainStrings.Error_CblError_FileNameRequired]:
    "Ім'я файлу є обов'язковим",
  [BrightChainStrings.Error_CblError_FileNameEmpty]:
    "Ім'я файлу не може бути порожнім",
  [BrightChainStrings.Error_CblError_FileNameWhitespace]:
    "Ім'я файлу не може починатися або закінчуватися пробілами",
  [BrightChainStrings.Error_CblError_FileNameInvalidChar]:
    "Ім'я файлу містить недійсний символ",
  [BrightChainStrings.Error_CblError_FileNameControlChars]:
    "Ім'я файлу містить керуючі символи",
  [BrightChainStrings.Error_CblError_FileNamePathTraversal]:
    "Ім'я файлу не може містити обхід шляху",
  [BrightChainStrings.Error_CblError_MimeTypeRequired]:
    "Тип MIME є обов'язковим",
  [BrightChainStrings.Error_CblError_MimeTypeEmpty]:
    'Тип MIME не може бути порожнім',
  [BrightChainStrings.Error_CblError_MimeTypeWhitespace]:
    'Тип MIME не може починатися або закінчуватися пробілами',
  [BrightChainStrings.Error_CblError_MimeTypeLowercase]:
    'Тип MIME повинен бути в нижньому регістрі',
  [BrightChainStrings.Error_CblError_MimeTypeInvalidFormat]:
    'Недійсний формат типу MIME',
  [BrightChainStrings.Error_CblError_InvalidBlockSize]:
    'Недійсний розмір блоку',
  [BrightChainStrings.Error_CblError_MetadataSizeExceeded]:
    'Розмір метаданих перевищує максимально допустимий розмір',
  [BrightChainStrings.Error_CblError_MetadataSizeNegative]:
    "Загальний розмір метаданих не може бути від'ємним",
  [BrightChainStrings.Error_CblError_InvalidMetadataBuffer]:
    'Недійсний буфер метаданих',
  [BrightChainStrings.Error_CblError_CreationFailedTemplate]:
    'Не вдалося створити блок CBL: {ERROR}',
  [BrightChainStrings.Error_CblError_InsufficientCapacityTemplate]:
    'Розмір блоку ({BLOCK_SIZE}) занадто малий для даних CBL ({DATA_SIZE})',
  [BrightChainStrings.Error_CblError_NotExtendedCbl]: 'Не є розширеним CBL',
  [BrightChainStrings.Error_CblError_InvalidSignature]: 'Недійсний підпис CBL',
  [BrightChainStrings.Error_CblError_CreatorIdMismatch]:
    'Невідповідність ідентифікатора творця',
  [BrightChainStrings.Error_CblError_FileSizeTooLarge]:
    'Розмір файлу занадто великий',
  [BrightChainStrings.Error_CblError_FileSizeTooLargeForNode]:
    'Розмір файлу перевищує максимальний дозволений для поточного вузла',
  [BrightChainStrings.Error_CblError_InvalidTupleSize]:
    'Недійсний розмір кортежу',
  [BrightChainStrings.Error_CblError_FileNameTooLong]:
    "Ім'я файлу занадто довге",
  [BrightChainStrings.Error_CblError_MimeTypeTooLong]:
    'Тип MIME занадто довгий',
  [BrightChainStrings.Error_CblError_AddressCountExceedsCapacity]:
    'Кількість адрес перевищує ємність блоку',
  [BrightChainStrings.Error_CblError_CblEncrypted]:
    'CBL зашифрований. Розшифруйте перед використанням.',
  [BrightChainStrings.Error_CblError_UserRequiredForDecryption]:
    "Користувач є обов'язковим для розшифрування",
  [BrightChainStrings.Error_CblError_NotASuperCbl]: 'Не є супер CBL',
  [BrightChainStrings.Error_CblError_FailedToExtractCreatorId]:
    'Не вдалося витягти байти ідентифікатора творця з заголовка CBL',
  [BrightChainStrings.Error_CblError_FailedToExtractProvidedCreatorId]:
    'Не вдалося витягти байти ідентифікатора учасника з наданого творця',
  [BrightChainStrings.Error_CblError_PoolIntegrityError]:
    'Помилка цілісності пулу CBL: один або кілька посилальних блоків відсутні в очікуваному пулі',

  // Multi-Encrypted Errors
  [BrightChainStrings.Error_MultiEncryptedError_InvalidEphemeralPublicKeyLength]:
    'Недійсна довжина ефемерного публічного ключа',
  [BrightChainStrings.Error_MultiEncryptedError_DataLengthExceedsCapacity]:
    'Довжина даних перевищує ємність блоку',
  [BrightChainStrings.Error_MultiEncryptedError_BlockNotReadable]:
    'Блок не може бути прочитаний',
  [BrightChainStrings.Error_MultiEncryptedError_DataTooShort]:
    'Дані занадто короткі для заголовка шифрування',
  [BrightChainStrings.Error_MultiEncryptedError_CreatorMustBeMember]:
    'Творець повинен бути Member',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidIVLength]:
    'Недійсна довжина IV',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidAuthTagLength]:
    'Недійсна довжина тегу автентифікації',
  [BrightChainStrings.Error_MultiEncryptedError_ChecksumMismatch]:
    'Невідповідність контрольної суми',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientMismatch]:
    'Список отримувачів не відповідає кількості отримувачів у заголовку',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientsAlreadyLoaded]:
    'Отримувачі вже завантажені',

  // Block Errors
  [BrightChainStrings.Error_BlockError_CreatorRequired]:
    "Творець є обов'язковим",
  [BrightChainStrings.Error_BlockError_DataLengthExceedsCapacity]:
    'Довжина даних перевищує ємність блоку',
  [BrightChainStrings.Error_BlockError_DataRequired]: "Дані є обов'язковими",
  [BrightChainStrings.Error_BlockError_ActualDataLengthExceedsDataLength]:
    'Фактична довжина даних не може перевищувати довжину даних',
  [BrightChainStrings.Error_BlockError_ActualDataLengthNegative]:
    'Фактична довжина даних повинна бути додатною',
  [BrightChainStrings.Error_BlockError_CreatorRequiredForEncryption]:
    "Творець є обов'язковим для шифрування",
  [BrightChainStrings.Error_BlockError_UnexpectedEncryptedBlockType]:
    'Неочікуваний тип зашифрованого блоку',
  [BrightChainStrings.Error_BlockError_CannotEncrypt]:
    'Блок не може бути зашифрований',
  [BrightChainStrings.Error_BlockError_CannotDecrypt]:
    'Блок не може бути розшифрований',
  [BrightChainStrings.Error_BlockError_CreatorPrivateKeyRequired]:
    "Приватний ключ творця є обов'язковим",
  [BrightChainStrings.Error_BlockError_InvalidMultiEncryptionRecipientCount]:
    'Недійсна кількість отримувачів мультишифрування',
  [BrightChainStrings.Error_BlockError_InvalidNewBlockType]:
    'Недійсний новий тип блоку',
  [BrightChainStrings.Error_BlockError_UnexpectedEphemeralBlockType]:
    'Неочікуваний тип ефемерного блоку',
  [BrightChainStrings.Error_BlockError_RecipientRequired]:
    "Отримувач є обов'язковим",
  [BrightChainStrings.Error_BlockError_RecipientKeyRequired]:
    "Приватний ключ отримувача є обов'язковим",
  [BrightChainStrings.Error_BlockError_DataLengthMustMatchBlockSize]:
    'Довжина даних повинна відповідати розміру блоку',

  // Whitened Errors
  [BrightChainStrings.Error_WhitenedError_BlockNotReadable]:
    'Блок не може бути прочитаний',
  [BrightChainStrings.Error_WhitenedError_BlockSizeMismatch]:
    'Розміри блоків повинні співпадати',
  [BrightChainStrings.Error_WhitenedError_DataLengthMismatch]:
    'Довжини даних та випадкових даних повинні співпадати',
  [BrightChainStrings.Error_WhitenedError_InvalidBlockSize]:
    'Недійсний розмір блоку',

  // Tuple Errors
  [BrightChainStrings.Error_TupleError_InvalidTupleSize]:
    'Недійсний розмір кортежу',
  [BrightChainStrings.Error_TupleError_BlockSizeMismatch]:
    'Усі блоки в кортежі повинні мати однаковий розмір',
  [BrightChainStrings.Error_TupleError_NoBlocksToXor]: 'Немає блоків для XOR',
  [BrightChainStrings.Error_TupleError_InvalidBlockCount]:
    'Недійсна кількість блоків для кортежу',
  [BrightChainStrings.Error_TupleError_InvalidBlockType]: 'Недійсний тип блоку',
  [BrightChainStrings.Error_TupleError_InvalidSourceLength]:
    'Довжина джерела повинна бути додатною',
  [BrightChainStrings.Error_TupleError_RandomBlockGenerationFailed]:
    'Не вдалося згенерувати випадковий блок',
  [BrightChainStrings.Error_TupleError_WhiteningBlockGenerationFailed]:
    'Не вдалося згенерувати блок відбілювання',
  [BrightChainStrings.Error_TupleError_MissingParameters]:
    "Усі параметри є обов'язковими",
  [BrightChainStrings.Error_TupleError_XorOperationFailedTemplate]:
    'Не вдалося виконати XOR блоків: {ERROR}',
  [BrightChainStrings.Error_TupleError_DataStreamProcessingFailedTemplate]:
    'Не вдалося обробити потік даних: {ERROR}',
  [BrightChainStrings.Error_TupleError_EncryptedDataStreamProcessingFailedTemplate]:
    'Не вдалося обробити зашифрований потік даних: {ERROR}',
  [BrightChainStrings.Error_TupleError_PoolBoundaryViolationTemplate]:
    'Порушення межі пулу: {BLOCK_TYPE} належить до пулу "{ACTUAL_POOL}", але кортеж вимагає пул "{EXPECTED_POOL}"',

  // Memory Tuple Errors
  [BrightChainStrings.Error_MemoryTupleError_InvalidTupleSizeTemplate]:
    'Кортеж повинен мати {TUPLE_SIZE} блоків',
  [BrightChainStrings.Error_MemoryTupleError_BlockSizeMismatch]:
    'Усі блоки в кортежі повинні мати однаковий розмір',
  [BrightChainStrings.Error_MemoryTupleError_NoBlocksToXor]:
    'Немає блоків для XOR',
  [BrightChainStrings.Error_MemoryTupleError_InvalidBlockCount]:
    'Недійсна кількість блоків для кортежу',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlockIdsTemplate]:
    'Очікувалося {TUPLE_SIZE} ідентифікаторів блоків',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlocksTemplate]:
    'Очікувалося {TUPLE_SIZE} блоків',

  // Handle Tuple Errors
  [BrightChainStrings.Error_HandleTupleError_InvalidTupleSizeTemplate]:
    'Недійсний розмір кортежу ({TUPLE_SIZE})',
  [BrightChainStrings.Error_HandleTupleError_BlockSizeMismatch]:
    'Усі блоки в кортежі повинні мати однаковий розмір',
  [BrightChainStrings.Error_HandleTupleError_NoBlocksToXor]:
    'Немає блоків для XOR',
  [BrightChainStrings.Error_HandleTupleError_BlockSizesMustMatch]:
    'Розміри блоків повинні співпадати',
  [BrightChainStrings.Error_HandleTupleError_PoolMismatchTemplate]:
    'Невідповідність пулу: блок {BLOCK_ID} належить до пулу "{ACTUAL_POOL}", але кортеж вимагає пул "{EXPECTED_POOL}"',

  // Stream Errors
  [BrightChainStrings.Error_StreamError_BlockSizeRequired]:
    "Розмір блоку є обов'язковим",
  [BrightChainStrings.Error_StreamError_WhitenedBlockSourceRequired]:
    "Джерело відбіленого блоку є обов'язковим",
  [BrightChainStrings.Error_StreamError_RandomBlockSourceRequired]:
    "Джерело випадкового блоку є обов'язковим",
  [BrightChainStrings.Error_StreamError_InputMustBeBuffer]:
    'Вхід повинен бути буфером',
  [BrightChainStrings.Error_StreamError_FailedToGetRandomBlock]:
    'Не вдалося отримати випадковий блок',
  [BrightChainStrings.Error_StreamError_FailedToGetWhiteningBlock]:
    'Не вдалося отримати блок відбілювання/випадковий блок',
  [BrightChainStrings.Error_StreamError_IncompleteEncryptedBlock]:
    'Неповний зашифрований блок',

  // Member Errors
  [BrightChainStrings.Error_MemberError_InsufficientRandomBlocks]:
    'Недостатньо випадкових блоків.',
  [BrightChainStrings.Error_MemberError_FailedToCreateMemberBlocks]:
    'Не вдалося створити блоки учасника.',
  [BrightChainStrings.Error_MemberError_InvalidMemberBlocks]:
    'Недійсні блоки учасника.',
  [BrightChainStrings.Error_MemberError_PrivateKeyRequiredToDeriveVotingKeyPair]:
    "Приватний ключ є обов'язковим для отримання пари ключів голосування.",

  // General Errors
  [BrightChainStrings.Error_Hydration_FailedToHydrateTemplate]:
    'Не вдалося гідратувати: {ERROR}',
  [BrightChainStrings.Error_Serialization_FailedToSerializeTemplate]:
    'Не вдалося серіалізувати: {ERROR}',
  [BrightChainStrings.Error_Checksum_Invalid]: 'Недійсна контрольна сума.',
  [BrightChainStrings.Error_Creator_Invalid]: 'Недійсний творець.',
  [BrightChainStrings.Error_ID_InvalidFormat]: 'Недійсний формат ID.',
  [BrightChainStrings.Error_TupleCount_InvalidTemplate]:
    'Недійсна кількість кортежів ({TUPLE_COUNT}), повинна бути між {TUPLE_MIN_SIZE} та {TUPLE_MAX_SIZE}',
  [BrightChainStrings.Error_References_Invalid]: 'Недійсні посилання.',
  [BrightChainStrings.Error_SessionID_Invalid]: 'Недійсний ID сесії.',
  [BrightChainStrings.Error_Signature_Invalid]: 'Недійсний підпис.',
  [BrightChainStrings.Error_Metadata_Mismatch]: 'Невідповідність метаданих.',
  [BrightChainStrings.Error_Token_Expired]: 'Термін дії токена закінчився.',
  [BrightChainStrings.Error_Token_Invalid]: 'Недійсний токен.',
  [BrightChainStrings.Error_Unexpected_Error]: 'Сталася неочікувана помилка.',
  [BrightChainStrings.Error_User_NotFound]: 'Користувача не знайдено.',
  [BrightChainStrings.Error_Validation_Error]: 'Помилка валідації.',
  [BrightChainStrings.Error_Capacity_Insufficient]: 'Недостатня ємність.',
  [BrightChainStrings.Error_Implementation_NotImplemented]: 'Не реалізовано.',

  // Block Sizes
  [BrightChainStrings.BlockSize_Unknown]: 'Невідомий',
  [BrightChainStrings.BlockSize_Message]: 'Повідомлення',
  [BrightChainStrings.BlockSize_Tiny]: 'Крихітний',
  [BrightChainStrings.BlockSize_Small]: 'Малий',
  [BrightChainStrings.BlockSize_Medium]: 'Середній',
  [BrightChainStrings.BlockSize_Large]: 'Великий',
  [BrightChainStrings.BlockSize_Huge]: 'Величезний',

  // Document Errors
  [BrightChainStrings.Error_DocumentError_InvalidValueTemplate]:
    'Недійсне значення для {KEY}',
  [BrightChainStrings.Error_DocumentError_FieldRequiredTemplate]:
    "Поле {KEY} є обов'язковим.",
  [BrightChainStrings.Error_DocumentError_AlreadyInitialized]:
    'Підсистема документів вже ініціалізована',
  [BrightChainStrings.Error_DocumentError_Uninitialized]:
    'Підсистема документів не ініціалізована',

  // XOR Service Errors
  [BrightChainStrings.Error_Xor_LengthMismatchTemplate]:
    'XOR вимагає масивів однакової довжини: a.length={A_LENGTH}, b.length={B_LENGTH}',
  [BrightChainStrings.Error_Xor_NoArraysProvided]:
    'Для XOR необхідно надати принаймні один масив',
  [BrightChainStrings.Error_Xor_ArrayLengthMismatchTemplate]:
    'Усі масиви повинні мати однакову довжину. Очікувалося: {EXPECTED_LENGTH}, отримано: {ACTUAL_LENGTH} за індексом {INDEX}',
  [BrightChainStrings.Error_Xor_CryptoApiNotAvailable]:
    'Crypto API недоступний у цьому середовищі',

  // Tuple Storage Service Errors
  [BrightChainStrings.Error_TupleStorage_DataExceedsBlockSizeTemplate]:
    'Розмір даних ({DATA_SIZE}) перевищує розмір блоку ({BLOCK_SIZE})',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetProtocol]:
    'Недійсний протокол magnet. Очікувалося "magnet:"',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetType]:
    'Недійсний тип magnet. Очікувалося "brightchain"',
  [BrightChainStrings.Error_TupleStorage_MissingMagnetParameters]:
    "Відсутні обов'язкові параметри magnet",

  // Location Record Errors
  [BrightChainStrings.Error_LocationRecord_NodeIdRequired]:
    "Ідентифікатор вузла є обов'язковим",
  [BrightChainStrings.Error_LocationRecord_LastSeenRequired]:
    "Мітка часу останнього перегляду є обов'язковою",
  [BrightChainStrings.Error_LocationRecord_IsAuthoritativeRequired]:
    "Прапорець isAuthoritative є обов'язковим",
  [BrightChainStrings.Error_LocationRecord_InvalidLastSeenDate]:
    'Недійсна дата останнього перегляду',
  [BrightChainStrings.Error_LocationRecord_InvalidLatencyMs]:
    "Затримка повинна бути невід'ємним числом",

  // Metadata Errors
  [BrightChainStrings.Error_Metadata_BlockIdRequired]:
    "Ідентифікатор блоку є обов'язковим",
  [BrightChainStrings.Error_Metadata_CreatedAtRequired]:
    "Мітка часу створення є обов'язковою",
  [BrightChainStrings.Error_Metadata_LastAccessedAtRequired]:
    "Мітка часу останнього доступу є обов'язковою",
  [BrightChainStrings.Error_Metadata_LocationUpdatedAtRequired]:
    "Мітка часу оновлення місцезнаходження є обов'язковою",
  [BrightChainStrings.Error_Metadata_InvalidCreatedAtDate]:
    'Недійсна дата створення',
  [BrightChainStrings.Error_Metadata_InvalidLastAccessedAtDate]:
    'Недійсна дата останнього доступу',
  [BrightChainStrings.Error_Metadata_InvalidLocationUpdatedAtDate]:
    'Недійсна дата оновлення місцезнаходження',
  [BrightChainStrings.Error_Metadata_InvalidExpiresAtDate]:
    'Недійсна дата закінчення терміну дії',
  [BrightChainStrings.Error_Metadata_InvalidAvailabilityStateTemplate]:
    'Недійсний стан доступності: {STATE}',
  [BrightChainStrings.Error_Metadata_LocationRecordsMustBeArray]:
    'Записи місцезнаходження повинні бути масивом',
  [BrightChainStrings.Error_Metadata_InvalidLocationRecordTemplate]:
    'Недійсний запис місцезнаходження за індексом {INDEX}',
  [BrightChainStrings.Error_Metadata_InvalidAccessCount]:
    "Кількість доступів повинна бути невід'ємним числом",
  [BrightChainStrings.Error_Metadata_InvalidTargetReplicationFactor]:
    'Цільовий коефіцієнт реплікації повинен бути додатним числом',
  [BrightChainStrings.Error_Metadata_InvalidSize]:
    "Розмір повинен бути невід'ємним числом",
  [BrightChainStrings.Error_Metadata_ParityBlockIdsMustBeArray]:
    'Ідентифікатори блоків парності повинні бути масивом',
  [BrightChainStrings.Error_Metadata_ReplicaNodeIdsMustBeArray]:
    'Ідентифікатори вузлів реплік повинні бути масивом',

  // Service Provider Errors
  [BrightChainStrings.Error_ServiceProvider_UseSingletonInstance]:
    'Використовуйте ServiceProvider.getInstance() замість створення нового екземпляра',
  [BrightChainStrings.Error_ServiceProvider_NotInitialized]:
    'ServiceProvider не було ініціалізовано',
  [BrightChainStrings.Error_ServiceLocator_NotSet]:
    'ServiceLocator не було встановлено',

  // Block Service Errors (additional)
  [BrightChainStrings.Error_BlockService_CannotEncrypt]:
    'Неможливо зашифрувати блок',
  [BrightChainStrings.Error_BlockService_BlocksArrayEmpty]:
    'Масив блоків не повинен бути порожнім',
  [BrightChainStrings.Error_BlockService_BlockSizesMustMatch]:
    'Усі блоки повинні мати однаковий розмір блоку',

  // Message Router Errors
  [BrightChainStrings.Error_MessageRouter_MessageNotFoundTemplate]:
    'Повідомлення не знайдено: {MESSAGE_ID}',

  // Browser Config Errors
  [BrightChainStrings.Error_BrowserConfig_NotImplementedTemplate]:
    'Метод {METHOD} не реалізовано в браузерному середовищі',

  // Debug Errors
  [BrightChainStrings.Error_Debug_UnsupportedFormat]:
    'Непідтримуваний формат для виводу налагодження',

  // Secure Heap Storage Errors
  [BrightChainStrings.Error_SecureHeap_KeyNotFound]:
    'Ключ не знайдено в безпечному сховищі купи',

  // I18n Errors
  [BrightChainStrings.Error_I18n_KeyConflictObjectTemplate]:
    'Виявлено конфлікт ключів: {KEY} вже існує в {OBJECT}',
  [BrightChainStrings.Error_I18n_KeyConflictValueTemplate]:
    'Виявлено конфлікт ключів: {KEY} має конфліктне значення {VALUE}',
  [BrightChainStrings.Error_I18n_StringsNotFoundTemplate]:
    'Рядки не знайдено для мови: {LANGUAGE}',

  // Document Errors (additional)
  [BrightChainStrings.Error_Document_CreatorRequiredForSaving]:
    "Творець є обов'язковим для збереження документа",
  [BrightChainStrings.Error_Document_CreatorRequiredForEncrypting]:
    "Творець є обов'язковим для шифрування документа",
  [BrightChainStrings.Error_Document_NoEncryptedData]:
    'Зашифровані дані недоступні',
  [BrightChainStrings.Error_Document_FieldShouldBeArrayTemplate]:
    'Поле {FIELD} повинно бути масивом',
  [BrightChainStrings.Error_Document_InvalidArrayValueTemplate]:
    'Недійсне значення масиву за індексом {INDEX} у полі {FIELD}',
  [BrightChainStrings.Error_Document_FieldRequiredTemplate]:
    "Поле {FIELD} є обов'язковим",
  [BrightChainStrings.Error_Document_FieldInvalidTemplate]:
    'Поле {FIELD} недійсне',
  [BrightChainStrings.Error_Document_InvalidValueTemplate]:
    'Недійсне значення для поля {FIELD}',
  [BrightChainStrings.Error_MemberDocument_PublicCblIdNotSet]:
    'Публічний ідентифікатор CBL не встановлено',
  [BrightChainStrings.Error_MemberDocument_PrivateCblIdNotSet]:
    'Приватний ідентифікатор CBL не встановлено',
  [BrightChainStrings.Error_BaseMemberDocument_PublicCblIdNotSet]:
    'Публічний ідентифікатор CBL базового документа учасника не встановлено',
  [BrightChainStrings.Error_BaseMemberDocument_PrivateCblIdNotSet]:
    'Приватний ідентифікатор CBL базового документа учасника не встановлено',
  [BrightChainStrings.Error_Document_InvalidValueInArrayTemplate]:
    'Недійсне значення в масиві для {KEY}',
  [BrightChainStrings.Error_Document_FieldIsRequiredTemplate]:
    "Поле {FIELD} є обов'язковим",
  [BrightChainStrings.Error_Document_FieldIsInvalidTemplate]:
    'Поле {FIELD} є недійсним',

  // SimpleBrightChain Errors
  [BrightChainStrings.Error_SimpleBrightChain_BlockNotFoundTemplate]:
    'Блок не знайдено: {BLOCK_ID}',

  // Currency Code Errors
  [BrightChainStrings.Error_CurrencyCode_Invalid]: 'Недійсний код валюти',

  // Console Output Warnings
  [BrightChainStrings.Warning_BufferUtils_InvalidBase64String]:
    'Надано недійсний рядок base64',
  [BrightChainStrings.Warning_Keyring_FailedToLoad]:
    "Не вдалося завантажити зв'язку ключів зі сховища",
  [BrightChainStrings.Warning_I18n_TranslationFailedTemplate]:
    'Не вдалося перекласти ключ {KEY}',

  // Console Output Errors
  [BrightChainStrings.Error_MemberStore_RollbackFailed]:
    'Не вдалося відкотити транзакцію сховища учасників',
  [BrightChainStrings.Error_MemberCblService_CreateMemberCblFailed]:
    'Не вдалося створити CBL учасника',
  [BrightChainStrings.Error_MemberCblService_ChecksumMismatch]:
    'Невідповідність контрольної суми блоку під час перевірки цілісності',
  [BrightChainStrings.Error_MemberCblService_BlockRetrievalFailed]:
    'Не вдалося отримати блок під час перевірки цілісності',
  [BrightChainStrings.Error_MemberCblService_MissingRequiredFields]:
    "У даних учасника відсутні обов'язкові поля",
  [BrightChainStrings.Error_DeliveryTimeout_HandleTimeoutFailedTemplate]:
    'Не вдалося обробити тайм-аут доставки: {ERROR}',

  // Validator Errors
  [BrightChainStrings.Error_Validator_InvalidBlockSizeTemplate]:
    'Недійсний розмір блоку: {BLOCK_SIZE}. Дійсні розміри: {BLOCK_SIZES}',
  [BrightChainStrings.Error_Validator_InvalidBlockTypeTemplate]:
    'Недійсний тип блоку: {BLOCK_TYPE}. Дійсні типи: {BLOCK_TYPES}',
  [BrightChainStrings.Error_Validator_InvalidEncryptionTypeTemplate]:
    'Недійсний тип шифрування: {ENCRYPTION_TYPE}. Дійсні типи: {ENCRYPTION_TYPES}',
  [BrightChainStrings.Error_Validator_RecipientCountMustBeAtLeastOne]:
    'Кількість отримувачів повинна бути щонайменше 1 для шифрування з багатьма отримувачами',
  [BrightChainStrings.Error_Validator_RecipientCountMaximumTemplate]:
    'Кількість отримувачів не може перевищувати {MAXIMUM}',
  [BrightChainStrings.Error_Validator_FieldRequiredTemplate]:
    "{FIELD} є обов'язковим",
  [BrightChainStrings.Error_Validator_FieldCannotBeEmptyTemplate]:
    '{FIELD} не може бути порожнім',

  // Miscellaneous Block Errors
  [BrightChainStrings.Error_BlockError_BlockSizesMustMatch]:
    'Розміри блоків повинні співпадати',
  [BrightChainStrings.Error_BlockError_DataCannotBeNullOrUndefined]:
    'Дані не можуть бути null або undefined',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsBlockSizeTemplate]:
    'Довжина даних ({LENGTH}) перевищує розмір блоку ({BLOCK_SIZE})',

  // CPU Errors
  [BrightChainStrings.Error_CPU_DuplicateOpcodeErrorTemplate]:
    'Дублювання опкоду 0x{OPCODE} у наборі інструкцій {INSTRUCTION_SET}',
  [BrightChainStrings.Error_CPU_NotImplementedTemplate]:
    '{INSTRUCTION} не реалізовано',
  [BrightChainStrings.Error_CPU_InvalidReadSizeTemplate]:
    'Недійсний розмір читання: {SIZE}',
  [BrightChainStrings.Error_CPU_StackOverflow]: 'Переповнення стеку',
  [BrightChainStrings.Error_CPU_StackUnderflow]: 'Спустошення стеку',

  // Member CBL Errors
  [BrightChainStrings.Error_MemberCBL_PublicCBLIdNotSet]:
    'Публічний ідентифікатор CBL не встановлено',
  [BrightChainStrings.Error_MemberCBL_PrivateCBLIdNotSet]:
    'Приватний ідентифікатор CBL не встановлено',

  // Member Document Errors
  [BrightChainStrings.Error_MemberDocument_Hint]:
    'Використовуйте MemberDocument.create() замість new MemberDocument()',
  [BrightChainStrings.Error_MemberDocument_CBLNotGenerated]:
    'CBL не були згенеровані. Викличте generateCBLs() перед викликом toMember()',

  // Member Profile Document Errors
  [BrightChainStrings.Error_MemberProfileDocument_Hint]:
    'Використовуйте MemberProfileDocument.create() замість new MemberProfileDocument()',

  // Quorum Document Errors
  [BrightChainStrings.Error_QuorumDocument_CreatorMustBeSetBeforeSaving]:
    'Створювач повинен бути встановлений перед збереженням',
  [BrightChainStrings.Error_QuorumDocument_CreatorMustBeSetBeforeEncrypting]:
    'Створювач повинен бути встановлений перед шифруванням',
  [BrightChainStrings.Error_QuorumDocument_DocumentHasNoEncryptedData]:
    'Документ не має зашифрованих даних',
  [BrightChainStrings.Error_QuorumDocument_InvalidEncryptedDataFormat]:
    'Недійсний формат зашифрованих даних',
  [BrightChainStrings.Error_QuorumDocument_InvalidMemberIdsFormat]:
    'Недійсний формат ідентифікаторів учасників',
  [BrightChainStrings.Error_QuorumDocument_InvalidSignatureFormat]:
    'Недійсний формат підпису',
  [BrightChainStrings.Error_QuorumDocument_InvalidCreatorIdFormat]:
    'Недійсний формат ідентифікатора створювача',
  [BrightChainStrings.Error_QuorumDocument_InvalidChecksumFormat]:
    'Недійсний формат контрольної суми',

  // Block Logger
  [BrightChainStrings.BlockLogger_Redacted]: 'ВИДАЛЕНО',

  // Member Schema Errors
  [BrightChainStrings.Error_MemberSchema_InvalidIdFormat]:
    'Недійсний формат ідентифікатора',
  [BrightChainStrings.Error_MemberSchema_InvalidPublicKeyFormat]:
    'Недійсний формат публічного ключа',
  [BrightChainStrings.Error_MemberSchema_InvalidVotingPublicKeyFormat]:
    'Недійсний формат публічного ключа для голосування',
  [BrightChainStrings.Error_MemberSchema_InvalidEmailFormat]:
    'Недійсний формат електронної пошти',
  [BrightChainStrings.Error_MemberSchema_InvalidRecoveryDataFormat]:
    'Недійсний формат даних відновлення',
  [BrightChainStrings.Error_MemberSchema_InvalidTrustedPeersFormat]:
    'Недійсний формат довірених вузлів',
  [BrightChainStrings.Error_MemberSchema_InvalidBlockedPeersFormat]:
    'Недійсний формат заблокованих вузлів',
  [BrightChainStrings.Error_MemberSchema_InvalidActivityLogFormat]:
    'Недійсний формат журналу активності',

  // Message Metadata Schema Errors
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidRecipientsFormat]:
    'Недійсний формат одержувачів',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidPriorityFormat]:
    'Недійсний формат пріоритету',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidDeliveryStatusFormat]:
    'Недійсний формат статусу доставки',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidAcknowledgementsFormat]:
    'Недійсний формат підтверджень',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidCBLBlockIDsFormat]:
    'Недійсний формат ідентифікаторів блоків CBL',

  // Security
  [BrightChainStrings.Security_DOS_InputSizeExceedsLimitErrorTemplate]:
    'Розмір вхідних даних {SIZE} перевищує ліміт {MAX_SIZE} для {OPERATION}',
  [BrightChainStrings.Security_DOS_OperationExceededTimeLimitErrorTemplate]:
    'Операція {OPERATION} перевищила час очікування {MAX_TIME} мс',
  [BrightChainStrings.Security_RateLimiter_RateLimitExceededErrorTemplate]:
    'Ліміт швидкості перевищено для {OPERATION}',
  [BrightChainStrings.Security_AuditLogger_SignatureValidationResultTemplate]:
    'Валідація підпису {RESULT}',
  [BrightChainStrings.Security_AuditLogger_Failure]: 'Невдача',
  [BrightChainStrings.Security_AuditLogger_Success]: 'Успіх',
  [BrightChainStrings.Security_AuditLogger_BlockCreated]: 'Блок створено',
  [BrightChainStrings.Security_AuditLogger_EncryptionPerformed]:
    'Шифрування виконано',
  [BrightChainStrings.Security_AuditLogger_DecryptionResultTemplate]:
    'Розшифрування {RESULT}',
  [BrightChainStrings.Security_AuditLogger_AccessDeniedTemplate]:
    'Доступ до {RESOURCE} заборонено',
  [BrightChainStrings.Security_AuditLogger_Security]: 'Безпека',

  // Delivery Timeout
  [BrightChainStrings.DeliveryTimeout_FailedToHandleTimeoutTemplate]:
    'Не вдалося обробити тайм-аут для {MESSAGE_ID}:{RECIPIENT_ID}',

  // Message CBL Service
  [BrightChainStrings.MessageCBLService_MessageSizeExceedsMaximumTemplate]:
    'Розмір повідомлення {SIZE} перевищує максимум {MAX_SIZE}',
  [BrightChainStrings.MessageCBLService_FailedToCreateMessageAfterRetries]:
    'Не вдалося створити повідомлення після повторних спроб',
  [BrightChainStrings.MessageCBLService_FailedToRetrieveMessageTemplate]:
    'Не вдалося отримати повідомлення {MESSAGE_ID}',
  [BrightChainStrings.MessageCBLService_MessageTypeIsRequired]:
    "Тип повідомлення є обов'язковим",
  [BrightChainStrings.MessageCBLService_SenderIDIsRequired]:
    "Ідентифікатор відправника є обов'язковим",
  [BrightChainStrings.MessageCBLService_RecipientCountExceedsMaximumTemplate]:
    'Кількість отримувачів {COUNT} перевищує максимум {MAXIMUM}',

  // Message Encryption Service
  [BrightChainStrings.MessageEncryptionService_NoRecipientPublicKeysProvided]:
    'Не надано публічних ключів отримувачів',
  [BrightChainStrings.MessageEncryptionService_FailedToEncryptTemplate]:
    'Не вдалося зашифрувати для отримувача {RECIPIENT_ID}: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_BroadcastEncryptionFailedTemplate]:
    'Не вдалося виконати шифрування трансляції: {TEMPLATE}',
  [BrightChainStrings.MessageEncryptionService_DecryptionFailedTemplate]:
    'Не вдалося розшифрувати: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_KeyDecryptionFailedTemplate]:
    'Не вдалося розшифрувати ключ: {ERROR}',

  // Message Logger
  [BrightChainStrings.MessageLogger_MessageCreated]: 'Повідомлення створено',
  [BrightChainStrings.MessageLogger_RoutingDecision]:
    'Рішення про маршрутизацію',
  [BrightChainStrings.MessageLogger_DeliveryFailure]: 'Помилка доставки',
  [BrightChainStrings.MessageLogger_EncryptionFailure]: 'Помилка шифрування',
  [BrightChainStrings.MessageLogger_SlowQueryDetected]:
    'Виявлено повільний запит',

  // Message Router
  [BrightChainStrings.MessageRouter_RoutingTimeout]: 'Тайм-аут маршрутизації',
  [BrightChainStrings.MessageRouter_FailedToRouteToAnyRecipient]:
    'Не вдалося маршрутизувати повідомлення до жодного отримувача',
  [BrightChainStrings.MessageRouter_ForwardingLoopDetected]:
    'Виявлено петлю пересилання',

  // Block Format Service
  [BrightChainStrings.BlockFormatService_DataTooShort]:
    'Дані занадто короткі для заголовка структурованого блоку (потрібно мінімум 4 байти)',
  [BrightChainStrings.BlockFormatService_InvalidStructuredBlockFormatTemplate]:
    'Недійсний тип структурованого блоку: 0x{TYPE}',
  [BrightChainStrings.BlockFormatService_CannotDetermineHeaderSize]:
    'Неможливо визначити розмір заголовка - дані можуть бути обрізані',
  [BrightChainStrings.BlockFormatService_Crc8MismatchTemplate]:
    'Невідповідність CRC8 - заголовок може бути пошкоджений (очікувано 0x{EXPECTED}, отримано 0x{CHECKSUM})',
  [BrightChainStrings.BlockFormatService_DataAppearsEncrypted]:
    'Дані, схоже, зашифровані ECIES - розшифруйте перед аналізом',
  [BrightChainStrings.BlockFormatService_UnknownBlockFormat]:
    'Невідомий формат блоку - відсутній магічний префікс 0xBC (можливо, необроблені дані)',

  // CBL Service
  [BrightChainStrings.CBLService_NotAMessageCBL]: 'Це не CBL повідомлення',
  [BrightChainStrings.CBLService_CreatorIDByteLengthMismatchTemplate]:
    'Невідповідність довжини байтів ID творця: отримано {LENGTH}, очікувано {EXPECTED}',
  [BrightChainStrings.CBLService_CreatorIDProviderReturnedBytesLengthMismatchTemplate]:
    'Провайдер ID творця повернув {LENGTH} байтів, очікувано {EXPECTED}',
  [BrightChainStrings.CBLService_SignatureLengthMismatchTemplate]:
    'Невідповідність довжини підпису: отримано {LENGTH}, очікувано {EXPECTED}',
  [BrightChainStrings.CBLService_DataAppearsRaw]:
    'Дані виглядають як необроблені дані без структурованого заголовка',
  [BrightChainStrings.CBLService_InvalidBlockFormat]: 'Недійсний формат блоку',
  [BrightChainStrings.CBLService_SubCBLCountChecksumMismatchTemplate]:
    'SubCblCount ({COUNT}) не відповідає довжині subCblChecksums ({EXPECTED})',
  [BrightChainStrings.CBLService_InvalidDepthTemplate]:
    'Глибина має бути від 1 до 65535, отримано {DEPTH}',
  [BrightChainStrings.CBLService_ExpectedSuperCBLTemplate]:
    'Очікувався SuperCBL (тип блоку 0x03), отримано тип блоку 0x{TYPE}',

  // Global Service Provider
  [BrightChainStrings.GlobalServiceProvider_NotInitialized]:
    'Постачальник сервісів не ініціалізований. Спочатку викличте ServiceProvider.getInstance().',

  // Block Store Adapter
  [BrightChainStrings.BlockStoreAdapter_DataLengthExceedsBlockSizeTemplate]:
    'Довжина даних ({LENGTH}) перевищує розмір блоку ({BLOCK_SIZE})',

  // Memory Block Store
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailable]:
    'Сервіс FEC недоступний',
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailableInThisEnvironment]:
    'Сервіс FEC недоступний у цьому середовищі',
  [BrightChainStrings.MemoryBlockStore_NoParityDataAvailable]:
    'Немає даних паритету для відновлення',
  [BrightChainStrings.MemoryBlockStore_BlockMetadataNotFound]:
    'Метадані блоку не знайдено',
  [BrightChainStrings.MemoryBlockStore_RecoveryFailedInsufficientParityData]:
    'Відновлення не вдалося - недостатньо даних паритету',
  [BrightChainStrings.MemoryBlockStore_UnknownRecoveryError]:
    'Невідома помилка відновлення',
  [BrightChainStrings.MemoryBlockStore_CBLDataCannotBeEmpty]:
    'Дані CBL не можуть бути порожніми',
  [BrightChainStrings.MemoryBlockStore_CBLDataTooLargeTemplate]:
    'Дані CBL занадто великі: розмір з доповненням ({LENGTH}) перевищує розмір блоку ({BLOCK_SIZE}). Використовуйте більший розмір блоку або менший CBL.',
  [BrightChainStrings.MemoryBlockStore_Block1NotFound]:
    'Блок 1 не знайдено і відновлення не вдалося',
  [BrightChainStrings.MemoryBlockStore_Block2NotFound]:
    'Блок 2 не знайдено і відновлення не вдалося',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL]:
    'Недійсна magnet URL-адреса: має починатися з "magnet:?"',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLXT]:
    'Недійсна magnet URL-адреса: параметр xt має бути "urn:brightchain:cbl"',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLMissingTemplate]:
    'Недійсна magnet URL-адреса: відсутній параметр {PARAMETER}',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL_InvalidBlockSize]:
    'Недійсна magnet URL-адреса: недійсний розмір блоку',

  // Checksum
  [BrightChainStrings.Checksum_InvalidTemplate]:
    'Контрольна сума повинна бути {EXPECTED} байтів, отримано {LENGTH} байтів',
  [BrightChainStrings.Checksum_InvalidHexString]:
    'Недійсний шістнадцятковий рядок: містить нешістнадцяткові символи',
  [BrightChainStrings.Checksum_InvalidHexStringTemplate]:
    'Недійсна довжина шістнадцяткового рядка: очікувалось {EXPECTED} символів, отримано {LENGTH}',

  [BrightChainStrings.Error_XorLengthMismatchTemplate]:
    'XOR вимагає масиви однакової довжини{CONTEXT}: a.length={A_LENGTH}, b.length={B_LENGTH}',
  [BrightChainStrings.Error_XorAtLeastOneArrayRequired]:
    'Для XOR потрібно надати принаймні один масив',

  [BrightChainStrings.Error_InvalidUnixTimestampTemplate]:
    'Недійсна мітка часу Unix: {TIMESTAMP}',
  [BrightChainStrings.Error_InvalidDateStringTemplate]:
    'Недійсний рядок дати: "{VALUE}". Очікується формат ISO 8601 (напр. "2024-01-23T10:30:00Z") або мітка часу Unix.',
  [BrightChainStrings.Error_InvalidDateValueTypeTemplate]:
    'Недійсний тип значення дати: {TYPE}. Очікується рядок або число.',
  [BrightChainStrings.Error_InvalidDateObjectTemplate]:
    "Недійсний об'єкт дати: очікувався екземпляр Date, отримано {OBJECT_STRING}",
  [BrightChainStrings.Error_InvalidDateNaN]:
    "Недійсна дата: об'єкт дати містить мітку часу NaN",
  [BrightChainStrings.Error_JsonValidationErrorTemplate]:
    'Помилка валідації JSON для поля {FIELD}: {REASON}',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNull]:
    "повинен бути ненульовим об'єктом",
  [BrightChainStrings.Error_JsonValidationError_FieldRequired]:
    "поле є обов'язковим",
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockSize]:
    'повинно бути дійсним значенням переліку BlockSize',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockType]:
    'повинно бути дійсним значенням переліку BlockType',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockDataType]:
    'повинно бути дійсним значенням переліку BlockDataType',
  [BrightChainStrings.Error_JsonValidationError_MustBeNumber]:
    'повинно бути числом',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNegative]:
    "повинно бути невід'ємним",
  [BrightChainStrings.Error_JsonValidationError_MustBeInteger]:
    'повинно бути цілим числом',
  [BrightChainStrings.Error_JsonValidationError_MustBeISO8601DateStringOrUnixTimestamp]:
    'повинно бути дійсним рядком ISO 8601 або часовою міткою Unix',
  [BrightChainStrings.Error_JsonValidationError_MustBeString]:
    'повинно бути рядком',
  [BrightChainStrings.Error_JsonValidationError_MustNotBeEmpty]:
    'не повинно бути порожнім',
  [BrightChainStrings.Error_JsonValidationError_JSONParsingFailed]:
    'помилка аналізу JSON',
  [BrightChainStrings.Error_JsonValidationError_ValidationFailed]:
    'перевірка не вдалася',
  [BrightChainStrings.XorUtils_BlockSizeMustBePositiveTemplate]:
    'Розмір блоку повинен бути додатним: {BLOCK_SIZE}',
  [BrightChainStrings.XorUtils_InvalidPaddedDataTemplate]:
    'Недійсні доповнені дані: занадто короткі ({LENGTH} байтів, потрібно щонайменше {REQUIRED})',
  [BrightChainStrings.XorUtils_InvalidLengthPrefixTemplate]:
    'Недійсний префікс довжини: заявляє {LENGTH} байтів, але доступно лише {AVAILABLE}',
  [BrightChainStrings.BlockPaddingTransform_MustBeArray]:
    'Вхідні дані повинні бути Uint8Array, TypedArray або ArrayBuffer',
  [BrightChainStrings.CblStream_UnknownErrorReadingData]:
    'Невідома помилка під час читання даних',
  [BrightChainStrings.CurrencyCode_InvalidCurrencyCode]: 'Недійсний код валюти',
  [BrightChainStrings.EnergyAccount_InsufficientBalanceTemplate]:
    'Недостатній баланс: потрібно {AMOUNT}J, доступно {AVAILABLE_BALANCE}J',
  [BrightChainStrings.Init_BrowserCompatibleConfiguration]:
    'Сумісна з браузером конфігурація BrightChain з GuidV4Provider',
  [BrightChainStrings.Init_NotInitialized]:
    'Бібліотека BrightChain не ініціалізована. Спочатку викличте initializeBrightChain().',
  [BrightChainStrings.ModInverse_MultiplicativeInverseDoesNotExist]:
    'Модульний мультиплікативний обернений елемент не існує',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInTransform]:
    'Невідома помилка при перетворенні',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInMakeTuple]:
    'Невідома помилка в makeTuple',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInFlush]:
    'Невідома помилка в flush',
  [BrightChainStrings.QuorumDataRecord_MustShareWithAtLeastTwoMembers]:
    'Потрібно поділитися щонайменше з 2 учасниками',
  [BrightChainStrings.QuorumDataRecord_SharesRequiredExceedsMembers]:
    'Необхідна кількість часток перевищує кількість учасників',
  [BrightChainStrings.QuorumDataRecord_SharesRequiredMustBeAtLeastTwo]:
    'Необхідна кількість часток повинна бути щонайменше 2',
  [BrightChainStrings.QuorumDataRecord_InvalidChecksum]:
    'Недійсна контрольна сума',
  [BrightChainStrings.SimpleBrowserStore_BlockNotFoundTemplate]:
    'Блок не знайдено: {ID}',
  [BrightChainStrings.EncryptedBlockCreator_NoCreatorRegisteredTemplate]:
    'Для типу блоку {TYPE} не зареєстровано творця',
  [BrightChainStrings.TestMember_MemberNotFoundTemplate]:
    'Учасника {KEY} не знайдено',
};
