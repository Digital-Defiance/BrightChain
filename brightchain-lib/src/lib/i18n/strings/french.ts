import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';

export const FrenchStrings: StringsCollection<BrightChainStringKey> = {
  // UI Strings
  [BrightChainStrings.Common_BlockSize]: 'Taille de bloc',
  [BrightChainStrings.Common_AtIndexTemplate]: "{OPERATION} à l'index {INDEX}",
  [BrightChainStrings.ChangePassword_Success]:
    'Mot de passe modifié avec succès.',
  [BrightChainStrings.Common_Site]: 'BrightChain',
  [BrightChainStrings.ForgotPassword_Title]: 'Mot de passe oublié',
  [BrightChainStrings.Register_Button]: "S'inscrire",
  [BrightChainStrings.Register_Error]:
    "Une erreur s'est produite lors de l'inscription.",
  [BrightChainStrings.Register_Success]: 'Inscription réussie.',

  // Block Handle Errors
  [BrightChainStrings.Error_BlockHandle_BlockConstructorMustBeValid]:
    'blockConstructor doit être une fonction constructeur valide',
  [BrightChainStrings.Error_BlockHandle_BlockSizeRequired]:
    'blockSize est requis',
  [BrightChainStrings.Error_BlockHandle_DataMustBeUint8Array]:
    'data doit être un Uint8Array',
  [BrightChainStrings.Error_BlockHandle_ChecksumMustBeChecksum]:
    'checksum doit être un Checksum',

  // Block Handle Tuple Errors
  [BrightChainStrings.Error_BlockHandleTuple_FailedToLoadBlockTemplate]:
    'Impossible de charger le bloc {CHECKSUM} : {ERROR}',
  [BrightChainStrings.Error_BlockHandleTuple_FailedToStoreXorResultTemplate]:
    'Échec du stockage du résultat XOR : {ERROR}',

  // Block Access Errors
  [BrightChainStrings.Error_BlockAccess_Template]:
    "Impossible d'accéder au bloc : {REASON}",
  [BrightChainStrings.Error_BlockAccessError_BlockAlreadyExists]:
    'Le fichier bloc existe déjà',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotPersistable]:
    "Le bloc n'est pas persistable",
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotReadable]:
    "Le bloc n'est pas lisible",
  [BrightChainStrings.Error_BlockAccessError_BlockFileNotFoundTemplate]:
    'Fichier bloc non trouvé : {FILE}',
  [BrightChainStrings.Error_BlockAccess_CBLCannotBeEncrypted]:
    'Le bloc CBL ne peut pas être chiffré',
  [BrightChainStrings.Error_BlockAccessError_CreatorMustBeProvided]:
    'Le créateur doit être fourni pour la validation de la signature',
  [BrightChainStrings.Error_Block_CannotBeDecrypted]:
    'Le bloc ne peut pas être déchiffré',
  [BrightChainStrings.Error_Block_CannotBeEncrypted]:
    'Le bloc ne peut pas être chiffré',
  [BrightChainStrings.Error_BlockCapacity_Template]:
    'Capacité du bloc dépassée. Taille du bloc : ({BLOCK_SIZE}), Données : ({DATA_SIZE})',

  // Block Metadata Errors
  [BrightChainStrings.Error_BlockMetadata_Template]:
    'Erreur de métadonnées du bloc : {REASON}',
  [BrightChainStrings.Error_BlockMetadataError_CreatorIdMismatch]:
    "Incompatibilité de l'ID du créateur",
  [BrightChainStrings.Error_BlockMetadataError_CreatorRequired]:
    'Le créateur est requis',
  [BrightChainStrings.Error_BlockMetadataError_EncryptorRequired]:
    "L'encrypteur est requis",
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadata]:
    'Métadonnées de bloc invalides',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadataTemplate]:
    'Métadonnées de bloc invalides : {REASON}',
  [BrightChainStrings.Error_BlockMetadataError_MetadataRequired]:
    'Les métadonnées sont requises',
  [BrightChainStrings.Error_BlockMetadataError_MissingRequiredMetadata]:
    'Champs de métadonnées requis manquants',

  // Block Capacity Errors
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockSize]:
    'Taille de bloc invalide',
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockType]:
    'Type de bloc invalide',
  [BrightChainStrings.Error_BlockCapacity_CapacityExceeded]:
    'Capacité dépassée',
  [BrightChainStrings.Error_BlockCapacity_InvalidFileName]:
    'Nom de fichier invalide',
  [BrightChainStrings.Error_BlockCapacity_InvalidMimetype]:
    'Type MIME invalide',
  [BrightChainStrings.Error_BlockCapacity_InvalidRecipientCount]:
    'Nombre de destinataires invalide',
  [BrightChainStrings.Error_BlockCapacity_InvalidExtendedCblData]:
    'Données CBL étendues invalides',

  // Block Validation Errors
  [BrightChainStrings.Error_BlockValidationError_Template]:
    'La validation du bloc a échoué : {REASON}',
  [BrightChainStrings.Error_BlockValidationError_ActualDataLengthUnknown]:
    'La longueur réelle des données est inconnue',
  [BrightChainStrings.Error_BlockValidationError_AddressCountExceedsCapacity]:
    "Le nombre d'adresses dépasse la capacité du bloc",
  [BrightChainStrings.Error_BlockValidationError_BlockDataNotBuffer]:
    'Block.data doit être un tampon',
  [BrightChainStrings.Error_BlockValidationError_BlockSizeNegative]:
    'La taille du bloc doit être un nombre positif',
  [BrightChainStrings.Error_BlockValidationError_CreatorIDMismatch]:
    "Incompatibilité de l'ID du créateur",
  [BrightChainStrings.Error_BlockValidationError_DataBufferIsTruncated]:
    'Le tampon de données est tronqué',
  [BrightChainStrings.Error_BlockValidationError_DataCannotBeEmpty]:
    'Les données ne peuvent pas être vides',
  [BrightChainStrings.Error_BlockValidationError_DataLengthExceedsCapacity]:
    'La longueur des données dépasse la capacité du bloc',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShort]:
    "Données trop courtes pour contenir l'en-tête de chiffrement",
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForCBLHeader]:
    "Données trop courtes pour l'en-tête CBL",
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForEncryptedCBL]:
    'Données trop courtes pour le CBL chiffré',
  [BrightChainStrings.Error_BlockValidationError_EphemeralBlockOnlySupportsBufferData]:
    'EphemeralBlock ne prend en charge que les données Buffer',
  [BrightChainStrings.Error_BlockValidationError_FutureCreationDate]:
    'La date de création du bloc ne peut pas être dans le futur',
  [BrightChainStrings.Error_BlockValidationError_InvalidAddressLengthTemplate]:
    "Longueur d'adresse invalide à l'index {INDEX} : {LENGTH}, attendu : {EXPECTED_LENGTH}",
  [BrightChainStrings.Error_BlockValidationError_InvalidAuthTagLength]:
    "Longueur de balise d'authentification invalide",
  [BrightChainStrings.Error_BlockValidationError_InvalidBlockTypeTemplate]:
    'Type de bloc invalide : {TYPE}',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLAddressCount]:
    "Le nombre d'adresses CBL doit être un multiple de TupleSize",
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLDataLength]:
    'Longueur de données CBL invalide',
  [BrightChainStrings.Error_BlockValidationError_InvalidDateCreated]:
    'Date de création invalide',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionHeaderLength]:
    "Longueur de l'en-tête de chiffrement invalide",
  [BrightChainStrings.Error_BlockValidationError_InvalidEphemeralPublicKeyLength]:
    'Longueur de clé publique éphémère invalide',
  [BrightChainStrings.Error_BlockValidationError_InvalidIVLength]:
    'Longueur IV invalide',
  [BrightChainStrings.Error_BlockValidationError_InvalidSignature]:
    'Signature invalide fournie',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientIds]:
    'Identifiants de destinataires invalides',
  [BrightChainStrings.Error_BlockValidationError_InvalidTupleSizeTemplate]:
    'La taille du tuple doit être comprise entre {TUPLE_MIN_SIZE} et {TUPLE_MAX_SIZE}',
  [BrightChainStrings.Error_BlockValidationError_MethodMustBeImplementedByDerivedClass]:
    'La méthode doit être implémentée par la classe dérivée',
  [BrightChainStrings.Error_BlockValidationError_NoChecksum]:
    "Aucune somme de contrôle n'a été fournie",
  [BrightChainStrings.Error_BlockValidationError_OriginalDataLengthNegative]:
    'La longueur des données originales ne peut pas être négative',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionType]:
    'Type de chiffrement invalide',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientCount]:
    'Nombre de destinataires invalide',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientKeys]:
    'Clés de destinataires invalides',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientNotFoundInRecipients]:
    'Destinataire de chiffrement non trouvé dans les destinataires',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientHasNoPrivateKey]:
    "Le destinataire de chiffrement n'a pas de clé privée",
  [BrightChainStrings.Error_BlockValidationError_InvalidCreator]:
    'Créateur invalide',
  [BrightChainStrings.Error_BufferError_InvalidBufferTypeTemplate]:
    'Type de tampon invalide. Attendu Buffer, obtenu : {TYPE}',
  [BrightChainStrings.Error_Checksum_MismatchTemplate]:
    'Incompatibilité de somme de contrôle : attendu {EXPECTED}, obtenu {CHECKSUM}',
  [BrightChainStrings.Error_BlockSize_InvalidTemplate]:
    'Taille de bloc invalide : {BLOCK_SIZE}',
  [BrightChainStrings.Error_Credentials_Invalid]:
    "Informations d'identification invalides.",

  // Isolated Key Errors
  [BrightChainStrings.Error_IsolatedKeyError_InvalidPublicKey]:
    'Clé publique invalide : doit être une clé isolée',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyId]:
    "Violation de l'isolation des clés : ID de clé invalide",
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyFormat]:
    'Format de clé invalide',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyLength]:
    'Longueur de clé invalide',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyType]:
    'Type de clé invalide',
  [BrightChainStrings.Error_IsolatedKeyError_KeyIsolationViolation]:
    "Violation de l'isolation des clés : textes chiffrés provenant de différentes instances de clés",

  // Block Service Errors
  [BrightChainStrings.Error_BlockServiceError_BlockWhitenerCountMismatch]:
    'Le nombre de blocs et de blanchisseurs doit être identique',
  [BrightChainStrings.Error_BlockServiceError_EmptyBlocksArray]:
    'Le tableau de blocs ne doit pas être vide',
  [BrightChainStrings.Error_BlockServiceError_BlockSizeMismatch]:
    'Tous les blocs doivent avoir la même taille de bloc',
  [BrightChainStrings.Error_BlockServiceError_NoWhitenersProvided]:
    'Aucun blanchisseur fourni',
  [BrightChainStrings.Error_BlockServiceError_AlreadyInitialized]:
    'Le sous-système BlockService est déjà initialisé',
  [BrightChainStrings.Error_BlockServiceError_Uninitialized]:
    "Le sous-système BlockService n'est pas initialisé",
  [BrightChainStrings.Error_BlockServiceError_BlockAlreadyExistsTemplate]:
    'Le bloc existe déjà : {ID}',
  [BrightChainStrings.Error_BlockServiceError_RecipientRequiredForEncryption]:
    'Un destinataire est requis pour le chiffrement',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileLength]:
    'Impossible de déterminer la longueur du fichier',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineBlockSize]:
    'Impossible de déterminer la taille du bloc',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileName]:
    'Impossible de déterminer le nom du fichier',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineMimeType]:
    'Impossible de déterminer le type MIME',
  [BrightChainStrings.Error_BlockServiceError_FilePathNotProvided]:
    'Chemin du fichier non fourni',
  [BrightChainStrings.Error_BlockServiceError_UnableToDetermineBlockSize]:
    'Impossible de déterminer la taille du bloc',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockData]:
    'Données de bloc invalides',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockType]:
    'Type de bloc invalide',

  // Quorum Errors
  [BrightChainStrings.Error_QuorumError_InvalidQuorumId]:
    'ID de quorum invalide',
  [BrightChainStrings.Error_QuorumError_DocumentNotFound]:
    'Document non trouvé',
  [BrightChainStrings.Error_QuorumError_UnableToRestoreDocument]:
    'Impossible de restaurer le document',
  [BrightChainStrings.Error_QuorumError_NotImplemented]: 'Non implémenté',
  [BrightChainStrings.Error_QuorumError_Uninitialized]:
    "Le sous-système Quorum n'est pas initialisé",
  [BrightChainStrings.Error_QuorumError_MemberNotFound]: 'Membre non trouvé',
  [BrightChainStrings.Error_QuorumError_NotEnoughMembers]:
    "Pas assez de membres pour l'opération de quorum",

  // System Keyring Errors
  [BrightChainStrings.Error_SystemKeyringError_KeyNotFoundTemplate]:
    'Clé {KEY} non trouvée',
  [BrightChainStrings.Error_SystemKeyringError_RateLimitExceeded]:
    'Limite de débit dépassée',

  // FEC Errors
  [BrightChainStrings.Error_FecError_InputBlockRequired]:
    "Le bloc d'entrée est requis",
  [BrightChainStrings.Error_FecError_DamagedBlockRequired]:
    'Le bloc endommagé est requis',
  [BrightChainStrings.Error_FecError_ParityBlocksRequired]:
    'Les blocs de parité sont requis',
  [BrightChainStrings.Error_FecError_InvalidParityBlockSizeTemplate]:
    'Taille de bloc de parité invalide : attendu {EXPECTED_SIZE}, obtenu {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InvalidRecoveredBlockSizeTemplate]:
    'Taille de bloc récupéré invalide : attendu {EXPECTED_SIZE}, obtenu {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InputDataMustBeBuffer]:
    "Les données d'entrée doivent être un Buffer",
  [BrightChainStrings.Error_FecError_BlockSizeMismatch]:
    'Les tailles de bloc doivent correspondre',
  [BrightChainStrings.Error_FecError_DamagedBlockDataMustBeBuffer]:
    'Les données du bloc endommagé doivent être un Buffer',
  [BrightChainStrings.Error_FecError_ParityBlockDataMustBeBuffer]:
    'Les données du bloc de parité doivent être un Buffer',

  // ECIES Errors
  [BrightChainStrings.Error_EciesError_InvalidBlockType]:
    "Type de bloc invalide pour l'opération ECIES",

  // Voting Derivation Errors
  [BrightChainStrings.Error_VotingDerivationError_FailedToGeneratePrime]:
    'Échec de la génération du nombre premier après le nombre maximum de tentatives',
  [BrightChainStrings.Error_VotingDerivationError_IdenticalPrimes]:
    'Nombres premiers identiques générés',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairTooSmallTemplate]:
    'Paire de clés générée trop petite : {ACTUAL_BITS} bits < {REQUIRED_BITS} bits',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairValidationFailed]:
    'La validation de la paire de clés a échoué',
  [BrightChainStrings.Error_VotingDerivationError_ModularInverseDoesNotExist]:
    "L'inverse modulaire multiplicatif n'existe pas",
  [BrightChainStrings.Error_VotingDerivationError_PrivateKeyMustBeBuffer]:
    'La clé privée doit être un Buffer',
  [BrightChainStrings.Error_VotingDerivationError_PublicKeyMustBeBuffer]:
    'La clé publique doit être un Buffer',
  [BrightChainStrings.Error_VotingDerivationError_InvalidPublicKeyFormat]:
    'Format de clé publique invalide',
  [BrightChainStrings.Error_VotingDerivationError_InvalidEcdhKeyPair]:
    'Paire de clés ECDH invalide',
  [BrightChainStrings.Error_VotingDerivationError_FailedToDeriveVotingKeysTemplate]:
    'Échec de la dérivation des clés de vote : {ERROR}',

  // Voting Errors
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPublicKeyNotIsolated]:
    'Paire de clés invalide : la clé publique doit être isolée',
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPrivateKeyNotIsolated]:
    'Paire de clés invalide : la clé privée doit être isolée',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyNotIsolated]:
    'Clé publique invalide : doit être une clé isolée',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferTooShort]:
    'Tampon de clé publique invalide : trop court',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferWrongMagic]:
    'Tampon de clé publique invalide : magic incorrect',
  [BrightChainStrings.Error_VotingError_UnsupportedPublicKeyVersion]:
    'Version de clé publique non prise en charge',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferIncompleteN]:
    'Tampon de clé publique invalide : valeur n incomplète',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferFailedToParseNTemplate]:
    "Tampon de clé publique invalide : échec de l'analyse de n : {ERROR}",
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyIdMismatch]:
    "Clé publique invalide : incompatibilité de l'ID de clé",
  [BrightChainStrings.Error_VotingError_ModularInverseDoesNotExist]:
    "L'inverse modulaire multiplicatif n'existe pas",
  [BrightChainStrings.Error_VotingError_PrivateKeyMustBeBuffer]:
    'La clé privée doit être un Buffer',
  [BrightChainStrings.Error_VotingError_PublicKeyMustBeBuffer]:
    'La clé publique doit être un Buffer',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyFormat]:
    'Format de clé publique invalide',
  [BrightChainStrings.Error_VotingError_InvalidEcdhKeyPair]:
    'Paire de clés ECDH invalide',
  [BrightChainStrings.Error_VotingError_FailedToDeriveVotingKeysTemplate]:
    'Échec de la dérivation des clés de vote : {ERROR}',
  [BrightChainStrings.Error_VotingError_FailedToGeneratePrime]:
    'Échec de la génération du nombre premier après le nombre maximum de tentatives',
  [BrightChainStrings.Error_VotingError_IdenticalPrimes]:
    'Nombres premiers identiques générés',
  [BrightChainStrings.Error_VotingError_KeyPairTooSmallTemplate]:
    'Paire de clés générée trop petite : {ACTUAL_BITS} bits < {REQUIRED_BITS} bits',
  [BrightChainStrings.Error_VotingError_KeyPairValidationFailed]:
    'La validation de la paire de clés a échoué',
  [BrightChainStrings.Error_VotingError_InvalidVotingKey]:
    'Clé de vote invalide',
  [BrightChainStrings.Error_VotingError_InvalidKeyPair]:
    'Paire de clés invalide',
  [BrightChainStrings.Error_VotingError_InvalidPublicKey]:
    'Clé publique invalide',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKey]:
    'Clé privée invalide',
  [BrightChainStrings.Error_VotingError_InvalidEncryptedKey]:
    'Clé chiffrée invalide',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferTooShort]:
    'Tampon de clé privée invalide : trop court',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferWrongMagic]:
    'Tampon de clé privée invalide : magic incorrect',
  [BrightChainStrings.Error_VotingError_UnsupportedPrivateKeyVersion]:
    'Version de clé privée non prise en charge',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteLambda]:
    'Tampon de clé privée invalide : lambda incomplet',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMuLength]:
    'Tampon de clé privée invalide : longueur mu incomplète',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMu]:
    'Tampon de clé privée invalide : mu incomplet',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToParse]:
    "Tampon de clé privée invalide : échec de l'analyse",
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToCreate]:
    'Tampon de clé privée invalide : échec de la création',

  // Store Errors
  [BrightChainStrings.Error_StoreError_InvalidBlockMetadataTemplate]:
    'Métadonnées de bloc invalides : {ERROR}',
  [BrightChainStrings.Error_StoreError_KeyNotFoundTemplate]:
    'Clé non trouvée : {KEY}',
  [BrightChainStrings.Error_StoreError_StorePathRequired]:
    'Le chemin de stockage est requis',
  [BrightChainStrings.Error_StoreError_StorePathNotFound]:
    'Chemin de stockage non trouvé',
  [BrightChainStrings.Error_StoreError_BlockSizeRequired]:
    'La taille du bloc est requise',
  [BrightChainStrings.Error_StoreError_BlockIdRequired]:
    "L'ID du bloc est requis",
  [BrightChainStrings.Error_StoreError_InvalidBlockIdTooShort]:
    'ID de bloc invalide : trop court',
  [BrightChainStrings.Error_StoreError_BlockFileSizeMismatch]:
    'Incompatibilité de taille de fichier bloc',
  [BrightChainStrings.Error_StoreError_BlockValidationFailed]:
    'La validation du bloc a échoué',
  [BrightChainStrings.Error_StoreError_BlockPathAlreadyExistsTemplate]:
    'Le chemin du bloc {PATH} existe déjà',
  [BrightChainStrings.Error_StoreError_BlockAlreadyExists]:
    'Le bloc existe déjà',
  [BrightChainStrings.Error_StoreError_NoBlocksProvided]: 'Aucun bloc fourni',
  [BrightChainStrings.Error_StoreError_CannotStoreEphemeralData]:
    'Impossible de stocker des données structurées éphémères',
  [BrightChainStrings.Error_StoreError_BlockIdMismatchTemplate]:
    "La clé {KEY} ne correspond pas à l'ID du bloc {BLOCK_ID}",
  [BrightChainStrings.Error_StoreError_BlockSizeMismatch]:
    'La taille du bloc ne correspond pas à la taille du bloc du magasin',
  [BrightChainStrings.Error_StoreError_BlockDirectoryCreationFailedTemplate]:
    'Échec de la création du répertoire de bloc : {ERROR}',
  [BrightChainStrings.Error_StoreError_BlockDeletionFailedTemplate]:
    'Échec de la suppression du bloc : {ERROR}',
  [BrightChainStrings.Error_StoreError_NotImplemented]:
    'Opération non implémentée',
  [BrightChainStrings.Error_StoreError_InsufficientRandomBlocksTemplate]:
    'Blocs aléatoires insuffisants disponibles : demandé {REQUESTED}, disponible {AVAILABLE}',

  // Sealing Errors
  [BrightChainStrings.Error_SealingError_MissingPrivateKeys]:
    "Tous les membres n'ont pas leurs clés privées chargées",
  [BrightChainStrings.Error_SealingError_MemberNotFound]: 'Membre non trouvé',
  [BrightChainStrings.Error_SealingError_TooManyMembersToUnlock]:
    'Trop de membres pour déverrouiller le document',
  [BrightChainStrings.Error_SealingError_NotEnoughMembersToUnlock]:
    'Pas assez de membres pour déverrouiller le document',
  [BrightChainStrings.Error_SealingError_EncryptedShareNotFound]:
    'Part chiffrée non trouvée',
  [BrightChainStrings.Error_SealingError_InvalidBitRange]:
    'Les bits doivent être compris entre 3 et 20',
  [BrightChainStrings.Error_SealingError_InvalidMemberArray]:
    'amongstMembers doit être un tableau de Member',
  [BrightChainStrings.Error_SealingError_FailedToSealTemplate]:
    'Échec du scellement du document : {ERROR}',

  // CBL Errors
  [BrightChainStrings.Error_CblError_BlockNotReadable]:
    'Le bloc ne peut pas être lu',
  [BrightChainStrings.Error_CblError_CblRequired]: 'CBL est requis',
  [BrightChainStrings.Error_CblError_WhitenedBlockFunctionRequired]:
    'La fonction getWhitenedBlock est requise',
  [BrightChainStrings.Error_CblError_FailedToLoadBlock]:
    'Échec du chargement du bloc',
  [BrightChainStrings.Error_CblError_ExpectedEncryptedDataBlock]:
    'Bloc de données chiffré attendu',
  [BrightChainStrings.Error_CblError_ExpectedOwnedDataBlock]:
    'Bloc de données propriétaire attendu',
  [BrightChainStrings.Error_CblError_InvalidStructure]:
    'Structure CBL invalide',
  [BrightChainStrings.Error_CblError_CreatorUndefined]:
    'Le créateur ne peut pas être undefined',
  [BrightChainStrings.Error_CblError_CreatorRequiredForSignature]:
    'Le créateur est requis pour la validation de la signature',
  [BrightChainStrings.Error_CblError_InvalidCreatorId]:
    'ID de créateur invalide',
  [BrightChainStrings.Error_CblError_FileNameRequired]:
    'Le nom de fichier est requis',
  [BrightChainStrings.Error_CblError_FileNameEmpty]:
    'Le nom de fichier ne peut pas être vide',
  [BrightChainStrings.Error_CblError_FileNameWhitespace]:
    'Le nom de fichier ne peut pas commencer ou se terminer par des espaces',
  [BrightChainStrings.Error_CblError_FileNameInvalidChar]:
    'Le nom de fichier contient un caractère invalide',
  [BrightChainStrings.Error_CblError_FileNameControlChars]:
    'Le nom de fichier contient des caractères de contrôle',
  [BrightChainStrings.Error_CblError_FileNamePathTraversal]:
    'Le nom de fichier ne peut pas contenir de traversée de chemin',
  [BrightChainStrings.Error_CblError_MimeTypeRequired]:
    'Le type MIME est requis',
  [BrightChainStrings.Error_CblError_MimeTypeEmpty]:
    'Le type MIME ne peut pas être vide',
  [BrightChainStrings.Error_CblError_MimeTypeWhitespace]:
    'Le type MIME ne peut pas commencer ou se terminer par des espaces',
  [BrightChainStrings.Error_CblError_MimeTypeLowercase]:
    'Le type MIME doit être en minuscules',
  [BrightChainStrings.Error_CblError_MimeTypeInvalidFormat]:
    'Format de type MIME invalide',
  [BrightChainStrings.Error_CblError_InvalidBlockSize]:
    'Taille de bloc invalide',
  [BrightChainStrings.Error_CblError_MetadataSizeExceeded]:
    'La taille des métadonnées dépasse la taille maximale autorisée',
  [BrightChainStrings.Error_CblError_MetadataSizeNegative]:
    'La taille totale des métadonnées ne peut pas être négative',
  [BrightChainStrings.Error_CblError_InvalidMetadataBuffer]:
    'Tampon de métadonnées invalide',
  [BrightChainStrings.Error_CblError_CreationFailedTemplate]:
    'Échec de la création du bloc CBL : {ERROR}',
  [BrightChainStrings.Error_CblError_InsufficientCapacityTemplate]:
    'La taille du bloc ({BLOCK_SIZE}) est trop petite pour contenir les données CBL ({DATA_SIZE})',
  [BrightChainStrings.Error_CblError_NotExtendedCbl]: "N'est pas un CBL étendu",
  [BrightChainStrings.Error_CblError_InvalidSignature]:
    'Signature CBL invalide',
  [BrightChainStrings.Error_CblError_CreatorIdMismatch]:
    "Incompatibilité de l'ID du créateur",
  [BrightChainStrings.Error_CblError_FileSizeTooLarge]:
    'Taille de fichier trop grande',
  [BrightChainStrings.Error_CblError_FileSizeTooLargeForNode]:
    'Taille de fichier supérieure au maximum autorisé pour le nœud actuel',
  [BrightChainStrings.Error_CblError_InvalidTupleSize]:
    'Taille de tuple invalide',
  [BrightChainStrings.Error_CblError_FileNameTooLong]:
    'Nom de fichier trop long',
  [BrightChainStrings.Error_CblError_MimeTypeTooLong]: 'Type MIME trop long',
  [BrightChainStrings.Error_CblError_AddressCountExceedsCapacity]:
    "Le nombre d'adresses dépasse la capacité du bloc",
  [BrightChainStrings.Error_CblError_CblEncrypted]:
    'CBL est chiffré. Déchiffrez avant utilisation.',
  [BrightChainStrings.Error_CblError_UserRequiredForDecryption]:
    "L'utilisateur est requis pour le déchiffrement",
  [BrightChainStrings.Error_CblError_NotASuperCbl]: "N'est pas un super CBL",
  [BrightChainStrings.Error_CblError_FailedToExtractCreatorId]:
    "Échec de l'extraction des octets d'ID du créateur à partir de l'en-tête CBL",
  [BrightChainStrings.Error_CblError_FailedToExtractProvidedCreatorId]:
    "Échec de l'extraction des octets d'ID du membre à partir du créateur fourni",

  // Multi-Encrypted Errors
  [BrightChainStrings.Error_MultiEncryptedError_InvalidEphemeralPublicKeyLength]:
    'Longueur de clé publique éphémère invalide',
  [BrightChainStrings.Error_MultiEncryptedError_DataLengthExceedsCapacity]:
    'La longueur des données dépasse la capacité du bloc',
  [BrightChainStrings.Error_MultiEncryptedError_BlockNotReadable]:
    'Le bloc ne peut pas être lu',
  [BrightChainStrings.Error_MultiEncryptedError_DataTooShort]:
    "Données trop courtes pour contenir l'en-tête de chiffrement",
  [BrightChainStrings.Error_MultiEncryptedError_CreatorMustBeMember]:
    'Le créateur doit être un Member',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidIVLength]:
    'Longueur IV invalide',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidAuthTagLength]:
    "Longueur de balise d'authentification invalide",
  [BrightChainStrings.Error_MultiEncryptedError_ChecksumMismatch]:
    'Incompatibilité de somme de contrôle',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientMismatch]:
    "La liste des destinataires ne correspond pas au nombre de destinataires de l'en-tête",
  [BrightChainStrings.Error_MultiEncryptedError_RecipientsAlreadyLoaded]:
    'Les destinataires sont déjà chargés',

  // Block Errors
  [BrightChainStrings.Error_BlockError_CreatorRequired]:
    'Le créateur est requis',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsCapacity]:
    'La longueur des données dépasse la capacité du bloc',
  [BrightChainStrings.Error_BlockError_DataRequired]:
    'Les données sont requises',
  [BrightChainStrings.Error_BlockError_ActualDataLengthExceedsDataLength]:
    'La longueur réelle des données ne peut pas dépasser la longueur des données',
  [BrightChainStrings.Error_BlockError_ActualDataLengthNegative]:
    'La longueur réelle des données doit être positive',
  [BrightChainStrings.Error_BlockError_CreatorRequiredForEncryption]:
    'Le créateur est requis pour le chiffrement',
  [BrightChainStrings.Error_BlockError_UnexpectedEncryptedBlockType]:
    'Type de bloc chiffré inattendu',
  [BrightChainStrings.Error_BlockError_CannotEncrypt]:
    'Le bloc ne peut pas être chiffré',
  [BrightChainStrings.Error_BlockError_CannotDecrypt]:
    'Le bloc ne peut pas être déchiffré',
  [BrightChainStrings.Error_BlockError_CreatorPrivateKeyRequired]:
    'La clé privée du créateur est requise',
  [BrightChainStrings.Error_BlockError_InvalidMultiEncryptionRecipientCount]:
    'Nombre de destinataires de multi-chiffrement invalide',
  [BrightChainStrings.Error_BlockError_InvalidNewBlockType]:
    'Nouveau type de bloc invalide',
  [BrightChainStrings.Error_BlockError_UnexpectedEphemeralBlockType]:
    'Type de bloc éphémère inattendu',
  [BrightChainStrings.Error_BlockError_RecipientRequired]:
    'Destinataire requis',
  [BrightChainStrings.Error_BlockError_RecipientKeyRequired]:
    'Clé privée du destinataire requise',
  [BrightChainStrings.Error_BlockError_DataLengthMustMatchBlockSize]:
    'La longueur des données doit correspondre à la taille du bloc',

  // Whitened Errors
  [BrightChainStrings.Error_WhitenedError_BlockNotReadable]:
    'Le bloc ne peut pas être lu',
  [BrightChainStrings.Error_WhitenedError_BlockSizeMismatch]:
    'Les tailles de bloc doivent correspondre',
  [BrightChainStrings.Error_WhitenedError_DataLengthMismatch]:
    'Les longueurs des données et des données aléatoires doivent correspondre',
  [BrightChainStrings.Error_WhitenedError_InvalidBlockSize]:
    'Taille de bloc invalide',

  // Tuple Errors
  [BrightChainStrings.Error_TupleError_InvalidTupleSize]:
    'Taille de tuple invalide',
  [BrightChainStrings.Error_TupleError_BlockSizeMismatch]:
    'Tous les blocs du tuple doivent avoir la même taille',
  [BrightChainStrings.Error_TupleError_NoBlocksToXor]: 'Aucun bloc à XOR',
  [BrightChainStrings.Error_TupleError_InvalidBlockCount]:
    'Nombre de blocs invalide pour le tuple',
  [BrightChainStrings.Error_TupleError_InvalidBlockType]:
    'Type de bloc invalide',
  [BrightChainStrings.Error_TupleError_InvalidSourceLength]:
    'La longueur source doit être positive',
  [BrightChainStrings.Error_TupleError_RandomBlockGenerationFailed]:
    'Échec de la génération du bloc aléatoire',
  [BrightChainStrings.Error_TupleError_WhiteningBlockGenerationFailed]:
    'Échec de la génération du bloc de blanchiment',
  [BrightChainStrings.Error_TupleError_MissingParameters]:
    'Tous les paramètres sont requis',
  [BrightChainStrings.Error_TupleError_XorOperationFailedTemplate]:
    'Échec du XOR des blocs : {ERROR}',
  [BrightChainStrings.Error_TupleError_DataStreamProcessingFailedTemplate]:
    'Échec du traitement du flux de données : {ERROR}',
  [BrightChainStrings.Error_TupleError_EncryptedDataStreamProcessingFailedTemplate]:
    'Échec du traitement du flux de données chiffré : {ERROR}',

  // Memory Tuple Errors
  [BrightChainStrings.Error_MemoryTupleError_InvalidTupleSizeTemplate]:
    'Le tuple doit avoir {TUPLE_SIZE} blocs',
  [BrightChainStrings.Error_MemoryTupleError_BlockSizeMismatch]:
    'Tous les blocs du tuple doivent avoir la même taille',
  [BrightChainStrings.Error_MemoryTupleError_NoBlocksToXor]: 'Aucun bloc à XOR',
  [BrightChainStrings.Error_MemoryTupleError_InvalidBlockCount]:
    'Nombre de blocs invalide pour le tuple',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlockIdsTemplate]:
    '{TUPLE_SIZE} IDs de bloc attendus',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlocksTemplate]:
    '{TUPLE_SIZE} blocs attendus',

  // Handle Tuple Errors
  [BrightChainStrings.Error_HandleTupleError_InvalidTupleSizeTemplate]:
    'Taille de tuple invalide ({TUPLE_SIZE})',
  [BrightChainStrings.Error_HandleTupleError_BlockSizeMismatch]:
    'Tous les blocs du tuple doivent avoir la même taille',
  [BrightChainStrings.Error_HandleTupleError_NoBlocksToXor]: 'Aucun bloc à XOR',
  [BrightChainStrings.Error_HandleTupleError_BlockSizesMustMatch]:
    'Les tailles de bloc doivent correspondre',

  // Stream Errors
  [BrightChainStrings.Error_StreamError_BlockSizeRequired]:
    'La taille du bloc est requise',
  [BrightChainStrings.Error_StreamError_WhitenedBlockSourceRequired]:
    'La source de bloc blanchi est requise',
  [BrightChainStrings.Error_StreamError_RandomBlockSourceRequired]:
    'La source de bloc aléatoire est requise',
  [BrightChainStrings.Error_StreamError_InputMustBeBuffer]:
    "L'entrée doit être un tampon",
  [BrightChainStrings.Error_StreamError_FailedToGetRandomBlock]:
    "Échec de l'obtention du bloc aléatoire",
  [BrightChainStrings.Error_StreamError_FailedToGetWhiteningBlock]:
    "Échec de l'obtention du bloc de blanchiment/aléatoire",
  [BrightChainStrings.Error_StreamError_IncompleteEncryptedBlock]:
    'Bloc chiffré incomplet',

  // Member Errors
  [BrightChainStrings.Error_MemberError_InsufficientRandomBlocks]:
    'Blocs aléatoires insuffisants.',
  [BrightChainStrings.Error_MemberError_FailedToCreateMemberBlocks]:
    'Échec de la création des blocs de membre.',
  [BrightChainStrings.Error_MemberError_InvalidMemberBlocks]:
    'Blocs de membre invalides.',
  [BrightChainStrings.Error_MemberError_PrivateKeyRequiredToDeriveVotingKeyPair]:
    'Clé privée requise pour dériver la paire de clés de vote.',

  // General Errors
  [BrightChainStrings.Error_Hydration_FailedToHydrateTemplate]:
    "Échec de l'hydratation : {ERROR}",
  [BrightChainStrings.Error_Serialization_FailedToSerializeTemplate]:
    'Échec de la sérialisation : {ERROR}',
  [BrightChainStrings.Error_Checksum_Invalid]: 'Somme de contrôle invalide.',
  [BrightChainStrings.Error_Creator_Invalid]: 'Créateur invalide.',
  [BrightChainStrings.Error_ID_InvalidFormat]: "Format d'ID invalide.",
  [BrightChainStrings.Error_TupleCount_InvalidTemplate]:
    'Nombre de tuples invalide ({TUPLE_COUNT}), doit être compris entre {TUPLE_MIN_SIZE} et {TUPLE_MAX_SIZE}',
  [BrightChainStrings.Error_References_Invalid]: 'Références invalides.',
  [BrightChainStrings.Error_SessionID_Invalid]: 'ID de session invalide.',
  [BrightChainStrings.Error_Signature_Invalid]: 'Signature invalide.',
  [BrightChainStrings.Error_Metadata_Mismatch]:
    'Incompatibilité de métadonnées.',
  [BrightChainStrings.Error_Token_Expired]: 'Jeton expiré.',
  [BrightChainStrings.Error_Token_Invalid]: 'Jeton invalide.',
  [BrightChainStrings.Error_Unexpected_Error]:
    "Une erreur inattendue s'est produite.",
  [BrightChainStrings.Error_User_NotFound]: 'Utilisateur non trouvé.',
  [BrightChainStrings.Error_Validation_Error]: 'Erreur de validation.',
  [BrightChainStrings.Error_Capacity_Insufficient]: 'Capacité insuffisante.',
  [BrightChainStrings.Error_Implementation_NotImplemented]: 'Non implémenté.',

  // Block Sizes
  [BrightChainStrings.BlockSize_Unknown]: 'Inconnu',
  [BrightChainStrings.BlockSize_Message]: 'Message',
  [BrightChainStrings.BlockSize_Tiny]: 'Minuscule',
  [BrightChainStrings.BlockSize_Small]: 'Petit',
  [BrightChainStrings.BlockSize_Medium]: 'Moyen',
  [BrightChainStrings.BlockSize_Large]: 'Grand',
  [BrightChainStrings.BlockSize_Huge]: 'Énorme',

  // Document Errors
  [BrightChainStrings.Error_DocumentError_InvalidValueTemplate]:
    'Valeur invalide pour {KEY}',
  [BrightChainStrings.Error_DocumentError_FieldRequiredTemplate]:
    'Le champ {KEY} est requis.',
  [BrightChainStrings.Error_DocumentError_AlreadyInitialized]:
    'Le sous-système de document est déjà initialisé',
  [BrightChainStrings.Error_DocumentError_Uninitialized]:
    "Le sous-système de document n'est pas initialisé",

  // XOR Service Errors
  [BrightChainStrings.Error_Xor_LengthMismatchTemplate]:
    'XOR nécessite des tableaux de longueur égale : a.length={A_LENGTH}, b.length={B_LENGTH}',
  [BrightChainStrings.Error_Xor_NoArraysProvided]:
    'Au moins un tableau doit être fourni pour XOR',
  [BrightChainStrings.Error_Xor_ArrayLengthMismatchTemplate]:
    "Tous les tableaux doivent avoir la même longueur. Attendu : {EXPECTED_LENGTH}, obtenu : {ACTUAL_LENGTH} à l'index {INDEX}",
  [BrightChainStrings.Error_Xor_CryptoApiNotAvailable]:
    "L'API Crypto n'est pas disponible dans cet environnement",

  // Tuple Storage Service Errors
  [BrightChainStrings.Error_TupleStorage_DataExceedsBlockSizeTemplate]:
    'La taille des données ({DATA_SIZE}) dépasse la taille du bloc ({BLOCK_SIZE})',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetProtocol]:
    'Protocole magnet invalide. "magnet:" attendu',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetType]:
    'Type de magnet invalide. "brightchain" attendu',
  [BrightChainStrings.Error_TupleStorage_MissingMagnetParameters]:
    'Paramètres magnet requis manquants',

  // Location Record Errors
  [BrightChainStrings.Error_LocationRecord_NodeIdRequired]:
    "L'identifiant du nœud est requis",
  [BrightChainStrings.Error_LocationRecord_LastSeenRequired]:
    "L'horodatage de la dernière vue est requis",
  [BrightChainStrings.Error_LocationRecord_IsAuthoritativeRequired]:
    'Le drapeau isAuthoritative est requis',
  [BrightChainStrings.Error_LocationRecord_InvalidLastSeenDate]:
    'Date de dernière vue invalide',
  [BrightChainStrings.Error_LocationRecord_InvalidLatencyMs]:
    'La latence doit être un nombre non négatif',

  // Metadata Errors
  [BrightChainStrings.Error_Metadata_BlockIdRequired]:
    "L'identifiant du bloc est requis",
  [BrightChainStrings.Error_Metadata_CreatedAtRequired]:
    "L'horodatage de création est requis",
  [BrightChainStrings.Error_Metadata_LastAccessedAtRequired]:
    "L'horodatage du dernier accès est requis",
  [BrightChainStrings.Error_Metadata_LocationUpdatedAtRequired]:
    "L'horodatage de mise à jour de l'emplacement est requis",
  [BrightChainStrings.Error_Metadata_InvalidCreatedAtDate]:
    'Date de création invalide',
  [BrightChainStrings.Error_Metadata_InvalidLastAccessedAtDate]:
    'Date du dernier accès invalide',
  [BrightChainStrings.Error_Metadata_InvalidLocationUpdatedAtDate]:
    "Date de mise à jour de l'emplacement invalide",
  [BrightChainStrings.Error_Metadata_InvalidExpiresAtDate]:
    "Date d'expiration invalide",
  [BrightChainStrings.Error_Metadata_InvalidAvailabilityStateTemplate]:
    'État de disponibilité invalide : {STATE}',
  [BrightChainStrings.Error_Metadata_LocationRecordsMustBeArray]:
    "Les enregistrements d'emplacement doivent être un tableau",
  [BrightChainStrings.Error_Metadata_InvalidLocationRecordTemplate]:
    "Enregistrement d'emplacement invalide à l'index {INDEX}",
  [BrightChainStrings.Error_Metadata_InvalidAccessCount]:
    "Le nombre d'accès doit être un nombre non négatif",
  [BrightChainStrings.Error_Metadata_InvalidTargetReplicationFactor]:
    'Le facteur de réplication cible doit être un nombre positif',
  [BrightChainStrings.Error_Metadata_InvalidSize]:
    'La taille doit être un nombre non négatif',
  [BrightChainStrings.Error_Metadata_ParityBlockIdsMustBeArray]:
    'Les identifiants de blocs de parité doivent être un tableau',
  [BrightChainStrings.Error_Metadata_ReplicaNodeIdsMustBeArray]:
    'Les identifiants de nœuds de réplique doivent être un tableau',

  // Service Provider Errors
  [BrightChainStrings.Error_ServiceProvider_UseSingletonInstance]:
    'Utilisez ServiceProvider.getInstance() au lieu de créer une nouvelle instance',
  [BrightChainStrings.Error_ServiceProvider_NotInitialized]:
    "ServiceProvider n'a pas été initialisé",
  [BrightChainStrings.Error_ServiceLocator_NotSet]:
    "ServiceLocator n'a pas été défini",

  // Block Service Errors (additional)
  [BrightChainStrings.Error_BlockService_CannotEncrypt]:
    'Impossible de chiffrer le bloc',
  [BrightChainStrings.Error_BlockService_BlocksArrayEmpty]:
    'Le tableau de blocs ne doit pas être vide',
  [BrightChainStrings.Error_BlockService_BlockSizesMustMatch]:
    'Tous les blocs doivent avoir la même taille de bloc',

  // Message Router Errors
  [BrightChainStrings.Error_MessageRouter_MessageNotFoundTemplate]:
    'Message introuvable : {MESSAGE_ID}',

  // Browser Config Errors
  [BrightChainStrings.Error_BrowserConfig_NotImplementedTemplate]:
    "La méthode {METHOD} n'est pas implémentée dans l'environnement du navigateur",

  // Debug Errors
  [BrightChainStrings.Error_Debug_UnsupportedFormat]:
    'Format non pris en charge pour la sortie de débogage',

  // Secure Heap Storage Errors
  [BrightChainStrings.Error_SecureHeap_KeyNotFound]:
    'Clé introuvable dans le stockage de tas sécurisé',

  // I18n Errors
  [BrightChainStrings.Error_I18n_KeyConflictObjectTemplate]:
    'Conflit de clé détecté : {KEY} existe déjà dans {OBJECT}',
  [BrightChainStrings.Error_I18n_KeyConflictValueTemplate]:
    'Conflit de clé détecté : {KEY} a une valeur conflictuelle {VALUE}',
  [BrightChainStrings.Error_I18n_StringsNotFoundTemplate]:
    'Chaînes introuvables pour la langue : {LANGUAGE}',

  // Document Errors (additional)
  [BrightChainStrings.Error_Document_CreatorRequiredForSaving]:
    'Le créateur est requis pour enregistrer le document',
  [BrightChainStrings.Error_Document_CreatorRequiredForEncrypting]:
    'Le créateur est requis pour chiffrer le document',
  [BrightChainStrings.Error_Document_NoEncryptedData]:
    'Aucune donnée chiffrée disponible',
  [BrightChainStrings.Error_Document_FieldShouldBeArrayTemplate]:
    'Le champ {FIELD} doit être un tableau',
  [BrightChainStrings.Error_Document_InvalidArrayValueTemplate]:
    "Valeur de tableau invalide à l'index {INDEX} dans le champ {FIELD}",
  [BrightChainStrings.Error_Document_FieldRequiredTemplate]:
    'Le champ {FIELD} est requis',
  [BrightChainStrings.Error_Document_FieldInvalidTemplate]:
    'Le champ {FIELD} est invalide',
  [BrightChainStrings.Error_Document_InvalidValueTemplate]:
    'Valeur invalide pour le champ {FIELD}',
  [BrightChainStrings.Error_MemberDocument_PublicCblIdNotSet]:
    "L'identifiant CBL public n'a pas été défini",
  [BrightChainStrings.Error_MemberDocument_PrivateCblIdNotSet]:
    "L'identifiant CBL privé n'a pas été défini",
  [BrightChainStrings.Error_BaseMemberDocument_PublicCblIdNotSet]:
    "L'identifiant CBL public du document de membre de base n'a pas été défini",
  [BrightChainStrings.Error_BaseMemberDocument_PrivateCblIdNotSet]:
    "L'identifiant CBL privé du document de membre de base n'a pas été défini",
  [BrightChainStrings.Error_Document_InvalidValueInArrayTemplate]:
    'Valeur invalide dans le tableau pour {KEY}',
  [BrightChainStrings.Error_Document_FieldIsRequiredTemplate]:
    'Le champ {FIELD} est requis',
  [BrightChainStrings.Error_Document_FieldIsInvalidTemplate]:
    'Le champ {FIELD} est invalide',

  // SimpleBrightChain Errors
  [BrightChainStrings.Error_SimpleBrightChain_BlockNotFoundTemplate]:
    'Bloc non trouvé : {BLOCK_ID}',

  // Currency Code Errors
  [BrightChainStrings.Error_CurrencyCode_Invalid]: 'Code de devise invalide',

  // Console Output Warnings
  [BrightChainStrings.Warning_BufferUtils_InvalidBase64String]:
    'Chaîne base64 invalide fournie',
  [BrightChainStrings.Warning_Keyring_FailedToLoad]:
    'Échec du chargement du trousseau depuis le stockage',
  [BrightChainStrings.Warning_I18n_TranslationFailedTemplate]:
    'Échec de la traduction pour la clé {KEY}',

  // Console Output Errors
  [BrightChainStrings.Error_MemberStore_RollbackFailed]:
    "Échec de l'annulation de la transaction du magasin de membres",
  [BrightChainStrings.Error_MemberCblService_CreateMemberCblFailed]:
    'Échec de la création du CBL de membre',
  [BrightChainStrings.Error_MemberCblService_ChecksumMismatch]:
    "Incohérence de la somme de contrôle du bloc lors de la vérification de l'intégrité",
  [BrightChainStrings.Error_MemberCblService_BlockRetrievalFailed]:
    "Échec de la récupération du bloc lors de la vérification de l'intégrité",
  [BrightChainStrings.Error_MemberCblService_MissingRequiredFields]:
    'Les données du membre manquent des champs obligatoires',
  [BrightChainStrings.Error_DeliveryTimeout_HandleTimeoutFailedTemplate]:
    'Échec de la gestion du délai de livraison : {ERROR}',

  // Validator Errors
  [BrightChainStrings.Error_Validator_InvalidBlockSizeTemplate]:
    'Taille de bloc invalide : {BLOCK_SIZE}. Les tailles valides sont : {BLOCK_SIZES}',
  [BrightChainStrings.Error_Validator_InvalidBlockTypeTemplate]:
    'Type de bloc invalide : {BLOCK_TYPE}. Les types valides sont : {BLOCK_TYPES}',
  [BrightChainStrings.Error_Validator_InvalidEncryptionTypeTemplate]:
    'Type de chiffrement invalide : {ENCRYPTION_TYPE}. Les types valides sont : {ENCRYPTION_TYPES}',
  [BrightChainStrings.Error_Validator_RecipientCountMustBeAtLeastOne]:
    'Le nombre de destinataires doit être au moins 1 pour le chiffrement multi-destinataires',
  [BrightChainStrings.Error_Validator_RecipientCountMaximumTemplate]:
    'Le nombre de destinataires ne peut pas dépasser {MAXIMUM}',
  [BrightChainStrings.Error_Validator_FieldRequiredTemplate]:
    '{FIELD} est requis',
  [BrightChainStrings.Error_Validator_FieldCannotBeEmptyTemplate]:
    '{FIELD} ne peut pas être vide',

  // Miscellaneous Block Errors
  [BrightChainStrings.Error_BlockError_BlockSizesMustMatch]:
    'Les tailles de bloc doivent correspondre',
  [BrightChainStrings.Error_BlockError_DataCannotBeNullOrUndefined]:
    'Les données ne peuvent pas être null ou undefined',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsBlockSizeTemplate]:
    'La longueur des données ({LENGTH}) dépasse la taille du bloc ({BLOCK_SIZE})',

  // CPU Errors
  [BrightChainStrings.Error_CPU_DuplicateOpcodeErrorTemplate]:
    "Opcode 0x{OPCODE} en double dans le jeu d'instructions {INSTRUCTION_SET}",
  [BrightChainStrings.Error_CPU_NotImplementedTemplate]:
    "{INSTRUCTION} n'est pas implémenté",
  [BrightChainStrings.Error_CPU_InvalidReadSizeTemplate]:
    'Taille de lecture invalide : {SIZE}',
  [BrightChainStrings.Error_CPU_StackOverflow]: 'Débordement de pile',
  [BrightChainStrings.Error_CPU_StackUnderflow]: 'Sous-débordement de pile',

  // Member CBL Errors
  [BrightChainStrings.Error_MemberCBL_PublicCBLIdNotSet]:
    'ID CBL public non défini',
  [BrightChainStrings.Error_MemberCBL_PrivateCBLIdNotSet]:
    'ID CBL privé non défini',

  // Member Document Errors
  [BrightChainStrings.Error_MemberDocument_Hint]:
    'Utilisez MemberDocument.create() au lieu de new MemberDocument()',
  [BrightChainStrings.Error_MemberDocument_CBLNotGenerated]:
    "Les CBLs n'ont pas été générés. Appelez generateCBLs() avant d'appeler toMember()",

  // Member Profile Document Errors
  [BrightChainStrings.Error_MemberProfileDocument_Hint]:
    'Utilisez MemberProfileDocument.create() au lieu de new MemberProfileDocument()',

  // Quorum Document Errors
  [BrightChainStrings.Error_QuorumDocument_CreatorMustBeSetBeforeSaving]:
    "Le créateur doit être défini avant l'enregistrement",
  [BrightChainStrings.Error_QuorumDocument_CreatorMustBeSetBeforeEncrypting]:
    'Le créateur doit être défini avant le chiffrement',
  [BrightChainStrings.Error_QuorumDocument_DocumentHasNoEncryptedData]:
    "Le document n'a pas de données chiffrées",
  [BrightChainStrings.Error_QuorumDocument_InvalidEncryptedDataFormat]:
    'Format de données chiffrées invalide',
  [BrightChainStrings.Error_QuorumDocument_InvalidMemberIdsFormat]:
    'Format des identifiants de membres invalide',
  [BrightChainStrings.Error_QuorumDocument_InvalidSignatureFormat]:
    'Format de signature invalide',
  [BrightChainStrings.Error_QuorumDocument_InvalidCreatorIdFormat]:
    "Format d'identifiant du créateur invalide",
  [BrightChainStrings.Error_QuorumDocument_InvalidChecksumFormat]:
    'Format de somme de contrôle invalide',

  // Block Logger
  [BrightChainStrings.BlockLogger_Redacted]: 'MASQUÉ',

  // Member Schema Errors
  [BrightChainStrings.Error_MemberSchema_InvalidIdFormat]:
    "Format d'identifiant invalide",
  [BrightChainStrings.Error_MemberSchema_InvalidPublicKeyFormat]:
    'Format de clé publique invalide',
  [BrightChainStrings.Error_MemberSchema_InvalidVotingPublicKeyFormat]:
    'Format de clé publique de vote invalide',
  [BrightChainStrings.Error_MemberSchema_InvalidEmailFormat]:
    "Format d'adresse e-mail invalide",
  [BrightChainStrings.Error_MemberSchema_InvalidRecoveryDataFormat]:
    'Format de données de récupération invalide',
  [BrightChainStrings.Error_MemberSchema_InvalidTrustedPeersFormat]:
    'Format de pairs de confiance invalide',
  [BrightChainStrings.Error_MemberSchema_InvalidBlockedPeersFormat]:
    'Format de pairs bloqués invalide',
  [BrightChainStrings.Error_MemberSchema_InvalidActivityLogFormat]:
    "Format du journal d'activité invalide",

  // Message Metadata Schema Errors
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidRecipientsFormat]:
    'Format des destinataires invalide',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidPriorityFormat]:
    'Format de priorité invalide',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidDeliveryStatusFormat]:
    'Format du statut de livraison invalide',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidAcknowledgementsFormat]:
    'Format des accusés de réception invalide',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidCBLBlockIDsFormat]:
    'Format des identifiants de blocs CBL invalide',

  // Security
  [BrightChainStrings.Security_DOS_InputSizeExceedsLimitErrorTemplate]:
    "La taille d'entrée {SIZE} dépasse la limite {MAX_SIZE} pour {OPERATION}",
  [BrightChainStrings.Security_DOS_OperationExceededTimeLimitErrorTemplate]:
    "L'opération {OPERATION} a dépassé le délai de {MAX_TIME} ms",
  [BrightChainStrings.Security_RateLimiter_RateLimitExceededErrorTemplate]:
    'Limite de débit dépassée pour {OPERATION}',
  [BrightChainStrings.Security_AuditLogger_SignatureValidationResultTemplate]:
    'Validation de signature {RESULT}',
  [BrightChainStrings.Security_AuditLogger_Failure]: 'Échec',
  [BrightChainStrings.Security_AuditLogger_Success]: 'Succès',
  [BrightChainStrings.Security_AuditLogger_BlockCreated]: 'Bloc créé',
  [BrightChainStrings.Security_AuditLogger_EncryptionPerformed]:
    'Chiffrement effectué',
  [BrightChainStrings.Security_AuditLogger_DecryptionResultTemplate]:
    'Déchiffrement {RESULT}',
  [BrightChainStrings.Security_AuditLogger_AccessDeniedTemplate]:
    'Accès refusé à {RESOURCE}',
  [BrightChainStrings.Security_AuditLogger_Security]: 'Sécurité',

  // Delivery Timeout
  [BrightChainStrings.DeliveryTimeout_FailedToHandleTimeoutTemplate]:
    'Échec de la gestion du délai pour {MESSAGE_ID}:{RECIPIENT_ID}',

  // Message CBL Service
  [BrightChainStrings.MessageCBLService_MessageSizeExceedsMaximumTemplate]:
    'La taille du message {SIZE} dépasse le maximum {MAX_SIZE}',
  [BrightChainStrings.MessageCBLService_FailedToCreateMessageAfterRetries]:
    'Échec de la création du message après plusieurs tentatives',
  [BrightChainStrings.MessageCBLService_FailedToRetrieveMessageTemplate]:
    'Échec de la récupération du message {MESSAGE_ID}',
  [BrightChainStrings.MessageCBLService_MessageTypeIsRequired]:
    'Le type de message est requis',
  [BrightChainStrings.MessageCBLService_SenderIDIsRequired]:
    "L'identifiant de l'expéditeur est requis",
  [BrightChainStrings.MessageCBLService_RecipientCountExceedsMaximumTemplate]:
    'Le nombre de destinataires {COUNT} dépasse le maximum {MAXIMUM}',

  // Message Encryption Service
  [BrightChainStrings.MessageEncryptionService_NoRecipientPublicKeysProvided]:
    'Aucune clé publique de destinataire fournie',
  [BrightChainStrings.MessageEncryptionService_FailedToEncryptTemplate]:
    'Échec du chiffrement pour le destinataire {RECIPIENT_ID} : {ERROR}',
  [BrightChainStrings.MessageEncryptionService_BroadcastEncryptionFailedTemplate]:
    'Échec du chiffrement de diffusion : {TEMPLATE}',
  [BrightChainStrings.MessageEncryptionService_DecryptionFailedTemplate]:
    'Échec du déchiffrement : {ERROR}',
  [BrightChainStrings.MessageEncryptionService_KeyDecryptionFailedTemplate]:
    'Échec du déchiffrement de la clé : {ERROR}',

  // Message Logger
  [BrightChainStrings.MessageLogger_MessageCreated]: 'Message créé',
  [BrightChainStrings.MessageLogger_RoutingDecision]: 'Décision de routage',
  [BrightChainStrings.MessageLogger_DeliveryFailure]: 'Échec de livraison',
  [BrightChainStrings.MessageLogger_EncryptionFailure]: 'Échec de chiffrement',
  [BrightChainStrings.MessageLogger_SlowQueryDetected]:
    'Requête lente détectée',

  // Message Router
  [BrightChainStrings.MessageRouter_RoutingTimeout]: 'Délai de routage dépassé',
  [BrightChainStrings.MessageRouter_FailedToRouteToAnyRecipient]:
    "Impossible d'acheminer le message vers un destinataire",
  [BrightChainStrings.MessageRouter_ForwardingLoopDetected]:
    'Boucle de transfert détectée',

  // Block Format Service
  [BrightChainStrings.BlockFormatService_DataTooShort]:
    "Données trop courtes pour l'en-tête de bloc structuré (minimum 4 octets requis)",
  [BrightChainStrings.BlockFormatService_InvalidStructuredBlockFormatTemplate]:
    'Type de bloc structuré invalide : 0x{TYPE}',
  [BrightChainStrings.BlockFormatService_CannotDetermineHeaderSize]:
    "Impossible de déterminer la taille de l'en-tête - les données peuvent être tronquées",
  [BrightChainStrings.BlockFormatService_Crc8MismatchTemplate]:
    "Incohérence CRC8 - l'en-tête peut être corrompu (attendu 0x{EXPECTED}, obtenu 0x{CHECKSUM})",
  [BrightChainStrings.BlockFormatService_DataAppearsEncrypted]:
    "Les données semblent être chiffrées ECIES - déchiffrez avant l'analyse",
  [BrightChainStrings.BlockFormatService_UnknownBlockFormat]:
    'Format de bloc inconnu - préfixe magique 0xBC manquant (peut être des données brutes)',

  // CBL Service
  [BrightChainStrings.CBLService_NotAMessageCBL]:
    "Ce n'est pas un CBL de message",
  [BrightChainStrings.CBLService_CreatorIDByteLengthMismatchTemplate]:
    "Incohérence de longueur d'octets de l'ID créateur : obtenu {LENGTH}, attendu {EXPECTED}",
  [BrightChainStrings.CBLService_CreatorIDProviderReturnedBytesLengthMismatchTemplate]:
    "Le fournisseur d'ID créateur a retourné {LENGTH} octets, attendu {EXPECTED}",
  [BrightChainStrings.CBLService_SignatureLengthMismatchTemplate]:
    'Incohérence de longueur de signature : obtenu {LENGTH}, attendu {EXPECTED}',
  [BrightChainStrings.CBLService_DataAppearsRaw]:
    'Les données semblent être des données brutes sans en-tête structuré',
  [BrightChainStrings.CBLService_InvalidBlockFormat]: 'Format de bloc invalide',
  [BrightChainStrings.CBLService_SubCBLCountChecksumMismatchTemplate]:
    'SubCblCount ({COUNT}) ne correspond pas à la longueur de subCblChecksums ({EXPECTED})',
  [BrightChainStrings.CBLService_InvalidDepthTemplate]:
    'La profondeur doit être comprise entre 1 et 65535, reçu {DEPTH}',
  [BrightChainStrings.CBLService_ExpectedSuperCBLTemplate]:
    'SuperCBL attendu (type de bloc 0x03), type de bloc reçu 0x{TYPE}',

  // Global Service Provider
  [BrightChainStrings.GlobalServiceProvider_NotInitialized]:
    "Fournisseur de services non initialisé. Appelez d'abord ServiceProvider.getInstance().",

  // Block Store Adapter
  [BrightChainStrings.BlockStoreAdapter_DataLengthExceedsBlockSizeTemplate]:
    'La longueur des données ({LENGTH}) dépasse la taille du bloc ({BLOCK_SIZE})',

  // Memory Block Store
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailable]:
    "Le service FEC n'est pas disponible",
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailableInThisEnvironment]:
    "Le service FEC n'est pas disponible dans cet environnement",
  [BrightChainStrings.MemoryBlockStore_NoParityDataAvailable]:
    'Aucune donnée de parité disponible pour la récupération',
  [BrightChainStrings.MemoryBlockStore_BlockMetadataNotFound]:
    'Métadonnées du bloc non trouvées',
  [BrightChainStrings.MemoryBlockStore_RecoveryFailedInsufficientParityData]:
    'Échec de la récupération - données de parité insuffisantes',
  [BrightChainStrings.MemoryBlockStore_UnknownRecoveryError]:
    'Erreur de récupération inconnue',
  [BrightChainStrings.MemoryBlockStore_CBLDataCannotBeEmpty]:
    'Les données CBL ne peuvent pas être vides',
  [BrightChainStrings.MemoryBlockStore_CBLDataTooLargeTemplate]:
    'Données CBL trop volumineuses : la taille rembourrée ({LENGTH}) dépasse la taille du bloc ({BLOCK_SIZE}). Utilisez une taille de bloc plus grande ou un CBL plus petit.',
  [BrightChainStrings.MemoryBlockStore_Block1NotFound]:
    'Bloc 1 non trouvé et la récupération a échoué',
  [BrightChainStrings.MemoryBlockStore_Block2NotFound]:
    'Bloc 2 non trouvé et la récupération a échoué',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL]:
    'URL magnet invalide : doit commencer par "magnet:?"',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLXT]:
    'URL magnet invalide : le paramètre xt doit être "urn:brightchain:cbl"',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLMissingTemplate]:
    'URL magnet invalide : paramètre {PARAMETER} manquant',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL_InvalidBlockSize]:
    'URL magnet invalide : taille de bloc invalide',

  // Checksum
  [BrightChainStrings.Checksum_InvalidTemplate]:
    'La somme de contrôle doit être de {EXPECTED} octets, reçu {LENGTH} octets',
  [BrightChainStrings.Checksum_InvalidHexString]:
    'Chaîne hexadécimale invalide : contient des caractères non hexadécimaux',
  [BrightChainStrings.Checksum_InvalidHexStringTemplate]:
    'Longueur de chaîne hexadécimale invalide : attendu {EXPECTED} caractères, reçu {LENGTH}',

  [BrightChainStrings.Error_XorLengthMismatchTemplate]:
    'XOR nécessite des tableaux de même longueur{CONTEXT} : a.length={A_LENGTH}, b.length={B_LENGTH}',
  [BrightChainStrings.Error_XorAtLeastOneArrayRequired]:
    'Au moins un tableau doit être fourni pour XOR',

  [BrightChainStrings.Error_InvalidUnixTimestampTemplate]:
    'Horodatage Unix invalide : {TIMESTAMP}',
  [BrightChainStrings.Error_InvalidDateStringTemplate]:
    'Chaîne de date invalide : "{VALUE}". Format ISO 8601 attendu (ex. "2024-01-23T10:30:00Z") ou horodatage Unix.',
  [BrightChainStrings.Error_InvalidDateValueTypeTemplate]:
    'Type de valeur de date invalide : {TYPE}. Chaîne ou nombre attendu.',
  [BrightChainStrings.Error_InvalidDateObjectTemplate]:
    'Objet de date invalide : instance Date attendue, reçu {OBJECT_STRING}',
  [BrightChainStrings.Error_InvalidDateNaN]:
    "Date invalide : l'objet de date contient un horodatage NaN",
  [BrightChainStrings.Error_JsonValidationErrorTemplate]:
    'Échec de la validation JSON pour le champ {FIELD} : {REASON}',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNull]:
    'doit être un objet non nul',
  [BrightChainStrings.Error_JsonValidationError_FieldRequired]:
    'le champ est requis',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockSize]:
    "doit être une valeur d'énumération BlockSize valide",
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockType]:
    "doit être une valeur d'énumération BlockType valide",
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockDataType]:
    "doit être une valeur d'énumération BlockDataType valide",
  [BrightChainStrings.Error_JsonValidationError_MustBeNumber]:
    'doit être un nombre',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNegative]:
    'doit être non négatif',
  [BrightChainStrings.Error_JsonValidationError_MustBeInteger]:
    'doit être un entier',
  [BrightChainStrings.Error_JsonValidationError_MustBeISO8601DateStringOrUnixTimestamp]:
    'doit être une chaîne ISO 8601 valide ou un horodatage Unix',
  [BrightChainStrings.Error_JsonValidationError_MustBeString]:
    'doit être une chaîne de caractères',
  [BrightChainStrings.Error_JsonValidationError_MustNotBeEmpty]:
    'ne doit pas être vide',
  [BrightChainStrings.Error_JsonValidationError_JSONParsingFailed]:
    "échec de l'analyse JSON",
  [BrightChainStrings.Error_JsonValidationError_ValidationFailed]:
    'échec de la validation',
  [BrightChainStrings.XorUtils_BlockSizeMustBePositiveTemplate]:
    'La taille du bloc doit être positive : {BLOCK_SIZE}',
  [BrightChainStrings.XorUtils_InvalidPaddedDataTemplate]:
    'Données rembourrées invalides : trop courtes ({LENGTH} octets, au moins {REQUIRED} requis)',
  [BrightChainStrings.XorUtils_InvalidLengthPrefixTemplate]:
    'Préfixe de longueur invalide : indique {LENGTH} octets mais seulement {AVAILABLE} disponibles',
  [BrightChainStrings.BlockPaddingTransform_MustBeArray]:
    "L'entrée doit être un Uint8Array, TypedArray ou ArrayBuffer",
  [BrightChainStrings.CblStream_UnknownErrorReadingData]:
    'Erreur inconnue lors de la lecture des données',
  [BrightChainStrings.CurrencyCode_InvalidCurrencyCode]:
    'Code de devise invalide',
  [BrightChainStrings.EnergyAccount_InsufficientBalanceTemplate]:
    'Solde insuffisant : besoin de {AMOUNT}J, disponible {AVAILABLE_BALANCE}J',
  [BrightChainStrings.Init_BrowserCompatibleConfiguration]:
    'Configuration BrightChain compatible navigateur avec GuidV4Provider',
  [BrightChainStrings.Init_NotInitialized]:
    "Bibliothèque BrightChain non initialisée. Appelez initializeBrightChain() d'abord.",
  [BrightChainStrings.ModInverse_MultiplicativeInverseDoesNotExist]:
    "L'inverse multiplicatif modulaire n'existe pas",
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInTransform]:
    'Erreur inconnue dans la transformation',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInMakeTuple]:
    'Erreur inconnue dans makeTuple',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInFlush]:
    'Erreur inconnue dans flush',
  [BrightChainStrings.QuorumDataRecord_MustShareWithAtLeastTwoMembers]:
    'Doit être partagé avec au moins 2 membres',
  [BrightChainStrings.QuorumDataRecord_SharesRequiredExceedsMembers]:
    'Le nombre de parts requises dépasse le nombre de membres',
  [BrightChainStrings.QuorumDataRecord_SharesRequiredMustBeAtLeastTwo]:
    "Le nombre de parts requises doit être d'au moins 2",
  [BrightChainStrings.QuorumDataRecord_InvalidChecksum]:
    'Somme de contrôle invalide',
  [BrightChainStrings.SimpleBrowserStore_BlockNotFoundTemplate]:
    'Bloc introuvable : {ID}',
  [BrightChainStrings.EncryptedBlockCreator_NoCreatorRegisteredTemplate]:
    'Aucun créateur enregistré pour le type de bloc {TYPE}',
  [BrightChainStrings.TestMember_MemberNotFoundTemplate]:
    'Membre {KEY} introuvable',
};
