/**
 * AllergyList Component
 *
 * Displays a list of FHIR R4 AllergyIntolerance resources with clinical
 * status, criticality, type, and last occurrence. Highlights high-criticality
 * allergies and shows "No Known Allergies" when empty.
 *
 * @module clinical/AllergyList
 */
import type { IAllergyIntoleranceResource } from '@brightchain/brightchart-lib';
import {
  AllergyIntoleranceCriticality,
  AllergyIntoleranceType,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useMemo } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface AllergyListProps {
  allergies: IAllergyIntoleranceResource<string>[];
  onSelect: (allergy: IAllergyIntoleranceResource<string>) => void;
  onAdd: () => void;
}

function _getCriticality(a: IAllergyIntoleranceResource<string>): string {
  return a.criticality ?? '';
}

function isHighCriticality(a: IAllergyIntoleranceResource<string>): boolean {
  return a.criticality === 'high';
}

export const AllergyList: React.FC<AllergyListProps> = ({
  allergies,
  onSelect,
  onAdd,
}) => {
  const { tEnum } = useBrightChartTranslation();

  const sorted = useMemo(
    () =>
      [...allergies].sort((a, b) => {
        if (isHighCriticality(a) && !isHighCriticality(b)) return -1;
        if (!isHighCriticality(a) && isHighCriticality(b)) return 1;
        return 0;
      }),
    [allergies],
  );

  return (
    <div className="allergy-list" role="region" aria-label="Allergy List">
      <div className="allergy-list__header">
        <h3>Allergies &amp; Intolerances</h3>
        <button
          type="button"
          className="allergy-list__add"
          onClick={onAdd}
          aria-label="Add new allergy"
        >
          + Add
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="allergy-list__empty" role="status">
          No Known Allergies
        </p>
      ) : (
        <ul className="allergy-list__items" role="list">
          {sorted.map((allergy, idx) => (
            <li
              key={allergy.id ?? idx}
              className={`allergy-list__item ${isHighCriticality(allergy) ? 'allergy-list__item--high' : ''}`}
            >
              <button
                type="button"
                className="allergy-list__entry"
                onClick={() => onSelect(allergy)}
              >
                <span className="allergy-list__code">
                  {allergy.code?.text ??
                    allergy.code?.coding?.[0]?.display ??
                    'Unknown'}
                </span>
                <span className="allergy-list__status">
                  {allergy.clinicalStatus?.coding?.[0]?.code ??
                    allergy.clinicalStatus?.text ??
                    ''}
                </span>
                <span className="allergy-list__criticality">
                  {allergy.criticality
                    ? tEnum(AllergyIntoleranceCriticality, allergy.criticality)
                    : ''}
                </span>
                {allergy.type && (
                  <span className="allergy-list__type">
                    {tEnum(AllergyIntoleranceType, allergy.type)}
                  </span>
                )}
                {allergy.lastOccurrence && (
                  <span className="allergy-list__last-occurrence">
                    Last: {allergy.lastOccurrence}
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
