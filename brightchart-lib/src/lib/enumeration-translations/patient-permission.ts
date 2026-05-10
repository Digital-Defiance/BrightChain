import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { PatientPermission } from '../access';

export type PatientPermissionLanguageTranslation =
  EnumLanguageTranslation<PatientPermission>;

export const PatientPermissionTranslations: PatientPermissionLanguageTranslation =
  i18nEngine.registerEnum(
    PatientPermission,
    {
      [LanguageCodes.DE]: {
        [PatientPermission.Read]: 'Lesen',
        [PatientPermission.Write]: 'Schreiben',
        [PatientPermission.Merge]: 'Zusammenführen',
        [PatientPermission.Search]: 'Suchen',
        [PatientPermission.Admin]: 'Administrator',
      },
      [LanguageCodes.EN_GB]: {
        [PatientPermission.Read]: 'Read',
        [PatientPermission.Write]: 'Write',
        [PatientPermission.Merge]: 'Merge',
        [PatientPermission.Search]: 'Search',
        [PatientPermission.Admin]: 'Admin',
      },
      [LanguageCodes.EN_US]: {
        [PatientPermission.Read]: 'Read',
        [PatientPermission.Write]: 'Write',
        [PatientPermission.Merge]: 'Merge',
        [PatientPermission.Search]: 'Search',
        [PatientPermission.Admin]: 'Admin',
      },
      [LanguageCodes.ES]: {
        [PatientPermission.Read]: 'Leer',
        [PatientPermission.Write]: 'Escribir',
        [PatientPermission.Merge]: 'Fusionar',
        [PatientPermission.Search]: 'Buscar',
        [PatientPermission.Admin]: 'Administrador',
      },
      [LanguageCodes.FR]: {
        [PatientPermission.Read]: 'Lire',
        [PatientPermission.Write]: 'Écrire',
        [PatientPermission.Merge]: 'Fusionner',
        [PatientPermission.Search]: 'Rechercher',
        [PatientPermission.Admin]: 'Administrateur',
      },
      [LanguageCodes.JA]: {
        [PatientPermission.Read]: '読取',
        [PatientPermission.Write]: '書込',
        [PatientPermission.Merge]: '統合',
        [PatientPermission.Search]: '検索',
        [PatientPermission.Admin]: '管理者',
      },
      [LanguageCodes.UK]: {
        [PatientPermission.Read]: 'Читати',
        [PatientPermission.Write]: 'Писати',
        [PatientPermission.Merge]: "Об'єднати",
        [PatientPermission.Search]: 'Шукати',
        [PatientPermission.Admin]: 'Адміністратор',
      },
      [LanguageCodes.ZH_CN]: {
        [PatientPermission.Read]: '读取',
        [PatientPermission.Write]: '写入',
        [PatientPermission.Merge]: '合并',
        [PatientPermission.Search]: '搜索',
        [PatientPermission.Admin]: '管理员',
      },
    },
    'PatientPermission',
  );
