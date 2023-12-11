/**
 * @fileoverview Joule component & hook barrel export.
 *
 * Re-exports all Joule React components and hooks from `brightchain-react-components`.
 *
 * @requirements joule-resource-credits spec, Req 7.1 – 7.5, 7.7, 8.1 – 8.4
 */

export { DisputeNotice } from './DisputeNotice';
export type {
  DisputeNoticeProps,
  DisputeState,
  JouleDispute,
} from './DisputeNotice';

export { JouleBalance } from './JouleBalance';
export type { JouleBalanceProps } from './JouleBalance';
export { JouleIconBalance } from './JouleIconBalance';

export { JouleConsumptionChart } from './JouleConsumptionChart';
export type {
  JouleConsumptionChartProps,
  JouleConsumptionEntry,
} from './JouleConsumptionChart';

export { JouleEventLog } from './JouleEventLog';
export type { JouleEvent, JouleEventLogProps } from './JouleEventLog';

export { RateTransparency } from './RateTransparency';
export type { RateTransparencyProps } from './RateTransparency';

export { useJouleBalance, useJouleConsumption, useRateTable } from './hooks';
export type {
  FetchStatus,
  JouleBalanceData,
  JouleConsumptionData,
  JouleRateEntry,
  JouleRateTableData,
  UseJouleBalanceResult,
  UseJouleConsumptionResult,
  UseRateTableResult,
} from './hooks';
