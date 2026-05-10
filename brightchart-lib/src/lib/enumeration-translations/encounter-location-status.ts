import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { EncounterLocationStatus } from '../encounter';

export type EncounterLocationStatusLanguageTranslation =
  EnumLanguageTranslation<EncounterLocationStatus>;

export const EncounterLocationStatusTranslations: EncounterLocationStatusLanguageTranslation =
  i18nEngine.registerEnum(
    EncounterLocationStatus,
    {
      [LanguageCodes.DE]: {
        [EncounterLocationStatus.Planned]: 'Geplant',
        [EncounterLocationStatus.Active]: 'Aktiv',
        [EncounterLocationStatus.Reserved]: 'Reserviert',
        [EncounterLocationStatus.Completed]: 'Abgeschlossen',
      },
      [LanguageCodes.EN_GB]: {
        [EncounterLocationStatus.Planned]: 'Planned',
        [EncounterLocationStatus.Active]: 'Active',
        [EncounterLocationStatus.Reserved]: 'Reserved',
        [EncounterLocationStatus.Completed]: 'Completed',
      },
      [LanguageCodes.EN_US]: {
        [EncounterLocationStatus.Planned]: 'Planned',
        [EncounterLocationStatus.Active]: 'Active',
        [EncounterLocationStatus.Reserved]: 'Reserved',
        [EncounterLocationStatus.Completed]: 'Completed',
      },
      [LanguageCodes.ES]: {
        [EncounterLocationStatus.Planned]: 'Planificado',
        [EncounterLocationStatus.Active]: 'Activo',
        [EncounterLocationStatus.Reserved]: 'Reservado',
        [EncounterLocationStatus.Completed]: 'Completado',
      },
      [LanguageCodes.FR]: {
        [EncounterLocationStatus.Planned]: 'Planifié',
        [EncounterLocationStatus.Active]: 'Actif',
        [EncounterLocationStatus.Reserved]: 'Réservé',
        [EncounterLocationStatus.Completed]: 'Terminé',
      },
      [LanguageCodes.JA]: {
        [EncounterLocationStatus.Planned]: '計画済み',
        [EncounterLocationStatus.Active]: '活動中',
        [EncounterLocationStatus.Reserved]: '予約済み',
        [EncounterLocationStatus.Completed]: '完了',
      },
      [LanguageCodes.UK]: {
        [EncounterLocationStatus.Planned]: 'Запланований',
        [EncounterLocationStatus.Active]: 'Активний',
        [EncounterLocationStatus.Reserved]: 'Зарезервований',
        [EncounterLocationStatus.Completed]: 'Завершений',
      },
      [LanguageCodes.ZH_CN]: {
        [EncounterLocationStatus.Planned]: '已计划',
        [EncounterLocationStatus.Active]: '活跃',
        [EncounterLocationStatus.Reserved]: '已预留',
        [EncounterLocationStatus.Completed]: '已完成',
      },
    },
    'EncounterLocationStatus',
  );
