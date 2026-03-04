import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightPassStringKey,
  BrightPassStrings,
} from '../../../enumerations/brightPassStrings';

export const BrightPassSpanishStrings: StringsCollection<BrightPassStringKey> =
  {
    // Menu
    [BrightPassStrings.Menu_BrightPass]: 'BrightPass',

    // Vault List
    [BrightPassStrings.VaultList_Title]: 'Bóvedas',
    [BrightPassStrings.VaultList_CreateVault]: 'Crear bóveda',
    [BrightPassStrings.VaultList_DeleteVault]: 'Eliminar bóveda',
    [BrightPassStrings.VaultList_SharedWith]: 'Compartida con {COUNT} miembros',
    [BrightPassStrings.VaultList_NoVaults]:
      'No hay bóvedas aún. Crea una para comenzar.',

    // Vault Detail
    [BrightPassStrings.VaultDetail_Title]: 'Bóveda: {NAME}',
    [BrightPassStrings.VaultDetail_AddEntry]: 'Agregar entrada',
    [BrightPassStrings.VaultDetail_LockVault]: 'Bloquear bóveda',
    [BrightPassStrings.VaultDetail_Search]: 'Buscar entradas…',
    [BrightPassStrings.VaultDetail_NoEntries]:
      'No hay entradas aún. Agrega una para comenzar.',
    [BrightPassStrings.VaultDetail_Favorite]: 'Favorito',
    [BrightPassStrings.VaultDetail_ConfirmLockTitle]: '¿Bloquear bóveda?',
    [BrightPassStrings.VaultDetail_ConfirmLockMessage]:
      'Estás navegando fuera. ¿Deseas bloquear la bóveda?',
    [BrightPassStrings.VaultDetail_Cancel]: 'Cancelar',
    [BrightPassStrings.VaultDetail_Confirm]: 'Bloquear',

    // Entry Types
    [BrightPassStrings.EntryType_Login]: 'Inicio de sesión',
    [BrightPassStrings.EntryType_SecureNote]: 'Nota segura',
    [BrightPassStrings.EntryType_CreditCard]: 'Tarjeta de crédito',
    [BrightPassStrings.EntryType_Identity]: 'Identidad',

    // Password Generator
    [BrightPassStrings.PasswordGen_Title]: 'Generador de contraseñas',
    [BrightPassStrings.PasswordGen_Length]: 'Longitud',
    [BrightPassStrings.PasswordGen_Generate]: 'Generar',
    [BrightPassStrings.PasswordGen_Copy]: 'Copiar',
    [BrightPassStrings.PasswordGen_UsePassword]: 'Usar contraseña',
    [BrightPassStrings.PasswordGen_Strength_Weak]: 'Débil',
    [BrightPassStrings.PasswordGen_Strength_Fair]: 'Regular',
    [BrightPassStrings.PasswordGen_Strength_Strong]: 'Fuerte',
    [BrightPassStrings.PasswordGen_Strength_VeryStrong]: 'Muy fuerte',
    [BrightPassStrings.PasswordGen_Uppercase]: 'Mayúsculas',
    [BrightPassStrings.PasswordGen_Lowercase]: 'Minúsculas',
    [BrightPassStrings.PasswordGen_Digits]: 'Dígitos',
    [BrightPassStrings.PasswordGen_Symbols]: 'Símbolos',
    [BrightPassStrings.PasswordGen_Copied]: '¡Copiado!',
    [BrightPassStrings.PasswordGen_Entropy]: '{BITS} bits de entropía',

    // TOTP
    [BrightPassStrings.TOTP_Title]: 'Autenticador TOTP',
    [BrightPassStrings.TOTP_Code]: 'Código actual',
    [BrightPassStrings.TOTP_CopyCode]: 'Copiar código',
    [BrightPassStrings.TOTP_Copied]: '¡Copiado!',
    [BrightPassStrings.TOTP_SecondsRemaining]: '{SECONDS}s restantes',
    [BrightPassStrings.TOTP_QrCode]: 'Código QR',
    [BrightPassStrings.TOTP_SecretUri]: 'URI del secreto',

    // Breach Check
    [BrightPassStrings.Breach_Title]: 'Verificación de filtraciones',
    [BrightPassStrings.Breach_Check]: 'Verificar filtraciones',
    [BrightPassStrings.Breach_Password]: 'Contraseña a verificar',
    [BrightPassStrings.Breach_Found]:
      'Esta contraseña fue encontrada en {COUNT} filtraciones de datos.',
    [BrightPassStrings.Breach_NotFound]:
      'Esta contraseña no fue encontrada en ninguna filtración de datos conocida.',

    // Entry Detail
    [BrightPassStrings.EntryDetail_Title]: 'Detalles de la entrada',
    [BrightPassStrings.EntryDetail_Edit]: 'Editar',
    [BrightPassStrings.EntryDetail_Delete]: 'Eliminar',
    [BrightPassStrings.EntryDetail_ConfirmDelete]: 'Eliminar entrada',
    [BrightPassStrings.EntryDetail_ConfirmDeleteMessage]:
      '¿Está seguro de que desea eliminar esta entrada? Esta acción no se puede deshacer.',
    [BrightPassStrings.EntryDetail_Username]: 'Nombre de usuario',
    [BrightPassStrings.EntryDetail_Password]: 'Contraseña',
    [BrightPassStrings.EntryDetail_SiteUrl]: 'URL del sitio',
    [BrightPassStrings.EntryDetail_TotpSecret]: 'Secreto TOTP',
    [BrightPassStrings.EntryDetail_Content]: 'Contenido',
    [BrightPassStrings.EntryDetail_CardholderName]: 'Nombre del titular',
    [BrightPassStrings.EntryDetail_CardNumber]: 'Número de tarjeta',
    [BrightPassStrings.EntryDetail_ExpirationDate]: 'Fecha de vencimiento',
    [BrightPassStrings.EntryDetail_CVV]: 'CVV',
    [BrightPassStrings.EntryDetail_FirstName]: 'Nombre',
    [BrightPassStrings.EntryDetail_LastName]: 'Apellido',
    [BrightPassStrings.EntryDetail_Email]: 'Correo electrónico',
    [BrightPassStrings.EntryDetail_Phone]: 'Teléfono',
    [BrightPassStrings.EntryDetail_Address]: 'Dirección',
    [BrightPassStrings.EntryDetail_Notes]: 'Notas',
    [BrightPassStrings.EntryDetail_Tags]: 'Etiquetas',
    [BrightPassStrings.EntryDetail_CreatedAt]: 'Creado',
    [BrightPassStrings.EntryDetail_UpdatedAt]: 'Actualizado',
    [BrightPassStrings.EntryDetail_BreachWarning]:
      '¡Esta contraseña fue encontrada en {COUNT} filtraciones de datos!',
    [BrightPassStrings.EntryDetail_BreachSafe]:
      'Esta contraseña no fue encontrada en ninguna filtración de datos conocida.',
    [BrightPassStrings.EntryDetail_ShowPassword]: 'Mostrar',
    [BrightPassStrings.EntryDetail_HidePassword]: 'Ocultar',
    [BrightPassStrings.EntryDetail_Cancel]: 'Cancelar',

    // Entry Form
    [BrightPassStrings.EntryForm_Title_Create]: 'Crear entrada',
    [BrightPassStrings.EntryForm_Title_Edit]: 'Editar entrada',
    [BrightPassStrings.EntryForm_FieldTitle]: 'Título',
    [BrightPassStrings.EntryForm_FieldNotes]: 'Notas',
    [BrightPassStrings.EntryForm_FieldTags]: 'Etiquetas (separadas por comas)',
    [BrightPassStrings.EntryForm_FieldFavorite]: 'Favorito',
    [BrightPassStrings.EntryForm_Save]: 'Guardar',
    [BrightPassStrings.EntryForm_Cancel]: 'Cancelar',
    [BrightPassStrings.EntryForm_GeneratePassword]: 'Generar',
    [BrightPassStrings.EntryForm_TotpSecretHelp]:
      'Ingrese un secreto base32 o una URI otpauth://',

    // SearchBar
    [BrightPassStrings.SearchBar_Placeholder]:
      'Buscar por título, etiquetas o URL\u2026',
    [BrightPassStrings.SearchBar_FilterFavorites]: 'Favoritos',
    [BrightPassStrings.SearchBar_NoResults]:
      'No se encontraron entradas coincidentes',

    // Emergency Access Dialog
    [BrightPassStrings.Emergency_Title]: 'Acceso de emergencia',
    [BrightPassStrings.Emergency_Configure]: 'Configurar',
    [BrightPassStrings.Emergency_Recover]: 'Recuperar',
    [BrightPassStrings.Emergency_Threshold]:
      'Umbral (mínimo de fideicomisarios requeridos)',
    [BrightPassStrings.Emergency_Trustees]:
      'IDs de fideicomisarios (separados por comas)',
    [BrightPassStrings.Emergency_Shares]: 'Parte cifrada {INDEX}',
    [BrightPassStrings.Emergency_InsufficientShares]:
      'Partes insuficientes. Se requieren al menos {THRESHOLD} partes.',
    [BrightPassStrings.Emergency_InvalidThreshold]:
      'El umbral debe estar entre 1 y el número de fideicomisarios.',
    [BrightPassStrings.Emergency_Close]: 'Cerrar',
    [BrightPassStrings.Emergency_Error]:
      'Ocurrió un error. Por favor, inténtelo de nuevo.',
    [BrightPassStrings.Emergency_Success]: 'Operación completada con éxito.',

    // Share Dialog
    [BrightPassStrings.Share_Title]: 'Compartir bóveda',
    [BrightPassStrings.Share_SearchMembers]:
      'Buscar miembros por nombre o correo',
    [BrightPassStrings.Share_Add]: 'Agregar',
    [BrightPassStrings.Share_Revoke]: 'Revocar',
    [BrightPassStrings.Share_CurrentRecipients]: 'Destinatarios actuales',
    [BrightPassStrings.Share_NoRecipients]:
      'Esta bóveda aún no se comparte con nadie.',
    [BrightPassStrings.Share_Close]: 'Cerrar',
    [BrightPassStrings.Share_Error]:
      'Ocurrió un error. Por favor, inténtelo de nuevo.',

    // Import Dialog
    [BrightPassStrings.Import_Title]: 'Importar entradas',
    [BrightPassStrings.Import_SelectFormat]: 'Seleccionar formato',
    [BrightPassStrings.Import_Upload]: 'Subir archivo',
    [BrightPassStrings.Import_Import]: 'Importar',
    [BrightPassStrings.Import_Close]: 'Cerrar',
    [BrightPassStrings.Import_Summary]: 'Resumen de importación',
    [BrightPassStrings.Import_Imported]:
      '{COUNT} entradas importadas con éxito',
    [BrightPassStrings.Import_Skipped]: '{COUNT} entradas omitidas',
    [BrightPassStrings.Import_Errors]: 'Fila {INDEX}: {MESSAGE}',
    [BrightPassStrings.Import_InvalidFormat]:
      'El archivo subido no coincide con el formato seleccionado.',
    [BrightPassStrings.Import_Error]:
      'Ocurrió un error durante la importación. Por favor, inténtelo de nuevo.',

    // Audit Log
    [BrightPassStrings.AuditLog_Title]: 'Registro de auditoría',
    [BrightPassStrings.AuditLog_Timestamp]: 'Marca de tiempo',
    [BrightPassStrings.AuditLog_Action]: 'Acción',
    [BrightPassStrings.AuditLog_Member]: 'ID del miembro',
    [BrightPassStrings.AuditLog_FilterAll]: 'Todas las acciones',
    [BrightPassStrings.AuditLog_NoEntries]:
      'No se encontraron entradas en el registro de auditoría.',
    [BrightPassStrings.AuditLog_Error]:
      'Error al cargar el registro de auditoría. Por favor, inténtelo de nuevo.',

    // Errors
    [BrightPassStrings.Error_InvalidMasterPassword]:
      'Contraseña maestra inválida.',
    [BrightPassStrings.Error_VaultNotFound]: 'Bóveda no encontrada.',
    [BrightPassStrings.Error_Unauthorized]:
      'No está autorizado para realizar esta acción.',
  };
