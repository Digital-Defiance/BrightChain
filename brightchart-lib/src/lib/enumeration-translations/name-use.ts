import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { NameUse } from '../fhir';

export type NameUseLanguageTranslation = EnumLanguageTranslation<NameUse>;

export const NameUseTranslations: NameUseLanguageTranslation =
  i18nEngine.registerEnum(
    NameUse,
    {
      [LanguageCodes.DE]: {
        [NameUse.Usual]: 'Üblich',
        [NameUse.Official]: 'Offiziell',
        [NameUse.Temp]: 'Vorübergehend',
        [NameUse.Nickname]: 'Spitzname',
        [NameUse.Anonymous]: 'Anonym',
        [NameUse.Old]: 'Alt',
        [NameUse.Maiden]: 'Geburtsname',
      },
      [LanguageCodes.EN_GB]: {
        [NameUse.Usual]: 'Usual',
        [NameUse.Official]: 'Official',
        [NameUse.Temp]: 'Temporary',
        [NameUse.Nickname]: 'Nickname',
        [NameUse.Anonymous]: 'Anonymous',
        [NameUse.Old]: 'Old',
        [NameUse.Maiden]: 'Maiden',
      },
      [LanguageCodes.EN_US]: {
        [NameUse.Usual]: 'Usual',
        [NameUse.Official]: 'Official',
        [NameUse.Temp]: 'Temporary',
        [NameUse.Nickname]: 'Nickname',
        [NameUse.Anonymous]: 'Anonymous',
        [NameUse.Old]: 'Old',
        [NameUse.Maiden]: 'Maiden',
      },
      [LanguageCodes.ES]: {
        [NameUse.Usual]: 'Habitual',
        [NameUse.Official]: 'Oficial',
        [NameUse.Temp]: 'Temporal',
        [NameUse.Nickname]: 'Apodo',
        [NameUse.Anonymous]: 'Anónimo',
        [NameUse.Old]: 'Anterior',
        [NameUse.Maiden]: 'De soltera',
      },
      [LanguageCodes.FR]: {
        [NameUse.Usual]: 'Usuel',
        [NameUse.Official]: 'Officiel',
        [NameUse.Temp]: 'Temporaire',
        [NameUse.Nickname]: 'Surnom',
        [NameUse.Anonymous]: 'Anonyme',
        [NameUse.Old]: 'Ancien',
        [NameUse.Maiden]: 'Nom de jeune fille',
      },
      [LanguageCodes.JA]: {
        [NameUse.Usual]: '通常',
        [NameUse.Official]: '公式',
        [NameUse.Temp]: '一時的',
        [NameUse.Nickname]: 'ニックネーム',
        [NameUse.Anonymous]: '匿名',
        [NameUse.Old]: '旧',
        [NameUse.Maiden]: '旧姓',
      },
      [LanguageCodes.UK]: {
        [NameUse.Usual]: 'Звичайне',
        [NameUse.Official]: 'Офіційне',
        [NameUse.Temp]: 'Тимчасове',
        [NameUse.Nickname]: 'Прізвисько',
        [NameUse.Anonymous]: 'Анонімне',
        [NameUse.Old]: 'Старе',
        [NameUse.Maiden]: 'Дівоче',
      },
      [LanguageCodes.ZH_CN]: {
        [NameUse.Usual]: '常用',
        [NameUse.Official]: '正式',
        [NameUse.Temp]: '临时',
        [NameUse.Nickname]: '昵称',
        [NameUse.Anonymous]: '匿名',
        [NameUse.Old]: '旧',
        [NameUse.Maiden]: '婚前姓',
      },
    },
    'NameUse',
  );
