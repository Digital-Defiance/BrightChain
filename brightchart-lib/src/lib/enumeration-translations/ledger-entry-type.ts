import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { LedgerEntryType } from '../billing';

export type LedgerEntryTypeLanguageTranslation =
  EnumLanguageTranslation<LedgerEntryType>;

export const LedgerEntryTypeTranslations: LedgerEntryTypeLanguageTranslation =
  i18nEngine.registerEnum(
    LedgerEntryType,
    {
      [LanguageCodes.DE]: {
        [LedgerEntryType.Charge]: 'Gebühr',
        [LedgerEntryType.Payment]: 'Zahlung',
        [LedgerEntryType.Adjustment]: 'Anpassung',
        [LedgerEntryType.Refund]: 'Erstattung',
        [LedgerEntryType.WriteOff]: 'Abschreibung',
      },
      [LanguageCodes.EN_GB]: {
        [LedgerEntryType.Charge]: 'Charge',
        [LedgerEntryType.Payment]: 'Payment',
        [LedgerEntryType.Adjustment]: 'Adjustment',
        [LedgerEntryType.Refund]: 'Refund',
        [LedgerEntryType.WriteOff]: 'Write-Off',
      },
      [LanguageCodes.EN_US]: {
        [LedgerEntryType.Charge]: 'Charge',
        [LedgerEntryType.Payment]: 'Payment',
        [LedgerEntryType.Adjustment]: 'Adjustment',
        [LedgerEntryType.Refund]: 'Refund',
        [LedgerEntryType.WriteOff]: 'Write-Off',
      },
      [LanguageCodes.ES]: {
        [LedgerEntryType.Charge]: 'Cargo',
        [LedgerEntryType.Payment]: 'Pago',
        [LedgerEntryType.Adjustment]: 'Ajuste',
        [LedgerEntryType.Refund]: 'Reembolso',
        [LedgerEntryType.WriteOff]: 'Cancelación de deuda',
      },
      [LanguageCodes.FR]: {
        [LedgerEntryType.Charge]: 'Frais',
        [LedgerEntryType.Payment]: 'Paiement',
        [LedgerEntryType.Adjustment]: 'Ajustement',
        [LedgerEntryType.Refund]: 'Remboursement',
        [LedgerEntryType.WriteOff]: 'Radiation',
      },
      [LanguageCodes.JA]: {
        [LedgerEntryType.Charge]: '請求',
        [LedgerEntryType.Payment]: '支払い',
        [LedgerEntryType.Adjustment]: '調整',
        [LedgerEntryType.Refund]: '返金',
        [LedgerEntryType.WriteOff]: '償却',
      },
      [LanguageCodes.UK]: {
        [LedgerEntryType.Charge]: 'Нарахування',
        [LedgerEntryType.Payment]: 'Оплата',
        [LedgerEntryType.Adjustment]: 'Коригування',
        [LedgerEntryType.Refund]: 'Повернення',
        [LedgerEntryType.WriteOff]: 'Списання',
      },
      [LanguageCodes.ZH_CN]: {
        [LedgerEntryType.Charge]: '收费',
        [LedgerEntryType.Payment]: '付款',
        [LedgerEntryType.Adjustment]: '调整',
        [LedgerEntryType.Refund]: '退款',
        [LedgerEntryType.WriteOff]: '核销',
      },
    },
    'LedgerEntryType',
  );
