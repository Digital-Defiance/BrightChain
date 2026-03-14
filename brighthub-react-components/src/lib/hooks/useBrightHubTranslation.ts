import type { BrightHubStringKey } from '@brightchain/brighthub-lib';
import { BrightHubComponentId } from '@brightchain/brighthub-lib';
import { getBrightChainI18nEngine } from '@brightchain/brightchain-lib';

/**
 * Hook that wraps the i18n engine for BrightHub components.
 * Returns a `t` function scoped to the BrightHub component package.
 */
export function useBrightHubTranslation() {
  const engine = getBrightChainI18nEngine();
  return {
    t: (key: BrightHubStringKey, vars?: Record<string, string>) =>
      engine.translate(BrightHubComponentId, key, vars),
  };
}
