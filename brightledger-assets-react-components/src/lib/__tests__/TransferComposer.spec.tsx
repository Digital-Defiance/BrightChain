/**
 * @fileoverview Tests for TransferComposer component.
 */

import type { IAssetDescriptor } from '@brightchain/brightledger-assets-api-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ITransferFormData } from '../components/TransferComposer';
import { TransferComposer } from '../components/TransferComposer';

const ASSET_ID = 'aaaa';
const DESCRIPTOR: IAssetDescriptor = {
  symbol: 'JUL',
  displayName: 'Joule Unit Ledger',
  decimals: 6,
  supplyPolicy: 'mintable',
  transferPolicy: 'open',
  freezable: true,
  burnable: true,
  brightTrustPolicy: { type: 'majority', threshold: 1 },
};

function makeAssets(): ReadonlyMap<string, IAssetDescriptor> {
  return new Map([[ASSET_ID, DESCRIPTOR]]);
}

describe('TransferComposer', () => {
  it('renders the form title', () => {
    render(<TransferComposer assets={makeAssets()} onSubmit={jest.fn()} />);
    expect(screen.getByText('Transfer')).toBeInTheDocument();
  });

  it('renders asset, recipient, amount, and memo fields', () => {
    render(<TransferComposer assets={makeAssets()} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText('Asset')).toBeInTheDocument();
    expect(screen.getByLabelText('Recipient Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Memo (optional)')).toBeInTheDocument();
  });

  it('renders available assets in the dropdown', () => {
    render(<TransferComposer assets={makeAssets()} onSubmit={jest.fn()} />);
    expect(screen.getByRole('option', { name: /JUL/ })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', () => {
    render(<TransferComposer assets={makeAssets()} onSubmit={jest.fn()} />);
    fireEvent.submit(
      screen.getByRole('button', { name: 'Submit Transfer' }).closest('form')!,
    );
    expect(screen.getByText('Please select an asset.')).toBeInTheDocument();
    expect(
      screen.getByText('Amount must be a positive integer.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Recipient must not be empty.'),
    ).toBeInTheDocument();
  });

  it('calls onSubmit with form data when all fields are valid', () => {
    const onSubmit = jest.fn();
    render(<TransferComposer assets={makeAssets()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Asset'), {
      target: { value: ASSET_ID },
    });
    fireEvent.change(screen.getByLabelText('Recipient Account'), {
      target: { value: 'deadbeef' },
    });
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '1.5' },
    });
    fireEvent.change(screen.getByLabelText('Memo (optional)'), {
      target: { value: 'test memo' },
    });

    fireEvent.submit(
      screen.getByRole('button', { name: 'Submit Transfer' }).closest('form')!,
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const data: ITransferFormData = onSubmit.mock.calls[0][0];
    expect(data.assetId).toBe(ASSET_ID);
    expect(data.assetSymbol).toBe('JUL');
    expect(data.amount).toBe('1.5');
    expect(data.recipient).toBe('deadbeef');
    expect(data.memo).toBe('test memo');
  });

  it('does not call onSubmit when amount is zero', () => {
    const onSubmit = jest.fn();
    render(<TransferComposer assets={makeAssets()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Asset'), {
      target: { value: ASSET_ID },
    });
    fireEvent.change(screen.getByLabelText('Recipient Account'), {
      target: { value: 'deadbeef' },
    });
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '0' },
    });

    fireEvent.submit(
      screen.getByRole('button', { name: 'Submit Transfer' }).closest('form')!,
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Amount must be a positive integer.'),
    ).toBeInTheDocument();
  });
});
