import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ObservationStatus } from '../clinical';

export type ObservationStatusLanguageTranslation =
  EnumLanguageTranslation<ObservationStatus>;

export const ObservationStatusTranslations: ObservationStatusLanguageTranslation =
  i18nEngine.registerEnum(
    ObservationStatus,
    {
      [LanguageCodes.DE]: {
        [ObservationStatus.Registered]: 'Registriert',
        [ObservationStatus.Preliminary]: 'Vorläufig',
        [ObservationStatus.Final]: 'Endgültig',
        [ObservationStatus.Amended]: 'Geändert',
        [ObservationStatus.Corrected]: 'Korrigiert',
        [ObservationStatus.Cancelled]: 'Storniert',
        [ObservationStatus.EnteredInError]: 'Irrtümlich eingegeben',
        [ObservationStatus.Unknown]: 'Unbekannt',
      },
      [LanguageCodes.EN_GB]: {
        [ObservationStatus.Registered]: 'Registered',
        [ObservationStatus.Preliminary]: 'Preliminary',
        [ObservationStatus.Final]: 'Final',
        [ObservationStatus.Amended]: 'Amended',
        [ObservationStatus.Corrected]: 'Corrected',
        [ObservationStatus.Cancelled]: 'Cancelled',
        [ObservationStatus.EnteredInError]: 'Entered in Error',
        [ObservationStatus.Unknown]: 'Unknown',
      },
      [LanguageCodes.EN_US]: {
        [ObservationStatus.Registered]: 'Registered',
        [ObservationStatus.Preliminary]: 'Preliminary',
        [ObservationStatus.Final]: 'Final',
        [ObservationStatus.Amended]: 'Amended',
        [ObservationStatus.Corrected]: 'Corrected',
        [ObservationStatus.Cancelled]: 'Cancelled',
        [ObservationStatus.EnteredInError]: 'Entered in Error',
        [ObservationStatus.Unknown]: 'Unknown',
      },
      [LanguageCodes.ES]: {
        [ObservationStatus.Registered]: 'Registrado',
        [ObservationStatus.Preliminary]: 'Preliminar',
        [ObservationStatus.Final]: 'Final',
        [ObservationStatus.Amended]: 'Modificado',
        [ObservationStatus.Corrected]: 'Corregido',
        [ObservationStatus.Cancelled]: 'Cancelado',
        [ObservationStatus.EnteredInError]: 'Ingresado por error',
        [ObservationStatus.Unknown]: 'Desconocido',
      },
      [LanguageCodes.FR]: {
        [ObservationStatus.Registered]: 'Enregistré',
        [ObservationStatus.Preliminary]: 'Préliminaire',
        [ObservationStatus.Final]: 'Final',
        [ObservationStatus.Amended]: 'Modifié',
        [ObservationStatus.Corrected]: 'Corrigé',
        [ObservationStatus.Cancelled]: 'Annulé',
        [ObservationStatus.EnteredInError]: 'Saisi par erreur',
        [ObservationStatus.Unknown]: 'Inconnu',
      },
      [LanguageCodes.JA]: {
        [ObservationStatus.Registered]: '登録済み',
        [ObservationStatus.Preliminary]: '暫定',
        [ObservationStatus.Final]: '最終',
        [ObservationStatus.Amended]: '修正済み',
        [ObservationStatus.Corrected]: '訂正済み',
        [ObservationStatus.Cancelled]: '取消済み',
        [ObservationStatus.EnteredInError]: '誤入力',
        [ObservationStatus.Unknown]: '不明',
      },
      [LanguageCodes.UK]: {
        [ObservationStatus.Registered]: 'Зареєстрований',
        [ObservationStatus.Preliminary]: 'Попередній',
        [ObservationStatus.Final]: 'Остаточний',
        [ObservationStatus.Amended]: 'Змінений',
        [ObservationStatus.Corrected]: 'Виправлений',
        [ObservationStatus.Cancelled]: 'Скасований',
        [ObservationStatus.EnteredInError]: 'Помилково введений',
        [ObservationStatus.Unknown]: 'Невідомий',
      },
      [LanguageCodes.ZH_CN]: {
        [ObservationStatus.Registered]: '已登记',
        [ObservationStatus.Preliminary]: '初步',
        [ObservationStatus.Final]: '最终',
        [ObservationStatus.Amended]: '已修改',
        [ObservationStatus.Corrected]: '已更正',
        [ObservationStatus.Cancelled]: '已取消',
        [ObservationStatus.EnteredInError]: '误录入',
        [ObservationStatus.Unknown]: '未知',
      },
    },
    'ObservationStatus',
  );
