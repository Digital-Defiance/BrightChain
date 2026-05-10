/**
 * EncounterList Component
 *
 * Displays a list of FHIR R4 Encounter resources grouped by class with
 * collapsible headers. Shows encounter class, type, status (workflow state
 * displayName when available), period, and service provider. Supports
 * filtering by status and class, and visually distinguishes by status.
 *
 * @module encounter/EncounterList
 */
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import type {
  IEncounterResource,
  IEncounterWorkflowConfig,
} from '@brightchain/brightchart-lib';
import { EncounterStatus } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface EncounterListProps {
  encounters: IEncounterResource<string>[];
  onSelect: (encounter: IEncounterResource<string>) => void;
  workflowConfig?: IEncounterWorkflowConfig;
  filterStatuses?: EncounterStatus[];
  filterClasses?: string[];
}

/** Workflow state extension URL */
const WORKFLOW_STATE_EXT_URL =
  'http://brightchart.org/fhir/StructureDefinition/encounter-workflow-state';

function getWorkflowStateCode(
  encounter: IEncounterResource<string>,
): string | undefined {
  return encounter.extension?.find((e) => e.url === WORKFLOW_STATE_EXT_URL)?.[
    'valueString'
  ];
}

function getStatusLabel(
  encounter: IEncounterResource<string>,
  config?: IEncounterWorkflowConfig,
  enumTranslator?: (status: EncounterStatus) => string,
): string {
  if (config) {
    const code = getWorkflowStateCode(encounter);
    if (code) {
      const state = config.states.find((s) => s.code === code);
      if (state) return state.displayName;
    }
  }
  return enumTranslator
    ? enumTranslator(encounter.status as EncounterStatus)
    : encounter.status;
}

function getClassDisplay(encounter: IEncounterResource<string>): string {
  return encounter.class.display ?? encounter.class.code ?? 'Unknown';
}

function getTypeDisplay(encounter: IEncounterResource<string>): string {
  const t = encounter.type?.[0];
  if (!t) return '';
  return t.text ?? t.coding?.[0]?.display ?? t.coding?.[0]?.code ?? '';
}

function formatDateWithBD(
  dateStr: string,
  formatDateTime: (date: Date | string) => string,
): string {
  const result = formatDateTime(dateStr);
  return result || dateStr;
}

function formatPeriod(
  encounter: IEncounterResource<string>,
  formatDateTime: (date: Date | string) => string,
): string {
  const p = encounter.period;
  if (!p) return '';
  const start = p.start ? formatDateWithBD(p.start, formatDateTime) : '';
  const end = p.end ? formatDateWithBD(p.end, formatDateTime) : '';
  if (start && end) return `${start} – ${end}`;
  if (start) return `${start} – ongoing`;
  return '';
}

function getServiceProvider(encounter: IEncounterResource<string>): string {
  return encounter.serviceProvider?.display ?? '';
}

function statusModifier(status: EncounterStatus | string): string {
  switch (status) {
    case 'in-progress':
    case 'arrived':
    case 'triaged':
      return 'encounter-list__item--active';
    case 'finished':
      return 'encounter-list__item--finished';
    case 'cancelled':
      return 'encounter-list__item--cancelled';
    case 'entered-in-error':
      return 'encounter-list__item--error';
    default:
      return '';
  }
}

