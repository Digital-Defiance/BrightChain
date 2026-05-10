import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ConditionVerificationStatus } from '../clinical';

export type ConditionVerificationStatusLanguageTranslation =
  EnumLanguageTranslation<ConditionVerificationStatus>;

export const ConditionVerificationStatusTranslations: ConditionVerificationStatusLanguageTranslation =
  i18nEngine.registerEnum(
    ConditionVerificationStatus,
    {
      [LanguageCodes.DE]: {
        [ConditionVerificationStatus.Unconfirmed]: 'Unbestätigt',
        [ConditionVerificationStatus.Provisional]: 'Vorläufig',
        [ConditionVerificationStatus.Differential]: 'Differenzial',
        [ConditionVerificationStatus.Confirmed]: 'Bestätigt',
        [ConditionVerificationStatus.Refuted]: 'Widerlegt',
        [ConditionVerificationStatus.EnteredInError]: 'Irrtümlich eingegeben',
      },
      [LanguageCodes.EN_GB]: {
        [ConditionVerificationStatus.Unconfirmed]: 'Unconfirmed',
        [ConditionVerificationStatus.Provisional]: 'Provisional',
        [ConditionVerificationStatus.Differential]: 'Differential',
        [ConditionVerificationStatus.Confirmed]: 'Confirmed',
        [ConditionVerificationStatus.Refuted]: 'Refuted',
        [ConditionVerificationStatus.EnteredInError]: 'Entered in Error',
      },
      [LanguageCodes.EN_US]: {
        [ConditionVerificationStatus.Unconfirmed]: 'Unconfirmed',
        [ConditionVerificationStatus.Provisional]: 'Provisional',
        [ConditionVerificationStatus.Differential]: 'Differential',
        [ConditionVerificationStatus.Confirmed]: 'Confirmed',
        [ConditionVerificationStatus.Refuted]: 'Refuted',
        [ConditionVerificationStatus.EnteredInError]: 'Entered in Error',
      },
      [LanguageCodes.ES]: {
        [ConditionVerificationStatus.Unconfirmed]: 'No confirmado',
        [ConditionVerificationStatus.Provisional]: 'Provisional',
        [ConditionVerificationStatus.Differential]: 'Diferencial',
        [ConditionVerificationStatus.Confirmed]: 'Confirmado',
        [ConditionVerificationStatus.Refuted]: 'Refutado',
        [ConditionVerificationStatus.EnteredInError]: 'Ingresado por error',
      },
      [LanguageCodes.FR]: {
        [ConditionVerificationStatus.Unconfirmed]: 'Non confirmé',
        [ConditionVerificationStatus.Provisional]: 'Provisoire',
        [ConditionVerificationStatus.Differential]: 'Différentiel',
        [ConditionVerificationStatus.Confirmed]: 'Confirmé',
        [ConditionVerificationStatus.Refuted]: 'Réfuté',
        [ConditionVerificationStatus.EnteredInError]: 'Saisi par erreur',
      },
      [LanguageCodes.JA]: {
        [ConditionVerificationStatus.Unconfirmed]: '未確認',
        [ConditionVerificationStatus.Provisional]: '暫定',
        [ConditionVerificationStatus.Differential]: '鑑別',
        [ConditionVerificationStatus.Confirmed]: '確認済み',
        [ConditionVerificationStatus.Refuted]: '否定',
        [ConditionVerificationStatus.EnteredInError]: '誤入力',
      },
      [LanguageCodes.UK]: {
        [ConditionVerificationStatus.Unconfirmed]: 'Непідтверджений',
        [ConditionVerificationStatus.Provisional]: 'Попередній',
        [ConditionVerificationStatus.Differential]: 'Диференціальний',
        [ConditionVerificationStatus.Confirmed]: 'Підтверджений',
        [ConditionVerificationStatus.Refuted]: 'Спростований',
        [ConditionVerificationStatus.EnteredInError]: 'Помилково введений',
      },
      [LanguageCodes.ZH_CN]: {
        [ConditionVerificationStatus.Unconfirmed]: '未确认',
        [ConditionVerificationStatus.Provisional]: '暂定',
        [ConditionVerificationStatus.Differential]: '鉴别',
        [ConditionVerificationStatus.Confirmed]: '已确认',
        [ConditionVerificationStatus.Refuted]: '已否定',
        [ConditionVerificationStatus.EnteredInError]: '误录入',
      },
    },
    'ConditionVerificationStatus',
  );
