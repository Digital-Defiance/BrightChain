import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { SchedulingPermission } from '../scheduling';

export type SchedulingPermissionLanguageTranslation =
  EnumLanguageTranslation<SchedulingPermission>;

export const SchedulingPermissionTranslations: SchedulingPermissionLanguageTranslation =
  i18nEngine.registerEnum(
    SchedulingPermission,
    {
      [LanguageCodes.DE]: {
        [SchedulingPermission.SchedulingRead]: 'Lesen',
        [SchedulingPermission.SchedulingWrite]: 'Schreiben',
        [SchedulingPermission.SchedulingAdmin]: 'Administrator',
      },
      [LanguageCodes.EN_GB]: {
        [SchedulingPermission.SchedulingRead]: 'Read',
        [SchedulingPermission.SchedulingWrite]: 'Write',
        [SchedulingPermission.SchedulingAdmin]: 'Admin',
      },
      [LanguageCodes.EN_US]: {
        [SchedulingPermission.SchedulingRead]: 'Read',
        [SchedulingPermission.SchedulingWrite]: 'Write',
        [SchedulingPermission.SchedulingAdmin]: 'Admin',
      },
      [LanguageCodes.ES]: {
        [SchedulingPermission.SchedulingRead]: 'Leer',
        [SchedulingPermission.SchedulingWrite]: 'Escribir',
        [SchedulingPermission.SchedulingAdmin]: 'Administrador',
      },
      [LanguageCodes.FR]: {
        [SchedulingPermission.SchedulingRead]: 'Lire',
        [SchedulingPermission.SchedulingWrite]: 'Écrire',
        [SchedulingPermission.SchedulingAdmin]: 'Administrateur',
      },
      [LanguageCodes.JA]: {
        [SchedulingPermission.SchedulingRead]: '読取',
        [SchedulingPermission.SchedulingWrite]: '書込',
        [SchedulingPermission.SchedulingAdmin]: '管理者',
      },
      [LanguageCodes.UK]: {
        [SchedulingPermission.SchedulingRead]: 'Читати',
        [SchedulingPermission.SchedulingWrite]: 'Писати',
        [SchedulingPermission.SchedulingAdmin]: 'Адміністратор',
      },
      [LanguageCodes.ZH_CN]: {
        [SchedulingPermission.SchedulingRead]: '读取',
        [SchedulingPermission.SchedulingWrite]: '写入',
        [SchedulingPermission.SchedulingAdmin]: '管理员',
      },
    },
    'SchedulingPermission',
  );