export const EncounterList: React.FC<EncounterListProps> = ({
  encounters,
  onSelect,
  workflowConfig,
  filterStatuses,
  filterClasses,
}) => {
  const { tEnum } = useBrightChartTranslation();
  const { formatDateTime } = useFormattedDate();
  const [activeStatusFilters, setActiveStatusFilters] = useState<string[]>(
    filterStatuses ?? [],
  );
  const [activeClassFilters, setActiveClassFilters] = useState<string[]>(
    filterClasses ?? [],
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  // Derive available filter options
  const availableStatuses = useMemo(() => {
    if (workflowConfig) {
      return workflowConfig.states.map((s) => ({
        value: s.code,
        label: s.displayName,
      }));
    }
    const statuses = new Set(encounters.map((e) => e.status));
    return Array.from(statuses).map((s) => ({ value: s, label: s }));
  }, [encounters, workflowConfig]);

  const availableClasses = useMemo(() => {
    const classes = new Set(encounters.map((e) => e.class.code ?? ''));
    return Array.from(classes)
      .filter(Boolean)
      .map((c) => ({
        value: c,
        label: encounters.find((e) => e.class.code === c)?.class.display ?? c,
      }));
  }, [encounters]);

  // Filter encounters
  const filtered = useMemo(() => {
    return encounters.filter((enc) => {
      if (activeStatusFilters.length > 0) {
        if (workflowConfig) {
          const code = getWorkflowStateCode(enc);
          if (code && !activeStatusFilters.includes(code)) return false;
          if (!code && !activeStatusFilters.includes(enc.status)) return false;
        } else {
          if (!activeStatusFilters.includes(enc.status)) return false;
        }
      }
      if (activeClassFilters.length > 0) {
        if (!activeClassFilters.includes(enc.class.code ?? '')) return false;
      }
      return true;
    });
  }, [encounters, activeStatusFilters, activeClassFilters, workflowConfig]);

  // Group by class
  const grouped = useMemo(() => {
    const groups: Record<string, IEncounterResource<string>[]> = {};
    for (const enc of filtered) {
      const key = enc.class.code ?? 'unknown';
      (groups[key] ??= []).push(enc);
    }
    return groups;
  }, [filtered]);

  const toggleStatusFilter = useCallback((value: string) => {
    setActiveStatusFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }, []);

  const toggleClassFilter = useCallback((value: string) => {
    setActiveClassFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }, []);

  const toggleGroup = useCallback((classCode: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(classCode)) next.delete(classCode);
      else next.add(classCode);
      return next;
    });
  }, []);

  return (
    <div className="encounter-list" role="region" aria-label="Encounter List">
      {/* Filter controls */}
      <div
        className="encounter-list__filters"
        role="group"
        aria-label="Encounter filters"
      >
        {availableStatuses.length > 0 && (
          <div
            className="encounter-list__filter-group"
            role="group"
            aria-label="Status filters"
          >
            <span className="encounter-list__filter-label">Status:</span>
            {availableStatuses.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`encounter-list__filter ${activeStatusFilters.includes(s.value) ? 'encounter-list__filter--active' : ''}`}
                onClick={() => toggleStatusFilter(s.value)}
                aria-pressed={activeStatusFilters.includes(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        {availableClasses.length > 0 && (
          <div
            className="encounter-list__filter-group"
            role="group"
            aria-label="Class filters"
          >
            <span className="encounter-list__filter-label">Class:</span>
            {availableClasses.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`encounter-list__filter ${activeClassFilters.includes(c.value) ? 'encounter-list__filter--active' : ''}`}
                onClick={() => toggleClassFilter(c.value)}
                aria-pressed={activeClassFilters.includes(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grouped encounter list */}
      {Object.entries(grouped).length === 0 ? (
        <p className="encounter-list__empty" role="status">
          No encounters found.
        </p>
      ) : (
        Object.entries(grouped).map(([classCode, encs]) => {
          const classLabel = encs[0]?.class.display ?? classCode;
          const isCollapsed = collapsedGroups.has(classCode);
          return (
            <div key={classCode} className="encounter-list__group">
              <button
                type="button"
                className="encounter-list__group-header"
                onClick={() => toggleGroup(classCode)}
                aria-expanded={!isCollapsed}
              >
                <span className="encounter-list__group-label">
                  {classLabel} ({encs.length})
                </span>
                <span aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
              </button>
              {!isCollapsed && (
                <ul className="encounter-list__items" role="list">
                  {encs.map((enc, idx) => (
                    <li
                      key={enc.id ?? idx}
                      className={`encounter-list__item ${statusModifier(enc.status)}`}
                    >
                      <button
                        type="button"
                        className="encounter-list__entry"
                        onClick={() => onSelect(enc)}
                      >
                        <span className="encounter-list__class">
                          {getClassDisplay(enc)}
                        </span>
                        <span className="encounter-list__type">
                          {getTypeDisplay(enc)}
                        </span>
                        <span className="encounter-list__status">
                          {getStatusLabel(enc, workflowConfig, (s) =>
                            tEnum(EncounterStatus, s),
                          )}
                        </span>
                        <span className="encounter-list__period">
                          {formatPeriod(enc, formatDateTime)}
                        </span>
                        {getServiceProvider(enc) && (
                          <span className="encounter-list__provider">
                            {getServiceProvider(enc)}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
