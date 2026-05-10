/**
 * @fileoverview Tests for AuditTrailView component.
 */

import type { ILedgerEntry } from '@brightchain/brightledger-assets-api-lib';
import { ActionKind } from '@brightchain/brightledger-assets-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { AuditTrailView } from '../components/AuditTrailView';

function makeEntry(overrides?: {
  kind?: ActionKind;
  now?: number;
  derivedAssetId?: string;
}): ILedgerEntry {
  return {
    action: {
      kind: overrides?.kind ?? ActionKind.Transfer,
      assetId: new Uint8Array(32),
      from: new Uint8Array(33),
      to: new Uint8Array(33),
      amount: 1000n,
      nonce: 1n,
      expiry: null,
    } as unknown as ILedgerEntry['action'],
    context: {
      now: overrides?.now ?? 1_700_000_000_000,
      signerPublicKeys: [],
      derivedAssetId: overrides?.derivedAssetId,
    },
  };
}

describe('AuditTrailView', () => {
  it('renders empty state when no entries are provided', () => {
    render(<AuditTrailView entries={[]} />);
    expect(screen.getByText('No entries found.')).toBeInTheDocument();
  });

  it('renders the audit trail title when entries are present', () => {
    render(<AuditTrailView entries={[makeEntry()]} />);
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('renders action kind for each entry', () => {
    const entries = [
      makeEntry({ kind: ActionKind.Transfer }),
      makeEntry({ kind: ActionKind.Mint }),
    ];
    render(<AuditTrailView entries={entries} />);
    expect(screen.getByText(ActionKind.Transfer)).toBeInTheDocument();
    expect(screen.getByText(ActionKind.Mint)).toBeInTheDocument();
  });

  it('renders sequence numbers starting at 1', () => {
    const entries = [makeEntry(), makeEntry()];
    render(<AuditTrailView entries={entries} />);
    const rows = screen.getAllByRole('row');
    // rows[0] is header; rows[1] is first entry
    expect(rows[1]).toHaveTextContent('1');
    expect(rows[2]).toHaveTextContent('2');
  });

  it('renders ISO timestamp from entry context.now', () => {
    const now = 1_700_000_000_000;
    render(<AuditTrailView entries={[makeEntry({ now })]} />);
    const expected = new Date(now).toISOString();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('renders abbreviated hash when derivedAssetId is present', () => {
    // hex longer than prefixLen(8) + suffixLen(8) + 3 = 19 chars triggers abbreviation
    const derivedAssetId = 'abcdef0123456789abcdef';
    render(<AuditTrailView entries={[makeEntry({ derivedAssetId })]} />);
    // abbreviateHex('abcdef0123456789abcdef', 8, 8) = 'abcdef01' + HORIZONTAL_ELLIPSIS + '89abcdef'
    expect(screen.getByText(`abcdef01\u202689abcdef`)).toBeInTheDocument();
  });

  it('renders em dash when derivedAssetId is absent', () => {
    render(<AuditTrailView entries={[makeEntry()]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('does not render Load More button when onLoadMore is absent', () => {
    render(<AuditTrailView entries={[makeEntry()]} />);
    expect(
      screen.queryByRole('button', { name: 'Load More' }),
    ).not.toBeInTheDocument();
  });

  it('renders Load More button when onLoadMore is provided', () => {
    render(<AuditTrailView entries={[makeEntry()]} onLoadMore={jest.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Load More' }),
    ).toBeInTheDocument();
  });

  it('calls onLoadMore when Load More button is clicked', () => {
    const onLoadMore = jest.fn();
    render(<AuditTrailView entries={[makeEntry()]} onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
