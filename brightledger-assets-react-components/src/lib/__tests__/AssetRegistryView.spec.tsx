/**
 * @fileoverview Tests for AssetRegistryView component.
 */

import type { IAssetDescriptor } from '@brightchain/brightledger-assets-api-lib';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { AssetRegistryView } from '../components/AssetRegistryView';

const ASSET_A: IAssetDescriptor = {
  symbol: 'JUL',
  displayName: 'Joule Unit Ledger',
  decimals: 6,
  supplyPolicy: 'mintable',
  transferPolicy: 'open',
  freezable: true,
  burnable: true,
  brightTrustPolicy: { type: 'majority', threshold: 1 },
};

const ASSET_B: IAssetDescriptor = {
  symbol: 'FXD',
  displayName: 'Fixed Asset',
  decimals: 0,
  supplyPolicy: 'fixed',
  transferPolicy: 'whitelist',
  freezable: false,
  burnable: false,
  brightTrustPolicy: { type: 'majority', threshold: 1 },
};

describe('AssetRegistryView', () => {
  it('renders empty state when no assets are provided', () => {
    render(<AssetRegistryView assets={new Map()} />);
    expect(screen.getByText('No assets have been issued.')).toBeInTheDocument();
  });

  it('renders a table row for each asset', () => {
    const assets = new Map([
      ['aaaa', ASSET_A],
      ['bbbb', ASSET_B],
    ]);
    render(<AssetRegistryView assets={assets} />);
    expect(screen.getByText('JUL')).toBeInTheDocument();
    expect(screen.getByText('FXD')).toBeInTheDocument();
    expect(screen.getByText('Joule Unit Ledger')).toBeInTheDocument();
    expect(screen.getByText('Fixed Asset')).toBeInTheDocument();
  });

  it('renders the Asset Registry title', () => {
    const assets = new Map([['aaaa', ASSET_A]]);
    render(<AssetRegistryView assets={assets} />);
    expect(screen.getByText('Asset Registry')).toBeInTheDocument();
  });

  it('marks retired assets with "Yes" in the Retired column', () => {
    const assets = new Map([['aaaa', ASSET_A]]);
    const retiredAssets = new Set(['aaaa']);
    const { container } = render(
      <AssetRegistryView assets={assets} retiredAssets={retiredAssets} />,
    );
    // Row should have retired class
    const row = container.querySelector('[data-asset-id="aaaa"]');
    expect(row).toHaveClass('brightledger-asset-registry__row--retired');
  });

  it('does not mark non-retired assets as retired', () => {
    const assets = new Map([['aaaa', ASSET_A]]);
    const { container } = render(<AssetRegistryView assets={assets} />);
    const row = container.querySelector('[data-asset-id="aaaa"]');
    expect(row).not.toHaveClass('brightledger-asset-registry__row--retired');
  });
});
