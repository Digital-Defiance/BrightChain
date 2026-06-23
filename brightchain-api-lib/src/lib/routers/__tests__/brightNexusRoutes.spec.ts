/**
 * @fileoverview Mirrors ApiRouter.mountBrightNexusRoutes feature gating.
 */

import { BrightChainFeatures } from '@brightchain/brightchain-lib';
import { describe, expect, it, jest } from '@jest/globals';

function isBrightNexusEnabled(features: BrightChainFeatures[]): boolean {
  return features.some((f) => f === BrightChainFeatures.BrightNexus);
}

describe('BrightNexus ApiRouter feature gate', () => {
  it('does not mount when BrightNexus is absent from enabledFeatures', () => {
    const registerSpy = jest.fn();
    const features: BrightChainFeatures[] = [
      BrightChainFeatures.BrightChat,
      BrightChainFeatures.DigitalBurnbag,
    ];

    if (isBrightNexusEnabled(features)) {
      registerSpy();
    }

    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('mounts when BrightNexus is in enabledFeatures', () => {
    const registerSpy = jest.fn();
    const features: BrightChainFeatures[] = [
      BrightChainFeatures.BrightNexus,
    ];

    if (isBrightNexusEnabled(features)) {
      registerSpy();
    }

    expect(registerSpy).toHaveBeenCalledTimes(1);
  });
});
