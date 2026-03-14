import {
  getBrightChainI18nEngine,
} from '@brightchain/brightchain-lib';
import type { BrightPassStringKey } from '@brightchain/brightpass-lib';
import {
  BrightPassComponentId,
} from '@brightchain/brightpass-lib';
import { useCallback } from 'react';

/**
 * Hook that wraps the i18n engine for BrightPass components.
 * Returns a memoized `t` function scoped to the BrightPass component package.
 *
 * The `t` reference is stable across re-renders (the i18n engine is a
 * singleton), so it is safe to include in dependency arrays without
 * triggering unnecessary effect re-runs.
 */
export function useBrightPassTranslation() {
  const engine = getBrightChainI18nEngine();
  const t = useCallback(
    (key: BrightPassStringKey, vars?: Record<string, string>) =>
      engine.translate(BrightPassComponentId, key, vars),
    [engine],
  );
  return { t };
}
