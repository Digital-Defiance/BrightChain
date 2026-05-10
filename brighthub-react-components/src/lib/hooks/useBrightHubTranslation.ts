import { getBrightChainI18nEngine } from '@brightchain/brightchain-lib';
import type { BrightHubStringKey } from '@brightchain/brighthub-lib';
import { BrightHubComponentId } from '@brightchain/brighthub-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useCallback } from 'react';

/**
 * Hook that wraps the i18n engine for BrightHub components.
 * Returns a memoized `t` function scoped to the BrightHub component
 * package and a `tEnum` function for translating registered enum values.
 *
 * Subscribes to the I18nProvider's `currentLanguage` so that `t` and
 * `tEnum` references update when the user switches language.
 */
export function useBrightHubTranslation() {
  const engine = getBrightChainI18nEngine();
  const { currentLanguage } = useI18n();

  const t = useCallback(
    (key: BrightHubStringKey, vars?: Record<string, string>) =>
      engine.translate(BrightHubComponentId, key, vars),
    [engine, currentLanguage],
  );

  const tEnum = useCallback(
    <T extends string | number>(enumType: Record<string, T>, value: T) =>
      engine.translateEnum(enumType, value),
    [engine, currentLanguage],
  );

  return { t, tEnum };
}
