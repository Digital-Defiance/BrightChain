import {
  createTranslations,
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { AuditOperationType } from '../audit/auditLog';

export type AuditOperationTypeLanguageTranslation =
  EnumLanguageTranslation<AuditOperationType>;

export const AuditOperationTypeTranslations: AuditOperationTypeLanguageTranslation =
  i18nEngine.registerEnum(
    AuditOperationType,
    createTranslations({
      [LanguageCodes.EN_US]: {
        [AuditOperationType.Create]: 'Create',
        [AuditOperationType.Read]: 'Read',
        [AuditOperationType.Update]: 'Update',
        [AuditOperationType.Delete]: 'Delete',
        [AuditOperationType.Search]: 'Search',
        [AuditOperationType.Merge]: 'Merge',
      },
      [LanguageCodes.EN_GB]: {
        [AuditOperationType.Create]: 'Create',
        [AuditOperationType.Read]: 'Read',
        [AuditOperationType.Update]: 'Update',
        [AuditOperationType.Delete]: 'Delete',
        [AuditOperationType.Search]: 'Search',
        [AuditOperationType.Merge]: 'Merge',
      },
      [LanguageCodes.FR]: {
        [AuditOperationType.Create]: 'Créer',
        [AuditOperationType.Read]: 'Lire',
        [AuditOperationType.Update]: 'Mettre à jour',
        [AuditOperationType.Delete]: 'Supprimer',
        [AuditOperationType.Search]: 'Rechercher',
        [AuditOperationType.Merge]: 'Fusionner',
      },
      [LanguageCodes.DE]: {
        [AuditOperationType.Create]: 'Erstellen',
        [AuditOperationType.Read]: 'Lesen',
        [AuditOperationType.Update]: 'Aktualisieren',
        [AuditOperationType.Delete]: 'Löschen',
        [AuditOperationType.Search]: 'Suchen',
        [AuditOperationType.Merge]: 'Zusammenführen',
      },
      [LanguageCodes.ES]: {
        [AuditOperationType.Create]: 'Crear',
        [AuditOperationType.Read]: 'Leer',
        [AuditOperationType.Update]: 'Actualizar',
        [AuditOperationType.Delete]: 'Eliminar',
        [AuditOperationType.Search]: 'Buscar',
        [AuditOperationType.Merge]: 'Fusionar',
      },
      [LanguageCodes.JA]: {
        [AuditOperationType.Create]: '作成',
        [AuditOperationType.Read]: '読取',
        [AuditOperationType.Update]: '更新',
        [AuditOperationType.Delete]: '削除',
        [AuditOperationType.Search]: '検索',
        [AuditOperationType.Merge]: '統合',
      },
      [LanguageCodes.ZH_CN]: {
        [AuditOperationType.Create]: '创建',
        [AuditOperationType.Read]: '读取',
        [AuditOperationType.Update]: '更新',
        [AuditOperationType.Delete]: '删除',
        [AuditOperationType.Search]: '搜索',
        [AuditOperationType.Merge]: '合并',
      },
      [LanguageCodes.UK]: {
        [AuditOperationType.Create]: 'Створити',
        [AuditOperationType.Read]: 'Читати',
        [AuditOperationType.Update]: 'Оновити',
        [AuditOperationType.Delete]: 'Видалити',
        [AuditOperationType.Search]: 'Шукати',
        [AuditOperationType.Merge]: "Об'єднати",
      },
    }),
    'AuditOperationType',
  );
