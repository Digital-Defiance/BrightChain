import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { SuperbillStatus } from '../billing';

export type SuperbillStatusLanguageTranslation =
  EnumLanguageTranslation<SuperbillStatus>;

export const SuperbillStatusTranslations: SuperbillStatusLanguageTranslation =
  i18nEngine.registerEnum(
    SuperbillStatus,
    {
      [LanguageCodes.DE]: {
        [SuperbillStatus.Draft]: 'Entwurf',
        [SuperbillStatus.Finalized]: 'Abgeschlossen',
        [SuperbillStatus.Billed]: 'Abgerechnet',
      },
      [LanguageCodes.EN_GB]: {
        [SuperbillStatus.Draft]: 'Draft',
        [SuperbillStatus.Finalized]: 'Finalized',
        [SuperbillStatus.Billed]: 'Billed',
      },
      [LanguageCodes.EN_US]: {
        [SuperbillStatus.Draft]: 'Draft',
        [SuperbillStatus.Finalized]: 'Finalized',
        [SuperbillStatus.Billed]: 'Billed',
      },
      [LanguageCodes.ES]: {
        [SuperbillStatus.Draft]: 'Borrador',
        [SuperbillStatus.Finalized]: 'Finalizado',
        [SuperbillStatus.Billed]: 'Facturado',
      },
      [LanguageCodes.FR]: {
        [SuperbillStatus.Draft]: 'Brouillon',
        [SuperbillStatus.Finalized]: 'Finalisé',
        [SuperbillStatus.Billed]: 'Facturé',
      },
      [LanguageCodes.JA]: {
        [SuperbillStatus.Draft]: '下書き',
        [SuperbillStatus.Finalized]: '確定',
        [SuperbillStatus.Billed]: '請求済み',
      },
      [LanguageCodes.UK]: {
        [SuperbillStatus.Draft]: 'Чернетка',
        [SuperbillStatus.Finalized]: 'Завершений',
        [SuperbillStatus.Billed]: 'Виставлений рахунок',
      },
      [LanguageCodes.ZH_CN]: {
        [SuperbillStatus.Draft]: '草稿',
        [SuperbillStatus.Finalized]: '已定稿',
        [SuperbillStatus.Billed]: '已计费',
      },
    },
    'SuperbillStatus',
  );
