import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { SlotStatus } from '../scheduling';

export type SlotStatusLanguageTranslation = EnumLanguageTranslation<SlotStatus>;

export const SlotStatusTranslations: SlotStatusLanguageTranslation =
  i18nEngine.registerEnum(
    SlotStatus,
    {
      [LanguageCodes.DE]: {
        [SlotStatus.Busy]: 'Belegt',
        [SlotStatus.Free]: 'Frei',
        [SlotStatus.BusyUnavailable]: 'Belegt (nicht verfügbar)',
        [SlotStatus.BusyTentative]: 'Belegt (vorläufig)',
        [SlotStatus.EnteredInError]: 'Irrtümlich eingegeben',
      },
      [LanguageCodes.EN_GB]: {
        [SlotStatus.Busy]: 'Busy',
        [SlotStatus.Free]: 'Free',
        [SlotStatus.BusyUnavailable]: 'Busy (Unavailable)',
        [SlotStatus.BusyTentative]: 'Busy (Tentative)',
        [SlotStatus.EnteredInError]: 'Entered in Error',
      },
      [LanguageCodes.EN_US]: {
        [SlotStatus.Busy]: 'Busy',
        [SlotStatus.Free]: 'Free',
        [SlotStatus.BusyUnavailable]: 'Busy (Unavailable)',
        [SlotStatus.BusyTentative]: 'Busy (Tentative)',
        [SlotStatus.EnteredInError]: 'Entered in Error',
      },
      [LanguageCodes.ES]: {
        [SlotStatus.Busy]: 'Ocupado',
        [SlotStatus.Free]: 'Libre',
        [SlotStatus.BusyUnavailable]: 'Ocupado (no disponible)',
        [SlotStatus.BusyTentative]: 'Ocupado (provisional)',
        [SlotStatus.EnteredInError]: 'Ingresado por error',
      },
      [LanguageCodes.FR]: {
        [SlotStatus.Busy]: 'Occupé',
        [SlotStatus.Free]: 'Libre',
        [SlotStatus.BusyUnavailable]: 'Occupé (indisponible)',
        [SlotStatus.BusyTentative]: 'Occupé (provisoire)',
        [SlotStatus.EnteredInError]: 'Saisi par erreur',
      },
      [LanguageCodes.JA]: {
        [SlotStatus.Busy]: '使用中',
        [SlotStatus.Free]: '空き',
        [SlotStatus.BusyUnavailable]: '使用中（利用不可）',
        [SlotStatus.BusyTentative]: '使用中（仮）',
        [SlotStatus.EnteredInError]: '誤入力',
      },
      [LanguageCodes.UK]: {
        [SlotStatus.Busy]: 'Зайнятий',
        [SlotStatus.Free]: 'Вільний',
        [SlotStatus.BusyUnavailable]: 'Зайнятий (недоступний)',
        [SlotStatus.BusyTentative]: 'Зайнятий (попередній)',
        [SlotStatus.EnteredInError]: 'Помилково введений',
      },
      [LanguageCodes.ZH_CN]: {
        [SlotStatus.Busy]: '忙碌',
        [SlotStatus.Free]: '空闲',
        [SlotStatus.BusyUnavailable]: '忙碌（不可用）',
        [SlotStatus.BusyTentative]: '忙碌（暂定）',
        [SlotStatus.EnteredInError]: '误录入',
      },
    },
    'SlotStatus',
  );
