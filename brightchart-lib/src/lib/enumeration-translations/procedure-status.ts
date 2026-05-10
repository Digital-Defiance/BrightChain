import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ProcedureStatus } from '../clinical';

export type ProcedureStatusLanguageTranslation =
  EnumLanguageTranslation<ProcedureStatus>;

export const ProcedureStatusTranslations: ProcedureStatusLanguageTranslation =
  i18nEngine.registerEnum(
    ProcedureStatus,
    {
      [LanguageCodes.DE]: {
        [ProcedureStatus.Preparation]: 'Vorbereitung',
        [ProcedureStatus.InProgress]: 'In Bearbeitung',
        [ProcedureStatus.NotDone]: 'Nicht durchgeführt',
        [ProcedureStatus.OnHold]: 'Wartend',
        [ProcedureStatus.Stopped]: 'Gestoppt',
        [ProcedureStatus.Completed]: 'Abgeschlossen',
        [ProcedureStatus.EnteredInError]: 'Irrtümlich eingegeben',
        [ProcedureStatus.Unknown]: 'Unbekannt',
      },
      [LanguageCodes.EN_GB]: {
        [ProcedureStatus.Preparation]: 'Preparation',
        [ProcedureStatus.InProgress]: 'In Progress',
        [ProcedureStatus.NotDone]: 'Not Done',
        [ProcedureStatus.OnHold]: 'On Hold',
        [ProcedureStatus.Stopped]: 'Stopped',
        [ProcedureStatus.Completed]: 'Completed',
        [ProcedureStatus.EnteredInError]: 'Entered in Error',
        [ProcedureStatus.Unknown]: 'Unknown',
      },
      [LanguageCodes.EN_US]: {
        [ProcedureStatus.Preparation]: 'Preparation',
        [ProcedureStatus.InProgress]: 'In Progress',
        [ProcedureStatus.NotDone]: 'Not Done',
        [ProcedureStatus.OnHold]: 'On Hold',
        [ProcedureStatus.Stopped]: 'Stopped',
        [ProcedureStatus.Completed]: 'Completed',
        [ProcedureStatus.EnteredInError]: 'Entered in Error',
        [ProcedureStatus.Unknown]: 'Unknown',
      },
      [LanguageCodes.ES]: {
        [ProcedureStatus.Preparation]: 'Preparación',
        [ProcedureStatus.InProgress]: 'En progreso',
        [ProcedureStatus.NotDone]: 'No realizado',
        [ProcedureStatus.OnHold]: 'En espera',
        [ProcedureStatus.Stopped]: 'Detenido',
        [ProcedureStatus.Completed]: 'Completado',
        [ProcedureStatus.EnteredInError]: 'Ingresado por error',
        [ProcedureStatus.Unknown]: 'Desconocido',
      },
      [LanguageCodes.FR]: {
        [ProcedureStatus.Preparation]: 'Préparation',
        [ProcedureStatus.InProgress]: 'En cours',
        [ProcedureStatus.NotDone]: 'Non effectué',
        [ProcedureStatus.OnHold]: 'En attente',
        [ProcedureStatus.Stopped]: 'Arrêté',
        [ProcedureStatus.Completed]: 'Terminé',
        [ProcedureStatus.EnteredInError]: 'Saisi par erreur',
        [ProcedureStatus.Unknown]: 'Inconnu',
      },
      [LanguageCodes.JA]: {
        [ProcedureStatus.Preparation]: '準備中',
        [ProcedureStatus.InProgress]: '進行中',
        [ProcedureStatus.NotDone]: '未実施',
        [ProcedureStatus.OnHold]: '保留中',
        [ProcedureStatus.Stopped]: '中止',
        [ProcedureStatus.Completed]: '完了',
        [ProcedureStatus.EnteredInError]: '誤入力',
        [ProcedureStatus.Unknown]: '不明',
      },
      [LanguageCodes.UK]: {
        [ProcedureStatus.Preparation]: 'Підготовка',
        [ProcedureStatus.InProgress]: 'В процесі',
        [ProcedureStatus.NotDone]: 'Не виконано',
        [ProcedureStatus.OnHold]: 'На утриманні',
        [ProcedureStatus.Stopped]: 'Зупинений',
        [ProcedureStatus.Completed]: 'Завершений',
        [ProcedureStatus.EnteredInError]: 'Помилково введений',
        [ProcedureStatus.Unknown]: 'Невідомий',
      },
      [LanguageCodes.ZH_CN]: {
        [ProcedureStatus.Preparation]: '准备中',
        [ProcedureStatus.InProgress]: '进行中',
        [ProcedureStatus.NotDone]: '未执行',
        [ProcedureStatus.OnHold]: '暂停',
        [ProcedureStatus.Stopped]: '已停止',
        [ProcedureStatus.Completed]: '已完成',
        [ProcedureStatus.EnteredInError]: '误录入',
        [ProcedureStatus.Unknown]: '未知',
      },
    },
    'ProcedureStatus',
  );
