import { getBrightChainI18nEngine } from '@brightchain/brightchain-lib';
import type { BrightPassStringKey } from '@brightchain/brightpass-lib';
import { BrightPassComponentId } from '@brightchain/brightpass-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useCallback } from 'react';

/**
 * Hook that wraps the i18n engine for BrightPass components.
 * Returns a memoized `t` function scoped to the BrightPass component
 * package and a `tEnum` function for translating registered enum values.
 *
 * Subscribes to the I18nProvider's `currentLanguage` so that `t` and
 * `tEnum` references update when the user switches language.
 */
export function useBrightPassTranslation() {
  const engine = getBrightChainI18nEngine();
  const { currentLanguage } = useI18n();

  const t = useCallback(
    (key: BrightPassStringKey, vars?: Record<string, string>) =>
      engine.translate(BrightPassComponentId, key, vars),
    [engine, currentLanguage],
  );

  const tEnum = useCallback(
    <T extends string | number>(enumType: Record<string, T>, value: T) =>
      engine.translateEnum(enumType, value),
    [engine, currentLanguage],
  );

  return { t, tEnum };
}
