import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';

export const SpanishStrings: StringsCollection<BrightChainStringKey> = {
  // BrightChain
  [BrightChainStrings.Common_Bright]: 'Brillante',
  [BrightChainStrings.Common_Chain]: 'Cadena',

  [BrightChainStrings.Common_Privacy]: 'Privacidad',
  [BrightChainStrings.Common_Participation]: 'Participación',
  [BrightChainStrings.Common_Power]: 'Poder',
  [BrightChainStrings.Common_PrivacyParticipationPower]:
    'Privacidad. Participación. Poder.',

  // UI Strings
  [BrightChainStrings.Common_BlockSize]: 'Tamaño de bloque',
  [BrightChainStrings.Common_AtIndexTemplate]:
    '{OPERATION} en el índice {INDEX}',
  [BrightChainStrings.ChangePassword_Success]:
    'Contraseña cambiada exitosamente.',
  [BrightChainStrings.Common_Site]: 'BrightChain',
  [BrightChainStrings.ForgotPassword_Title]: 'Olvidé mi contraseña',
  [BrightChainStrings.Register_Button]: 'Registrarse',
  [BrightChainStrings.Register_Error]: 'Ocurrió un error durante el registro.',
  [BrightChainStrings.Register_Success]: 'Registro exitoso.',

  // Block Handle Errors
  [BrightChainStrings.Error_BlockHandle_BlockConstructorMustBeValid]:
    'blockConstructor debe ser una función constructora válida',
  [BrightChainStrings.Error_BlockHandle_BlockSizeRequired]:
    'blockSize es requerido',
  [BrightChainStrings.Error_BlockHandle_DataMustBeUint8Array]:
    'data debe ser un Uint8Array',
  [BrightChainStrings.Error_BlockHandle_ChecksumMustBeChecksum]:
    'checksum debe ser un Checksum',

  // Block Handle Tuple Errors
  [BrightChainStrings.Error_BlockHandleTuple_FailedToLoadBlockTemplate]:
    'Error al cargar el bloque {CHECKSUM}: {ERROR}',
  [BrightChainStrings.Error_BlockHandleTuple_FailedToStoreXorResultTemplate]:
    'Error al almacenar el resultado XOR: {ERROR}',

  // Block Access Errors
  [BrightChainStrings.Error_BlockAccess_Template]:
    'No se puede acceder al bloque: {REASON}',
  [BrightChainStrings.Error_BlockAccessError_BlockAlreadyExists]:
    'El archivo de bloque ya existe',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotPersistable]:
    'El bloque no es persistible',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotReadable]:
    'El bloque no es legible',
  [BrightChainStrings.Error_BlockAccessError_BlockFileNotFoundTemplate]:
    'Archivo de bloque no encontrado: {FILE}',
  [BrightChainStrings.Error_BlockAccess_CBLCannotBeEncrypted]:
    'El bloque CBL no se puede cifrar',
  [BrightChainStrings.Error_BlockAccessError_CreatorMustBeProvided]:
    'Se debe proporcionar el creador para la validación de firma',
  [BrightChainStrings.Error_Block_CannotBeDecrypted]:
    'El bloque no se puede descifrar',
  [BrightChainStrings.Error_Block_CannotBeEncrypted]:
    'El bloque no se puede cifrar',
  [BrightChainStrings.Error_BlockCapacity_Template]:
    'Capacidad del bloque excedida. Tamaño del bloque: ({BLOCK_SIZE}), Datos: ({DATA_SIZE})',

  // Block Metadata Errors
  [BrightChainStrings.Error_BlockMetadata_Template]:
    'Error de metadatos del bloque: {REASON}',
  [BrightChainStrings.Error_BlockMetadataError_CreatorIdMismatch]:
    'Incompatibilidad de ID del creador',
  [BrightChainStrings.Error_BlockMetadataError_CreatorRequired]:
    'Se requiere el creador',
  [BrightChainStrings.Error_BlockMetadataError_EncryptorRequired]:
    'Se requiere el encriptador',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadata]:
    'Metadatos de bloque inválidos',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadataTemplate]:
    'Metadatos de bloque inválidos: {REASON}',
  [BrightChainStrings.Error_BlockMetadataError_MetadataRequired]:
    'Se requieren los metadatos',
  [BrightChainStrings.Error_BlockMetadataError_MissingRequiredMetadata]:
    'Faltan campos de metadatos requeridos',

  // Block Capacity Errors
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockSize]:
    'Tamaño de bloque inválido',
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockType]:
    'Tipo de bloque inválido',
  [BrightChainStrings.Error_BlockCapacity_CapacityExceeded]:
    'Capacidad excedida',
  [BrightChainStrings.Error_BlockCapacity_InvalidFileName]:
    'Nombre de archivo inválido',
  [BrightChainStrings.Error_BlockCapacity_InvalidMimetype]:
    'Tipo MIME inválido',
  [BrightChainStrings.Error_BlockCapacity_InvalidRecipientCount]:
    'Número de destinatarios inválido',
  [BrightChainStrings.Error_BlockCapacity_InvalidExtendedCblData]:
    'Datos CBL extendidos inválidos',

  // Block Validation Errors
  [BrightChainStrings.Error_BlockValidationError_Template]:
    'La validación del bloque falló: {REASON}',
  [BrightChainStrings.Error_BlockValidationError_ActualDataLengthUnknown]:
    'La longitud real de los datos es desconocida',
  [BrightChainStrings.Error_BlockValidationError_AddressCountExceedsCapacity]:
    'El número de direcciones excede la capacidad del bloque',
  [BrightChainStrings.Error_BlockValidationError_BlockDataNotBuffer]:
    'Block.data debe ser un buffer',
  [BrightChainStrings.Error_BlockValidationError_BlockSizeNegative]:
    'El tamaño del bloque debe ser un número positivo',
  [BrightChainStrings.Error_BlockValidationError_CreatorIDMismatch]:
    'Incompatibilidad de ID del creador',
  [BrightChainStrings.Error_BlockValidationError_DataBufferIsTruncated]:
    'El buffer de datos está truncado',
  [BrightChainStrings.Error_BlockValidationError_DataCannotBeEmpty]:
    'Los datos no pueden estar vacíos',
  [BrightChainStrings.Error_BlockValidationError_DataLengthExceedsCapacity]:
    'La longitud de los datos excede la capacidad del bloque',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShort]:
    'Datos demasiado cortos para contener el encabezado de cifrado',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForCBLHeader]:
    'Datos demasiado cortos para el encabezado CBL',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForEncryptedCBL]:
    'Datos demasiado cortos para CBL cifrado',
  [BrightChainStrings.Error_BlockValidationError_EphemeralBlockOnlySupportsBufferData]:
    'EphemeralBlock solo admite datos de Buffer',
  [BrightChainStrings.Error_BlockValidationError_FutureCreationDate]:
    'La fecha de creación del bloque no puede estar en el futuro',
  [BrightChainStrings.Error_BlockValidationError_InvalidAddressLengthTemplate]:
    'Longitud de dirección inválida en el índice {INDEX}: {LENGTH}, esperado: {EXPECTED_LENGTH}',
  [BrightChainStrings.Error_BlockValidationError_InvalidAuthTagLength]:
    'Longitud de etiqueta de autenticación inválida',
  [BrightChainStrings.Error_BlockValidationError_InvalidBlockTypeTemplate]:
    'Tipo de bloque inválido: {TYPE}',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLAddressCount]:
    'El número de direcciones CBL debe ser un múltiplo de TupleSize',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLDataLength]:
    'Longitud de datos CBL inválida',
  [BrightChainStrings.Error_BlockValidationError_InvalidDateCreated]:
    'Fecha de creación inválida',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionHeaderLength]:
    'Longitud de encabezado de cifrado inválida',
  [BrightChainStrings.Error_BlockValidationError_InvalidEphemeralPublicKeyLength]:
    'Longitud de clave pública efímera inválida',
  [BrightChainStrings.Error_BlockValidationError_InvalidIVLength]:
    'Longitud de IV inválida',
  [BrightChainStrings.Error_BlockValidationError_InvalidSignature]:
    'Firma inválida proporcionada',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientIds]:
    'Identificadores de destinatarios inválidos',
  [BrightChainStrings.Error_BlockValidationError_InvalidTupleSizeTemplate]:
    'El tamaño de la tupla debe estar entre {TUPLE_MIN_SIZE} y {TUPLE_MAX_SIZE}',
  [BrightChainStrings.Error_BlockValidationError_MethodMustBeImplementedByDerivedClass]:
    'El método debe ser implementado por la clase derivada',
  [BrightChainStrings.Error_BlockValidationError_NoChecksum]:
    'No se proporcionó suma de verificación',
  [BrightChainStrings.Error_BlockValidationError_OriginalDataLengthNegative]:
    'La longitud original de los datos no puede ser negativa',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionType]:
    'Tipo de cifrado inválido',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientCount]:
    'Número de destinatarios inválido',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientKeys]:
    'Claves de destinatarios inválidas',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientNotFoundInRecipients]:
    'Destinatario de cifrado no encontrado en los destinatarios',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientHasNoPrivateKey]:
    'El destinatario de cifrado no tiene clave privada',
  [BrightChainStrings.Error_BlockValidationError_InvalidCreator]:
    'Creador inválido',
  [BrightChainStrings.Error_BufferError_InvalidBufferTypeTemplate]:
    'Tipo de buffer inválido. Esperado Buffer, obtenido: {TYPE}',
  [BrightChainStrings.Error_Checksum_MismatchTemplate]:
    'Incompatibilidad de suma de verificación: esperado {EXPECTED}, obtenido {CHECKSUM}',
  [BrightChainStrings.Error_BlockSize_InvalidTemplate]:
    'Tamaño de bloque inválido: {BLOCK_SIZE}',
  [BrightChainStrings.Error_Credentials_Invalid]: 'Credenciales inválidas.',

  // Isolated Key Errors
  [BrightChainStrings.Error_IsolatedKeyError_InvalidPublicKey]:
    'Clave pública inválida: debe ser una clave aislada',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyId]:
    'Violación de aislamiento de clave: ID de clave inválido',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyFormat]:
    'Formato de clave inválido',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyLength]:
    'Longitud de clave inválida',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyType]:
    'Tipo de clave inválido',
  [BrightChainStrings.Error_IsolatedKeyError_KeyIsolationViolation]:
    'Violación de aislamiento de clave: textos cifrados de diferentes instancias de clave',

  // Block Service Errors
  [BrightChainStrings.Error_BlockServiceError_BlockWhitenerCountMismatch]:
    'El número de bloques y blanqueadores debe ser el mismo',
  [BrightChainStrings.Error_BlockServiceError_EmptyBlocksArray]:
    'El arreglo de bloques no debe estar vacío',
  [BrightChainStrings.Error_BlockServiceError_BlockSizeMismatch]:
    'Todos los bloques deben tener el mismo tamaño de bloque',
  [BrightChainStrings.Error_BlockServiceError_NoWhitenersProvided]:
    'No se proporcionaron blanqueadores',
  [BrightChainStrings.Error_BlockServiceError_AlreadyInitialized]:
    'El subsistema BlockService ya está inicializado',
  [BrightChainStrings.Error_BlockServiceError_Uninitialized]:
    'El subsistema BlockService no está inicializado',
  [BrightChainStrings.Error_BlockServiceError_BlockAlreadyExistsTemplate]:
    'El bloque ya existe: {ID}',
  [BrightChainStrings.Error_BlockServiceError_RecipientRequiredForEncryption]:
    'Se requiere un destinatario para el cifrado',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileLength]:
    'No se puede determinar la longitud del archivo',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineBlockSize]:
    'No se puede determinar el tamaño del bloque',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileName]:
    'No se puede determinar el nombre del archivo',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineMimeType]:
    'No se puede determinar el tipo MIME',
  [BrightChainStrings.Error_BlockServiceError_FilePathNotProvided]:
    'No se proporcionó la ruta del archivo',
  [BrightChainStrings.Error_BlockServiceError_UnableToDetermineBlockSize]:
    'No se puede determinar el tamaño del bloque',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockData]:
    'Datos de bloque inválidos',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockType]:
    'Tipo de bloque inválido',

  // BrightTrust Errors
  [BrightChainStrings.Error_BrightTrustError_InvalidBrightTrustId]:
    'ID de quórum inválido',
  [BrightChainStrings.Error_BrightTrustError_DocumentNotFound]:
    'Documento no encontrado',
  [BrightChainStrings.Error_BrightTrustError_UnableToRestoreDocument]:
    'No se puede restaurar el documento',
  [BrightChainStrings.Error_BrightTrustError_NotImplemented]: 'No implementado',
  [BrightChainStrings.Error_BrightTrustError_Uninitialized]:
    'El subsistema de quórum no está inicializado',
  [BrightChainStrings.Error_BrightTrustError_MemberNotFound]:
    'Miembro no encontrado',
  [BrightChainStrings.Error_BrightTrustError_NotEnoughMembers]:
    'No hay suficientes miembros para la operación de quórum',
  [BrightChainStrings.Error_BrightTrustError_TransitionInProgress]:
    'Operación bloqueada: ceremonia de transición en curso',
  [BrightChainStrings.Error_BrightTrustError_InvalidModeTransition]:
    'Transición de modo operativo inválida',
  [BrightChainStrings.Error_BrightTrustError_InsufficientMembersForTransition]:
    'Miembros insuficientes para iniciar la ceremonia de transición',
  [BrightChainStrings.Error_BrightTrustError_MemberAlreadyExists]:
    'El miembro ya existe en el quórum',
  [BrightChainStrings.Error_BrightTrustError_InsufficientRemainingMembers]:
    'No se puede eliminar miembro: los miembros restantes estarían por debajo del umbral',
  [BrightChainStrings.Error_BrightTrustError_MemberBanned]:
    'El miembro está prohibido en la red',
  [BrightChainStrings.Error_BrightTrustError_MemberSuspended]:
    'El miembro está suspendido en la red',
  [BrightChainStrings.Error_BrightTrustError_DuplicateProposal]:
    'ID de propuesta duplicado',
  [BrightChainStrings.Error_BrightTrustError_ProposalExpired]:
    'La propuesta ha expirado',
  [BrightChainStrings.Error_BrightTrustError_DuplicateVote]:
    'Voto duplicado de este miembro',
  [BrightChainStrings.Error_BrightTrustError_VoterNotOnProposal]:
    'El votante no es un miembro activo en esta propuesta',
  [BrightChainStrings.Error_BrightTrustError_AuthenticationFailed]:
    'Autenticación fallida',
  [BrightChainStrings.Error_BrightTrustError_VotingLocked]:
    'La votación está bloqueada debido a fallos de autenticación repetidos',
  [BrightChainStrings.Error_BrightTrustError_MissingAttachment]:
    'La propuesta requiere un adjunto pero no se proporcionó ninguno',
  [BrightChainStrings.Error_BrightTrustError_AttachmentNotRetrievable]:
    'El CBL del adjunto referenciado no es recuperable',
  [BrightChainStrings.Error_BrightTrustError_RedistributionFailed]:
    'La redistribución de participaciones falló',
  [BrightChainStrings.Error_BrightTrustError_InsufficientSharesForReconstruction]:
    'Participaciones insuficientes para la reconstrucción de la clave',
  [BrightChainStrings.Error_BrightTrustError_KeyReconstructionValidationFailed]:
    'La clave reconstruida falló la validación',
  [BrightChainStrings.Error_BrightTrustError_IdentityPermanentlyUnrecoverable]:
    'La identidad es permanentemente irrecuperable debido al vencimiento del plazo de prescripción',
  [BrightChainStrings.Error_BrightTrustError_InvalidMembershipProof]:
    'Prueba de membresía inválida',
  [BrightChainStrings.Error_BrightTrustError_MissingMembershipProof]:
    'Falta prueba de membresía para contenido anónimo',
  [BrightChainStrings.Error_BrightTrustError_AliasAlreadyTaken]:
    'El alias ya está registrado',
  [BrightChainStrings.Error_BrightTrustError_AliasNotFound]:
    'Alias no encontrado',
  [BrightChainStrings.Error_BrightTrustError_AliasInactive]:
    'El alias ha sido desactivado',
  [BrightChainStrings.Error_BrightTrustError_IdentitySealingFailed]:
    'El proceso de sellado de identidad falló',
  [BrightChainStrings.Error_BrightTrustError_ShardVerificationFailed]:
    'La verificación de fragmentos de identidad falló',
  [BrightChainStrings.Error_BrightTrustError_BrightTrustDatabaseUnavailable]:
    'La base de datos del quórum no está disponible',
  [BrightChainStrings.Error_BrightTrustError_TransactionFailed]:
    'La transacción de base de datos falló',
  [BrightChainStrings.Error_BrightTrustError_AuditChainCorrupted]:
    'La integridad de la cadena de auditoría está comprometida',
  // BrightTrust Ban Mechanism Errors
  [BrightChainStrings.Error_BrightTrustError_CannotBanSelf]:
    'Un miembro no puede proponer prohibirse a sí mismo',
  [BrightChainStrings.Error_BrightTrustError_MemberAlreadyBanned]:
    'El miembro ya está prohibido',
  [BrightChainStrings.Error_BrightTrustError_MemberNotBanned]:
    'El miembro no está actualmente prohibido',
  [BrightChainStrings.Error_BrightTrustError_NewMemberCannotProposeBan]:
    'Los miembros admitidos en la época actual no pueden proponer prohibiciones',
  [BrightChainStrings.Error_BrightTrustError_BanCoolingPeriodNotElapsed]:
    'El período de enfriamiento de la prohibición aún no ha transcurrido',
  [BrightChainStrings.Error_BrightTrustError_InvalidBanRecordSignatures]:
    'El registro de prohibición no tiene suficientes firmas válidas del quórum',
  [BrightChainStrings.Error_IdentityValidationError_InvalidSignature]:
    'La firma del contenido no coincide con la identidad declarada',
  [BrightChainStrings.Error_IdentityValidationError_UnregisteredAlias]:
    'El alias no está registrado',
  [BrightChainStrings.Error_IdentityValidationError_InactiveAlias]:
    'El alias está inactivo',
  [BrightChainStrings.Error_IdentityValidationError_InvalidMembershipProof]:
    'Prueba de membresía inválida',
  [BrightChainStrings.Error_IdentityValidationError_MissingMembershipProof]:
    'Falta prueba de membresía para contenido anónimo',
  [BrightChainStrings.Error_IdentityValidationError_BannedUser]:
    'El creador del contenido está prohibido',
  [BrightChainStrings.Error_IdentityValidationError_SuspendedUser]:
    'El creador del contenido está suspendido',
  [BrightChainStrings.Error_IdentityValidationError_ShardVerificationFailed]:
    'La verificación de fragmentos de identidad falló',

  // System Keyring Errors
  [BrightChainStrings.Error_SystemKeyringError_KeyNotFoundTemplate]:
    'Clave {KEY} no encontrada',
  [BrightChainStrings.Error_SystemKeyringError_RateLimitExceeded]:
    'Límite de tasa excedido',

  // FEC Errors
  [BrightChainStrings.Error_FecError_InputBlockRequired]:
    'Se requiere el bloque de entrada',
  [BrightChainStrings.Error_FecError_DamagedBlockRequired]:
    'Se requiere el bloque dañado',
  [BrightChainStrings.Error_FecError_ParityBlocksRequired]:
    'Se requieren los bloques de paridad',
  [BrightChainStrings.Error_FecError_InvalidParityBlockSizeTemplate]:
    'Tamaño de bloque de paridad inválido: esperado {EXPECTED_SIZE}, obtenido {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InvalidRecoveredBlockSizeTemplate]:
    'Tamaño de bloque recuperado inválido: esperado {EXPECTED_SIZE}, obtenido {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InputDataMustBeBuffer]:
    'Los datos de entrada deben ser un Buffer',
  [BrightChainStrings.Error_FecError_BlockSizeMismatch]:
    'Los tamaños de bloque deben coincidir',
  [BrightChainStrings.Error_FecError_DamagedBlockDataMustBeBuffer]:
    'Los datos del bloque dañado deben ser un Buffer',
  [BrightChainStrings.Error_FecError_ParityBlockDataMustBeBuffer]:
    'Los datos del bloque de paridad deben ser un Buffer',

  // ECIES Errors
  [BrightChainStrings.Error_EciesError_InvalidBlockType]:
    'Tipo de bloque inválido para operación ECIES',

  // Voting Derivation Errors
  [BrightChainStrings.Error_VotingDerivationError_FailedToGeneratePrime]:
    'No se pudo generar el número primo después del número máximo de intentos',
  [BrightChainStrings.Error_VotingDerivationError_IdenticalPrimes]:
    'Se generaron primos idénticos',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairTooSmallTemplate]:
    'El par de claves generado es demasiado pequeño: {ACTUAL_BITS} bits < {REQUIRED_BITS} bits',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairValidationFailed]:
    'La validación del par de claves falló',
  [BrightChainStrings.Error_VotingDerivationError_ModularInverseDoesNotExist]:
    'El inverso multiplicativo modular no existe',
  [BrightChainStrings.Error_VotingDerivationError_PrivateKeyMustBeBuffer]:
    'La clave privada debe ser un Buffer',
  [BrightChainStrings.Error_VotingDerivationError_PublicKeyMustBeBuffer]:
    'La clave pública debe ser un Buffer',
  [BrightChainStrings.Error_VotingDerivationError_InvalidPublicKeyFormat]:
    'Formato de clave pública inválido',
  [BrightChainStrings.Error_VotingDerivationError_InvalidEcdhKeyPair]:
    'Par de claves ECDH inválido',
  [BrightChainStrings.Error_VotingDerivationError_FailedToDeriveVotingKeysTemplate]:
    'No se pudieron derivar las claves de votación: {ERROR}',

  // Voting Errors
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPublicKeyNotIsolated]:
    'Par de claves inválido: la clave pública debe estar aislada',
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPrivateKeyNotIsolated]:
    'Par de claves inválido: la clave privada debe estar aislada',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyNotIsolated]:
    'Clave pública inválida: debe ser una clave aislada',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferTooShort]:
    'Buffer de clave pública inválido: demasiado corto',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferWrongMagic]:
    'Buffer de clave pública inválido: magic incorrecto',
  [BrightChainStrings.Error_VotingError_UnsupportedPublicKeyVersion]:
    'Versión de clave pública no soportada',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferIncompleteN]:
    'Buffer de clave pública inválido: valor n incompleto',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferFailedToParseNTemplate]:
    'Buffer de clave pública inválido: no se pudo analizar n: {ERROR}',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyIdMismatch]:
    'Clave pública inválida: incompatibilidad de ID de clave',
  [BrightChainStrings.Error_VotingError_ModularInverseDoesNotExist]:
    'El inverso multiplicativo modular no existe',
  [BrightChainStrings.Error_VotingError_PrivateKeyMustBeBuffer]:
    'La clave privada debe ser un Buffer',
  [BrightChainStrings.Error_VotingError_PublicKeyMustBeBuffer]:
    'La clave pública debe ser un Buffer',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyFormat]:
    'Formato de clave pública inválido',
  [BrightChainStrings.Error_VotingError_InvalidEcdhKeyPair]:
    'Par de claves ECDH inválido',
  [BrightChainStrings.Error_VotingError_FailedToDeriveVotingKeysTemplate]:
    'No se pudieron derivar las claves de votación: {ERROR}',
  [BrightChainStrings.Error_VotingError_FailedToGeneratePrime]:
    'No se pudo generar el número primo después del número máximo de intentos',
  [BrightChainStrings.Error_VotingError_IdenticalPrimes]:
    'Se generaron primos idénticos',
  [BrightChainStrings.Error_VotingError_KeyPairTooSmallTemplate]:
    'El par de claves generado es demasiado pequeño: {ACTUAL_BITS} bits < {REQUIRED_BITS} bits',
  [BrightChainStrings.Error_VotingError_KeyPairValidationFailed]:
    'La validación del par de claves falló',
  [BrightChainStrings.Error_VotingError_InvalidVotingKey]:
    'Clave de votación inválida',
  [BrightChainStrings.Error_VotingError_InvalidKeyPair]:
    'Par de claves inválido',
  [BrightChainStrings.Error_VotingError_InvalidPublicKey]:
    'Clave pública inválida',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKey]:
    'Clave privada inválida',
  [BrightChainStrings.Error_VotingError_InvalidEncryptedKey]:
    'Clave cifrada inválida',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferTooShort]:
    'Buffer de clave privada inválido: demasiado corto',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferWrongMagic]:
    'Buffer de clave privada inválido: magic incorrecto',
  [BrightChainStrings.Error_VotingError_UnsupportedPrivateKeyVersion]:
    'Versión de clave privada no soportada',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteLambda]:
    'Buffer de clave privada inválido: lambda incompleto',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMuLength]:
    'Buffer de clave privada inválido: longitud de mu incompleta',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMu]:
    'Buffer de clave privada inválido: mu incompleto',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToParse]:
    'Buffer de clave privada inválido: no se pudo analizar',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToCreate]:
    'Buffer de clave privada inválido: no se pudo crear',

  // Store Errors
  [BrightChainStrings.Error_StoreError_InvalidBlockMetadataTemplate]:
    'Metadatos de bloque inválidos: {ERROR}',
  [BrightChainStrings.Error_StoreError_KeyNotFoundTemplate]:
    'Clave no encontrada: {KEY}',
  [BrightChainStrings.Error_StoreError_StorePathRequired]:
    'Se requiere la ruta de almacenamiento',
  [BrightChainStrings.Error_StoreError_StorePathNotFound]:
    'Ruta de almacenamiento no encontrada',
  [BrightChainStrings.Error_StoreError_BlockSizeRequired]:
    'Se requiere el tamaño del bloque',
  [BrightChainStrings.Error_StoreError_BlockIdRequired]:
    'Se requiere el ID del bloque',
  [BrightChainStrings.Error_StoreError_InvalidBlockIdTooShort]:
    'ID de bloque inválido: demasiado corto',
  [BrightChainStrings.Error_StoreError_BlockFileSizeMismatch]:
    'Incompatibilidad de tamaño de archivo de bloque',
  [BrightChainStrings.Error_StoreError_BlockValidationFailed]:
    'La validación del bloque falló',
  [BrightChainStrings.Error_StoreError_BlockPathAlreadyExistsTemplate]:
    'La ruta del bloque {PATH} ya existe',
  [BrightChainStrings.Error_StoreError_BlockAlreadyExists]:
    'El bloque ya existe',
  [BrightChainStrings.Error_StoreError_NoBlocksProvided]:
    'No se proporcionaron bloques',
  [BrightChainStrings.Error_StoreError_CannotStoreEphemeralData]:
    'No se pueden almacenar datos estructurados efímeros',
  [BrightChainStrings.Error_StoreError_BlockIdMismatchTemplate]:
    'La clave {KEY} no coincide con el ID del bloque {BLOCK_ID}',
  [BrightChainStrings.Error_StoreError_BlockSizeMismatch]:
    'El tamaño del bloque no coincide con el tamaño del bloque del almacén',
  [BrightChainStrings.Error_StoreError_BlockDirectoryCreationFailedTemplate]:
    'No se pudo crear el directorio de bloques: {ERROR}',
  [BrightChainStrings.Error_StoreError_BlockDeletionFailedTemplate]:
    'No se pudo eliminar el bloque: {ERROR}',
  [BrightChainStrings.Error_StoreError_NotImplemented]:
    'Operación no implementada',
  [BrightChainStrings.Error_StoreError_InsufficientRandomBlocksTemplate]:
    'Bloques aleatorios insuficientes disponibles: solicitados {REQUESTED}, disponibles {AVAILABLE}',
  [BrightChainStrings.Error_StoreError_FactoryNotRegistered]:
    'Fábrica de almacén de bloques no registrada para el tipo de almacén solicitado',
  [BrightChainStrings.Error_StoreError_CloudOperationFailedTemplate]:
    'La operación de almacenamiento en la nube {OPERATION} falló para el bloque {BLOCK_CHECKSUM}: {ORIGINAL_ERROR}',
  [BrightChainStrings.Error_StoreError_CloudAuthenticationFailedTemplate]:
    'La autenticación de almacenamiento en la nube falló para la operación {OPERATION}: {ORIGINAL_ERROR}',

  // Sealing Errors
  [BrightChainStrings.Error_SealingError_MissingPrivateKeys]:
    'No todos los miembros tienen sus claves privadas cargadas',
  [BrightChainStrings.Error_SealingError_MemberNotFound]:
    'Miembro no encontrado',
  [BrightChainStrings.Error_SealingError_TooManyMembersToUnlock]:
    'Demasiados miembros para desbloquear el documento',
  [BrightChainStrings.Error_SealingError_NotEnoughMembersToUnlock]:
    'No hay suficientes miembros para desbloquear el documento',
  [BrightChainStrings.Error_SealingError_EncryptedShareNotFound]:
    'Parte cifrada no encontrada',
  [BrightChainStrings.Error_SealingError_InvalidBitRange]:
    'Los bits deben estar entre 3 y 20',
  [BrightChainStrings.Error_SealingError_InvalidMemberArray]:
    'amongstMembers debe ser un arreglo de Member',
  [BrightChainStrings.Error_SealingError_FailedToSealTemplate]:
    'No se pudo sellar el documento: {ERROR}',
  [BrightChainStrings.Error_SealingError_InsufficientSharesForReconstruction]:
    'Partes insuficientes para la reconstrucción de la clave',
  [BrightChainStrings.Error_SealingError_KeyReconstructionFailed]:
    'La reconstrucción de la clave falló',

  // CBL Errors
  [BrightChainStrings.Error_CblError_BlockNotReadable]:
    'El bloque no se puede leer',
  [BrightChainStrings.Error_CblError_CblRequired]: 'Se requiere CBL',
  [BrightChainStrings.Error_CblError_WhitenedBlockFunctionRequired]:
    'Se requiere la función getWhitenedBlock',
  [BrightChainStrings.Error_CblError_FailedToLoadBlock]:
    'No se pudo cargar el bloque',
  [BrightChainStrings.Error_CblError_ExpectedEncryptedDataBlock]:
    'Se esperaba un bloque de datos cifrado',
  [BrightChainStrings.Error_CblError_ExpectedOwnedDataBlock]:
    'Se esperaba un bloque de datos propio',
  [BrightChainStrings.Error_CblError_InvalidStructure]:
    'Estructura CBL inválida',
  [BrightChainStrings.Error_CblError_CreatorUndefined]:
    'El creador no puede ser undefined',
  [BrightChainStrings.Error_CblError_CreatorRequiredForSignature]:
    'Se requiere el creador para la validación de firma',
  [BrightChainStrings.Error_CblError_InvalidCreatorId]:
    'ID de creador inválido',
  [BrightChainStrings.Error_CblError_FileNameRequired]:
    'Se requiere el nombre del archivo',
  [BrightChainStrings.Error_CblError_FileNameEmpty]:
    'El nombre del archivo no puede estar vacío',
  [BrightChainStrings.Error_CblError_FileNameWhitespace]:
    'El nombre del archivo no puede comenzar ni terminar con espacios',
  [BrightChainStrings.Error_CblError_FileNameInvalidChar]:
    'El nombre del archivo contiene un carácter inválido',
  [BrightChainStrings.Error_CblError_FileNameControlChars]:
    'El nombre del archivo contiene caracteres de control',
  [BrightChainStrings.Error_CblError_FileNamePathTraversal]:
    'El nombre del archivo no puede contener traversal de ruta',
  [BrightChainStrings.Error_CblError_MimeTypeRequired]:
    'Se requiere el tipo MIME',
  [BrightChainStrings.Error_CblError_MimeTypeEmpty]:
    'El tipo MIME no puede estar vacío',
  [BrightChainStrings.Error_CblError_MimeTypeWhitespace]:
    'El tipo MIME no puede comenzar ni terminar con espacios',
  [BrightChainStrings.Error_CblError_MimeTypeLowercase]:
    'El tipo MIME debe estar en minúsculas',
  [BrightChainStrings.Error_CblError_MimeTypeInvalidFormat]:
    'Formato de tipo MIME inválido',
  [BrightChainStrings.Error_CblError_InvalidBlockSize]:
    'Tamaño de bloque inválido',
  [BrightChainStrings.Error_CblError_MetadataSizeExceeded]:
    'El tamaño de los metadatos excede el tamaño máximo permitido',
  [BrightChainStrings.Error_CblError_MetadataSizeNegative]:
    'El tamaño total de los metadatos no puede ser negativo',
  [BrightChainStrings.Error_CblError_InvalidMetadataBuffer]:
    'Buffer de metadatos inválido',
  [BrightChainStrings.Error_CblError_CreationFailedTemplate]:
    'No se pudo crear el bloque CBL: {ERROR}',
  [BrightChainStrings.Error_CblError_InsufficientCapacityTemplate]:
    'El tamaño del bloque ({BLOCK_SIZE}) es demasiado pequeño para contener los datos CBL ({DATA_SIZE})',
  [BrightChainStrings.Error_CblError_NotExtendedCbl]: 'No es un CBL extendido',
  [BrightChainStrings.Error_CblError_InvalidSignature]: 'Firma CBL inválida',
  [BrightChainStrings.Error_CblError_CreatorIdMismatch]:
    'Incompatibilidad de ID del creador',
  [BrightChainStrings.Error_CblError_FileSizeTooLarge]:
    'Tamaño de archivo demasiado grande',
  [BrightChainStrings.Error_CblError_FileSizeTooLargeForNode]:
    'Tamaño de archivo superior al máximo permitido para el nodo actual',
  [BrightChainStrings.Error_CblError_InvalidTupleSize]:
    'Tamaño de tupla inválido',
  [BrightChainStrings.Error_CblError_FileNameTooLong]:
    'Nombre de archivo demasiado largo',
  [BrightChainStrings.Error_CblError_MimeTypeTooLong]:
    'Tipo MIME demasiado largo',
  [BrightChainStrings.Error_CblError_AddressCountExceedsCapacity]:
    'El número de direcciones excede la capacidad del bloque',
  [BrightChainStrings.Error_CblError_CblEncrypted]:
    'CBL está cifrado. Descifre antes de usar.',
  [BrightChainStrings.Error_CblError_UserRequiredForDecryption]:
    'Se requiere el usuario para el descifrado',
  [BrightChainStrings.Error_CblError_NotASuperCbl]: 'No es un super CBL',
  [BrightChainStrings.Error_CblError_FailedToExtractCreatorId]:
    'No se pudieron extraer los bytes de ID del creador del encabezado CBL',
  [BrightChainStrings.Error_CblError_FailedToExtractProvidedCreatorId]:
    'No se pudieron extraer los bytes de ID del miembro del creador proporcionado',
  [BrightChainStrings.Error_CblError_PoolIntegrityError]:
    'Error de integridad del pool CBL: uno o más bloques referenciados no se encuentran en el pool esperado',

  // Multi-Encrypted Errors
  [BrightChainStrings.Error_MultiEncryptedError_InvalidEphemeralPublicKeyLength]:
    'Longitud de clave pública efímera inválida',
  [BrightChainStrings.Error_MultiEncryptedError_DataLengthExceedsCapacity]:
    'La longitud de los datos excede la capacidad del bloque',
  [BrightChainStrings.Error_MultiEncryptedError_BlockNotReadable]:
    'El bloque no se puede leer',
  [BrightChainStrings.Error_MultiEncryptedError_DataTooShort]:
    'Datos demasiado cortos para contener el encabezado de cifrado',
  [BrightChainStrings.Error_MultiEncryptedError_CreatorMustBeMember]:
    'El creador debe ser un Member',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidIVLength]:
    'Longitud de IV inválida',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidAuthTagLength]:
    'Longitud de etiqueta de autenticación inválida',
  [BrightChainStrings.Error_MultiEncryptedError_ChecksumMismatch]:
    'Incompatibilidad de suma de verificación',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientMismatch]:
    'La lista de destinatarios no coincide con el número de destinatarios del encabezado',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientsAlreadyLoaded]:
    'Los destinatarios ya están cargados',

  // Block Errors
  [BrightChainStrings.Error_BlockError_CreatorRequired]:
    'Se requiere el creador',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsCapacity]:
    'La longitud de los datos excede la capacidad del bloque',
  [BrightChainStrings.Error_BlockError_DataRequired]: 'Se requieren los datos',
  [BrightChainStrings.Error_BlockError_ActualDataLengthExceedsDataLength]:
    'La longitud real de los datos no puede exceder la longitud de los datos',
  [BrightChainStrings.Error_BlockError_ActualDataLengthNegative]:
    'La longitud real de los datos debe ser positiva',
  [BrightChainStrings.Error_BlockError_CreatorRequiredForEncryption]:
    'Se requiere el creador para el cifrado',
  [BrightChainStrings.Error_BlockError_UnexpectedEncryptedBlockType]:
    'Tipo de bloque cifrado inesperado',
  [BrightChainStrings.Error_BlockError_CannotEncrypt]:
    'El bloque no se puede cifrar',
  [BrightChainStrings.Error_BlockError_CannotDecrypt]:
    'El bloque no se puede descifrar',
  [BrightChainStrings.Error_BlockError_CreatorPrivateKeyRequired]:
    'Se requiere la clave privada del creador',
  [BrightChainStrings.Error_BlockError_InvalidMultiEncryptionRecipientCount]:
    'Número de destinatarios de multi-cifrado inválido',
  [BrightChainStrings.Error_BlockError_InvalidNewBlockType]:
    'Nuevo tipo de bloque inválido',
  [BrightChainStrings.Error_BlockError_UnexpectedEphemeralBlockType]:
    'Tipo de bloque efímero inesperado',
  [BrightChainStrings.Error_BlockError_RecipientRequired]:
    'Se requiere el destinatario',
  [BrightChainStrings.Error_BlockError_RecipientKeyRequired]:
    'Se requiere la clave privada del destinatario',
  [BrightChainStrings.Error_BlockError_DataLengthMustMatchBlockSize]:
    'La longitud de los datos debe coincidir con el tamaño del bloque',

  // Whitened Errors
  [BrightChainStrings.Error_WhitenedError_BlockNotReadable]:
    'El bloque no se puede leer',
  [BrightChainStrings.Error_WhitenedError_BlockSizeMismatch]:
    'Los tamaños de bloque deben coincidir',
  [BrightChainStrings.Error_WhitenedError_DataLengthMismatch]:
    'Las longitudes de datos y datos aleatorios deben coincidir',
  [BrightChainStrings.Error_WhitenedError_InvalidBlockSize]:
    'Tamaño de bloque inválido',

  // Tuple Errors
  [BrightChainStrings.Error_TupleError_InvalidTupleSize]:
    'Tamaño de tupla inválido',
  [BrightChainStrings.Error_TupleError_BlockSizeMismatch]:
    'Todos los bloques de la tupla deben tener el mismo tamaño',
  [BrightChainStrings.Error_TupleError_NoBlocksToXor]:
    'No hay bloques para XOR',
  [BrightChainStrings.Error_TupleError_InvalidBlockCount]:
    'Número de bloques inválido para la tupla',
  [BrightChainStrings.Error_TupleError_InvalidBlockType]:
    'Tipo de bloque inválido',
  [BrightChainStrings.Error_TupleError_InvalidSourceLength]:
    'La longitud de la fuente debe ser positiva',
  [BrightChainStrings.Error_TupleError_RandomBlockGenerationFailed]:
    'No se pudo generar el bloque aleatorio',
  [BrightChainStrings.Error_TupleError_WhiteningBlockGenerationFailed]:
    'No se pudo generar el bloque de blanqueo',
  [BrightChainStrings.Error_TupleError_MissingParameters]:
    'Se requieren todos los parámetros',
  [BrightChainStrings.Error_TupleError_XorOperationFailedTemplate]:
    'No se pudo hacer XOR de los bloques: {ERROR}',
  [BrightChainStrings.Error_TupleError_DataStreamProcessingFailedTemplate]:
    'No se pudo procesar el flujo de datos: {ERROR}',
  [BrightChainStrings.Error_TupleError_EncryptedDataStreamProcessingFailedTemplate]:
    'No se pudo procesar el flujo de datos cifrado: {ERROR}',
  [BrightChainStrings.Error_TupleError_PoolBoundaryViolationTemplate]:
    'Violación de límite de pool: {BLOCK_TYPE} pertenece al pool "{ACTUAL_POOL}" pero la tupla requiere el pool "{EXPECTED_POOL}"',

  // Memory Tuple Errors
  [BrightChainStrings.Error_MemoryTupleError_InvalidTupleSizeTemplate]:
    'La tupla debe tener {TUPLE_SIZE} bloques',
  [BrightChainStrings.Error_MemoryTupleError_BlockSizeMismatch]:
    'Todos los bloques de la tupla deben tener el mismo tamaño',
  [BrightChainStrings.Error_MemoryTupleError_NoBlocksToXor]:
    'No hay bloques para XOR',
  [BrightChainStrings.Error_MemoryTupleError_InvalidBlockCount]:
    'Número de bloques inválido para la tupla',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlockIdsTemplate]:
    'Se esperaban {TUPLE_SIZE} IDs de bloque',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlocksTemplate]:
    'Se esperaban {TUPLE_SIZE} bloques',

  // Handle Tuple Errors
  [BrightChainStrings.Error_HandleTupleError_InvalidTupleSizeTemplate]:
    'Tamaño de tupla inválido ({TUPLE_SIZE})',
  [BrightChainStrings.Error_HandleTupleError_BlockSizeMismatch]:
    'Todos los bloques de la tupla deben tener el mismo tamaño',
  [BrightChainStrings.Error_HandleTupleError_NoBlocksToXor]:
    'No hay bloques para XOR',
  [BrightChainStrings.Error_HandleTupleError_BlockSizesMustMatch]:
    'Los tamaños de bloque deben coincidir',
  [BrightChainStrings.Error_HandleTupleError_PoolMismatchTemplate]:
    'Incompatibilidad de pool: el bloque {BLOCK_ID} pertenece al pool "{ACTUAL_POOL}" pero la tupla requiere el pool "{EXPECTED_POOL}"',

  // Stream Errors
  [BrightChainStrings.Error_StreamError_BlockSizeRequired]:
    'Se requiere el tamaño del bloque',
  [BrightChainStrings.Error_StreamError_WhitenedBlockSourceRequired]:
    'Se requiere la fuente de bloque blanqueado',
  [BrightChainStrings.Error_StreamError_RandomBlockSourceRequired]:
    'Se requiere la fuente de bloque aleatorio',
  [BrightChainStrings.Error_StreamError_InputMustBeBuffer]:
    'La entrada debe ser un buffer',
  [BrightChainStrings.Error_StreamError_FailedToGetRandomBlock]:
    'No se pudo obtener el bloque aleatorio',
  [BrightChainStrings.Error_StreamError_FailedToGetWhiteningBlock]:
    'No se pudo obtener el bloque de blanqueo/aleatorio',
  [BrightChainStrings.Error_StreamError_IncompleteEncryptedBlock]:
    'Bloque cifrado incompleto',

  // Member Errors
  [BrightChainStrings.Error_MemberError_InsufficientRandomBlocks]:
    'Bloques aleatorios insuficientes.',
  [BrightChainStrings.Error_MemberError_FailedToCreateMemberBlocks]:
    'No se pudieron crear los bloques de miembro.',
  [BrightChainStrings.Error_MemberError_InvalidMemberBlocks]:
    'Bloques de miembro inválidos.',
  [BrightChainStrings.Error_MemberError_PrivateKeyRequiredToDeriveVotingKeyPair]:
    'Se requiere la clave privada para derivar el par de claves de votación.',

  // General Errors
  [BrightChainStrings.Error_Hydration_FailedToHydrateTemplate]:
    'No se pudo hidratar: {ERROR}',
  [BrightChainStrings.Error_Serialization_FailedToSerializeTemplate]:
    'No se pudo serializar: {ERROR}',
  [BrightChainStrings.Error_Checksum_Invalid]: 'Suma de verificación inválida.',
  [BrightChainStrings.Error_Creator_Invalid]: 'Creador inválido.',
  [BrightChainStrings.Error_ID_InvalidFormat]: 'Formato de ID inválido.',
  [BrightChainStrings.Error_TupleCount_InvalidTemplate]:
    'Número de tuplas inválido ({TUPLE_COUNT}), debe estar entre {TUPLE_MIN_SIZE} y {TUPLE_MAX_SIZE}',
  [BrightChainStrings.Error_References_Invalid]: 'Referencias inválidas.',
  [BrightChainStrings.Error_SessionID_Invalid]: 'ID de sesión inválido.',
  [BrightChainStrings.Error_Signature_Invalid]: 'Firma inválida.',
  [BrightChainStrings.Error_Metadata_Mismatch]:
    'Incompatibilidad de metadatos.',
  [BrightChainStrings.Error_Token_Expired]: 'Token expirado.',
  [BrightChainStrings.Error_Token_Invalid]: 'Token inválido.',
  [BrightChainStrings.Error_Unexpected_Error]: 'Ocurrió un error inesperado.',
  [BrightChainStrings.Error_User_NotFound]: 'Usuario no encontrado.',
  [BrightChainStrings.Error_Validation_Error]: 'Error de validación.',
  [BrightChainStrings.Error_Capacity_Insufficient]: 'Capacidad insuficiente.',
  [BrightChainStrings.Error_Implementation_NotImplemented]: 'No implementado.',

  // Block Sizes
  [BrightChainStrings.BlockSize_Unknown]: 'Desconocido',
  [BrightChainStrings.BlockSize_Message]: 'Mensaje',
  [BrightChainStrings.BlockSize_Tiny]: 'Diminuto',
  [BrightChainStrings.BlockSize_Small]: 'Pequeño',
  [BrightChainStrings.BlockSize_Medium]: 'Mediano',
  [BrightChainStrings.BlockSize_Large]: 'Grande',
  [BrightChainStrings.BlockSize_Huge]: 'Enorme',

  // Document Errors
  [BrightChainStrings.Error_DocumentError_InvalidValueTemplate]:
    'Valor inválido para {KEY}',
  [BrightChainStrings.Error_DocumentError_FieldRequiredTemplate]:
    'El campo {KEY} es requerido.',
  [BrightChainStrings.Error_DocumentError_AlreadyInitialized]:
    'El subsistema de documentos ya está inicializado',
  [BrightChainStrings.Error_DocumentError_Uninitialized]:
    'El subsistema de documentos no está inicializado',

  // XOR Service Errors
  [BrightChainStrings.Error_Xor_LengthMismatchTemplate]:
    'XOR requiere matrices de igual longitud: a.length={A_LENGTH}, b.length={B_LENGTH}',
  [BrightChainStrings.Error_Xor_NoArraysProvided]:
    'Se debe proporcionar al menos una matriz para XOR',
  [BrightChainStrings.Error_Xor_ArrayLengthMismatchTemplate]:
    'Todas las matrices deben tener la misma longitud. Esperado: {EXPECTED_LENGTH}, obtenido: {ACTUAL_LENGTH} en el índice {INDEX}',
  [BrightChainStrings.Error_Xor_CryptoApiNotAvailable]:
    'La API Crypto no está disponible en este entorno',

  // Tuple Storage Service Errors
  [BrightChainStrings.Error_TupleStorage_DataExceedsBlockSizeTemplate]:
    'El tamaño de los datos ({DATA_SIZE}) excede el tamaño del bloque ({BLOCK_SIZE})',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetProtocol]:
    'Protocolo magnet inválido. Se esperaba "magnet:"',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetType]:
    'Tipo de magnet inválido. Se esperaba "brightchain"',
  [BrightChainStrings.Error_TupleStorage_MissingMagnetParameters]:
    'Faltan parámetros magnet requeridos',

  // Location Record Errors
  [BrightChainStrings.Error_LocationRecord_NodeIdRequired]:
    'Se requiere el identificador del nodo',
  [BrightChainStrings.Error_LocationRecord_LastSeenRequired]:
    'Se requiere la marca de tiempo de última vista',
  [BrightChainStrings.Error_LocationRecord_IsAuthoritativeRequired]:
    'Se requiere la bandera isAuthoritative',
  [BrightChainStrings.Error_LocationRecord_InvalidLastSeenDate]:
    'Fecha de última vista inválida',
  [BrightChainStrings.Error_LocationRecord_InvalidLatencyMs]:
    'La latencia debe ser un número no negativo',
  [BrightChainStrings.Error_LocationRecord_InvalidPoolId]:
    'Formato de ID de pool inválido',

  // Metadata Errors
  [BrightChainStrings.Error_Metadata_BlockIdRequired]:
    'Se requiere el identificador del bloque',
  [BrightChainStrings.Error_Metadata_CreatedAtRequired]:
    'Se requiere la marca de tiempo de creación',
  [BrightChainStrings.Error_Metadata_LastAccessedAtRequired]:
    'Se requiere la marca de tiempo del último acceso',
  [BrightChainStrings.Error_Metadata_LocationUpdatedAtRequired]:
    'Se requiere la marca de tiempo de actualización de ubicación',
  [BrightChainStrings.Error_Metadata_InvalidCreatedAtDate]:
    'Fecha de creación inválida',
  [BrightChainStrings.Error_Metadata_InvalidLastAccessedAtDate]:
    'Fecha del último acceso inválida',
  [BrightChainStrings.Error_Metadata_InvalidLocationUpdatedAtDate]:
    'Fecha de actualización de ubicación inválida',
  [BrightChainStrings.Error_Metadata_InvalidExpiresAtDate]:
    'Fecha de expiración inválida',
  [BrightChainStrings.Error_Metadata_InvalidAvailabilityStateTemplate]:
    'Estado de disponibilidad inválido: {STATE}',
  [BrightChainStrings.Error_Metadata_LocationRecordsMustBeArray]:
    'Los registros de ubicación deben ser una matriz',
  [BrightChainStrings.Error_Metadata_InvalidLocationRecordTemplate]:
    'Registro de ubicación inválido en el índice {INDEX}',
  [BrightChainStrings.Error_Metadata_InvalidAccessCount]:
    'El recuento de accesos debe ser un número no negativo',
  [BrightChainStrings.Error_Metadata_InvalidTargetReplicationFactor]:
    'El factor de replicación objetivo debe ser un número positivo',
  [BrightChainStrings.Error_Metadata_InvalidSize]:
    'El tamaño debe ser un número no negativo',
  [BrightChainStrings.Error_Metadata_ParityBlockIdsMustBeArray]:
    'Los identificadores de bloques de paridad deben ser una matriz',
  [BrightChainStrings.Error_Metadata_ReplicaNodeIdsMustBeArray]:
    'Los identificadores de nodos de réplica deben ser una matriz',

  // Service Provider Errors
  [BrightChainStrings.Error_ServiceProvider_UseSingletonInstance]:
    'Use ServiceProvider.getInstance() en lugar de crear una nueva instancia',
  [BrightChainStrings.Error_ServiceProvider_NotInitialized]:
    'ServiceProvider no ha sido inicializado',
  [BrightChainStrings.Error_ServiceLocator_NotSet]:
    'ServiceLocator no ha sido establecido',

  // Block Service Errors (additional)
  [BrightChainStrings.Error_BlockService_CannotEncrypt]:
    'No se puede cifrar el bloque',
  [BrightChainStrings.Error_BlockService_BlocksArrayEmpty]:
    'La matriz de bloques no debe estar vacía',
  [BrightChainStrings.Error_BlockService_BlockSizesMustMatch]:
    'Todos los bloques deben tener el mismo tamaño de bloque',

  // Message Router Errors
  [BrightChainStrings.Error_MessageRouter_MessageNotFoundTemplate]:
    'Mensaje no encontrado: {MESSAGE_ID}',

  // Browser Config Errors
  [BrightChainStrings.Error_BrowserConfig_NotImplementedTemplate]:
    'El método {METHOD} no está implementado en el entorno del navegador',

  // Debug Errors
  [BrightChainStrings.Error_Debug_UnsupportedFormat]:
    'Formato no compatible para salida de depuración',

  // Secure Heap Storage Errors
  [BrightChainStrings.Error_SecureHeap_KeyNotFound]:
    'Clave no encontrada en el almacenamiento de pila seguro',

  // I18n Errors
  [BrightChainStrings.Error_I18n_KeyConflictObjectTemplate]:
    'Conflicto de clave detectado: {KEY} ya existe en {OBJECT}',
  [BrightChainStrings.Error_I18n_KeyConflictValueTemplate]:
    'Conflicto de clave detectado: {KEY} tiene un valor conflictivo {VALUE}',
  [BrightChainStrings.Error_I18n_StringsNotFoundTemplate]:
    'Cadenas no encontradas para el idioma: {LANGUAGE}',

  // Document Errors (additional)
  [BrightChainStrings.Error_Document_CreatorRequiredForSaving]:
    'Se requiere el creador para guardar el documento',
  [BrightChainStrings.Error_Document_CreatorRequiredForEncrypting]:
    'Se requiere el creador para cifrar el documento',
  [BrightChainStrings.Error_Document_NoEncryptedData]:
    'No hay datos cifrados disponibles',
  [BrightChainStrings.Error_Document_FieldShouldBeArrayTemplate]:
    'El campo {FIELD} debe ser una matriz',
  [BrightChainStrings.Error_Document_InvalidArrayValueTemplate]:
    'Valor de matriz inválido en el índice {INDEX} en el campo {FIELD}',
  [BrightChainStrings.Error_Document_FieldRequiredTemplate]:
    'El campo {FIELD} es requerido',
  [BrightChainStrings.Error_Document_FieldInvalidTemplate]:
    'El campo {FIELD} es inválido',
  [BrightChainStrings.Error_Document_InvalidValueTemplate]:
    'Valor inválido para el campo {FIELD}',
  [BrightChainStrings.Error_MemberDocument_PublicCblIdNotSet]:
    'El ID de CBL público no ha sido establecido',
  [BrightChainStrings.Error_MemberDocument_PrivateCblIdNotSet]:
    'El ID de CBL privado no ha sido establecido',
  [BrightChainStrings.Error_BaseMemberDocument_PublicCblIdNotSet]:
    'El identificador CBL público del documento de miembro base no se ha establecido',
  [BrightChainStrings.Error_BaseMemberDocument_PrivateCblIdNotSet]:
    'El identificador CBL privado del documento de miembro base no se ha establecido',
  [BrightChainStrings.Error_Document_InvalidValueInArrayTemplate]:
    'Valor no válido en el array para {KEY}',
  [BrightChainStrings.Error_Document_FieldIsRequiredTemplate]:
    'El campo {FIELD} es obligatorio',
  [BrightChainStrings.Error_Document_FieldIsInvalidTemplate]:
    'El campo {FIELD} no es válido',

  // SimpleBrightChain Errors
  [BrightChainStrings.Error_SimpleBrightChain_BlockNotFoundTemplate]:
    'Bloque no encontrado: {BLOCK_ID}',

  // Currency Code Errors
  [BrightChainStrings.Error_CurrencyCode_Invalid]: 'Código de moneda inválido',

  // Console Output Warnings
  [BrightChainStrings.Warning_BufferUtils_InvalidBase64String]:
    'Se proporcionó una cadena base64 inválida',
  [BrightChainStrings.Warning_Keyring_FailedToLoad]:
    'Error al cargar el llavero desde el almacenamiento',
  [BrightChainStrings.Warning_I18n_TranslationFailedTemplate]:
    'Error en la traducción para la clave {KEY}',

  // Console Output Errors
  [BrightChainStrings.Error_MemberStore_RollbackFailed]:
    'Error al revertir la transacción del almacén de miembros',
  [BrightChainStrings.Error_MemberCblService_CreateMemberCblFailed]:
    'Error al crear el CBL de miembro',
  [BrightChainStrings.Error_MemberCblService_ChecksumMismatch]:
    'Discrepancia de suma de verificación del bloque durante la verificación de integridad',
  [BrightChainStrings.Error_MemberCblService_BlockRetrievalFailed]:
    'Error al recuperar el bloque durante la verificación de integridad',
  [BrightChainStrings.Error_MemberCblService_MissingRequiredFields]:
    'Faltan campos requeridos en los datos del miembro',
  [BrightChainStrings.Error_DeliveryTimeout_HandleTimeoutFailedTemplate]:
    'Error al manejar el tiempo de espera de entrega: {ERROR}',

  // Validator Errors
  [BrightChainStrings.Error_Validator_InvalidBlockSizeTemplate]:
    'Tamaño de bloque inválido: {BLOCK_SIZE}. Los tamaños válidos son: {BLOCK_SIZES}',
  [BrightChainStrings.Error_Validator_InvalidBlockTypeTemplate]:
    'Tipo de bloque inválido: {BLOCK_TYPE}. Los tipos válidos son: {BLOCK_TYPES}',
  [BrightChainStrings.Error_Validator_InvalidEncryptionTypeTemplate]:
    'Tipo de cifrado inválido: {ENCRYPTION_TYPE}. Los tipos válidos son: {ENCRYPTION_TYPES}',
  [BrightChainStrings.Error_Validator_RecipientCountMustBeAtLeastOne]:
    'El número de destinatarios debe ser al menos 1 para el cifrado de múltiples destinatarios',
  [BrightChainStrings.Error_Validator_RecipientCountMaximumTemplate]:
    'El número de destinatarios no puede exceder {MAXIMUM}',
  [BrightChainStrings.Error_Validator_FieldRequiredTemplate]:
    '{FIELD} es requerido',
  [BrightChainStrings.Error_Validator_FieldCannotBeEmptyTemplate]:
    '{FIELD} no puede estar vacío',

  // Miscellaneous Block Errors
  [BrightChainStrings.Error_BlockError_BlockSizesMustMatch]:
    'Los tamaños de bloque deben coincidir',
  [BrightChainStrings.Error_BlockError_DataCannotBeNullOrUndefined]:
    'Los datos no pueden ser null o undefined',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsBlockSizeTemplate]:
    'La longitud de los datos ({LENGTH}) excede el tamaño del bloque ({BLOCK_SIZE})',

  // CPU Errors
  [BrightChainStrings.Error_CPU_DuplicateOpcodeErrorTemplate]:
    'Código de operación 0x{OPCODE} duplicado en el conjunto de instrucciones {INSTRUCTION_SET}',
  [BrightChainStrings.Error_CPU_NotImplementedTemplate]:
    '{INSTRUCTION} no está implementado',
  [BrightChainStrings.Error_CPU_InvalidReadSizeTemplate]:
    'Tamaño de lectura no válido: {SIZE}',
  [BrightChainStrings.Error_CPU_StackOverflow]: 'Desbordamiento de pila',
  [BrightChainStrings.Error_CPU_StackUnderflow]: 'Subdesbordamiento de pila',

  // Member CBL Errors
  [BrightChainStrings.Error_MemberCBL_PublicCBLIdNotSet]:
    'ID de CBL público no establecido',
  [BrightChainStrings.Error_MemberCBL_PrivateCBLIdNotSet]:
    'ID de CBL privado no establecido',

  // Member Document Errors
  [BrightChainStrings.Error_MemberDocument_Hint]:
    'Use MemberDocument.create() en lugar de new MemberDocument()',
  [BrightChainStrings.Error_MemberDocument_CBLNotGenerated]:
    'Los CBLs no han sido generados. Llame a generateCBLs() antes de llamar a toMember()',

  // Member Profile Document Errors
  [BrightChainStrings.Error_MemberProfileDocument_Hint]:
    'Use MemberProfileDocument.create() en lugar de new MemberProfileDocument()',

  // BrightTrust Document Errors
  [BrightChainStrings.Error_BrightTrustDocument_CreatorMustBeSetBeforeSaving]:
    'El creador debe establecerse antes de guardar',
  [BrightChainStrings.Error_BrightTrustDocument_CreatorMustBeSetBeforeEncrypting]:
    'El creador debe establecerse antes de cifrar',
  [BrightChainStrings.Error_BrightTrustDocument_DocumentHasNoEncryptedData]:
    'El documento no tiene datos cifrados',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidEncryptedDataFormat]:
    'Formato de datos cifrados inválido',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidMemberIdsFormat]:
    'Formato de IDs de miembros inválido',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidSignatureFormat]:
    'Formato de firma inválido',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidCreatorIdFormat]:
    'Formato de ID del creador inválido',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidChecksumFormat]:
    'Formato de suma de verificación inválido',

  // Block Logger
  [BrightChainStrings.BlockLogger_Redacted]: 'CENSURADO',

  // Member Schema Errors
  [BrightChainStrings.Error_MemberSchema_InvalidIdFormat]:
    'Formato de ID inválido',
  [BrightChainStrings.Error_MemberSchema_InvalidPublicKeyFormat]:
    'Formato de clave pública inválido',
  [BrightChainStrings.Error_MemberSchema_InvalidVotingPublicKeyFormat]:
    'Formato de clave pública de votación inválido',
  [BrightChainStrings.Error_MemberSchema_InvalidEmailFormat]:
    'Formato de correo electrónico inválido',
  [BrightChainStrings.Error_MemberSchema_InvalidRecoveryDataFormat]:
    'Formato de datos de recuperación inválido',
  [BrightChainStrings.Error_MemberSchema_InvalidTrustedPeersFormat]:
    'Formato de pares de confianza inválido',
  [BrightChainStrings.Error_MemberSchema_InvalidBlockedPeersFormat]:
    'Formato de pares bloqueados inválido',
  [BrightChainStrings.Error_MemberSchema_InvalidActivityLogFormat]:
    'Formato del registro de actividad inválido',

  // Message Metadata Schema Errors
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidRecipientsFormat]:
    'Formato de destinatarios inválido',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidPriorityFormat]:
    'Formato de prioridad inválido',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidDeliveryStatusFormat]:
    'Formato del estado de entrega inválido',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidAcknowledgementsFormat]:
    'Formato de acuses de recibo inválido',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidEncryptionSchemeFormat]:
    'Formato del esquema de cifrado inválido',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidCBLBlockIDsFormat]:
    'Formato de IDs de bloques CBL inválido',

  // Security
  [BrightChainStrings.Security_DOS_InputSizeExceedsLimitErrorTemplate]:
    'El tamaño de entrada {SIZE} excede el límite {MAX_SIZE} para {OPERATION}',
  [BrightChainStrings.Security_DOS_OperationExceededTimeLimitErrorTemplate]:
    'La operación {OPERATION} excedió el tiempo límite de {MAX_TIME} ms',
  [BrightChainStrings.Security_RateLimiter_RateLimitExceededErrorTemplate]:
    'Límite de velocidad excedido para {OPERATION}',
  [BrightChainStrings.Security_AuditLogger_SignatureValidationResultTemplate]:
    'Validación de firma {RESULT}',
  [BrightChainStrings.Security_AuditLogger_Failure]: 'Fallo',
  [BrightChainStrings.Security_AuditLogger_Success]: 'Éxito',
  [BrightChainStrings.Security_AuditLogger_BlockCreated]: 'Bloque creado',
  [BrightChainStrings.Security_AuditLogger_EncryptionPerformed]:
    'Cifrado realizado',
  [BrightChainStrings.Security_AuditLogger_DecryptionResultTemplate]:
    'Descifrado {RESULT}',
  [BrightChainStrings.Security_AuditLogger_AccessDeniedTemplate]:
    'Acceso denegado a {RESOURCE}',
  [BrightChainStrings.Security_AuditLogger_Security]: 'Seguridad',

  // Delivery Timeout
  [BrightChainStrings.DeliveryTimeout_FailedToHandleTimeoutTemplate]:
    'Error al manejar el tiempo de espera para {MESSAGE_ID}:{RECIPIENT_ID}',

  // Message CBL Service
  [BrightChainStrings.MessageCBLService_MessageSizeExceedsMaximumTemplate]:
    'El tamaño del mensaje {SIZE} excede el máximo {MAX_SIZE}',
  [BrightChainStrings.MessageCBLService_FailedToCreateMessageAfterRetries]:
    'Error al crear el mensaje después de reintentos',
  [BrightChainStrings.MessageCBLService_FailedToRetrieveMessageTemplate]:
    'Error al recuperar el mensaje {MESSAGE_ID}',
  [BrightChainStrings.MessageCBLService_MessageTypeIsRequired]:
    'El tipo de mensaje es obligatorio',
  [BrightChainStrings.MessageCBLService_SenderIDIsRequired]:
    'El ID del remitente es obligatorio',
  [BrightChainStrings.MessageCBLService_RecipientCountExceedsMaximumTemplate]:
    'El número de destinatarios {COUNT} excede el máximo {MAXIMUM}',

  // Message Encryption Service
  [BrightChainStrings.MessageEncryptionService_NoRecipientPublicKeysProvided]:
    'No se proporcionaron claves públicas de destinatarios',
  [BrightChainStrings.MessageEncryptionService_FailedToEncryptTemplate]:
    'Error al cifrar para el destinatario {RECIPIENT_ID}: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_BroadcastEncryptionFailedTemplate]:
    'Error en el cifrado de difusión: {TEMPLATE}',
  [BrightChainStrings.MessageEncryptionService_DecryptionFailedTemplate]:
    'Error en el descifrado: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_KeyDecryptionFailedTemplate]:
    'Error en el descifrado de la clave: {ERROR}',

  // Message Logger
  [BrightChainStrings.MessageLogger_MessageCreated]: 'Mensaje creado',
  [BrightChainStrings.MessageLogger_RoutingDecision]:
    'Decisión de enrutamiento',
  [BrightChainStrings.MessageLogger_DeliveryFailure]: 'Fallo de entrega',
  [BrightChainStrings.MessageLogger_EncryptionFailure]: 'Fallo de cifrado',
  [BrightChainStrings.MessageLogger_SlowQueryDetected]:
    'Consulta lenta detectada',

  // Message Router
  [BrightChainStrings.MessageRouter_RoutingTimeout]:
    'Tiempo de enrutamiento agotado',
  [BrightChainStrings.MessageRouter_FailedToRouteToAnyRecipient]:
    'Error al enrutar el mensaje a cualquier destinatario',
  [BrightChainStrings.MessageRouter_ForwardingLoopDetected]:
    'Bucle de reenvío detectado',

  // Block Format Service
  [BrightChainStrings.BlockFormatService_DataTooShort]:
    'Datos demasiado cortos para el encabezado de bloque estructurado (se requieren mínimo 4 bytes)',
  [BrightChainStrings.BlockFormatService_InvalidStructuredBlockFormatTemplate]:
    'Tipo de bloque estructurado inválido: 0x{TYPE}',
  [BrightChainStrings.BlockFormatService_CannotDetermineHeaderSize]:
    'No se puede determinar el tamaño del encabezado - los datos pueden estar truncados',
  [BrightChainStrings.BlockFormatService_Crc8MismatchTemplate]:
    'Discrepancia de CRC8 - el encabezado puede estar corrupto (esperado 0x{EXPECTED}, obtenido 0x{CHECKSUM})',
  [BrightChainStrings.BlockFormatService_DataAppearsEncrypted]:
    'Los datos parecen estar cifrados con ECIES - descifre antes de analizar',
  [BrightChainStrings.BlockFormatService_UnknownBlockFormat]:
    'Formato de bloque desconocido - falta el prefijo mágico 0xBC (pueden ser datos sin procesar)',

  // CBL Service
  [BrightChainStrings.CBLService_NotAMessageCBL]: 'No es un CBL de mensaje',
  [BrightChainStrings.CBLService_CreatorIDByteLengthMismatchTemplate]:
    'Discrepancia en la longitud de bytes del ID del creador: obtenido {LENGTH}, esperado {EXPECTED}',
  [BrightChainStrings.CBLService_CreatorIDProviderReturnedBytesLengthMismatchTemplate]:
    'El proveedor de ID del creador devolvió {LENGTH} bytes, esperado {EXPECTED}',
  [BrightChainStrings.CBLService_SignatureLengthMismatchTemplate]:
    'Discrepancia en la longitud de la firma: obtenido {LENGTH}, esperado {EXPECTED}',
  [BrightChainStrings.CBLService_DataAppearsRaw]:
    'Los datos parecen ser datos sin procesar sin encabezado estructurado',
  [BrightChainStrings.CBLService_InvalidBlockFormat]:
    'Formato de bloque inválido',
  [BrightChainStrings.CBLService_SubCBLCountChecksumMismatchTemplate]:
    'SubCblCount ({COUNT}) no coincide con la longitud de subCblChecksums ({EXPECTED})',
  [BrightChainStrings.CBLService_InvalidDepthTemplate]:
    'La profundidad debe estar entre 1 y 65535, se obtuvo {DEPTH}',
  [BrightChainStrings.CBLService_ExpectedSuperCBLTemplate]:
    'Se esperaba SuperCBL (tipo de bloque 0x03), se obtuvo tipo de bloque 0x{TYPE}',

  // Global Service Provider
  [BrightChainStrings.GlobalServiceProvider_NotInitialized]:
    'Proveedor de servicios no inicializado. Llame primero a ServiceProvider.getInstance().',

  // Block Store Adapter
  [BrightChainStrings.BlockStoreAdapter_DataLengthExceedsBlockSizeTemplate]:
    'La longitud de los datos ({LENGTH}) excede el tamaño del bloque ({BLOCK_SIZE})',

  // Memory Block Store
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailable]:
    'El servicio FEC no está disponible',
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailableInThisEnvironment]:
    'El servicio FEC no está disponible en este entorno',
  [BrightChainStrings.MemoryBlockStore_NoParityDataAvailable]:
    'No hay datos de paridad disponibles para la recuperación',
  [BrightChainStrings.MemoryBlockStore_BlockMetadataNotFound]:
    'Metadatos del bloque no encontrados',
  [BrightChainStrings.MemoryBlockStore_RecoveryFailedInsufficientParityData]:
    'Recuperación fallida - datos de paridad insuficientes',
  [BrightChainStrings.MemoryBlockStore_UnknownRecoveryError]:
    'Error de recuperación desconocido',
  [BrightChainStrings.MemoryBlockStore_CBLDataCannotBeEmpty]:
    'Los datos CBL no pueden estar vacíos',
  [BrightChainStrings.MemoryBlockStore_CBLDataTooLargeTemplate]:
    'Datos CBL demasiado grandes: el tamaño con relleno ({LENGTH}) excede el tamaño del bloque ({BLOCK_SIZE}). Use un tamaño de bloque más grande o un CBL más pequeño.',
  [BrightChainStrings.MemoryBlockStore_Block1NotFound]:
    'Bloque 1 no encontrado y la recuperación falló',
  [BrightChainStrings.MemoryBlockStore_Block2NotFound]:
    'Bloque 2 no encontrado y la recuperación falló',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL]:
    'URL magnet inválida: debe comenzar con "magnet:?"',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLXT]:
    'URL magnet inválida: el parámetro xt debe ser "urn:brightchain:cbl"',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLMissingTemplate]:
    'URL magnet inválida: falta el parámetro {PARAMETER}',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL_InvalidBlockSize]:
    'URL magnet inválida: tamaño de bloque inválido',

  // Checksum
  [BrightChainStrings.Checksum_InvalidTemplate]:
    'La suma de verificación debe ser de {EXPECTED} bytes, se recibió {LENGTH} bytes',
  [BrightChainStrings.Checksum_InvalidHexString]:
    'Cadena hexadecimal inválida: contiene caracteres no hexadecimales',
  [BrightChainStrings.Checksum_InvalidHexStringTemplate]:
    'Longitud de cadena hexadecimal inválida: se esperaban {EXPECTED} caracteres, se recibieron {LENGTH}',

  [BrightChainStrings.Error_XorLengthMismatchTemplate]:
    'XOR requiere arrays de igual longitud{CONTEXT}: a.length={A_LENGTH}, b.length={B_LENGTH}',
  [BrightChainStrings.Error_XorAtLeastOneArrayRequired]:
    'Se debe proporcionar al menos un array para XOR',

  [BrightChainStrings.Error_InvalidUnixTimestampTemplate]:
    'Marca de tiempo Unix inválida: {TIMESTAMP}',
  [BrightChainStrings.Error_InvalidDateStringTemplate]:
    'Cadena de fecha inválida: "{VALUE}". Se esperaba formato ISO 8601 (ej. "2024-01-23T10:30:00Z") o marca de tiempo Unix.',
  [BrightChainStrings.Error_InvalidDateValueTypeTemplate]:
    'Tipo de valor de fecha inválido: {TYPE}. Se esperaba cadena o número.',
  [BrightChainStrings.Error_InvalidDateObjectTemplate]:
    'Objeto de fecha inválido: se esperaba instancia Date, se recibió {OBJECT_STRING}',
  [BrightChainStrings.Error_InvalidDateNaN]:
    'Fecha inválida: el objeto de fecha contiene marca de tiempo NaN',
  [BrightChainStrings.Error_JsonValidationErrorTemplate]:
    'Falló la validación JSON para el campo {FIELD}: {REASON}',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNull]:
    'debe ser un objeto no nulo',
  [BrightChainStrings.Error_JsonValidationError_FieldRequired]:
    'el campo es requerido',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockSize]:
    'debe ser un valor de enumeración BlockSize válido',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockType]:
    'debe ser un valor de enumeración BlockType válido',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockDataType]:
    'debe ser un valor de enumeración BlockDataType válido',
  [BrightChainStrings.Error_JsonValidationError_MustBeNumber]:
    'debe ser un número',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNegative]:
    'debe ser no negativo',
  [BrightChainStrings.Error_JsonValidationError_MustBeInteger]:
    'debe ser un entero',
  [BrightChainStrings.Error_JsonValidationError_MustBeISO8601DateStringOrUnixTimestamp]:
    'debe ser una cadena ISO 8601 válida o una marca de tiempo Unix',
  [BrightChainStrings.Error_JsonValidationError_MustBeString]:
    'debe ser una cadena de texto',
  [BrightChainStrings.Error_JsonValidationError_MustNotBeEmpty]:
    'no debe estar vacío',
  [BrightChainStrings.Error_JsonValidationError_JSONParsingFailed]:
    'error al analizar JSON',
  [BrightChainStrings.Error_JsonValidationError_ValidationFailed]:
    'validación fallida',
  [BrightChainStrings.XorUtils_BlockSizeMustBePositiveTemplate]:
    'El tamaño del bloque debe ser positivo: {BLOCK_SIZE}',
  [BrightChainStrings.XorUtils_InvalidPaddedDataTemplate]:
    'Datos con relleno inválidos: demasiado cortos ({LENGTH} bytes, se necesitan al menos {REQUIRED})',
  [BrightChainStrings.XorUtils_InvalidLengthPrefixTemplate]:
    'Prefijo de longitud inválido: indica {LENGTH} bytes pero solo {AVAILABLE} disponibles',
  [BrightChainStrings.BlockPaddingTransform_MustBeArray]:
    'La entrada debe ser Uint8Array, TypedArray o ArrayBuffer',
  [BrightChainStrings.CblStream_UnknownErrorReadingData]:
    'Error desconocido al leer datos',
  [BrightChainStrings.CurrencyCode_InvalidCurrencyCode]:
    'Código de moneda inválido',
  [BrightChainStrings.EnergyAccount_InsufficientBalanceTemplate]:
    'Saldo insuficiente: se necesitan {AMOUNT}J, disponible {AVAILABLE_BALANCE}J',
  [BrightChainStrings.Init_BrowserCompatibleConfiguration]:
    'Configuración de BrightChain compatible con navegador con GuidV4Provider',
  [BrightChainStrings.Init_NotInitialized]:
    'Biblioteca BrightChain no inicializada. Llame a initializeBrightChain() primero.',
  [BrightChainStrings.ModInverse_MultiplicativeInverseDoesNotExist]:
    'El inverso multiplicativo modular no existe',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInTransform]:
    'Error desconocido en la transformación',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInMakeTuple]:
    'Error desconocido en makeTuple',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInFlush]:
    'Error desconocido en flush',
  [BrightChainStrings.BrightTrustDataRecord_MustShareWithAtLeastTwoMembers]:
    'Debe compartirse con al menos 2 miembros',
  [BrightChainStrings.BrightTrustDataRecord_SharesRequiredExceedsMembers]:
    'Las partes requeridas superan el número de miembros',
  [BrightChainStrings.BrightTrustDataRecord_SharesRequiredMustBeAtLeastTwo]:
    'Las partes requeridas deben ser al menos 2',
  [BrightChainStrings.BrightTrustDataRecord_InvalidChecksum]:
    'Suma de verificación inválida',
  [BrightChainStrings.BrightTrustDataRecord_InvalidSignature]:
    'Firma inválida',
  [BrightChainStrings.SimpleBrowserStore_BlockNotFoundTemplate]:
    'Bloque no encontrado: {ID}',
  [BrightChainStrings.EncryptedBlockCreator_NoCreatorRegisteredTemplate]:
    'No hay creador registrado para el tipo de bloque {TYPE}',
  [BrightChainStrings.TestMember_MemberNotFoundTemplate]:
    'Miembro {KEY} no encontrado',

  // TCBL (Tarball CBL) Errors
  [BrightChainStrings.Error_TcblError_InvalidHeader]:
    'Encabezado TCBL no válido: prefijo mágico o byte de tipo faltante o incorrecto',
  [BrightChainStrings.Error_TcblError_ManifestChecksumMismatch]:
    'La suma de verificación del manifiesto TCBL no coincide con la suma calculada',
  [BrightChainStrings.Error_TcblError_ManifestCountMismatch]:
    'El recuento de entradas del manifiesto TCBL no coincide con el número real de descriptores',
  [BrightChainStrings.Error_TcblError_ManifestCorrupted]:
    'Los datos del manifiesto TCBL están corruptos o malformados',
  [BrightChainStrings.Error_TcblError_ManifestTruncated]:
    'Los datos del manifiesto TCBL están truncados',
  [BrightChainStrings.Error_TcblError_EntryNotFound]:
    'Entrada TCBL no encontrada en el manifiesto',
  [BrightChainStrings.Error_TcblError_FileNameTooLong]:
    'El nombre de archivo de la entrada TCBL excede la longitud máxima permitida',
  [BrightChainStrings.Error_TcblError_MimeTypeTooLong]:
    'El tipo MIME de la entrada TCBL excede la longitud máxima permitida',
  [BrightChainStrings.Error_TcblError_PathTraversal]:
    'El nombre de archivo de la entrada TCBL contiene secuencias de recorrido de ruta',
  [BrightChainStrings.Error_TcblError_DecompressionFailed]:
    'Error al descomprimir la carga útil del archivo TCBL',
  [BrightChainStrings.Error_TcblError_DecryptionFailed]:
    'Error al descifrar la carga útil del archivo TCBL',
  [BrightChainStrings.Error_TcblError_InvalidManifestVersion]:
    'La versión del manifiesto TCBL no es compatible',

  // Splash
  [BrightChainStrings.Splash_Welcome]: 'Bienvenido a BrightChain',
  [BrightChainStrings.Splash_NextGenInfrastructure]:
    'La Plataforma de Aplicaciones Descentralizadas',
  [BrightChainStrings.Splash_SoupCanDemo]: 'Demo de Lata de Sopa',
  [BrightChainStrings.Splash_SoupCanDemoDescription]:
    'Vea cómo BrightChain divide los datos en bloques y los mezcla con datos aleatorios usando operaciones XOR para almacenamiento sin propietario.',
  [BrightChainStrings.Splash_StoragePools]: 'Pools de Almacenamiento',
  [BrightChainStrings.Splash_StoragePoolsDescription]:
    'Explore pools aislados por espacio de nombres, bloques direccionados por contenido, blanqueamiento con alcance de pool y garantías de aislamiento entre pools.',
  [BrightChainStrings.Splash_Messaging]: 'Mensajería',
  [BrightChainStrings.Splash_MessagingDescription]:
    'Mensajes directos cifrados con ECIES, chats grupales compartidos por pool, canales con modos de visibilidad, mensajes efímeros y presencia.',
  [BrightChainStrings.Splash_BrightPass]: 'BrightPass',
  [BrightChainStrings.Splash_BrightPassDescription]:
    'Bóveda de contraseñas descentralizada con almacenamiento de credenciales, generación de contraseñas, verificación de brechas y configuración TOTP/2FA.',
  [BrightChainStrings.Splash_Database]: 'Base de datos',
  [BrightChainStrings.Splash_DatabaseDescription]:
    'Base de datos de documentos con bloques de copia en escritura, aislamiento de pool, transacciones de concurrencia optimista y pipelines de agregación.',
  [BrightChainStrings.Splash_IdentityAndSecurity]: 'Identidad y Seguridad',
  [BrightChainStrings.Splash_IdentityAndSecurityDescription]:
    'Respaldo de clave en papel, gestión de dispositivos, pruebas de identidad entre plataformas y búsqueda de perfiles en el directorio de claves públicas.',
  [BrightChainStrings.Splash_TrySoupCanDemo]: 'Probar la Demo de Lata de Sopa',
  [BrightChainStrings.Splash_GetStarted]: 'Comenzar',
  [BrightChainStrings.Splash_WhatIsBrightChain]: '¿Qué es BrightChain?',
  [BrightChainStrings.Splash_WhatIsBrightChainDescription]:
    'BrightChain revoluciona el almacenamiento de datos utilizando el concepto de "Sopa de Bloques Brillantes". Sus archivos se dividen en bloques y se mezclan con datos aleatorios usando operaciones XOR, haciéndolos aparecer completamente aleatorios mientras mantienen una seguridad perfecta.',
  [BrightChainStrings.Splash_OwnerFreeStorage]:
    'Almacenamiento sin Propietario',
  [BrightChainStrings.Splash_OwnerFreeStorageDescription]:
    'La aleatoriedad criptográfica elimina la responsabilidad del almacenamiento',
  [BrightChainStrings.Splash_EnergyEfficient]: 'Eficiente en Energía',
  [BrightChainStrings.Splash_EnergyEfficientDescription]:
    'Sin minería derrochadora de prueba de trabajo',
  [BrightChainStrings.Splash_Decentralized]: 'Descentralizado',
  [BrightChainStrings.Splash_DecentralizedDescription]:
    'Distribuido en toda la red',
  [BrightChainStrings.Splash_AnonymousYetAccountable]:
    'Anónimo pero Responsable',
  [BrightChainStrings.Splash_AnonymousYetAccountableDescription]:
    'Privacidad con capacidades de moderación',
  [BrightChainStrings.Splash_ExploreThePlatform]: 'Explorar la Plataforma',
  [BrightChainStrings.Splash_InteractiveDemos]:
    'Demos interactivas que muestran las capacidades principales de BrightChain',
  [BrightChainStrings.Splash_LaunchDemo]: 'Iniciar Demo',

  // Splash - BrightStack
  [BrightChainStrings.Splash_BuildWithBrightStack]: 'Construye con BrightStack',
  [BrightChainStrings.Splash_BuildWithBrightStackDescription]:
    'BrightStack es el paradigma full-stack para aplicaciones descentralizadas: BrightChain + Express + React + Node. Si conoces la stack MERN, ya conoces BrightStack.',
  [BrightChainStrings.Splash_BrightStackSubtitle]:
    'Cambia MongoDB por BrightDb. Mantén todo lo demás.',
  [BrightChainStrings.Splash_BrightDb]: 'BrightDb',
  [BrightChainStrings.Splash_BrightDbDescription]:
    'Base de datos documental compatible con MongoDB sobre el sistema de archivos Owner-Free. CRUD completo, consultas, índices, transacciones y pipelines de agregación.',
  [BrightChainStrings.Splash_FamiliarApi]: 'API familiar',
  [BrightChainStrings.Splash_FamiliarApiDescription]:
    'Los mismos patrones que usas con MongoDB — colecciones, find, insert, update — pero cada documento se almacena como bloques blanqueados que preservan la privacidad.',
  [BrightChainStrings.Splash_BuiltOnBrightStack]:
    'Construido sobre BrightStack',
  [BrightChainStrings.Splash_BuiltOnBrightStackDescription]:
    'BrightPass, BrightMail y BrightHub fueron construidos sobre BrightStack, demostrando que el desarrollo de aplicaciones descentralizadas puede ser tan fácil como el full-stack tradicional.',
  [BrightChainStrings.Splash_OpenSource]: 'Código Abierto',
  [BrightChainStrings.Splash_OpenSourceDescription]:
    'BrightChain es completamente de código abierto. Construye tus propias dApps sobre BrightStack y contribuye al futuro descentralizado.',

  // Splash - No es una Criptomoneda
  [BrightChainStrings.Splash_NotACryptocurrency]: 'No es una Criptomoneda',
  [BrightChainStrings.Splash_NotACryptocurrencyDescription]:
    'Cuando escuchas "blockchain", probablemente piensas en Bitcoin. BrightChain es fundamentalmente diferente — no hay moneda, no hay prueba de trabajo y no hay minería. En lugar de quemar energía para acuñar monedas, BrightChain valora las contribuciones reales de almacenamiento y cómputo.',
  [BrightChainStrings.Splash_NoCurrency]: 'Sin Moneda',
  [BrightChainStrings.Splash_NoCurrencyDescription]:
    'BrightChain no tiene moneda, ni token, ni activo especulativo. Es infraestructura, no finanzas.',
  [BrightChainStrings.Splash_NoMining]: 'Sin Minería',
  [BrightChainStrings.Splash_NoMiningDescription]:
    'Sin prueba de trabajo, sin energía desperdiciada. Cada ciclo de cómputo sirve un propósito útil.',
  [BrightChainStrings.Splash_Joules]: 'Joules, No Monedas',
  [BrightChainStrings.Splash_JoulesDescription]:
    'Las contribuciones de almacenamiento y cómputo se rastrean en Joules — una unidad vinculada a costos energéticos reales, no a la especulación del mercado.',
  [BrightChainStrings.Splash_RealWorldValue]: 'Valor del Mundo Real',
  [BrightChainStrings.Splash_RealWorldValueDescription]:
    'Los valores de Joules se establecen por fórmula basada en costos reales, y refinamos esa fórmula con el tiempo — sin comercio, sin volatilidad.',

  // Dashboard
  [BrightChainStrings.Dashboard_Title]: 'Tu panel de control',
  [BrightChainStrings.Dashboard_EnergyBalance]: 'Saldo de energía',
  [BrightChainStrings.Dashboard_AvailableCredits]:
    'Créditos de energía disponibles',
  [BrightChainStrings.Dashboard_Reputation]: 'Reputación',
  [BrightChainStrings.Dashboard_ReputationScore]:
    'Puntuación de reputación de la red',
  [BrightChainStrings.Dashboard_EnergyEarned]: 'Energía ganada',
  [BrightChainStrings.Dashboard_EarnedDescription]:
    'Total ganado por proporcionar recursos',
  [BrightChainStrings.Dashboard_EnergySpent]: 'Energía gastada',
  [BrightChainStrings.Dashboard_SpentDescription]:
    'Total gastado en operaciones',
  [BrightChainStrings.Dashboard_Loading]: 'Cargando...',
  [BrightChainStrings.Dashboard_FailedToLoadBalance]:
    'Error al cargar el saldo',
  [BrightChainStrings.Dashboard_FailedToLoadReputation]:
    'Error al cargar la reputación',
  [BrightChainStrings.Dashboard_FailedToLoadData]: 'Error al cargar los datos',

  // Admin Dashboard
  [BrightChainStrings.Admin_Dashboard_Title]: 'Panel de administración',
  [BrightChainStrings.Admin_Dashboard_AccessDenied]: 'Acceso denegado',
  [BrightChainStrings.Admin_Dashboard_AccessDeniedDescription]:
    'No tiene permiso para ver el panel de administración.',
  [BrightChainStrings.Admin_Dashboard_Loading]: 'Cargando panel…',
  [BrightChainStrings.Admin_Dashboard_NoData]: 'No hay datos disponibles.',
  [BrightChainStrings.Admin_Dashboard_RefreshNow]: 'Actualizar ahora',
  [BrightChainStrings.Admin_Dashboard_ErrorLastSuccessTemplate]:
    'Error — último éxito: {TIME}',
  [BrightChainStrings.Admin_Dashboard_ErrorLastSuccessNever]: 'nunca',
  [BrightChainStrings.Admin_Dashboard_ServerIdentity]: 'Identidad del servidor',
  [BrightChainStrings.Admin_Dashboard_Hostname]: 'Nombre de host',
  [BrightChainStrings.Admin_Dashboard_LocalNodeId]: 'ID de nodo local',
  [BrightChainStrings.Admin_Dashboard_Timestamp]: 'Marca de tiempo',
  [BrightChainStrings.Admin_Dashboard_NA]: 'N/D',
  [BrightChainStrings.Admin_Dashboard_Nodes]: 'Nodos',
  [BrightChainStrings.Admin_Dashboard_NoNodesRegistered]:
    'No hay nodos registrados.',
  [BrightChainStrings.Admin_Dashboard_DisconnectedPeers]: 'Pares desconectados',
  [BrightChainStrings.Admin_Dashboard_LumenClients]: 'Clientes Lumen',
  [BrightChainStrings.Admin_Dashboard_ConnectedClients]: 'clientes conectados',
  [BrightChainStrings.Admin_Dashboard_RoomsTemplate]: '{COUNT} sala(s)',
  [BrightChainStrings.Admin_Dashboard_NodeConnections]: 'Conexiones de nodos',
  [BrightChainStrings.Admin_Dashboard_NodeToNodeConnections]:
    'Conexiones nodo a nodo',
  [BrightChainStrings.Admin_Dashboard_SystemMetrics]: 'Métricas del sistema',
  [BrightChainStrings.Admin_Dashboard_HeapUsed]: 'Heap utilizado',
  [BrightChainStrings.Admin_Dashboard_HeapTotal]: 'Heap total',
  [BrightChainStrings.Admin_Dashboard_RSS]: 'RSS',
  [BrightChainStrings.Admin_Dashboard_External]: 'Externo',
  [BrightChainStrings.Admin_Dashboard_UptimeTemplate]:
    'Tiempo activo: {SECONDS}s',
  [BrightChainStrings.Admin_Dashboard_NodeVersionTemplate]:
    'Node {NODE_VERSION} — App v{APP_VERSION}',
  [BrightChainStrings.Admin_Dashboard_DBStats]: 'Estadísticas de BD',
  [BrightChainStrings.Admin_Dashboard_Users]: 'Usuarios',
  [BrightChainStrings.Admin_Dashboard_Roles]: 'Roles',
  [BrightChainStrings.Admin_Dashboard_Active]: 'Activo',
  [BrightChainStrings.Admin_Dashboard_Locked]: 'Bloqueado',
  [BrightChainStrings.Admin_Dashboard_Pending]: 'Pendiente',
  [BrightChainStrings.Admin_Dashboard_Members]: 'Miembros',
  [BrightChainStrings.Admin_Dashboard_Threshold]: 'Umbral',
  [BrightChainStrings.Admin_Dashboard_Pools]: 'Pools',
  [BrightChainStrings.Admin_Dashboard_NoPools]: 'Sin pools.',
  [BrightChainStrings.Admin_Dashboard_Dependencies]: 'Dependencias',
  [BrightChainStrings.Admin_Dashboard_BlockStore]: 'BrightStore',
  [BrightChainStrings.Admin_Dashboard_TotalBlocks]: 'Bloques totales',
  [BrightChainStrings.Admin_Dashboard_TotalSize]: 'Tamaño total',
  [BrightChainStrings.Admin_Dashboard_TotalPosts]: 'Publicaciones totales',
  [BrightChainStrings.Admin_Dashboard_ActiveUsersLast30Days]:
    'Usuarios activos (30d)',
  [BrightChainStrings.Admin_Dashboard_Conversations]: 'Conversaciones',
  [BrightChainStrings.Admin_Dashboard_Messages]: 'Mensajes',
  [BrightChainStrings.Admin_Dashboard_TotalVaults]: 'Bóvedas totales',
  [BrightChainStrings.Admin_Dashboard_SharedVaults]: 'Bóvedas compartidas',
  [BrightChainStrings.Admin_Dashboard_TotalEmails]: 'Correos totales',
  [BrightChainStrings.Admin_Dashboard_DeliveryFailures]: 'Fallos de entrega',
  [BrightChainStrings.Admin_Dashboard_Last24Hours]: 'Últimas 24h',
  [BrightChainStrings.Admin_Menu_Dashboard]: 'Panel de administración',
  [BrightChainStrings.Admin_Menu_Users]: 'User Management',
  [BrightChainStrings.Admin_Menu_Blocks]: 'Block Explorer',
  [BrightChainStrings.Admin_Menu_Chat]: 'Chat Admin',
  [BrightChainStrings.Admin_Menu_Hub]: 'Hub Admin',
  [BrightChainStrings.Admin_Menu_Mail]: 'Mail Admin',
  [BrightChainStrings.Admin_Menu_Pass]: 'Pass Admin',
  [BrightChainStrings.Admin_Common_Loading]: 'Cargando…',
  [BrightChainStrings.Admin_Common_Previous]: 'Anterior',
  [BrightChainStrings.Admin_Common_Next]: 'Siguiente',
  [BrightChainStrings.Admin_Common_PageTemplate]: 'Página {PAGE} de {TOTAL}',
  [BrightChainStrings.Admin_Common_Cancel]: 'Cancelar',
  [BrightChainStrings.Admin_Common_Delete]: 'Eliminar',
  [BrightChainStrings.Admin_Common_Yes]: 'Sí',
  [BrightChainStrings.Admin_Common_No]: 'No',
  [BrightChainStrings.Admin_Common_Never]: 'Nunca',
  [BrightChainStrings.Admin_Common_Close]: 'Cerrar',
  [BrightChainStrings.Admin_Users_Title]: 'Gestión de usuarios',
  [BrightChainStrings.Admin_Users_FilterAll]: 'Todos',
  [BrightChainStrings.Admin_Users_FilterActive]: 'Activo',
  [BrightChainStrings.Admin_Users_FilterLocked]: 'Bloqueado',
  [BrightChainStrings.Admin_Users_FilterPending]: 'Pendiente',
  [BrightChainStrings.Admin_Users_ColUsername]: 'Nombre de usuario',
  [BrightChainStrings.Admin_Users_ColEmail]: 'Correo electrónico',
  [BrightChainStrings.Admin_Users_ColStatus]: 'Estado',
  [BrightChainStrings.Admin_Users_ColEmailVerified]: 'Correo verificado',
  [BrightChainStrings.Admin_Users_ColLastLogin]: 'Último inicio de sesión',
  [BrightChainStrings.Admin_Users_ColActions]: 'Acciones',
  [BrightChainStrings.Admin_Users_NoUsersFound]: 'No se encontraron usuarios.',
  [BrightChainStrings.Admin_Users_UnlockUser]: 'Desbloquear usuario',
  [BrightChainStrings.Admin_Users_LockUser]: 'Bloquear usuario',
  [BrightChainStrings.Admin_Users_LockUserTitle]: 'Bloquear usuario',
  [BrightChainStrings.Admin_Users_UnlockUserTitle]: 'Desbloquear usuario',
  [BrightChainStrings.Admin_Users_LockConfirmTemplate]:
    '¿Está seguro de que desea bloquear a {USERNAME}?',
  [BrightChainStrings.Admin_Users_UnlockConfirmTemplate]:
    '¿Está seguro de que desea desbloquear a {USERNAME}?',
  [BrightChainStrings.Admin_Users_LockWarning]:
    ' Esto impedirá que el usuario inicie sesión.',
  [BrightChainStrings.Admin_Users_ColRole]: 'Rol',
  [BrightChainStrings.Admin_Users_ChangeRole]: 'Cambiar rol',
  [BrightChainStrings.Admin_Users_ChangeRoleTitle]: 'Cambiar rol de usuario',
  [BrightChainStrings.Admin_Users_ChangeRoleConfirmTemplate]:
    '¿Está seguro de que desea cambiar a {USERNAME} de {OLD_ROLE} a {NEW_ROLE}?',
  [BrightChainStrings.Admin_Users_ChangeRoleWarning]:
    ' Cambiar un usuario a Admin otorga acceso administrativo completo.',
  [BrightChainStrings.Admin_Users_RoleAdmin]: 'Admin',
  [BrightChainStrings.Admin_Users_RoleMember]: 'Miembro',
  [BrightChainStrings.Admin_Users_RoleSystem]: 'Sistema',
  [BrightChainStrings.Admin_Users_CannotChangeOwnRole]:
    'No puede cambiar su propio rol.',
  [BrightChainStrings.Admin_Users_CannotChangeSystemUser]:
    'El rol del usuario del sistema no se puede cambiar.',
  [BrightChainStrings.Admin_Users_DeleteUser]: 'Delete User',
  [BrightChainStrings.Admin_Users_DeleteUserTitle]: 'Delete User',
  [BrightChainStrings.Admin_Users_DeleteConfirmTemplate]:
    'Are you sure you want to permanently delete user "{USERNAME}"? This will remove their CBLs, settings, and all database records. This action cannot be undone.',
  [BrightChainStrings.Admin_Users_DeleteWarning]:
    ' This is a destructive operation.',
  [BrightChainStrings.Admin_Users_CannotDeleteSelf]:
    'You cannot delete your own account.',
  [BrightChainStrings.Admin_Users_CannotDeleteSystemUser]:
    'The system user cannot be deleted.',
  [BrightChainStrings.Admin_Blocks_Title]: 'Explorador de bloques',
  [BrightChainStrings.Admin_Blocks_SearchPlaceholder]:
    'Buscar por ID de bloque',
  [BrightChainStrings.Admin_Blocks_FilterAllDurability]:
    'Todas las durabilidades',
  [BrightChainStrings.Admin_Blocks_FilterStandard]: 'Estándar',
  [BrightChainStrings.Admin_Blocks_FilterHighDurability]: 'Alta durabilidad',
  [BrightChainStrings.Admin_Blocks_FilterEphemeral]: 'Efímero',
  [BrightChainStrings.Admin_Blocks_SortByDate]: 'Ordenar por fecha',
  [BrightChainStrings.Admin_Blocks_SortBySize]: 'Ordenar por tamaño',
  [BrightChainStrings.Admin_Blocks_Detail]: 'Detalle del bloque',
  [BrightChainStrings.Admin_Blocks_ColBlockId]: 'ID de bloque',
  [BrightChainStrings.Admin_Blocks_ColSize]: 'Tamaño',
  [BrightChainStrings.Admin_Blocks_ColDurability]: 'Durabilidad',
  [BrightChainStrings.Admin_Blocks_ColCreated]: 'Creado',
  [BrightChainStrings.Admin_Blocks_ColAccessCount]: 'Contador de accesos',
  [BrightChainStrings.Admin_Blocks_ColReplication]: 'Replicación',
  [BrightChainStrings.Admin_Blocks_ColActions]: 'Acciones',
  [BrightChainStrings.Admin_Blocks_NoBlocksFound]: 'No se encontraron bloques.',
  [BrightChainStrings.Admin_Blocks_DiscoverNodes]: 'Descubrir nodos',
  [BrightChainStrings.Admin_Blocks_NodesHoldingBlockTemplate]:
    'Nodos con el bloque {BLOCK_ID}:',
  [BrightChainStrings.Admin_Blocks_NoNodesFound]: 'No se encontraron nodos.',
  [BrightChainStrings.Admin_Blocks_Checksum]: 'Suma de verificación',
  [BrightChainStrings.Admin_Blocks_DeleteTitle]: 'Eliminar bloque',
  [BrightChainStrings.Admin_Blocks_DeleteConfirmTemplate]:
    '¿Está seguro de que desea eliminar el bloque {BLOCK_ID}? Esto también eliminará los bloques de paridad asociados del almacenamiento local.',
  [BrightChainStrings.Admin_Blocks_SizeBytesTemplate]: '{SIZE} bytes',
  [BrightChainStrings.Admin_Pass_Title]: 'Admin de BrightPass',
  [BrightChainStrings.Admin_Pass_EncryptedNotice]:
    'El contenido de las bóvedas está cifrado y no se puede ver. Solo se muestran los metadatos de la bóveda.',
  [BrightChainStrings.Admin_Pass_ColOwner]: 'Propietario',
  [BrightChainStrings.Admin_Pass_ColShared]: 'Compartido',
  [BrightChainStrings.Admin_Pass_ColCreated]: 'Creado',
  [BrightChainStrings.Admin_Pass_ColLastAccessed]: 'Último acceso',
  [BrightChainStrings.Admin_Pass_ColActions]: 'Acciones',
  [BrightChainStrings.Admin_Pass_NoVaultsFound]: 'No se encontraron bóvedas.',
  [BrightChainStrings.Admin_Pass_DeleteVault]: 'Eliminar bóveda',
  [BrightChainStrings.Admin_Pass_DeleteVaultTitle]: 'Eliminar bóveda',
  [BrightChainStrings.Admin_Pass_DeleteVaultConfirm]:
    '¿Está seguro de que desea eliminar esta bóveda? Esto eliminará la bóveda y sus bloques asociados. Esta acción no se puede deshacer.',
  [BrightChainStrings.Admin_Chat_Title]: 'Admin de BrightChat',
  [BrightChainStrings.Admin_Chat_ColId]: 'ID',
  [BrightChainStrings.Admin_Chat_ColParticipants]: 'Participantes',
  [BrightChainStrings.Admin_Chat_ColMessages]: 'Mensajes',
  [BrightChainStrings.Admin_Chat_ColLastActivity]: 'Última actividad',
  [BrightChainStrings.Admin_Chat_NoConversationsFound]:
    'No se encontraron conversaciones.',
  [BrightChainStrings.Admin_Chat_MessagesForTemplate]:
    'Mensajes de la conversación {CONVERSATION_ID}',
  [BrightChainStrings.Admin_Chat_LoadingMessages]: 'Cargando mensajes…',
  [BrightChainStrings.Admin_Chat_NoMessages]: 'Sin mensajes.',
  [BrightChainStrings.Admin_Chat_ColSender]: 'Remitente',
  [BrightChainStrings.Admin_Chat_ColContent]: 'Contenido',
  [BrightChainStrings.Admin_Chat_ColCreated]: 'Creado',
  [BrightChainStrings.Admin_Chat_ColStatus]: 'Estado',
  [BrightChainStrings.Admin_Chat_StatusDeleted]: 'Eliminado',
  [BrightChainStrings.Admin_Chat_StatusActive]: 'Activo',
  [BrightChainStrings.Admin_Chat_DeleteMessage]: 'Eliminar mensaje',
  [BrightChainStrings.Admin_Chat_DeleteMessageTitle]: 'Eliminar mensaje',
  [BrightChainStrings.Admin_Chat_DeleteMessageConfirm]:
    '¿Está seguro de que desea eliminar este mensaje? Se eliminará de forma provisional.',
  [BrightChainStrings.Admin_Hub_Title]: 'Admin de BrightHub',
  [BrightChainStrings.Admin_Hub_FilterByAuthorId]: 'Filtrar por ID de autor',
  [BrightChainStrings.Admin_Hub_FilterAllPosts]: 'Todas las publicaciones',
  [BrightChainStrings.Admin_Hub_FilterActive]: 'Activo',
  [BrightChainStrings.Admin_Hub_FilterDeleted]: 'Eliminado',
  [BrightChainStrings.Admin_Hub_ColAuthor]: 'Autor',
  [BrightChainStrings.Admin_Hub_ColContentPreview]:
    'Vista previa del contenido',
  [BrightChainStrings.Admin_Hub_ColCreated]: 'Creado',
  [BrightChainStrings.Admin_Hub_ColStatus]: 'Estado',
  [BrightChainStrings.Admin_Hub_ColLikes]: 'Me gusta',
  [BrightChainStrings.Admin_Hub_ColReposts]: 'Republicaciones',
  [BrightChainStrings.Admin_Hub_ColActions]: 'Acciones',
  [BrightChainStrings.Admin_Hub_StatusDeleted]: 'Eliminado',
  [BrightChainStrings.Admin_Hub_StatusActive]: 'Activo',
  [BrightChainStrings.Admin_Hub_NoPostsFound]:
    'No se encontraron publicaciones.',
  [BrightChainStrings.Admin_Hub_SoftDeletePost]: 'Eliminar publicación',
  [BrightChainStrings.Admin_Hub_DeletePostTitle]: 'Eliminar publicación',
  [BrightChainStrings.Admin_Hub_DeletePostConfirm]:
    '¿Está seguro de que desea eliminar esta publicación? Se marcará como eliminada, pero no se eliminará permanentemente.',
  [BrightChainStrings.Admin_Mail_Title]: 'Admin de BrightMail',
  [BrightChainStrings.Admin_Mail_ColSender]: 'Remitente',
  [BrightChainStrings.Admin_Mail_ColRecipients]: 'Destinatarios',
  [BrightChainStrings.Admin_Mail_ColSubject]: 'Asunto',
  [BrightChainStrings.Admin_Mail_ColCreated]: 'Creado',
  [BrightChainStrings.Admin_Mail_ColDeliveryStatus]: 'Estado de entrega',
  [BrightChainStrings.Admin_Mail_ColActions]: 'Acciones',
  [BrightChainStrings.Admin_Mail_NoEmailsFound]: 'No se encontraron correos.',
  [BrightChainStrings.Admin_Mail_DeleteEmail]: 'Eliminar correo',
  [BrightChainStrings.Admin_Mail_DeleteEmailTitle]: 'Eliminar correo',
  [BrightChainStrings.Admin_Mail_DeleteEmailConfirm]:
    '¿Está seguro de que desea eliminar este correo? Esta acción no se puede deshacer.',
};
