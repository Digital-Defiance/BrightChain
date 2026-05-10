import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ClinicalPermission } from '../clinical';

export type ClinicalPermissionLanguageTranslation =
  EnumLanguageTranslation<ClinicalPermission>;

export const ClinicalPermissionTranslations: ClinicalPermissionLanguageTranslation =
  i18nEngine.registerEnum(
    ClinicalPermission,
    {
      [LanguageCodes.DE]: {
        [ClinicalPermission.ClinicalRead]: 'Lesen',
        [ClinicalPermission.ClinicalWrite]: 'Schreiben',
        [ClinicalPermission.ClinicalAdmin]: 'Administrator',
      },
      [LanguageCodes.EN_GB]: {
        [ClinicalPermission.ClinicalRead]: 'Read',
        [ClinicalPermission.ClinicalWrite]: 'Write',
        [ClinicalPermission.ClinicalAdmin]: 'Admin',
      },
      [LanguageCodes.EN_US]: {
        [ClinicalPermission.ClinicalRead]: 'Read',
        [ClinicalPermission.ClinicalWrite]: 'Write',
        [ClinicalPermission.ClinicalAdmin]: 'Admin',
      },
      [LanguageCodes.ES]: {
        [ClinicalPermission.ClinicalRead]: 'Leer',
        [ClinicalPermission.ClinicalWrite]: 'Escribir',
        [ClinicalPermission.ClinicalAdmin]: 'Administrador',
      },
      [LanguageCodes.FR]: {
        [ClinicalPermission.ClinicalRead]: 'Lire',
        [ClinicalPermission.ClinicalWrite]: 'Écrire',
        [ClinicalPermission.ClinicalAdmin]: 'Administrateur',
      },
      [LanguageCodes.JA]: {
        [ClinicalPermission.ClinicalRead]: '読取',
        [ClinicalPermission.ClinicalWrite]: '書込',
        [ClinicalPermission.ClinicalAdmin]: '管理者',
      },
      [LanguageCodes.UK]: {
        [ClinicalPermission.ClinicalRead]: 'Читати',
        [ClinicalPermission.ClinicalWrite]: 'Писати',
        [ClinicalPermission.ClinicalAdmin]: 'Адміністратор',
      },
      [LanguageCodes.ZH_CN]: {
        [ClinicalPermission.ClinicalRead]: '读取',
        [ClinicalPermission.ClinicalWrite]: '写入',
        [ClinicalPermission.ClinicalAdmin]: '管理员',
      },
    },
    'ClinicalPermission',
  );
