/**
 * @fileoverview Tests for IssuerAdminPanel component.
 */

import type { IAssetDescriptor } from '@brightchain/brightledger-assets-api-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type {
  IIssueAssetFormData,
  IMintFormData,
} from '../components/IssuerAdminPanel';
import { IssuerAdminPanel } from '../components/IssuerAdminPanel';

const ASSET_ID = 'cafe1234';
const DESCRIPTOR: IAssetDescriptor = {
  symbol: 'FXD',
  displayName: 'Fixed Asset',
  decimals: 0,
  supplyPolicy: 'fixed',
  transferPolicy: 'open',
  freezable: false,
  burnable: false,
  brightTrustPolicy: { type: 'majority', threshold: 1 },
};

function makeAssets(): ReadonlyMap<string, IAssetDescriptor> {
  return new Map([[ASSET_ID, DESCRIPTOR]]);
}

describe('IssuerAdminPanel', () => {
  it('renders both section headings', () => {
    render(
      <IssuerAdminPanel
        assets={makeAssets()}
        onIssue={jest.fn()}
        onMint={jest.fn()}
      />,
    );
    expect(screen.getByText('Issue New Asset')).toBeInTheDocument();
    expect(screen.getByText('Mint Units')).toBeInTheDocument();
  });

  it('renders the panel title', () => {
    render(
      <IssuerAdminPanel
        assets={makeAssets()}
        onIssue={jest.fn()}
        onMint={jest.fn()}
      />,
    );
    expect(screen.getByText('Issuer Administration')).toBeInTheDocument();
  });

  it('calls onIssue with form data when Issue Asset form is submitted', () => {
    const onIssue = jest.fn();
    render(
      <IssuerAdminPanel
        assets={makeAssets()}
        onIssue={onIssue}
        onMint={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Symbol'), {
      target: { value: 'TST' },
    });
    fireEvent.change(screen.getByLabelText('Display Name'), {
      target: { value: 'Test Asset' },
    });
    fireEvent.change(screen.getByLabelText('Decimals'), {
      target: { value: '2' },
    });

    fireEvent.submit(
      screen.getByRole('button', { name: 'Issue Asset' }).closest('form')!,
    );

    expect(onIssue).toHaveBeenCalledTimes(1);
    const data: IIssueAssetFormData = onIssue.mock.calls[0][0];
    expect(data.symbol).toBe('TST');
    expect(data.displayName).toBe('Test Asset');
    expect(data.decimals).toBe(2);
    expect(data.supplyPolicy).toBe('fixed');
    expect(data.transferPolicy).toBe('open');
    expect(data.freezable).toBe(false);
    expect(data.burnable).toBe(false);
  });

  it('calls onMint with form data when Mint form is submitted', () => {
    const onMint = jest.fn();
    render(
      <IssuerAdminPanel
        assets={makeAssets()}
        onIssue={jest.fn()}
        onMint={onMint}
      />,
    );

    fireEvent.change(screen.getByLabelText('Asset'), {
      target: { value: ASSET_ID },
    });
    fireEvent.change(screen.getByLabelText('Recipient Account'), {
      target: { value: 'abcd1234' },
    });
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '1000' },
    });

    fireEvent.submit(
      screen.getByRole('button', { name: 'Mint' }).closest('form')!,
    );

    expect(onMint).toHaveBeenCalledTimes(1);
    const data: IMintFormData = onMint.mock.calls[0][0];
    expect(data.assetId).toBe(ASSET_ID);
    expect(data.assetSymbol).toBe('FXD');
    expect(data.amount).toBe('1000');
    expect(data.recipient).toBe('abcd1234');
  });

  it('renders available assets in the mint dropdown', () => {
    render(
      <IssuerAdminPanel
        assets={makeAssets()}
        onIssue={jest.fn()}
        onMint={jest.fn()}
      />,
    );
    expect(screen.getByRole('option', { name: /FXD/ })).toBeInTheDocument();
  });
});
