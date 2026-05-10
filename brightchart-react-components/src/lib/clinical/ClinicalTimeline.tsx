/**
 * ClinicalTimeline Component
 *
 * Displays a chronological timeline of clinical resources for a patient,
 * grouped by date in reverse chronological order with resource type filtering.
 *
 * @module clinical/ClinicalTimeline
 */
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import type {
  ClinicalResource,
  ClinicalResourceType,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface ClinicalTimelineProps {
  patientId: string;
  resources: ClinicalResource<string>[];
  onSelect: (resource: ClinicalResource<string>) => void;
  filterTypes?: ClinicalResourceType[];
}

const ALL_RESOURCE_TYPES: ClinicalResourceType[] = [
  'Observation',
  'Condition',
  'AllergyIntolerance',
  'Medication',
  'MedicationStatement',
  'Procedure',
];

function getEffectiveDate(
  resource: ClinicalResource<string>,
): string | undefined {
  if ('effectiveDateTime' in resource && resource.effectiveDateTime)
    return resource.effectiveDateTime;
  if ('effectivePeriod' in resource && resource.effectivePeriod?.start)
    return resource.effectivePeriod.start;
  if ('onsetDateTime' in resource && resource.onsetDateTime)
    return resource.onsetDateTime;
  if ('recordedDate' in resource && resource.recordedDate)
    return resource.recordedDate;
  if ('performedDateTime' in resource && resource.performedDateTime)
    return resource.performedDateTime;
  return undefined;
}

function getCodeDisplay(resource: ClinicalResource<string>): string {
  if ('code' in resource && resource.code) {
    const coding = resource.code.coding?.[0];
    return coding?.display ?? resource.code.text ?? coding?.code ?? 'Unknown';
  }
  if (
    'medicationCodeableConcept' in resource &&
    resource.medicationCodeableConcept
  ) {
    const coding = resource.medicationCodeableConcept.coding?.[0];
    return (
      coding?.display ?? resource.medicationCodeableConcept.text ?? 'Unknown'
    );
  }
  return 'Unknown';
}

function getStatus(resource: ClinicalResource<string>): string {
  if ('status' in resource && resource.status) return String(resource.status);
  if ('clinicalStatus' in resource && resource.clinicalStatus) {
    return (
      resource.clinicalStatus.coding?.[0]?.code ??
      resource.clinicalStatus.text ??
      ''
    );
  }
  return '';
}

export const ClinicalTimeline: React.FC<ClinicalTimelineProps> = ({
  resources,
  onSelect,
  filterTypes,
}) => {
  const { t } = useBrightChartTranslation();
  const { formatDate } = useFormattedDate();
  const [activeFilters, setActiveFilters] = useState<ClinicalResourceType[]>(
    filterTypes ?? ALL_RESOURCE_TYPES,
  );

  const toggleFilter = useCallback((type: ClinicalResourceType) => {
    setActiveFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  const filtered = useMemo(() => {
    const items = resources.filter((r) =>
      activeFilters.includes(r.resourceType as ClinicalResourceType),
    );
    return items.sort((a, b) => {
      const da = getEffectiveDate(a) ?? '';
      const db = getEffectiveDate(b) ?? '';
      return db.localeCompare(da);
    });
  }, [resources, activeFilters]);

  const grouped = useMemo(() => {
    const groups: Record<string, ClinicalResource<string>[]> = {};
    for (const r of filtered) {
      const dateStr = getEffectiveDate(r);
      const key = dateStr ? formatDate(dateStr) : 'No date';
      (groups[key] ??= []).push(r);
    }
    return groups;
  }, [filtered, formatDate]);

  return (
    <div
      className="clinical-timeline"
      role="region"
      aria-label={t(BrightChartStrings.ClinicalTimeline_AriaLabel)}
    >
      <div
        className="clinical-timeline__filters"
        role="group"
        aria-label={t(BrightChartStrings.ClinicalTimeline_FilterAriaLabel)}
      >
        {ALL_RESOURCE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`clinical-timeline__filter ${activeFilters.includes(type) ? 'clinical-timeline__filter--active' : ''}`}
            onClick={() => toggleFilter(type)}
            aria-pressed={activeFilters.includes(type)}
          >
            {type}
          </button>
        ))}
      </div>
      <div className="clinical-timeline__entries">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="clinical-timeline__group">
            <h3 className="clinical-timeline__date">{date}</h3>
            <ul className="clinical-timeline__list" role="list">
              {items.map((resource, idx) => (
                <li
                  key={resource.id ?? idx}
                  className="clinical-timeline__item"
                >
                  <button
                    type="button"
                    className="clinical-timeline__entry"
                    onClick={() => onSelect(resource)}
                  >
                    <span className="clinical-timeline__type">
                      {resource.resourceType}
                    </span>
                    <span className="clinical-timeline__code">
                      {getCodeDisplay(resource)}
                    </span>
                    <span className="clinical-timeline__status">
                      {getStatus(resource)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="clinical-timeline__empty">
            {t(BrightChartStrings.ClinicalTimeline_Empty)}
          </p>
        )}
      </div>
    </div>
  );
};
