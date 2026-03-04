import type { BrightPassStringKey } from '@brightchain/brightchain-lib';
import {
  BrightPassComponentId,
  getBrightChainI18nEngine,
} from '@brightchain/brightchain-lib';

/**
 * Hook that wraps the i18n engine for BrightPass components.
 * Returns a `t` function scoped to the BrightPass component package.
 */
export function useBrightPassTranslation() {
  const engine = getBrightChainI18nEngine();
  return {
    t: (key: BrightPassStringKey, vars?: Record<string, string>) =>
      engine.translate(BrightPassComponentId, key, vars),
  };
}
