import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { MemberStatusType } from '../enumerations/memberStatusType';
import { i18nEngine } from '../i18n';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type MemberStatusTypeLanguageTranslation =
  EnumLanguageTranslation<MemberStatusType>;

export const MemberStatusTypeTranslations: MemberStatusTypeLanguageTranslation =
  i18nEngine.registerEnum(
    MemberStatusType,
    createTranslations({
      [LanguageCodes.DE]: {
        [MemberStatusType.Active]: 'Aktiv',
        [MemberStatusType.Inactive]: 'Inaktiv',
        [MemberStatusType.Suspended]: 'Gesperrt',
        [MemberStatusType.Banned]: 'Verbannt',
      },
      [LanguageCodes.EN_GB]: {
        [MemberStatusType.Active]: 'Active',
        [MemberStatusType.Inactive]: 'Inactive',
        [MemberStatusType.Suspended]: 'Suspended',
        [MemberStatusType.Banned]: 'Banned',
      },
      [LanguageCodes.EN_US]: {
        [MemberStatusType.Active]: 'Active',
        [MemberStatusType.Inactive]: 'Inactive',
        [MemberStatusType.Suspended]: 'Suspended',
        [MemberStatusType.Banned]: 'Banned',
      },
      [LanguageCodes.ES]: {
        [MemberStatusType.Active]: 'Activo',
        [MemberStatusType.Inactive]: 'Inactivo',
        [MemberStatusType.Suspended]: 'Suspendido',
        [MemberStatusType.Banned]: 'Prohibido',
      },
      [LanguageCodes.FR]: {
        [MemberStatusType.Active]: 'Actif',
        [MemberStatusType.Inactive]: 'Inactif',
        [MemberStatusType.Suspended]: 'Suspendu',
        [MemberStatusType.Banned]: 'Banni',
      },
      [LanguageCodes.JA]: {
        [MemberStatusType.Active]: 'アクティブ',
        [MemberStatusType.Inactive]: '非アクティブ',
        [MemberStatusType.Suspended]: '停止中',
        [MemberStatusType.Banned]: '禁止',
      },
      [LanguageCodes.UK]: {
        [MemberStatusType.Active]: 'Активний',
        [MemberStatusType.Inactive]: 'Неактивний',
        [MemberStatusType.Suspended]: 'Призупинений',
        [MemberStatusType.Banned]: 'Заблокований',
      },
      [LanguageCodes.ZH_CN]: {
        [MemberStatusType.Active]: '活跃',
        [MemberStatusType.Inactive]: '非活跃',
        [MemberStatusType.Suspended]: '已暂停',
        [MemberStatusType.Banned]: '已封禁',
      },
    }),
    'MemberStatusType',
  );
