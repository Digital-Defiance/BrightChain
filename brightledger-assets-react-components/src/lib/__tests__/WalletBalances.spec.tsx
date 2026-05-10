/**
 * @fileoverview Tests for WalletBalances component.
 */

import type { IAssetProjectedState } from '@brightchain/brightledger-assets-api-lib';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { WalletBalances } from '../components/WalletBalances';

const ASSET_ID = 'cafe';
const ACCOUNT_KEY = 'deadbeef';

function makeState(rawBalance?: bigint, decimals = 6): IAssetProjectedState {
  const assets = new Map([
    [
      ASSET_ID,
      {
        symbol: 'JUL',
        displayName: 'Joule Unit Ledger',
        decimals,
        supplyPolicy: 'mintable' as const,
        transferPolicy: 'open' as const,
        freezable: true,
        burnable: true,
        brightTrustPolicy: { type: 'majority' as const, threshold: 1 },
      },
    ],
  ]);

  const accountBalances = new Map<string, bigint>();
  if (rawBalance !== undefined) {
    accountBalances.set(ACCOUNT_KEY, rawBalance);
  }

  const balances = new Map([[ASSET_ID, accountBalances]]);

  return {
    assets,
    balances,
    nonces: new Map(),
    frozen: new Map(),
    operatorFrozen: new Map(),
    whitelist: new Map(),
    issuedTotal: new Map(),
    burnedTotal: new Map(),
    issuerSets: new Map(),
    shardSettlement: new Map(),
    processKeys: new Map(),
    disputes: new Map(),
    lastSequence: 0n,
    retiredAssets: new Set(),
  } as IAssetProjectedState;
}

describe('WalletBalances', () => {
  it('renders empty state when account has no balances', () => {
    render(<WalletBalances state={makeState()} accountKey={ACCOUNT_KEY} />);
    expect(
      screen.getByText('No balances for this account.'),
    ).toBeInTheDocument();
  });

  it('renders empty state when account has zero balance', () => {
    render(<WalletBalances state={makeState(0n)} accountKey={ACCOUNT_KEY} />);
    expect(
      screen.getByText('No balances for this account.'),
    ).toBeInTheDocument();
  });

  it('renders a table row with formatted balance for non-zero balance', () => {
    render(
      <WalletBalances state={makeState(1_500_000n)} accountKey={ACCOUNT_KEY} />,
    );
    expect(screen.getByText('Account Balances')).toBeInTheDocument();
    expect(screen.getByText('JUL')).toBeInTheDocument();
    // formatBalance(1_500_000n, 6): 1500000/10^6=1, frac=500000 → strips trailing zeros → '1.5'
    expect(screen.getByText('1.5')).toBeInTheDocument();
  });

  it('renders different account balance for different key', () => {
    render(
      <WalletBalances state={makeState(42_000_000n)} accountKey="other-key" />,
    );
    // "other-key" not in balances so empty
    expect(
      screen.getByText('No balances for this account.'),
    ).toBeInTheDocument();
  });

  it('renders integer balance for zero decimals', () => {
    render(
      <WalletBalances state={makeState(7n, 0)} accountKey={ACCOUNT_KEY} />,
    );
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
