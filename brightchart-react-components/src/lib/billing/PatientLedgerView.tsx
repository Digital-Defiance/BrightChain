/**
 * PatientLedgerView Component
 *
 * Chronological list of charges, payments, adjustments, and refunds
 * with running balance. Type-colored entries, prominent current balance,
 * and filtering by date range and entry type.
 *
 * @module billing/PatientLedgerView
 */
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import type { IPatientLedger, IPeriod } from '@brightchain/brightchart-lib';
import { LedgerEntryType } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface PatientLedgerViewProps {
  ledger: IPatientLedger<string>;
  filterDateRange?: IPeriod;
  filterTypes?: LedgerEntryType[];
}

function formatMoney(value: number, currency?: string): string {
  const prefix = currency === 'USD' || !currency ? '$' : currency;
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

function entryTypeModifier(type: LedgerEntryType): string {
  switch (type) {
    case 'charge':
      return 'ledger-entry--charge';
    case 'payment':
      return 'ledger-entry--payment';
    case 'adjustment':
      return 'ledger-entry--adjustment';
    case 'refund':
      return 'ledger-entry--refund';
    case 'write-off':
      return 'ledger-entry--writeoff';
    default:
      return '';
  }
}

function _entryTypeLabel(_type: LedgerEntryType): string {
  // Kept as fallback signature — callers now use tEnum(LedgerEntryType, type) instead
  return _type;
}

const ALL_TYPES: LedgerEntryType[] = [
  LedgerEntryType.Charge,
  LedgerEntryType.Payment,
  LedgerEntryType.Adjustment,
  LedgerEntryType.Refund,
  LedgerEntryType.WriteOff,
];

export const PatientLedgerView: React.FC<PatientLedgerViewProps> = ({
  ledger,
  filterDateRange,
  filterTypes,
}) => {
  const { tEnum } = useBrightChartTranslation();
  const { formatDate } = useFormattedDate();
  const [activeTypes, setActiveTypes] = useState<LedgerEntryType[]>(
    filterTypes ?? ALL_TYPES,
  );

  const toggleType = useCallback((type: LedgerEntryType) => {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  const filtered = useMemo(() => {
    let entries = ledger.entries;

    if (activeTypes.length < ALL_TYPES.length) {
      entries = entries.filter((e) => activeTypes.includes(e.type));
    }

    if (filterDateRange) {
      const start = filterDateRange.start
        ? new Date(filterDateRange.start).getTime()
        : -Infinity;
      const end = filterDateRange.end
        ? new Date(filterDateRange.end).getTime()
        : Infinity;
      entries = entries.filter((e) => {
        const t = new Date(e.date).getTime();
        return t >= start && t <= end;
      });
    }

    return entries;
  }, [ledger.entries, activeTypes, filterDateRange]);

  return (
    <div className="patient-ledger" role="region" aria-label="Patient Ledger">
      <div className="patient-ledger__balance" aria-live="polite">
        <span className="patient-ledger__balance-label">Current Balance:</span>
        <strong className="patient-ledger__balance-amount">
          {formatMoney(
            ledger.currentBalance.value,
            ledger.currentBalance.currency,
          )}
        </strong>
      </div>

      <div
        className="patient-ledger__filters"
        role="group"
        aria-label="Entry type filters"
      >
        {ALL_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`patient-ledger__filter ${activeTypes.includes(type) ? 'patient-ledger__filter--active' : ''} ${entryTypeModifier(type)}`}
            onClick={() => toggleType(type)}
            aria-pressed={activeTypes.includes(type)}
          >
            {tEnum(LedgerEntryType, type)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="patient-ledger__empty" role="status">
          No ledger entries found.
        </p>
      ) : (
        <table className="patient-ledger__table" aria-label="Ledger entries">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr
                key={entry.entryId}
                className={`patient-ledger__row ${entryTypeModifier(entry.type)}`}
              >
                <td>{formatDate(entry.date)}</td>
                <td>{tEnum(LedgerEntryType, entry.type)}</td>
                <td>{entry.description}</td>
                <td
                  className={`patient-ledger__amount patient-ledger__amount--${entry.type}`}
                >
                  {entry.type === 'charge' ? '+' : '−'}
                  {formatMoney(entry.amount.value, entry.amount.currency)}
                </td>
                <td>
                  {formatMoney(entry.balance.value, entry.balance.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
