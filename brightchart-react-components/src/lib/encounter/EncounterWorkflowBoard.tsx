/**
 * EncounterWorkflowBoard Component
 *
 * Renders a kanban-style board with one column per non-terminal workflow
 * state (sorted by sortOrder). Encounter cards show patient name, type,
 * and time in state. Supports drag-to-transition between columns,
 * validating against workflow config transitions.
 *
 * @module encounter/EncounterWorkflowBoard
 */
import type {
  IEncounterResource,
  IEncounterWorkflowConfig,
  IEncounterWorkflowState,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface EncounterWorkflowBoardProps {
  encounters: IEncounterResource<string>[];
  workflowConfig: IEncounterWorkflowConfig;
  onTransition: (
    encounter: IEncounterResource<string>,
    toState: string,
  ) => void;
  onSelect: (encounter: IEncounterResource<string>) => void;
}

const WORKFLOW_STATE_EXT_URL =
  'http://brightchart.org/fhir/StructureDefinition/encounter-workflow-state';

function getWorkflowStateCode(
  encounter: IEncounterResource<string>,
): string | undefined {
  return encounter.extension?.find((e) => e.url === WORKFLOW_STATE_EXT_URL)?.[
    'valueString'
  ];
}

function getPatientName(encounter: IEncounterResource<string>): string {
  return (
    encounter.subject?.display ??
    encounter.subject?.reference ??
    'Unknown Patient'
  );
}

function getTypeDisplay(encounter: IEncounterResource<string>): string {
  const t = encounter.type?.[0];
  if (!t) return '';
  return t.text ?? t.coding?.[0]?.display ?? t.coding?.[0]?.code ?? '';
}

function getTimeInState(encounter: IEncounterResource<string>): string {
  const start = encounter.period?.start;
  if (!start) return '';
  const ms = Date.now() - new Date(start).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function isValidTransition(
  config: IEncounterWorkflowConfig,
  fromState: string,
  toState: string,
): boolean {
  return config.transitions.some(
    (t) => t.fromState === fromState && t.toState === toState,
  );
}

export const EncounterWorkflowBoard: React.FC<EncounterWorkflowBoardProps> = ({
  encounters,
  workflowConfig,
  onTransition,
  onSelect,
}) => {
  const [dragEncounterId, setDragEncounterId] = useState<string | null>(null);
  const [dropTargetState, setDropTargetState] = useState<string | null>(null);
  const { t } = useBrightChartTranslation();

  // Non-terminal states sorted by sortOrder
  const columns = useMemo(
    () =>
      [...workflowConfig.states]
        .filter((s) => !s.isTerminal)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [workflowConfig.states],
  );

  // Map encounters to their workflow state columns
  const encountersByState = useMemo(() => {
    const map: Record<string, IEncounterResource<string>[]> = {};
    for (const col of columns) {
      map[col.code] = [];
    }
    for (const enc of encounters) {
      const stateCode = getWorkflowStateCode(enc);
      if (stateCode && map[stateCode]) {
        map[stateCode].push(enc);
      }
    }
    return map;
  }, [encounters, columns]);

  const handleDragStart = useCallback(
    (e: React.DragEvent, encounter: IEncounterResource<string>) => {
      setDragEncounterId(encounter.id ?? null);
      e.dataTransfer.setData('text/plain', encounter.id ?? '');
      e.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, stateCode: string) => {
      e.preventDefault();
      // Validate transition
      if (dragEncounterId) {
        const dragEnc = encounters.find((enc) => enc.id === dragEncounterId);
        const fromState = dragEnc ? getWorkflowStateCode(dragEnc) : undefined;
        if (
          fromState &&
          isValidTransition(workflowConfig, fromState, stateCode)
        ) {
          e.dataTransfer.dropEffect = 'move';
          setDropTargetState(stateCode);
        } else {
          e.dataTransfer.dropEffect = 'none';
        }
      }
    },
    [dragEncounterId, encounters, workflowConfig],
  );

  const handleDragLeave = useCallback(() => {
    setDropTargetState(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toState: string) => {
      e.preventDefault();
      setDropTargetState(null);
      setDragEncounterId(null);

      const encId = e.dataTransfer.getData('text/plain');
      const enc = encounters.find((en) => en.id === encId);
      if (!enc) return;

      const fromState = getWorkflowStateCode(enc);
      if (fromState && isValidTransition(workflowConfig, fromState, toState)) {
        onTransition(enc, toState);
      }
    },
    [encounters, workflowConfig, onTransition],
  );

  const handleDragEnd = useCallback(() => {
    setDragEncounterId(null);
    setDropTargetState(null);
  }, []);

  return (
    <div
      className="encounter-workflow-board"
      role="region"
      aria-label={t(BrightChartStrings.WorkflowBoard_AriaLabel)}
    >
      <div className="encounter-workflow-board__columns">
        {columns.map((col: IEncounterWorkflowState) => {
          const stateEncounters = encountersByState[col.code] ?? [];
          const isDropTarget = dropTargetState === col.code;

          return (
            <div
              key={col.code}
              className={`encounter-workflow-board__column ${isDropTarget ? 'encounter-workflow-board__column--drop-target' : ''}`}
              onDragOver={(e) => handleDragOver(e, col.code)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.code)}
              role="group"
              aria-label={t(
                BrightChartStrings.WorkflowBoard_ColumnAriaTemplate,
              ).replace('{NAME}', col.displayName)}
            >
              <div className="encounter-workflow-board__column-header">
                <span className="encounter-workflow-board__column-title">
                  {col.displayName}
                </span>
                <span className="encounter-workflow-board__column-count">
                  {stateEncounters.length}
                </span>
              </div>
              <div className="encounter-workflow-board__column-body">
                {stateEncounters.map((enc, idx) => (
                  <div
                    key={enc.id ?? idx}
                    className={`encounter-workflow-board__card ${dragEncounterId === enc.id ? 'encounter-workflow-board__card--dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, enc)}
                    onDragEnd={handleDragEnd}
                    role="button"
                    tabIndex={0}
                    aria-label={`${getPatientName(enc)} - ${getTypeDisplay(enc) || col.displayName}`}
                    onClick={() => onSelect(enc)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(enc);
                      }
                    }}
                  >
                    <span className="encounter-workflow-board__card-patient">
                      {getPatientName(enc)}
                    </span>
                    {getTypeDisplay(enc) && (
                      <span className="encounter-workflow-board__card-type">
                        {getTypeDisplay(enc)}
                      </span>
                    )}
                    <span className="encounter-workflow-board__card-time">
                      {getTimeInState(enc)}
                    </span>
                  </div>
                ))}
                {stateEncounters.length === 0 && (
                  <p className="encounter-workflow-board__empty">
                    {t(BrightChartStrings.WorkflowBoard_NoEncounters)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
