import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { DocumentPermission } from '../documentation';

export type DocumentPermissionLanguageTranslation =
  EnumLanguageTranslation<DocumentPermission>;

export const DocumentPermissionTranslations: DocumentPermissionLanguageTranslation =
  i18nEngine.registerEnum(
    DocumentPermission,
    {
      [LanguageCodes.DE]: {
        [DocumentPermission.DocumentRead]: 'Lesen',
        [DocumentPermission.DocumentWrite]: 'Schreiben',
        [DocumentPermission.DocumentSign]: 'Unterzeichnen',
        [DocumentPermission.DocumentAdmin]: 'Administrator',
      },
      [LanguageCodes.EN_GB]: {
        [DocumentPermission.DocumentRead]: 'Read',
        [DocumentPermission.DocumentWrite]: 'Write',
        [DocumentPermission.DocumentSign]: 'Sign',
        [DocumentPermission.DocumentAdmin]: 'Admin',
      },
      [LanguageCodes.EN_US]: {
        [DocumentPermission.DocumentRead]: 'Read',
        [DocumentPermission.DocumentWrite]: 'Write',
        [DocumentPermission.DocumentSign]: 'Sign',
        [DocumentPermission.DocumentAdmin]: 'Admin',
      },
      [LanguageCodes.ES]: {
        [DocumentPermission.DocumentRead]: 'Leer',
        [DocumentPermission.DocumentWrite]: 'Escribir',
        [DocumentPermission.DocumentSign]: 'Firmar',
        [DocumentPermission.DocumentAdmin]: 'Administrador',
      },
      [LanguageCodes.FR]: {
        [DocumentPermission.DocumentRead]: 'Lire',
        [DocumentPermission.DocumentWrite]: 'Écrire',
        [DocumentPermission.DocumentSign]: 'Signer',
        [DocumentPermission.DocumentAdmin]: 'Administrateur',
      },
      [LanguageCodes.JA]: {
        [DocumentPermission.DocumentRead]: '読取',
        [DocumentPermission.DocumentWrite]: '書込',
        [DocumentPermission.DocumentSign]: '署名',
        [DocumentPermission.DocumentAdmin]: '管理者',
      },
      [LanguageCodes.UK]: {
        [DocumentPermission.DocumentRead]: 'Читати',
        [DocumentPermission.DocumentWrite]: 'Писати',
        [DocumentPermission.DocumentSign]: 'Підписувати',
        [DocumentPermission.DocumentAdmin]: 'Адміністратор',
      },
      [LanguageCodes.ZH_CN]: {
        [DocumentPermission.DocumentRead]: '读取',
        [DocumentPermission.DocumentWrite]: '写入',
        [DocumentPermission.DocumentSign]: '签署',
        [DocumentPermission.DocumentAdmin]: '管理员',
      },
    },
    'DocumentPermission',
  );
