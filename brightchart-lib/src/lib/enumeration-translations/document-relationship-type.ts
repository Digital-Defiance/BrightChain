import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { DocumentRelationshipType } from '../documentation';

export type DocumentRelationshipTypeLanguageTranslation =
  EnumLanguageTranslation<DocumentRelationshipType>;

export const DocumentRelationshipTypeTranslations: DocumentRelationshipTypeLanguageTranslation =
  i18nEngine.registerEnum(
    DocumentRelationshipType,
    {
      [LanguageCodes.DE]: {
        [DocumentRelationshipType.Replaces]: 'Ersetzt',
        [DocumentRelationshipType.Transforms]: 'Transformiert',
        [DocumentRelationshipType.Signs]: 'Unterzeichnet',
        [DocumentRelationshipType.Appends]: 'Ergänzt',
      },
      [LanguageCodes.EN_GB]: {
        [DocumentRelationshipType.Replaces]: 'Replaces',
        [DocumentRelationshipType.Transforms]: 'Transforms',
        [DocumentRelationshipType.Signs]: 'Signs',
        [DocumentRelationshipType.Appends]: 'Appends',
      },
      [LanguageCodes.EN_US]: {
        [DocumentRelationshipType.Replaces]: 'Replaces',
        [DocumentRelationshipType.Transforms]: 'Transforms',
        [DocumentRelationshipType.Signs]: 'Signs',
        [DocumentRelationshipType.Appends]: 'Appends',
      },
      [LanguageCodes.ES]: {
        [DocumentRelationshipType.Replaces]: 'Reemplaza',
        [DocumentRelationshipType.Transforms]: 'Transforma',
        [DocumentRelationshipType.Signs]: 'Firma',
        [DocumentRelationshipType.Appends]: 'Agrega',
      },
      [LanguageCodes.FR]: {
        [DocumentRelationshipType.Replaces]: 'Remplace',
        [DocumentRelationshipType.Transforms]: 'Transforme',
        [DocumentRelationshipType.Signs]: 'Signe',
        [DocumentRelationshipType.Appends]: 'Ajoute',
      },
      [LanguageCodes.JA]: {
        [DocumentRelationshipType.Replaces]: '置換',
        [DocumentRelationshipType.Transforms]: '変換',
        [DocumentRelationshipType.Signs]: '署名',
        [DocumentRelationshipType.Appends]: '追加',
      },
      [LanguageCodes.UK]: {
        [DocumentRelationshipType.Replaces]: 'Замінює',
        [DocumentRelationshipType.Transforms]: 'Перетворює',
        [DocumentRelationshipType.Signs]: 'Підписує',
        [DocumentRelationshipType.Appends]: 'Додає',
      },
      [LanguageCodes.ZH_CN]: {
        [DocumentRelationshipType.Replaces]: '替换',
        [DocumentRelationshipType.Transforms]: '转换',
        [DocumentRelationshipType.Signs]: '签署',
        [DocumentRelationshipType.Appends]: '附加',
      },
    },
    'DocumentRelationshipType',
  );
