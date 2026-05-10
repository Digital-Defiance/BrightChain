import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { BillingPermission } from '../billing';

export type BillingPermissionLanguageTranslation =
  EnumLanguageTranslation<BillingPermission>;

export const BillingPermissionTranslations: BillingPermissionLanguageTranslation =
  i18nEngine.registerEnum(
    BillingPermission,
    {
      [LanguageCodes.DE]: {
        [BillingPermission.BillingAdmin]: 'Administrator',
        [BillingPermission.BillingRead]: 'Lesen',
        [BillingPermission.BillingWrite]: 'Schreiben',
        [BillingPermission.BillingSubmit]: 'Einreichen',
      },
      [LanguageCodes.EN_GB]: {
        [BillingPermission.BillingAdmin]: 'Admin',
        [BillingPermission.BillingRead]: 'Read',
        [BillingPermission.BillingWrite]: 'Write',
        [BillingPermission.BillingSubmit]: 'Submit',
      },
      [LanguageCodes.EN_US]: {
        [BillingPermission.BillingAdmin]: 'Admin',
        [BillingPermission.BillingRead]: 'Read',
        [BillingPermission.BillingWrite]: 'Write',
        [BillingPermission.BillingSubmit]: 'Submit',
      },
      [LanguageCodes.ES]: {
        [BillingPermission.BillingAdmin]: 'Administrador',
        [BillingPermission.BillingRead]: 'Leer',
        [BillingPermission.BillingWrite]: 'Escribir',
        [BillingPermission.BillingSubmit]: 'Enviar',
      },
      [LanguageCodes.FR]: {
        [BillingPermission.BillingAdmin]: 'Administrateur',
        [BillingPermission.BillingRead]: 'Lire',
        [BillingPermission.BillingWrite]: 'Écrire',
        [BillingPermission.BillingSubmit]: 'Soumettre',
      },
      [LanguageCodes.JA]: {
        [BillingPermission.BillingAdmin]: '管理者',
        [BillingPermission.BillingRead]: '読む',
        [BillingPermission.BillingWrite]: '書く',
        [BillingPermission.BillingSubmit]: '送信',
      },
      [LanguageCodes.UK]: {
        [BillingPermission.BillingAdmin]: 'Адміністратор',
        [BillingPermission.BillingRead]: 'Читати',
        [BillingPermission.BillingWrite]: 'Писати',
        [BillingPermission.BillingSubmit]: 'Надіслати',
      },
      [LanguageCodes.ZH_CN]: {
        [BillingPermission.BillingAdmin]: '管理员',
        [BillingPermission.BillingRead]: '读取',
        [BillingPermission.BillingWrite]: '写入',
        [BillingPermission.BillingSubmit]: '提交',
      },
    },
    'BillingPermission',
  );
