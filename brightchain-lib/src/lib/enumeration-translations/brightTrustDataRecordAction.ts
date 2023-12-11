import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import BrightTrustDataRecordActionType from '../enumerations/actionType';
import { i18nEngine } from '../i18n';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type BrightTrustDataRecordActionTypeTranslation =
  EnumLanguageTranslation<BrightTrustDataRecordActionType>;

export const BrightTrustDataRecordActionTypeTranslations: BrightTrustDataRecordActionTypeTranslation =
  i18nEngine.registerEnum(
    BrightTrustDataRecordActionType,
    createTranslations({
      [LanguageCodes.DE]: {
        [BrightTrustDataRecordActionType.Seal]: 'Versiegeln',
        [BrightTrustDataRecordActionType.Unseal]: 'Entsiegeln',
        [BrightTrustDataRecordActionType.Reseal]: 'Neuvesiegeln',
        [BrightTrustDataRecordActionType.ValidateHeldKeys]:
          'Gehaltene Schlüssel validieren',
        [BrightTrustDataRecordActionType.ValidateRecordIntegrity]:
          'Datensatzintegrität validieren',
      },
      [LanguageCodes.EN_GB]: {
        [BrightTrustDataRecordActionType.Seal]: 'Seal',
        [BrightTrustDataRecordActionType.Unseal]: 'Unseal',
        [BrightTrustDataRecordActionType.Reseal]: 'Reseal',
        [BrightTrustDataRecordActionType.ValidateHeldKeys]:
          'Validate Held Keys',
        [BrightTrustDataRecordActionType.ValidateRecordIntegrity]:
          'Validate Record Integrity',
      },
      [LanguageCodes.EN_US]: {
        [BrightTrustDataRecordActionType.Seal]: 'Seal',
        [BrightTrustDataRecordActionType.Unseal]: 'Unseal',
        [BrightTrustDataRecordActionType.Reseal]: 'Reseal',
        [BrightTrustDataRecordActionType.ValidateHeldKeys]:
          'Validate Held Keys',
        [BrightTrustDataRecordActionType.ValidateRecordIntegrity]:
          'Validate Record Integrity',
      },
      [LanguageCodes.ES]: {
        [BrightTrustDataRecordActionType.Seal]: 'Sellar',
        [BrightTrustDataRecordActionType.Unseal]: 'Desellar',
        [BrightTrustDataRecordActionType.Reseal]: 'Resellar',
        [BrightTrustDataRecordActionType.ValidateHeldKeys]:
          'Validar Claves Mantenidas',
        [BrightTrustDataRecordActionType.ValidateRecordIntegrity]:
          'Validar Integridad del Registro',
      },
      [LanguageCodes.FR]: {
        [BrightTrustDataRecordActionType.Seal]: 'Sceller',
        [BrightTrustDataRecordActionType.Unseal]: 'Désceller',
        [BrightTrustDataRecordActionType.Reseal]: 'Resceller',
        [BrightTrustDataRecordActionType.ValidateHeldKeys]:
          'Valider les Clés Conservées',
        [BrightTrustDataRecordActionType.ValidateRecordIntegrity]:
          "Valider l'Intégrité de l'Enregistrement",
      },
      [LanguageCodes.JA]: {
        [BrightTrustDataRecordActionType.Seal]: 'シール',
        [BrightTrustDataRecordActionType.Unseal]: 'アンシール',
        [BrightTrustDataRecordActionType.Reseal]: '再シール',
        [BrightTrustDataRecordActionType.ValidateHeldKeys]:
          '保持されたキーを検証',
        [BrightTrustDataRecordActionType.ValidateRecordIntegrity]:
          'レコードの整合性を検証',
      },
      [LanguageCodes.UK]: {
        [BrightTrustDataRecordActionType.Seal]: 'Запечатати',
        [BrightTrustDataRecordActionType.Unseal]: 'Розпечатати',
        [BrightTrustDataRecordActionType.Reseal]: 'Перезапечатати',
        [BrightTrustDataRecordActionType.ValidateHeldKeys]:
          'Перевірити Утримувані Ключі',
        [BrightTrustDataRecordActionType.ValidateRecordIntegrity]:
          'Перевірити Цілісність Запису',
      },
      [LanguageCodes.ZH_CN]: {
        [BrightTrustDataRecordActionType.Seal]: '封存',
        [BrightTrustDataRecordActionType.Unseal]: '解封',
        [BrightTrustDataRecordActionType.Reseal]: '重新封存',
        [BrightTrustDataRecordActionType.ValidateHeldKeys]: '验证持有的密钥',
        [BrightTrustDataRecordActionType.ValidateRecordIntegrity]:
          '验证记录完整性',
      },
    }),
    'BrightTrustDataRecordActionType',
  );
