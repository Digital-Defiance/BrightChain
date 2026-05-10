import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { MedicationStatementStatus } from '../clinical';

export type MedicationStatementStatusLanguageTranslation =
  EnumLanguageTranslation<MedicationStatementStatus>;

export const MedicationStatementStatusTranslations: MedicationStatementStatusLanguageTranslation =
  i18nEngine.registerEnum(
    MedicationStatementStatus,
    {
      [LanguageCodes.DE]: {
        [MedicationStatementStatus.Active]: 'Aktiv',
        [MedicationStatementStatus.Completed]: 'Abgeschlossen',
        [MedicationStatementStatus.EnteredInError]: 'Irrtümlich eingegeben',
        [MedicationStatementStatus.Intended]: 'Beabsichtigt',
        [MedicationStatementStatus.Stopped]: 'Gestoppt',
        [MedicationStatementStatus.OnHold]: 'Wartend',
        [MedicationStatementStatus.Unknown]: 'Unbekannt',
        [MedicationStatementStatus.NotTaken]: 'Nicht eingenommen',
      },
      [LanguageCodes.EN_GB]: {
        [MedicationStatementStatus.Active]: 'Active',
        [MedicationStatementStatus.Completed]: 'Completed',
        [MedicationStatementStatus.EnteredInError]: 'Entered in Error',
        [MedicationStatementStatus.Intended]: 'Intended',
        [MedicationStatementStatus.Stopped]: 'Stopped',
        [MedicationStatementStatus.OnHold]: 'On Hold',
        [MedicationStatementStatus.Unknown]: 'Unknown',
        [MedicationStatementStatus.NotTaken]: 'Not Taken',
      },
      [LanguageCodes.EN_US]: {
        [MedicationStatementStatus.Active]: 'Active',
        [MedicationStatementStatus.Completed]: 'Completed',
        [MedicationStatementStatus.EnteredInError]: 'Entered in Error',
        [MedicationStatementStatus.Intended]: 'Intended',
        [MedicationStatementStatus.Stopped]: 'Stopped',
        [MedicationStatementStatus.OnHold]: 'On Hold',
        [MedicationStatementStatus.Unknown]: 'Unknown',
        [MedicationStatementStatus.NotTaken]: 'Not Taken',
      },
      [LanguageCodes.ES]: {
        [MedicationStatementStatus.Active]: 'Activo',
        [MedicationStatementStatus.Completed]: 'Completado',
        [MedicationStatementStatus.EnteredInError]: 'Ingresado por error',
        [MedicationStatementStatus.Intended]: 'Previsto',
        [MedicationStatementStatus.Stopped]: 'Detenido',
        [MedicationStatementStatus.OnHold]: 'En espera',
        [MedicationStatementStatus.Unknown]: 'Desconocido',
        [MedicationStatementStatus.NotTaken]: 'No tomado',
      },
      [LanguageCodes.FR]: {
        [MedicationStatementStatus.Active]: 'Actif',
        [MedicationStatementStatus.Completed]: 'Terminé',
        [MedicationStatementStatus.EnteredInError]: 'Saisi par erreur',
        [MedicationStatementStatus.Intended]: 'Prévu',
        [MedicationStatementStatus.Stopped]: 'Arrêté',
        [MedicationStatementStatus.OnHold]: 'En attente',
        [MedicationStatementStatus.Unknown]: 'Inconnu',
        [MedicationStatementStatus.NotTaken]: 'Non pris',
      },
      [LanguageCodes.JA]: {
        [MedicationStatementStatus.Active]: '活動中',
        [MedicationStatementStatus.Completed]: '完了',
        [MedicationStatementStatus.EnteredInError]: '誤入力',
        [MedicationStatementStatus.Intended]: '予定',
        [MedicationStatementStatus.Stopped]: '中止',
        [MedicationStatementStatus.OnHold]: '保留中',
        [MedicationStatementStatus.Unknown]: '不明',
        [MedicationStatementStatus.NotTaken]: '未服用',
      },
      [LanguageCodes.UK]: {
        [MedicationStatementStatus.Active]: 'Активний',
        [MedicationStatementStatus.Completed]: 'Завершений',
        [MedicationStatementStatus.EnteredInError]: 'Помилково введений',
        [MedicationStatementStatus.Intended]: 'Запланований',
        [MedicationStatementStatus.Stopped]: 'Зупинений',
        [MedicationStatementStatus.OnHold]: 'На утриманні',
        [MedicationStatementStatus.Unknown]: 'Невідомий',
        [MedicationStatementStatus.NotTaken]: 'Не прийнятий',
      },
      [LanguageCodes.ZH_CN]: {
        [MedicationStatementStatus.Active]: '活跃',
        [MedicationStatementStatus.Completed]: '已完成',
        [MedicationStatementStatus.EnteredInError]: '误录入',
        [MedicationStatementStatus.Intended]: '计划中',
        [MedicationStatementStatus.Stopped]: '已停止',
        [MedicationStatementStatus.OnHold]: '暂停',
        [MedicationStatementStatus.Unknown]: '未知',
        [MedicationStatementStatus.NotTaken]: '未服用',
      },
    },
    'MedicationStatementStatus',
  );
