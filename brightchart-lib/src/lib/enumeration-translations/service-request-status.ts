import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ServiceRequestStatus } from '../orders';

export type ServiceRequestStatusLanguageTranslation =
  EnumLanguageTranslation<ServiceRequestStatus>;

export const ServiceRequestStatusTranslations: ServiceRequestStatusLanguageTranslation =
  i18nEngine.registerEnum(
    ServiceRequestStatus,
    {
      [LanguageCodes.DE]: {
        [ServiceRequestStatus.Draft]: 'Entwurf',
        [ServiceRequestStatus.Active]: 'Aktiv',
        [ServiceRequestStatus.OnHold]: 'Wartend',
        [ServiceRequestStatus.Revoked]: 'Widerrufen',
        [ServiceRequestStatus.Completed]: 'Abgeschlossen',
        [ServiceRequestStatus.EnteredInError]: 'Irrtümlich eingegeben',
        [ServiceRequestStatus.Unknown]: 'Unbekannt',
      },
      [LanguageCodes.EN_GB]: {
        [ServiceRequestStatus.Draft]: 'Draft',
        [ServiceRequestStatus.Active]: 'Active',
        [ServiceRequestStatus.OnHold]: 'On Hold',
        [ServiceRequestStatus.Revoked]: 'Revoked',
        [ServiceRequestStatus.Completed]: 'Completed',
        [ServiceRequestStatus.EnteredInError]: 'Entered in Error',
        [ServiceRequestStatus.Unknown]: 'Unknown',
      },
      [LanguageCodes.EN_US]: {
        [ServiceRequestStatus.Draft]: 'Draft',
        [ServiceRequestStatus.Active]: 'Active',
        [ServiceRequestStatus.OnHold]: 'On Hold',
        [ServiceRequestStatus.Revoked]: 'Revoked',
        [ServiceRequestStatus.Completed]: 'Completed',
        [ServiceRequestStatus.EnteredInError]: 'Entered in Error',
        [ServiceRequestStatus.Unknown]: 'Unknown',
      },
      [LanguageCodes.ES]: {
        [ServiceRequestStatus.Draft]: 'Borrador',
        [ServiceRequestStatus.Active]: 'Activo',
        [ServiceRequestStatus.OnHold]: 'En espera',
        [ServiceRequestStatus.Revoked]: 'Revocado',
        [ServiceRequestStatus.Completed]: 'Completado',
        [ServiceRequestStatus.EnteredInError]: 'Ingresado por error',
        [ServiceRequestStatus.Unknown]: 'Desconocido',
      },
      [LanguageCodes.FR]: {
        [ServiceRequestStatus.Draft]: 'Brouillon',
        [ServiceRequestStatus.Active]: 'Actif',
        [ServiceRequestStatus.OnHold]: 'En attente',
        [ServiceRequestStatus.Revoked]: 'Révoqué',
        [ServiceRequestStatus.Completed]: 'Terminé',
        [ServiceRequestStatus.EnteredInError]: 'Saisi par erreur',
        [ServiceRequestStatus.Unknown]: 'Inconnu',
      },
      [LanguageCodes.JA]: {
        [ServiceRequestStatus.Draft]: '下書き',
        [ServiceRequestStatus.Active]: '活動中',
        [ServiceRequestStatus.OnHold]: '保留中',
        [ServiceRequestStatus.Revoked]: '取消',
        [ServiceRequestStatus.Completed]: '完了',
        [ServiceRequestStatus.EnteredInError]: '誤入力',
        [ServiceRequestStatus.Unknown]: '不明',
      },
      [LanguageCodes.UK]: {
        [ServiceRequestStatus.Draft]: 'Чернетка',
        [ServiceRequestStatus.Active]: 'Активний',
        [ServiceRequestStatus.OnHold]: 'На утриманні',
        [ServiceRequestStatus.Revoked]: 'Відкликаний',
        [ServiceRequestStatus.Completed]: 'Завершений',
        [ServiceRequestStatus.EnteredInError]: 'Помилково введений',
        [ServiceRequestStatus.Unknown]: 'Невідомий',
      },
      [LanguageCodes.ZH_CN]: {
        [ServiceRequestStatus.Draft]: '草稿',
        [ServiceRequestStatus.Active]: '活跃',
        [ServiceRequestStatus.OnHold]: '暂停',
        [ServiceRequestStatus.Revoked]: '撤销',
        [ServiceRequestStatus.Completed]: '已完成',
        [ServiceRequestStatus.EnteredInError]: '误录入',
        [ServiceRequestStatus.Unknown]: '未知',
      },
    },
    'ServiceRequestStatus',
  );
