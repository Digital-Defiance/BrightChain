import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { OrderPermission } from '../orders';

export type OrderPermissionLanguageTranslation =
  EnumLanguageTranslation<OrderPermission>;

export const OrderPermissionTranslations: OrderPermissionLanguageTranslation =
  i18nEngine.registerEnum(
    OrderPermission,
    {
      [LanguageCodes.DE]: {
        [OrderPermission.OrderRead]: 'Lesen',
        [OrderPermission.OrderWrite]: 'Schreiben',
        [OrderPermission.OrderSign]: 'Unterzeichnen',
        [OrderPermission.OrderAdmin]: 'Administrator',
      },
      [LanguageCodes.EN_GB]: {
        [OrderPermission.OrderRead]: 'Read',
        [OrderPermission.OrderWrite]: 'Write',
        [OrderPermission.OrderSign]: 'Sign',
        [OrderPermission.OrderAdmin]: 'Admin',
      },
      [LanguageCodes.EN_US]: {
        [OrderPermission.OrderRead]: 'Read',
        [OrderPermission.OrderWrite]: 'Write',
        [OrderPermission.OrderSign]: 'Sign',
        [OrderPermission.OrderAdmin]: 'Admin',
      },
      [LanguageCodes.ES]: {
        [OrderPermission.OrderRead]: 'Leer',
        [OrderPermission.OrderWrite]: 'Escribir',
        [OrderPermission.OrderSign]: 'Firmar',
        [OrderPermission.OrderAdmin]: 'Administrador',
      },
      [LanguageCodes.FR]: {
        [OrderPermission.OrderRead]: 'Lire',
        [OrderPermission.OrderWrite]: 'Écrire',
        [OrderPermission.OrderSign]: 'Signer',
        [OrderPermission.OrderAdmin]: 'Administrateur',
      },
      [LanguageCodes.JA]: {
        [OrderPermission.OrderRead]: '読取',
        [OrderPermission.OrderWrite]: '書込',
        [OrderPermission.OrderSign]: '署名',
        [OrderPermission.OrderAdmin]: '管理者',
      },
      [LanguageCodes.UK]: {
        [OrderPermission.OrderRead]: 'Читати',
        [OrderPermission.OrderWrite]: 'Писати',
        [OrderPermission.OrderSign]: 'Підписувати',
        [OrderPermission.OrderAdmin]: 'Адміністратор',
      },
      [LanguageCodes.ZH_CN]: {
        [OrderPermission.OrderRead]: '读取',
        [OrderPermission.OrderWrite]: '写入',
        [OrderPermission.OrderSign]: '签署',
        [OrderPermission.OrderAdmin]: '管理员',
      },
    },
    'OrderPermission',
  );
