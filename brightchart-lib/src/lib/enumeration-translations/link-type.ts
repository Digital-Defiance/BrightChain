import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { LinkType } from '../fhir';

export type LinkTypeLanguageTranslation = EnumLanguageTranslation<LinkType>;

export const LinkTypeTranslations: LinkTypeLanguageTranslation =
  i18nEngine.registerEnum(
    LinkType,
    {
      [LanguageCodes.DE]: {
        [LinkType.ReplacedBy]: 'Ersetzt durch',
        [LinkType.Replaces]: 'Ersetzt',
        [LinkType.Refer]: 'Verweis',
        [LinkType.SeeAlso]: 'Siehe auch',
      },
      [LanguageCodes.EN_GB]: {
        [LinkType.ReplacedBy]: 'Replaced By',
        [LinkType.Replaces]: 'Replaces',
        [LinkType.Refer]: 'Refer',
        [LinkType.SeeAlso]: 'See Also',
      },
      [LanguageCodes.EN_US]: {
        [LinkType.ReplacedBy]: 'Replaced By',
        [LinkType.Replaces]: 'Replaces',
        [LinkType.Refer]: 'Refer',
        [LinkType.SeeAlso]: 'See Also',
      },
      [LanguageCodes.ES]: {
        [LinkType.ReplacedBy]: 'Reemplazado por',
        [LinkType.Replaces]: 'Reemplaza',
        [LinkType.Refer]: 'Referencia',
        [LinkType.SeeAlso]: 'Ver también',
      },
      [LanguageCodes.FR]: {
        [LinkType.ReplacedBy]: 'Remplacé par',
        [LinkType.Replaces]: 'Remplace',
        [LinkType.Refer]: 'Référence',
        [LinkType.SeeAlso]: 'Voir aussi',
      },
      [LanguageCodes.JA]: {
        [LinkType.ReplacedBy]: '置換先',
        [LinkType.Replaces]: '置換元',
        [LinkType.Refer]: '参照',
        [LinkType.SeeAlso]: '関連項目',
      },
      [LanguageCodes.UK]: {
        [LinkType.ReplacedBy]: 'Замінений',
        [LinkType.Replaces]: 'Замінює',
        [LinkType.Refer]: 'Посилання',
        [LinkType.SeeAlso]: 'Дивіться також',
      },
      [LanguageCodes.ZH_CN]: {
        [LinkType.ReplacedBy]: '被替换',
        [LinkType.Replaces]: '替换',
        [LinkType.Refer]: '参考',
        [LinkType.SeeAlso]: '另见',
      },
    },
    'LinkType',
  );
