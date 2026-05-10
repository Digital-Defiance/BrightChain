/**
 * ConditionList Component
 *
 * Displays a list of FHIR R4 Condition resources with clinical status,
 * verification status, onset date, and severity. Visually distinguishes
 * active from resolved/inactive conditions.
 *
 * @module clinical/ConditionList
 */
import type {
  IConditionResource,
  ISpecialtyProfile,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useMemo } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface ConditionListProps {
  conditions: IConditionResource<string>[];
  onSelect: (cond: IConditionResource<string>) => void;
  onAdd: () => void;
  specialtyProfile?: ISpecialtyProfile;
}

function getClinicalStatus(cond: IConditionResource<string>): string {
  return (
    cond.clinicalStatus?.coding?.[0]?.code ?? cond.clinicalStatus?.text ?? ''
  );
}

function getVerificationStatus(cond: IConditionResource<string>): string {
  return (
    cond.verificationStatus?.coding?.[0]?.code ??
    cond.verificationStatus?.text ??
    ''
  );
}

function isActive(cond: IConditionResource<string>): boolean {
  const status = getClinicalStatus(cond).toLowerCase();
  return ['active', 'recurrence', 'relapse'].includes(status);
}

export const ConditionList: React.FC<ConditionListProps> = ({
  conditions,
  onSelect,
  onAdd,
}) => {
  const { t } = useBrightChartTranslation();

  const sorted = useMemo(
    () =>
      [...conditions].sort((a, b) => {
        if (isActive(a) && !isActive(b)) return -1;
        if (!isActive(a) && isActive(b)) return 1;
        return (b.onsetDateTime ?? '').localeCompare(a.onsetDateTime ?? '');
      }),
    [conditions],
  );

  return (
    <div className="condition-list" role="region" aria-label="Condition List">
      <div className="condition-list__header">
        <h3>{t(BrightChartStrings.ConditionList_Title)}</h3>
        <button
          type="button"
          className="condition-list__add"
          onClick={onAdd}
          aria-label="Add new condition"
        >
          {t(BrightChartStrings.ConditionList_AddNew)}
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="condition-list__empty">
          {t(BrightChartStrings.Empty_NoConditions)}
        </p>
      ) : (
        <ul className="condition-list__items" role="list">
          {sorted.map((cond, idx) => (
            <li
              key={cond.id ?? idx}
              className={`condition-list__item ${isActive(cond) ? 'condition-list__item--active' : 'condition-list__item--resolved'}`}
            >
              <button
                type="button"
                className="condition-list__entry"
                onClick={() => onSelect(cond)}
              >
                <span className="condition-list__code">
                  {cond.code?.text ??
                    cond.code?.coding?.[0]?.display ??
                    'Unknown'}
                </span>
                <span className="condition-list__clinical-status">
                  {getClinicalStatus(cond)}
                </span>
                <span className="condition-list__verification">
                  {getVerificationStatus(cond)}
                </span>
                {cond.onsetDateTime && (
                  <span className="condition-list__onset">
                    Onset: {cond.onsetDateTime}
                  </span>
                )}
                {cond.severity && (
                  <span className="condition-list__severity">
                    {cond.severity.text ??
                      cond.severity.coding?.[0]?.display ??
                      ''}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
