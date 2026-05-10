import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { MedicationRequestStatus } from '../orders';

export type MedicationRequestStatusLanguageTranslation =
  EnumLanguageTranslation<MedicationRequestStatus>;

export const MedicationRequestStatusTranslations: MedicationRequestStatusLanguageTranslation =
  i18nEngine.registerEnum(
    MedicationRequestStatus,
    {
      [LanguageCodes.DE]: {
        [MedicationRequestStatus.Active]: 'Aktiv',
        [MedicationRequestStatus.OnHold]: 'Wartend',
        [MedicationRequestStatus.Cancelled]: 'Storniert',
        [MedicationRequestStatus.Completed]: 'Abgeschlossen',
        [MedicationRequestStatus.EnteredInError]: 'Irrtümlich eingegeben',
        [MedicationRequestStatus.Stopped]: 'Gestoppt',
        [MedicationRequestStatus.Draft]: 'Entwurf',
        [MedicationRequestStatus.Unknown]: 'Unbekannt',
      },
      [LanguageCodes.EN_GB]: {
        [MedicationRequestStatus.Active]: 'Active',
        [MedicationRequestStatus.OnHold]: 'On Hold',
        [MedicationRequestStatus.Cancelled]: 'Cancelled',
        [MedicationRequestStatus.Completed]: 'Completed',
        [MedicationRequestStatus.EnteredInError]: 'Entered in Error',
        [MedicationRequestStatus.Stopped]: 'Stopped',
        [MedicationRequestStatus.Draft]: 'Draft',
        [MedicationRequestStatus.Unknown]: 'Unknown',
      },
      [LanguageCodes.EN_US]: {
        [MedicationRequestStatus.Active]: 'Active',
        [MedicationRequestStatus.OnHold]: 'On Hold',
        [MedicationRequestStatus.Cancelled]: 'Cancelled',
        [MedicationRequestStatus.Completed]: 'Completed',
        [MedicationRequestStatus.EnteredInError]: 'Entered in Error',
        [MedicationRequestStatus.Stopped]: 'Stopped',
        [MedicationRequestStatus.Draft]: 'Draft',
        [MedicationRequestStatus.Unknown]: 'Unknown',
      },
      [LanguageCodes.ES]: {
        [MedicationRequestStatus.Active]: 'Activo',
        [MedicationRequestStatus.OnHold]: 'En espera',
        [MedicationRequestStatus.Cancelled]: 'Cancelado',
        [MedicationRequestStatus.Completed]: 'Completado',
        [MedicationRequestStatus.EnteredInError]: 'Ingresado por error',
        [MedicationRequestStatus.Stopped]: 'Detenido',
        [MedicationRequestStatus.Draft]: 'Borrador',
        [MedicationRequestStatus.Unknown]: 'Desconocido',
      },
      [LanguageCodes.FR]: {
        [MedicationRequestStatus.Active]: 'Actif',
        [MedicationRequestStatus.OnHold]: 'En attente',
        [MedicationRequestStatus.Cancelled]: 'Annulé',
        [MedicationRequestStatus.Completed]: 'Terminé',
        [MedicationRequestStatus.EnteredInError]: 'Saisi par erreur',
        [MedicationRequestStatus.Stopped]: 'Arrêté',
        [MedicationRequestStatus.Draft]: 'Brouillon',
        [MedicationRequestStatus.Unknown]: 'Inconnu',
      },
      [LanguageCodes.JA]: {
        [MedicationRequestStatus.Active]: '活動中',
        [MedicationRequestStatus.OnHold]: '保留中',
        [MedicationRequestStatus.Cancelled]: '取消済み',
        [MedicationRequestStatus.Completed]: '完了',
        [MedicationRequestStatus.EnteredInError]: '誤入力',
        [MedicationRequestStatus.Stopped]: '中止',
        [MedicationRequestStatus.Draft]: '下書き',
        [MedicationRequestStatus.Unknown]: '不明',
      },
      [LanguageCodes.UK]: {
        [MedicationRequestStatus.Active]: 'Активний',
        [MedicationRequestStatus.OnHold]: 'На утриманні',
        [MedicationRequestStatus.Cancelled]: 'Скасований',
        [MedicationRequestStatus.Completed]: 'Завершений',
        [MedicationRequestStatus.EnteredInError]: 'Помилково введений',
        [MedicationRequestStatus.Stopped]: 'Зупинений',
        [MedicationRequestStatus.Draft]: 'Чернетка',
        [MedicationRequestStatus.Unknown]: 'Невідомий',
      },
      [LanguageCodes.ZH_CN]: {
        [MedicationRequestStatus.Active]: '活跃',
        [MedicationRequestStatus.OnHold]: '暂停',
        [MedicationRequestStatus.Cancelled]: '已取消',
        [MedicationRequestStatus.Completed]: '已完成',
        [MedicationRequestStatus.EnteredInError]: '误录入',
        [MedicationRequestStatus.Stopped]: '已停止',
        [MedicationRequestStatus.Draft]: '草稿',
        [MedicationRequestStatus.Unknown]: '未知',
      },
    },
    'MedicationRequestStatus',
  );
