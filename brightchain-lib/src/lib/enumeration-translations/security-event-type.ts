import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { registerTranslation } from '../i18n';
import { SecurityEventType } from '../security';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type SecurityEventTypeLanguageTranslation =
  EnumLanguageTranslation<SecurityEventType>;

export const SecurityEventTypeTranslations: SecurityEventTypeLanguageTranslation =
  registerTranslation(
    SecurityEventType,
    createTranslations({
      [LanguageCodes.DE]: {
        [SecurityEventType.AuthenticationAttempt]: 'AUTH_VERSUCH',
        [SecurityEventType.AuthenticationSuccess]: 'AUTH_ERFOLG',
        [SecurityEventType.AuthenticationFailure]: 'AUTH_FEHLER',

        // Signature Operations
        [SecurityEventType.SignatureValidationSuccess]: 'SIG_VALID',
        [SecurityEventType.SignatureValidationFailure]: 'SIG_INVALID',
        [SecurityEventType.SignatureCreated]: 'SIG_ERSTELLT',

        // Block Operations
        [SecurityEventType.BlockCreated]: 'BLOCK_ERSTELLT',
        [SecurityEventType.BlockValidated]: 'BLOCK_VALIDIERT',
        [SecurityEventType.BlockValidationFailed]:
          'BLOCK_VALIDIERUNG_FEHLGESCHLAGEN',

        // Encryption Operations
        [SecurityEventType.EncryptionPerformed]: 'VERSCHLÜSSELT',
        [SecurityEventType.DecryptionPerformed]: 'ENTSCHLÜSSELT',
        [SecurityEventType.DecryptionFailed]: 'ENTSCHLÜSSELUNG_FEHLGESCHLAGEN',

        // Access Control
        [SecurityEventType.AccessDenied]: 'ZUGRIFF_VERWEIGERT',
        [SecurityEventType.UnauthorizedAccess]: 'UNAUTORISIERTER_ZUGRIFF',

        // Rate Limiting
        [SecurityEventType.RateLimitExceeded]: 'RATE_LIMIT_ÜBERSCHRITTEN',

        // Security Violations
        [SecurityEventType.InvalidInput]: 'UNGÜLTIGE_EINGABE',
        [SecurityEventType.SuspiciousActivity]: 'VERDÄCHTIGE_AKTIVITÄT',
      },
      [LanguageCodes.EN_GB]: {
        [SecurityEventType.AuthenticationAttempt]: 'AUTH_ATTEMPT',
        [SecurityEventType.AuthenticationSuccess]: 'AUTH_SUCCESS',
        [SecurityEventType.AuthenticationFailure]: 'AUTH_FAILURE',

        // Signature Operations
        [SecurityEventType.SignatureValidationSuccess]: 'SIG_VALID',
        [SecurityEventType.SignatureValidationFailure]: 'SIG_INVALID',
        [SecurityEventType.SignatureCreated]: 'SIG_CREATED',

        // Block Operations
        [SecurityEventType.BlockCreated]: 'BLOCK_CREATED',
        [SecurityEventType.BlockValidated]: 'BLOCK_VALIDATED',
        [SecurityEventType.BlockValidationFailed]: 'BLOCK_VALIDATION_FAILED',

        // Encryption Operations
        [SecurityEventType.EncryptionPerformed]: 'ENCRYPTED',
        [SecurityEventType.DecryptionPerformed]: 'DECRYPTED',
        [SecurityEventType.DecryptionFailed]: 'DECRYPT_FAILED',

        // Access Control
        [SecurityEventType.AccessDenied]: 'ACCESS_DENIED',
        [SecurityEventType.UnauthorizedAccess]: 'UNAUTHORIZED',

        // Rate Limiting
        [SecurityEventType.RateLimitExceeded]: 'RATE_LIMIT_EXCEEDED',

        // Security Violations
        [SecurityEventType.InvalidInput]: 'INVALID_INPUT',
        [SecurityEventType.SuspiciousActivity]: 'SUSPICIOUS',
      },
      [LanguageCodes.EN_US]: {
        [SecurityEventType.AuthenticationAttempt]: 'AUTH_ATTEMPT',
        [SecurityEventType.AuthenticationSuccess]: 'AUTH_SUCCESS',
        [SecurityEventType.AuthenticationFailure]: 'AUTH_FAILURE',

        // Signature Operations
        [SecurityEventType.SignatureValidationSuccess]: 'SIG_VALID',
        [SecurityEventType.SignatureValidationFailure]: 'SIG_INVALID',
        [SecurityEventType.SignatureCreated]: 'SIG_CREATED',

        // Block Operations
        [SecurityEventType.BlockCreated]: 'BLOCK_CREATED',
        [SecurityEventType.BlockValidated]: 'BLOCK_VALIDATED',
        [SecurityEventType.BlockValidationFailed]: 'BLOCK_VALIDATION_FAILED',

        // Encryption Operations
        [SecurityEventType.EncryptionPerformed]: 'ENCRYPTED',
        [SecurityEventType.DecryptionPerformed]: 'DECRYPTED',
        [SecurityEventType.DecryptionFailed]: 'DECRYPT_FAILED',

        // Access Control
        [SecurityEventType.AccessDenied]: 'ACCESS_DENIED',
        [SecurityEventType.UnauthorizedAccess]: 'UNAUTHORIZED',

        // Rate Limiting
        [SecurityEventType.RateLimitExceeded]: 'RATE_LIMIT_EXCEEDED',

        // Security Violations
        [SecurityEventType.InvalidInput]: 'INVALID_INPUT',
        [SecurityEventType.SuspiciousActivity]: 'SUSPICIOUS',
      },
      [LanguageCodes.ES]: {
        [SecurityEventType.AuthenticationAttempt]: 'INTENTO_AUTENTICACIÓN',
        [SecurityEventType.AuthenticationSuccess]: 'AUTENTICACIÓN_EXITOSA',
        [SecurityEventType.AuthenticationFailure]: 'FALLA_AUTENTICACIÓN',

        // Signature Operations
        [SecurityEventType.SignatureValidationSuccess]:
          'VALIDACIÓN_FIRMA_EXITOSA',
        [SecurityEventType.SignatureValidationFailure]:
          'FALLA_VALIDACIÓN_FIRMA',
        [SecurityEventType.SignatureCreated]: 'FIRMA_CREADA',

        // Block Operations
        [SecurityEventType.BlockCreated]: 'BLOQUE_CREADO',
        [SecurityEventType.BlockValidated]: 'BLOQUE_VALIDADO',
        [SecurityEventType.BlockValidationFailed]: 'FALLA_VALIDACIÓN_BLOQUE',

        // Encryption Operations
        [SecurityEventType.EncryptionPerformed]: 'ENCRIPTADO_REALIZADO',
        [SecurityEventType.DecryptionPerformed]: 'DESENCRIPTADO_REALIZADO',
        [SecurityEventType.DecryptionFailed]: 'FALLA_DESENCRIPTADO',

        // Access Control
        [SecurityEventType.AccessDenied]: 'ACCESO_DENEGADO',
        [SecurityEventType.UnauthorizedAccess]: 'ACCESO_NO_AUTORIZADO',

        // Rate Limiting
        [SecurityEventType.RateLimitExceeded]: 'LÍMITE_TASA_EXCEDIDO',

        // Security Violations
        [SecurityEventType.InvalidInput]: 'ENTRADA_INVÁLIDA',
        [SecurityEventType.SuspiciousActivity]: 'ACTIVIDAD_SOSPECHOSA',
      },
      [LanguageCodes.FR]: {
        [SecurityEventType.AuthenticationAttempt]: 'TENTATIVE_AUTHENTIFICATION',
        [SecurityEventType.AuthenticationSuccess]: 'AUTHENTIFICATION_RÉUSSIE',
        [SecurityEventType.AuthenticationFailure]: 'ÉCHEC_AUTHENTIFICATION',

        // Signature Operations
        [SecurityEventType.SignatureValidationSuccess]:
          'VALIDATION_SIGNATURE_RÉUSSIE',
        [SecurityEventType.SignatureValidationFailure]:
          'ÉCHEC_VALIDATION_SIGNATURE',
        [SecurityEventType.SignatureCreated]: 'SIGNATURE_CRÉÉE',

        // Block Operations
        [SecurityEventType.BlockCreated]: 'BLOC_CRÉÉ',
        [SecurityEventType.BlockValidated]: 'BLOC_VALIDÉ',
        [SecurityEventType.BlockValidationFailed]: 'ÉCHEC_VALIDATION_BLOC',

        // Encryption Operations
        [SecurityEventType.EncryptionPerformed]: 'CHIFFREMENT_EFFECTUÉ',
        [SecurityEventType.DecryptionPerformed]: 'DÉCHIFFREMENT_EFFECTUÉ',
        [SecurityEventType.DecryptionFailed]: 'ÉCHEC_DÉCHIFFREMENT',

        // Access Control
        [SecurityEventType.AccessDenied]: 'ACCÈS_REFUSÉ',
        [SecurityEventType.UnauthorizedAccess]: 'ACCÈS_NON_AUTORISÉ',

        // Rate Limiting
        [SecurityEventType.RateLimitExceeded]: 'LIMITE_TAUX_DÉPASSÉE',

        // Security Violations
        [SecurityEventType.InvalidInput]: 'ENTRÉE_NON_VALIDE',
        [SecurityEventType.SuspiciousActivity]: 'ACTIVITÉ_SUSPECTE',
      },
      [LanguageCodes.JA]: {
        [SecurityEventType.AuthenticationAttempt]: '認証試行',
        [SecurityEventType.AuthenticationSuccess]: '認証成功',
        [SecurityEventType.AuthenticationFailure]: '認証失敗',

        // Signature Operations
        [SecurityEventType.SignatureValidationSuccess]: '署名検証成功',
        [SecurityEventType.SignatureValidationFailure]: '署名検証失敗',
        [SecurityEventType.SignatureCreated]: '署名作成済み',

        // Block Operations
        [SecurityEventType.BlockCreated]: 'ブロック作成済み',
        [SecurityEventType.BlockValidated]: 'ブロック検証済み',
        [SecurityEventType.BlockValidationFailed]: 'ブロック検証失敗',

        // Encryption Operations
        [SecurityEventType.EncryptionPerformed]: '暗号化実行済み',
        [SecurityEventType.DecryptionPerformed]: '復号化実行済み',
        [SecurityEventType.DecryptionFailed]: '復号化失敗',

        // Access Control
        [SecurityEventType.AccessDenied]: 'アクセス拒否',
        [SecurityEventType.UnauthorizedAccess]: '不正アクセス',

        // Rate Limiting
        [SecurityEventType.RateLimitExceeded]: 'レート制限超過',

        // Security Violations
        [SecurityEventType.InvalidInput]: '無効な入力',
        [SecurityEventType.SuspiciousActivity]: '疑わしい活動',
      },
      [LanguageCodes.UK]: {
        [SecurityEventType.AuthenticationAttempt]: 'СПРОБА_АВТОРИЗАЦІЇ',
        [SecurityEventType.AuthenticationSuccess]: 'АВТОРИЗАЦІЯ_УСПІШНА',
        [SecurityEventType.AuthenticationFailure]: 'ПОМИЛКА_АВТОРИЗАЦІЇ',

        // Signature Operations
        [SecurityEventType.SignatureValidationSuccess]:
          'ПЕРЕВІРКА_ПІДПИСУ_УСПІШНА',
        [SecurityEventType.SignatureValidationFailure]:
          'ПОМИЛКА_ПЕРЕВІРКИ_ПІДПИСУ',
        [SecurityEventType.SignatureCreated]: 'ПІДПИС_СТВОРЕНО',

        // Block Operations
        [SecurityEventType.BlockCreated]: 'БЛОК_СТВОРЕНО',
        [SecurityEventType.BlockValidated]: 'БЛОК_ПЕРЕВІРЕНО',
        [SecurityEventType.BlockValidationFailed]: 'ПОМИЛКА_ПЕРЕВІРКИ_БЛОКУ',

        // Encryption Operations
        [SecurityEventType.EncryptionPerformed]: 'ШИФРУВАННЯ_ВИКОНАНО',
        [SecurityEventType.DecryptionPerformed]: 'ДЕШИФРУВАННЯ_ВИКОНАНО',
        [SecurityEventType.DecryptionFailed]: 'ПОМИЛКА_ДЕШИФРУВАННЯ',

        // Access Control
        [SecurityEventType.AccessDenied]: 'ДОСТУП_ЗАБОРОНЕНО',
        [SecurityEventType.UnauthorizedAccess]: 'НЕАВТОРИЗОВАНИЙ_ДОСТУП',

        // Rate Limiting
        [SecurityEventType.RateLimitExceeded]: 'ПЕРЕВИЩЕННЯ_ЛІМІТУ_ШАВЛЕННЯ',

        // Security Violations
        [SecurityEventType.InvalidInput]: 'НЕВІРНЕ_ВХІДНЕ_ЗНАЧЕННЯ',
        [SecurityEventType.SuspiciousActivity]: 'ПІДОЗРІЛА_АКТИВНІСТЬ',
      },
      [LanguageCodes.ZH_CN]: {
        [SecurityEventType.AuthenticationAttempt]: '认证尝试',
        [SecurityEventType.AuthenticationSuccess]: '认证成功',
        [SecurityEventType.AuthenticationFailure]: '认证失败',

        // Signature Operations
        [SecurityEventType.SignatureValidationSuccess]: '签名验证成功',
        [SecurityEventType.SignatureValidationFailure]: '签名验证失败',
        [SecurityEventType.SignatureCreated]: '签名已创建',

        // Block Operations
        [SecurityEventType.BlockCreated]: '区块已创建',
        [SecurityEventType.BlockValidated]: '区块已验证',
        [SecurityEventType.BlockValidationFailed]: '区块验证失败',

        // Encryption Operations
        [SecurityEventType.EncryptionPerformed]: '加密已执行',
        [SecurityEventType.DecryptionPerformed]: '解密已执行',
        [SecurityEventType.DecryptionFailed]: '解密失败',

        // Access Control
        [SecurityEventType.AccessDenied]: '拒绝访问',
        [SecurityEventType.UnauthorizedAccess]: '未授权访问',

        // Rate Limiting
        [SecurityEventType.RateLimitExceeded]: '超出速率限制',

        // Security Violations
        [SecurityEventType.InvalidInput]: '无效输入',
        [SecurityEventType.SuspiciousActivity]: '可疑活动',
      },
    }),
  );
