import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { MedicationRequestIntent } from '../orders';

export type MedicationRequestIntentLanguageTranslation =
  EnumLanguageTranslation<MedicationRequestIntent>;

export const MedicationRequestIntentTranslations: MedicationRequestIntentLanguageTranslation =
  i18nEngine.registerEnum(
    MedicationRequestIntent,
    {
      [LanguageCodes.DE]: {
        [MedicationRequestIntent.Proposal]: 'Vorschlag',
        [MedicationRequestIntent.Plan]: 'Plan',
        [MedicationRequestIntent.Order]: 'Auftrag',
        [MedicationRequestIntent.OriginalOrder]: 'Originalauftrag',
        [MedicationRequestIntent.ReflexOrder]: 'Reflexauftrag',
        [MedicationRequestIntent.FillerOrder]: 'Ergänzungsauftrag',
        [MedicationRequestIntent.InstanceOrder]: 'Instanzauftrag',
        [MedicationRequestIntent.Option]: 'Option',
      },
      [LanguageCodes.EN_GB]: {
        [MedicationRequestIntent.Proposal]: 'Proposal',
        [MedicationRequestIntent.Plan]: 'Plan',
        [MedicationRequestIntent.Order]: 'Order',
        [MedicationRequestIntent.OriginalOrder]: 'Original Order',
        [MedicationRequestIntent.ReflexOrder]: 'Reflex Order',
        [MedicationRequestIntent.FillerOrder]: 'Filler Order',
        [MedicationRequestIntent.InstanceOrder]: 'Instance Order',
        [MedicationRequestIntent.Option]: 'Option',
      },
      [LanguageCodes.EN_US]: {
        [MedicationRequestIntent.Proposal]: 'Proposal',
        [MedicationRequestIntent.Plan]: 'Plan',
        [MedicationRequestIntent.Order]: 'Order',
        [MedicationRequestIntent.OriginalOrder]: 'Original Order',
        [MedicationRequestIntent.ReflexOrder]: 'Reflex Order',
        [MedicationRequestIntent.FillerOrder]: 'Filler Order',
        [MedicationRequestIntent.InstanceOrder]: 'Instance Order',
        [MedicationRequestIntent.Option]: 'Option',
      },
      [LanguageCodes.ES]: {
        [MedicationRequestIntent.Proposal]: 'Propuesta',
        [MedicationRequestIntent.Plan]: 'Plan',
        [MedicationRequestIntent.Order]: 'Orden',
        [MedicationRequestIntent.OriginalOrder]: 'Orden original',
        [MedicationRequestIntent.ReflexOrder]: 'Orden refleja',
        [MedicationRequestIntent.FillerOrder]: 'Orden de relleno',
        [MedicationRequestIntent.InstanceOrder]: 'Orden de instancia',
        [MedicationRequestIntent.Option]: 'Opción',
      },
      [LanguageCodes.FR]: {
        [MedicationRequestIntent.Proposal]: 'Proposition',
        [MedicationRequestIntent.Plan]: 'Plan',
        [MedicationRequestIntent.Order]: 'Ordonnance',
        [MedicationRequestIntent.OriginalOrder]: 'Ordonnance originale',
        [MedicationRequestIntent.ReflexOrder]: 'Ordonnance réflexe',
        [MedicationRequestIntent.FillerOrder]: 'Ordonnance de remplissage',
        [MedicationRequestIntent.InstanceOrder]: "Ordonnance d'instance",
        [MedicationRequestIntent.Option]: 'Option',
      },
      [LanguageCodes.JA]: {
        [MedicationRequestIntent.Proposal]: '提案',
        [MedicationRequestIntent.Plan]: '計画',
        [MedicationRequestIntent.Order]: 'オーダー',
        [MedicationRequestIntent.OriginalOrder]: '元オーダー',
        [MedicationRequestIntent.ReflexOrder]: 'リフレックスオーダー',
        [MedicationRequestIntent.FillerOrder]: 'フィラーオーダー',
        [MedicationRequestIntent.InstanceOrder]: 'インスタンスオーダー',
        [MedicationRequestIntent.Option]: 'オプション',
      },
      [LanguageCodes.UK]: {
        [MedicationRequestIntent.Proposal]: 'Пропозиція',
        [MedicationRequestIntent.Plan]: 'План',
        [MedicationRequestIntent.Order]: 'Замовлення',
        [MedicationRequestIntent.OriginalOrder]: 'Оригінальне замовлення',
        [MedicationRequestIntent.ReflexOrder]: 'Рефлексне замовлення',
        [MedicationRequestIntent.FillerOrder]: 'Замовлення-заповнювач',
        [MedicationRequestIntent.InstanceOrder]: 'Замовлення-екземпляр',
        [MedicationRequestIntent.Option]: 'Опція',
      },
      [LanguageCodes.ZH_CN]: {
        [MedicationRequestIntent.Proposal]: '建议',
        [MedicationRequestIntent.Plan]: '计划',
        [MedicationRequestIntent.Order]: '医嘱',
        [MedicationRequestIntent.OriginalOrder]: '原始医嘱',
        [MedicationRequestIntent.ReflexOrder]: '反射医嘱',
        [MedicationRequestIntent.FillerOrder]: '填充医嘱',
        [MedicationRequestIntent.InstanceOrder]: '实例医嘱',
        [MedicationRequestIntent.Option]: '选项',
      },
    },
    'MedicationRequestIntent',
  );
