import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { WaitlistEntryStatus } from '../scheduling';

export type WaitlistEntryStatusLanguageTranslation =
  EnumLanguageTranslation<WaitlistEntryStatus>;

export const WaitlistEntryStatusTranslations: WaitlistEntryStatusLanguageTranslation =
  i18nEngine.registerEnum(
    WaitlistEntryStatus,
    {
      [LanguageCodes.DE]: {
        [WaitlistEntryStatus.Waiting]: 'Wartend',
        [WaitlistEntryStatus.Offered]: 'Angeboten',
        [WaitlistEntryStatus.Booked]: 'Gebucht',
        [WaitlistEntryStatus.Cancelled]: 'Storniert',
        [WaitlistEntryStatus.Expired]: 'Abgelaufen',
      },
      [LanguageCodes.EN_GB]: {
        [WaitlistEntryStatus.Waiting]: 'Waiting',
        [WaitlistEntryStatus.Offered]: 'Offered',
        [WaitlistEntryStatus.Booked]: 'Booked',
        [WaitlistEntryStatus.Cancelled]: 'Cancelled',
        [WaitlistEntryStatus.Expired]: 'Expired',
      },
      [LanguageCodes.EN_US]: {
        [WaitlistEntryStatus.Waiting]: 'Waiting',
        [WaitlistEntryStatus.Offered]: 'Offered',
        [WaitlistEntryStatus.Booked]: 'Booked',
        [WaitlistEntryStatus.Cancelled]: 'Cancelled',
        [WaitlistEntryStatus.Expired]: 'Expired',
      },
      [LanguageCodes.ES]: {
        [WaitlistEntryStatus.Waiting]: 'Esperando',
        [WaitlistEntryStatus.Offered]: 'Ofrecido',
        [WaitlistEntryStatus.Booked]: 'Reservado',
        [WaitlistEntryStatus.Cancelled]: 'Cancelado',
        [WaitlistEntryStatus.Expired]: 'Expirado',
      },
      [LanguageCodes.FR]: {
        [WaitlistEntryStatus.Waiting]: 'En attente',
        [WaitlistEntryStatus.Offered]: 'Proposé',
        [WaitlistEntryStatus.Booked]: 'Réservé',
        [WaitlistEntryStatus.Cancelled]: 'Annulé',
        [WaitlistEntryStatus.Expired]: 'Expiré',
      },
      [LanguageCodes.JA]: {
        [WaitlistEntryStatus.Waiting]: '待機中',
        [WaitlistEntryStatus.Offered]: '提案済み',
        [WaitlistEntryStatus.Booked]: '予約済み',
        [WaitlistEntryStatus.Cancelled]: '取消済み',
        [WaitlistEntryStatus.Expired]: '期限切れ',
      },
      [LanguageCodes.UK]: {
        [WaitlistEntryStatus.Waiting]: 'Очікує',
        [WaitlistEntryStatus.Offered]: 'Запропоновано',
        [WaitlistEntryStatus.Booked]: 'Заброньовано',
        [WaitlistEntryStatus.Cancelled]: 'Скасовано',
        [WaitlistEntryStatus.Expired]: 'Закінчився термін',
      },
      [LanguageCodes.ZH_CN]: {
        [WaitlistEntryStatus.Waiting]: '等待中',
        [WaitlistEntryStatus.Offered]: '已提供',
        [WaitlistEntryStatus.Booked]: '已预约',
        [WaitlistEntryStatus.Cancelled]: '已取消',
        [WaitlistEntryStatus.Expired]: '已过期',
      },
    },
    'WaitlistEntryStatus',
  );
