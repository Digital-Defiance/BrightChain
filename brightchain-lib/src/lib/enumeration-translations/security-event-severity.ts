import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { i18nEngine } from '../i18n';
import { SecurityEventSeverity } from '../security';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type SecurityEventSeverityLanguageTranslation =
  EnumLanguageTranslation<SecurityEventSeverity>;

export const SecurityEventSeverityTranslations: SecurityEventSeverityLanguageTranslation =
  i18nEngine.registerEnum(
    SecurityEventSeverity,
    createTranslations({
      [LanguageCodes.DE]: {
        [SecurityEventSeverity.Critical]: 'Kritisch',
        [SecurityEventSeverity.Error]: 'Fehler',
        [SecurityEventSeverity.Warning]: 'Warnung',
        [SecurityEventSeverity.Info]: 'Info',
      },
      [LanguageCodes.EN_GB]: {
        [SecurityEventSeverity.Critical]: 'Critical',
        [SecurityEventSeverity.Error]: 'Error',
        [SecurityEventSeverity.Warning]: 'Warning',
        [SecurityEventSeverity.Info]: 'Info',
      },
      [LanguageCodes.EN_US]: {
        [SecurityEventSeverity.Critical]: 'Critical',
        [SecurityEventSeverity.Error]: 'Error',
        [SecurityEventSeverity.Warning]: 'Warning',
        [SecurityEventSeverity.Info]: 'Info',
      },
      [LanguageCodes.ES]: {
        [SecurityEventSeverity.Critical]: 'Crítico',
        [SecurityEventSeverity.Error]: 'Error',
        [SecurityEventSeverity.Warning]: 'Advertencia',
        [SecurityEventSeverity.Info]: 'Información',
      },
      [LanguageCodes.FR]: {
        [SecurityEventSeverity.Critical]: 'Critique',
        [SecurityEventSeverity.Error]: 'Erreur',
        [SecurityEventSeverity.Warning]: 'Avertissement',
        [SecurityEventSeverity.Info]: 'Info',
      },
      [LanguageCodes.JA]: {
        [SecurityEventSeverity.Critical]: 'クリティカル',
        [SecurityEventSeverity.Error]: 'エラー',
        [SecurityEventSeverity.Warning]: '警告',
        [SecurityEventSeverity.Info]: '情報',
      },
      [LanguageCodes.UK]: {
        [SecurityEventSeverity.Critical]: 'Критично',
        [SecurityEventSeverity.Error]: 'Помилка',
        [SecurityEventSeverity.Warning]: 'Попередження',
        [SecurityEventSeverity.Info]: 'Інформація',
      },
      [LanguageCodes.ZH_CN]: {
        [SecurityEventSeverity.Critical]: '危急',
        [SecurityEventSeverity.Error]: '错误',
        [SecurityEventSeverity.Warning]: '警告',
        [SecurityEventSeverity.Info]: '信息',
      },
    }),
    'SecurityEventSeverity',
  );
