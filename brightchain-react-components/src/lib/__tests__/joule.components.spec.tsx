/**
 * @fileoverview Tests for Joule React components.
 *
 * Validates that all components render correctly with extreme bigint values
 * without producing NaN, Infinity, or scientific notation in the output.
 *
 * @requirements joule-resource-credits spec, Req 7.7
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// Mock the i18n hook so components render without an I18nProvider.
// The mock performs basic {KEY} interpolation to match English translations.
jest.mock('@digitaldefiance/express-suite-react-components', () => {
  // Minimal English translations needed by Joule components
  const translations: Record<string, string> = {
    Dispute_AriaLabelTemplate: 'Joule dispute {ID}',
    Dispute_IdTemplate: 'Dispute #{ID}',
    Dispute_State_Disputed: 'Under review',
    Dispute_State_ResolvedFinal: 'Resolved (final)',
    Dispute_State_ResolvedReplaced: 'Resolved (replaced)',
    Dispute_Field_Amount: 'Amount',
    Dispute_Field_Opened: 'Opened',
    Dispute_Field_Resolved: 'Resolved',
    Dispute_Field_Reason: 'Reason',
    Dispute_Field_Resolution: 'Resolution',
    Date_BrightDateTemplate: 'BD {BD}',
    JouleEventLog_Empty: 'No Joule events recorded yet.',
    JouleEventLog_AriaLabel: 'Joule event log',
    RateTransparency_Empty: 'Rate table not available.',
  };

  function interpolate(key: string, params?: Record<string, string | number>): string {
    const template = translations[key] ?? key;
    if (!params) return template;
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      template,
    );
  }

  return {
    useI18n: () => ({
      tComponent: (_componentId: string, key: string, params?: Record<string, string>) =>
        interpolate(key, params),
      t: (key: string, params?: Record<string, string>) => interpolate(key, params),
      tBranded: (key: string, params?: Record<string, string>) => interpolate(key, params),
      changeLanguage: jest.fn(),
      currentLanguage: 'en-US',
    }),
    I18nProvider: ({ children }: { children: unknown }) => children,
  };
});

import { DisputeNotice, JouleDispute } from '../joule/DisputeNotice';
import { JouleBalance } from '../joule/JouleBalance';
import {
  JouleConsumptionChart,
  JouleConsumptionEntry,
} from '../joule/JouleConsumptionChart';
import { JouleEvent, JouleEventLog } from '../joule/JouleEventLog';
import { RateTransparency } from '../joule/RateTransparency';
import { JouleRateTableData } from '../joule/hooks';

// ---------------------------------------------------------------------------
// Test bigint values per spec — Req 7.7
// ---------------------------------------------------------------------------

const EXTREME_AMOUNTS: bigint[] = [
  0n,
  1n,
  999n,
  1_000_000n,
  BigInt(Number.MAX_SAFE_INTEGER) + 1n,
  10n ** 18n,
];

// Regex that matches scientific notation in text (e.g. 1e+18)
const SCIENTIFIC_NOTATION_RE = /\d+\.?\d*e[+-]\d+/i;

function expectNoScientificNotation(container: HTMLElement): void {
  const text = container.textContent ?? '';
  expect(text).not.toMatch(SCIENTIFIC_NOTATION_RE);
  expect(text).not.toContain('NaN');
  expect(text).not.toContain('Infinity');
}

// ---------------------------------------------------------------------------
// JouleBalance
// ---------------------------------------------------------------------------

describe('JouleBalance', () => {
  test.each(EXTREME_AMOUNTS)(
    'renders without NaN/Infinity/scientific notation for balance=%s',
    (amount) => {
      const { container } = render(
        <JouleBalance balance={amount} reserved={amount} spent={amount} />,
      );
      expectNoScientificNotation(container as HTMLElement);
      expect(screen.getByLabelText('Joule balance')).toBeInTheDocument();
    },
  );

  it('shows loading skeleton when loading=true', () => {
    const { container } = render(
      <JouleBalance balance={0n} reserved={0n} spent={0n} loading={true} />,
    );
    expect(container.querySelector('.joule-balance--loading')).toBeTruthy();
  });

  it('shows error message when error is set', () => {
    render(
      <JouleBalance
        balance={0n}
        reserved={0n}
        spent={0n}
        error="Connection refused"
      />,
    );
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
  });

  it('renders available, reserved, and spent rows', () => {
    render(
      <JouleBalance
        balance={1_000_000n}
        reserved={500_000n}
        spent={200_000n}
      />,
    );
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Reserved')).toBeInTheDocument();
    expect(screen.getByText('Spent')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// JouleConsumptionChart
// ---------------------------------------------------------------------------

describe('JouleConsumptionChart', () => {
  const makeEntries = (amount: bigint): JouleConsumptionEntry[] => [
    { resourceClass: 'compute', consumed: amount },
    { resourceClass: 'storage', consumed: amount },
  ];

  test.each(EXTREME_AMOUNTS)(
    'renders without NaN/Infinity/scientific notation for consumed=%s',
    (amount) => {
      const { container } = render(
        <JouleConsumptionChart
          entries={makeEntries(amount)}
          totalConsumed={amount * 2n}
          windowMs={86_400_000}
        />,
      );
      expectNoScientificNotation(container as HTMLElement);
    },
  );

  it('shows empty state when entries is empty', () => {
    render(
      <JouleConsumptionChart
        entries={[]}
        totalConsumed={0n}
        windowMs={3_600_000}
      />,
    );
    expect(screen.getByText('No consumption data.')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading=true', () => {
    const { container } = render(
      <JouleConsumptionChart
        entries={[]}
        totalConsumed={0n}
        windowMs={60_000}
        loading={true}
      />,
    );
    expect(container.querySelector('.joule-consumption--loading')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// JouleEventLog
// ---------------------------------------------------------------------------

describe('JouleEventLog', () => {
  const makeEvents = (amount: bigint): JouleEvent[] => [
    {
      id: 'ev-1',
      kind: 'Debit',
      microJoules: amount,
      timestamp: Date.now(),
      description: 'test event',
    },
  ];

  test.each(EXTREME_AMOUNTS)(
    'renders without NaN/Infinity/scientific notation for microJoules=%s',
    (amount) => {
      const { container } = render(
        <JouleEventLog events={makeEvents(amount)} />,
      );
      expectNoScientificNotation(container as HTMLElement);
    },
  );

  it('shows empty state message when events is empty', () => {
    render(<JouleEventLog events={[]} />);
    expect(
      screen.getByText('No Joule events recorded yet.'),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// RateTransparency
// ---------------------------------------------------------------------------

describe('RateTransparency', () => {
  const makeTable = (amount: bigint): JouleRateTableData => ({
    version: 1,
    effectiveAt: 0,
    entries: {
      compute: { microJoulesPerUnit: amount, unit: 'op' },
      storage: { microJoulesPerUnit: amount, unit: 'byte' },
    },
  });

  test.each(EXTREME_AMOUNTS)(
    'renders without NaN/Infinity/scientific notation for microJoulesPerUnit=%s',
    (amount) => {
      const { container } = render(
        <RateTransparency rateTable={makeTable(amount)} />,
      );
      expectNoScientificNotation(container as HTMLElement);
    },
  );

  it('shows empty state when rateTable is null', () => {
    render(<RateTransparency rateTable={null} />);
    expect(screen.getByText('Rate table not available.')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading=true', () => {
    const { container } = render(
      <RateTransparency rateTable={null} loading={true} />,
    );
    expect(container.querySelector('.rate-transparency--loading')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// DisputeNotice
// ---------------------------------------------------------------------------

describe('DisputeNotice', () => {
  const makeDispute = (amount: bigint): JouleDispute => ({
    id: 'dispute-1',
    microJoules: amount,
    state: 'DISPUTED',
    openedAt: Date.now(),
    reason: 'Incorrect charge',
  });

  test.each(EXTREME_AMOUNTS)(
    'renders without NaN/Infinity/scientific notation for microJoules=%s',
    (amount) => {
      const { container } = render(
        <DisputeNotice dispute={makeDispute(amount)} />,
      );
      expectNoScientificNotation(container as HTMLElement);
    },
  );

  it('renders all three dispute states', () => {
    const states: JouleDispute['state'][] = [
      'DISPUTED',
      'RESOLVED_FINAL',
      'RESOLVED_REPLACED',
    ];
    for (const state of states) {
      const { unmount } = render(
        <DisputeNotice dispute={{ ...makeDispute(100n), state }} />,
      );
      expect(
        screen.getByRole('article', { name: 'Joule dispute dispute-1' }),
      ).toBeInTheDocument();
      unmount();
    }
  });

  it('renders optional resolution fields when present', () => {
    render(
      <DisputeNotice
        dispute={{
          id: 'dispute-2',
          microJoules: 5_000_000n,
          state: 'RESOLVED_FINAL',
          openedAt: Date.now() - 10_000,
          resolvedAt: Date.now(),
          reason: 'Duplicate charge',
          resolution: 'Full refund applied',
        }}
      />,
    );
    expect(screen.getByText('Full refund applied')).toBeInTheDocument();
  });
});
