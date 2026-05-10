import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { RemittanceOutcome } from '../billing';

export type RemittanceOutcomeLanguageTranslation =
  EnumLanguageTranslation<RemittanceOutcome>;

export const RemittanceOutcomeTranslations: RemittanceOutcomeLanguageTranslation =
  i18nEngine.registerEnum(
    RemittanceOutcome,
    {
      [LanguageCodes.DE]: {
        [RemittanceOutcome.Queued]: 'In der Warteschlange',
        [RemittanceOutcome.Complete]: 'Vollständig',
        [RemittanceOutcome.Error]: 'Fehler',
        [RemittanceOutcome.Partial]: 'Teilweise',
      },
      [LanguageCodes.EN_GB]: {
        [RemittanceOutcome.Queued]: 'Queued',
        [RemittanceOutcome.Complete]: 'Complete',
        [RemittanceOutcome.Error]: 'Error',
        [RemittanceOutcome.Partial]: 'Partial',
      },
      [LanguageCodes.EN_US]: {
        [RemittanceOutcome.Queued]: 'Queued',
        [RemittanceOutcome.Complete]: 'Complete',
        [RemittanceOutcome.Error]: 'Error',
        [RemittanceOutcome.Partial]: 'Partial',
      },
      [LanguageCodes.ES]: {
        [RemittanceOutcome.Queued]: 'En cola de espera',
        [RemittanceOutcome.Complete]: 'Completo',
        [RemittanceOutcome.Error]: 'Error',
        [RemittanceOutcome.Partial]: 'Parcial',
      },
      [LanguageCodes.FR]: {
        [RemittanceOutcome.Queued]: 'En attente',
        [RemittanceOutcome.Complete]: 'Complet',
        [RemittanceOutcome.Error]: 'Erreur',
        [RemittanceOutcome.Partial]: 'Partiel',
      },
      [LanguageCodes.JA]: {
        [RemittanceOutcome.Queued]: '待处理',
        [RemittanceOutcome.Complete]: '全部',
        [RemittanceOutcome.Error]: '错误',
        [RemittanceOutcome.Partial]: '部分',
      },
      [LanguageCodes.UK]: {
        [RemittanceOutcome.Queued]: 'В черзі',
        [RemittanceOutcome.Complete]: 'Повний',
        [RemittanceOutcome.Error]: 'Помилка',
        [RemittanceOutcome.Partial]: 'Частковий',
      },
      [LanguageCodes.ZH_CN]: {
        [RemittanceOutcome.Queued]: '队列中',
        [RemittanceOutcome.Complete]: '完整',
        [RemittanceOutcome.Error]: '错误',
        [RemittanceOutcome.Partial]: '局部',
      },
    },
    'RemittanceOutcome',
  );
