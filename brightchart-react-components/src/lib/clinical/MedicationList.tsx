/**
 * MedicationList Component
 *
 * Displays FHIR R4 MedicationStatement resources grouped by status
 * (active, completed, stopped) with collapsible group headers.
 *
 * @module clinical/MedicationList
 */
import type { IMedicationStatementResource } from '@brightchain/brightchart-lib';
import { MedicationStatementStatus } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface MedicationListProps {
  medications: IMedicationStatementResource<string>[];
  onSelect: (med: IMedicationStatementResource<string>) => void;
}

type StatusGroup = 'active' | 'completed' | 'stopped' | 'other';

function getStatusGroup(
  med: IMedicationStatementResource<string>,
): StatusGroup {
  const s = med.status;
  if (s === 'active' || s === 'intended' || s === 'on-hold') return 'active';
  if (s === 'completed') return 'completed';
  if (s === 'stopped' || s === 'not-taken') return 'stopped';
  return 'other';
}

function getMedName(med: IMedicationStatementResource<string>): string {
  if (med.medicationCodeableConcept) {
    return (
      med.medicationCodeableConcept.text ??
      med.medicationCodeableConcept.coding?.[0]?.display ??
      'Unknown'
    );
  }
  return 'Unknown';
}

function getDosageSummary(med: IMedicationStatementResource<string>): string {
  return med.dosage?.[0]?.text ?? '';
}

function getEffectiveRange(med: IMedicationStatementResource<string>): string {
  if (med.effectiveDateTime) return med.effectiveDateTime;
  if (med.effectivePeriod) {
    const start = med.effectivePeriod.start ?? '';
    const end = med.effectivePeriod.end ?? 'present';
    return `${start} – ${end}`;
  }
  return '';
}

const GROUP_LABELS: Record<StatusGroup, string> = {
  active: 'Active Medications',
  completed: 'Completed',
  stopped: 'Stopped',
  other: 'Other',
};

const GROUP_ORDER: StatusGroup[] = ['active', 'completed', 'stopped', 'other'];

export const MedicationList: React.FC<MedicationListProps> = ({
  medications,
  onSelect,
}) => {
  const { tEnum } = useBrightChartTranslation();

  const [collapsed, setCollapsed] = useState<Record<StatusGroup, boolean>>({
    active: false,
    completed: true,
    stopped: true,
    other: true,
  });

  const toggleGroup = useCallback((group: StatusGroup) => {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<StatusGroup, IMedicationStatementResource<string>[]> =
      {
        active: [],
        completed: [],
        stopped: [],
        other: [],
      };
    for (const med of medications) {
      groups[getStatusGroup(med)].push(med);
    }
    return groups;
  }, [medications]);

  return (
    <div className="medication-list" role="region" aria-label="Medication List">
      <h3>Medications</h3>
      {medications.length === 0 ? (
        <p className="medication-list__empty">No medications recorded.</p>
      ) : (
        GROUP_ORDER.filter((g) => grouped[g].length > 0).map((group) => (
          <div key={group} className="medication-list__group">
            <button
              type="button"
              className={`medication-list__group-header ${group === 'active' ? 'medication-list__group-header--active' : ''}`}
              onClick={() => toggleGroup(group)}
              aria-expanded={!collapsed[group]}
            >
              {GROUP_LABELS[group]} ({grouped[group].length})
            </button>
            {!collapsed[group] && (
              <ul className="medication-list__items" role="list">
                {grouped[group].map((med, idx) => (
                  <li
                    key={med.id ?? idx}
                    className={`medication-list__item ${group === 'active' ? 'medication-list__item--active' : ''}`}
                  >
                    <button
                      type="button"
                      className="medication-list__entry"
                      onClick={() => onSelect(med)}
                    >
                      <span className="medication-list__name">
                        {getMedName(med)}
                      </span>
                      <span className="medication-list__status">
                        {tEnum(MedicationStatementStatus, med.status)}
                      </span>
                      <span className="medication-list__dates">
                        {getEffectiveRange(med)}
                      </span>
                      {getDosageSummary(med) && (
                        <span className="medication-list__dosage">
                          {getDosageSummary(med)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  );
};
