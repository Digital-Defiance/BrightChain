import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import QuorumDataRecordActionType from '../enumerations/actionType';
import { i18nEngine } from '../i18n';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type QuorumDataRecordActionTypeTranslation =
  EnumLanguageTranslation<QuorumDataRecordActionType>;

export const QuorumDataRecordActionTypeTranslations: QuorumDataRecordActionTypeTranslation =
  i18nEngine.registerEnum(
    QuorumDataRecordActionType,
    createTranslations({
      [LanguageCodes.DE]: {
        [QuorumDataRecordActionType.Seal]: 'Versiegeln',
        [QuorumDataRecordActionType.Unseal]: 'Entsiegeln',
        [QuorumDataRecordActionType.Reseal]: 'Neuvesiegeln',
        [QuorumDataRecordActionType.ValidateHeldKeys]:
          'Gehaltene Schlüssel validieren',
        [QuorumDataRecordActionType.ValidateRecordIntegrity]:
          'Datensatzintegrität validieren',
      },
      [LanguageCodes.EN_GB]: {
        [QuorumDataRecordActionType.Seal]: 'Seal',
        [QuorumDataRecordActionType.Unseal]: 'Unseal',
        [QuorumDataRecordActionType.Reseal]: 'Reseal',
        [QuorumDataRecordActionType.ValidateHeldKeys]: 'Validate Held Keys',
        [QuorumDataRecordActionType.ValidateRecordIntegrity]:
          'Validate Record Integrity',
      },
      [LanguageCodes.EN_US]: {
        [QuorumDataRecordActionType.Seal]: 'Seal',
        [QuorumDataRecordActionType.Unseal]: 'Unseal',
        [QuorumDataRecordActionType.Reseal]: 'Reseal',
        [QuorumDataRecordActionType.ValidateHeldKeys]: 'Validate Held Keys',
        [QuorumDataRecordActionType.ValidateRecordIntegrity]:
          'Validate Record Integrity',
      },
      [LanguageCodes.ES]: {
        [QuorumDataRecordActionType.Seal]: 'Sellar',
        [QuorumDataRecordActionType.Unseal]: 'Desellar',
        [QuorumDataRecordActionType.Reseal]: 'Resellar',
        [QuorumDataRecordActionType.ValidateHeldKeys]:
          'Validar Claves Mantenidas',
        [QuorumDataRecordActionType.ValidateRecordIntegrity]:
          'Validar Integridad del Registro',
      },
      [LanguageCodes.FR]: {
        [QuorumDataRecordActionType.Seal]: 'Sceller',
        [QuorumDataRecordActionType.Unseal]: 'Désceller',
        [QuorumDataRecordActionType.Reseal]: 'Resceller',
        [QuorumDataRecordActionType.ValidateHeldKeys]:
          'Valider les Clés Conservées',
        [QuorumDataRecordActionType.ValidateRecordIntegrity]:
          "Valider l'Intégrité de l'Enregistrement",
      },
      [LanguageCodes.JA]: {
        [QuorumDataRecordActionType.Seal]: 'シール',
        [QuorumDataRecordActionType.Unseal]: 'アンシール',
        [QuorumDataRecordActionType.Reseal]: '再シール',
        [QuorumDataRecordActionType.ValidateHeldKeys]: '保持されたキーを検証',
        [QuorumDataRecordActionType.ValidateRecordIntegrity]:
          'レコードの整合性を検証',
      },
      [LanguageCodes.UK]: {
        [QuorumDataRecordActionType.Seal]: 'Запечатати',
        [QuorumDataRecordActionType.Unseal]: 'Розпечатати',
        [QuorumDataRecordActionType.Reseal]: 'Перезапечатати',
        [QuorumDataRecordActionType.ValidateHeldKeys]:
          'Перевірити Утримувані Ключі',
        [QuorumDataRecordActionType.ValidateRecordIntegrity]:
          'Перевірити Цілісність Запису',
      },
      [LanguageCodes.ZH_CN]: {
        [QuorumDataRecordActionType.Seal]: '封存',
        [QuorumDataRecordActionType.Unseal]: '解封',
        [QuorumDataRecordActionType.Reseal]: '重新封存',
        [QuorumDataRecordActionType.ValidateHeldKeys]: '验证持有的密钥',
        [QuorumDataRecordActionType.ValidateRecordIntegrity]: '验证记录完整性',
      },
    }),
    'QuorumDataRecordActionType',
  );
