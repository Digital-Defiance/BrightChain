/**
 * EligibilityChecker Component
 *
 * Triggers insurance eligibility verification and displays the response:
 * coverage status, benefit details, copay/deductible, auth requirements.
 *
 * @module billing/EligibilityChecker
 */
import type {
  ICoverageEligibilityRequestResource,
  ICoverageEligibilityResponseResource,
  ICoverageResource,
  IPatientResource,
} from '@brightchain/brightchart-lib';
import {
  BrightChartStrings,
  EligibilityRequestPurpose,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface EligibilityCheckerProps {
  patient: IPatientResource<string>;
  coverage: ICoverageResource<string>;
  onCheck: (
    request: ICoverageEligibilityRequestResource<string>,
  ) => Promise<ICoverageEligibilityResponseResource<string>>;
}

function formatMoney(value?: number, currency?: string): string {
  if (value === undefined) return '—';
  return `${currency === 'USD' ? '$' : (currency ?? '')}${value.toFixed(2)}`;
}

export const EligibilityChecker: React.FC<EligibilityCheckerProps> = ({
  patient,
  coverage,
  onCheck,
}) => {
  const { t } = useBrightChartTranslation();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] =
    useState<ICoverageEligibilityResponseResource<string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const request: ICoverageEligibilityRequestResource<string> = {
        resourceType: 'CoverageEligibilityRequest',
        status: 'active',
        purpose: [EligibilityRequestPurpose.Benefits],
        patient: {
          reference: `Patient/${patient.id ?? ''}`,
          display: patient.name?.[0]?.text,
        },
        created: new Date().toISOString(),
        insurer: coverage.payor?.[0] ?? { display: 'Unknown' },
        insurance: [
          { coverage: { reference: `Coverage/${coverage.id ?? ''}` } },
        ],
        brightchainMetadata: undefined as never,
      };
      const resp = await onCheck(request);
      setResponse(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eligibility check failed');
    } finally {
      setLoading(false);
    }
  }, [patient, coverage, onCheck]);

  return (
    <div
      className="eligibility-checker"
      role="region"
      aria-label="Eligibility Checker"
    >
      <h3>{t(BrightChartStrings.Insurance_Eligibility)}</h3>
      <div className="eligibility-checker__info">
        <p>
          Patient:{' '}
          {patient.name?.[0]?.text ?? patient.name?.[0]?.family ?? 'Unknown'}
        </p>
        <p>
          Coverage:{' '}
          {coverage.type?.text ??
            coverage.type?.coding?.[0]?.display ??
            'Unknown'}
        </p>
        <p>Payer: {coverage.payor?.[0]?.display ?? 'Unknown'}</p>
      </div>

      <button
        type="button"
        className="eligibility-checker__check-btn"
        onClick={handleCheck}
        disabled={loading}
        aria-label="Check eligibility"
      >
        {loading ? 'Checking...' : 'Check Eligibility'}
      </button>

      {error && (
        <p className="eligibility-checker__error" role="alert">
          {error}
        </p>
      )}

      {response && (
        <div className="eligibility-checker__response">
          <p className="eligibility-checker__outcome" role="status">
            Outcome: <strong>{response.outcome}</strong>
          </p>
          {response.disposition && <p>Disposition: {response.disposition}</p>}

          {response.insurance?.map((ins, i) => (
            <div key={i} className="eligibility-checker__insurance">
              <p>
                Coverage Active: <strong>{ins.inforce ? 'Yes' : 'No'}</strong>
              </p>
              {ins.benefitPeriod && (
                <p>
                  Benefit Period: {ins.benefitPeriod.start} –{' '}
                  {ins.benefitPeriod.end ?? 'ongoing'}
                </p>
              )}
              {ins.item?.map((item, j) => (
                <div key={j} className="eligibility-checker__benefit">
                  <p>
                    {item.category?.text ??
                      item.category?.coding?.[0]?.display ??
                      'Benefit'}
                  </p>
                  {item.excluded && (
                    <p className="eligibility-checker__excluded">Excluded</p>
                  )}
                  {item.benefit?.map((b, k) => (
                    <div key={k}>
                      <span>
                        {b.type?.text ?? b.type?.coding?.[0]?.display ?? ''}
                        :{' '}
                      </span>
                      {b.allowedMoney && (
                        <span>
                          Allowed:{' '}
                          {formatMoney(
                            b.allowedMoney.value,
                            b.allowedMoney.currency,
                          )}{' '}
                        </span>
                      )}
                      {b.usedMoney && (
                        <span>
                          Used:{' '}
                          {formatMoney(b.usedMoney.value, b.usedMoney.currency)}
                        </span>
                      )}
                    </div>
                  ))}
                  {item.authorizationRequired && (
                    <p className="eligibility-checker__auth-required">
                      ⚠ Authorization Required
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
