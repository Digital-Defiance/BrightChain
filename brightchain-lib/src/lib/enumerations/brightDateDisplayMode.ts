/**
 * BrightDate Display Mode
 *
 * Controls how BrightDate is shown alongside traditional dates throughout
 * the BrightChain ecosystem.
 *
 * - `dual`: Show both locale date and BrightDate — "Jan 15, 2025 (BD 9146.438)"
 * - `brightDateOnly`: Show only BrightDate — "BD 9146.438"
 * - `localeOnly`: Show only the traditional locale date — "Jan 15, 2025"
 * - `hover`: Show locale date normally, BrightDate appears on hover/tooltip
 * - `hoverReverse`: Show BrightDate normally, locale date appears on hover/tooltip
 */
export enum BrightDateDisplayMode {
  /** Dual display: locale date + BrightDate in parentheses (default) */
  Dual = 'dual',
  /** BrightDate only — for the fully converted */
  BrightDateOnly = 'brightDateOnly',
  /** Traditional locale date only — BrightDate hidden */
  LocaleOnly = 'localeOnly',
  /** Locale date shown, BrightDate on hover/tooltip */
  Hover = 'hover',
  /** BrightDate shown, locale date on hover/tooltip */
  HoverReverse = 'hoverReverse',
}
