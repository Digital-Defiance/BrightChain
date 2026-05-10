import { getBrightChainI18nEngine } from '@brightchain/brightchain-lib';
import type { BrightMailStringKey } from '@brightchain/brightmail-lib';
import { BrightMailComponentId } from '@brightchain/brightmail-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useCallback } from 'react';

/**
 * Hook that wraps the i18n engine for BrightMail components.
 * Returns a memoized `t` function scoped to the BrightMail component
 * package and a `tEnum` function for translating registered enum values.
 *
 * Subscribes to the I18nProvider's `currentLanguage` so that `t` and
 * `tEnum` references update when the user switches language, causing
 * dependent `useMemo` / `useCallback` consumers (e.g. sidebar nav
 * items) to recompute immediately.
 */
export function useBrightMailTranslation() {
  const engine = getBrightChainI18nEngine();
  const { currentLanguage } = useI18n();

  const t = useCallback(
    (key: BrightMailStringKey, vars?: Record<string, string>) =>
      engine.translate(BrightMailComponentId, key, vars),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, currentLanguage],
  );

  const tEnum = useCallback(
    <T extends string | number>(enumType: Record<string, T>, value: T) =>
      engine.translateEnum(enumType, value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, currentLanguage],
  );

  return { t, tEnum };
}
