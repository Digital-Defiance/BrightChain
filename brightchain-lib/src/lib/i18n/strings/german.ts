import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';

export const GermanStrings: StringsCollection<BrightChainStringKey> = {
  // UI Strings
  [BrightChainStrings.Common_BlockSize]: 'Blockgröße',
  [BrightChainStrings.Common_AtIndexTemplate]: '{OPERATION} bei Index {INDEX}',
  [BrightChainStrings.ChangePassword_Success]: 'Passwort erfolgreich geändert.',
  [BrightChainStrings.Common_Site]: 'BrightChain',

  // Block Handle Errors
  [BrightChainStrings.Error_BlockHandle_BlockConstructorMustBeValid]:
    'blockConstructor muss eine gültige Konstruktorfunktion sein',
  [BrightChainStrings.Error_BlockHandle_BlockSizeRequired]:
    'blockSize ist erforderlich',
  [BrightChainStrings.Error_BlockHandle_DataMustBeUint8Array]:
    'data muss ein Uint8Array sein',
  [BrightChainStrings.Error_BlockHandle_ChecksumMustBeChecksum]:
    'checksum muss ein Checksum sein',

  // Block Handle Tuple Errors
  [BrightChainStrings.Error_BlockHandleTuple_FailedToLoadBlockTemplate]:
    'Block {CHECKSUM} konnte nicht geladen werden: {ERROR}',
  [BrightChainStrings.Error_BlockHandleTuple_FailedToStoreXorResultTemplate]:
    'XOR-Ergebnis konnte nicht gespeichert werden: {ERROR}',

  // Block Access Errors
  [BrightChainStrings.Error_BlockAccess_Template]:
    'Auf Block kann nicht zugegriffen werden: {REASON}',
  [BrightChainStrings.Error_BlockAccessError_BlockAlreadyExists]:
    'Blockdatei existiert bereits',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotPersistable]:
    'Block ist nicht persistierbar',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotReadable]:
    'Block ist nicht lesbar',
  [BrightChainStrings.Error_BlockAccessError_BlockFileNotFoundTemplate]:
    'Blockdatei nicht gefunden: {FILE}',
  [BrightChainStrings.Error_BlockAccess_CBLCannotBeEncrypted]:
    'CBL-Block kann nicht verschlüsselt werden',
  [BrightChainStrings.Error_BlockAccessError_CreatorMustBeProvided]:
    'Ersteller muss für Signaturvalidierung angegeben werden',
  [BrightChainStrings.Error_Block_CannotBeDecrypted]:
    'Block kann nicht entschlüsselt werden',
  [BrightChainStrings.Error_Block_CannotBeEncrypted]:
    'Block kann nicht verschlüsselt werden',
  [BrightChainStrings.Error_BlockCapacity_Template]:
    'Blockkapazität überschritten. Blockgröße: ({BLOCK_SIZE}), Daten: ({DATA_SIZE})',

  // Block Metadata Errors
  [BrightChainStrings.Error_BlockMetadataError_CreatorIdMismatch]:
    'Ersteller-ID stimmt nicht überein',
  [BrightChainStrings.Error_BlockMetadataError_CreatorRequired]:
    'Ersteller ist erforderlich',
  [BrightChainStrings.Error_BlockMetadataError_EncryptorRequired]:
    'Verschlüsseler ist erforderlich',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadata]:
    'Ungültige Block-Metadaten',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadataTemplate]:
    'Ungültige Block-Metadaten: {REASON}',
  [BrightChainStrings.Error_BlockMetadataError_MetadataRequired]:
    'Metadaten sind erforderlich',
  [BrightChainStrings.Error_BlockMetadataError_MissingRequiredMetadata]:
    'Erforderliche Metadatenfelder fehlen',

  // Block Capacity Errors
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockSize]:
    'Ungültige Blockgröße',
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockType]:
    'Ungültiger Blocktyp',
  [BrightChainStrings.Error_BlockCapacity_CapacityExceeded]:
    'Kapazität überschritten',
  [BrightChainStrings.Error_BlockCapacity_InvalidFileName]:
    'Ungültiger Dateiname',
  [BrightChainStrings.Error_BlockCapacity_InvalidMimetype]:
    'Ungültiger MIME-Typ',
  [BrightChainStrings.Error_BlockCapacity_InvalidRecipientCount]:
    'Ungültige Empfängeranzahl',
  [BrightChainStrings.Error_BlockCapacity_InvalidExtendedCblData]:
    'Ungültige erweiterte CBL-Daten',

  // Block Validation Errors
  [BrightChainStrings.Error_BlockValidationError_Template]:
    'Blockvalidierung fehlgeschlagen: {REASON}',
  [BrightChainStrings.Error_BlockValidationError_ActualDataLengthUnknown]:
    'Tatsächliche Datenlänge ist unbekannt',
  [BrightChainStrings.Error_BlockValidationError_AddressCountExceedsCapacity]:
    'Adressanzahl überschreitet Blockkapazität',
  [BrightChainStrings.Error_BlockValidationError_BlockDataNotBuffer]:
    'Block.data muss ein Buffer sein',
  [BrightChainStrings.Error_BlockValidationError_BlockSizeNegative]:
    'Blockgröße muss eine positive Zahl sein',
  [BrightChainStrings.Error_BlockValidationError_CreatorIDMismatch]:
    'Ersteller-ID stimmt nicht überein',
  [BrightChainStrings.Error_BlockValidationError_DataBufferIsTruncated]:
    'Datenpuffer ist abgeschnitten',
  [BrightChainStrings.Error_BlockValidationError_DataCannotBeEmpty]:
    'Daten dürfen nicht leer sein',
  [BrightChainStrings.Error_BlockValidationError_DataLengthExceedsCapacity]:
    'Datenlänge überschreitet Blockkapazität',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShort]:
    'Daten zu kurz für Verschlüsselungs-Header',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForCBLHeader]:
    'Daten zu kurz für CBL-Header',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForEncryptedCBL]:
    'Daten zu kurz für verschlüsseltes CBL',
  [BrightChainStrings.Error_BlockValidationError_EphemeralBlockOnlySupportsBufferData]:
    'EphemeralBlock unterstützt nur Buffer-Daten',
  [BrightChainStrings.Error_BlockValidationError_FutureCreationDate]:
    'Block-Erstellungsdatum darf nicht in der Zukunft liegen',
  [BrightChainStrings.Error_BlockValidationError_InvalidAddressLengthTemplate]:
    'Ungültige Adresslänge bei Index {INDEX}: {LENGTH}, erwartet: {EXPECTED_LENGTH}',
  [BrightChainStrings.Error_BlockValidationError_InvalidAuthTagLength]:
    'Ungültige Auth-Tag-Länge',
  [BrightChainStrings.Error_BlockValidationError_InvalidBlockTypeTemplate]:
    'Ungültiger Blocktyp: {TYPE}',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLAddressCount]:
    'CBL-Adressanzahl muss ein Vielfaches von TupleSize sein',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLDataLength]:
    'Ungültige CBL-Datenlänge',
  [BrightChainStrings.Error_BlockValidationError_InvalidDateCreated]:
    'Ungültiges Erstellungsdatum',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionHeaderLength]:
    'Ungültige Verschlüsselungs-Header-Länge',
  [BrightChainStrings.Error_BlockValidationError_InvalidEphemeralPublicKeyLength]:
    'Ungültige ephemere öffentliche Schlüssellänge',
  [BrightChainStrings.Error_BlockValidationError_InvalidIVLength]:
    'Ungültige IV-Länge',
  [BrightChainStrings.Error_BlockValidationError_InvalidSignature]:
    'Ungültige Signatur angegeben',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientIds]:
    'Ungültige Empfänger-IDs',
  [BrightChainStrings.Error_BlockValidationError_InvalidTupleSizeTemplate]:
    'Tupelgröße muss zwischen {TUPLE_MIN_SIZE} und {TUPLE_MAX_SIZE} liegen',
  [BrightChainStrings.Error_BlockValidationError_MethodMustBeImplementedByDerivedClass]:
    'Methode muss von abgeleiteter Klasse implementiert werden',
  [BrightChainStrings.Error_BlockValidationError_NoChecksum]:
    'Keine Prüfsumme angegeben',
  [BrightChainStrings.Error_BlockValidationError_OriginalDataLengthNegative]:
    'Ursprüngliche Datenlänge darf nicht negativ sein',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionType]:
    'Ungültiger Verschlüsselungstyp',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientCount]:
    'Ungültige Empfängeranzahl',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientKeys]:
    'Ungültige Empfängerschlüssel',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientNotFoundInRecipients]:
    'Verschlüsselungsempfänger nicht in Empfängerliste gefunden',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientHasNoPrivateKey]:
    'Verschlüsselungsempfänger hat keinen privaten Schlüssel',
  [BrightChainStrings.Error_BlockValidationError_InvalidCreator]:
    'Ungültiger Ersteller',
  [BrightChainStrings.Error_BlockMetadata_Template]:
    'Block-Metadaten-Fehler: {REASON}',
  [BrightChainStrings.Error_BufferError_InvalidBufferTypeTemplate]:
    'Ungültiger Puffertyp. Erwartet Buffer, erhalten: {TYPE}',
  [BrightChainStrings.Error_Checksum_MismatchTemplate]:
    'Prüfsummen-Abweichung: erwartet {EXPECTED}, erhalten {CHECKSUM}',
  [BrightChainStrings.Error_BlockSize_InvalidTemplate]:
    'Ungültige Blockgröße: {BLOCK_SIZE}',
  [BrightChainStrings.Error_Credentials_Invalid]: 'Ungültige Anmeldedaten.',

  // Isolated Key Errors
  [BrightChainStrings.Error_IsolatedKeyError_InvalidPublicKey]:
    'Ungültiger öffentlicher Schlüssel: muss ein isolierter Schlüssel sein',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyId]:
    'Schlüsselisolationsverletzung: ungültige Schlüssel-ID',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyFormat]:
    'Ungültiges Schlüsselformat',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyLength]:
    'Ungültige Schlüssellänge',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyType]:
    'Ungültiger Schlüsseltyp',
  [BrightChainStrings.Error_IsolatedKeyError_KeyIsolationViolation]:
    'Schlüsselisolationsverletzung: Chiffretexte von verschiedenen Schlüsselinstanzen',

  // Block Service Errors
  [BrightChainStrings.Error_BlockServiceError_BlockWhitenerCountMismatch]:
    'Anzahl der Blöcke und Whitener muss gleich sein',
  [BrightChainStrings.Error_BlockServiceError_EmptyBlocksArray]:
    'Blocks-Array darf nicht leer sein',
  [BrightChainStrings.Error_BlockServiceError_BlockSizeMismatch]:
    'Alle Blöcke müssen die gleiche Blockgröße haben',
  [BrightChainStrings.Error_BlockServiceError_NoWhitenersProvided]:
    'Keine Whitener bereitgestellt',
  [BrightChainStrings.Error_BlockServiceError_AlreadyInitialized]:
    'BlockService-Subsystem bereits initialisiert',
  [BrightChainStrings.Error_BlockServiceError_Uninitialized]:
    'BlockService-Subsystem nicht initialisiert',
  [BrightChainStrings.Error_BlockServiceError_BlockAlreadyExistsTemplate]:
    'Block existiert bereits: {ID}',
  [BrightChainStrings.Error_BlockServiceError_RecipientRequiredForEncryption]:
    'Empfänger ist für Verschlüsselung erforderlich',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileLength]:
    'Dateilänge kann nicht ermittelt werden',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineBlockSize]:
    'Blockgröße kann nicht ermittelt werden',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileName]:
    'Dateiname kann nicht ermittelt werden',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineMimeType]:
    'MIME-Typ kann nicht ermittelt werden',
  [BrightChainStrings.Error_BlockServiceError_FilePathNotProvided]:
    'Dateipfad nicht angegeben',
  [BrightChainStrings.Error_BlockServiceError_UnableToDetermineBlockSize]:
    'Blockgröße kann nicht ermittelt werden',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockData]:
    'Ungültige Blockdaten',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockType]:
    'Ungültiger Blocktyp',

  // Quorum Errors
  [BrightChainStrings.Error_QuorumError_InvalidQuorumId]: 'Ungültige Quorum-ID',
  [BrightChainStrings.Error_QuorumError_DocumentNotFound]:
    'Dokument nicht gefunden',
  [BrightChainStrings.Error_QuorumError_UnableToRestoreDocument]:
    'Dokument kann nicht wiederhergestellt werden',
  [BrightChainStrings.Error_QuorumError_NotImplemented]: 'Nicht implementiert',
  [BrightChainStrings.Error_QuorumError_Uninitialized]:
    'Quorum-Subsystem nicht initialisiert',
  [BrightChainStrings.Error_QuorumError_MemberNotFound]:
    'Mitglied nicht gefunden',
  [BrightChainStrings.Error_QuorumError_NotEnoughMembers]:
    'Nicht genügend Mitglieder für Quorum-Operation',

  // System Keyring Errors
  [BrightChainStrings.Error_SystemKeyringError_KeyNotFoundTemplate]:
    'Schlüssel {KEY} nicht gefunden',
  [BrightChainStrings.Error_SystemKeyringError_RateLimitExceeded]:
    'Ratenlimit überschritten',

  // FEC Errors
  [BrightChainStrings.Error_FecError_InputBlockRequired]:
    'Eingabeblock ist erforderlich',
  [BrightChainStrings.Error_FecError_DamagedBlockRequired]:
    'Beschädigter Block ist erforderlich',
  [BrightChainStrings.Error_FecError_ParityBlocksRequired]:
    'Paritätsblöcke sind erforderlich',
  [BrightChainStrings.Error_FecError_InvalidParityBlockSizeTemplate]:
    'Ungültige Paritätsblockgröße: erwartet {EXPECTED_SIZE}, erhalten {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InvalidRecoveredBlockSizeTemplate]:
    'Ungültige wiederhergestellte Blockgröße: erwartet {EXPECTED_SIZE}, erhalten {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InputDataMustBeBuffer]:
    'Eingabedaten müssen ein Buffer sein',
  [BrightChainStrings.Error_FecError_BlockSizeMismatch]:
    'Blockgrößen müssen übereinstimmen',
  [BrightChainStrings.Error_FecError_DamagedBlockDataMustBeBuffer]:
    'Beschädigte Blockdaten müssen ein Buffer sein',
  [BrightChainStrings.Error_FecError_ParityBlockDataMustBeBuffer]:
    'Paritätsblockdaten müssen ein Buffer sein',

  // ECIES Errors
  [BrightChainStrings.Error_EciesError_InvalidBlockType]:
    'Ungültiger Blocktyp für ECIES-Operation',

  // Voting Derivation Errors
  [BrightChainStrings.Error_VotingDerivationError_FailedToGeneratePrime]:
    'Primzahl konnte nach maximalen Versuchen nicht generiert werden',
  [BrightChainStrings.Error_VotingDerivationError_IdenticalPrimes]:
    'Identische Primzahlen generiert',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairTooSmallTemplate]:
    'Generiertes Schlüsselpaar zu klein: {ACTUAL_BITS} Bits < {REQUIRED_BITS} Bits',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairValidationFailed]:
    'Schlüsselpaar-Validierung fehlgeschlagen',
  [BrightChainStrings.Error_VotingDerivationError_ModularInverseDoesNotExist]:
    'Modulare multiplikative Inverse existiert nicht',
  [BrightChainStrings.Error_VotingDerivationError_PrivateKeyMustBeBuffer]:
    'Privater Schlüssel muss ein Buffer sein',
  [BrightChainStrings.Error_VotingDerivationError_PublicKeyMustBeBuffer]:
    'Öffentlicher Schlüssel muss ein Buffer sein',
  [BrightChainStrings.Error_VotingDerivationError_InvalidPublicKeyFormat]:
    'Ungültiges Format des öffentlichen Schlüssels',
  [BrightChainStrings.Error_VotingDerivationError_InvalidEcdhKeyPair]:
    'Ungültiges ECDH-Schlüsselpaar',
  [BrightChainStrings.Error_VotingDerivationError_FailedToDeriveVotingKeysTemplate]:
    'Abstimmungsschlüssel konnten nicht abgeleitet werden: {ERROR}',

  // Voting Errors
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPublicKeyNotIsolated]:
    'Ungültiges Schlüsselpaar: öffentlicher Schlüssel muss isoliert sein',
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPrivateKeyNotIsolated]:
    'Ungültiges Schlüsselpaar: privater Schlüssel muss isoliert sein',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyNotIsolated]:
    'Ungültiger öffentlicher Schlüssel: muss ein isolierter Schlüssel sein',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferTooShort]:
    'Ungültiger öffentlicher Schlüsselpuffer: zu kurz',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferWrongMagic]:
    'Ungültiger öffentlicher Schlüsselpuffer: falscher Magic-Wert',
  [BrightChainStrings.Error_VotingError_UnsupportedPublicKeyVersion]:
    'Nicht unterstützte Version des öffentlichen Schlüssels',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferIncompleteN]:
    'Ungültiger öffentlicher Schlüsselpuffer: unvollständiger n-Wert',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferFailedToParseNTemplate]:
    'Ungültiger öffentlicher Schlüsselpuffer: n konnte nicht geparst werden: {ERROR}',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyIdMismatch]:
    'Ungültiger öffentlicher Schlüssel: Schlüssel-ID stimmt nicht überein',
  [BrightChainStrings.Error_VotingError_ModularInverseDoesNotExist]:
    'Modulare multiplikative Inverse existiert nicht',
  [BrightChainStrings.Error_VotingError_PrivateKeyMustBeBuffer]:
    'Privater Schlüssel muss ein Buffer sein',
  [BrightChainStrings.Error_VotingError_PublicKeyMustBeBuffer]:
    'Öffentlicher Schlüssel muss ein Buffer sein',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyFormat]:
    'Ungültiges Format des öffentlichen Schlüssels',
  [BrightChainStrings.Error_VotingError_InvalidEcdhKeyPair]:
    'Ungültiges ECDH-Schlüsselpaar',
  [BrightChainStrings.Error_VotingError_FailedToDeriveVotingKeysTemplate]:
    'Abstimmungsschlüssel konnten nicht abgeleitet werden: {ERROR}',
  [BrightChainStrings.Error_VotingError_FailedToGeneratePrime]:
    'Primzahl konnte nach maximalen Versuchen nicht generiert werden',
  [BrightChainStrings.Error_VotingError_IdenticalPrimes]:
    'Identische Primzahlen generiert',
  [BrightChainStrings.Error_VotingError_KeyPairTooSmallTemplate]:
    'Generiertes Schlüsselpaar zu klein: {ACTUAL_BITS} Bits < {REQUIRED_BITS} Bits',
  [BrightChainStrings.Error_VotingError_KeyPairValidationFailed]:
    'Schlüsselpaar-Validierung fehlgeschlagen',
  [BrightChainStrings.Error_VotingError_InvalidVotingKey]:
    'Ungültiger Abstimmungsschlüssel',
  [BrightChainStrings.Error_VotingError_InvalidKeyPair]:
    'Ungültiges Schlüsselpaar',
  [BrightChainStrings.Error_VotingError_InvalidPublicKey]:
    'Ungültiger öffentlicher Schlüssel',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKey]:
    'Ungültiger privater Schlüssel',
  [BrightChainStrings.Error_VotingError_InvalidEncryptedKey]:
    'Ungültiger verschlüsselter Schlüssel',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferTooShort]:
    'Ungültiger privater Schlüsselpuffer: zu kurz',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferWrongMagic]:
    'Ungültiger privater Schlüsselpuffer: falscher Magic-Wert',
  [BrightChainStrings.Error_VotingError_UnsupportedPrivateKeyVersion]:
    'Nicht unterstützte Version des privaten Schlüssels',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteLambda]:
    'Ungültiger privater Schlüsselpuffer: unvollständiges Lambda',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMuLength]:
    'Ungültiger privater Schlüsselpuffer: unvollständige Mu-Länge',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMu]:
    'Ungültiger privater Schlüsselpuffer: unvollständiges Mu',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToParse]:
    'Ungültiger privater Schlüsselpuffer: Parsen fehlgeschlagen',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToCreate]:
    'Ungültiger privater Schlüsselpuffer: Erstellung fehlgeschlagen',

  // Store Errors
  [BrightChainStrings.Error_StoreError_KeyNotFoundTemplate]:
    'Schlüssel nicht gefunden: {KEY}',
  [BrightChainStrings.Error_StoreError_StorePathRequired]:
    'Speicherpfad ist erforderlich',
  [BrightChainStrings.Error_StoreError_StorePathNotFound]:
    'Speicherpfad nicht gefunden',
  [BrightChainStrings.Error_StoreError_BlockSizeRequired]:
    'Blockgröße ist erforderlich',
  [BrightChainStrings.Error_StoreError_BlockIdRequired]:
    'Block-ID ist erforderlich',
  [BrightChainStrings.Error_StoreError_InvalidBlockIdTooShort]:
    'Ungültige Block-ID: zu kurz',
  [BrightChainStrings.Error_StoreError_BlockFileSizeMismatch]:
    'Blockdateigröße stimmt nicht überein',
  [BrightChainStrings.Error_StoreError_BlockValidationFailed]:
    'Blockvalidierung fehlgeschlagen',
  [BrightChainStrings.Error_StoreError_BlockPathAlreadyExistsTemplate]:
    'Blockpfad {PATH} existiert bereits',
  [BrightChainStrings.Error_StoreError_BlockAlreadyExists]:
    'Block existiert bereits',
  [BrightChainStrings.Error_StoreError_NoBlocksProvided]:
    'Keine Blöcke bereitgestellt',
  [BrightChainStrings.Error_StoreError_CannotStoreEphemeralData]:
    'Ephemere strukturierte Daten können nicht gespeichert werden',
  [BrightChainStrings.Error_StoreError_BlockIdMismatchTemplate]:
    'Schlüssel {KEY} stimmt nicht mit Block-ID {BLOCK_ID} überein',
  [BrightChainStrings.Error_StoreError_BlockSizeMismatch]:
    'Blockgröße stimmt nicht mit Speicher-Blockgröße überein',
  [BrightChainStrings.Error_StoreError_InvalidBlockMetadataTemplate]:
    'Ungültige Block-Metadaten: {ERROR}',
  [BrightChainStrings.Error_StoreError_BlockDirectoryCreationFailedTemplate]:
    'Blockverzeichnis konnte nicht erstellt werden: {ERROR}',
  [BrightChainStrings.Error_StoreError_BlockDeletionFailedTemplate]:
    'Block konnte nicht gelöscht werden: {ERROR}',
  [BrightChainStrings.Error_StoreError_NotImplemented]:
    'Operation nicht implementiert',
  [BrightChainStrings.Error_StoreError_InsufficientRandomBlocksTemplate]:
    'Unzureichende Zufallsblöcke verfügbar: angefordert {REQUESTED}, verfügbar {AVAILABLE}',

  // Tuple Errors
  [BrightChainStrings.Error_TupleError_InvalidTupleSize]:
    'Ungültige Tupelgröße',
  [BrightChainStrings.Error_TupleError_BlockSizeMismatch]:
    'Alle Blöcke im Tupel müssen die gleiche Größe haben',
  [BrightChainStrings.Error_TupleError_NoBlocksToXor]:
    'Keine Blöcke zum XOR-Verknüpfen',
  [BrightChainStrings.Error_TupleError_InvalidBlockCount]:
    'Ungültige Anzahl von Blöcken für Tupel',
  [BrightChainStrings.Error_TupleError_InvalidBlockType]: 'Ungültiger Blocktyp',
  [BrightChainStrings.Error_TupleError_InvalidSourceLength]:
    'Quelllänge muss positiv sein',
  [BrightChainStrings.Error_TupleError_RandomBlockGenerationFailed]:
    'Zufallsblock konnte nicht generiert werden',
  [BrightChainStrings.Error_TupleError_WhiteningBlockGenerationFailed]:
    'Whitening-Block konnte nicht generiert werden',
  [BrightChainStrings.Error_TupleError_MissingParameters]:
    'Alle Parameter sind erforderlich',
  [BrightChainStrings.Error_TupleError_XorOperationFailedTemplate]:
    'XOR-Verknüpfung der Blöcke fehlgeschlagen: {ERROR}',
  [BrightChainStrings.Error_TupleError_DataStreamProcessingFailedTemplate]:
    'Datenstromverarbeitung fehlgeschlagen: {ERROR}',
  [BrightChainStrings.Error_TupleError_EncryptedDataStreamProcessingFailedTemplate]:
    'Verschlüsselte Datenstromverarbeitung fehlgeschlagen: {ERROR}',
  [BrightChainStrings.Error_TupleError_PoolBoundaryViolationTemplate]:
    'Pool-Grenzverletzung: {BLOCK_TYPE} gehört zu Pool "{ACTUAL_POOL}", aber Tupel erfordert Pool "{EXPECTED_POOL}"',

  // Sealing Errors
  [BrightChainStrings.Error_SealingError_InvalidBitRange]:
    'Bits müssen zwischen 3 und 20 liegen',
  [BrightChainStrings.Error_SealingError_InvalidMemberArray]:
    'amongstMembers muss ein Array von Member sein',
  [BrightChainStrings.Error_SealingError_NotEnoughMembersToUnlock]:
    'Nicht genügend Mitglieder zum Entsperren des Dokuments',
  [BrightChainStrings.Error_SealingError_TooManyMembersToUnlock]:
    'Zu viele Mitglieder zum Entsperren des Dokuments',
  [BrightChainStrings.Error_SealingError_MissingPrivateKeys]:
    'Nicht alle Mitglieder haben private Schlüssel geladen',
  [BrightChainStrings.Error_SealingError_EncryptedShareNotFound]:
    'Verschlüsselter Anteil nicht gefunden',
  [BrightChainStrings.Error_SealingError_MemberNotFound]:
    'Mitglied nicht gefunden',
  [BrightChainStrings.Error_SealingError_FailedToSealTemplate]:
    'Dokument konnte nicht versiegelt werden: {ERROR}',

  // CBL Errors
  [BrightChainStrings.Error_CblError_CblRequired]: 'CBL ist erforderlich',
  [BrightChainStrings.Error_CblError_WhitenedBlockFunctionRequired]:
    'getWhitenedBlock-Funktion ist erforderlich',
  [BrightChainStrings.Error_CblError_FailedToLoadBlock]:
    'Block konnte nicht geladen werden',
  [BrightChainStrings.Error_CblError_ExpectedEncryptedDataBlock]:
    'Verschlüsselter Datenblock erwartet',
  [BrightChainStrings.Error_CblError_ExpectedOwnedDataBlock]:
    'Eigener Datenblock erwartet',
  [BrightChainStrings.Error_CblError_InvalidStructure]:
    'Ungültige CBL-Struktur',
  [BrightChainStrings.Error_CblError_CreatorUndefined]:
    'Ersteller darf nicht undefiniert sein',
  [BrightChainStrings.Error_CblError_BlockNotReadable]:
    'Block kann nicht gelesen werden',
  [BrightChainStrings.Error_CblError_CreatorRequiredForSignature]:
    'Ersteller ist für Signaturvalidierung erforderlich',
  [BrightChainStrings.Error_CblError_InvalidCreatorId]:
    'Ungültige Ersteller-ID',
  [BrightChainStrings.Error_CblError_FileNameRequired]:
    'Dateiname ist erforderlich',
  [BrightChainStrings.Error_CblError_FileNameEmpty]:
    'Dateiname darf nicht leer sein',
  [BrightChainStrings.Error_CblError_FileNameWhitespace]:
    'Dateiname darf nicht mit Leerzeichen beginnen oder enden',
  [BrightChainStrings.Error_CblError_FileNameInvalidChar]:
    'Dateiname enthält ungültiges Zeichen',
  [BrightChainStrings.Error_CblError_FileNameControlChars]:
    'Dateiname enthält Steuerzeichen',
  [BrightChainStrings.Error_CblError_FileNamePathTraversal]:
    'Dateiname darf keine Pfadtraversierung enthalten',
  [BrightChainStrings.Error_CblError_MimeTypeRequired]:
    'MIME-Typ ist erforderlich',
  [BrightChainStrings.Error_CblError_MimeTypeEmpty]:
    'MIME-Typ darf nicht leer sein',
  [BrightChainStrings.Error_CblError_MimeTypeWhitespace]:
    'MIME-Typ darf nicht mit Leerzeichen beginnen oder enden',
  [BrightChainStrings.Error_CblError_MimeTypeLowercase]:
    'MIME-Typ muss kleingeschrieben sein',
  [BrightChainStrings.Error_CblError_MimeTypeInvalidFormat]:
    'Ungültiges MIME-Typ-Format',
  [BrightChainStrings.Error_CblError_InvalidBlockSize]: 'Ungültige Blockgröße',
  [BrightChainStrings.Error_CblError_MetadataSizeExceeded]:
    'Metadatengröße überschreitet maximal zulässige Größe',
  [BrightChainStrings.Error_CblError_MetadataSizeNegative]:
    'Gesamte Metadatengröße darf nicht negativ sein',
  [BrightChainStrings.Error_CblError_InvalidMetadataBuffer]:
    'Ungültiger Metadatenpuffer',
  [BrightChainStrings.Error_CblError_CreationFailedTemplate]:
    'CBL-Block konnte nicht erstellt werden: {ERROR}',
  [BrightChainStrings.Error_CblError_InsufficientCapacityTemplate]:
    'Blockgröße ({BLOCK_SIZE}) ist zu klein für CBL-Daten ({DATA_SIZE})',
  [BrightChainStrings.Error_CblError_NotExtendedCbl]: 'Kein erweitertes CBL',
  [BrightChainStrings.Error_CblError_InvalidSignature]:
    'Ungültige CBL-Signatur',
  [BrightChainStrings.Error_CblError_CreatorIdMismatch]:
    'Ersteller-ID stimmt nicht überein',
  [BrightChainStrings.Error_CblError_FileSizeTooLarge]: 'Dateigröße zu groß',
  [BrightChainStrings.Error_CblError_FileSizeTooLargeForNode]:
    'Dateigröße über dem maximal zulässigen Wert für den aktuellen Knoten',
  [BrightChainStrings.Error_CblError_InvalidTupleSize]: 'Ungültige Tupelgröße',
  [BrightChainStrings.Error_CblError_FileNameTooLong]: 'Dateiname zu lang',
  [BrightChainStrings.Error_CblError_MimeTypeTooLong]: 'MIME-Typ zu lang',
  [BrightChainStrings.Error_CblError_AddressCountExceedsCapacity]:
    'Adressanzahl überschreitet Blockkapazität',
  [BrightChainStrings.Error_CblError_CblEncrypted]:
    'CBL ist verschlüsselt. Vor Verwendung entschlüsseln.',
  [BrightChainStrings.Error_CblError_UserRequiredForDecryption]:
    'Benutzer ist für Entschlüsselung erforderlich',
  [BrightChainStrings.Error_CblError_NotASuperCbl]: 'Kein Super-CBL',
  [BrightChainStrings.Error_CblError_FailedToExtractCreatorId]:
    'Fehler beim Extrahieren der Ersteller-ID-Bytes aus dem CBL-Header',
  [BrightChainStrings.Error_CblError_FailedToExtractProvidedCreatorId]:
    'Fehler beim Extrahieren der Mitglieder-ID-Bytes aus dem bereitgestellten Ersteller',
  [BrightChainStrings.Error_CblError_PoolIntegrityError]:
    'CBL-Pool-Integritätsfehler: Ein oder mehrere referenzierte Blöcke fehlen im erwarteten Pool',

  // Stream Errors
  [BrightChainStrings.Error_StreamError_BlockSizeRequired]:
    'Blockgröße ist erforderlich',
  [BrightChainStrings.Error_StreamError_WhitenedBlockSourceRequired]:
    'Whitened-Block-Quelle ist erforderlich',
  [BrightChainStrings.Error_StreamError_RandomBlockSourceRequired]:
    'Zufallsblock-Quelle ist erforderlich',
  [BrightChainStrings.Error_StreamError_InputMustBeBuffer]:
    'Eingabe muss ein Buffer sein',
  [BrightChainStrings.Error_StreamError_FailedToGetRandomBlock]:
    'Zufallsblock konnte nicht abgerufen werden',
  [BrightChainStrings.Error_StreamError_FailedToGetWhiteningBlock]:
    'Whitening-/Zufallsblock konnte nicht abgerufen werden',
  [BrightChainStrings.Error_StreamError_IncompleteEncryptedBlock]:
    'Unvollständiger verschlüsselter Block',

  [BrightChainStrings.Error_SessionID_Invalid]: 'Ungültige Sitzungs-ID.',
  [BrightChainStrings.Error_TupleCount_InvalidTemplate]:
    'Ungültige Tupelanzahl ({TUPLE_COUNT}), muss zwischen {TUPLE_MIN_SIZE} und {TUPLE_MAX_SIZE} liegen',

  // Member Errors
  [BrightChainStrings.Error_MemberError_InsufficientRandomBlocks]:
    'Unzureichende Zufallsblöcke.',
  [BrightChainStrings.Error_MemberError_FailedToCreateMemberBlocks]:
    'Mitgliederblöcke konnten nicht erstellt werden.',
  [BrightChainStrings.Error_MemberError_InvalidMemberBlocks]:
    'Ungültige Mitgliederblöcke.',
  [BrightChainStrings.Error_MemberError_PrivateKeyRequiredToDeriveVotingKeyPair]:
    'Privater Schlüssel erforderlich zum Ableiten des Abstimmungsschlüsselpaars.',
  [BrightChainStrings.Error_MemoryTupleError_InvalidTupleSizeTemplate]:
    'Tupel muss {TUPLE_SIZE} Blöcke haben',

  // Multi Encrypted Errors
  [BrightChainStrings.Error_MultiEncryptedError_DataTooShort]:
    'Daten zu kurz für Verschlüsselungs-Header',
  [BrightChainStrings.Error_MultiEncryptedError_DataLengthExceedsCapacity]:
    'Datenlänge überschreitet Blockkapazität',
  [BrightChainStrings.Error_MultiEncryptedError_CreatorMustBeMember]:
    'Ersteller muss ein Mitglied sein',
  [BrightChainStrings.Error_MultiEncryptedError_BlockNotReadable]:
    'Block kann nicht gelesen werden',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidEphemeralPublicKeyLength]:
    'Ungültige ephemere öffentliche Schlüssellänge',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidIVLength]:
    'Ungültige IV-Länge',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidAuthTagLength]:
    'Ungültige Auth-Tag-Länge',
  [BrightChainStrings.Error_MultiEncryptedError_ChecksumMismatch]:
    'Prüfsummen-Abweichung',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientMismatch]:
    'Empfängerliste stimmt nicht mit Header-Empfängeranzahl überein',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientsAlreadyLoaded]:
    'Empfänger bereits geladen',

  // Whitened Errors
  [BrightChainStrings.Error_WhitenedError_BlockNotReadable]:
    'Block kann nicht gelesen werden',
  [BrightChainStrings.Error_WhitenedError_BlockSizeMismatch]:
    'Blockgrößen müssen übereinstimmen',
  [BrightChainStrings.Error_WhitenedError_DataLengthMismatch]:
    'Daten- und Zufallsdatenlängen müssen übereinstimmen',
  [BrightChainStrings.Error_WhitenedError_InvalidBlockSize]:
    'Ungültige Blockgröße',

  // Handle Tuple Errors
  [BrightChainStrings.Error_HandleTupleError_InvalidTupleSizeTemplate]:
    'Ungültige Tupelgröße ({TUPLE_SIZE})',
  [BrightChainStrings.Error_HandleTupleError_BlockSizeMismatch]:
    'Alle Blöcke im Tupel müssen die gleiche Größe haben',
  [BrightChainStrings.Error_HandleTupleError_NoBlocksToXor]:
    'Keine Blöcke zum XOR-Verknüpfen',
  [BrightChainStrings.Error_HandleTupleError_BlockSizesMustMatch]:
    'Blockgrößen müssen übereinstimmen',
  [BrightChainStrings.Error_HandleTupleError_PoolMismatchTemplate]:
    'Pool-Nichtübereinstimmung: Block {BLOCK_ID} gehört zu Pool "{ACTUAL_POOL}", aber Tupel erfordert Pool "{EXPECTED_POOL}"',

  // Block Errors
  [BrightChainStrings.Error_BlockError_CreatorRequired]:
    'Ersteller ist erforderlich',
  [BrightChainStrings.Error_BlockError_DataRequired]: 'Daten sind erforderlich',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsCapacity]:
    'Datenlänge überschreitet Blockkapazität',
  [BrightChainStrings.Error_BlockError_ActualDataLengthNegative]:
    'Tatsächliche Datenlänge muss positiv sein',
  [BrightChainStrings.Error_BlockError_ActualDataLengthExceedsDataLength]:
    'Tatsächliche Datenlänge darf Datenlänge nicht überschreiten',
  [BrightChainStrings.Error_BlockError_CreatorRequiredForEncryption]:
    'Ersteller ist für Verschlüsselung erforderlich',
  [BrightChainStrings.Error_BlockError_UnexpectedEncryptedBlockType]:
    'Unerwarteter verschlüsselter Blocktyp',
  [BrightChainStrings.Error_BlockError_CannotEncrypt]:
    'Block kann nicht verschlüsselt werden',
  [BrightChainStrings.Error_BlockError_CannotDecrypt]:
    'Block kann nicht entschlüsselt werden',
  [BrightChainStrings.Error_BlockError_CreatorPrivateKeyRequired]:
    'Privater Schlüssel des Erstellers ist erforderlich',
  [BrightChainStrings.Error_BlockError_InvalidMultiEncryptionRecipientCount]:
    'Ungültige Multi-Verschlüsselungs-Empfängeranzahl',
  [BrightChainStrings.Error_BlockError_InvalidNewBlockType]:
    'Ungültiger neuer Blocktyp',
  [BrightChainStrings.Error_BlockError_UnexpectedEphemeralBlockType]:
    'Unerwarteter ephemerer Blocktyp',
  [BrightChainStrings.Error_BlockError_RecipientRequired]:
    'Empfänger erforderlich',
  [BrightChainStrings.Error_BlockError_RecipientKeyRequired]:
    'Privater Schlüssel des Empfängers erforderlich',
  [BrightChainStrings.Error_BlockError_DataLengthMustMatchBlockSize]:
    'Die Datenlänge muss der Blockgröße entsprechen',

  // Memory Tuple Errors
  [BrightChainStrings.Error_MemoryTupleError_BlockSizeMismatch]:
    'Alle Blöcke im Tupel müssen die gleiche Größe haben',
  [BrightChainStrings.Error_MemoryTupleError_NoBlocksToXor]:
    'Keine Blöcke zum XOR-Verknüpfen',
  [BrightChainStrings.Error_MemoryTupleError_InvalidBlockCount]:
    'Ungültige Anzahl von Blöcken für Tupel',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlockIdsTemplate]:
    '{TUPLE_SIZE} Block-IDs erwartet',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlocksTemplate]:
    '{TUPLE_SIZE} Blöcke erwartet',

  // General Errors
  [BrightChainStrings.Error_Hydration_FailedToHydrateTemplate]:
    'Hydratisierung fehlgeschlagen: {ERROR}',
  [BrightChainStrings.Error_Serialization_FailedToSerializeTemplate]:
    'Serialisierung fehlgeschlagen: {ERROR}',
  [BrightChainStrings.Error_Checksum_Invalid]: 'Ungültige Prüfsumme.',
  [BrightChainStrings.Error_Creator_Invalid]: 'Ungültiger Ersteller.',
  [BrightChainStrings.Error_ID_InvalidFormat]: 'Ungültiges ID-Format.',
  [BrightChainStrings.Error_References_Invalid]: 'Ungültige Referenzen.',
  [BrightChainStrings.Error_Signature_Invalid]: 'Ungültige Signatur.',
  [BrightChainStrings.Error_Metadata_Mismatch]: 'Metadaten-Abweichung.',
  [BrightChainStrings.Error_Token_Expired]: 'Token abgelaufen.',
  [BrightChainStrings.Error_Token_Invalid]: 'Token ungültig.',
  [BrightChainStrings.Error_Unexpected_Error]:
    'Ein unerwarteter Fehler ist aufgetreten.',
  [BrightChainStrings.Error_User_NotFound]: 'Benutzer nicht gefunden.',
  [BrightChainStrings.Error_Validation_Error]: 'Validierungsfehler.',
  [BrightChainStrings.ForgotPassword_Title]: 'Passwort vergessen',
  [BrightChainStrings.Register_Button]: 'Registrieren',
  [BrightChainStrings.Register_Error]:
    'Bei der Registrierung ist ein Fehler aufgetreten.',
  [BrightChainStrings.Register_Success]: 'Registrierung erfolgreich.',
  [BrightChainStrings.Error_Capacity_Insufficient]: 'Unzureichende Kapazität.',
  [BrightChainStrings.Error_Implementation_NotImplemented]:
    'Nicht implementiert.',

  // Block Sizes
  [BrightChainStrings.BlockSize_Unknown]: 'Unbekannt',
  [BrightChainStrings.BlockSize_Message]: 'Nachricht',
  [BrightChainStrings.BlockSize_Tiny]: 'Winzig',
  [BrightChainStrings.BlockSize_Small]: 'Klein',
  [BrightChainStrings.BlockSize_Medium]: 'Mittel',
  [BrightChainStrings.BlockSize_Large]: 'Groß',
  [BrightChainStrings.BlockSize_Huge]: 'Riesig',

  // Document Errors
  [BrightChainStrings.Error_DocumentError_InvalidValueTemplate]:
    'Ungültiger Wert für {KEY}',
  [BrightChainStrings.Error_DocumentError_FieldRequiredTemplate]:
    'Feld {KEY} ist erforderlich.',
  [BrightChainStrings.Error_DocumentError_AlreadyInitialized]:
    'Dokument-Subsystem ist bereits initialisiert',
  [BrightChainStrings.Error_DocumentError_Uninitialized]:
    'Dokument-Subsystem ist nicht initialisiert',

  // XOR Service Errors
  [BrightChainStrings.Error_Xor_LengthMismatchTemplate]:
    'XOR erfordert Arrays gleicher Länge: a.length={A_LENGTH}, b.length={B_LENGTH}',
  [BrightChainStrings.Error_Xor_NoArraysProvided]:
    'Mindestens ein Array muss für XOR bereitgestellt werden',
  [BrightChainStrings.Error_Xor_ArrayLengthMismatchTemplate]:
    'Alle Arrays müssen die gleiche Länge haben. Erwartet: {EXPECTED_LENGTH}, erhalten: {ACTUAL_LENGTH} bei Index {INDEX}',
  [BrightChainStrings.Error_Xor_CryptoApiNotAvailable]:
    'Crypto-API ist in dieser Umgebung nicht verfügbar',

  // Tuple Storage Service Errors
  [BrightChainStrings.Error_TupleStorage_DataExceedsBlockSizeTemplate]:
    'Datengröße ({DATA_SIZE}) überschreitet Blockgröße ({BLOCK_SIZE})',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetProtocol]:
    'Ungültiges Magnet-Protokoll. Erwartet "magnet:"',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetType]:
    'Ungültiger Magnet-Typ. Erwartet "brightchain"',
  [BrightChainStrings.Error_TupleStorage_MissingMagnetParameters]:
    'Erforderliche Magnet-Parameter fehlen',

  // Location Record Errors
  [BrightChainStrings.Error_LocationRecord_NodeIdRequired]:
    'Knoten-ID ist erforderlich',
  [BrightChainStrings.Error_LocationRecord_LastSeenRequired]:
    'Zeitstempel der letzten Sichtung ist erforderlich',
  [BrightChainStrings.Error_LocationRecord_IsAuthoritativeRequired]:
    'isAuthoritative-Flag ist erforderlich',
  [BrightChainStrings.Error_LocationRecord_InvalidLastSeenDate]:
    'Ungültiges Datum der letzten Sichtung',
  [BrightChainStrings.Error_LocationRecord_InvalidLatencyMs]:
    'Latenz muss eine nicht-negative Zahl sein',
  [BrightChainStrings.Error_LocationRecord_InvalidPoolId]:
    'Ungültiges Pool-ID-Format',

  // Metadata Errors
  [BrightChainStrings.Error_Metadata_BlockIdRequired]:
    'Block-ID ist erforderlich',
  [BrightChainStrings.Error_Metadata_CreatedAtRequired]:
    'Erstellungszeitstempel ist erforderlich',
  [BrightChainStrings.Error_Metadata_LastAccessedAtRequired]:
    'Zeitstempel des letzten Zugriffs ist erforderlich',
  [BrightChainStrings.Error_Metadata_LocationUpdatedAtRequired]:
    'Zeitstempel der Standortaktualisierung ist erforderlich',
  [BrightChainStrings.Error_Metadata_InvalidCreatedAtDate]:
    'Ungültiges Erstellungsdatum',
  [BrightChainStrings.Error_Metadata_InvalidLastAccessedAtDate]:
    'Ungültiges Datum des letzten Zugriffs',
  [BrightChainStrings.Error_Metadata_InvalidLocationUpdatedAtDate]:
    'Ungültiges Datum der Standortaktualisierung',
  [BrightChainStrings.Error_Metadata_InvalidExpiresAtDate]:
    'Ungültiges Ablaufdatum',
  [BrightChainStrings.Error_Metadata_InvalidAvailabilityStateTemplate]:
    'Ungültiger Verfügbarkeitsstatus: {STATE}',
  [BrightChainStrings.Error_Metadata_LocationRecordsMustBeArray]:
    'Standortdatensätze müssen ein Array sein',
  [BrightChainStrings.Error_Metadata_InvalidLocationRecordTemplate]:
    'Ungültiger Standortdatensatz bei Index {INDEX}',
  [BrightChainStrings.Error_Metadata_InvalidAccessCount]:
    'Zugriffszähler muss eine nicht-negative Zahl sein',
  [BrightChainStrings.Error_Metadata_InvalidTargetReplicationFactor]:
    'Ziel-Replikationsfaktor muss eine positive Zahl sein',
  [BrightChainStrings.Error_Metadata_InvalidSize]:
    'Größe muss eine nicht-negative Zahl sein',
  [BrightChainStrings.Error_Metadata_ParityBlockIdsMustBeArray]:
    'Paritätsblock-IDs müssen ein Array sein',
  [BrightChainStrings.Error_Metadata_ReplicaNodeIdsMustBeArray]:
    'Replikat-Knoten-IDs müssen ein Array sein',

  // Service Provider Errors
  [BrightChainStrings.Error_ServiceProvider_UseSingletonInstance]:
    'Verwenden Sie ServiceProvider.getInstance() anstatt eine neue Instanz zu erstellen',
  [BrightChainStrings.Error_ServiceProvider_NotInitialized]:
    'ServiceProvider wurde nicht initialisiert',
  [BrightChainStrings.Error_ServiceLocator_NotSet]:
    'ServiceLocator wurde nicht gesetzt',

  // Block Service Errors (additional)
  [BrightChainStrings.Error_BlockService_CannotEncrypt]:
    'Block kann nicht verschlüsselt werden',
  [BrightChainStrings.Error_BlockService_BlocksArrayEmpty]:
    'Blocks-Array darf nicht leer sein',
  [BrightChainStrings.Error_BlockService_BlockSizesMustMatch]:
    'Alle Blöcke müssen die gleiche Blockgröße haben',

  // Message Router Errors
  [BrightChainStrings.Error_MessageRouter_MessageNotFoundTemplate]:
    'Nachricht nicht gefunden: {MESSAGE_ID}',

  // Browser Config Errors
  [BrightChainStrings.Error_BrowserConfig_NotImplementedTemplate]:
    'Methode {METHOD} ist in der Browser-Umgebung nicht implementiert',

  // Debug Errors
  [BrightChainStrings.Error_Debug_UnsupportedFormat]:
    'Nicht unterstütztes Format für Debug-Ausgabe',

  // Secure Heap Storage Errors
  [BrightChainStrings.Error_SecureHeap_KeyNotFound]:
    'Schlüssel nicht im sicheren Heap-Speicher gefunden',

  // I18n Errors
  [BrightChainStrings.Error_I18n_KeyConflictObjectTemplate]:
    'Schlüsselkonflikt erkannt: {KEY} existiert bereits in {OBJECT}',
  [BrightChainStrings.Error_I18n_KeyConflictValueTemplate]:
    'Schlüsselkonflikt erkannt: {KEY} hat widersprüchlichen Wert {VALUE}',
  [BrightChainStrings.Error_I18n_StringsNotFoundTemplate]:
    'Zeichenketten nicht gefunden für Sprache: {LANGUAGE}',

  // Document Errors (additional)
  [BrightChainStrings.Error_Document_CreatorRequiredForSaving]:
    'Ersteller ist zum Speichern des Dokuments erforderlich',
  [BrightChainStrings.Error_Document_CreatorRequiredForEncrypting]:
    'Ersteller ist zum Verschlüsseln des Dokuments erforderlich',
  [BrightChainStrings.Error_Document_NoEncryptedData]:
    'Keine verschlüsselten Daten verfügbar',
  [BrightChainStrings.Error_Document_FieldShouldBeArrayTemplate]:
    'Feld {FIELD} sollte ein Array sein',
  [BrightChainStrings.Error_Document_InvalidArrayValueTemplate]:
    'Ungültiger Array-Wert bei Index {INDEX} in Feld {FIELD}',
  [BrightChainStrings.Error_Document_FieldRequiredTemplate]:
    'Feld {FIELD} ist erforderlich',
  [BrightChainStrings.Error_Document_FieldInvalidTemplate]:
    'Feld {FIELD} ist ungültig',
  [BrightChainStrings.Error_Document_InvalidValueTemplate]:
    'Ungültiger Wert für Feld {FIELD}',
  [BrightChainStrings.Error_MemberDocument_PublicCblIdNotSet]:
    'Öffentliche CBL-ID wurde nicht gesetzt',
  [BrightChainStrings.Error_MemberDocument_PrivateCblIdNotSet]:
    'Private CBL-ID wurde nicht gesetzt',
  [BrightChainStrings.Error_BaseMemberDocument_PublicCblIdNotSet]:
    'Öffentliche CBL-ID des Basis-Mitgliedsdokuments wurde nicht gesetzt',
  [BrightChainStrings.Error_BaseMemberDocument_PrivateCblIdNotSet]:
    'Private CBL-ID des Basis-Mitgliedsdokuments wurde nicht gesetzt',
  [BrightChainStrings.Error_Document_InvalidValueInArrayTemplate]:
    'Ungültiger Wert im Array für {KEY}',
  [BrightChainStrings.Error_Document_FieldIsRequiredTemplate]:
    'Feld {FIELD} ist erforderlich',
  [BrightChainStrings.Error_Document_FieldIsInvalidTemplate]:
    'Feld {FIELD} ist ungültig',

  // SimpleBrightChain Errors
  [BrightChainStrings.Error_SimpleBrightChain_BlockNotFoundTemplate]:
    'Block nicht gefunden: {BLOCK_ID}',

  // Currency Code Errors
  [BrightChainStrings.Error_CurrencyCode_Invalid]: 'Ungültiger Währungscode',

  // Console Output Warnings
  [BrightChainStrings.Warning_BufferUtils_InvalidBase64String]:
    'Ungültige Base64-Zeichenkette bereitgestellt',
  [BrightChainStrings.Warning_Keyring_FailedToLoad]:
    'Fehler beim Laden des Schlüsselbunds aus dem Speicher',
  [BrightChainStrings.Warning_I18n_TranslationFailedTemplate]:
    'Übersetzung fehlgeschlagen für Schlüssel {KEY}',

  // Console Output Errors
  [BrightChainStrings.Error_MemberStore_RollbackFailed]:
    'Fehler beim Zurücksetzen der Member-Store-Transaktion',
  [BrightChainStrings.Error_MemberCblService_CreateMemberCblFailed]:
    'Fehler beim Erstellen des Member-CBL',
  [BrightChainStrings.Error_MemberCblService_ChecksumMismatch]:
    'Block-Prüfsummen-Fehler bei der Integritätsprüfung',
  [BrightChainStrings.Error_MemberCblService_BlockRetrievalFailed]:
    'Fehler beim Abrufen des Blocks während der Integritätsprüfung',
  [BrightChainStrings.Error_MemberCblService_MissingRequiredFields]:
    'Mitgliedsdaten fehlen erforderliche Felder',
  [BrightChainStrings.Error_DeliveryTimeout_HandleTimeoutFailedTemplate]:
    'Fehler beim Behandeln des Zustellungs-Timeouts: {ERROR}',

  // Validator Errors
  [BrightChainStrings.Error_Validator_InvalidBlockSizeTemplate]:
    'Ungültige Blockgröße: {BLOCK_SIZE}. Gültige Größen sind: {BLOCK_SIZES}',
  [BrightChainStrings.Error_Validator_InvalidBlockTypeTemplate]:
    'Ungültiger Blocktyp: {BLOCK_TYPE}. Gültige Typen sind: {BLOCK_TYPES}',
  [BrightChainStrings.Error_Validator_InvalidEncryptionTypeTemplate]:
    'Ungültiger Verschlüsselungstyp: {ENCRYPTION_TYPE}. Gültige Typen sind: {ENCRYPTION_TYPES}',
  [BrightChainStrings.Error_Validator_RecipientCountMustBeAtLeastOne]:
    'Die Empfängeranzahl muss mindestens 1 für Multi-Empfänger-Verschlüsselung betragen',
  [BrightChainStrings.Error_Validator_RecipientCountMaximumTemplate]:
    'Die Empfängeranzahl darf {MAXIMUM} nicht überschreiten',
  [BrightChainStrings.Error_Validator_FieldRequiredTemplate]:
    '{FIELD} ist erforderlich',
  [BrightChainStrings.Error_Validator_FieldCannotBeEmptyTemplate]:
    '{FIELD} darf nicht leer sein',

  // Miscellaneous Block Errors
  [BrightChainStrings.Error_BlockError_BlockSizesMustMatch]:
    'Blockgrößen müssen übereinstimmen',
  [BrightChainStrings.Error_BlockError_DataCannotBeNullOrUndefined]:
    'Daten dürfen nicht null oder undefined sein',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsBlockSizeTemplate]:
    'Datenlänge ({LENGTH}) überschreitet Blockgröße ({BLOCK_SIZE})',

  // CPU Errors
  [BrightChainStrings.Error_CPU_DuplicateOpcodeErrorTemplate]:
    'Doppelter Opcode 0x{OPCODE} im Befehlssatz {INSTRUCTION_SET}',
  [BrightChainStrings.Error_CPU_NotImplementedTemplate]:
    '{INSTRUCTION} ist nicht implementiert',
  [BrightChainStrings.Error_CPU_InvalidReadSizeTemplate]:
    'Ungültige Lesegröße: {SIZE}',
  [BrightChainStrings.Error_CPU_StackOverflow]: 'Stapelüberlauf',
  [BrightChainStrings.Error_CPU_StackUnderflow]: 'Stapelunterlauf',

  // Member CBL Errors
  [BrightChainStrings.Error_MemberCBL_PublicCBLIdNotSet]:
    'Öffentliche CBL-ID nicht festgelegt',
  [BrightChainStrings.Error_MemberCBL_PrivateCBLIdNotSet]:
    'Private CBL-ID nicht festgelegt',

  // Member Document Errors
  [BrightChainStrings.Error_MemberDocument_Hint]:
    'Verwenden Sie MemberDocument.create() anstelle von new MemberDocument()',
  [BrightChainStrings.Error_MemberDocument_CBLNotGenerated]:
    'CBLs wurden nicht generiert. Rufen Sie generateCBLs() auf, bevor Sie toMember() aufrufen',

  // Member Profile Document Errors
  [BrightChainStrings.Error_MemberProfileDocument_Hint]:
    'Verwenden Sie MemberProfileDocument.create() anstelle von new MemberProfileDocument()',

  // Quorum Document Errors
  [BrightChainStrings.Error_QuorumDocument_CreatorMustBeSetBeforeSaving]:
    'Der Ersteller muss vor dem Speichern festgelegt werden',
  [BrightChainStrings.Error_QuorumDocument_CreatorMustBeSetBeforeEncrypting]:
    'Der Ersteller muss vor dem Verschlüsseln festgelegt werden',
  [BrightChainStrings.Error_QuorumDocument_DocumentHasNoEncryptedData]:
    'Das Dokument hat keine verschlüsselten Daten',
  [BrightChainStrings.Error_QuorumDocument_InvalidEncryptedDataFormat]:
    'Ungültiges Format der verschlüsselten Daten',
  [BrightChainStrings.Error_QuorumDocument_InvalidMemberIdsFormat]:
    'Ungültiges Mitglieder-ID-Format',
  [BrightChainStrings.Error_QuorumDocument_InvalidSignatureFormat]:
    'Ungültiges Signaturformat',
  [BrightChainStrings.Error_QuorumDocument_InvalidCreatorIdFormat]:
    'Ungültiges Ersteller-ID-Format',
  [BrightChainStrings.Error_QuorumDocument_InvalidChecksumFormat]:
    'Ungültiges Prüfsummenformat',

  // Block Logger
  [BrightChainStrings.BlockLogger_Redacted]: 'GESCHWÄRZT',

  // Member Schema Errors
  [BrightChainStrings.Error_MemberSchema_InvalidIdFormat]:
    'Ungültiges ID-Format',
  [BrightChainStrings.Error_MemberSchema_InvalidPublicKeyFormat]:
    'Ungültiges Format des öffentlichen Schlüssels',
  [BrightChainStrings.Error_MemberSchema_InvalidVotingPublicKeyFormat]:
    'Ungültiges Format des öffentlichen Abstimmungsschlüssels',
  [BrightChainStrings.Error_MemberSchema_InvalidEmailFormat]:
    'Ungültiges E-Mail-Format',
  [BrightChainStrings.Error_MemberSchema_InvalidRecoveryDataFormat]:
    'Ungültiges Wiederherstellungsdatenformat',
  [BrightChainStrings.Error_MemberSchema_InvalidTrustedPeersFormat]:
    'Ungültiges Format für vertrauenswürdige Peers',
  [BrightChainStrings.Error_MemberSchema_InvalidBlockedPeersFormat]:
    'Ungültiges Format für blockierte Peers',
  [BrightChainStrings.Error_MemberSchema_InvalidActivityLogFormat]:
    'Ungültiges Aktivitätsprotokollformat',

  // Message Metadata Schema Errors
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidRecipientsFormat]:
    'Ungültiges Empfängerformat',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidPriorityFormat]:
    'Ungültiges Prioritätsformat',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidDeliveryStatusFormat]:
    'Ungültiges Lieferstatusformat',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidAcknowledgementsFormat]:
    'Ungültiges Bestätigungsformat',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidCBLBlockIDsFormat]:
    'Ungültiges CBL-Block-ID-Format',

  // Security
  [BrightChainStrings.Security_DOS_InputSizeExceedsLimitErrorTemplate]:
    'Eingabegröße {SIZE} überschreitet Limit {MAX_SIZE} für {OPERATION}',
  [BrightChainStrings.Security_DOS_OperationExceededTimeLimitErrorTemplate]:
    'Operation {OPERATION} hat Zeitlimit {MAX_TIME} ms überschritten',
  [BrightChainStrings.Security_RateLimiter_RateLimitExceededErrorTemplate]:
    'Ratenlimit für {OPERATION} überschritten',
  [BrightChainStrings.Security_AuditLogger_SignatureValidationResultTemplate]:
    'Signaturvalidierung {RESULT}',
  [BrightChainStrings.Security_AuditLogger_Failure]: 'Fehlgeschlagen',
  [BrightChainStrings.Security_AuditLogger_Success]: 'Erfolgreich',
  [BrightChainStrings.Security_AuditLogger_BlockCreated]: 'Block erstellt',
  [BrightChainStrings.Security_AuditLogger_EncryptionPerformed]:
    'Verschlüsselung durchgeführt',
  [BrightChainStrings.Security_AuditLogger_DecryptionResultTemplate]:
    'Entschlüsselung {RESULT}',
  [BrightChainStrings.Security_AuditLogger_AccessDeniedTemplate]:
    'Zugriff auf {RESOURCE} verweigert',
  [BrightChainStrings.Security_AuditLogger_Security]: 'Sicherheit',

  // Delivery Timeout
  [BrightChainStrings.DeliveryTimeout_FailedToHandleTimeoutTemplate]:
    'Zeitüberschreitung für {MESSAGE_ID}:{RECIPIENT_ID} konnte nicht behandelt werden',

  // Message CBL Service
  [BrightChainStrings.MessageCBLService_MessageSizeExceedsMaximumTemplate]:
    'Nachrichtengröße {SIZE} überschreitet Maximum {MAX_SIZE}',
  [BrightChainStrings.MessageCBLService_FailedToCreateMessageAfterRetries]:
    'Nachricht konnte nach Wiederholungsversuchen nicht erstellt werden',
  [BrightChainStrings.MessageCBLService_FailedToRetrieveMessageTemplate]:
    'Nachricht {MESSAGE_ID} konnte nicht abgerufen werden',
  [BrightChainStrings.MessageCBLService_MessageTypeIsRequired]:
    'Nachrichtentyp ist erforderlich',
  [BrightChainStrings.MessageCBLService_SenderIDIsRequired]:
    'Absender-ID ist erforderlich',
  [BrightChainStrings.MessageCBLService_RecipientCountExceedsMaximumTemplate]:
    'Empfängeranzahl {COUNT} überschreitet Maximum {MAXIMUM}',

  // Message Encryption Service
  [BrightChainStrings.MessageEncryptionService_NoRecipientPublicKeysProvided]:
    'Keine öffentlichen Empfängerschlüssel angegeben',
  [BrightChainStrings.MessageEncryptionService_FailedToEncryptTemplate]:
    'Verschlüsselung für Empfänger {RECIPIENT_ID} fehlgeschlagen: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_BroadcastEncryptionFailedTemplate]:
    'Broadcast-Verschlüsselung fehlgeschlagen: {TEMPLATE}',
  [BrightChainStrings.MessageEncryptionService_DecryptionFailedTemplate]:
    'Entschlüsselung fehlgeschlagen: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_KeyDecryptionFailedTemplate]:
    'Schlüsselentschlüsselung fehlgeschlagen: {ERROR}',

  // Message Logger
  [BrightChainStrings.MessageLogger_MessageCreated]: 'Nachricht erstellt',
  [BrightChainStrings.MessageLogger_RoutingDecision]: 'Routing-Entscheidung',
  [BrightChainStrings.MessageLogger_DeliveryFailure]: 'Zustellungsfehler',
  [BrightChainStrings.MessageLogger_EncryptionFailure]:
    'Verschlüsselungsfehler',
  [BrightChainStrings.MessageLogger_SlowQueryDetected]:
    'Langsame Abfrage erkannt',

  // Message Router
  [BrightChainStrings.MessageRouter_RoutingTimeout]:
    'Routing-Zeitüberschreitung',
  [BrightChainStrings.MessageRouter_FailedToRouteToAnyRecipient]:
    'Nachricht konnte an keinen Empfänger weitergeleitet werden',
  [BrightChainStrings.MessageRouter_ForwardingLoopDetected]:
    'Weiterleitungsschleife erkannt',

  // Block Format Service
  [BrightChainStrings.BlockFormatService_DataTooShort]:
    'Daten zu kurz für strukturierten Block-Header (mindestens 4 Bytes erforderlich)',
  [BrightChainStrings.BlockFormatService_InvalidStructuredBlockFormatTemplate]:
    'Ungültiger strukturierter Blocktyp: 0x{TYPE}',
  [BrightChainStrings.BlockFormatService_CannotDetermineHeaderSize]:
    'Header-Größe kann nicht bestimmt werden - Daten sind möglicherweise abgeschnitten',
  [BrightChainStrings.BlockFormatService_Crc8MismatchTemplate]:
    'CRC8-Abweichung - Header ist möglicherweise beschädigt (erwartet 0x{EXPECTED}, erhalten 0x{CHECKSUM})',
  [BrightChainStrings.BlockFormatService_DataAppearsEncrypted]:
    'Daten scheinen ECIES-verschlüsselt zu sein - vor dem Parsen entschlüsseln',
  [BrightChainStrings.BlockFormatService_UnknownBlockFormat]:
    'Unbekanntes Blockformat - 0xBC-Magic-Präfix fehlt (möglicherweise Rohdaten)',

  // CBL Service
  [BrightChainStrings.CBLService_NotAMessageCBL]: 'Kein Nachrichten-CBL',
  [BrightChainStrings.CBLService_CreatorIDByteLengthMismatchTemplate]:
    'Ersteller-ID-Bytelängenabweichung: erhalten {LENGTH}, erwartet {EXPECTED}',
  [BrightChainStrings.CBLService_CreatorIDProviderReturnedBytesLengthMismatchTemplate]:
    'Ersteller-ID-Anbieter hat {LENGTH} Bytes zurückgegeben, erwartet {EXPECTED}',
  [BrightChainStrings.CBLService_SignatureLengthMismatchTemplate]:
    'Signaturlängenabweichung: erhalten {LENGTH}, erwartet {EXPECTED}',
  [BrightChainStrings.CBLService_DataAppearsRaw]:
    'Die Daten scheinen Rohdaten ohne strukturierten Header zu sein',
  [BrightChainStrings.CBLService_InvalidBlockFormat]: 'Ungültiges Blockformat',
  [BrightChainStrings.CBLService_SubCBLCountChecksumMismatchTemplate]:
    'SubCblCount ({COUNT}) stimmt nicht mit der Länge von subCblChecksums ({EXPECTED}) überein',
  [BrightChainStrings.CBLService_InvalidDepthTemplate]:
    'Tiefe muss zwischen 1 und 65535 liegen, erhalten {DEPTH}',
  [BrightChainStrings.CBLService_ExpectedSuperCBLTemplate]:
    'SuperCBL erwartet (Blocktyp 0x03), Blocktyp 0x{TYPE} erhalten',

  // Global Service Provider
  [BrightChainStrings.GlobalServiceProvider_NotInitialized]:
    'Dienstanbieter nicht initialisiert. Rufen Sie zuerst ServiceProvider.getInstance() auf.',

  // Block Store Adapter
  [BrightChainStrings.BlockStoreAdapter_DataLengthExceedsBlockSizeTemplate]:
    'Datenlänge ({LENGTH}) überschreitet Blockgröße ({BLOCK_SIZE})',

  // Memory Block Store
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailable]:
    'FEC-Dienst ist nicht verfügbar',
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailableInThisEnvironment]:
    'FEC-Dienst ist in dieser Umgebung nicht verfügbar',
  [BrightChainStrings.MemoryBlockStore_NoParityDataAvailable]:
    'Keine Paritätsdaten für die Wiederherstellung verfügbar',
  [BrightChainStrings.MemoryBlockStore_BlockMetadataNotFound]:
    'Block-Metadaten nicht gefunden',
  [BrightChainStrings.MemoryBlockStore_RecoveryFailedInsufficientParityData]:
    'Wiederherstellung fehlgeschlagen - unzureichende Paritätsdaten',
  [BrightChainStrings.MemoryBlockStore_UnknownRecoveryError]:
    'Unbekannter Wiederherstellungsfehler',
  [BrightChainStrings.MemoryBlockStore_CBLDataCannotBeEmpty]:
    'CBL-Daten dürfen nicht leer sein',
  [BrightChainStrings.MemoryBlockStore_CBLDataTooLargeTemplate]:
    'CBL-Daten zu groß: Die aufgefüllte Größe ({LENGTH}) überschreitet die Blockgröße ({BLOCK_SIZE}). Verwenden Sie eine größere Blockgröße oder einen kleineren CBL.',
  [BrightChainStrings.MemoryBlockStore_Block1NotFound]:
    'Block 1 nicht gefunden und Wiederherstellung fehlgeschlagen',
  [BrightChainStrings.MemoryBlockStore_Block2NotFound]:
    'Block 2 nicht gefunden und Wiederherstellung fehlgeschlagen',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL]:
    'Ungültige Magnet-URL: muss mit "magnet:?" beginnen',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLXT]:
    'Ungültige Magnet-URL: Der xt-Parameter muss "urn:brightchain:cbl" sein',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLMissingTemplate]:
    'Ungültige Magnet-URL: Parameter {PARAMETER} fehlt',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL_InvalidBlockSize]:
    'Ungültige Magnet-URL: ungültige Blockgröße',

  // Checksum
  [BrightChainStrings.Checksum_InvalidTemplate]:
    'Prüfsumme muss {EXPECTED} Bytes sein, erhalten {LENGTH} Bytes',
  [BrightChainStrings.Checksum_InvalidHexString]:
    'Ungültige Hex-Zeichenkette: enthält nicht-hexadezimale Zeichen',
  [BrightChainStrings.Checksum_InvalidHexStringTemplate]:
    'Ungültige Hex-Zeichenkettenlänge: erwartet {EXPECTED} Zeichen, erhalten {LENGTH}',

  [BrightChainStrings.Error_XorLengthMismatchTemplate]:
    'XOR erfordert Arrays gleicher Länge{CONTEXT}: a.length={A_LENGTH}, b.length={B_LENGTH}',
  [BrightChainStrings.Error_XorAtLeastOneArrayRequired]:
    'Mindestens ein Array muss für XOR bereitgestellt werden',

  [BrightChainStrings.Error_InvalidUnixTimestampTemplate]:
    'Ungültiger Unix-Zeitstempel: {TIMESTAMP}',
  [BrightChainStrings.Error_InvalidDateStringTemplate]:
    'Ungültige Datumszeichenkette: "{VALUE}". Erwartet wird ISO 8601 Format (z.B. "2024-01-23T10:30:00Z") oder Unix-Zeitstempel.',
  [BrightChainStrings.Error_InvalidDateValueTypeTemplate]:
    'Ungültiger Datumswerttyp: {TYPE}. Zeichenkette oder Zahl erwartet.',
  [BrightChainStrings.Error_InvalidDateObjectTemplate]:
    'Ungültiges Datumsobjekt: Date-Instanz erwartet, erhalten {OBJECT_STRING}',
  [BrightChainStrings.Error_InvalidDateNaN]:
    'Ungültiges Datum: Datumsobjekt enthält NaN-Zeitstempel',
  [BrightChainStrings.Error_JsonValidationErrorTemplate]:
    'JSON-Validierung fehlgeschlagen für Feld {FIELD}: {REASON}',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNull]:
    'muss ein nicht-null Objekt sein',
  [BrightChainStrings.Error_JsonValidationError_FieldRequired]:
    'Feld ist erforderlich',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockSize]:
    'muss ein gültiger BlockSize-Enum-Wert sein',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockType]:
    'muss ein gültiger BlockType-Enum-Wert sein',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockDataType]:
    'muss ein gültiger BlockDataType-Enum-Wert sein',
  [BrightChainStrings.Error_JsonValidationError_MustBeNumber]:
    'muss eine Zahl sein',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNegative]:
    'darf nicht negativ sein',
  [BrightChainStrings.Error_JsonValidationError_MustBeInteger]:
    'muss eine Ganzzahl sein',
  [BrightChainStrings.Error_JsonValidationError_MustBeISO8601DateStringOrUnixTimestamp]:
    'muss eine gültige ISO 8601-Zeichenkette oder ein Unix-Zeitstempel sein',
  [BrightChainStrings.Error_JsonValidationError_MustBeString]:
    'muss eine Zeichenkette sein',
  [BrightChainStrings.Error_JsonValidationError_MustNotBeEmpty]:
    'darf nicht leer sein',
  [BrightChainStrings.Error_JsonValidationError_JSONParsingFailed]:
    'JSON-Analyse fehlgeschlagen',
  [BrightChainStrings.Error_JsonValidationError_ValidationFailed]:
    'Validierung fehlgeschlagen',
  [BrightChainStrings.XorUtils_BlockSizeMustBePositiveTemplate]:
    'Blockgröße muss positiv sein: {BLOCK_SIZE}',
  [BrightChainStrings.XorUtils_InvalidPaddedDataTemplate]:
    'Ungültige aufgefüllte Daten: zu kurz ({LENGTH} Bytes, mindestens {REQUIRED} erforderlich)',
  [BrightChainStrings.XorUtils_InvalidLengthPrefixTemplate]:
    'Ungültiges Längenpräfix: beansprucht {LENGTH} Bytes, aber nur {AVAILABLE} verfügbar',
  [BrightChainStrings.BlockPaddingTransform_MustBeArray]:
    'Eingabe muss Uint8Array, TypedArray oder ArrayBuffer sein',
  [BrightChainStrings.CblStream_UnknownErrorReadingData]:
    'Unbekannter Fehler beim Lesen der Daten',
  [BrightChainStrings.CurrencyCode_InvalidCurrencyCode]:
    'Ungültiger Währungscode',
  [BrightChainStrings.EnergyAccount_InsufficientBalanceTemplate]:
    'Unzureichendes Guthaben: benötigt {AMOUNT}J, verfügbar {AVAILABLE_BALANCE}J',
  [BrightChainStrings.Init_BrowserCompatibleConfiguration]:
    'BrightChain browserkompatible Konfiguration mit GuidV4Provider',
  [BrightChainStrings.Init_NotInitialized]:
    'BrightChain-Bibliothek nicht initialisiert. Rufen Sie zuerst initializeBrightChain() auf.',
  [BrightChainStrings.ModInverse_MultiplicativeInverseDoesNotExist]:
    'Modulares multiplikatives Inverses existiert nicht',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInTransform]:
    'Unbekannter Fehler bei der Transformation',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInMakeTuple]:
    'Unbekannter Fehler in makeTuple',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInFlush]:
    'Unbekannter Fehler in flush',
  [BrightChainStrings.QuorumDataRecord_MustShareWithAtLeastTwoMembers]:
    'Muss mit mindestens 2 Mitgliedern geteilt werden',
  [BrightChainStrings.QuorumDataRecord_SharesRequiredExceedsMembers]:
    'Erforderliche Anteile übersteigen die Anzahl der Mitglieder',
  [BrightChainStrings.QuorumDataRecord_SharesRequiredMustBeAtLeastTwo]:
    'Die erforderlichen Anteile müssen mindestens 2 betragen',
  [BrightChainStrings.QuorumDataRecord_InvalidChecksum]: 'Ungültige Prüfsumme',
  [BrightChainStrings.SimpleBrowserStore_BlockNotFoundTemplate]:
    'Block nicht gefunden: {ID}',
  [BrightChainStrings.EncryptedBlockCreator_NoCreatorRegisteredTemplate]:
    'Kein Ersteller für Blocktyp {TYPE} registriert',
  [BrightChainStrings.TestMember_MemberNotFoundTemplate]:
    'Mitglied {KEY} nicht gefunden',
};
