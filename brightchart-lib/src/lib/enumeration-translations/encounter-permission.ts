import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { EncounterPermission } from '../encounter';

export type EncounterPermissionLanguageTranslation =
  EnumLanguageTranslation<EncounterPermission>;

export const EncounterPermissionTranslations: EncounterPermissionLanguageTranslation =
  i18nEngine.registerEnum(
    EncounterPermission,
    {
      [LanguageCodes.DE]: {
        [EncounterPermission.EncounterRead]: 'Lesen',
        [EncounterPermission.EncounterWrite]: 'Schreiben',
        [EncounterPermission.EncounterAdmin]: 'Administrator',
      },
      [LanguageCodes.EN_GB]: {
        [EncounterPermission.EncounterRead]: 'Read',
        [EncounterPermission.EncounterWrite]: 'Write',
        [EncounterPermission.EncounterAdmin]: 'Admin',
      },
      [LanguageCodes.EN_US]: {
        [EncounterPermission.EncounterRead]: 'Read',
        [EncounterPermission.EncounterWrite]: 'Write',
        [EncounterPermission.EncounterAdmin]: 'Admin',
      },
      [LanguageCodes.ES]: {
        [EncounterPermission.EncounterRead]: 'Leer',
        [EncounterPermission.EncounterWrite]: 'Escribir',
        [EncounterPermission.EncounterAdmin]: 'Administrador',
      },
      [LanguageCodes.FR]: {
        [EncounterPermission.EncounterRead]: 'Lire',
        [EncounterPermission.EncounterWrite]: 'Écrire',
        [EncounterPermission.EncounterAdmin]: 'Administrateur',
      },
      [LanguageCodes.JA]: {
        [EncounterPermission.EncounterRead]: '読取',
        [EncounterPermission.EncounterWrite]: '書込',
        [EncounterPermission.EncounterAdmin]: '管理者',
      },
      [LanguageCodes.UK]: {
        [EncounterPermission.EncounterRead]: 'Читати',
        [EncounterPermission.EncounterWrite]: 'Писати',
        [EncounterPermission.EncounterAdmin]: 'Адміністратор',
      },
      [LanguageCodes.ZH_CN]: {
        [EncounterPermission.EncounterRead]: '读取',
        [EncounterPermission.EncounterWrite]: '写入',
        [EncounterPermission.EncounterAdmin]: '管理员',
      },
    },
    'EncounterPermission',
  );
