/**
 * EOBViewer Component
 *
 * Displays an ExplanationOfBenefit with outcome, per-line adjudication,
 * payment details, totals, and process notes.
 *
 * @module billing/EOBViewer
 */
import type {
  EOBAdjudication,
  IExplanationOfBenefitResource,
} from '@brightchain/brightchart-lib';
import { RemittanceOutcome } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useMemo } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface EOBViewerProps {
  eob: IExplanationOfBenefitResource<string>;
}

function formatMoney(value?: number, currency?: string): string {
  if (value === undefined) return '—';
  return `${currency === 'USD' ? '$' : (currency ?? '')}${value.toFixed(2)}`;
}

function outcomeModifier(outcome: RemittanceOutcome): string {
  switch (outcome) {
    case 'complete':
      return 'eob-viewer--complete';
    case 'error':
      return 'eob-viewer--error';
    case 'partial':
      return 'eob-viewer--partial';
    case 'queued':
      return 'eob-viewer--queued';
    default:
      return '';
  }
}

function getAdjudicationAmount(
  adjudications: EOBAdjudication[] | undefined,
  categoryCode: string,
): string {
  const adj = adjudications?.find(
    (a) => a.category?.coding?.[0]?.code === categoryCode,
  );
  return adj?.amount ? formatMoney(adj.amount.value, adj.amount.currency) : '—';
}

export const EOBViewer: React.FC<EOBViewerProps> = ({ eob }) => {
  const { tEnum } = useBrightChartTranslation();
  const outcomeClass = useMemo(
    () => outcomeModifier(eob.outcome),
    [eob.outcome],
  );

  return (
    <div
      className={`eob-viewer ${outcomeClass}`}
      role="region"
      aria-label="Explanation of Benefit"
    >
      <div className="eob-viewer__header">
        <h3>Explanation of Benefit</h3>
        <span
          className={`eob-viewer__outcome eob-viewer__outcome--${eob.outcome}`}
          role="status"
        >
          {tEnum(RemittanceOutcome, eob.outcome)}
        </span>
      </div>

      <div className="eob-viewer__meta">
        {eob.claim && (
          <p>Claim: {eob.claim.reference ?? eob.claim.display ?? '—'}</p>
        )}
        <p>Created: {eob.created}</p>
        {eob.insurer && (
          <p>Insurer: {eob.insurer.display ?? eob.insurer.reference ?? '—'}</p>
        )}
        {eob.disposition && <p>Disposition: {eob.disposition}</p>}
      </div>

      {eob.item && eob.item.length > 0 && (
        <div className="eob-viewer__items">
          <h4>Line Item Adjudication</h4>
          <table aria-label="Line item adjudication">
            <thead>
              <tr>
                <th>Item #</th>
                <th>Submitted</th>
                <th>Allowed</th>
                <th>Benefit</th>
                <th>Patient Resp.</th>
              </tr>
            </thead>
            <tbody>
              {eob.item.map((item) => (
                <tr key={item.itemSequence}>
                  <td>{item.itemSequence}</td>
                  <td>
                    {getAdjudicationAmount(item.adjudication, 'submitted')}
                  </td>
                  <td>
                    {getAdjudicationAmount(item.adjudication, 'eligible')}
                  </td>
                  <td>{getAdjudicationAmount(item.adjudication, 'benefit')}</td>
                  <td>{getAdjudicationAmount(item.adjudication, 'copay')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {eob.total && eob.total.length > 0 && (
        <div className="eob-viewer__totals">
          <h4>Totals</h4>
          <ul role="list">
            {eob.total.map((t, i) => (
              <li key={i}>
                <span>
                  {t.category?.coding?.[0]?.display ??
                    t.category?.text ??
                    'Total'}
                </span>
                :
                <strong>
                  {' '}
                  {formatMoney(t.amount.value, t.amount.currency)}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {eob.payment && (
        <div className="eob-viewer__payment">
          <h4>Payment</h4>
          {eob.payment.amount && (
            <p>
              Amount:{' '}
              <strong>
                {formatMoney(
                  eob.payment.amount.value,
                  eob.payment.amount.currency,
                )}
              </strong>
            </p>
          )}
          {eob.payment.date && <p>Date: {eob.payment.date}</p>}
          {eob.payment.type && (
            <p>
              Type:{' '}
              {eob.payment.type.coding?.[0]?.display ??
                eob.payment.type.text ??
                '—'}
            </p>
          )}
          {eob.payment.adjustment && (
            <p>
              Adjustment:{' '}
              {formatMoney(
                eob.payment.adjustment.value,
                eob.payment.adjustment.currency,
              )}
            </p>
          )}
        </div>
      )}

      {eob.processNote && eob.processNote.length > 0 && (
        <div className="eob-viewer__notes">
          <h4>Process Notes</h4>
          <ul role="list">
            {eob.processNote.map((note, i) => (
              <li key={note.number ?? i}>{note.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
